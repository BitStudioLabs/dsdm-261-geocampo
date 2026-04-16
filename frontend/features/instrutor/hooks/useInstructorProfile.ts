import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import {
  fetchInstructorProfileStats,
  hydrateSavedAvatarPath,
  persistAvatarPath,
  resolveInstructorProfileAvatarUrl,
  updateInstructorProfile,
  uploadInstructorProfilePhoto,
} from '@/features/instrutor/api/profile';
import type { ProfileStats } from '@/features/instrutor/types/profile';
import { extractAvatarPath } from '@/features/instrutor/utils/dashboardAvatar';
import { getPhotoMetadataErrorMessage } from '@/features/instrutor/utils/photoMetadata';
import { buildDisplayName, buildPreferencesCopy, buildRegionLabel, buildSummaryCards } from '@/features/instrutor/utils/profileFormatting';

export function useInstructorProfile(primaryColor: string, yellowColor: string) {
  const { logout, profile, refreshProfile, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarStoragePath, setAvatarStoragePath] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [stats, setStats] = useState<ProfileStats>({
    visitasMes: 0,
    atribuidas: 0,
    concluidas: 0,
  });

  const loadStats = useCallback(async () => {
    const currentUserId = profile?.id ?? user?.id;

    if (!currentUserId) {
      setStats({
        visitasMes: 0,
        atribuidas: 0,
        concluidas: 0,
      });
      setIsLoading(false);
      return;
    }

    const nextStats = await fetchInstructorProfileStats(currentUserId);
    setStats(nextStats);
  }, [profile?.id, user?.id]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setIsLoading(true);
      try {
        await loadStats();
      } catch (error) {
        console.error('Erro ao carregar perfil do instrutor:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [loadStats]);

  useEffect(() => {
    const currentUserId = profile?.id ?? user?.id;
    if (!currentUserId) {
      return;
    }

    const userId = String(currentUserId);

    let cancelled = false;

    async function hydrateAvatarPath() {
      try {
        const savedPath = await hydrateSavedAvatarPath(userId);

        if (!cancelled && savedPath) {
          setAvatarStoragePath(savedPath);
        }
      } catch (error) {
        console.error('Erro ao restaurar avatar salvo localmente:', error);
      }
    }

    hydrateAvatarPath();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function resolveAvatar() {
      const sourcePath = profile?.fotoPath ?? (profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : avatarStoragePath);

      if (!sourcePath) {
        setAvatarUrl((current) => current ?? null);
        return;
      }

      const nextAvatarUrl = await resolveInstructorProfileAvatarUrl({
        profilePhotoPath: sourcePath,
        profilePhotoUrl: profile?.fotoUrl ?? null,
        avatarStoragePath: avatarStoragePath ?? null,
      });

      if (!cancelled) {
        setAvatarUrl(nextAvatarUrl);
      }
    }

    resolveAvatar();

    return () => {
      cancelled = true;
    };
  }, [avatarStoragePath, profile?.fotoPath, profile?.fotoUrl]);

  useEffect(() => {
    const currentUserId = profile?.id ?? user?.id;
    if (!currentUserId) {
      return;
    }

    const sourcePath = profile?.fotoPath ?? (profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : avatarStoragePath);

    if (!sourcePath) {
      return;
    }

    setAvatarStoragePath(sourcePath);
    persistAvatarPath(currentUserId, sourcePath).catch((error) => {
      console.error('Erro ao persistir avatar localmente:', error);
    });
  }, [avatarStoragePath, profile?.fotoPath, profile?.fotoUrl, profile?.id, user?.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStats(), refreshProfile()]);
    } catch (error) {
      console.error('Erro ao atualizar perfil do instrutor:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadStats, refreshProfile]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Erro ao sair da conta:', error);
    }
  }, [logout]);

  const openPhotoOptions = useCallback(() => {
    setPhotoOptionsVisible(true);
  }, []);

  const closePhotoOptions = useCallback(() => {
    if (isUploadingPhoto) {
      return;
    }

    setPhotoOptionsVisible(false);
  }, [isUploadingPhoto]);

  const handleViewPhoto = useCallback(() => {
    if (!avatarUrl) {
      Alert.alert('Sem foto', 'Você ainda não adicionou uma foto de perfil.');
      return;
    }

    setPhotoOptionsVisible(false);
    setPhotoViewerVisible(true);
  }, [avatarUrl]);

  const handlePickPhoto = useCallback(async () => {
    const currentUserId = profile?.id ?? user?.id;

    if (!currentUserId) {
      Alert.alert('Perfil indisponível', 'Não foi possível identificar o usuário logado.');
      return;
    }

    setPhotoOptionsVisible(false);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria para alterar a foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const uploadResult = await uploadInstructorProfilePhoto({
        currentUserId,
        asset: result.assets[0],
      });

      setAvatarStoragePath(uploadResult.avatarStoragePath);
      setAvatarUrl(uploadResult.avatarUrl);

      await refreshProfile();
      Alert.alert('Foto atualizada', 'A foto de perfil foi salva com sucesso.');
    } catch (error) {
      console.error('Erro ao enviar foto do instrutor:', error);
      Alert.alert('Erro ao enviar', getPhotoMetadataErrorMessage(error));
      setAvatarStoragePath(profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : null);
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [profile?.fotoUrl, profile?.id, refreshProfile, user?.id]);

  const openEditModal = useCallback(() => {
    setEditName(profile?.nomeCompleto ?? '');
    setEditPhone(profile?.telefone ?? '');
    setEditVisible(true);
  }, [profile?.nomeCompleto, profile?.telefone]);

  const closeEditModal = useCallback(() => {
    if (isSaving) {
      return;
    }

    setEditVisible(false);
  }, [isSaving]);

  const handleSaveProfile = useCallback(async () => {
    const currentUserId = profile?.id ?? user?.id;
    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();

    if (!currentUserId) {
      Alert.alert('Perfil indisponível', 'Não foi possível identificar o usuário logado.');
      return;
    }

    if (!trimmedName) {
      Alert.alert('Nome obrigatório', 'Informe o nome do instrutor para salvar o perfil.');
      return;
    }

    try {
      setIsSaving(true);
      await updateInstructorProfile({
        currentUserId,
        nomeCompleto: trimmedName,
        telefone: trimmedPhone || null,
      });

      await refreshProfile();
      setEditVisible(false);
      Alert.alert('Perfil atualizado', 'As informações do instrutor foram salvas com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar perfil do instrutor:', error);
      Alert.alert('Erro ao salvar', getPhotoMetadataErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [editName, editPhone, profile?.id, refreshProfile, user?.id]);

  const displayName = useMemo(
    () =>
      buildDisplayName({
        profileName: profile?.nomeCompleto,
        userMetadataName: user?.user_metadata?.nome_completo,
        userMetadataAltName: user?.user_metadata?.name,
        email: user?.email,
      }),
    [profile?.nomeCompleto, user?.email, user?.user_metadata]
  );

  const regionLabel = useMemo(
    () =>
      buildRegionLabel({
        regionalNome: profile?.regionalNome,
        regionalUf: profile?.regionalUf,
      }),
    [profile?.regionalNome, profile?.regionalUf]
  );

  const summaryCards = useMemo(
    () => buildSummaryCards(isLoading, stats, primaryColor, yellowColor),
    [isLoading, primaryColor, stats, yellowColor]
  );

  const preferencesCopy = useMemo(
    () =>
      buildPreferencesCopy({
        regionLabel,
        ativo: profile?.ativo,
      }),
    [profile?.ativo, regionLabel]
  );

  return {
    avatarUrl,
    closeEditModal,
    closePhotoOptions,
    displayName,
    editName,
    editPhone,
    editVisible,
    handleLogout,
    handlePickPhoto,
    handleRefresh,
    handleSaveProfile,
    handleViewPhoto,
    isLoading,
    isSaving,
    isUploadingPhoto,
    openEditModal,
    openPhotoOptions,
    photoOptionsVisible,
    photoViewerVisible,
    preferencesCopy,
    profile,
    refreshing,
    regionLabel,
    setEditName,
    setEditPhone,
    setPhotoViewerVisible,
    stats,
    summaryCards,
    user,
  };
}
