import { useEffect, useMemo } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { GestorAlertsSection } from '@/features/gestor-dashboard/components/GestorAlertsSection';
import { GestorDashboardBackground } from '@/features/gestor-dashboard/components/GestorDashboardBackground';
import { GestorDashboardHeader } from '@/features/gestor-dashboard/components/GestorDashboardHeader';
import { GestorQuickActionsSection } from '@/features/gestor-dashboard/components/GestorQuickActionsSection';
import { GestorStatsSection } from '@/features/gestor-dashboard/components/GestorStatsSection';
import { useGestorDashboard } from '@/features/gestor-dashboard/hooks/useGestorDashboard';
import { styles } from '@/features/gestor-dashboard/styles';

export default function GestorDashboardScreen() {
  const { profile, user } = useAuth();
  const { width, height } = useWindowDimensions();
  const headerProgress = useSharedValue(0);
  const userId = profile?.id ?? user?.id ?? null;
  const { stats, alerts, isLoading } = useGestorDashboard(userId);

  useEffect(() => {
    headerProgress.value = withSpring(1, { damping: 15, stiffness: 80 });
  }, [headerProgress]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerProgress.value,
    transform: [{ translateY: (1 - headerProgress.value) * -30 }],
  }));

  const displayName = useMemo(
    () => profile?.nomeCompleto ?? user?.user_metadata?.nome_completo ?? user?.email ?? 'Gestor Institucional',
    [profile?.nomeCompleto, user?.email, user?.user_metadata]
  );

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }).format(new Date()),
    []
  );

  const regionalLabel = useMemo(() => {
    if (!profile?.regionalNome) {
      return 'Regional não vinculada';
    }

    return `${profile.regionalNome}${profile.regionalUf ? ` - ${profile.regionalUf}` : ''}`;
  }, [profile?.regionalNome, profile?.regionalUf]);

  const operationalSummary = useMemo(() => {
    if (isLoading) {
      return 'Carregando visão operacional...';
    }

    if (stats.alertas > 0) {
      return `${stats.alertas} alerta${stats.alertas === 1 ? '' : 's'} exigem atenção hoje.`;
    }

    if (stats.unreadNotifications > 0) {
      return `${stats.unreadNotifications} notificação${stats.unreadNotifications === 1 ? '' : 'ões'} aguardam leitura.`;
    }

    return 'Operação estável no momento.';
  }, [isLoading, stats.alertas, stats.unreadNotifications]);

  const stars = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => ({
        id: index,
        x: Math.random() * width,
        y: Math.random() * (height * 0.25),
        size: Math.random() * 2 + 0.8,
        delay: Math.random() * 2000,
      })),
    [height, width]
  );

  const isWideLayout = width >= 1100;
  const alertCardWidth = useMemo(() => {
    if (width >= 1180) {
      return (width - 52) / 2;
    }

    return width - 40;
  }, [width]);

  return (
    <View style={styles.root}>
      <GestorDashboardBackground height={height} stars={stars} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GestorDashboardHeader
          animatedStyle={headerStyle}
          displayName={displayName}
          formattedDate={formattedDate}
          regionalLabel={regionalLabel}
          operationalSummary={operationalSummary}
          unreadNotifications={stats.unreadNotifications}
        />
        <GestorStatsSection stats={stats} isLoading={isLoading} isWideLayout={isWideLayout} />
        <GestorAlertsSection alerts={alerts} alertCardWidth={alertCardWidth} isLoading={isLoading} />
        <GestorQuickActionsSection />
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
