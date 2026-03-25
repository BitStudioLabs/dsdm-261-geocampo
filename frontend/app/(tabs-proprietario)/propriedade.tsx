import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
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

export default function PropriedadeScreen() {
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
          <Text style={styles.title}>Minha Propriedade</Text>
          <Text style={styles.subtitle}>Informacoes e dados da fazenda</Text>
        </Animated.View>

        <View style={styles.mainCard}>
          <View style={styles.propertyImagePlaceholder}>
            <FontAwesome6 name="image" size={32} color={THEME.textMuted} />
            <Text style={styles.imagePlaceholderText}>Foto da Propriedade</Text>
          </View>
          <View style={styles.propertyMainInfo}>
            <Text style={styles.propertyName}>Fazenda Santa Maria</Text>
            <View style={styles.locationRow}>
              <FontAwesome6 name="location-dot" size={14} color={THEME.link} />
              <Text style={styles.locationText}>Ribeirao Preto, SP</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: 'rgba(77,200,90,0.2)' }]}>
              <FontAwesome6 name="ruler-combined" size={16} color={THEME.leafLight} />
            </View>
            <Text style={styles.infoValue}>150</Text>
            <Text style={styles.infoLabel}>Hectares</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: 'rgba(245,200,66,0.2)' }]}>
              <FontAwesome6 name="wheat-awn" size={16} color={THEME.gold} />
            </View>
            <Text style={styles.infoValue}>3</Text>
            <Text style={styles.infoLabel}>Culturas</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: 'rgba(125,232,138,0.2)' }]}>
              <FontAwesome6 name="calendar-check" size={16} color={THEME.link} />
            </View>
            <Text style={styles.infoValue}>12</Text>
            <Text style={styles.infoLabel}>Visitas</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados de Registro</Text>
          <View style={styles.dataCard}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Codigo INCRA</Text>
              <Text style={styles.dataValue}>123.456.789.012-3</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Matricula</Text>
              <Text style={styles.dataValue}>MAT-2024-00123</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>CAR</Text>
              <Text style={styles.dataValue}>SP-3521406-ABC123</Text>
            </View>
            <View style={styles.dataDivider} />
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Data de Cadastro</Text>
              <Text style={styles.dataValue}>15/01/2024</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Culturas Ativas</Text>
          <View style={styles.culturesRow}>
            <View style={styles.cultureChip}>
              <FontAwesome6 name="seedling" size={12} color={THEME.gold} />
              <Text style={styles.cultureText}>Milho</Text>
            </View>
            <View style={styles.cultureChip}>
              <FontAwesome6 name="seedling" size={12} color={THEME.leafLight} />
              <Text style={styles.cultureText}>Soja</Text>
            </View>
            <View style={styles.cultureChip}>
              <FontAwesome6 name="seedling" size={12} color={THEME.link} />
              <Text style={styles.cultureText}>Feijao</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geolocalizacao</Text>
          <View style={styles.mapPlaceholder}>
            <FontAwesome6 name="map-location-dot" size={40} color={THEME.leafLight} />
            <Text style={styles.mapText}>Mapa da Propriedade</Text>
            <Text style={styles.coordText}>Lat: -21.1767 | Long: -47.8108</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.editBtn}>
          <FontAwesome6 name="pen-to-square" size={16} color={THEME.white} />
          <Text style={styles.editBtnText}>Solicitar Atualizacao</Text>
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
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: THEME.white, marginBottom: 6 },
  subtitle: { fontSize: 14, color: THEME.textMuted },
  mainCard: { backgroundColor: THEME.cardBg, borderRadius: 20, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  propertyImagePlaceholder: { height: 140, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  imagePlaceholderText: { fontSize: 12, color: THEME.textMuted },
  propertyMainInfo: { padding: 18 },
  propertyName: { fontSize: 20, fontWeight: '700', color: THEME.white, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { fontSize: 14, color: THEME.offWhite },
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCard: { flex: 1, backgroundColor: THEME.cardBg, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(77,200,90,0.12)' },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  infoValue: { fontSize: 22, fontWeight: '700', color: THEME.white, marginBottom: 4 },
  infoLabel: { fontSize: 11, color: THEME.textMuted },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: THEME.white, marginBottom: 14 },
  dataCard: { backgroundColor: THEME.cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(77,200,90,0.12)' },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  dataLabel: { fontSize: 13, color: THEME.textMuted },
  dataValue: { fontSize: 13, fontWeight: '600', color: THEME.offWhite },
  dataDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  culturesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cultureChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cultureText: { fontSize: 13, fontWeight: '600', color: THEME.offWhite },
  mapPlaceholder: { backgroundColor: THEME.cardBg, borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(77,200,90,0.12)', gap: 10 },
  mapText: { fontSize: 14, fontWeight: '600', color: THEME.offWhite },
  coordText: { fontSize: 11, color: THEME.textMuted },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.leafMid, borderRadius: 16, paddingVertical: 16, gap: 10 },
  editBtnText: { fontSize: 15, fontWeight: '700', color: THEME.white },
});
