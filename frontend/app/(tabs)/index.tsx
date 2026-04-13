import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme/colors';

const THEME = {
  page: '#06180a',
  hero: '#0a2711',
  heroSoft: '#14341c',
  panel: '#0f2116',
  line: 'rgba(122, 217, 140, 0.14)',
  lineStrong: 'rgba(122, 217, 140, 0.3)',
  primary: '#59d27c',
  primarySoft: 'rgba(89, 210, 124, 0.16)',
  yellow: '#f2c94c',
  blue: '#67b8ff',
  success: '#38d39f',
  danger: '#ff7d7d',
  textSoft: 'rgba(240, 247, 241, 0.72)',
};

type StatusType =
  | 'Agendada'
  | 'Hoje'
  | 'Em andamento'
  | 'Concluída'
  | 'Em análise'
  | 'Aprovada'
  | 'Rejeitada';
type DashboardFilter = 'atribuidas' | 'hoje' | 'concluidas';

type VisitStatusDb =
  | 'pendente'
  | 'em_andamento'
  | 'finalizada'
  | 'em_analise'
  | 'aprovada'
  | 'rejeitada'
  | 'excluida'
  | null;

type DashboardItem = {
  id: string;
  nome: string;
  local: string;
  distancia: string;
  status: StatusType;
  visitaEm: string;
  icone: keyof typeof Ionicons.glyphMap;
  iconeBg: string;
};

type DashboardStats = Record<DashboardFilter, string>;

type AtribuicaoDashboardRow = {
  id: number;
  id_propriedade: number;
  ativa: boolean;
  atualizado_em?: string | null;
  criado_em?: string | null;
};

type VisitaDashboardRow = {
  id: number;
  id_propriedade: number | null;
  criado_em?: string | null;
  status_visita?: VisitStatusDb;
};

type PropertyLookup = Record<
  number,
  {
    id: number;
    nome: string | null;
    municipio_nome: string | null;
    uf: string | null;
  }
>;

function formatVisitDate(dateValue?: string | null) {
  if (!dateValue) return 'Sem data definida';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Sem data definida';

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay =
    parsed.getDate() === today.getDate() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getFullYear() === today.getFullYear();

  const isTomorrow =
    parsed.getDate() === tomorrow.getDate() &&
    parsed.getMonth() === tomorrow.getMonth() &&
    parsed.getFullYear() === tomorrow.getFullYear();

  const time = parsed.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSameDay) return `Hoje às ${time}`;
  if (isTomorrow) return `Amanhã às ${time}`;

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function mapVisitStatusToLabel(status?: VisitStatusDb, dateValue?: string | null, isCompleted?: boolean): StatusType {
  if (status === 'em_andamento') return 'Em andamento';
  if (status === 'em_analise') return 'Em análise';
  if (status === 'aprovada') return 'Aprovada';
  if (status === 'rejeitada') return 'Rejeitada';
  if (status === 'finalizada' || isCompleted) return 'Concluída';
  if (!dateValue) return 'Agendada';

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Agendada';

  const now = new Date();
  const sameDay =
    parsed.getDate() === now.getDate() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getFullYear() === now.getFullYear();

  if (sameDay) {
    return parsed.getTime() <= now.getTime() ? 'Em andamento' : 'Hoje';
  }

  return 'Agendada';
}

function extractAvatarPath(value: string) {
  const publicMarker = '/storage/v1/object/public/avatares/';
  const signMarker = '/storage/v1/object/sign/avatares/';
  if (value.includes(publicMarker)) return decodeURIComponent(value.split(publicMarker)[1]?.split('?')[0] ?? '');
  if (value.includes(signMarker)) return decodeURIComponent(value.split(signMarker)[1]?.split('?')[0] ?? '');
  return value;
}

function getAvatarStorageKey(userId: string) {
  return `profile-avatar-path:${userId}`;
}

