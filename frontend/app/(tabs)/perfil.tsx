import React, { useEffect } from 'react';
import { Image } from 'expo-image';
import {
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

import { SectionCard } from '@/features/instrutor/components/SectionCard';
import { useInstructorProfile } from '@/features/instrutor/hooks/useInstructorProfile';
import { colors } from '@/src/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const THEME = {
  page: '#06180a',
  hero: '#0a2711',
  panel: '#0f2116',
  panelStrong: '#12301b',
  starColor: 'rgba(255,255,255,0.18)',
  line: 'rgba(122, 217, 140, 0.14)',
  lineStrong: 'rgba(122, 217, 140, 0.28)',
  primary: '#59d27c',
  primarySoft: 'rgba(89, 210, 124, 0.16)',
  yellow: '#f2c94c',
  textSoft: 'rgba(240, 247, 241, 0.72)',
  textMuted: 'rgba(240, 247, 241, 0.55)',
};

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
  const {
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
    summaryCards,
    user,
  } = useInstructorProfile(THEME.primary, THEME.yellow);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.page} />
      

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.primary} />
        }>
        <View style={styles.heroSection}>
          <View style={styles.skyBg} />

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
                    <Ionicons name="sync-outline" size={12} color={THEME.hero} />
                  ) : (
                    <Ionicons name="camera-outline" size={12} color={THEME.hero} />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.heroCopy}>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.role}>Instrutor de Campo</Text>
              </View>
              <TouchableOpacity style={styles.heroIconButton} activeOpacity={0.9} onPress={openEditModal}>
                <Ionicons name="create-outline" size={18} color={THEME.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.badgesRow}>
              <View style={styles.badge}>
                <Ionicons
                  name={profile?.ativo ? 'checkmark-circle' : 'pause-circle'}
                  size={15}
                  color={profile?.ativo ? THEME.primary : THEME.yellow}
                />
                <Text style={styles.badgeText}>{profile?.ativo ? 'Ativo' : 'Pendente'}</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="location-outline" size={15} color={THEME.yellow} />
                <Text style={styles.badgeText}>
                  {profile?.regionalUf ? profile.regionalUf : 'Sem regional'}
                </Text>
              </View>
            </View>

            <View style={styles.inlineInfoRow}>
              <View style={styles.inlineInfoPill}>
                <Ionicons name="navigate-circle-outline" size={16} color={THEME.yellow} />
                <Text style={styles.inlineInfoText}>{regionLabel}</Text>
              </View>
              <View style={styles.inlineInfoPill}>
                <Ionicons name="call-outline" size={16} color={THEME.primary} />
                <Text style={styles.inlineInfoText}>{profile?.telefone ?? 'Não informado'}</Text>
              </View>
            </View>

            <View style={styles.emailCard}>
              <Ionicons name="mail-outline" size={18} color={THEME.primary} />
              <Text style={styles.emailText}>{profile?.email ?? user?.email ?? 'Sem e-mail cadastrado'}</Text>
            </View>

            <TouchableOpacity style={styles.photoHint} activeOpacity={0.85} onPress={openPhotoOptions} disabled={isUploadingPhoto}>
              <Ionicons name="image-outline" size={16} color={THEME.primary} />
              <Text style={styles.photoHintText}>{isUploadingPhoto ? 'Enviando foto...' : 'Toque no avatar para ver ou trocar a foto'}</Text>
            </TouchableOpacity>

            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.heroActionSecondary} activeOpacity={0.92} onPress={handleRefresh}>
                <Ionicons name="refresh-outline" size={16} color={THEME.primary} />
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

        <SectionCard
          containerStyle={styles.section}
          title="PREFERENCIAS E OPERACAO"
          titleStyle={styles.sectionTitle}>
          {preferencesCopy.map((item) => (
            <TouchableOpacity key={item.id} activeOpacity={0.9} style={styles.preferenceRow}>
              <View style={styles.preferenceIcon}>
                <Ionicons name={item.icon} size={18} color={THEME.primary} />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={styles.preferenceTitle}>{item.title}</Text>
                <Text style={styles.preferenceSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#96A099" />
            </TouchableOpacity>
          ))}
        </SectionCard>

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
              <Ionicons name="eye-outline" size={18} color={THEME.primary} />
              <Text style={styles.photoOptionText}>Ver foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoOptionButton} activeOpacity={0.9} onPress={handlePickPhoto}>
              <Ionicons name="image-outline" size={18} color={THEME.primary} />
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
  container: { flex: 1, backgroundColor: THEME.page },
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
    backgroundColor: THEME.page,
  },
  header: { marginBottom: 16, zIndex: 10 },
  title: { color: '#fff', fontSize: 29, fontWeight: '800' },
  heroCard: {
    backgroundColor: THEME.hero,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.lineStrong,
    zIndex: 10,
    shadowColor: '#030804',
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
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
    borderColor: THEME.lineStrong,
    shadowColor: THEME.primary,
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
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.hero,
  },
  heroCopy: { flex: 1 },
  heroIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.panel,
    borderWidth: 1,
    borderColor: THEME.line,
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
  role: { color: THEME.primary, fontSize: 12, marginBottom: 0, fontWeight: '700' },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.panel,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: THEME.line,
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
    backgroundColor: THEME.panelStrong,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: THEME.line,
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
    backgroundColor: THEME.panelStrong,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: THEME.line,
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
    color: THEME.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  photoOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.panel,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  photoOptionText: {
    color: '#fff',
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
    backgroundColor: THEME.panel,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  heroActionSecondaryText: {
    color: THEME.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 16, paddingHorizontal: 18 },
  summaryCard: {
    flex: 1,
    backgroundColor: THEME.panel,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#030804',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 2 },
  summaryLabel: { color: THEME.textSoft, fontSize: 12, textAlign: 'center' },
  section: {
    backgroundColor: THEME.panel,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    marginHorizontal: 18,
    shadowColor: '#030804',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  sectionTitle: {
    color: THEME.primary,
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
    borderTopColor: THEME.line,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  preferenceSubtitle: { color: THEME.textSoft, fontSize: 12, lineHeight: 16 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 125, 125, 0.1)',
    borderRadius: 18,
    paddingVertical: 15,
    marginTop: 4,
    marginHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 125, 125, 0.18)',
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 16, 8, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: THEME.panel,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.panelStrong,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.panelStrong,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
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
    backgroundColor: THEME.panelStrong,
  },
  secondaryButtonText: {
    color: THEME.textSoft,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: THEME.primary,
  },
  primaryButtonText: {
    color: THEME.hero,
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
