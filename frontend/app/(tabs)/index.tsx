import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Dimensions,
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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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

const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * (SCREEN_H * 0.25),
  size: Math.random() * 2 + 0.8,
  opacity: Math.random() * 0.5 + 0.3,
  twinkleDelay: Math.random() * 3000,
}));

const FIREFLIES = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  startX: SCREEN_W * (0.1 + Math.random() * 0.8),
  startY: 40 + Math.random() * 80,
  delay: i * 300,
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
    const x = startX + Math.sin(progress.value * Math.PI * 2) * 20;
    const y = startY + Math.cos(progress.value * Math.PI * 2) * 12;
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

function formatVisitDate(dateValue?: string | null) {
  if (!dateValue) {
    return 'Sem data definida';
  }

  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return 'Sem data definida';
  }

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

  if (isSameDay) {
    return `Hoje - ${time}`;
  }

  if (isTomorrow) {
    return `Amanhã - ${time}`;
  }

  return parsed.toLocaleDateString('pt-BR');
}

function mapVisitStatusToLabel(status?: VisitStatusDb, dateValue?: string | null, isCompleted?: boolean): StatusType {
  if (status === 'em_andamento') {
    return 'Em andamento';
  }

  if (status === 'em_analise') {
    return 'Em análise';
  }

  if (status === 'aprovada') {
    return 'Aprovada';
  }

  if (status === 'rejeitada') {
    return 'Rejeitada';
  }

  if (status === 'finalizada') {
    return 'Concluída';
  }

  if (isCompleted) {
    return 'Concluída';
  }

  if (!dateValue) {
    return 'Agendada';
  }

  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return 'Agendada';
  }

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

  if (value.includes(publicMarker)) {
    return decodeURIComponent(value.split(publicMarker)[1]?.split('?')[0] ?? '');
  }

  if (value.includes(signMarker)) {
    return decodeURIComponent(value.split(signMarker)[1]?.split('?')[0] ?? '');
  }

  return value;
}

function getAvatarStorageKey(userId: string) {
  return `profile-avatar-path:${userId}`;
}

