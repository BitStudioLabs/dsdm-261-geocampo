import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme/colors';

const THEME = {
  sky: '#0f281a',
  cardDark: 'rgba(15,40,26,0.88)',
  gold: '#d8b45b',
  green: '#74d27d',
  sand: '#f6e2af',
  border: 'rgba(216,180,91,0.18)',
};

type Producer = { id: number; nome: string | null; telefone: string | null; email: string | null; cpf_cnpj: string | null };
type Property = { id: number; nome: string; municipio_nome: string | null; uf: string | null; area_total: number | null; status_propriedade: string | null };

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') return (error as any).message;
  return 'Erro desconhecido.';
}

function base64ToArrayBuffer(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function extractAvatarPath(value: string) {
  const publicMarker = '/storage/v1/object/public/avatares/';
  const signMarker = '/storage/v1/object/sign/avatares/';
  if (value.includes(publicMarker)) return decodeURIComponent(value.split(publicMarker)[1]?.split('?')[0] ?? '');
  if (value.includes(signMarker)) return decodeURIComponent(value.split(signMarker)[1]?.split('?')[0] ?? '');
  return value;
}

function formatArea(area: number) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(area);
}

function propertyStatusLabel(value: string | null) {
  if (value === 'ativo') return 'Ativa';
  if (value === 'inativo') return 'Inativa';
  if (value === 'em_analise') return 'Em analise';
  return 'Sem status';
}

