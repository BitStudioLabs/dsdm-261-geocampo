import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/src/lib/supabase';
import type {
  AtribuicaoRow,
  PropertyLookup,
  PropertyOption,
  SelectedPhoto,
  VisitHistoryItem,
  VisitaRow,
} from '@/features/instrutor/types/visitas';
import { base64ToArrayBuffer } from '@/features/instrutor/utils/photoMetadata';
import { formatDate, formatTime, hasPendingAssignment } from '@/features/instrutor/utils/visitFormatting';
import { mapVisitStatusToHistoryLabel } from '@/features/instrutor/utils/visitStatus';

const VISIT_EVIDENCE_BUCKET = 'evidencias-visitas';

export async function fetchInstructorVisitsData(currentUserId: string) {
  const [atribuicoesRes, visitasRes] = await Promise.all([
    supabase
      .from('atribuicoes')
      .select('id, id_propriedade, atualizado_em, criado_em')
      .eq('id_instrutor', currentUserId)
      .eq('ativa', true)
      .order('atualizado_em', { ascending: false }),
    supabase
      .from('visitas')
      .select('id, id_propriedade, criado_em, status_visita')
      .eq('id_instrutor', currentUserId)
      .order('criado_em', { ascending: false })
      .limit(20),
  ]);

  if (atribuicoesRes.error) {
    throw atribuicoesRes.error;
  }

  if (visitasRes.error) {
    throw visitasRes.error;
  }

  const atribuicoes = (atribuicoesRes.data ?? []) as AtribuicaoRow[];
  const visitas = (visitasRes.data ?? []) as VisitaRow[];
  const latestVisitByProperty = visitas.reduce<Record<number, VisitaRow>>((acc, visit) => {
    if (visit.id_propriedade == null) {
      return acc;
    }

    if (!acc[visit.id_propriedade]) {
      acc[visit.id_propriedade] = visit;
    }

    return acc;
  }, {});

  const propertyIds = Array.from(
    new Set(
      [...atribuicoes.map((item) => item.id_propriedade), ...visitas.map((item) => item.id_propriedade)].filter(
        (value): value is number => typeof value === 'number'
      )
    )
  );

  let propertyLookup: PropertyLookup = {};

  if (propertyIds.length > 0) {
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('propriedades')
      .select('id, nome, municipio_nome, uf, latitude, longitude')
      .in('id', propertyIds)
      .order('nome', { ascending: true });

    if (propertiesError) {
      throw propertiesError;
    }

    propertyLookup = (propertiesData ?? []).reduce<PropertyLookup>((acc, property) => {
      acc[property.id] = property;
      return acc;
    }, {});
  }

  const properties: PropertyOption[] = atribuicoes
    .filter((item) => hasPendingAssignment(item, latestVisitByProperty[item.id_propriedade] ?? null))
    .map((item) => {
      const property = propertyLookup[item.id_propriedade];

      return {
        id: item.id_propriedade,
        nome: property?.nome ?? 'Propriedade sem nome',
        meta: [property?.municipio_nome, property?.uf].filter(Boolean).join(', ') || 'Localização não informada',
        latitude: property?.latitude ?? null,
        longitude: property?.longitude ?? null,
      };
    });

  const history: VisitHistoryItem[] = Object.values(latestVisitByProperty).map((item, index) => {
    const property = item.id_propriedade ? propertyLookup[item.id_propriedade] ?? null : null;

    return {
      id: String(item.id),
      propriedade: property?.nome ?? `Visita ${index + 1}`,
      data: formatDate(item.criado_em),
      hora: formatTime(item.criado_em),
      status: mapVisitStatusToHistoryLabel(item.status_visita),
    };
  });

  return { properties, history };
}

export async function createInstructorVisit(params: {
  currentUserId: string;
  propertyId: number;
  selectedPhoto: SelectedPhoto;
}) {
  const { currentUserId, propertyId, selectedPhoto } = params;

  const { data, error } = await supabase
    .from('visitas')
    .insert({
      id_instrutor: currentUserId,
      id_propriedade: propertyId,
      criado_em: new Date().toISOString(),
      status_visita: 'pendente',
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  const visitId = data?.id;

  if (visitId) {
    const base64File = await FileSystem.readAsStringAsync(selectedPhoto.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const fileBuffer = base64ToArrayBuffer(base64File);
    const filePath = `${currentUserId}/${visitId}/evidencia-${Date.now()}.${selectedPhoto.extension}`;

    const { error: uploadError } = await supabase.storage.from(VISIT_EVIDENCE_BUCKET).upload(filePath, fileBuffer, {
      upsert: true,
      contentType: selectedPhoto.mimeType,
    });

    if (uploadError) {
      throw uploadError;
    }

    const publicUrl = supabase.storage.from(VISIT_EVIDENCE_BUCKET).getPublicUrl(filePath).data.publicUrl;
    const { error: updateError } = await supabase
      .from('visitas')
      .update({
        foto_url: publicUrl,
        foto_path: filePath,
        latitude: selectedPhoto.latitudeValue,
        longitude: selectedPhoto.longitudeValue,
        altitude: selectedPhoto.altitudeValue,
        capturado_em: selectedPhoto.capturedAtIso,
        status_visita: 'em_andamento',
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', visitId);

    if (updateError) {
      console.warn('Visita salva, mas não foi possível gravar a referência da foto:', updateError);
    }
  }

  return {
    visitId: data?.id ?? null,
    propertyId,
  };
}
