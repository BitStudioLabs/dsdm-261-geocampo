import React, { useEffect, useState } from 'react';
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

const PROPRIEDADES = [
  { id: '1', nome: 'Fazenda Santa Clara', meta: 'Ribeirao Preto, SP' },
  { id: '2', nome: 'Sitio Boa Esperanca', meta: 'Bauru, SP' },
  { id: '3', nome: 'Chacara Vale Verde', meta: 'Jau, SP' },
] as const;

const VISITAS_REALIZADAS = [
  { id: '1', propriedade: 'Fazenda Santa Clara', data: '24/05/2025', hora: '09:41', status: 'Analisada' },
  { id: '2', propriedade: 'Sitio Boa Esperanca', data: '22/05/2025', hora: '13:20', status: 'Enviada' },
  { id: '3', propriedade: 'Rancho Ipe Amarelo', data: '20/05/2025', hora: '10:15', status: 'Concluida' },
] as const;

const METADADOS = [
  { label: 'Latitude', value: '-21.1785' },
  { label: 'Longitude', value: '-47.8164' },
  { label: 'Altitude', value: '621m' },
] as const;

const STARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * 160,
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

  return <Animated.View pointerEvents="none" style={glowStyle} />;
}

const FIREFLIES = Array.from({ length: 4 }, (_, i) => ({
  id: i,
  startX: SCREEN_W * (0.15 + Math.random() * 0.7),
  startY: 40 + Math.random() * 100,
  delay: i * 350,
  size: 3 + Math.random() * 2,
}));

