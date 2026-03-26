import React, { useEffect } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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

import { colors } from '@/src/theme/colors';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

const THEME = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
  skyBottom: '#1a4a20',
  ground: '#3d2b1a',
  groundTop: '#5a3d20',
  starColor: 'rgba(255,255,255,0.8)',
  leafLight: '#4dc85a',
  cornYellow: '#f5c842',
  cardBg: 'rgba(10,31,13,0.85)',
  cardBorder: 'rgba(77,200,90,0.2)',
  textGray: 'rgba(255,255,255,0.55)',
  link: '#7de88a',
};

const RESUMO = [
  { id: '1', label: 'Visitas no mes', value: '24', icon: 'clipboard-outline', color: THEME.cornYellow },
  { id: '2', label: 'Atribuidas', value: '12', icon: 'business-outline', color: colors.info },
  { id: '3', label: 'Concluidas', value: '8', icon: 'checkmark-done-outline', color: THEME.leafLight },
] as const;

const PREFERENCIAS = [
  { id: '1', title: 'Regiao de atuacao', subtitle: 'Regiao Sul - Ribeirao Preto e entorno', icon: 'navigate-circle-outline' },
  { id: '2', title: 'Notificacoes', subtitle: 'Alertas de visitas e resultado das analises', icon: 'notifications-outline' },
  { id: '3', title: 'Sincronizacao offline', subtitle: 'Ultima sincronizacao hoje as 09:54', icon: 'cloud-done-outline' },
  { id: '4', title: 'Seguranca da conta', subtitle: 'Senha atualizada ha 18 dias', icon: 'shield-checkmark-outline' },
] as const;

const STARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * 180,
  size: Math.random() * 2 + 0.8,
  opacity: Math.random() * 0.5 + 0.3,
  twinkleDelay: Math.random() * 3000,
}));

function AnimatedStar({ star }: { star: typeof STARS[0] }) {
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

function Firefly({ startX, startY, delay, size }: { startX: number; startY: number; delay: number; size: number }) {
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
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.25, { duration: 1100 })
        ),
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

const FIREFLIES = Array.from({ length: 4 }, (_, i) => ({
  id: i,
  startX: SCREEN_W * (0.15 + Math.random() * 0.7),
  startY: 60 + Math.random() * 100,
  delay: i * 350,
  size: 3 + Math.random() * 2,
}));

export default function PerfilScreen() {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Erro ao sair da conta:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.skyTop} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <TouchableOpacity style={styles.editButton} activeOpacity={0.9}>
              <Ionicons name="create-outline" size={16} color={THEME.link} />
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={38} color="#fff" />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.name}>{user?.user_metadata?.name ?? user?.email ?? 'Usuario'}</Text>
                <Text style={styles.role}>Instrutor de Campo</Text>
                <Text style={styles.region}>Instituto Rural do Sudeste</Text>
              </View>
            </View>

            <View style={styles.badgesRow}>
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={15} color={THEME.leafLight} />
                <Text style={styles.badgeText}>Ativo</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="location-outline" size={15} color={THEME.cornYellow} />
                <Text style={styles.badgeText}>Regiao Sul</Text>
              </View>
            </View>

            <View style={styles.contactRow}>
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>E-mail</Text>
                <Text style={styles.contactValue}>{user?.email ?? 'Sem e-mail cadastrado'}</Text>
              </View>
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Telefone</Text>
                <Text style={styles.contactValue}>(16) 99999-1234</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {RESUMO.map((item) => (
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
          <Text style={styles.sectionTitle}>DADOS PROFISSIONAIS</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Matricula</Text><Text style={styles.infoValue}>INS-0248</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Cargo</Text><Text style={styles.infoValue}>Instrutor Regional</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Inicio na instituicao</Text><Text style={styles.infoValue}>Marco de 2023</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Supervisor</Text><Text style={styles.infoValue}>Ana Costa</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCIAS E OPERACAO</Text>
          {PREFERENCIAS.map((item) => (
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, zIndex: 10 },
  title: { color: '#fff', fontSize: 29, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.cardBg, borderWidth: 1, borderColor: THEME.cardBorder, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  editButtonText: { color: THEME.link, fontSize: 13, fontWeight: '700' },
  heroCard: { backgroundColor: THEME.cardBg, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: THEME.cardBorder, zIndex: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 78, height: 78, borderRadius: 24, backgroundColor: '#A56B3F', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 3, borderColor: 'rgba(77,200,90,0.3)', shadowColor: THEME.leafLight, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  heroCopy: { flex: 1 },
  name: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 2, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  role: { color: THEME.link, fontSize: 14, marginBottom: 2 },
  region: { color: THEME.textGray, fontSize: 13 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  contactRow: { gap: 10 },
  contactItem: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  contactLabel: { color: THEME.link, fontSize: 11, marginBottom: 4 },
  contactValue: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
  summaryIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
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
  sectionTitle: { color: THEME.skyMid, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(77,200,90,0.15)' },
  infoLabel: { color: colors.textMuted, fontSize: 13 },
  infoValue: { color: colors.textDark, fontSize: 14, fontWeight: '700' },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(77,200,90,0.15)' },
  preferenceIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(77,200,90,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { color: colors.textDark, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  preferenceSubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF0F0', borderRadius: 18, paddingVertical: 15, marginTop: 4, marginHorizontal: 18, borderWidth: 1, borderColor: 'rgba(226,91,91,0.2)' },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
