import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/src/lib/supabase';
import type {
  AtribuicaoRow,
  CreateVisitResult,
  PropertyLookup,
  PropertyOption,
  QueuedVisitRecord,
  SelectedPhoto,
  VisitHistoryItem,
  VisitaRow,
} from '@/features/instrutor/types/visitas';
import {
  getQueuedInstructorVisits,
  queueInstructorVisitOffline,
  removeQueuedInstructorVisit,
  updateQueuedInstructorVisit,
} from '@/features/instrutor/offline/visitQueue';
import { base64ToArrayBuffer } from '@/features/instrutor/utils/photoMetadata';
import { calculateDistanceInMeters, formatDate, formatTime, hasPendingAssignment } from '@/features/instrutor/utils/visitFormatting';
import { mapVisitStatusToHistoryLabel } from '@/features/instrutor/utils/visitStatus';

const VISIT_EVIDENCE_BUCKET = 'evidencias-visitas';
const VISITS_CACHE_PREFIX = 'instrutor-visitas-cache:';
const PHOTO_METADATA_TABLE = 'metadados_foto_visita';

type VisitsCachePayload = {
  properties: PropertyOption[];
  history: VisitHistoryItem[];
  queuedVisitsCount: number;
  cachedAt: string;
};

function getVisitsCacheKey(userId: string) {
  return `${VISITS_CACHE_PREFIX}${userId}`;
}

async function readVisitsCache(userId: string) {
  const raw = await AsyncStorage.getItem(getVisitsCacheKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as VisitsCachePayload;
  } catch {
    return null;
  }
}

async function persistVisitsCache(userId: string, payload: VisitsCachePayload) {
  await AsyncStorage.setItem(getVisitsCacheKey(userId), JSON.stringify(payload));
}

function buildPropertyLookupFromCache(cachedVisits: VisitsCachePayload | null): PropertyLookup {
  if (!cachedVisits) {
    return {};
  }

  return cachedVisits.properties.reduce<PropertyLookup>((acc, property) => {
    const metaParts = property.meta.split(',').map((part) => part.trim()).filter(Boolean);

    acc[property.id] = {
      id: property.id,
      nome: property.nome,
      municipio_nome: metaParts[0] ?? property.meta,
      uf: metaParts.length > 1 ? metaParts[metaParts.length - 1] ?? null : null,
      latitude: property.latitude,
      longitude: property.longitude,
    };

    return acc;
  }, {});
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Erro desconhecido.';
}

function isOfflineLikeError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('network request failed') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('timed out') ||
    message.includes('timeout')
  );
}

function buildQueuedVisitHistoryItem(item: QueuedVisitRecord): VisitHistoryItem {
  return {
    id: `offline-${item.localId}`,
    propriedade: item.property.nome,
    data: formatDate(item.createdAt),
    hora: formatTime(item.createdAt),
    status: 'Enviada',
    isOfflineQueue: true,
    syncStatus: item.syncStatus,
  };
}
function calculatePhotoDistanceMeters(selectedPhoto: SelectedPhoto, property: PropertyOption) {
  if (
    selectedPhoto.latitudeValue == null ||
    selectedPhoto.longitudeValue == null ||
    property.latitude == null ||
    property.longitude == null
  ) {
    return null;
  }

  return calculateDistanceInMeters(
    selectedPhoto.latitudeValue,
    selectedPhoto.longitudeValue,
    property.latitude,
    property.longitude
  );
}

function calculateTimeDifferenceMinutes(capturedAtIso: string | null, uploadedAtIso: string) {
  if (!capturedAtIso) {
    return null;
  }

  const capturedAt = new Date(capturedAtIso).getTime();
  const uploadedAt = new Date(uploadedAtIso).getTime();

  if (Number.isNaN(capturedAt) || Number.isNaN(uploadedAt)) {
    return null;
  }

  return Math.round((uploadedAt - capturedAt) / 60000);
}

