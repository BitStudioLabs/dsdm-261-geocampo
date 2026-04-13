import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const THEME = {
  skyTop: '#0a1f0d',
  starColor: 'rgba(255,255,255,0.8)',
  leafLight: '#4dc85a',
  cornYellow: '#f5c842',
  cardBg: 'rgba(10,31,13,0.85)',
  cardBorder: 'rgba(77,200,90,0.2)',
  textGray: 'rgba(255,255,255,0.55)',
  link: '#7de88a',
};

type ProfileStats = {
  visitasMes: number;
  atribuidas: number;
  concluidas: number;
};

const PREFERENCIAS = [
  {
    id: '1',
    title: 'Região de atuação',
    icon: 'navigate-circle-outline',
  },
  {
    id: '2',
    title: 'Notificações',
    icon: 'notifications-outline',
  },
  {
    id: '3',
    title: 'Sincronização offline',
    icon: 'cloud-done-outline',
  },
  {
    id: '4',
    title: 'Segurança da conta',
    icon: 'shield-checkmark-outline',
  },
] as const;

const STARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * 180,
  size: Math.random() * 2 + 0.8,
  opacity: Math.random() * 0.5 + 0.3,
  twinkleDelay: Math.random() * 3000,
}));

const FIREFLIES = Array.from({ length: 4 }, (_, i) => ({
  id: i,
  startX: SCREEN_W * (0.15 + Math.random() * 0.7),
  startY: 60 + Math.random() * 100,
  delay: i * 350,
  size: 3 + Math.random() * 2,
}));

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

function base64ToArrayBuffer(base64: string) {
  const binaryString = globalThis.atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

function extractAvatarPath(value: string) {
  const publicMarker = '/storage/v1/object/public/avatares/';
  const signMarker = '/storage/v1/object/sign/avatares/';

  if (value.includes(publicMarker)) {
    return decodeURIComponent(value.split(publicMarker)[1]?.split('?')[0] ?? '');
  }

  if (value.includes(signMarker)) {
    return decodeURIComponent(value.split(signMarker)[1]?.split('?')[0] ?? '');
  }

  return value;
}

function getAvatarStorageKey(userId: string) {
  return `profile-avatar-path:${userId}`;
}

function AnimatedStar({ star }: { star: (typeof STARS)[0] }) {
  const twinkle = useSharedValue(star.opacity);

  useEffect(() => {
    twinkle.value = withDelay(
      star.twinkleDelay,
      withRepeat(
        withSequence(
          withTiming(star.opacity * 0.3, { duration: 1500 }),
          withTiming(star.opacity, { duration: 1500 })
        ),
        -1,
        true
      )
    );
  }, [star.opacity, star.twinkleDelay, twinkle]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: twinkle.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: THEME.starColor,
        },
        animatedStyle,
      ]}
    />
  );
}

function Firefly({
  startX,
  startY,
  delay,
  size,
}: {
  startX: number;
  startY: number;
  delay: number;
  size: number;
}) {
  const progress = useSharedValue(0);
  const blink = useSharedValue(0.3);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
    blink.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 900 }), withTiming(0.25, { duration: 1100 })),
        -1,
        true
      )
    );
  }, [blink, delay, progress]);

  const glowStyle = useAnimatedStyle(() => {
    const x = startX + Math.sin(progress.value * Math.PI * 2) * 15;
    const y = startY + Math.cos(progress.value * Math.PI * 2) * 10;
    const opacity = interpolate(blink.value, [0.25, 1], [0.2, 0.9]);

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#f7f29b',
      opacity,
      shadowColor: '#fff6a8',
      shadowOpacity: opacity,
      shadowRadius: 8,
      elevation: 6,
    };
  });

  return <Animated.View style={[glowStyle, { pointerEvents: 'none' }]} />;
}

