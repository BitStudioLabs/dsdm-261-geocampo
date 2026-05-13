import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import {
  fetchProducerProfileData,
  hydrateSavedAvatarPath,
  persistAvatarPath,
  resolveProducerAvatarUrl,
  updateProducerPassword,
  updateProducerProfile,
  uploadProducerAvatar,
} from '@/features/proprietario/api/proprietario';
import type { ProducerProfileState, ProprietarioFeedback } from '@/features/proprietario/types';
import { extractAvatarPath, getAvatarStorageKey } from '@/features/proprietario/utils/avatar';
import { buildDisplayName, formatMemberSince, getErrorMessage } from '@/features/proprietario/utils/formatting';

const EMPTY_STATE: ProducerProfileState = {
  producer: null,
  properties: [],
  visitsCount: 0,
};

export function useProprietarioPerfil() {
  const { logout, profile, refreshProfile, user } = useAuth();
  const userId = profile?.id ?? user?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [state, setState] = useState<ProducerProfileState>(EMPTY_STATE);
  const [feedback, setFeedback] = useState<ProprietarioFeedback>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const hasFocusedOnceRef = useRef(false);

  const avatarKey = userId ? getAvatarStorageKey(userId) : null;

  const loadData = useCallback(async () => {
    if (!userId) {
      setState(EMPTY_STATE);
      return;
    }

    setState(await fetchProducerProfileData(userId));
  }, [userId]);

  useEffect(() => {
    if (!feedback) return;

    const timeout = setTimeout(() => {
      setFeedback(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      try {
        await loadData();
      } catch (error) {
        console.error('Erro ao carregar perfil do proprietario:', error);
        if (active) {
          setFeedback({ type: 'error', message: 'Não foi possivel carregar os dados do perfil agora.' });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      let active = true;

      async function reloadOnFocus() {
        try {
          await loadData();
        } catch (error) {
          console.error('Erro ao atualizar perfil do proprietario ao focar:', error);
          if (active) {
            setFeedback({ type: 'error', message: 'Não foi possivel atualizar os dados do perfil.' });
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      void reloadOnFocus();

      return () => {
        active = false;
      };
    }, [loadData])
  );

  useEffect(() => {
    if (!avatarKey) return;

    hydrateSavedAvatarPath(avatarKey)
      .then((saved) => {
        const source = profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : saved;
        if (!source) {
          setAvatarUrl(null);
          return undefined;
        }

        return resolveProducerAvatarUrl(source).then(setAvatarUrl);
      })
      .catch((error) => console.error('Erro ao restaurar avatar:', error));
  }, [avatarKey, profile?.fotoUrl]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshProfile(), loadData()]);
      setFeedback(null);
    } catch (error) {
      console.error('Erro ao atualizar perfil do proprietario:', error);
      setFeedback({ type: 'error', message: 'Não foi possivel atualizar os dados agora.' });
    } finally {
      setRefreshing(false);
    }
  }, [loadData, refreshProfile]);

  const displayName = useMemo(
    () => buildDisplayName({ profileName: profile?.nomeCompleto, producerName: state.producer?.nome, email: user?.email }),
    [profile?.nomeCompleto, state.producer?.nome, user?.email]
  );
  const totalArea = useMemo(() => state.properties.reduce((sum, item) => sum + Number(item.area_total ?? 0), 0), [state.properties]);
  const activeProperties = useMemo(() => state.properties.filter((item) => item.status_propriedade === 'ativo').length, [state.properties]);
  const memberSince = useMemo(() => formatMemberSince(profile?.criadoEm), [profile?.criadoEm]);

  const openEdit = useCallback(() => {
    setEditName(profile?.nomeCompleto ?? state.producer?.nome ?? '');
    setEditPhone(profile?.telefone ?? state.producer?.telefone ?? '');
    setEditVisible(true);
  }, [profile?.nomeCompleto, profile?.telefone, state.producer?.nome, state.producer?.telefone]);

  const closeEdit = useCallback(() => {
    if (!saving) setEditVisible(false);
  }, [saving]);

  const openPassword = useCallback(() => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordVisible(true);
  }, []);

  const closePassword = useCallback(() => {
    if (!savingPassword) setPasswordVisible(false);
  }, [savingPassword]);

  const saveProfile = useCallback(async () => {
    if (!userId || !editName.trim()) {
      setFeedback({ type: 'error', message: 'Informe um nome para salvar.' });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      await updateProducerProfile({
        userId,
        producerId: state.producer?.id,
        name: editName.trim(),
        phone: editPhone.trim() || null,
      });
      await Promise.all([refreshProfile(), loadData()]);
      setEditVisible(false);
      setFeedback({ type: 'success', message: 'Os dados do proprietario foram salvos com sucesso.' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }, [editName, editPhone, loadData, refreshProfile, state.producer?.id, userId]);

  const pickPhoto = useCallback(async () => {
    if (!userId || !avatarKey) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback({ type: 'error', message: 'Permita acesso a galeria para alterar a foto.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    try {
      setUploading(true);
      setFeedback(null);
      const uploadResult = await uploadProducerAvatar({ userId, asset: result.assets[0] });
      await persistAvatarPath(avatarKey, uploadResult.avatarPath);
      setAvatarUrl(uploadResult.avatarUrl);
      await refreshProfile();
      setPhotoVisible(false);
      setFeedback({ type: 'success', message: 'A foto do proprietario foi salva com sucesso.' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  }, [avatarKey, refreshProfile, userId]);

  const savePassword = useCallback(async () => {
    const password = newPassword.trim();
    const confirmation = confirmPassword.trim();

    if (password.length < 8) {
      setFeedback({ type: 'error', message: 'A nova senha precisa ter pelo menos 8 caracteres.' });
      return;
    }

    if (password !== confirmation) {
      setFeedback({ type: 'error', message: 'Confirme a nova senha corretamente.' });
      return;
    }

    try {
      setSavingPassword(true);
      setFeedback(null);
      await updateProducerPassword(password);
      setPasswordVisible(false);
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', message: 'Sua senha foi alterada com sucesso.' });
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setSavingPassword(false);
    }
  }, [confirmPassword, newPassword]);

  const handleLogout = useCallback(() => {
    const confirmAndLogout = async () => {
      try {
        await logout();
      } catch {
        setFeedback({ type: 'error', message: 'Não foi possivel sair da conta agora.' });
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Deseja realmente sair do aplicativo?')) void confirmAndLogout();
      return;
    }

    Alert.alert('Sair', 'Deseja realmente sair do aplicativo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void confirmAndLogout() },
    ]);
  }, [logout]);

  return {
    activeProperties,
    avatarUrl,
    closeEdit,
    closePassword,
    confirmPassword,
    displayName,
    editName,
    editPhone,
    editVisible,
    feedback,
    handleLogout,
    handleRefresh,
    loading,
    memberSince,
    openEdit,
    openPassword,
    newPassword,
    passwordVisible,
    photoVisible,
    pickPhoto,
    profile,
    refreshing,
    saveProfile,
    savePassword,
    saving,
    savingPassword,
    setConfirmPassword,
    setEditName,
    setEditPhone,
    setNewPassword,
    setPhotoVisible,
    state,
    totalArea,
    uploading,
    user,
  };
}