function buildPhotoMetadataPayload(params: {
  filePath: string;
  property: PropertyOption;
  publicUrl: string;
  selectedPhoto: SelectedPhoto;
  uploadedAtIso: string;
  visitId: number;
}) {
  const { filePath, property, publicUrl, selectedPhoto, uploadedAtIso, visitId } = params;

  return {
    id_visita: visitId,
    foto_url: publicUrl,
    foto_path: filePath,
    latitude: selectedPhoto.latitudeValue,
    longitude: selectedPhoto.longitudeValue,
    altitude: selectedPhoto.altitudeValue,
    capturado_em: selectedPhoto.capturedAtIso,
    camera_model: selectedPhoto.cameraModel,
    file_name: selectedPhoto.fileName,
    file_size: selectedPhoto.fileSizeBytes,
    mime_type: selectedPhoto.mimeType,
    width: selectedPhoto.width,
    height: selectedPhoto.height,
    has_exif: selectedPhoto.hasExif,
    has_gps: selectedPhoto.hasGps,
    distancia_metros: calculatePhotoDistanceMeters(selectedPhoto, property),
    diferenca_tempo_minutos: calculateTimeDifferenceMinutes(selectedPhoto.capturedAtIso, uploadedAtIso),
  };
}
async function finalizeRemoteVisitUpload(params: {
  currentUserId: string;
  property: PropertyOption;
  selectedPhoto: SelectedPhoto;
  visitId: number;
}) {
  const { currentUserId, property, selectedPhoto, visitId } = params;
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
    throw {
      stage: 'upload',
      visitId,
      cause: uploadError,
    };
  }

  const publicUrl = supabase.storage.from(VISIT_EVIDENCE_BUCKET).getPublicUrl(filePath).data.publicUrl;
  const uploadedAtIso = new Date().toISOString();
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
      atualizado_em: uploadedAtIso,
    })
    .eq('id', visitId);

  if (updateError) {
    throw {
      stage: 'upload',
      visitId,
      cause: updateError,
    };
  }

  const { error: metadataError } = await supabase.from(PHOTO_METADATA_TABLE).insert(
    buildPhotoMetadataPayload({
      filePath,
      property,
      publicUrl,
      selectedPhoto,
      uploadedAtIso,
      visitId,
    })
  );

  if (metadataError) {
    console.warn('Visita salva, mas nao foi possivel gravar os metadados da foto:', metadataError);
  }

  return {
    visitId,
    filePath,
    publicUrl,
  };
}

async function createRemoteInstructorVisit(params: {
  currentUserId: string;
  property: PropertyOption;
  selectedPhoto: SelectedPhoto;
  existingVisitId?: number | null;
}) {
  const { currentUserId, existingVisitId = null, property, selectedPhoto } = params;

  let visitId = existingVisitId;

  if (!visitId) {
    const { data, error } = await supabase
      .from('visitas')
      .insert({
        id_instrutor: currentUserId,
        id_propriedade: property.id,
        criado_em: new Date().toISOString(),
        status_visita: 'pendente',
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    visitId = data?.id ?? null;
  }

  if (!visitId) {
    throw new Error('Nao foi possivel criar a visita remota.');
  }

  await finalizeRemoteVisitUpload({
    currentUserId,
    property,
    selectedPhoto,
    visitId,
  });

  return {
    visitId,
    propertyId: property.id,
  };
}

export async function fetchInstructorVisitsData(currentUserId: string) {
  const queuedVisits = await getQueuedInstructorVisits(currentUserId);
  const cachedVisits = await readVisitsCache(currentUserId);
  let offlineMode = false;
  let atribuicoes: AtribuicaoRow[] = [];
  let visitas: VisitaRow[] = [];
  let propertyLookup: PropertyLookup = buildPropertyLookupFromCache(cachedVisits);

  try {
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

    atribuicoes = (atribuicoesRes.data ?? []) as AtribuicaoRow[];
    visitas = (visitasRes.data ?? []) as VisitaRow[];
  } catch (error) {
    if (!isOfflineLikeError(error)) {
      throw error;
    }

    offlineMode = true;

    if (cachedVisits) {
      atribuicoes = cachedVisits.properties.map((item, index) => ({
        id: -(index + 1),
        id_propriedade: item.id,
        atualizado_em: cachedVisits.cachedAt,
        criado_em: cachedVisits.cachedAt,
      }));
    }
  }

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
      [
        ...atribuicoes.map((item) => item.id_propriedade),
        ...visitas.map((item) => item.id_propriedade),
        ...queuedVisits.map((item) => item.property.id),
      ].filter((value): value is number => typeof value === 'number')
    )
  );

  if (propertyIds.length > 0) {
    try {
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('propriedades')
        .select('id, nome, municipio_nome, uf, latitude, longitude')
        .in('id', propertyIds)
        .order('nome', { ascending: true });

      if (propertiesError) {
        throw propertiesError;
      }

      propertyLookup = {
        ...propertyLookup,
        ...(propertiesData ?? []).reduce<PropertyLookup>((acc, property) => {
          acc[property.id] = property;
          return acc;
        }, {}),
      };
    } catch (error) {
      if (!isOfflineLikeError(error)) {
        throw error;
      }

      offlineMode = true;
    }
  }

  for (const queuedVisit of queuedVisits) {
    propertyLookup[queuedVisit.property.id] = propertyLookup[queuedVisit.property.id] ?? {
      id: queuedVisit.property.id,
      nome: queuedVisit.property.nome,
      municipio_nome: queuedVisit.property.meta,
      uf: null,
      latitude: queuedVisit.property.latitude,
      longitude: queuedVisit.property.longitude,
    };

    latestVisitByProperty[queuedVisit.property.id] = {
      id: queuedVisit.remoteVisitId ?? -1,
      id_propriedade: queuedVisit.property.id,
      criado_em: queuedVisit.createdAt,
      status_visita: 'pendente',
    };
  }

  const properties: PropertyOption[] = atribuicoes
    .filter((item) => hasPendingAssignment(item, latestVisitByProperty[item.id_propriedade] ?? null))
    .map((item) => {
      const property = propertyLookup[item.id_propriedade];

      return {
        id: item.id_propriedade,
        nome: property?.nome ?? 'Propriedade sem nome',
        meta: [property?.municipio_nome, property?.uf].filter(Boolean).join(', ') || 'Localizacao nao informada',
        latitude: property?.latitude ?? null,
        longitude: property?.longitude ?? null,
      };
    });

  const remoteHistory: VisitHistoryItem[] = Object.values(latestVisitByProperty)
    .filter((item) => item.id > 0)
    .map((item, index) => {
      const property = item.id_propriedade ? propertyLookup[item.id_propriedade] ?? null : null;

      return {
        id: String(item.id),
        propriedade: property?.nome ?? `Visita ${index + 1}`,
        data: formatDate(item.criado_em),
        hora: formatTime(item.criado_em),
        status: mapVisitStatusToHistoryLabel(item.status_visita),
      };
    });

  const remoteHistoryIds = new Set(remoteHistory.map((item) => item.id));
  const queuedHistory = queuedVisits
    .filter((item) => !item.remoteVisitId || !remoteHistoryIds.has(String(item.remoteVisitId)))
    .map(buildQueuedVisitHistoryItem);

  let history: VisitHistoryItem[] = [...queuedHistory, ...remoteHistory];

  if (offlineMode && cachedVisits) {
    const knownIds = new Set(history.map((item) => item.id));
    const cachedHistory = cachedVisits.history.filter((item) => !knownIds.has(item.id));
    history = [...history, ...cachedHistory];
  }

  if (!offlineMode) {
    await persistVisitsCache(currentUserId, {
      properties,
      history,
      queuedVisitsCount: queuedVisits.length,
      cachedAt: new Date().toISOString(),
    });
  }

  return {
    properties,
    history,
    queuedVisitsCount: queuedVisits.length,
    isOfflineMode: offlineMode,
  };
}

