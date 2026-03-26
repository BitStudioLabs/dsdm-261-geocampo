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

const { width: SCREEN_W } = Dimensions.get('window');

const THEME = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
  skyBottom: '#1a4a20',
  starColor: 'rgba(255,255,255,0.8)',
  leafLight: '#4dc85a',
  cornYellow: '#f5c842',
  cardBg: 'rgba(10,31,13,0.85)',
  cardBorder: 'rgba(77,200,90,0.2)',
  textGray: 'rgba(255,255,255,0.55)',
  link: '#7de88a',
};

const CRITERIOS = [
  { id: '1', titulo: 'Distancia da propriedade', descricao: '87 metros - dentro do raio permitido (200m)', progresso: 0.92, icon: 'location', cor: THEME.leafLight, status: 'ok' },
  { id: '2', titulo: 'Coerencia do IP', descricao: 'IP de Ribeirao Preto, SP - compativel', progresso: 0.84, icon: 'globe-outline', cor: colors.info, status: 'ok' },
  { id: '3', titulo: 'Padrao de deslocamento', descricao: 'Trajetoria coerente - sem saltos suspeitos', progresso: 0.88, icon: 'car-sport-outline', cor: THEME.cornYellow, status: 'ok' },
  { id: '4', titulo: 'Indicadores de VPN', descricao: 'Nenhum indicio detectado', progresso: 0.91, icon: 'lock-closed-outline', cor: THEME.leafLight, status: 'ok' },
  { id: '5', titulo: 'Data e hora dos metadados', descricao: '24/05/2025 09:38 - coerente (+3 min)', progresso: 0.52, icon: 'time-outline', cor: colors.warning, status: 'warning' },
] as const;

const STARS = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * 220,
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

  return <Animated.View style={[glowStyle, { pointerEvents: 'none' }]} />;
}

const FIREFLIES = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  startX: SCREEN_W * (0.1 + Math.random() * 0.8),
  startY: 60 + Math.random() * 140,
  delay: i * 300,
  size: 3 + Math.random() * 2,
}));

export default function AvaliadorScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.skyTop} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
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
                <View style={[styles.crater, { top: 6, left: 8, width: 6, height: 6 }]} />
                <View style={[styles.crater, { top: 16, left: 20, width: 4, height: 4 }]} />
                <View style={[styles.crater, { top: 22, left: 10, width: 5, height: 5 }]} />
              </View>
            </View>
          </View>

          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={18} color={THEME.link} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Analise de Autenticidade</Text>
              <Text style={styles.heroSubtitle}>Fazenda Santa Clara - 24/05/2025</Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreRing}>
              <View style={styles.scoreRingInner}>
                <Text style={styles.scoreValue}>94</Text>
              </View>
            </View>

            <View style={styles.scoreMeta}>
              <Text style={styles.scoreHeadline}>Alta Confiabilidade</Text>
              <Text style={styles.scoreDescription}>Localizacao verificada com sucesso e sem sinais relevantes de fraude.</Text>
              <View style={styles.validBadge}>
                <Ionicons name="checkmark-circle" size={16} color={THEME.leafLight} />
                <Text style={styles.validBadgeText}>Localizacao Valida</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.sectionTitle}>CRITERIOS DE ANALISE</Text>

          {CRITERIOS.map((criterio) => (
            <View key={criterio.id} style={styles.criteriaRow}>
              <View style={[styles.criteriaIcon, { backgroundColor: `${criterio.cor}20` }]}>
                <Ionicons name={criterio.icon} size={18} color={criterio.cor} />
              </View>
              <View style={styles.criteriaContent}>
                <View style={styles.criteriaHeader}>
                  <Text style={styles.criteriaTitle}>{criterio.titulo}</Text>
                  <Ionicons
                    name={criterio.status === 'ok' ? 'checkmark' : 'warning-outline'}
                    size={16}
                    color={criterio.status === 'ok' ? THEME.leafLight : colors.warning}
                  />
                </View>
                <Text style={styles.criteriaDescription}>{criterio.descricao}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${criterio.progresso * 100}%`, backgroundColor: criterio.cor }]} />
                </View>
              </View>
            </View>
          ))}

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
            <Text style={styles.infoText}>Pequena divergencia de 3 minutos entre metadados da foto e horario do envio. Dentro da margem considerada normal.</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>94</Text>
              <Text style={styles.summaryLabel}>Score final</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>5/5</Text>
              <Text style={styles.summaryLabel}>Crit. verificados</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  hero: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22, position: 'relative', overflow: 'hidden' },
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
    right: 70,
  },
  moon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fffbe0',
    shadowColor: '#fffbe0',
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  moonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    backgroundColor: '#fffbe0',
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    backgroundColor: 'rgba(200,190,150,0.4)',
    borderRadius: 50,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, zIndex: 10 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.cardBg, borderWidth: 1, borderColor: THEME.cardBorder, alignItems: 'center', justifyContent: 'center' },
  moreButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.cardBg, borderWidth: 1, borderColor: THEME.cardBorder, alignItems: 'center', justifyContent: 'center' },
  heroHeader: { marginBottom: 24, zIndex: 10 },
  heroCopy: { gap: 4 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  heroSubtitle: { color: THEME.link, fontSize: 13 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 18, zIndex: 10 },
  scoreRing: { width: 92, height: 92, borderRadius: 46, borderWidth: 8, borderColor: THEME.leafLight, alignItems: 'center', justifyContent: 'center', shadowColor: THEME.leafLight, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  scoreRingInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: THEME.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.cardBorder },
  scoreValue: { color: '#fff', fontSize: 28, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  scoreMeta: { flex: 1 },
  scoreHeadline: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  scoreDescription: { color: THEME.textGray, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  validBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(77,200,90,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(77,200,90,0.25)' },
  validBadgeText: { color: THEME.link, fontSize: 12, fontWeight: '700' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, minHeight: 520 },
  sectionTitle: { color: THEME.skyMid, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  criteriaRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0B1E17',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.1)',
  },
  criteriaIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  criteriaContent: { flex: 1 },
  criteriaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  criteriaTitle: { color: colors.textDark, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  criteriaDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  track: { height: 4, borderRadius: 999, backgroundColor: 'rgba(77,200,90,0.15)' },
  fill: { height: '100%', borderRadius: 999 },
  infoCard: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(245,200,66,0.12)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(245,200,66,0.25)', marginTop: 4, marginBottom: 14 },
  infoText: { flex: 1, color: '#8B7845', fontSize: 13, lineHeight: 18 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(77,200,90,0.1)' },
  summaryNumber: { color: THEME.skyMid, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { color: colors.textMuted, fontSize: 12 },
});