export default function PerfilScreen() {
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
      supabase
        .from('visitas')
        .select('*', { count: 'exact', head: true })
        .eq('id_instrutor', currentUserId),
    ]);

    if (visitasMesRes.error) {
      throw visitasMesRes.error;
    }

    if (atribuicoesRes.error) {
      throw atribuicoesRes.error;
    }

    if (concluidasRes.error) {
      throw concluidasRes.error;
    }

    setStats({
      visitasMes: visitasMesRes.count ?? 0,
      atribuidas: atribuicoesRes.count ?? 0,
      concluidas: concluidasRes.count ?? 0,
    });
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

    const userId = currentUserId;

    let cancelled = false;

    async function hydrateAvatarPath() {
      try {
        const savedPath = await AsyncStorage.getItem(getAvatarStorageKey(userId));

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

      try {
        const { data, error } = await supabase.storage.from('avatares').createSignedUrl(sourcePath, 60 * 60);

        if (!cancelled && !error && data?.signedUrl) {
          setAvatarUrl(`${data.signedUrl}${data.signedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
          return;
        }
      } catch (error) {
        console.error('Erro ao resolver avatar assinado:', error);
      }

      if (!cancelled) {
        const fallbackUrl =
          profile?.fotoUrl && profile.fotoUrl.startsWith('http')
            ? profile.fotoUrl
            : supabase.storage.from('avatares').getPublicUrl(sourcePath).data.publicUrl;
        setAvatarUrl(`${fallbackUrl}${fallbackUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
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

    const userId = currentUserId;

    const sourcePath = profile?.fotoPath ?? (profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : avatarStoragePath);

    if (!sourcePath) {
      return;
    }

    setAvatarStoragePath(sourcePath);
    AsyncStorage.setItem(getAvatarStorageKey(userId), sourcePath).catch((error) => {
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

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Erro ao sair da conta:', error);
    }
  };

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

    const asset = result.assets[0];

    try {
      setIsUploadingPhoto(true);

      const base64File = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileBuffer = base64ToArrayBuffer(base64File);
      const extension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${currentUserId}/avatar-${Date.now()}.${extension}`;
      setAvatarStoragePath(filePath);
      await AsyncStorage.setItem(getAvatarStorageKey(currentUserId), filePath);

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
      setAvatarUrl(
        signedData?.signedUrl
          ? `${signedData.signedUrl}${signedData.signedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
          : `${data.publicUrl}?t=${Date.now()}`
      );

      await refreshProfile();
      Alert.alert('Foto atualizada', 'A foto de perfil foi salva com sucesso.');
    } catch (error) {
      console.error('Erro ao enviar foto do instrutor:', error);
      Alert.alert('Erro ao enviar', getErrorMessage(error));
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

      const { error } = await supabase
        .from('usuarios')
        .update({
          nome_completo: trimmedName,
          telefone: trimmedPhone || null,
        })
        .eq('id', currentUserId);

      if (error) {
        throw error;
      }

      await refreshProfile();
      setEditVisible(false);
      Alert.alert('Perfil atualizado', 'As informações do instrutor foram salvas com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar perfil do instrutor:', error);
      Alert.alert('Erro ao salvar', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [editName, editPhone, profile?.id, refreshProfile, user?.id]);

  const displayName = useMemo(
    () =>
      profile?.nomeCompleto ??
      user?.user_metadata?.nome_completo ??
      user?.user_metadata?.name ??
      user?.email ??
      'Usuário',
    [profile?.nomeCompleto, user?.email, user?.user_metadata]
  );

  const regionLabel = useMemo(() => {
    if (!profile?.regionalNome) {
      return 'Regional não vinculada';
    }

    return `${profile.regionalNome}${profile.regionalUf ? ` - ${profile.regionalUf}` : ''}`;
  }, [profile?.regionalNome, profile?.regionalUf]);

  const summaryCards = useMemo(
    () => [
      {
        id: '1',
        label: 'Visitas no mês',
        value: isLoading ? '...' : String(stats.visitasMes),
        icon: 'clipboard-outline' as const,
        color: THEME.cornYellow,
      },
      {
        id: '2',
        label: 'Atribuídas',
        value: isLoading ? '...' : String(stats.atribuidas),
        icon: 'business-outline' as const,
        color: colors.info,
      },
      {
        id: '3',
        label: 'Concluídas',
        value: isLoading ? '...' : String(stats.concluidas),
        icon: 'checkmark-done-outline' as const,
        color: THEME.leafLight,
      },
    ],
    [isLoading, stats]
  );

  const preferencesCopy = useMemo(
    () => [
      {
        ...PREFERENCIAS[0],
        subtitle: regionLabel,
      },
      {
        ...PREFERENCIAS[1],
        subtitle: 'Alertas de visitas e resultado das análises',
      },
      {
        ...PREFERENCIAS[2],
        subtitle: 'Sincronização local habilitada para este dispositivo',
      },
      {
        ...PREFERENCIAS[3],
        subtitle: profile?.ativo ? 'Conta ativa e autenticada no sistema' : 'Conta com acesso pendente',
      },
    ],
    [profile?.ativo, regionLabel]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.skyTop} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.leafLight} />
        }>
        <View style={styles.heroSection}>
          <View style={styles.skyBg} />

          {STARS.map((star) => (
            <AnimatedStar key={star.id} star={star} />
          ))}

          {FIREFLIES.map((firefly) => (
            <Firefly key={firefly.id} {...firefly} />
          ))}

            <View style={styles.moonContainer}>
            <View style={styles.moon}>
              <View style={styles.moonInner}>
                <View style={[styles.crater, { top: 5, left: 6, width: 5, height: 5 }]} />
                <View style={[styles.crater, { top: 14, left: 16, width: 3, height: 3 }]} />
                <View style={[styles.crater, { top: 20, left: 8, width: 4, height: 4 }]} />
              </View>
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Perfil</Text>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <TouchableOpacity style={styles.avatar} activeOpacity={0.9} onPress={openPhotoOptions} disabled={isUploadingPhoto}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Ionicons name="person" size={30} color="#fff" />
                )}
                <View style={styles.avatarBadge}>
                  {isUploadingPhoto ? (
                    <Ionicons name="sync-outline" size={12} color={THEME.skyTop} />
                  ) : (
                    <Ionicons name="camera-outline" size={12} color={THEME.skyTop} />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.heroCopy}>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.role}>Instrutor de Campo</Text>
              </View>
              <TouchableOpacity style={styles.heroIconButton} activeOpacity={0.9} onPress={openEditModal}>
                <Ionicons name="create-outline" size={18} color={THEME.link} />
              </TouchableOpacity>
            </View>

            <View style={styles.badgesRow}>
              <View style={styles.badge}>
                <Ionicons
                  name={profile?.ativo ? 'checkmark-circle' : 'pause-circle'}
                  size={15}
                  color={profile?.ativo ? THEME.leafLight : THEME.cornYellow}
                />
                <Text style={styles.badgeText}>{profile?.ativo ? 'Ativo' : 'Pendente'}</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="location-outline" size={15} color={THEME.cornYellow} />
                <Text style={styles.badgeText}>
                  {profile?.regionalUf ? profile.regionalUf : 'Sem regional'}
                </Text>
              </View>
            </View>

            <View style={styles.inlineInfoRow}>
              <View style={styles.inlineInfoPill}>
                <Ionicons name="navigate-circle-outline" size={16} color={THEME.cornYellow} />
                <Text style={styles.inlineInfoText}>{regionLabel}</Text>
              </View>
              <View style={styles.inlineInfoPill}>
                <Ionicons name="call-outline" size={16} color={THEME.link} />
                <Text style={styles.inlineInfoText}>{profile?.telefone ?? 'Não informado'}</Text>
              </View>
            </View>

            <View style={styles.emailCard}>
              <Ionicons name="mail-outline" size={18} color={THEME.link} />
              <Text style={styles.emailText}>{profile?.email ?? user?.email ?? 'Sem e-mail cadastrado'}</Text>
            </View>

            <TouchableOpacity style={styles.photoHint} activeOpacity={0.85} onPress={openPhotoOptions} disabled={isUploadingPhoto}>
              <Ionicons name="image-outline" size={16} color={THEME.link} />
              <Text style={styles.photoHintText}>{isUploadingPhoto ? 'Enviando foto...' : 'Toque no avatar para ver ou trocar a foto'}</Text>
            </TouchableOpacity>

            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.heroActionSecondary} activeOpacity={0.92} onPress={handleRefresh}>
                <Ionicons name="refresh-outline" size={16} color={THEME.link} />
                <Text style={styles.heroActionSecondaryText}>Atualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map((item) => (
            <View key={item.id} style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.summaryValue}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCIAS E OPERACAO</Text>
          {preferencesCopy.map((item) => (
            <TouchableOpacity key={item.id} activeOpacity={0.9} style={styles.preferenceRow}>
              <View style={styles.preferenceIcon}>
                <Ionicons name={item.icon} size={18} color={THEME.leafLight} />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={styles.preferenceTitle}>{item.title}</Text>
                <Text style={styles.preferenceSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#96A099" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.92} style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar perfil</Text>
              <TouchableOpacity onPress={closeEditModal} activeOpacity={0.8} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Nome do instrutor"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                editable={!isSaving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefone</Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Telefone para contato"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                keyboardType="phone-pad"
                editable={!isSaving}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={closeEditModal} disabled={isSaving}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={handleSaveProfile} disabled={isSaving}>
                <Text style={styles.primaryButtonText}>{isSaving ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={photoOptionsVisible} transparent animationType="fade" onRequestClose={closePhotoOptions}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Foto de perfil</Text>
              <TouchableOpacity onPress={closePhotoOptions} activeOpacity={0.8} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.photoOptionButton} activeOpacity={0.9} onPress={handleViewPhoto}>
              <Ionicons name="eye-outline" size={18} color={THEME.link} />
              <Text style={styles.photoOptionText}>Ver foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoOptionButton} activeOpacity={0.9} onPress={handlePickPhoto}>
              <Ionicons name="image-outline" size={18} color={THEME.link} />
              <Text style={styles.photoOptionText}>Trocar foto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={photoViewerVisible} transparent animationType="fade" onRequestClose={() => setPhotoViewerVisible(false)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerCloseButton} activeOpacity={0.85} onPress={() => setPhotoViewerVisible(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.viewerCard}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.viewerImage} contentFit="cover" /> : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 110 },
  heroSection: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  skyBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.skyTop,
  },
  moonContainer: {
    position: 'absolute',
    top: 20,
    right: 60,
  },
  moon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fffbe0',
    shadowColor: '#fffbe0',
    shadowOpacity: 0.8,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  moonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    backgroundColor: '#fffbe0',
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    backgroundColor: 'rgba(200,190,150,0.4)',
    borderRadius: 50,
  },
  header: { marginBottom: 16, zIndex: 10 },
  title: {
    color: '#fff',
    fontSize: 29,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    zIndex: 10,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#A56B3F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 3,
    borderColor: 'rgba(77,200,90,0.3)',
    shadowColor: THEME.leafLight,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.leafLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.skyTop,
  },
  heroCopy: { flex: 1 },
  heroIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.15)',
  },
  name: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 1,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  role: { color: THEME.link, fontSize: 12, marginBottom: 0 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.15)',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  inlineInfoRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  inlineInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: '100%',
  },
  inlineInfoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  emailText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  photoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  photoHintText: {
    color: THEME.link,
    fontSize: 12,
    fontWeight: '600',
  },
  photoOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  photoOptionText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: '700',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  heroActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.15)',
  },
  heroActionSecondaryText: {
    color: THEME.link,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 16, paddingHorizontal: 18 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.1)',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryValue: { color: colors.textDark, fontSize: 28, fontWeight: '800', marginBottom: 2 },
  summaryLabel: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  section: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    marginHorizontal: 18,
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.1)',
  },
  sectionTitle: {
    color: THEME.skyTop,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(77,200,90,0.15)',
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(77,200,90,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { color: colors.textDark, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  preferenceSubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F0',
    borderRadius: 18,
    paddingVertical: 15,
    marginTop: 4,
    marginHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(226,91,91,0.2)',
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 16, 8, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: '800',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textDark,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: colors.background,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: THEME.leafLight,
  },
  primaryButtonText: {
    color: THEME.skyTop,
    fontSize: 14,
    fontWeight: '800',
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  viewerCloseButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 2,
  },
  viewerCard: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
});