export async function syncQueuedInstructorVisits(currentUserId: string) {
  const queue = await getQueuedInstructorVisits(currentUserId);
  let syncedCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      await createRemoteInstructorVisit({
        currentUserId,
        property: item.property,
        selectedPhoto: item.selectedPhoto,
        existingVisitId: item.remoteVisitId ?? null,
      });

      await removeQueuedInstructorVisit(item.localId);
      syncedCount += 1;
    } catch (error) {
      const normalizedError =
        typeof error === 'object' && error !== null && 'cause' in error ? (error as { cause?: unknown }).cause : error;

      if (
        typeof error === 'object' &&
        error !== null &&
        'stage' in error &&
        (error as { stage?: string }).stage === 'upload' &&
        'visitId' in error
      ) {
        await updateQueuedInstructorVisit(item.localId, {
          remoteVisitId: (error as { visitId?: number }).visitId ?? item.remoteVisitId ?? null,
          syncStatus: 'failed',
          lastError: getErrorMessage(normalizedError),
        });
        failedCount += 1;
        continue;
      }

      if (isOfflineLikeError(normalizedError)) {
        await updateQueuedInstructorVisit(item.localId, {
          syncStatus: 'failed',
          lastError: getErrorMessage(normalizedError),
        });
        failedCount += 1;
        continue;
      }

      throw normalizedError;
    }
  }

  const remainingQueue = await getQueuedInstructorVisits(currentUserId);

  return {
    syncedCount,
    failedCount,
    remainingCount: remainingQueue.length,
  };
}

export async function createInstructorVisit(params: {
  currentUserId: string;
  property: PropertyOption;
  selectedPhoto: SelectedPhoto;
}): Promise<CreateVisitResult> {
  const { currentUserId, property, selectedPhoto } = params;

  try {
    const result = await createRemoteInstructorVisit({
      currentUserId,
      property,
      selectedPhoto,
    });

    return {
      visitId: result.visitId,
      propertyId: property.id,
      queuedOffline: false,
      localId: null,
    };
  } catch (error) {
    const normalizedError =
      typeof error === 'object' && error !== null && 'cause' in error ? (error as { cause?: unknown }).cause : error;
    const remoteVisitId =
      typeof error === 'object' && error !== null && 'visitId' in error
        ? ((error as { visitId?: number }).visitId ?? null)
        : null;

    if (!isOfflineLikeError(normalizedError)) {
      throw normalizedError;
    }

    const queuedVisit = await queueInstructorVisitOffline({
      userId: currentUserId,
      property,
      selectedPhoto,
      remoteVisitId,
      syncStatus: 'pending',
      lastError: null,
    });

    return {
      visitId: remoteVisitId,
      propertyId: property.id,
      queuedOffline: true,
      localId: queuedVisit.localId,
    };
  }
}
