import { FontAwesome6 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { FeedbackPickup } from '@/features/cadastro-usuario/components/FeedbackPickup';
import { GestorProfileStar } from '@/features/gestor-perfil/components/GestorProfileStar';
import { GESTOR_PERFIL_STARS as STARS, GESTOR_PERFIL_THEME as THEME } from '@/features/gestor-perfil/constants';
import { styles } from '@/features/gestor-perfil/styles';
import type { GestorProfileFeedback, GestorStats } from '@/features/gestor-perfil/types';
import { supabase } from '@/src/lib/supabase';

export default function PerfilGestorScreen() {
  const { logout, profile, refreshProfile, user } = useAuth();
  const [stats, setStats] = useState<GestorStats>({
    totalInstrutores: 0,
    alertasFraude: 0,
    visitasMes: 0,
    notificacoesNaoLidas: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [feedback, setFeedback] = useState<GestorProfileFeedback | null>(null);
  const [form, setForm] = useState({
    nomeCompleto: '',
    telefone: '',
    fotoUrl: '',
  });
  const headerProgress = useSharedValue(0);

  useEffect(() => {
    headerProgress.value = withSpring(1, { damping: 15, stiffness: 80 });
  }, [headerProgress]);

  useEffect(() => {
    setForm({
      nomeCompleto: profile?.nomeCompleto ?? '',
      telefone: profile?.telefone ?? '',
      fotoUrl: profile?.fotoUrl ?? '',
    });
  }, [profile?.fotoUrl, profile?.nomeCompleto, profile?.telefone]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = setTimeout(() => {
      setFeedback(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [feedback]);

  const loadStats = async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [instrutoresRes, alertasRes, visitasRes, notificacoesRes] = await Promise.all([
      supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('perfil', 'instrutor').eq('ativo', true),
      supabase
        .from('analises_antifraude')
        .select('*', { count: 'exact', head: true })
        .in('classificacao', ['suspeita', 'alto_risco_vpn']),
      supabase.from('visitas').select('*', { count: 'exact', head: true }).gte('criado_em', startOfMonth.toISOString()),
      supabase.from('notificacoes').select('*', { count: 'exact', head: true }).eq('id_usuario', profile?.id ?? user?.id ?? '').eq('lida', false),
    ]);

    setStats({
      totalInstrutores: instrutoresRes.count ?? 0,
      alertasFraude: alertasRes.count ?? 0,
      visitasMes: visitasRes.count ?? 0,
      notificacoesNaoLidas: notificacoesRes.count ?? 0,
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setLoadingStats(true);
      try {
        await loadStats();
      } catch (error) {
        console.error('Erro ao carregar estatisticas do gestor:', error);
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    setFeedback(null);
    try {
      await Promise.all([refreshProfile(), loadStats()]);
    } catch (error) {
      console.error('Erro ao atualizar perfil do gestor:', error);
      setFeedback({ message: 'Não foi possível atualizar os dados agora.', type: 'error', scope: 'general' });
    } finally {
      setRefreshing(false);
    }
  };

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [{ translateY: (1 - headerProgress.value) * -30 }],
  }));

  const initials = useMemo(() => {
    const source = profile?.nomeCompleto ?? user?.email ?? 'Gestor';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [profile?.nomeCompleto, user?.email]);

  const memberSince = useMemo(() => {
    if (!profile?.criadoEm) {
      return 'Não informado';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(profile.criadoEm));
  }, [profile?.criadoEm]);

  const institutionName = profile?.regionalNome
    ? `${profile.regionalNome}${profile.regionalUf ? ` - ${profile.regionalUf}` : ''}`
    : 'Regional não vinculada';

  const handleChange = (field: 'nomeCompleto' | 'telefone', value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePickPhoto = async () => {
    if (!profile?.id) {
      setFeedback({ message: 'Não foi possível identificar o usuário para enviar a foto.', type: 'error', scope: 'profile' });
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback({ message: 'Permita acesso a galeria para enviar uma foto de perfil.', type: 'error', scope: 'profile' });
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
    setIsUploadingPhoto(true);
    setFeedback(null);

    try {
      const extension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${profile.id}/avatar-${Date.now()}.${extension}`;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessão inválida para enviar a foto de perfil.');
      }

      const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/avatares/${filePath}`;
      const uploadResponse = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
          'Content-Type': asset.mimeType ?? 'image/jpeg',
          'x-upsert': 'true',
        },
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        throw new Error(uploadResponse.body || 'Não foi possível enviar a foto para o bucket.');
      }

      const { data } = supabase.storage.from('avatares').getPublicUrl(filePath);

      const { data: persistedProfile, error: updateError } = await supabase
        .from('usuarios')
        .update({
          foto_url: data.publicUrl,
          foto_path: filePath,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select('foto_url, foto_path')
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!persistedProfile?.foto_path) {
        throw new Error('A foto foi enviada, mas o campo foto_path não foi persistido no banco.');
      }

      setForm((current) => ({
        ...current,
        fotoUrl: data.publicUrl,
      }));
      await refreshProfile();
      setFeedback({ message: 'Foto de perfil atualizada com sucesso.', type: 'success', scope: 'profile' });
    } catch (error) {
      console.error('Erro ao enviar foto de perfil:', error);
      setFeedback({ message: 'Não foi possível enviar a foto agora.', type: 'error', scope: 'profile' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCancelEdit = () => {
    setForm({
      nomeCompleto: profile?.nomeCompleto ?? '',
      telefone: profile?.telefone ?? '',
      fotoUrl: profile?.fotoUrl ?? '',
    });
    setFeedback(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!profile?.id) {
      setFeedback({ message: 'Não foi possível identificar o usuário logado.', type: 'error', scope: 'profile' });
      return;
    }

    if (!form.nomeCompleto.trim()) {
      setFeedback({ message: 'Informe o nome completo antes de salvar.', type: 'error', scope: 'profile' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const { error } = await supabase
      .from('usuarios')
      .update({
        nome_completo: form.nomeCompleto.trim(),
        telefone: form.telefone.trim() || null,
        foto_url: form.fotoUrl.trim() || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', profile.id);

    setIsSaving(false);

    if (error) {
      console.error('Erro ao salvar perfil do gestor:', error);
      setFeedback({ message: 'Não foi possível salvar suas alterações.', type: 'error', scope: 'profile' });
      return;
    }

    await refreshProfile();
    setIsEditing(false);
    setFeedback({ message: 'Perfil atualizado com sucesso.', type: 'success', scope: 'profile' });
  };

  const handleResetPassword = async () => {
    const email = profile?.email ?? user?.email;

    if (!email) {
      setFeedback({ message: 'Seu e-mail não está disponível para recuperação.', type: 'error', scope: 'general' });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'geocampo://reset-password',
    });

    if (error) {
      console.error('Erro ao enviar redefinicao de senha:', error);
      setFeedback({ message: 'Não foi possível enviar o e-mail de redefinicao.', type: 'error', scope: 'general' });
      return;
    }

    setFeedback({ message: 'Enviamos um e-mail para redefinir sua senha.', type: 'success', scope: 'general' });
  };

  const handleLogout = () => {
    const confirmAndLogout = async () => {
      try {
        await logout();
      } catch (error) {
        console.error('Erro ao sair da conta:', error);
        setFeedback({ message: 'Nao foi possivel sair da conta agora.', type: 'error', scope: 'general' });
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Deseja realmente sair do aplicativo?');
      if (confirmed) {
        void confirmAndLogout();
      }
      return;
    }

    Alert.alert('Sair', 'Deseja realmente sair do aplicativo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          void confirmAndLogout();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <FeedbackPickup feedback={feedback} />
      <View style={styles.skyBg}>
        {STARS.map((star) => <GestorProfileStar key={star.id} x={star.x} y={star.y} size={star.size} delay={star.delay} />)}
        <View style={styles.moon}>
          <View style={styles.moonInner}>
            <View style={[styles.crater, { width: 6, height: 6, top: 8, left: 10 }]} />
            <View style={[styles.crater, { width: 4, height: 4, top: 18, left: 22 }]} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.leafLight} />}>
        <Animated.View style={[styles.header, headerStyle]}>
          <View style={styles.avatarBox}>
            {form.fotoUrl ? (
              <Image source={{ uri: form.fotoUrl }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{initials || 'GI'}</Text>
            )}
          </View>
          <Text style={styles.userName}>{profile?.nomeCompleto ?? user?.email ?? 'Gestor Institucional'}</Text>
          <Text style={styles.userEmail}>{profile?.email ?? user?.email ?? 'Sem e-mail cadastrado'}</Text>
          <View style={styles.roleBadge}>
            <FontAwesome6 name="chart-line" size={10} color={THEME.blue} />
            <Text style={styles.roleText}>Gestor Institucional</Text>
          </View>
        </Animated.View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loadingStats ? '...' : stats.visitasMes}</Text>
            <Text style={styles.statLabel}>Visitas no mes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loadingStats ? '...' : stats.totalInstrutores}</Text>
            <Text style={styles.statLabel}>Instrutores ativos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: THEME.gold }]}>{loadingStats ? '...' : stats.alertasFraude}</Text>
            <Text style={styles.statLabel}>Alertas de fraude</Text>
          </View>
        </View>

        <View style={styles.instCard}>
          <View style={styles.instIcon}>
            <FontAwesome6 name="building-columns" size={20} color={THEME.leafLight} />
          </View>
          <View style={styles.instInfo}>
            <Text style={styles.instName}>{institutionName}</Text>
            <Text style={styles.instCode}>Membro desde {memberSince}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dados Pessoais</Text>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)} activeOpacity={0.8}>
                <Text style={styles.sectionAction}>Editar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.fieldLabel}>Nome completo</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={form.nomeCompleto}
            editable={isEditing}
            onChangeText={(value) => handleChange('nomeCompleto', value)}
            placeholder="Nome completo"
            placeholderTextColor={THEME.textMuted}
          />

          <Text style={styles.fieldLabel}>E-mail</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.readonlyText}>{profile?.email ?? user?.email ?? 'Sem e-mail cadastrado'}</Text>
          </View>

          <Text style={styles.fieldLabel}>Telefone</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={form.telefone}
            editable={isEditing}
            onChangeText={(value) => handleChange('telefone', value)}
            placeholder="Telefone"
            placeholderTextColor={THEME.textMuted}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Foto de perfil</Text>
          <TouchableOpacity style={styles.photoUploadCard} onPress={handlePickPhoto} activeOpacity={0.9} disabled={isUploadingPhoto}>
            <View style={styles.photoUploadIcon}>
              {isUploadingPhoto ? (
                <ActivityIndicator color={THEME.leafLight} />
              ) : (
                <FontAwesome6 name="camera" size={16} color={THEME.leafLight} />
              )}
            </View>
            <View style={styles.photoUploadCopy}>
              <Text style={styles.photoUploadTitle}>{isUploadingPhoto ? 'Enviando imagem...' : 'Selecionar nova foto'}</Text>
              <Text style={styles.photoUploadDesc}>
                {form.fotoUrl ? 'Sua foto atual será substituída no bucket avatares.' : 'Escolha uma imagem quadrada para o perfil.'}
              </Text>
            </View>
          </TouchableOpacity>

          {isEditing ? (
            <View style={styles.editActionsRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit} activeOpacity={0.9}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.9} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={THEME.white} /> : <Text style={styles.saveButtonText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Conta e Operação</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Perfil</Text>
            <Text style={styles.infoValue}>Gestor Institucional</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Regional</Text>
            <Text style={styles.infoValue}>{institutionName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status da conta</Text>
            <Text style={styles.infoValue}>{profile?.ativo === false ? 'Inativa' : 'Ativa'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Notificações pendentes</Text>
            <Text style={styles.infoValue}>{loadingStats ? '...' : stats.notificacoesNaoLidas}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ações de Conta</Text>

          <TouchableOpacity style={styles.utilityRow} onPress={handleResetPassword} activeOpacity={0.9}>
            <View style={styles.utilityIcon}>
              <FontAwesome6 name="shield-halved" size={14} color={THEME.leafLight} />
            </View>
            <View style={styles.utilityCopy}>
              <Text style={styles.utilityTitle}>Redefinir senha</Text>
              <Text style={styles.utilityDesc}>Envia um e-mail para trocar sua senha no Supabase.</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={12} color={THEME.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.utilityRow} onPress={onRefresh} activeOpacity={0.9}>
            <View style={styles.utilityIcon}>
              <FontAwesome6 name="rotate" size={14} color={THEME.leafLight} />
            </View>
            <View style={styles.utilityCopy}>
              <Text style={styles.utilityTitle}>Atualizar dados</Text>
              <Text style={styles.utilityDesc}>Busca novamente seu perfil e os indicadores do painel.</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={12} color={THEME.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <FontAwesome6 name="arrow-right-from-bracket" size={16} color={THEME.error} />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <Text style={styles.version}>GeoCampo v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

