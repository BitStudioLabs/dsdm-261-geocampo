import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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
  leafLight: '#4dc85a',
  leafMid: '#3aaa4a',
  gold: '#f5c842',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textMuted: 'rgba(255,255,255,0.55)',
  cardBg: 'rgba(10,31,13,0.85)',
  link: '#7de88a',
  error: '#ff6b6b',
};

const STARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * (SCREEN_H * 0.2),
  size: Math.random() * 2 + 0.8,
  delay: Math.random() * 2000,
}));

function Star({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withSequence(withTiming(0.9, { duration: 1200 }), withTiming(0.3, { duration: 1200 })), -1, true));
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.85)' }, style]} />;
}

const VISITS_HISTORY = [
  { id: '1', date: '22 Mar 2026', time: '09:30', instructor: 'Joao Silva', type: 'Inspecao Tecnica', status: 'validated', notes: 'Solo em boas condicoes' },
  { id: '2', date: '18 Mar 2026', time: '14:15', instructor: 'Maria Santos', type: 'Avaliacao de Solo', status: 'validated', notes: 'Recomendado calagem' },
  { id: '3', date: '10 Mar 2026', time: '10:00', instructor: 'Pedro Costa', type: 'Monitoramento', status: 'pending', notes: 'Aguardando validacao' },
  { id: '4', date: '05 Mar 2026', time: '11:45', instructor: 'Ana Lima', type: 'Controle de Pragas', status: 'validated', notes: 'Aplicacao preventiva realizada' },
  { id: '5', date: '28 Fev 2026', time: '08:30', instructor: 'Carlos Souza', type: 'Analise de Cultivo', status: 'rejected', notes: 'Visita incompleta' },
];

type FilterType = 'all' | 'validated' | 'pending' | 'rejected';

export default function HistoricoScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const headerProgress = useSharedValue(0);

  useEffect(() => {
    headerProgress.value = withSpring(1, { damping: 15, stiffness: 80 });
  }, [headerProgress]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [{ translateY: (1 - headerProgress.value) * -30 }],
  }));

  const filteredVisits = VISITS_HISTORY.filter((v) => filter === 'all' || v.status === filter);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'validated':
        return { color: THEME.leafLight, icon: 'circle-check', label: 'Validada' };
      case 'pending':
        return { color: THEME.gold, icon: 'clock', label: 'Pendente' };
      case 'rejected':
        return { color: THEME.error, icon: 'circle-xmark', label: 'Rejeitada' };
      default:
        return { color: THEME.textMuted, icon: 'circle', label: status };
    }
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, headerStyle]}>
          <Text style={styles.title}>Historico de Visitas</Text>
          <Text style={styles.subtitle}>Acompanhe todas as visitas realizadas</Text>
        </Animated.View>

        <View style={styles.filterRow}>
          {(['all', 'validated', 'pending', 'rejected'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'Todas' : f === 'validated' ? 'Validadas' : f === 'pending' ? 'Pendentes' : 'Rejeitadas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{VISITS_HISTORY.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: THEME.leafLight }]}>{VISITS_HISTORY.filter((v) => v.status === 'validated').length}</Text>
            <Text style={styles.summaryLabel}>Validadas</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: THEME.gold }]}>{VISITS_HISTORY.filter((v) => v.status === 'pending').length}</Text>
            <Text style={styles.summaryLabel}>Pendentes</Text>
          </View>
        </View>

        {filteredVisits.map((visit) => {
          const statusInfo = getStatusInfo(visit.status);
          return (
            <TouchableOpacity key={visit.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <View style={styles.visitTypeBox}>
                  <FontAwesome6 name="clipboard-list" size={16} color={THEME.leafLight} />
                </View>
                <View style={styles.visitTitleBox}>
                  <Text style={styles.visitType}>{visit.type}</Text>
                  <Text style={styles.visitInstructor}>{visit.instructor}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
                  <FontAwesome6 name={statusInfo.icon as any} size={10} color={statusInfo.color} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
              </View>
              <View style={styles.visitDetails}>
                <View style={styles.visitDetail}>
                  <FontAwesome6 name="calendar" size={11} color={THEME.textMuted} />
                  <Text style={styles.visitDetailText}>{visit.date}</Text>
                </View>
                <View style={styles.visitDetail}>
                  <FontAwesome6 name="clock" size={11} color={THEME.textMuted} />
                  <Text style={styles.visitDetailText}>{visit.time}</Text>
                </View>
              </View>
              <View style={styles.visitNotes}>
                <FontAwesome6 name="comment" size={11} color={THEME.textMuted} />
                <Text style={styles.visitNotesText}>{visit.notes}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 100 }} />
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 60 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: THEME.white, marginBottom: 6 },
  subtitle: { fontSize: 14, color: THEME.textMuted },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterBtnActive: { backgroundColor: 'rgba(77,200,90,0.2)', borderColor: THEME.leafLight },
  filterText: { fontSize: 12, fontWeight: '600', color: THEME.textMuted },
  filterTextActive: { color: THEME.leafLight },
  summaryRow: { flexDirection: 'row', backgroundColor: THEME.cardBg, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700', color: THEME.white, marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: THEME.textMuted },
  visitCard: { backgroundColor: THEME.cardBg, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(77,200,90,0.12)' },
  visitHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  visitTypeBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(77,200,90,0.15)', alignItems: 'center', justifyContent: 'center' },
  visitTitleBox: { flex: 1 },
  visitType: { fontSize: 15, fontWeight: '700', color: THEME.white, marginBottom: 2 },
  visitInstructor: { fontSize: 12, color: THEME.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 5 },
  statusText: { fontSize: 10, fontWeight: '600' },
  visitDetails: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  visitDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  visitDetailText: { fontSize: 12, color: THEME.offWhite },
  visitNotes: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  visitNotesText: { flex: 1, fontSize: 12, color: THEME.textMuted, lineHeight: 18 },
});
