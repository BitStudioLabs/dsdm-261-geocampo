import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';

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

const MENU_ITEMS = [
  { id: 'dados', icon: 'user-pen', label: 'Dados Pessoais', desc: 'Atualize suas informacoes' },
  { id: 'notif', icon: 'bell', label: 'Notificacoes', desc: 'Configure seus alertas' },
  { id: 'seg', icon: 'shield-halved', label: 'Seguranca', desc: 'Senha e privacidade' },
  { id: 'ajuda', icon: 'circle-question', label: 'Ajuda', desc: 'Suporte e FAQ' },
  { id: 'sobre', icon: 'info-circle', label: 'Sobre', desc: 'Versao e termos' },
];

export default function PerfilProprietarioScreen() {
  const { logout } = useAuth();
  const headerProgress = useSharedValue(0);

  useEffect(() => {
    headerProgress.value = withSpring(1, { damping: 15, stiffness: 80 });
  }, [headerProgress]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [{ translateY: (1 - headerProgress.value) * -30 }],
  }));

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair do aplicativo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
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
          <View style={styles.avatarBox}>
            <FontAwesome6 name="user" size={32} color={THEME.leafLight} />
          </View>
          <Text style={styles.userName}>Maria Santos</Text>
          <Text style={styles.userEmail}>maria.santos@email.com</Text>
          <View style={styles.roleBadge}>
            <FontAwesome6 name="house-chimney" size={10} color={THEME.gold} />
            <Text style={styles.roleText}>Proprietario Rural</Text>
          </View>
        </Animated.View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity key={item.id} style={styles.menuItem}>
              <View style={styles.menuIconBox}>
                <FontAwesome6 name={item.icon as any} size={16} color={THEME.leafLight} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color={THEME.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <FontAwesome6 name="arrow-right-from-bracket" size={16} color={THEME.error} />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <Text style={styles.version}>GeoCampo v1.0.0</Text>

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
  header: { alignItems: 'center', marginBottom: 30 },
  avatarBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(77,200,90,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(77,200,90,0.3)' },
  userName: { fontSize: 24, fontWeight: '700', color: THEME.white, marginBottom: 4 },
  userEmail: { fontSize: 14, color: THEME.textMuted, marginBottom: 12 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,200,66,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 8 },
  roleText: { fontSize: 12, fontWeight: '600', color: THEME.gold },
  menuCard: { backgroundColor: THEME.cardBg, borderRadius: 20, padding: 8, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(77,200,90,0.15)' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(77,200,90,0.15)', alignItems: 'center', justifyContent: 'center' },
  menuTextBox: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: THEME.white, marginBottom: 2 },
  menuDesc: { fontSize: 12, color: THEME.textMuted },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,107,107,0.15)', borderRadius: 16, paddingVertical: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)' },
  logoutText: { fontSize: 15, fontWeight: '700', color: THEME.error },
  version: { textAlign: 'center', fontSize: 12, color: THEME.textMuted, marginTop: 20 },
});
