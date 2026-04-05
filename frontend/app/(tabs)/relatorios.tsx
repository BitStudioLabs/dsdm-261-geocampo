import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const THEME = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
  starColor: 'rgba(255,255,255,0.8)',
  leafLight: '#4dc85a',
  cornYellow: '#f5c842',
  cardBg: 'rgba(10,31,13,0.85)',
  cardBorder: 'rgba(77,200,90,0.2)',
  textGray: 'rgba(255,255,255,0.55)',
  link: '#7de88a',
};

const PERIODOS = ['7 dias', 'Mes', 'Ano'] as const;
type Periodo = (typeof PERIODOS)[number];

type VisitStatusDb =
  | 'pendente'
  | 'em_andamento'
  | 'finalizada'
  | 'em_analise'
  | 'aprovada'
  | 'rejeitada'
  | 'excluida'
  | null;

type ReportVisitRow = {
  id: number;
  criado_em: string | null;
  id_propriedade: number | null;
  status_visita: VisitStatusDb;
};

type PropertyLookup = Record<number, { nome: string | null }>;

type HistoryItem = {
  id: string;
  title: string;
  date: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: string;
};

function getPeriodStart(periodo: Periodo) {
  const now = new Date();

  if (periodo === '7 dias') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (periodo === 'Mes') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(now.getFullYear(), 0, 1);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '--/--/---- - --:--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--/--/---- - --:--';
  }

  return parsed.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getVisitIcon(status?: VisitStatusDb): keyof typeof Ionicons.glyphMap {
  if (status === 'aprovada') {
    return 'checkmark-circle-outline';
  }

  if (status === 'rejeitada') {
    return 'close-circle-outline';
  }

  if (status === 'em_analise') {
    return 'time-outline';
  }

  return 'clipboard-outline';
}