function getIconByIndex(index: number) {
  const options = [
    { icone: 'leaf-outline', iconeBg: '#DDF5E3' },
    { icone: 'paw-outline', iconeBg: '#EEF4DD' },
    { icone: 'nutrition-outline', iconeBg: '#F4EFD8' },
    { icone: 'flower-outline', iconeBg: '#E4F2E6' },
    { icone: 'home-outline', iconeBg: '#E9F0D7' },
    { icone: 'rose-outline', iconeBg: '#F0E7D7' },
  ] as const;
  return options[index % options.length];
}

function buildAssignmentItem(
  item: AtribuicaoDashboardRow,
  propertyLookup: PropertyLookup,
  index: number,
  latestVisit?: VisitaDashboardRow | null
): DashboardItem {
  const iconData = getIconByIndex(index);
  const visitDate = latestVisit?.criado_em ?? item.atualizado_em ?? item.criado_em ?? null;
  const property = propertyLookup[item.id_propriedade] ?? null;

  return {
    id: `atr-${item.id}`,
    nome: property?.nome ?? 'Propriedade sem nome',
    local: [property?.municipio_nome, property?.uf].filter(Boolean).join(', ') || 'Localização não informada',
    distancia: latestVisit ? 'Última visita registrada' : 'A conferir',
    status: mapVisitStatusToLabel(latestVisit?.status_visita, visitDate, false),
    visitaEm: formatVisitDate(visitDate),
    ...iconData,
  };
}

function buildVisitItem(item: VisitaDashboardRow, propertyLookup: PropertyLookup, index: number): DashboardItem {
  const iconData = getIconByIndex(index);
  const doneDate = item.criado_em ?? null;
  const property = item.id_propriedade ? propertyLookup[item.id_propriedade] ?? null : null;

  return {
    id: `vis-${item.id}`,
    nome: property?.nome ?? 'Propriedade sem nome',
    local: [property?.municipio_nome, property?.uf].filter(Boolean).join(', ') || 'Localização não informada',
    distancia: 'Visita realizada',
    status: mapVisitStatusToLabel(item.status_visita, doneDate, true),
    visitaEm: formatVisitDate(doneDate),
    ...iconData,
  };
}

function getStatusStyle(status: StatusType) {
  switch (status) {
    case 'Hoje':
      return { bg: 'rgba(89,210,124,0.12)', text: THEME.primary, dot: THEME.primary, icon: 'sunny-outline' as const };
    case 'Agendada':
      return { bg: 'rgba(242,201,76,0.14)', text: THEME.yellow, dot: THEME.yellow, icon: 'calendar-outline' as const };
    case 'Em andamento':
      return { bg: 'rgba(103,184,255,0.14)', text: THEME.blue, dot: THEME.blue, icon: 'time-outline' as const };
    case 'Em análise':
      return { bg: 'rgba(242,201,76,0.14)', text: THEME.yellow, dot: THEME.yellow, icon: 'search-outline' as const };
    case 'Aprovada':
      return { bg: 'rgba(56,211,159,0.14)', text: THEME.success, dot: THEME.success, icon: 'checkmark-circle-outline' as const };
    case 'Rejeitada':
      return { bg: 'rgba(255,125,125,0.14)', text: THEME.danger, dot: THEME.danger, icon: 'close-circle-outline' as const };
    default:
      return { bg: 'rgba(56,211,159,0.14)', text: THEME.success, dot: THEME.success, icon: 'checkmark-done-outline' as const };
  }
}

function getSectionCopy(activeFilter: DashboardFilter) {
  if (activeFilter === 'concluidas') {
    return {
      eyebrow: 'Histórico concluído',
      title: 'Visitas já realizadas por você',
      description: 'Use essa lista para revisar os registros finalizados e validar o histórico recente.',
    };
  }

  if (activeFilter === 'hoje') {
    return {
      eyebrow: 'Agenda do dia',
      title: 'Prioridades programadas para hoje',
      description: 'Aqui ficam apenas as propriedades que exigem ação imediata no seu turno.',
    };
  }

  return {
    eyebrow: 'Carteira ativa',
    title: 'Propriedades atribuídas ao seu usuário',
    description: 'Acompanhe tudo que ainda precisa ser visitado e organize sua próxima ida a campo.',
  };
}

