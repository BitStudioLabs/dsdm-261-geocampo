import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const THEME = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
  leafLight: '#4dc85a',
  leafMid: '#3aaa4a',
  gold: '#f5c842',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textMuted: 'rgba(255,255,255,0.55)',
  cardBg: 'rgba(10,31,13,0.85)',
  link: '#7de88a',
};

const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * (SCREEN_H * 0.25),
  size: Math.random() * 2 + 0.8,
  delay: Math.random() * 2000,
}));

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
        { position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.85)' },
        style,
      ]}
    />
  );
}

const RECENT_VISITS = [
  { id: '1', date: '22 Mar 2026', instructor: 'João Silva', status: 'completed', type: 'Inspeção Técnica' },
  { id: '2', date: '18 Mar 2026', instructor: 'Maria Santos', status: 'completed', type: 'Avaliação de Solo' },
  { id: '3', date: '10 Mar 2026', instructor: 'Pedro Costa', status: 'pending', type: 'Monitoramento' },
];

export default function ProprietarioHomeScreen() {
  const headerProgress = useSharedValue(0);

  useEffect(() => {
    headerProgress.value = withSpring(1, { damping: 15, stiffness: 80 });
  }, [headerProgress]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [{ translateY: (1 - headerProgress.value) * -30 }],
  }));

  return (
    <View style={styles.root}>
      <View style={styles.skyBg}>
        {STARS.map((star) => (
          <Star key={star.id} x={star.x} y={star.y} size={star.size} delay={star.delay} />
        ))}
        <View style={styles.moon}>
          <View style={styles.moonInner}>
            <View style={[styles.crater, { width: 8, height: 8, top: 10, left: 12 }]} />
            <View style={[styles.crater, { width: 5, height: 5, top: 22, left: 28 }]} />
            <View style={[styles.crater, { width: 6, height: 6, top: 30, left: 14 }]} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, headerStyle]}>
          <View style={styles.welcomeBox}>
            <Text style={styles.welcomeText}>Bem-vindo(a)</Text>
            <Text style={styles.userName}>Maria Santos</Text>
            <View style={styles.roleBadge}>
              <FontAwesome6 name="house-chimney" size={10} color={THEME.leafLight} />
              <Text style={styles.roleText}>Proprietario Rural</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <FontAwesome6 name="bell" size={18} color={THEME.white} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(77,200,90,0.2)' }]}>
              <FontAwesome6 name="calendar-check" size={18} color={THEME.leafLight} />
            </View>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Visitas Recebidas</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(245,200,66,0.2)' }]}>
              <FontAwesome6 name="clock" size={18} color={THEME.gold} />
            </View>
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
        </View>

        <View style={styles.propertyCard}>
          <View style={styles.propertyHeader}>
            <View style={styles.propertyIconBox}>
              <FontAwesome6 name="wheat-awn" size={20} color={THEME.gold} />
            </View>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyName}>Fazenda Santa Maria</Text>
              <Text style={styles.propertyLocation}>Sao Paulo, SP - 150 hectares</Text>
            </View>
          </View>
          <View style={styles.propertyStats}>
            <View style={styles.propertyStat}>
              <FontAwesome6 name="seedling" size={12} color={THEME.leafLight} />
              <Text style={styles.propertyStatText}>Milho, Soja</Text>
            </View>
            <View style={styles.propertyStat}>
              <FontAwesome6 name="location-dot" size={12} color={THEME.link} />
              <Text style={styles.propertyStatText}>Geolocalizado</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Visitas Recentes</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {RECENT_VISITS.map((visit) => (
            <TouchableOpacity key={visit.id} style={styles.visitCard}>
              <View style={[styles.visitStatus, visit.status === 'completed' ? styles.statusCompleted : styles.statusPending]} />
              <View style={styles.visitInfo}>
                <Text style={styles.visitType}>{visit.type}</Text>
                <Text style={styles.visitMeta}>{visit.instructor} - {visit.date}</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color={THEME.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionBtn}>
            <FontAwesome6 name="file-lines" size={18} color={THEME.white} />
            <Text style={styles.actionBtnText}>Ver Relatorios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]}>
            <FontAwesome6 name="headset" size={18} color={THEME.leafLight} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextOutline]}>Suporte</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.skyTop },
  skyBg: { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_H * 0.35, backgroundColor: THEME.skyTop },
  moon: { position: 'absolute', top: 45, right: 30, width: 42, height: 42, borderRadius: 21, backgroundColor: '#fffbe0', shadowColor: '#fffbe0', shadowOpacity: 0.8, shadowRadius: 20, elevation: 8 },
  moonInner: { width: '100%', height: '100%', borderRadius: 21, overflow: 'hidden' },
  crater: { position: 'absolute', backgroundColor: 'rgba(200,190,150,0.4)', borderRadius: 50 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  welcomeBox: {},
  welcomeText: { fontSize: 14, color: THEME.textMuted, marginBottom: 4 },
  userName: { fontSize: 26, fontWeight: '700', color: THEME.white, marginBottom: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(77,200,90,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  roleText: { fontSize: 11, color: THEME.leafLight, fontWeight: '600' },
  notifBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff6b6b' },
  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: THEME.cardBg, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: '700', color: THEME.white, marginBottom: 4 },
  statLabel: { fontSize: 12, color: THEME.textMuted },
  propertyCard: { backgroundColor: THEME.cardBg, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)', marginBottom: 24 },
  propertyHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  propertyIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(245,200,66,0.15)', alignItems: 'center', justifyContent: 'center' },
  propertyInfo: { flex: 1 },
  propertyName: { fontSize: 17, fontWeight: '700', color: THEME.white, marginBottom: 4 },
  propertyLocation: { fontSize: 13, color: THEME.textMuted },
  propertyStats: { flexDirection: 'row', gap: 16 },
  propertyStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  propertyStatText: { fontSize: 12, color: THEME.offWhite },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: THEME.white },
  seeAll: { fontSize: 13, color: THEME.link, fontWeight: '600' },
  visitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.cardBg, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(77,200,90,0.1)', gap: 14 },
  visitStatus: { width: 10, height: 10, borderRadius: 5 },
  statusCompleted: { backgroundColor: THEME.leafLight },
  statusPending: { backgroundColor: THEME.gold },
  visitInfo: { flex: 1 },
  visitType: { fontSize: 15, fontWeight: '600', color: THEME.white, marginBottom: 4 },
  visitMeta: { fontSize: 12, color: THEME.textMuted },
  actionSection: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.leafMid, borderRadius: 16, paddingVertical: 16, gap: 10 },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: THEME.leafLight },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: THEME.white },
  actionBtnTextOutline: { color: THEME.leafLight },
});
