import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { supabase } from '@/src/lib/supabase';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const THEME = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
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

const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * (SCREEN_H * 0.25),
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

type DashboardStats = {
  visitasMes: number;
  instrutores: number;
  propriedades: number;
  alertas: number;
  unreadNotifications: number;
};

type DashboardAlert = {
  id: string;
  type: 'warning' | 'info' | 'error';
  message: string;
  time: string;
};

type FraudeAlertRow = {
  alerta_id: number;
  analisado_em: string;
  classificacao: 'suspeita' | 'alto_risco_vpn' | 'valida';
  propriedade_nome: string | null;
  instrutor_nome: string | null;
};

export default function GestorDashboardScreen() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    visitasMes: 0,
    instrutores: 0,
    propriedades: 0,
    alertas: 0,
    unreadNotifications: 0,
  });
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const headerProgress = useSharedValue(0);

  useEffect(() => {
    headerProgress.value = withSpring(1, { damping: 15, stiffness: 80 });
  }, [headerProgress]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [visitasRes, instrutoresRes, propriedadesRes, alertasRes, alertasCountRes, notificacoesRes] = await Promise.all([
        supabase.from('visitas').select('*', { count: 'exact', head: true }).gte('criado_em', startOfMonth.toISOString()),
        supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('perfil', 'instrutor').eq('ativo', true),
        supabase.from('propriedades').select('*', { count: 'exact', head: true }),
        supabase
          .from('vw_alertas_fraude')
          .select('alerta_id, analisado_em, classificacao, propriedade_nome, instrutor_nome')
          .order('analisado_em', { ascending: false })
          .limit(3),
        supabase
          .from('analises_antifraude')
          .select('*', { count: 'exact', head: true })
          .in('classificacao', ['suspeita', 'alto_risco_vpn']),
        supabase.from('notificacoes').select('*', { count: 'exact', head: true }).eq('id_usuario', profile?.id ?? user?.id ?? '').eq('lida', false),
      ]);

      if (!isMounted) {
        return;
      }

      const mappedAlerts: DashboardAlert[] =
        ((alertasRes.data ?? []) as FraudeAlertRow[]).map((alert) => ({
          id: String(alert.alerta_id),
          type:
            alert.classificacao === 'alto_risco_vpn'
              ? 'error'
              : alert.classificacao === 'suspeita'
                ? 'warning'
                : 'info',
          message: `${alert.propriedade_nome ?? 'Propriedade sem nome'} - ${alert.instrutor_nome ?? 'Instrutor nao informado'}`,
          time: new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          }).format(new Date(alert.analisado_em)),
        })) ?? [];

      setStats({
        visitasMes: visitasRes.count ?? 0,
        instrutores: instrutoresRes.count ?? 0,
        propriedades: propriedadesRes.count ?? 0,
        alertas: alertasCountRes.count ?? 0,
        unreadNotifications: notificacoesRes.count ?? 0,
      });
      setAlerts(mappedAlerts);
      setIsLoading(false);
    }

    loadDashboard().catch((error) => {
      console.error('Erro ao carregar painel do gestor:', error);
      if (isMounted) {
        setAlerts([]);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [profile?.id, user?.id]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [{ translateY: (1 - headerProgress.value) * -30 }],
  }));

  const displayName = useMemo(
    () => profile?.nomeCompleto ?? user?.user_metadata?.nome_completo ?? user?.email ?? 'Gestor Institucional',
    [profile?.nomeCompleto, user?.email, user?.user_metadata]
  );

  return (
    <View style={styles.root}>
      <View style={styles.skyBg}>
        {STARS.map((star) => <Star key={star.id} x={star.x} y={star.y} size={star.size} delay={star.delay} />)}
        <View style={styles.moon}>
          <View style={styles.moonInner}>
            <View style={[styles.crater, { width: 8, height: 8, top: 10, left: 12 }]} />
            <View style={[styles.crater, { width: 5, height: 5, top: 22, left: 28 }]} />
            <View style={[styles.crater, { width: 6, height: 6, top: 30, left: 14 }]} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, headerStyle]}>
          <View style={styles.welcomeBox}>
            <Text style={styles.welcomeText}>Painel de Gestao</Text>
            <Text style={styles.userName}>{displayName}</Text>
            <View style={styles.roleBadge}>
              <FontAwesome6 name="chart-line" size={10} color={THEME.blue} />
              <Text style={styles.roleText}>Gestor Institucional</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <FontAwesome6 name="bell" size={18} color={THEME.white} />
            {stats.unreadNotifications > 0 ? <View style={styles.notifDot} /> : null}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardLarge]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(77,200,90,0.2)' }]}>
                <FontAwesome6 name="calendar-check" size={20} color={THEME.leafLight} />
              </View>
              <View style={styles.statTrend}>
                <FontAwesome6 name="database" size={10} color={THEME.leafLight} />
                <Text style={styles.trendText}>Dados reais</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{isLoading ? '...' : stats.visitasMes}</Text>
            <Text style={styles.statLabel}>Visitas Este Mes</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(91,156,255,0.2)' }]}>
                <FontAwesome6 name="users" size={16} color={THEME.blue} />
              </View>
            </View>
            <Text style={styles.statValue}>{isLoading ? '...' : stats.instrutores}</Text>
            <Text style={styles.statLabel}>Instrutores</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(245,200,66,0.2)' }]}>
                <FontAwesome6 name="house-chimney" size={16} color={THEME.gold} />
              </View>
            </View>
            <Text style={styles.statValue}>{isLoading ? '...' : stats.propriedades}</Text>
            <Text style={styles.statLabel}>Propriedades</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWide]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(255,107,107,0.2)' }]}>
                <FontAwesome6 name="triangle-exclamation" size={16} color={THEME.error} />
              </View>
            </View>
            <Text style={styles.statValue}>{isLoading ? '...' : stats.alertas}</Text>
            <Text style={styles.statLabel}>Alertas</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alertas Recentes</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {alerts.length === 0 && !isLoading ? (
            <View style={styles.emptyState}>
              <FontAwesome6 name="circle-check" size={18} color={THEME.leafLight} />
              <Text style={styles.emptyText}>Nenhum alerta recente encontrado.</Text>
            </View>
          ) : null}

          {alerts.map((alert) => (
            <TouchableOpacity key={alert.id} style={styles.alertCard}>
              <View style={[
                styles.alertIconBox,
                alert.type === 'error' && { backgroundColor: 'rgba(255,107,107,0.2)' },
                alert.type === 'warning' && { backgroundColor: 'rgba(245,200,66,0.2)' },
                alert.type === 'info' && { backgroundColor: 'rgba(91,156,255,0.2)' },
              ]}>
                <FontAwesome6
                  name={alert.type === 'error' ? 'circle-xmark' : alert.type === 'warning' ? 'triangle-exclamation' : 'circle-info'}
                  size={14}
                  color={alert.type === 'error' ? THEME.error : alert.type === 'warning' ? THEME.gold : THEME.blue}
                />
              </View>
              <View style={styles.alertInfo}>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={12} color={THEME.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Acoes Rapidas</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(77,200,90,0.2)' }]}>
                <FontAwesome6 name="file-export" size={18} color={THEME.leafLight} />
              </View>
              <Text style={styles.actionText}>Exportar Relatorio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs-gestor)/cadastro-usuario' as any)}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(91,156,255,0.2)' }]}>
                <FontAwesome6 name="user-plus" size={18} color={THEME.blue} />
              </View>
              <Text style={styles.actionText}>Novo Instrutor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs-gestor)/cadastro-propriedade' as any)}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(245,200,66,0.2)' }]}>
                <FontAwesome6 name="house-chimney" size={18} color={THEME.gold} />
              </View>
              <Text style={styles.actionText}>Nova Propriedade</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.skyTop },
  skyBg: { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_H * 0.35, backgroundColor: THEME.skyTop },
  moon: { position: 'absolute', top: 45, right: 30, width: 42, height: 42, borderRadius: 21, backgroundColor: '#fffbe0', shadowColor: '#fffbe0', shadowOpacity: 0.8, shadowRadius: 20, elevation: 8 },
  moonInner: { width: '100%', height: '100%', borderRadius: 21, overflow: 'hidden' },
  crater: { position: 'absolute', backgroundColor: 'rgba(200,190,150,0.4)', borderRadius: 50 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  welcomeBox: {},
  welcomeText: { fontSize: 14, color: THEME.textMuted, marginBottom: 4 },
  userName: { fontSize: 26, fontWeight: '700', color: THEME.white, marginBottom: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(91,156,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  roleText: { fontSize: 11, color: THEME.blue, fontWeight: '600' },
  notifBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.error },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28, alignItems: 'stretch' },
  statCard: {
    width: (SCREEN_W - 52) / 2,
    minHeight: 160,
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(77,200,90,0.12)',
    justifyContent: 'space-between',
  },
  statCardLarge: {
    width: '100%',
    minHeight: 172,
    paddingVertical: 20,
  },
  statCardWide: {
    width: '100%',
    minHeight: 136,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  statIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 32, fontWeight: '700', color: THEME.white, marginBottom: 8, lineHeight: 36 },
  statLabel: {
    fontSize: 13,
    color: THEME.offWhite,
    lineHeight: 18,
    fontWeight: '600',
    maxWidth: '90%',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(77,200,90,0.12)',
  },
  trendText: { fontSize: 12, color: THEME.leafLight, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: THEME.white },
  seeAll: { fontSize: 13, color: THEME.link, fontWeight: '600' },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.cardBg, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(77,200,90,0.1)', gap: 12 },
  alertIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertInfo: { flex: 1 },
  alertMessage: { fontSize: 13, fontWeight: '500', color: THEME.offWhite, marginBottom: 4 },
  alertTime: { fontSize: 11, color: THEME.textMuted },
  emptyState: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(77,200,90,0.12)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(77,200,90,0.18)' },
  emptyText: { color: THEME.offWhite, fontSize: 13, flex: 1 },
  quickActions: { marginBottom: 20 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  actionCard: { flex: 1, backgroundColor: THEME.cardBg, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(77,200,90,0.12)' },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionText: { fontSize: 11, fontWeight: '600', color: THEME.offWhite, textAlign: 'center' },
});
