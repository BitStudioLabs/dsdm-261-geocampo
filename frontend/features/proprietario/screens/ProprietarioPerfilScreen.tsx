import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedbackPickup } from '@/features/cadastro-usuario/components/FeedbackPickup';
import { InfoRow } from '@/features/proprietario/components/InfoRow';
import { useProprietarioPerfil } from '@/features/proprietario/hooks/useProprietarioPerfil';
import { PROPRIETARIO_THEME as THEME } from '@/features/proprietario/theme';
import { formatArea, statusLabel } from '@/features/proprietario/utils/formatting';
import { colors } from '@/src/theme/colors';

export default function PerfilProprietarioScreen() {
  const insets = useSafeAreaInsets();
  const {
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
    newPassword,
    openEdit,
    openPassword,
    passwordVisible,
    photoVisible,
    pickPhoto,
    profile,
    refreshing,
    savePassword,
    saveProfile,
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
  } = useProprietarioPerfil();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.page} />
      <FeedbackPickup feedback={feedback} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.primary} />}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: Math.max(insets.top + 10, 28) }]}>
          <Text style={styles.pageTitle}>Perfil</Text>
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <TouchableOpacity style={styles.avatar} onPress={() => setPhotoVisible(true)} activeOpacity={0.9} disabled={uploading}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Ionicons name="person" size={32} color="#fff" />
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.role}>Proprietario Rural</Text>
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={openEdit} activeOpacity={0.9}>
                <Ionicons name="create-outline" size={18} color={THEME.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.badges}>
              <View style={styles.badge}><Text style={styles.badgeText}>{profile?.ativo ? 'Conta ativa' : 'Conta pendente'}</Text></View>
              <View style={styles.badge}><Text style={styles.badgeText}>Desde {memberSince}</Text></View>
            </View>

            <View style={styles.inlineCard}><Ionicons name="mail-outline" size={16} color={THEME.primary} /><Text style={styles.inlineText}>{profile?.email ?? state.producer?.email ?? user?.email ?? 'Sem e-mail'}</Text></View>
            <View style={styles.inlineCard}><Ionicons name="call-outline" size={16} color={THEME.yellow} /><Text style={styles.inlineText}>{profile?.telefone ?? state.producer?.telefone ?? 'Não informado'}</Text></View>

            <View style={styles.profileActions}>
              <TouchableOpacity style={styles.profileActionButton} onPress={() => setPhotoVisible(true)} activeOpacity={0.9} disabled={uploading}>
                <Ionicons name="camera-outline" size={16} color={THEME.primary} />
                <Text style={styles.profileActionText}>{avatarUrl ? 'Trocar foto' : 'Adicionar foto'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileActionButton} onPress={openPassword} activeOpacity={0.9}>
                <Ionicons name="key-outline" size={16} color={THEME.primary} />
                <Text style={styles.profileActionText}>Mudar senha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.profileStatsPanel}>
          <View style={styles.profileStatsHeader}>
            <Text style={styles.profileStatsTitle}>Indicadores do cadastro</Text>
            <View style={styles.profileStatsIcon}>
              <Ionicons name="stats-chart-outline" size={15} color={THEME.primary} />
            </View>
          </View>

          <View style={styles.profileStatsRows}>
            <View style={styles.profileStatItem}>
              <View style={styles.profileStatMarker}>
                <Ionicons name="business-outline" size={15} color={THEME.primary} />
              </View>
              <View style={styles.profileStatCopy}>
                <Text style={styles.profileStatLabel}>Fazendas</Text>
                <Text style={styles.profileStatValue}>{loading ? '...' : state.properties.length}</Text>
              </View>
            </View>

            <View style={styles.profileStatItem}>
              <View style={styles.profileStatMarker}>
                <Ionicons name="leaf-outline" size={15} color={THEME.primary} />
              </View>
              <View style={styles.profileStatCopy}>
                <Text style={styles.profileStatLabel}>Ativas</Text>
                <Text style={styles.profileStatValue}>{loading ? '...' : activeProperties}</Text>
              </View>
            </View>

            <View style={styles.profileStatItemWide}>
              <View style={styles.profileStatMarker}>
                <Ionicons name="map-outline" size={15} color={THEME.primary} />
              </View>
              <View style={styles.profileStatCopy}>
                <Text style={styles.profileStatLabel}>Area total</Text>
                <Text style={styles.profileStatValue}>{loading ? '...' : `${formatArea(totalArea)} ha`}</Text>
              </View>
            </View>

            <View style={styles.profileStatItem}>
              <View style={styles.profileStatMarker}>
                <Ionicons name="clipboard-outline" size={15} color={THEME.primary} />
              </View>
              <View style={styles.profileStatCopy}>
                <Text style={styles.profileStatLabel}>Visitas</Text>
                <Text style={styles.profileStatValue}>{loading ? '...' : state.visitsCount}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cadastro do Proprietario</Text>
          <InfoRow label="Nome" value={displayName} />
          <InfoRow label="CPF / CNPJ" value={state.producer?.cpf_cnpj ?? 'Não informado'} />
          <InfoRow label="Telefone" value={profile?.telefone ?? state.producer?.telefone ?? 'Não informado'} />
          <InfoRow label="E-mail" value={profile?.email ?? state.producer?.email ?? user?.email ?? 'Não informado'} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fazendas Vinculadas</Text>
          {!state.properties.length ? (
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={22} color={THEME.primary} />
              <Text style={styles.emptyTitle}>Nenhuma fazenda vinculada</Text>
              <Text style={styles.emptySubtitle}>Assim que uma propriedade for vinculada ao seu cadastro, ela aparecera aqui.</Text>
            </View>
          ) : (
            state.properties.map((item) => (
              <View key={item.id} style={styles.propertyCard}>
                <Text style={styles.propertyName}>{item.nome}</Text>
                <Text style={styles.propertyMeta}>{item.municipio_nome ?? 'Municipio não informado'}{item.uf ? ` - ${item.uf}` : ''}</Text>
                <Text style={styles.propertyInstructor}>
                  {item.instrutores.length
                    ? `Instrutor${item.instrutores.length > 1 ? 'es' : ''}: ${item.instrutores.join(', ')}`
                    : 'Nenhum instrutor vinculado no momento'}
                </Text>
                <View style={styles.propertyFooter}>
                  <Text style={styles.propertyTag}>{statusLabel(item.status_propriedade)}</Text>
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

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar perfil</Text>
              <TouchableOpacity onPress={closeEdit}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Nome do proprietario" placeholderTextColor={THEME.textMuted} />
            <Text style={styles.inputLabel}>Telefone</Text>
            <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Telefone" placeholderTextColor={THEME.textMuted} keyboardType="phone-pad" />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={closeEdit} disabled={saving}><Text style={styles.secondaryText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={saveProfile} disabled={saving}>{saving ? <ActivityIndicator color={THEME.hero} /> : <Text style={styles.primaryText}>Salvar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={passwordVisible} transparent animationType="fade" onRequestClose={closePassword}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mudar senha</Text>
              <TouchableOpacity onPress={closePassword}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Nova senha</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimo de 8 caracteres"
              placeholderTextColor={THEME.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.inputLabel}>Confirmar senha</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Digite novamente"
              placeholderTextColor={THEME.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={closePassword} disabled={savingPassword}><Text style={styles.secondaryText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={savePassword} disabled={savingPassword}>{savingPassword ? <ActivityIndicator color={THEME.hero} /> : <Text style={styles.primaryText}>Salvar senha</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={photoVisible} transparent animationType="fade" onRequestClose={() => setPhotoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Foto de perfil</Text>
              <TouchableOpacity onPress={() => setPhotoVisible(false)}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
            </View>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.previewImage} contentFit="cover" />
            ) : (
              <View style={styles.emptyPreview}>
                <Ionicons name="person-circle-outline" size={56} color={THEME.primary} />
                <Text style={styles.emptyPreviewText}>Nenhuma foto adicionada</Text>
              </View>
            )}
            <TouchableOpacity style={styles.uploadButton} onPress={pickPhoto} disabled={uploading} activeOpacity={0.9}>
              {uploading ? <ActivityIndicator color={THEME.hero} /> : <Ionicons name="image-outline" size={18} color={THEME.hero} />}
              <Text style={styles.uploadText}>{uploading ? 'Enviando...' : avatarUrl ? 'Escolher nova foto' : 'Adicionar foto'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.page },
  content: { paddingBottom: 110 },
  hero: { backgroundColor: THEME.page, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20 },
  pageTitle: { color: '#fff', fontSize: 29, fontWeight: '800', marginBottom: 16 },
  heroCard: { backgroundColor: THEME.hero, borderRadius: 26, padding: 16, borderWidth: 1, borderColor: THEME.lineStrong, shadowColor: '#030804', shadowOpacity: 0.24, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: THEME.avatar, marginRight: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: THEME.lineStrong, shadowColor: THEME.primary, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  avatarImage: { width: '100%', height: '100%' },
  name: { color: '#fff', fontSize: 19, fontWeight: '800' },
  role: { color: THEME.primary, fontSize: 12, marginTop: 2, fontWeight: '700' },
  iconButton: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.panel, borderWidth: 1, borderColor: THEME.line },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  badge: { backgroundColor: THEME.panel, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: THEME.line },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  inlineCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME.panelStrong, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: THEME.line, marginTop: 8 },
  inlineText: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },
  profileActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  profileActionButton: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: THEME.lineStrong, backgroundColor: THEME.panel, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10 },
  profileActionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  profileStatsPanel: {
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 22,
    padding: 14,
    backgroundColor: THEME.panel,
    borderWidth: 1,
    borderColor: THEME.line,
    shadowColor: '#030804',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  profileStatsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  profileStatsTitle: { color: THEME.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  profileStatsIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primarySoft,
    borderWidth: 1,
    borderColor: THEME.lineStrong,
  },
  profileStatsRows: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  profileStatItem: {
    flex: 1,
    minWidth: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 12,
    backgroundColor: THEME.panelStrong,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  profileStatItemWide: {
    flex: 1.35,
    minWidth: '52%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(89, 210, 124, 0.1)',
    borderWidth: 1,
    borderColor: THEME.lineStrong,
  },
  profileStatMarker: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.primarySoft },
  profileStatCopy: { flex: 1 },
  profileStatLabel: { color: THEME.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  profileStatValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  section: { backgroundColor: THEME.panel, borderRadius: 22, padding: 16, marginBottom: 14, marginHorizontal: 18, borderWidth: 1, borderColor: THEME.line, shadowColor: '#030804', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  sectionTitle: { color: THEME.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  empty: { alignItems: 'center', borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: THEME.lineStrong, paddingHorizontal: 16, paddingVertical: 20, gap: 6, backgroundColor: THEME.panelStrong },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  emptySubtitle: { color: THEME.textSoft, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  propertyCard: { marginTop: 10, borderRadius: 18, backgroundColor: THEME.panelStrong, borderWidth: 1, borderColor: THEME.line, padding: 14 },
  propertyName: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  propertyMeta: { color: THEME.textSoft, fontSize: 12, marginBottom: 10 },
  propertyInstructor: { color: THEME.textSoft, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  propertyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  propertyTag: { backgroundColor: THEME.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: THEME.lineStrong, color: THEME.primary, fontSize: 12, fontWeight: '700' },
  propertyArea: { color: '#fff', fontSize: 13, fontWeight: '800' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255, 125, 125, 0.1)', borderRadius: 18, paddingVertical: 15, marginHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255, 125, 125, 0.18)' },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(5, 16, 8, 0.7)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { backgroundColor: THEME.panel, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: THEME.line },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  inputLabel: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: THEME.panelStrong, borderRadius: 14, borderWidth: 1, borderColor: THEME.line, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 13, backgroundColor: THEME.panelStrong },
  secondaryText: { color: THEME.textSoft, fontSize: 14, fontWeight: '700' },
  primaryButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 13, backgroundColor: THEME.primary },
  primaryText: { color: THEME.hero, fontSize: 14, fontWeight: '800' },
  previewImage: { width: '100%', aspectRatio: 1, borderRadius: 18, marginBottom: 14, backgroundColor: THEME.panelStrong },
  emptyPreview: { width: '100%', aspectRatio: 1, borderRadius: 18, marginBottom: 14, backgroundColor: THEME.panelStrong, borderWidth: 1, borderStyle: 'dashed', borderColor: THEME.lineStrong, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyPreviewText: { color: THEME.textSoft, fontSize: 13, fontWeight: '700' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, backgroundColor: THEME.primary },
  uploadText: { color: THEME.hero, fontSize: 14, fontWeight: '800' },
});