function getIconByIndex(index: number): {
  icone: keyof typeof Ionicons.glyphMap;
  iconeBg: string;
} {
  const options = [
    { icone: 'leaf-outline', iconeBg: '#DFF6E8' },
    { icone: 'paw-outline', iconeBg: '#EAF5DF' },
    { icone: 'nutrition-outline', iconeBg: '#F5F0D9' },
    { icone: 'rose-outline', iconeBg: '#E6F3E1' },
    { icone: 'flower-outline', iconeBg: '#F4EAD9' },
    { icone: 'home-outline', iconeBg: '#E8F0DA' },
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
  const resolvedStatus = mapVisitStatusToLabel(latestVisit?.status_visita, visitDate, false);

  return {
    id: `atr-${item.id}`,
    nome: property?.nome ?? 'Propriedade sem nome',
    local: [property?.municipio_nome, property?.uf].filter(Boolean).join(', ') || 'Localização não informada',
    distancia: latestVisit ? 'Ultima visita registrada' : 'A conferir',
    status: resolvedStatus,
    visitaEm: formatVisitDate(visitDate),
    ...iconData,
  };
}

function buildVisitItem(
  item: VisitaDashboardRow,
  propertyLookup: PropertyLookup,
  index: number
): DashboardItem {
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

const getStatusStyle = (status: StatusType) => {
  switch (status) {
    case 'Hoje':
      return { bg: 'rgba(77,200,90,0.15)', text: THEME.link, dot: THEME.leafLight };
    case 'Agendada':
      return { bg: 'rgba(245,200,66,0.15)', text: THEME.cornYellow, dot: THEME.cornYellow };
    case 'Em andamento':
      return { bg: 'rgba(74,163,216,0.15)', text: '#7ac4f0', dot: colors.info };
    case 'Em análise':
      return { bg: 'rgba(245,200,66,0.15)', text: THEME.cornYellow, dot: THEME.cornYellow };
    case 'Aprovada':
      return { bg: 'rgba(46,175,109,0.15)', text: colors.success, dot: colors.success };
    case 'Rejeitada':
      return { bg: 'rgba(255,107,107,0.14)', text: colors.danger, dot: colors.danger };
    default:
      return { bg: 'rgba(46,175,109,0.15)', text: colors.success, dot: colors.success };
  }
};

const getSectionCopy = (activeFilter: DashboardFilter) => {
  if (activeFilter === 'concluidas') {
    return {
      title: 'VISITAS CONCLUÍDAS',
      description: 'Histórico das propriedades já visitadas por você',
      action: 'Histórico',
    };
  }

  if (activeFilter === 'hoje') {
    return {
      title: 'VISITAS DE HOJE',
      description: 'Propriedades atribuídas com atividade prevista para hoje',
      action: 'Rota',
    };
  }

  return {
    title: 'PROPRIEDADES ATRIBUÍDAS',
    description: 'Propriedades vinculadas ao seu usuário no momento',
    action: 'Agenda',
  };
};

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
  const [stats, setStats] = useState<DashboardStats>({
    atribuidas: '0',
    hoje: '0',
    concluidas: '0',
  });

  const loadDashboard = useCallback(async () => {
    const currentUserId = profile?.id ?? user?.id;

    if (!currentUserId) {
      setAssignedItems([]);
      setCompletedItems([]);
      setStats({ atribuidas: '0', hoje: '0', concluidas: '0' });
      setIsLoading(false);
      return;
    }

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
        .limit(20),
    ]);

    if (atribuicoesRes.error) {
      throw atribuicoesRes.error;
    }

    if (visitasRes.error) {
      throw visitasRes.error;
    }

    const atribuicoes = (atribuicoesRes.data ?? []) as AtribuicaoDashboardRow[];
    const visitas = (visitasRes.data ?? []) as VisitaDashboardRow[];
    const latestVisitByProperty = visitas.reduce<Record<number, VisitaDashboardRow>>((acc, visit) => {
      if (visit.id_propriedade == null) {
        return acc;
      }

      if (!acc[visit.id_propriedade]) {
        acc[visit.id_propriedade] = visit;
      }

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

      if (propertiesError) {
        throw propertiesError;
      }

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

    setAssignedItems(atribuidas);
    setCompletedItems(concluidas);
    setStats({
      atribuidas: String(atribuidas.length),
      hoje: String(hojeCount),
      concluidas: String(concluidas.length),
    });
  }, [profile?.id, user?.id]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setIsLoading(true);
      try {
        await loadDashboard();
      } catch (error) {
        console.error('Erro ao carregar painel do instrutor:', error);
        if (mounted) {
          setErrorMessage('Não foi possível carregar suas atribuições agora.');
          setAssignedItems([]);
          setCompletedItems([]);
          setStats({ atribuidas: '0', hoje: '0', concluidas: '0' });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [loadDashboard]);

  useEffect(() => {
    const currentUserId = profile?.id ?? user?.id;

    if (!currentUserId) {
      return;
    }

    const userId = currentUserId;

    let cancelled = false;

    async function hydrateAvatarPath() {
      try {
        const savedPath = await AsyncStorage.getItem(getAvatarStorageKey(userId));

        if (!cancelled && savedPath) {
          setAvatarStoragePath(savedPath);
        }
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

      if (!sourcePath) {
        return;
      }

      try {
        const { data, error } = await supabase.storage.from('avatares').createSignedUrl(sourcePath, 60 * 60);

        if (!cancelled && !error && data?.signedUrl) {
          setAvatarUrl(`${data.signedUrl}${data.signedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
          return;
        }
      } catch (error) {
        console.error('Erro ao resolver avatar do dashboard:', error);
      }

      if (!cancelled) {
        const fallbackUrl = profile?.fotoUrl && profile.fotoUrl.startsWith('http')
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

    if (!currentUserId) {
      return;
    }

    const userId = currentUserId;

    const sourcePath = profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : avatarStoragePath;

    if (!sourcePath) {
      return;
    }

    setAvatarStoragePath(sourcePath);
    AsyncStorage.setItem(getAvatarStorageKey(userId), sourcePath).catch((error) => {
      console.error('Erro ao persistir avatar do dashboard:', error);
    });
  }, [avatarStoragePath, profile?.fotoUrl, profile?.id, user?.id]);

  const filteredProperties = useMemo(() => {
    if (activeFilter === 'concluidas') {
      return completedItems;
    }

    if (activeFilter === 'hoje') {
      return assignedItems.filter((item) => item.status === 'Hoje' || item.status === 'Em andamento');
    }

    return assignedItems;
  }, [activeFilter, assignedItems, completedItems]);

  const sectionCopy = getSectionCopy(activeFilter);
  const displayName = useMemo(
    () => profile?.nomeCompleto ?? user?.user_metadata?.nome_completo ?? 'Instrutor',
    [profile?.nomeCompleto, user?.user_metadata]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
    } catch (error) {
      console.error('Erro ao atualizar painel do instrutor:', error);
      setErrorMessage('Não foi possível atualizar seus dados agora.');
    } finally {
      setRefreshing(false);
    }
  };

  const statCards = useMemo(
    () =>
      [
        { id: 'atribuidas', label: 'Atribuídas', value: stats.atribuidas },
        { id: 'hoje', label: 'Hoje', value: stats.hoje },
        { id: 'concluidas', label: 'Concluídas', value: stats.concluidas },
      ] as const,
    [stats]
  );

  const renderItem = ({ item }: { item: DashboardItem }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity activeOpacity={0.9} style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: item.iconeBg }]}>
          <Ionicons name={item.icone} size={24} color={THEME.skyMid} />
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.nome}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={12} color={THEME.cornYellow} />
            <Text style={styles.cardSubtitle}>
              {item.local} - {item.distancia}
            </Text>
          </View>
          <Text style={styles.visitDate}>Visita: {item.visitaEm}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status}</Text>
            <View style={[styles.badgeDot, { backgroundColor: statusStyle.dot }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.skyTop} />

      <View style={styles.hero}>
        <View style={styles.skyGrad1} />
        <View style={styles.skyGrad2} />

        {STARS.map((star) => (
          <AnimatedStar key={star.id} star={star} />
        ))}

        {FIREFLIES.map((firefly) => (
          <Firefly key={firefly.id} {...firefly} />
        ))}

        <View style={styles.moonContainer}>
          <View style={styles.moon}>
            <View style={styles.moonInner}>
              <View style={[styles.crater, { top: 6, left: 8, width: 6, height: 6 }]} />
              <View style={[styles.crater, { top: 16, left: 20, width: 4, height: 4 }]} />
              <View style={[styles.crater, { top: 24, left: 10, width: 5, height: 5 }]} />
            </View>
          </View>
        </View>

        <View style={styles.heroTop}>
          <View>
            <Text style={styles.greeting}>Bom dia,</Text>
            <Text style={styles.userName}>{displayName}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.9} style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Ionicons name="person" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {statCards.map((item) => {
            const isActive = item.id === activeFilter;

            return (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.9}
                onPress={() => setActiveFilter(item.id)}
                style={[styles.statBox, isActive && styles.statBoxActive]}>
                <View style={[styles.statIndicator, isActive && styles.statIndicatorActive]} />
                <Text style={styles.statNumber}>{isLoading ? '...' : item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>{sectionCopy.title}</Text>
            <Text style={styles.sectionDescription}>{sectionCopy.description}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={styles.sectionAction}>
            <Text style={styles.sectionActionText}>{sectionCopy.action}</Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.feedbackCard}>
            <Ionicons name="alert-circle-outline" size={18} color={THEME.cornYellow} />
            <Text style={styles.feedbackText}>{errorMessage}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={THEME.leafLight} size="large" />
            <Text style={styles.loadingText}>Carregando suas propriedades...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProperties}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={THEME.leafLight}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="clipboard-outline" size={28} color={THEME.textGray} />
                <Text style={styles.emptyTitle}>Nenhuma visita encontrada</Text>
                <Text style={styles.emptyDescription}>
                  Quando houver registros nessa categoria, eles vão aparecer aqui.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.skyTop },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 26,
    overflow: 'hidden',
    position: 'relative',
  },
  skyGrad1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.skyTop,
  },
  skyGrad2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: THEME.skyMid,
    opacity: 0.5,
  },
  moonContainer: {
    position: 'absolute',
    top: 12,
    right: 80,
  },
  moon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fffbe0',
    shadowColor: '#fffbe0',
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  moonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#fffbe0',
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    backgroundColor: 'rgba(200,190,150,0.4)',
    borderRadius: 50,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
    zIndex: 10,
  },
  greeting: { color: THEME.link, fontSize: 13, marginBottom: 2 },
  userName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#A56B3F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(77,200,90,0.3)',
    shadowColor: THEME.leafLight,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  statsRow: { flexDirection: 'row', gap: 10, zIndex: 10 },
  statBox: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  statBoxActive: {
    borderWidth: 2,
    borderColor: THEME.leafLight,
    shadowColor: THEME.leafLight,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  statIndicator: {
    width: 24,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  statIndicatorActive: { backgroundColor: THEME.cornYellow },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: 12, color: THEME.link },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionEyebrow: {
    color: '#8B8E84',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionDescription: { color: colors.textMuted, fontSize: 13, maxWidth: 230 },
  sectionAction: {
    backgroundColor: THEME.skyMid,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionActionText: { color: THEME.link, fontSize: 12, fontWeight: '700' },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  feedbackText: {
    flex: 1,
    color: '#7B6333',
    fontSize: 13,
    lineHeight: 18,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 12,
  },
  listContent: { paddingBottom: 110 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.1)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    color: colors.textDark,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    marginBottom: 5,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardSubtitle: { color: colors.textMuted, fontSize: 13, flexShrink: 1 },
  visitDate: { color: THEME.skyMid, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeDot: { width: 8, height: 8, borderRadius: 999 },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