function getVisitStatusLabel(status?: VisitStatusDb) {
  switch (status) {
    case 'aprovada':
      return 'Aprovada';
    case 'rejeitada':
      return 'Rejeitada';
    case 'em_analise':
      return 'Em análise';
    case 'em_andamento':
      return 'Enviada';
    case 'finalizada':
      return 'Concluída';
    default:
      return 'Registrada';
  }
}

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
  const { profile, user } = useAuth();
  const [periodoAtivo, setPeriodoAtivo] = useState<Periodo>('Mes');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadRelatorios() {
      const currentUserId = profile?.id ?? user?.id;

      if (!currentUserId) {
        if (mounted) {
          setHistory([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage('');

        const start = getPeriodStart(periodoAtivo);
        const { data: visitsData, error: visitsError } = await supabase
          .from('visitas')
          .select('id, criado_em, id_propriedade, status_visita')
          .eq('id_instrutor', currentUserId)
          .gte('criado_em', start.toISOString())
          .order('criado_em', { ascending: false });

        if (visitsError) {
          throw visitsError;
        }

        const visits = (visitsData ?? []) as ReportVisitRow[];
        const propertyIds = Array.from(
          new Set(visits.map((item) => item.id_propriedade).filter((value): value is number => typeof value === 'number'))
        );

        let propertyLookup: PropertyLookup = {};

        if (propertyIds.length > 0) {
          const { data: propertiesData, error: propertiesError } = await supabase
            .from('propriedades')
            .select('id, nome')
            .in('id', propertyIds);

          if (propertiesError) {
            throw propertiesError;
          }

          propertyLookup = (propertiesData ?? []).reduce<PropertyLookup>((acc, property) => {
            acc[property.id] = property;
            return acc;
          }, {});
        }

        const nextHistory = visits.map((visit, index) => ({
          id: String(visit.id),
          title:
            (visit.id_propriedade ? propertyLookup[visit.id_propriedade]?.nome : null) ??
            `Visita ${index + 1}`,
          date: formatDateTime(visit.criado_em),
          icon: getVisitIcon(visit.status_visita),
          status: getVisitStatusLabel(visit.status_visita),
        }));

        if (mounted) {
          setHistory(nextHistory);
        }
      } catch (error) {
        console.error('Erro ao carregar relatórios do instrutor:', error);
        if (mounted) {
          setErrorMessage('Não foi possível carregar os relatórios agora.');
          setHistory([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadRelatorios();

    return () => {
      mounted = false;
    };
  }, [periodoAtivo, profile?.id, user?.id]);

  const visitsLabel = useMemo(() => {
    if (periodoAtivo === '7 dias') {
      return 'Visitas em 7 dias';
    }

    if (periodoAtivo === 'Mes') {
      return 'Visitas no mês';
    }

    return 'Visitas no ano';
  }, [periodoAtivo]);

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
                <View style={[styles.crater, { top: 18, left: 8, width: 4, height: 4 }]} />
              </View>
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Relatórios</Text>
            <TouchableOpacity activeOpacity={0.9} style={styles.filterButton}>
              <Ionicons name="options-outline" size={16} color={THEME.link} />
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
                Resumo de visitas em {periodoAtivo === 'Mes' ? 'mês' : periodoAtivo.toLowerCase()}
              </Text>
              <Text style={styles.scoreSummaryTitle}>Acompanhe seu histórico de campo</Text>
              <Text style={styles.scoreSummaryText}>
                Consulte as visitas realizadas no período e o histórico correspondente ao filtro escolhido.
              </Text>
            </View>
            <View style={styles.trophyWrap}>
              <Ionicons name="clipboard-outline" size={28} color={THEME.cornYellow} />
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCardWide}>
            <Ionicons name="clipboard-outline" size={22} color={THEME.cornYellow} />
            <Text style={styles.summaryValue}>{isLoading ? '...' : String(history.length)}</Text>
            <Text style={styles.summaryLabel}>{visitsLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            HISTÓRICO DE VISITAS - {periodoAtivo === 'Mes' ? 'MÊS' : periodoAtivo.toUpperCase()}
          </Text>
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={THEME.leafLight} size="small" />
              <Text style={styles.loadingText}>Carregando histórico...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={24} color={THEME.cornYellow} />
              <Text style={styles.emptyTitle}>Relatórios indisponíveis</Text>
              <Text style={styles.emptyDescription}>{errorMessage}</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={24} color={THEME.textGray} />
              <Text style={styles.emptyTitle}>Nenhuma visita no período</Text>
              <Text style={styles.emptyDescription}>
                Quando houver visitas nesse filtro, elas vão aparecer aqui.
              </Text>
            </View>
          ) : (
            history.map((item) => (
              <TouchableOpacity key={item.id} activeOpacity={0.9} style={styles.historyRow}>
                <View style={styles.historyIconWrap}>
                  <Ionicons name={item.icon} size={20} color={THEME.leafLight} />
                </View>
                <View style={styles.historyTextWrap}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historySubtitle}>{item.date}</Text>
                </View>
                <Text style={styles.historyStatus}>{item.status}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
    backgroundColor: THEME.skyTop,
  },
  moonContainer: {
    position: 'absolute',
    top: 16,
    right: 70,
  },
  moon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fffbe0',
    shadowColor: '#fffbe0',
    shadowOpacity: 0.8,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  moonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: '#fffbe0',
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    backgroundColor: 'rgba(200,190,150,0.4)',
    borderRadius: 50,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, zIndex: 10 },
  title: { color: '#fff', fontSize: 31, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  filterButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.cardBg, borderWidth: 1, borderColor: THEME.cardBorder, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  filterText: { color: THEME.link, fontSize: 13, fontWeight: '700' },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 18, zIndex: 10 },
  periodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: THEME.cardBg, borderWidth: 1, borderColor: THEME.cardBorder },
  periodChipActive: { backgroundColor: THEME.leafLight, borderColor: THEME.leafLight },
  periodChipText: { color: THEME.textGray, fontSize: 13, fontWeight: '700' },
  periodChipTextActive: { color: '#fff' },
  scoreCard: { backgroundColor: THEME.cardBg, borderRadius: 22, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: THEME.cardBorder, zIndex: 10 },
  scoreCardCopy: { flex: 1, paddingRight: 16 },
  scoreCaption: { color: THEME.link, fontSize: 12, marginBottom: 6 },
  scoreSummaryTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  scoreSummaryText: { color: THEME.textGray, fontSize: 13, lineHeight: 18, maxWidth: 280 },
  trophyWrap: { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(245,200,66,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(245,200,66,0.25)' },
  summaryGrid: { marginBottom: 18, paddingHorizontal: 20 },
  summaryCardWide: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.1)',
  },
  summaryValue: { marginTop: 10, color: colors.textDark, fontSize: 34, fontWeight: '800' },
  summaryLabel: { color: colors.textMuted, fontSize: 13, marginTop: 2, textAlign: 'center' },
  section: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.1)',
  },
  sectionTitle: { color: THEME.skyMid, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(77,200,90,0.15)' },
  historyIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(77,200,90,0.12)', marginRight: 12 },
  historyTextWrap: { flex: 1 },
  historyTitle: { color: colors.textDark, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  historySubtitle: { color: colors.textMuted, fontSize: 12 },
  historyStatus: { color: THEME.skyMid, fontSize: 12, fontWeight: '700', marginLeft: 10 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  loadingText: { color: colors.textMuted, fontSize: 13, marginTop: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  emptyTitle: { color: colors.textDark, fontSize: 15, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  emptyDescription: { color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
