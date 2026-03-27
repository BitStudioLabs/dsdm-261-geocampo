import { FontAwesome6 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const THEME = {
  skyTop: '#0a1f0d',
  leafLight: '#4dc85a',
  gold: '#f5c842',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textMuted: 'rgba(255,255,255,0.55)',
  cardBg: 'rgba(10,31,13,0.85)',
  error: '#ff6b6b',
  blue: '#5b9cff',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.1)',
};

const STARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * (SCREEN_H * 0.2),
  size: Math.random() * 2 + 0.8,
  delay: Math.random() * 2000,
}));

type GestorStats = {
  totalInstrutores: number;
  alertasFraude: number;
  visitasMes: number;
  notificacoesNaoLidas: number;
};

function Star({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(0.9, { duration: 1200 }), withTiming(0.3, { duration: 1200 })), -1, true)
    );
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(255,255,255,0.85)',
        },
        style,
      ]}
    />
  );
}

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
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error'; scope: 'profile' | 'general' } | null>(null);
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
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const extension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${profile.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from('avatares').upload(filePath, blob, {
        upsert: true,
        contentType: asset.mimeType ?? 'image/jpeg',
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatares').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          foto_url: data.publicUrl,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
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
        router.replace('/login');
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
      <View style={styles.skyBg}>
        {STARS.map((star) => <Star key={star.id} x={star.x} y={star.y} size={star.size} delay={star.delay} />)}
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

          {feedback?.scope === 'profile' ? (
            <View style={[styles.feedbackBox, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
              <Text style={styles.feedbackInlineText}>{feedback.message}</Text>
            </View>
          ) : null}

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

        {feedback?.scope === 'general' ? (
          <View style={[styles.feedbackBox, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError, styles.feedbackGeneral]}>
            <Text style={styles.feedbackInlineText}>{feedback.message}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <FontAwesome6 name="arrow-right-from-bracket" size={16} color={THEME.error} />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <Text style={styles.version}>GeoCampo v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.skyTop },
  skyBg: { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_H * 0.25, backgroundColor: THEME.skyTop },
  moon: { position: 'absolute', top: 45, right: 30, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fffbe0', shadowColor: '#fffbe0', shadowOpacity: 0.8, shadowRadius: 18, elevation: 8 },
  moonInner: { width: '100%', height: '100%', borderRadius: 18, overflow: 'hidden' },
  crater: { position: 'absolute', backgroundColor: 'rgba(200,190,150,0.4)', borderRadius: 50 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 110 },
  header: { alignItems: 'center', marginBottom: 20 },
  avatarBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(91,156,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(91,156,255,0.3)' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 22 },
  avatarText: { fontSize: 26, fontWeight: '800', color: THEME.blue },
  userName: { fontSize: 24, fontWeight: '700', color: THEME.white, marginBottom: 4, textAlign: 'center' },
  userEmail: { fontSize: 14, color: THEME.textMuted, marginBottom: 12, textAlign: 'center' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(91,156,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 8 },
  roleText: { fontSize: 12, fontWeight: '600', color: THEME.blue },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: THEME.cardBg, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  statValue: { fontSize: 22, fontWeight: '800', color: THEME.white, marginBottom: 4 },
  statLabel: { fontSize: 11, color: THEME.textMuted, textAlign: 'center' },
  instCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.cardBg, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)', gap: 14 },
  instIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(77,200,90,0.15)', alignItems: 'center', justifyContent: 'center' },
  instInfo: { flex: 1 },
  instName: { fontSize: 15, fontWeight: '700', color: THEME.white, marginBottom: 4 },
  instCode: { fontSize: 12, color: THEME.textMuted },
  sectionCard: { backgroundColor: THEME.cardBg, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: THEME.white, fontSize: 16, fontWeight: '700' },
  sectionAction: { color: THEME.leafLight, fontSize: 13, fontWeight: '700' },
  fieldLabel: { color: THEME.textMuted, fontSize: 12, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: THEME.inputBg, borderWidth: 1, borderColor: THEME.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: THEME.white, fontSize: 14 },
  inputDisabled: { opacity: 0.75 },
  readonlyText: { color: THEME.offWhite, fontSize: 14 },
  photoUploadCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: THEME.inputBg, borderWidth: 1, borderColor: THEME.inputBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginTop: 2 },
  photoUploadIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(77,200,90,0.15)' },
  photoUploadCopy: { flex: 1 },
  photoUploadTitle: { color: THEME.white, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  photoUploadDesc: { color: THEME.textMuted, fontSize: 12, lineHeight: 16 },
  editActionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 13, backgroundColor: 'rgba(255,255,255,0.08)' },
  cancelButtonText: { color: THEME.white, fontWeight: '700' },
  saveButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 13, backgroundColor: THEME.leafLight },
  saveButtonText: { color: THEME.white, fontWeight: '800' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  infoLabel: { color: THEME.textMuted, fontSize: 13, flex: 1, marginRight: 12 },
  infoValue: { color: THEME.offWhite, fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  utilityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  utilityIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(77,200,90,0.15)', alignItems: 'center', justifyContent: 'center' },
  utilityCopy: { flex: 1 },
  utilityTitle: { color: THEME.white, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  utilityDesc: { color: THEME.textMuted, fontSize: 12, lineHeight: 16 },
  feedbackBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, borderWidth: 1 },
  feedbackSuccess: { backgroundColor: 'rgba(77,200,90,0.15)', borderColor: 'rgba(77,200,90,0.35)' },
  feedbackError: { backgroundColor: 'rgba(255,107,107,0.15)', borderColor: 'rgba(255,107,107,0.35)' },
  feedbackInlineText: { color: THEME.white, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  feedbackGeneral: { marginBottom: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,107,107,0.15)', borderRadius: 16, paddingVertical: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)' },
  logoutText: { fontSize: 15, fontWeight: '700', color: THEME.error },
  version: { textAlign: 'center', fontSize: 12, color: THEME.textMuted, marginTop: 20 },
});