export default function DashboardScreen() {
  const { profile, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('atribuidas');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarStoragePath, setAvatarStoragePath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [assignedItems, setAssignedItems] = useState<DashboardItem[]>([]);
  const [completedItems, setCompletedItems] = useState<DashboardItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ atribuidas: '0', hoje: '0', concluidas: '0' });

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      const currentUserId = profile?.id ?? user?.id;

      if (!currentUserId) {
        if (mounted) {
          setAssignedItems([]);
          setCompletedItems([]);
          setStats({ atribuidas: '0', hoje: '0', concluidas: '0' });
          setIsLoading(false);
          setRefreshing(false);
        }
        return;
      }

      try {
        setErrorMessage('');

        const [atribuicoesRes, visitasRes] = await Promise.all([
          supabase
            .from('atribuicoes')
            .select('id, id_propriedade, ativa, atualizado_em, criado_em')
            .eq('id_instrutor', currentUserId)
            .eq('ativa', true)
            .order('atualizado_em', { ascending: false }),
          supabase
            .from('visitas')
            .select('id, id_propriedade, criado_em, status_visita')
            .eq('id_instrutor', currentUserId)
            .order('criado_em', { ascending: false })
            .limit(50),
        ]);

        if (atribuicoesRes.error) throw atribuicoesRes.error;
        if (visitasRes.error) throw visitasRes.error;

        const atribuicoes = (atribuicoesRes.data ?? []) as AtribuicaoDashboardRow[];
        const visitas = (visitasRes.data ?? []) as VisitaDashboardRow[];

        const latestVisitByProperty = visitas.reduce<Record<number, VisitaDashboardRow>>((acc, visit) => {
          if (visit.id_propriedade == null) return acc;
          if (!acc[visit.id_propriedade]) acc[visit.id_propriedade] = visit;
          return acc;
        }, {});

        const propertyIds = Array.from(
          new Set(
            [...atribuicoes.map((item) => item.id_propriedade), ...visitas.map((item) => item.id_propriedade)].filter(
              (value): value is number => typeof value === 'number'
            )
          )
        );

        let propertyLookup: PropertyLookup = {};

        if (propertyIds.length > 0) {
          const { data: propertiesData, error: propertiesError } = await supabase
            .from('propriedades')
            .select('id, nome, municipio_nome, uf')
            .in('id', propertyIds);

          if (propertiesError) throw propertiesError;

          propertyLookup = (propertiesData ?? []).reduce<PropertyLookup>((acc, property) => {
            acc[property.id] = property;
            return acc;
          }, {});
        }

        const atribuidas = atribuicoes
          .filter((item) => !latestVisitByProperty[item.id_propriedade])
          .map((item, index) => buildAssignmentItem(item, propertyLookup, index, null));

        const concluidas = Object.values(latestVisitByProperty).map((item, index) =>
          buildVisitItem(item, propertyLookup, index)
        );

        const hojeCount = atribuidas.filter((item) => item.status === 'Hoje' || item.status === 'Em andamento').length;

        if (mounted) {
          setAssignedItems(atribuidas);
          setCompletedItems(concluidas);
          setStats({
            atribuidas: String(atribuidas.length),
            hoje: String(hojeCount),
            concluidas: String(concluidas.length),
          });
        }
      } catch (error) {
        console.error('Erro ao carregar painel do instrutor:', error);
        if (mounted) {
          setErrorMessage('Não foi possível carregar suas visitas agora.');
          setAssignedItems([]);
          setCompletedItems([]);
          setStats({ atribuidas: '0', hoje: '0', concluidas: '0' });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setRefreshing(false);
        }
      }
    }

    setIsLoading(true);
    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [profile?.id, user?.id, refreshing]);

  useEffect(() => {
    const currentUserId = profile?.id ?? user?.id;
    if (!currentUserId) return;

    const userId = currentUserId;
    let cancelled = false;

    async function hydrateAvatarPath() {
      try {
        const savedPath = await AsyncStorage.getItem(getAvatarStorageKey(userId));
        if (!cancelled && savedPath) setAvatarStoragePath(savedPath);
      } catch (error) {
        console.error('Erro ao restaurar avatar do dashboard:', error);
      }
    }

    hydrateAvatarPath();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function resolveAvatar() {
      const sourcePath = profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : avatarStoragePath;
      if (!sourcePath) return;

      try {
        const { data, error } = await supabase.storage.from('avatares').createSignedUrl(sourcePath, 3600);

        if (!cancelled && !error && data?.signedUrl) {
          setAvatarUrl(`${data.signedUrl}${data.signedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
          return;
        }
      } catch (error) {
        console.error('Erro ao resolver avatar do dashboard:', error);
      }

      if (!cancelled) {
        const fallbackUrl =
          profile?.fotoUrl && profile.fotoUrl.startsWith('http')
            ? profile.fotoUrl
            : supabase.storage.from('avatares').getPublicUrl(sourcePath).data.publicUrl;
        setAvatarUrl(`${fallbackUrl}${fallbackUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
      }
    }

    resolveAvatar();
    return () => {
      cancelled = true;
    };
  }, [avatarStoragePath, profile?.fotoUrl]);

  useEffect(() => {
    const currentUserId = profile?.id ?? user?.id;
    const sourcePath = profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : avatarStoragePath;
    if (!currentUserId || !sourcePath) return;

    const userId = currentUserId;
    setAvatarStoragePath(sourcePath);
    AsyncStorage.setItem(getAvatarStorageKey(userId), sourcePath).catch((error) => {
      console.error('Erro ao persistir avatar do dashboard:', error);
    });
  }, [avatarStoragePath, profile?.fotoUrl, profile?.id, user?.id]);

  const displayName = useMemo(() => {
    const fullName = profile?.nomeCompleto ?? user?.user_metadata?.nome_completo ?? 'Instrutor';
    return fullName.trim();
  }, [profile?.nomeCompleto, user?.user_metadata]);

  const shortName = useMemo(() => displayName.split(' ').filter(Boolean)[0] ?? 'Instrutor', [displayName]);

  const filteredProperties = useMemo(() => {
    if (activeFilter === 'concluidas') return completedItems;
    if (activeFilter === 'hoje') {
      return assignedItems.filter((item) => item.status === 'Hoje' || item.status === 'Em andamento');
    }
    return assignedItems;
  }, [activeFilter, assignedItems, completedItems]);

  const sectionCopy = useMemo(() => getSectionCopy(activeFilter), [activeFilter]);

  const activeSummaryText = useMemo(() => {
    if (activeFilter === 'concluidas') {
      return `${stats.concluidas} visita${stats.concluidas === '1' ? '' : 's'} concluída${stats.concluidas === '1' ? '' : 's'}`;
    }
    if (activeFilter === 'hoje') {
      return `${stats.hoje} prioridade${stats.hoje === '1' ? '' : 's'} para hoje`;
    }
    return `${stats.atribuidas} propriedade${stats.atribuidas === '1' ? '' : 's'} aguardando visita`;
  }, [activeFilter, stats.atribuidas, stats.concluidas, stats.hoje]);

  const statCards = useMemo(
    () =>
      [
        { id: 'atribuidas', label: 'Atribuídas', helper: 'Carteira ativa', value: stats.atribuidas, icon: 'layers-outline' as const },
        { id: 'hoje', label: 'Hoje', value: stats.hoje, icon: 'sunny-outline' as const },
        { id: 'concluidas', label: 'Concluídas', helper: 'Histórico recente', value: stats.concluidas, icon: 'checkmark-done-outline' as const },
      ] as const,
    [stats]
  );

  const handleRefresh = () => setRefreshing(true);

  const renderItem = ({ item, index }: { item: DashboardItem; index: number }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity activeOpacity={0.9} style={[styles.visitCard, index === 0 && styles.firstVisitCard]}>
        <View style={[styles.visitIconWrap, { backgroundColor: item.iconeBg }]}>
          <Ionicons name={item.icone} size={22} color={THEME.hero} />
        </View>

        <View style={styles.visitBody}>
          <View style={styles.visitHeaderRow}>
            <Text style={styles.visitTitle}>{item.nome}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={THEME.yellow} />
            <Text style={styles.metaText}>{item.local}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="compass-outline" size={14} color={THEME.primary} />
            <Text style={styles.metaText}>{item.distancia}</Text>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.datePill}>
              <Ionicons name="calendar-outline" size={13} color={THEME.primary} />
              <Text style={styles.datePillText}>{item.visitaEm}</Text>
            </View>
            <View style={[styles.dot, { backgroundColor: statusStyle.dot }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.page} />

      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={THEME.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={styles.heroGlowLarge} />
              <View style={styles.heroGlowSmall} />

              <View style={styles.topRow}>
                <View style={styles.greetingBlock}>
                  <Text style={styles.greeting}>Painel do instrutor</Text>
                  <Text style={styles.userName}>Olá, {shortName}</Text>
                  <Text style={styles.userSubtitle}>{activeSummaryText}</Text>
                </View>

                <View style={styles.avatarShell}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <Ionicons name="person" size={24} color="#fff" />
                  )}
                </View>
              </View>

              <View style={styles.heroCard}>
                <View style={styles.heroCardCopy}>
                  <Text style={styles.heroEyebrow}>Seu ritmo de campo</Text>
                  <Text style={styles.heroTitle}>{sectionCopy.title}</Text>
                  <Text style={styles.heroDescription}>{sectionCopy.description}</Text>
                </View>

                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricLabel}>Em foco</Text>
                  <Text style={styles.heroMetricValue}>
                    {isLoading ? '...' : activeFilter === 'concluidas' ? stats.concluidas : activeFilter === 'hoje' ? stats.hoje : stats.atribuidas}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.segmentWrap}>
              {statCards.map((item) => {
                const isActive = item.id === activeFilter;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.92}
                    onPress={() => setActiveFilter(item.id)}
                    style={[styles.segmentCard, isActive && styles.segmentCardActive]}>
                    <View style={styles.segmentTopRow}>
                      <View style={[styles.segmentIconWrap, isActive && styles.segmentIconWrapActive]}>
                        <Ionicons name={item.icon} size={16} color={isActive ? THEME.hero : THEME.primary} />
                      </View>
                      {isActive ? <View style={styles.activePill}><Text style={styles.activePillText}>Ativo</Text></View> : null}
                    </View>

                    <Text style={styles.segmentValue}>{isLoading ? '...' : item.value}</Text>
                    <Text style={styles.segmentLabel}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>{sectionCopy.eyebrow}</Text>
                <Text style={styles.sectionHeading}>
                  {activeFilter === 'atribuidas'
                    ? 'Sua fila de visitas'
                    : activeFilter === 'hoje'
                      ? 'O que precisa acontecer hoje'
                      : 'Registros já finalizados'}
                </Text>
              </View>

              <View style={styles.counterPill}>
                <Ionicons name="albums-outline" size={14} color={THEME.primary} />
                <Text style={styles.counterPillText}>{filteredProperties.length}</Text>
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.feedbackCard}>
                <Ionicons name="alert-circle-outline" size={18} color={THEME.yellow} />
                <Text style={styles.feedbackText}>{errorMessage}</Text>
              </View>
            ) : null}

            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={THEME.primary} size="large" />
                <Text style={styles.loadingText}>Carregando sua rotina de campo...</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="trail-sign-outline" size={28} color={THEME.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nada para mostrar nesta visão</Text>
              <Text style={styles.emptyDescription}>
                Quando houver registros nessa categoria, eles vão aparecer aqui para você acompanhar.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.page },
  listContent: { paddingBottom: 120 },
  hero: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26, backgroundColor: THEME.page, overflow: 'hidden' },
  heroGlowLarge: { position: 'absolute', width: 280, height: 280, borderRadius: 999, backgroundColor: 'rgba(89,210,124,0.09)', top: -160, right: -70 },
  heroGlowSmall: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(242,201,76,0.06)', top: 40, left: -90 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greetingBlock: { flex: 1, paddingRight: 16 },
  greeting: { color: THEME.primary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  userName: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '800', marginBottom: 6 },
  userSubtitle: { color: THEME.textSoft, fontSize: 14, lineHeight: 20 },
  avatarShell: { width: 54, height: 54, borderRadius: 18, overflow: 'hidden', backgroundColor: '#93663d', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
  avatarImage: { width: '100%', height: '100%' },
  heroCard: { backgroundColor: THEME.hero, borderRadius: 26, borderWidth: 1, borderColor: THEME.lineStrong, padding: 18, flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  heroCardCopy: { flex: 1 },
  heroEyebrow: { color: THEME.primary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  heroTitle: { color: '#fff', fontSize: 22, lineHeight: 28, fontWeight: '800', marginBottom: 8 },
  heroDescription: { color: THEME.textSoft, fontSize: 14, lineHeight: 20 },
  heroMetric: { minWidth: 86, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, backgroundColor: THEME.primarySoft, alignItems: 'center' },
  heroMetricLabel: { color: THEME.primary, fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  heroMetricValue: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '800' },
  segmentWrap: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  segmentCard: { flex: 1, backgroundColor: THEME.panel, borderRadius: 22, borderWidth: 1, borderColor: THEME.line, padding: 14 },
  segmentCardActive: { backgroundColor: THEME.heroSoft, borderColor: THEME.primary, shadowColor: THEME.primary, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  segmentTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  segmentIconWrap: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.primarySoft },
  segmentIconWrapActive: { backgroundColor: THEME.primary },
  activePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  activePillText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  segmentValue: { color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '800', marginBottom: 4 },
  segmentLabel: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionEyebrow: { color: THEME.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  sectionHeading: { color: '#fff', fontSize: 20, lineHeight: 24, fontWeight: '800', maxWidth: 260 },
  counterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.panel, borderRadius: 999, borderWidth: 1, borderColor: THEME.line, paddingHorizontal: 12, paddingVertical: 8 },
  counterPillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  feedbackCard: { marginHorizontal: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(242,201,76,0.12)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(242,201,76,0.18)', padding: 14 },
  feedbackText: { flex: 1, color: '#f2dfaa', fontSize: 13, lineHeight: 18 },
  loadingWrap: { paddingHorizontal: 20, paddingVertical: 34, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: THEME.textSoft, fontSize: 13, marginTop: 12 },
  visitCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: THEME.panel, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: THEME.line, flexDirection: 'row', gap: 14, shadowColor: '#030804', shadowOpacity: 0.24, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  firstVisitCard: { marginTop: 2 },
  visitIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  visitBody: { flex: 1 },
  visitHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  visitTitle: { flex: 1, color: '#fff', fontSize: 19, lineHeight: 23, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { flex: 1, color: THEME.textSoft, fontSize: 13, lineHeight: 18 },
  footerRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(89,210,124,0.14)', borderWidth: 1, borderColor: 'rgba(89,210,124,0.16)', paddingHorizontal: 10, paddingVertical: 8 },
  datePillText: { color: '#dff9e7', fontSize: 12, fontWeight: '700' },
  dot: { width: 10, height: 10, borderRadius: 999 },
  emptyState: { marginHorizontal: 20, marginTop: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 20, backgroundColor: THEME.panel, borderRadius: 24, borderWidth: 1, borderColor: THEME.line },
  emptyIconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: THEME.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptyDescription: { color: THEME.textSoft, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});

