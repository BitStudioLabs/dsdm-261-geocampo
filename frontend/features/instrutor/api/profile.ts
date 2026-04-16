import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';

import { getAvatarStorageKey } from '@/features/instrutor/utils/dashboardAvatar';
import { base64ToArrayBuffer } from '@/features/instrutor/utils/photoMetadata';
import type { ProfileStats } from '@/features/instrutor/types/profile';
import { supabase } from '@/src/lib/supabase';

export async function fetchInstructorProfileStats(currentUserId: string): Promise<ProfileStats> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [visitasMesRes, atribuicoesRes, concluidasRes] = await Promise.all([
    supabase
      .from('visitas')
      .select('*', { count: 'exact', head: true })
      .eq('id_instrutor', currentUserId)
      .gte('criado_em', startOfMonth.toISOString()),
    supabase
      .from('atribuicoes')
      .select('*', { count: 'exact', head: true })
      .eq('id_instrutor', currentUserId)
      .eq('ativa', true),
    supabase.from('visitas').select('*', { count: 'exact', head: true }).eq('id_instrutor', currentUserId),
  ]);

  if (visitasMesRes.error) throw visitasMesRes.error;
  if (atribuicoesRes.error) throw atribuicoesRes.error;
  if (concluidasRes.error) throw concluidasRes.error;

  return {
    visitasMes: visitasMesRes.count ?? 0,
    atribuidas: atribuicoesRes.count ?? 0,
    concluidas: concluidasRes.count ?? 0,
  };
}

export async function hydrateSavedAvatarPath(userId: string) {
  return AsyncStorage.getItem(getAvatarStorageKey(userId));
}

export async function persistAvatarPath(userId: string, path: string) {
  await AsyncStorage.setItem(getAvatarStorageKey(userId), path);
}

export async function resolveInstructorProfileAvatarUrl(params: {
  profilePhotoPath?: string | null;
  profilePhotoUrl?: string | null;
  avatarStoragePath?: string | null;
}) {
  const { avatarStoragePath, profilePhotoPath, profilePhotoUrl } = params;
  const sourcePath = profilePhotoPath ?? profilePhotoUrl ?? avatarStoragePath;

  if (!sourcePath) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage.from('avatares').createSignedUrl(sourcePath, 60 * 60);

    if (!error && data?.signedUrl) {
      return `${data.signedUrl}${data.signedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    }
  } catch (error) {
    console.error('Erro ao resolver avatar assinado:', error);
  }

  const fallbackUrl =
    profilePhotoUrl && profilePhotoUrl.startsWith('http')
      ? profilePhotoUrl
      : supabase.storage.from('avatares').getPublicUrl(sourcePath).data.publicUrl;

  return `${fallbackUrl}${fallbackUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
}

export async function uploadInstructorProfilePhoto(params: { currentUserId: string; asset: ImagePickerAsset }) {
  const { currentUserId, asset } = params;
  const base64File = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileBuffer = base64ToArrayBuffer(base64File);
  const extension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${currentUserId}/avatar-${Date.now()}.${extension}`;

  await persistAvatarPath(currentUserId, filePath);

  const { error: uploadError } = await supabase.storage.from('avatares').upload(filePath, fileBuffer, {
    upsert: true,
    contentType: asset.mimeType ?? 'image/jpeg',
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('avatares').getPublicUrl(filePath);

  const { data: persistedProfile, error: updateError } = await supabase
    .from('usuarios')
    .update({
      foto_url: data.publicUrl,
      foto_path: filePath,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', currentUserId)
    .select('foto_url, foto_path')
    .single();

  if (updateError) {
    throw updateError;
  }

  if (!persistedProfile?.foto_path) {
    throw new Error('A foto foi enviada, mas o campo foto_path não foi persistido no banco.');
  }

  const { data: signedData } = await supabase.storage.from('avatares').createSignedUrl(filePath, 60 * 60);

  return {
    avatarStoragePath: filePath,
    avatarUrl: signedData?.signedUrl
      ? `${signedData.signedUrl}${signedData.signedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
      : `${data.publicUrl}?t=${Date.now()}`,
  };
}

export async function updateInstructorProfile(params: {
  currentUserId: string;
  nomeCompleto: string;
  telefone: string | null;
}) {
  const { currentUserId, nomeCompleto, telefone } = params;

  const { error } = await supabase
    .from('usuarios')
    .update({
      nome_completo: nomeCompleto,
      telefone,
    })
    .eq('id', currentUserId);

  if (error) {
    throw error;
  }
}
