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
  blue: '#5b9cff',
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

const FRAUD_ALERTS = [
  {
    id: '1',
    type: 'location',
    severity: 'high',
    title: 'Localizacao Divergente',
    description: 'Visita registrada a 15km da propriedade cadastrada',
    instructor: 'Joao Silva',
    date: '22 Mar 2026',
    property: 'Fazenda Boa Vista',
  },
  {
    id: '2',
    type: 'time',
    severity: 'medium',
    title: 'Visitas Simultaneas',
    description: 'Duas visitas registradas no mesmo horario',
    instructor: 'Pedro Costa',
    date: '21 Mar 2026',
    property: 'Sitio Recanto',
  },
  {
    id: '3',
    type: 'pattern',
    severity: 'low',
    title: 'Padrao Suspeito',
    description: 'Tempo medio de visita muito inferior ao esperado',
    instructor: 'Ana Lima',
    date: '20 Mar 2026',
    property: 'Fazenda Sol Nascente',
  },
];

type FilterType = 'all' | 'high' | 'medium' | 'low';

export default function AuditoriaScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const headerProgress = useSharedValue(0);

  useEffect(() => {
    headerProgress.value = withSpring(1, { damping: 15, stiffness: 80 });
  }, [headerProgress]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [{ translateY: (1 - headerProgress.value) * -30 }],
  }));

  const filteredAlerts = FRAUD_ALERTS.filter((a) => filter === 'all' || a.severity === filter);

  const getSeverityInfo = (severity: string) => {
    switch (severity) {
      case 'high':
        return { color: THEME.error, label: 'Alta', icon: 'circle-exclamation' };
      case 'medium':
        return { color: THEME.gold, label: 'Media', icon: 'triangle-exclamation' };
      case 'low':
        return { color: THEME.blue, label: 'Baixa', icon: 'circle-info' };
      default:
        return { color: THEME.textMuted, label: severity, icon: 'circle' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'location':
        return 'location-crosshairs';
      case 'time':
        return 'clock';
      case 'pattern':
        return 'chart-line';
      default:
        return 'flag';
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
          <Text style={styles.title}>Auditoria</Text>
          <Text style={styles.subtitle}>Detecte e analise possiveis fraudes</Text>
        </Animated.View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: 'rgba(255,107,107,0.3)' }]}>
            <FontAwesome6 name="circle-exclamation" size={16} color={THEME.error} />
            <Text style={[styles.statValue, { color: THEME.error }]}>{FRAUD_ALERTS.filter((a) => a.severity === 'high').length}</Text>
            <Text style={styles.statLabel}>Criticas</Text>
          </View>
          <View style={[styles.statCard, { borderColor: 'rgba(245,200,66,0.3)' }]}>
            <FontAwesome6 name="triangle-exclamation" size={16} color={THEME.gold} />
            <Text style={[styles.statValue, { color: THEME.gold }]}>{FRAUD_ALERTS.filter((a) => a.severity === 'medium').length}</Text>
            <Text style={styles.statLabel}>Medias</Text>
          </View>
          <View style={[styles.statCard, { borderColor: 'rgba(91,156,255,0.3)' }]}>
            <FontAwesome6 name="circle-info" size={16} color={THEME.blue} />
            <Text style={[styles.statValue, { color: THEME.blue }]}>{FRAUD_ALERTS.filter((a) => a.severity === 'low').length}</Text>
            <Text style={styles.statLabel}>Baixas</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['all', 'high', 'medium', 'low'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'Todas' : f === 'high' ? 'Alta' : f === 'medium' ? 'Media' : 'Baixa'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredAlerts.map((alert) => {
          const severityInfo = getSeverityInfo(alert.severity);
          return (
            <TouchableOpacity key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <View style={[styles.alertIconBox, { backgroundColor: `${severityInfo.color}20` }]}>
                  <FontAwesome6 name={getTypeIcon(alert.type) as any} size={16} color={severityInfo.color} />
                </View>
                <View style={styles.alertTitleBox}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: `${severityInfo.color}20` }]}>
                    <FontAwesome6 name={severityInfo.icon as any} size={8} color={severityInfo.color} />
                    <Text style={[styles.severityText, { color: severityInfo.color }]}>{severityInfo.label}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.alertDesc}>{alert.description}</Text>
              <View style={styles.alertMeta}>
                <View style={styles.metaItem}>
                  <FontAwesome6 name="user" size={10} color={THEME.textMuted} />
                  <Text style={styles.metaText}>{alert.instructor}</Text>
                </View>
                <View style={styles.metaItem}>
                  <FontAwesome6 name="house" size={10} color={THEME.textMuted} />
                  <Text style={styles.metaText}>{alert.property}</Text>
                </View>
                <View style={styles.metaItem}>
                  <FontAwesome6 name="calendar" size={10} color={THEME.textMuted} />
                  <Text style={styles.metaText}>{alert.date}</Text>
                </View>
              </View>
              <View style={styles.alertActions}>
                <TouchableOpacity style={styles.actionBtnSmall}>
                  <FontAwesome6 name="eye" size={12} color={THEME.leafLight} />
                  <Text style={styles.actionBtnSmallText}>Detalhes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtnSmall, styles.actionBtnDanger]}>
                  <FontAwesome6 name="flag" size={12} color={THEME.error} />
                  <Text style={[styles.actionBtnSmallText, { color: THEME.error }]}>Marcar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.exportBtn}>
          <FontAwesome6 name="file-export" size={16} color={THEME.white} />
          <Text style={styles.exportBtnText}>Exportar Relatorio de Auditoria</Text>
        </TouchableOpacity>

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
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: THEME.white, marginBottom: 6 },
  subtitle: { fontSize: 14, color: THEME.textMuted },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: THEME.cardBg, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 22, fontWeight: '700', marginVertical: 6 },
  statLabel: { fontSize: 10, color: THEME.textMuted },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterBtnActive: { backgroundColor: 'rgba(77,200,90,0.2)', borderColor: THEME.leafLight },
  filterText: { fontSize: 12, fontWeight: '600', color: THEME.textMuted },
  filterTextActive: { color: THEME.leafLight },
  alertCard: { backgroundColor: THEME.cardBg, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(77,200,90,0.12)' },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  alertIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  alertTitleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertTitle: { fontSize: 15, fontWeight: '700', color: THEME.white },
  severityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5 },
  severityText: { fontSize: 10, fontWeight: '600' },
  alertDesc: { fontSize: 13, color: THEME.offWhite, lineHeight: 20, marginBottom: 12 },
  alertMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, color: THEME.textMuted },
  alertActions: { flexDirection: 'row', gap: 10 },
  actionBtnSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(77,200,90,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 6 },
  actionBtnDanger: { backgroundColor: 'rgba(255,107,107,0.15)' },
  actionBtnSmallText: { fontSize: 12, fontWeight: '600', color: THEME.leafLight },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.leafMid, borderRadius: 16, paddingVertical: 16, gap: 10, marginTop: 10 },
  exportBtnText: { fontSize: 15, fontWeight: '700', color: THEME.white },
});
