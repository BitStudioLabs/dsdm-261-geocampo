import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';
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

const INSTRUCTORS = [
  { id: '1', name: 'Joao Silva', email: 'joao@email.com', visits: 45, status: 'active', lastActive: '2h atras' },
  { id: '2', name: 'Maria Santos', email: 'maria@email.com', visits: 38, status: 'active', lastActive: '1h atras' },
  { id: '3', name: 'Pedro Costa', email: 'pedro@email.com', visits: 52, status: 'active', lastActive: '30min' },
  { id: '4', name: 'Ana Lima', email: 'ana@email.com', visits: 29, status: 'inactive', lastActive: '3d atras' },
  { id: '5', name: 'Carlos Souza', email: 'carlos@email.com', visits: 41, status: 'active', lastActive: '5h atras' },
];

export default function InstrutoresScreen() {
  const [search, setSearch] = useState('');
  const headerProgress = useSharedValue(0);

  useEffect(() => {
    headerProgress.value = withSpring(1, { damping: 15, stiffness: 80 });
  }, [headerProgress]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [{ translateY: (1 - headerProgress.value) * -30 }],
  }));

  const filteredInstructors = INSTRUCTORS.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase())
  );

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
          <Text style={styles.title}>Instrutores</Text>
          <Text style={styles.subtitle}>Gerencie sua equipe de campo</Text>
        </Animated.View>

        <View style={styles.searchBox}>
          <FontAwesome6 name="magnifying-glass" size={16} color={THEME.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar instrutor..."
            placeholderTextColor={THEME.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{INSTRUCTORS.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: THEME.leafLight }]}>{INSTRUCTORS.filter((i) => i.status === 'active').length}</Text>
            <Text style={styles.summaryLabel}>Ativos</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: THEME.gold }]}>{INSTRUCTORS.filter((i) => i.status === 'inactive').length}</Text>
            <Text style={styles.summaryLabel}>Inativos</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn}>
          <FontAwesome6 name="user-plus" size={16} color={THEME.white} />
          <Text style={styles.addBtnText}>Adicionar Instrutor</Text>
        </TouchableOpacity>

        {filteredInstructors.map((instructor) => (
          <TouchableOpacity key={instructor.id} style={styles.instructorCard}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{instructor.name.split(' ').map((n) => n[0]).join('')}</Text>
            </View>
            <View style={styles.instructorInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.instructorName}>{instructor.name}</Text>
                <View style={[styles.statusDot, instructor.status === 'active' ? styles.statusActive : styles.statusInactive]} />
              </View>
              <Text style={styles.instructorEmail}>{instructor.email}</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <FontAwesome6 name="calendar-check" size={10} color={THEME.leafLight} />
                  <Text style={styles.statText}>{instructor.visits} visitas</Text>
                </View>
                <View style={styles.stat}>
                  <FontAwesome6 name="clock" size={10} color={THEME.textMuted} />
                  <Text style={styles.statText}>{instructor.lastActive}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.moreBtn}>
              <FontAwesome6 name="ellipsis-vertical" size={16} color={THEME.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

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
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.cardBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)', gap: 12 },
  searchInput: { flex: 1, fontSize: 15, color: THEME.white },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: THEME.cardBg, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(77,200,90,0.12)' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: THEME.white, marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: THEME.textMuted },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.leafMid, borderRadius: 14, paddingVertical: 14, gap: 10, marginBottom: 20 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: THEME.white },
  instructorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.cardBg, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(77,200,90,0.12)', gap: 14 },
  avatarBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(77,200,90,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: THEME.leafLight },
  instructorInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  instructorName: { fontSize: 15, fontWeight: '700', color: THEME.white },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusActive: { backgroundColor: THEME.leafLight },
  statusInactive: { backgroundColor: THEME.gold },
  instructorEmail: { fontSize: 12, color: THEME.textMuted, marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 11, color: THEME.offWhite },
  moreBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
});
