import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/src/lib/supabase';
import type {
  AssignmentRow,
  Producer,
  ProducerDashboardState,
  ProducerProfileState,
  ProducerProperty,
  ProducerPropertyDetails,
} from '@/features/proprietario/types';
import { base64ToArrayBuffer } from '@/features/proprietario/utils/avatar';

function attachInstructors<T extends ProducerProperty>(properties: T[], assignmentsData: AssignmentRow[] | null | undefined) {
  const instructorsByProperty = new Map<number, string[]>();

  for (const row of assignmentsData ?? []) {
    if (!row.id_propriedade) continue;

    const current = instructorsByProperty.get(row.id_propriedade) ?? [];
    const relatedUsers = Array.isArray(row.usuarios) ? row.usuarios : row.usuarios ? [row.usuarios] : [];

    for (const relatedUser of relatedUsers) {
      const instructorName = relatedUser?.nome_completo?.trim();
      if (instructorName && !current.includes(instructorName)) {
        current.push(instructorName);
      }
    }

    if (!relatedUsers.length && row.id_instrutor) {
      const fallbackLabel = current.length > 0 ? `Instrutor vinculado ${current.length + 1}` : 'Instrutor vinculado';
      if (!current.includes(fallbackLabel)) {
        current.push(fallbackLabel);
      }
    }

    instructorsByProperty.set(row.id_propriedade, current);
  }

  return properties.map((item) => ({
    ...item,
    instrutores: instructorsByProperty.get(item.id) ?? [],
  }));
}

async function fetchActiveAssignments(propertyIds: number[]) {
  if (!propertyIds.length) return [];

  const { data, error } = await supabase
    .from('atribuicoes')
    .select('id_propriedade, id_instrutor, usuarios!atribuicoes_id_instrutor_fkey(nome_completo)')
    .in('id_propriedade', propertyIds)
    .eq('ativa', true);

  if (error) throw error;
  return (data as AssignmentRow[] | null) ?? [];
}

async function fetchVisitsCount(propertyIds: number[]) {
  if (!propertyIds.length) return 0;

  const { count, error } = await supabase
    .from('visitas')
    .select('*', { count: 'exact', head: true })
    .in('id_propriedade', propertyIds);

  if (error) throw error;
  return count ?? 0;
}

async function fetchProducerForUser(userId: string, select = 'id, nome') {
  const { data, error } = await supabase.from('produtores').select(select).eq('usuario_id', userId).maybeSingle();

  if (error) throw error;
  return (data as Producer | null) ?? null;
}

export async function fetchProducerDashboardData(userId: string): Promise<ProducerDashboardState> {
  const producer = await fetchProducerForUser(userId, 'id, nome');

  if (!producer?.id) {
    return { producer: null, properties: [], visitsCount: 0 };
  }

  const { data, error } = await supabase
    .from('propriedades')
    .select('id, nome, municipio_nome, uf, area_total, status_propriedade')
    .eq('id_produtor', producer.id)
    .order('nome', { ascending: true });

  if (error) throw error;

  const baseProperties = ((data as Omit<ProducerProperty, 'instrutores'>[] | null) ?? []).map((item) => ({
    ...item,
    instrutores: [] as string[],
  }));
  const propertyIds = baseProperties.map((item) => item.id);
  const [visitsCount, assignments] = await Promise.all([fetchVisitsCount(propertyIds), fetchActiveAssignments(propertyIds)]);

  return {
    producer,
    properties: attachInstructors(baseProperties, assignments),
    visitsCount,
  };
}

export async function fetchProducerProperties(userId: string): Promise<ProducerPropertyDetails[]> {
  const producer = await fetchProducerForUser(userId, 'id');

  if (!producer?.id) return [];

  const { data, error } = await supabase
    .from('propriedades')
    .select('id, nome, municipio_nome, uf, area_total, status_propriedade, status_arrendamento, bairro, referencia, como_chegar, telefone')
    .eq('id_produtor', producer.id)
    .order('nome', { ascending: true });

  if (error) throw error;

  const baseProperties = ((data as Omit<ProducerPropertyDetails, 'instrutores'>[] | null) ?? []).map((item) => ({
    ...item,
    instrutores: [] as string[],
  }));
  const assignments = await fetchActiveAssignments(baseProperties.map((item) => item.id));
  return attachInstructors(baseProperties, assignments);
}

export async function fetchProducerProfileData(userId: string): Promise<ProducerProfileState> {
  const producer = await fetchProducerForUser(userId, 'id, nome, telefone, email, cpf_cnpj');

  if (!producer?.id) {
    return { producer: null, properties: [], visitsCount: 0 };
  }

  const { data, error } = await supabase
    .from('propriedades')
    .select('id, nome, municipio_nome, uf, area_total, status_propriedade')
    .eq('id_produtor', producer.id)
    .order('nome', { ascending: true });

  if (error) throw error;

  const baseProperties = ((data as Omit<ProducerProperty, 'instrutores'>[] | null) ?? []).map((item) => ({
    ...item,
    instrutores: [] as string[],
  }));
  const propertyIds = baseProperties.map((item) => item.id);
  const [visitsCount, assignments] = await Promise.all([fetchVisitsCount(propertyIds), fetchActiveAssignments(propertyIds)]);

  return {
    producer,
    properties: attachInstructors(baseProperties, assignments),
    visitsCount,
  };
}

export async function updateProducerProfile({
  name,
  phone,
  producerId,
  userId,
}: {
  name: string;
  phone: string | null;
  producerId?: number | null;
  userId: string;
}) {
  const atualizado_em = new Date().toISOString();
  const { error: userError } = await supabase
    .from('usuarios')
    .update({ nome_completo: name, telefone: phone, atualizado_em })
    .eq('id', userId);

  if (userError) throw userError;

  if (producerId) {
    const { error: producerError } = await supabase
      .from('produtores')
      .update({ nome: name, telefone: phone, atualizado_em })
      .eq('id', producerId);

    if (producerError) throw producerError;
  }
}

export async function uploadProducerAvatar({
  asset,
  userId,
}: {
  asset: ImagePicker.ImagePickerAsset;
  userId: string;
}) {
  const base64File = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  const extension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from('avatares').upload(filePath, base64ToArrayBuffer(base64File), {
    upsert: true,
    contentType: asset.mimeType ?? 'image/jpeg',
  });
  if (uploadError) throw uploadError;

  const publicUrl = supabase.storage.from('avatares').getPublicUrl(filePath).data.publicUrl;
  const { error: updateError } = await supabase
    .from('usuarios')
    .update({ foto_url: publicUrl, atualizado_em: new Date().toISOString() })
    .eq('id', userId);
  if (updateError) throw updateError;

  const { data } = await supabase.storage.from('avatares').createSignedUrl(filePath, 3600);

  return {
    avatarPath: filePath,
    avatarUrl: data?.signedUrl ?? publicUrl,
  };
}

export async function resolveProducerAvatarUrl(sourcePath: string) {
  const { data } = await supabase.storage.from('avatares').createSignedUrl(sourcePath, 3600);
  return data?.signedUrl ?? supabase.storage.from('avatares').getPublicUrl(sourcePath).data.publicUrl;
}

export async function hydrateSavedAvatarPath(avatarKey: string) {
  return AsyncStorage.getItem(avatarKey);
}

export async function persistAvatarPath(avatarKey: string, avatarPath: string) {
  return AsyncStorage.setItem(avatarKey, avatarPath);
}