export default function VisitasScreen() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(PROPRIEDADES[0].id);
  const selectedProperty = PROPRIEDADES.find((item) => item.id === selectedPropertyId) ?? PROPRIEDADES[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.skyTop} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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
                <View style={[styles.crater, { top: 12, left: 14, width: 3, height: 3 }]} />
                <View style={[styles.crater, { top: 16, left: 7, width: 4, height: 4 }]} />
              </View>
            </View>
          </View>

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Visitas</Text>
              <Text style={styles.subtitle}>Historico das visitas realizadas e novo envio de evidencias</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={18} color={THEME.link} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOVA EVIDENCIA</Text>
          <Text style={styles.helperText}>Escolha a propriedade para vincular a foto da visita realizada.</Text>

          <View style={styles.selectionCard}>
            <View style={styles.selectionTop}>
              <View style={styles.selectionIcon}>
                <Ionicons name="business-outline" size={22} color={THEME.leafLight} />
              </View>
              <View style={styles.selectionCopy}>
                <Text style={styles.selectionLabel}>Propriedade selecionada</Text>
                <Text style={styles.selectionTitle}>{selectedProperty.nome}</Text>
                <Text style={styles.selectionMeta}>{selectedProperty.meta}</Text>
              </View>
            </View>

            <View style={styles.chipsRow}>
              {PROPRIEDADES.map((item) => {
                const isActive = item.id === selectedPropertyId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.9}
                    onPress={() => setSelectedPropertyId(item.id)}
                    style={[styles.propertyChip, isActive && styles.propertyChipActive]}>
                    <Text style={[styles.propertyChipText, isActive && styles.propertyChipTextActive]}>{item.nome}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPLOAD DE FOTO</Text>
          <TouchableOpacity activeOpacity={0.9} style={styles.uploadCard}>
            <View style={styles.uploadIconWrap}>
              <Ionicons name="folder-open-outline" size={34} color={THEME.cornYellow} />
            </View>
            <Text style={styles.uploadTitle}>Selecionar Foto</Text>
            <Text style={styles.uploadSubtitle}>JPEG, PNG, HEIC - metadados GPS serao lidos automaticamente</Text>
            <View style={styles.uploadButton}>
              <Text style={styles.uploadButtonText}>Escolher Arquivo</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.geoHeader}>
            <View>
              <Text style={styles.geoTitle}>Geolocalizacao Extraida</Text>
              <Text style={styles.geoSubtitle}>Metadados da foto selecionada para {selectedProperty.nome}</Text>
            </View>
            <View style={styles.geoBadge}>
              <Ionicons name="checkmark-circle" size={16} color={THEME.leafLight} />
              <Text style={styles.geoBadgeText}>Metadados OK</Text>
            </View>
          </View>

          <View style={styles.metadataRow}>
            {METADADOS.map((item) => (
              <View key={item.label} style={styles.metadataCard}>
                <Text style={styles.metadataLabel}>{item.label}</Text>
                <Text style={styles.metadataValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity activeOpacity={0.92} style={styles.primaryButton} onPress={() => router.push('/avaliador' as any)}>
            <Text style={styles.primaryButtonText}>Enviar para Analise</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VISITAS REALIZADAS</Text>
          {VISITAS_REALIZADAS.map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <View style={styles.historyIcon}>
                <Ionicons name="clipboard-outline" size={20} color={THEME.leafLight} />
              </View>
              <View style={styles.historyCopy}>
                <Text style={styles.historyTitle}>{item.propriedade}</Text>
                <Text style={styles.historyMeta}>{item.data} - {item.hora}</Text>
              </View>
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>{item.status}</Text>
              </View>
            </View>
          ))}
        </View>
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
    paddingBottom: 18,
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
    top: 18,
    right: 50,
  },
  moon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fffbe0',
    shadowColor: '#fffbe0',
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  moonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
    backgroundColor: '#fffbe0',
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    backgroundColor: 'rgba(200,190,150,0.4)',
    borderRadius: 50,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', zIndex: 10 },
  headerCopy: { flex: 1 },
  title: { color: '#fff', fontSize: 29, fontWeight: '800', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  subtitle: { color: THEME.link, fontSize: 13, lineHeight: 18 },
  moreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  helperText: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 14 },
  selectionCard: { backgroundColor: 'rgba(77,200,90,0.06)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  selectionTop: { flexDirection: 'row', marginBottom: 14 },
  selectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(77,200,90,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectionCopy: { flex: 1 },
  selectionLabel: { color: THEME.skyMid, fontSize: 11, marginBottom: 4 },
  selectionTitle: { color: colors.textDark, fontSize: 20, fontWeight: '800', marginBottom: 2 },
  selectionMeta: { color: colors.textMuted, fontSize: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  propertyChip: { borderRadius: 999, backgroundColor: 'rgba(77,200,90,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  propertyChipActive: { backgroundColor: THEME.skyMid, borderColor: THEME.skyMid },
  propertyChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  propertyChipTextActive: { color: '#fff' },
  uploadCard: {
    borderWidth: 2,
    borderColor: THEME.leafLight,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(77,200,90,0.06)',
  },
  uploadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(245,200,66,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.25)',
  },
  uploadTitle: { color: colors.textDark, fontSize: 24, fontWeight: '800', marginBottom: 6 },
  uploadSubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 16 },
  uploadButton: { borderRadius: 999, backgroundColor: THEME.leafLight, paddingHorizontal: 18, paddingVertical: 10, shadowColor: THEME.leafLight, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  uploadButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  geoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  geoTitle: { color: colors.textDark, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  geoSubtitle: { color: colors.textMuted, fontSize: 12, maxWidth: 220 },
  geoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(77,200,90,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.2)',
  },
  geoBadgeText: { color: THEME.leafLight, fontSize: 12, fontWeight: '700' },
  metadataRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metadataCard: { flex: 1, backgroundColor: 'rgba(77,200,90,0.08)', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: 'rgba(77,200,90,0.12)' },
  metadataLabel: { color: THEME.skyMid, fontSize: 11, marginBottom: 4 },
  metadataValue: { color: colors.textDark, fontSize: 18, fontWeight: '800' },
  primaryButton: {
    backgroundColor: THEME.skyMid,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: THEME.leafLight,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.25)',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(77,200,90,0.15)',
  },
  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(77,200,90,0.12)',
    marginRight: 12,
  },
  historyCopy: { flex: 1 },
  historyTitle: { color: colors.textDark, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  historyMeta: { color: colors.textMuted, fontSize: 12 },
  historyBadge: { borderRadius: 999, backgroundColor: 'rgba(77,200,90,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(77,200,90,0.18)' },
  historyBadgeText: { color: THEME.leafLight, fontSize: 12, fontWeight: '700' },
});
