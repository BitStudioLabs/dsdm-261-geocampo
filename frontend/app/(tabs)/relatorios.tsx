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

import { EmptyStateCard } from '@/features/instrutor/components/EmptyStateCard';
import { LoadingState } from '@/features/instrutor/components/LoadingState';
import { SectionCard } from '@/features/instrutor/components/SectionCard';
import { StatCard } from '@/features/instrutor/components/StatCard';
import { useInstructorReports } from '@/features/instrutor/hooks/useInstructorReports';
import { PERIODOS, type Periodo } from '@/features/instrutor/types/reports';
import { buildPeriodSummaryLabel, buildSectionPeriodLabel } from '@/features/instrutor/utils/reportFormatting';

const { width: SCREEN_W } = Dimensions.get('window');

const THEME = {
  page: '#06180a',
  hero: '#0a2711',
  panel: '#0f2116',
  starColor: 'rgba(255,255,255,0.18)',
  line: 'rgba(122, 217, 140, 0.14)',
  lineStrong: 'rgba(122, 217, 140, 0.28)',
  primary: '#59d27c',
  primarySoft: 'rgba(89, 210, 124, 0.16)',
  yellow: '#f2c94c',
  textSoft: 'rgba(240, 247, 241, 0.72)',
};

const STARS = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * 200,
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
        withSequence(withTiming(1, { duration: 900 }), withTiming(0.25, { duration: 1100 })),
        -1,
        true
      )
    );
  }, [blink, delay, progress]);

  const glowStyle = useAnimatedStyle(() => {
    const x = startX + Math.sin(progress.value * Math.PI * 2) * 18;
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
  startX: SCREEN_W * (0.12 + Math.random() * 0.76),
  startY: 50 + Math.random() * 120,
  delay: i * 400,
  size: 3 + Math.random() * 2,
}));

export default function RelatoriosScreen() {
  const { errorMessage, history, isLoading, periodoAtivo, setPeriodoAtivo, visitsLabel } = useInstructorReports();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.page} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.skyBg} />

          <View style={styles.header}>
            <Text style={styles.title}>Relatórios</Text>
            <TouchableOpacity activeOpacity={0.9} style={styles.filterButton}>
              <Ionicons name="options-outline" size={16} color={THEME.primary} />
              <Text style={styles.filterText}>Filtrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.periodRow}>
            {PERIODOS.map((periodo) => {
              const ativo = periodoAtivo === periodo;
              return (
                <TouchableOpacity
                  key={periodo}
                  activeOpacity={0.9}
                  onPress={() => setPeriodoAtivo(periodo)}
                  style={[styles.periodChip, ativo && styles.periodChipActive]}>
                  <Text style={[styles.periodChipText, ativo && styles.periodChipTextActive]}>{periodo}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.scoreCard}>
            <View style={styles.scoreCardCopy}>
              <Text style={styles.scoreCaption}>
                Resumo de visitas em {buildPeriodSummaryLabel(periodoAtivo)}
              </Text>
              <Text style={styles.scoreSummaryTitle}>Acompanhe seu histórico de campo</Text>
              <Text style={styles.scoreSummaryText}>
                Consulte as visitas realizadas no período e o histórico correspondente ao filtro escolhido.
              </Text>
            </View>
            <View style={styles.trophyWrap}>
              <Ionicons name="clipboard-outline" size={28} color={THEME.yellow} />
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <StatCard
            icon="clipboard-outline"
            iconColor={THEME.yellow}
            value={isLoading ? '...' : String(history.length)}
            label={visitsLabel}
            containerStyle={styles.summaryCardWide}
            iconWrapStyle={styles.summaryIconWrap}
            valueStyle={styles.summaryValue}
            labelStyle={styles.summaryLabel}
          />
        </View>

        <SectionCard
          containerStyle={styles.section}
          title={`HISTÓRICO DE VISITAS - ${buildSectionPeriodLabel(periodoAtivo)}`}
          titleStyle={styles.sectionTitle}>
          {isLoading ? (
            <LoadingState
              color={THEME.primary}
              text="Carregando histórico..."
              containerStyle={styles.loadingWrap}
              textStyle={styles.loadingText}
            />
          ) : errorMessage ? (
            <EmptyStateCard
              icon="alert-circle-outline"
              iconColor={THEME.yellow}
              title="Relatórios indisponíveis"
              description={errorMessage}
              containerStyle={styles.emptyState}
              titleStyle={styles.emptyTitle}
              descriptionStyle={styles.emptyDescription}
              showIconWrap={false}
            />
          ) : history.length === 0 ? (
            <EmptyStateCard
              icon="clipboard-outline"
              iconColor={THEME.textSoft}
              title="Nenhuma visita no período"
              description="Quando houver visitas nesse filtro, elas vão aparecer aqui."
              containerStyle={styles.emptyState}
              titleStyle={styles.emptyTitle}
              descriptionStyle={styles.emptyDescription}
              showIconWrap={false}
            />
          ) : (
            history.map((item) => (
              <TouchableOpacity key={item.id} activeOpacity={0.9} style={styles.historyRow}>
                <View style={styles.historyIconWrap}>
                  <Ionicons name={item.icon} size={20} color={THEME.primary} />
                </View>
                <View style={styles.historyTextWrap}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historySubtitle}>{item.date}</Text>
                </View>
                <Text style={styles.historyStatus}>{item.status}</Text>
              </TouchableOpacity>
            ))
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.page },
  content: { paddingBottom: 110 },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, zIndex: 10 },
  title: { color: '#fff', fontSize: 31, fontWeight: '800' },
  filterButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.panel, borderWidth: 1, borderColor: THEME.line, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  filterText: { color: THEME.primary, fontSize: 13, fontWeight: '700' },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 18, zIndex: 10 },
  periodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: THEME.panel, borderWidth: 1, borderColor: THEME.line },
  periodChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  periodChipText: { color: THEME.textSoft, fontSize: 13, fontWeight: '700' },
  periodChipTextActive: { color: '#fff' },
  scoreCard: { backgroundColor: THEME.hero, borderRadius: 28, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: THEME.lineStrong, zIndex: 10, shadowColor: '#030804', shadowOpacity: 0.25, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  scoreCardCopy: { flex: 1, paddingRight: 16 },
  scoreCaption: { color: THEME.primary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  scoreSummaryTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  scoreSummaryText: { color: THEME.textSoft, fontSize: 13, lineHeight: 18, maxWidth: 280 },
  trophyWrap: { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(242,201,76,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(242,201,76,0.24)' },
  summaryGrid: { marginBottom: 18, paddingHorizontal: 20 },
  summaryCardWide: {
    backgroundColor: THEME.panel,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#030804',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  summaryValue: { marginTop: 10, color: '#fff', fontSize: 34, fontWeight: '800' },
  summaryLabel: { color: THEME.textSoft, fontSize: 13, marginTop: 2, textAlign: 'center' },
  summaryIconWrap: { backgroundColor: 'transparent', marginBottom: 0 },
  section: {
    backgroundColor: THEME.panel,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: '#030804',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  sectionTitle: { color: THEME.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.line },
  historyIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.primarySoft, marginRight: 12 },
  historyTextWrap: { flex: 1 },
  historyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  historySubtitle: { color: THEME.textSoft, fontSize: 12 },
  historyStatus: { color: THEME.primary, fontSize: 12, fontWeight: '700', marginLeft: 10 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  loadingText: { color: THEME.textSoft, fontSize: 13, marginTop: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  emptyDescription: { color: THEME.textSoft, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