export default function PerfilProprietarioScreen() {
  const { logout, profile, refreshProfile, user } = useAuth();
  const userId = profile?.id ?? user?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [producer, setProducer] = useState<Producer | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [visitsCount, setVisitsCount] = useState(0);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const avatarKey = userId ? `profile-avatar-path:${userId}` : null;

  const loadData = useCallback(async () => {
    if (!userId) return;

    const { data: producerData, error: producerError } = await supabase
      .from('produtores')
      .select('id, nome, telefone, email, cpf_cnpj')
      .eq('usuario_id', userId)
      .maybeSingle();

    if (producerError) throw producerError;
    setProducer((producerData as Producer | null) ?? null);

    if (!producerData?.id) {
      setProperties([]);
      setVisitsCount(0);
      return;
    }

    const { data: propertiesData, error: propertiesError } = await supabase
      .from('propriedades')
      .select('id, nome, municipio_nome, uf, area_total, status_propriedade')
      .eq('id_produtor', producerData.id)
      .order('nome', { ascending: true });

    if (propertiesError) throw propertiesError;

    const propertyList = (propertiesData as Property[] | null) ?? [];
    setProperties(propertyList);

    if (!propertyList.length) {
      setVisitsCount(0);
      return;
    }

    const { count, error: visitsError } = await supabase
      .from('visitas')
      .select('*', { count: 'exact', head: true })
      .in('id_propriedade', propertyList.map((item) => item.id));

    if (visitsError) throw visitsError;
    setVisitsCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      try {
        await loadData();
      } catch (error) {
        console.error('Erro ao carregar perfil do proprietario:', error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [loadData]);

  useEffect(() => {
    if (!avatarKey) return;
    AsyncStorage.getItem(avatarKey)
      .then((saved) => {
        const source = profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : saved;
        if (!source) {
          setAvatarUrl(null);
          return;
        }
        return supabase.storage.from('avatares').createSignedUrl(source, 3600).then(({ data }) => {
          setAvatarUrl(data?.signedUrl ?? supabase.storage.from('avatares').getPublicUrl(source).data.publicUrl);
        });
      })
      .catch((error) => console.error('Erro ao restaurar avatar:', error));
  }, [avatarKey, profile?.fotoUrl]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshProfile(), loadData()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, refreshProfile]);

  const displayName = useMemo(
    () => profile?.nomeCompleto ?? producer?.nome ?? user?.email ?? 'Proprietario Rural',
    [producer?.nome, profile?.nomeCompleto, user?.email]
  );
  const totalArea = useMemo(() => properties.reduce((sum, item) => sum + Number(item.area_total ?? 0), 0), [properties]);
  const activeProperties = useMemo(() => properties.filter((item) => item.status_propriedade === 'ativo').length, [properties]);
  const memberSince = useMemo(() => {
    if (!profile?.criadoEm) return 'Nao informado';
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(profile.criadoEm));
  }, [profile?.criadoEm]);

  const openEdit = () => {
    setEditName(profile?.nomeCompleto ?? producer?.nome ?? '');
    setEditPhone(profile?.telefone ?? producer?.telefone ?? '');
    setEditVisible(true);
  };

  const saveProfile = async () => {
    if (!userId || !editName.trim()) {
      Alert.alert('Dados invalidos', 'Informe um nome para salvar.');
      return;
    }
    try {
      setSaving(true);
      const { error: userError } = await supabase
        .from('usuarios')
        .update({ nome_completo: editName.trim(), telefone: editPhone.trim() || null, atualizado_em: new Date().toISOString() })
        .eq('id', userId);
      if (userError) throw userError;

      if (producer?.id) {
        const { error: producerError } = await supabase
          .from('produtores')
          .update({ nome: editName.trim(), telefone: editPhone.trim() || null, atualizado_em: new Date().toISOString() })
          .eq('id', producer.id);
        if (producerError) throw producerError;
      }

      await Promise.all([refreshProfile(), loadData()]);
      setEditVisible(false);
      Alert.alert('Perfil atualizado', 'Os dados do proprietario foram salvos com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao salvar', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    if (!userId || !avatarKey) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissao necessaria', 'Permita acesso a galeria para alterar a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    try {
      setUploading(true);
      const asset = result.assets[0];
      const base64File = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const extension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${userId}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('avatares').upload(filePath, base64ToArrayBuffer(base64File), {
        upsert: true,
        contentType: asset.mimeType ?? 'image/jpeg',
      });
      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from('avatares').getPublicUrl(filePath).data.publicUrl;
      const { error: updateError } = await supabase.from('usuarios').update({ foto_url: publicUrl, atualizado_em: new Date().toISOString() }).eq('id', userId);
      if (updateError) throw updateError;

      await AsyncStorage.setItem(avatarKey, filePath);
      const { data } = await supabase.storage.from('avatares').createSignedUrl(filePath, 3600);
      setAvatarUrl(data?.signedUrl ?? publicUrl);
      await refreshProfile();
      setPhotoVisible(false);
      Alert.alert('Foto atualizada', 'A foto do proprietario foi salva com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao enviar', getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    const confirmAndLogout = async () => {
      try {
        await logout();
        router.replace('/login');
      } catch {
        Alert.alert('Erro ao sair', 'Nao foi possivel sair da conta agora.');
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.sky} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.gold} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.pageTitle}>Perfil</Text>
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <TouchableOpacity style={styles.avatar} onPress={() => setPhotoVisible(true)} activeOpacity={0.9} disabled={uploading}>
                {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" /> : <Ionicons name="person" size={32} color={THEME.sky} />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.role}>Proprietario Rural</Text>
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={openEdit} activeOpacity={0.9}>
                <Ionicons name="create-outline" size={18} color={THEME.gold} />
              </TouchableOpacity>
            </View>

            <View style={styles.badges}>
              <View style={styles.badge}><Text style={styles.badgeText}>{profile?.ativo ? 'Conta ativa' : 'Conta pendente'}</Text></View>
              <View style={styles.badge}><Text style={styles.badgeText}>Desde {memberSince}</Text></View>
            </View>

            <View style={styles.inlineCard}><Ionicons name="mail-outline" size={16} color={THEME.gold} /><Text style={styles.inlineText}>{profile?.email ?? producer?.email ?? user?.email ?? 'Sem e-mail'}</Text></View>
            <View style={styles.inlineCard}><Ionicons name="call-outline" size={16} color={THEME.green} /><Text style={styles.inlineText}>{profile?.telefone ?? producer?.telefone ?? 'Nao informado'}</Text></View>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{loading ? '...' : properties.length}</Text><Text style={styles.statLabel}>Fazendas</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{loading ? '...' : activeProperties}</Text><Text style={styles.statLabel}>Ativas</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{loading ? '...' : formatArea(totalArea)}</Text><Text style={styles.statLabel}>Area total (ha)</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{loading ? '...' : visitsCount}</Text><Text style={styles.statLabel}>Visitas</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cadastro do Proprietario</Text>
          <InfoRow label="Nome" value={displayName} />
          <InfoRow label="CPF / CNPJ" value={producer?.cpf_cnpj ?? 'Nao informado'} />
          <InfoRow label="Telefone" value={profile?.telefone ?? producer?.telefone ?? 'Nao informado'} />
          <InfoRow label="E-mail" value={profile?.email ?? producer?.email ?? user?.email ?? 'Nao informado'} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fazendas Vinculadas</Text>
          {!properties.length ? (
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={22} color={THEME.gold} />
              <Text style={styles.emptyTitle}>Nenhuma fazenda vinculada</Text>
              <Text style={styles.emptySubtitle}>Assim que uma propriedade for vinculada ao seu cadastro, ela aparecera aqui.</Text>
            </View>
          ) : (
            properties.map((item) => (
              <View key={item.id} style={styles.propertyCard}>
                <Text style={styles.propertyName}>{item.nome}</Text>
                <Text style={styles.propertyMeta}>{item.municipio_nome ?? 'Municipio nao informado'}{item.uf ? ` - ${item.uf}` : ''}</Text>
                <View style={styles.propertyFooter}>
                  <Text style={styles.propertyTag}>{propertyStatusLabel(item.status_propriedade)}</Text>
                  <Text style={styles.propertyArea}>{formatArea(Number(item.area_total ?? 0))} ha</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.92}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar perfil</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}><Ionicons name="close" size={20} color={colors.textDark} /></TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Nome do proprietario" placeholderTextColor={colors.textMuted} />
            <Text style={styles.inputLabel}>Telefone</Text>
            <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Telefone" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditVisible(false)} disabled={saving}><Text style={styles.secondaryText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={saveProfile} disabled={saving}>{saving ? <ActivityIndicator color={THEME.sky} /> : <Text style={styles.primaryText}>Salvar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={photoVisible} transparent animationType="fade" onRequestClose={() => setPhotoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Foto de perfil</Text>
              <TouchableOpacity onPress={() => setPhotoVisible(false)}><Ionicons name="close" size={20} color={colors.textDark} /></TouchableOpacity>
            </View>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.previewImage} contentFit="cover" /> : null}
            <TouchableOpacity style={styles.uploadButton} onPress={pickPhoto} disabled={uploading} activeOpacity={0.9}>
              {uploading ? <ActivityIndicator color={THEME.sky} /> : <Ionicons name="image-outline" size={18} color={THEME.sky} />}
              <Text style={styles.uploadText}>{uploading ? 'Enviando...' : 'Escolher nova foto'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 110 },
  hero: { backgroundColor: THEME.sky, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20 },
  pageTitle: { color: '#fff', fontSize: 29, fontWeight: '800', marginBottom: 16 },
  heroCard: { backgroundColor: THEME.cardDark, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: THEME.border },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: THEME.sand, marginRight: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  name: { color: '#fff', fontSize: 19, fontWeight: '800' },
  role: { color: THEME.gold, fontSize: 12, marginTop: 2 },
  iconButton: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: THEME.border },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  badge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: THEME.border },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  inlineCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 8 },
  inlineText: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 18, marginTop: 16, marginBottom: 16 },
  statCard: { width: '48.5%', backgroundColor: colors.card, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  statValue: { color: colors.textDark, fontSize: 24, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  statLabel: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  section: { backgroundColor: colors.card, borderRadius: 22, padding: 16, marginBottom: 14, marginHorizontal: 18, borderWidth: 1, borderColor: THEME.border },
  sectionTitle: { color: THEME.sky, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(216,180,91,0.18)' },
  infoLabel: { flex: 1, color: colors.textMuted, fontSize: 13 },
  infoValue: { flex: 1, color: colors.textDark, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  empty: { alignItems: 'center', borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(216,180,91,0.35)', paddingHorizontal: 16, paddingVertical: 20, gap: 6 },
  emptyTitle: { color: colors.textDark, fontSize: 15, fontWeight: '800' },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  propertyCard: { marginTop: 10, borderRadius: 18, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: THEME.border, padding: 14 },
  propertyName: { color: colors.textDark, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  propertyMeta: { color: colors.textMuted, fontSize: 12, marginBottom: 10 },
  propertyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  propertyTag: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: THEME.border, color: colors.textDark, fontSize: 12, fontWeight: '700' },
  propertyArea: { color: colors.textDark, fontSize: 13, fontWeight: '800' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF0F0', borderRadius: 18, paddingVertical: 15, marginHorizontal: 18, borderWidth: 1, borderColor: 'rgba(226,91,91,0.2)' },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(5, 16, 8, 0.7)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: THEME.border },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { color: colors.textDark, fontSize: 20, fontWeight: '800' },
  inputLabel: { color: colors.textDark, fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: colors.background, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, paddingVertical: 12, color: colors.textDark, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 13, backgroundColor: colors.background },
  secondaryText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  primaryButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 13, backgroundColor: THEME.gold },
  primaryText: { color: THEME.sky, fontSize: 14, fontWeight: '800' },
  previewImage: { width: '100%', aspectRatio: 1, borderRadius: 18, marginBottom: 14, backgroundColor: colors.cardMuted },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, backgroundColor: THEME.gold },
  uploadText: { color: THEME.sky, fontSize: 14, fontWeight: '800' },
});
