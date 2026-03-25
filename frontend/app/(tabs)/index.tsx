import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
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

import { colors } from '@/src/theme/colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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

type StatusType = 'Agendada' | 'Hoje' | 'Em andamento' | 'Concluida';
type DashboardFilter = 'atribuidas' | 'hoje' | 'concluidas';

type Propriedade = {
  id: string;
  nome: string;
  local: string;
  distancia: string;
  status: StatusType;
  visitaEm: string;
  icone: keyof typeof Ionicons.glyphMap;
  iconeBg: string;
};

const STATS = [
  { id: 'atribuidas', label: 'Atribuidas', value: '4', tone: 'dark' },
  { id: 'hoje', label: 'Hoje', value: '2', tone: 'light' },
  { id: 'concluidas', label: 'Concluidas', value: '2', tone: 'green' },
] as const satisfies readonly {
  id: DashboardFilter;
  label: string;
  value: string;
  tone: 'dark' | 'light' | 'green';
}[];

const PROPRIEDADES: Propriedade[] = [
  {
    id: '1',
    nome: 'Fazenda Santa Clara',
    local: 'Ribeirao Preto, SP',
    distancia: '12 km',
    status: 'Hoje',
    visitaEm: 'Hoje - 09:30',
    icone: 'leaf-outline',
    iconeBg: '#DFF6E8',
  },
  {
    id: '2',
    nome: 'Sitio Boa Esperanca',
    local: 'Bauru, SP',
    distancia: '38 km',
    status: 'Agendada',
    visitaEm: 'Amanha - 14:00',
    icone: 'paw-outline',
    iconeBg: '#EAF5DF',
  },
  {
    id: '3',
    nome: 'Chacara Vale Verde',
    local: 'Jau, SP',
    distancia: '55 km',
    status: 'Em andamento',
    visitaEm: '23/05 - 08:30',
    icone: 'nutrition-outline',
    iconeBg: '#F5F0D9',
  },
  {
    id: '4',
    nome: 'Estancia Pedra Branca',
    local: 'Cravinhos, SP',
    distancia: '16 km',
    status: 'Hoje',
    visitaEm: 'Hoje - 15:00',
    icone: 'rose-outline',
    iconeBg: '#E6F3E1',
  },
  {
    id: '5',
    nome: 'Rancho Ipe Amarelo',
    local: 'Lencois Paulista',
    distancia: '20 km',
    status: 'Concluida',
    visitaEm: '20/05 - 10:15',
    icone: 'flower-outline',
    iconeBg: '#F4EAD9',
  },
  {
    id: '6',
    nome: 'Fazenda Bela Vista',
    local: 'Sertaozinho, SP',
    distancia: '18 km',
    status: 'Concluida',
    visitaEm: '18/05 - 15:20',
    icone: 'home-outline',
    iconeBg: '#E8F0DA',
  },
];

const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * (SCREEN_H * 0.25),
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

  return <Animated.View pointerEvents="none" style={glowStyle} />;
}

const FIREFLIES = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  startX: SCREEN_W * (0.1 + Math.random() * 0.8),
  startY: 40 + Math.random() * 80,
  delay: i * 300,
  size: 3 + Math.random() * 2,
}));

const getStatusStyle = (status: StatusType) => {
  switch (status) {
    case 'Hoje':
      return { bg: 'rgba(77,200,90,0.15)', text: THEME.link, dot: THEME.leafLight };
    case 'Agendada':
      return { bg: 'rgba(245,200,66,0.15)', text: THEME.cornYellow, dot: THEME.cornYellow };
    case 'Em andamento':
      return { bg: 'rgba(74,163,216,0.15)', text: '#7ac4f0', dot: colors.info };
    default:
      return { bg: 'rgba(46,175,109,0.15)', text: colors.success, dot: colors.success };
  }
};

const getSectionCopy = (activeFilter: DashboardFilter) => {
  if (activeFilter === 'concluidas') {
    return {
      title: 'VISITAS CONCLUIDAS',
      description: 'Historico das propriedades ja visitadas por voce',
      action: 'Historico',
    };
  }

  if (activeFilter === 'hoje') {
    return {
      title: 'VISITAS DE HOJE',
      description: 'Propriedades que precisam ser atendidas hoje',
      action: 'Rota',
    };
  }

  return {
    title: 'PROPRIEDADES ATRIBUIDAS',
    description: 'Proximas propriedades que voce precisa visitar',
    action: 'Agenda',
  };
};

export default function DashboardScreen() {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('atribuidas');

  const filteredProperties = useMemo(() => {
    if (activeFilter === 'concluidas') {
      return PROPRIEDADES.filter((item) => item.status === 'Concluida');
    }

    if (activeFilter === 'hoje') {
      return PROPRIEDADES.filter((item) => item.status === 'Hoje');
    }

    return PROPRIEDADES.filter((item) => item.status !== 'Concluida');
  }, [activeFilter]);

  const sectionCopy = getSectionCopy(activeFilter);

  const renderItem = ({ item }: { item: Propriedade }) => {
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
            <Text style={styles.userName}>Joao Silva</Text>
          </View>
          <TouchableOpacity activeOpacity={0.9} style={styles.avatar}>
            <Ionicons name="person" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {STATS.map((item) => {
            const isActive = item.id === activeFilter;

            return (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.9}
                onPress={() => setActiveFilter(item.id)}
                style={[
                  styles.statBox,
                  isActive && styles.statBoxActive,
                ]}>
                <View style={[styles.statIndicator, isActive && styles.statIndicatorActive]} />
                <Text style={styles.statNumber}>{item.value}</Text>
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

        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={28} color={THEME.textGray} />
              <Text style={styles.emptyTitle}>Nenhuma visita encontrada</Text>
              <Text style={styles.emptyDescription}>
                Quando houver registros nessa categoria, eles vao aparecer aqui.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.skyTop },
  hero: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 26, overflow: 'hidden', position: 'relative' },
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
  userName: { color: '#fff', fontSize: 28, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  statIndicator: { width: 24, height: 4, borderRadius: 999, backgroundColor: 'transparent', marginBottom: 8 },
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
  sectionEyebrow: { color: '#8B8E84', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  sectionDescription: { color: colors.textMuted, fontSize: 13, maxWidth: 230 },
  sectionAction: { backgroundColor: THEME.skyMid, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  sectionActionText: { color: THEME.link, fontSize: 12, fontWeight: '700' },
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
  cardTitle: { color: colors.textDark, fontSize: 20, lineHeight: 22, fontWeight: '800', marginBottom: 5 },
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
  emptyTitle: { color: colors.textDark, fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  emptyDescription: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
