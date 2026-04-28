import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

import type { DashboardAlert, DashboardStats, FraudeAlertRow } from '../types';

const INITIAL_STATS: DashboardStats = {
  visitasMes: 0,
  instrutores: 0,
  propriedades: 0,
  alertas: 0,
  unreadNotifications: 0,
};

export function useGestorDashboard(userId?: string | null) {
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        supabase.from('notificacoes').select('*', { count: 'exact', head: true }).eq('id_usuario', userId ?? '').eq('lida', false),
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
          label:
            alert.classificacao === 'alto_risco_vpn'
              ? 'Alto risco'
              : alert.classificacao === 'suspeita'
                ? 'Suspeita'
                : 'Informativo',
          message: `${alert.propriedade_nome ?? 'Propriedade sem nome'} - ${alert.instrutor_nome ?? 'Instrutor não informado'}`,
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
        setStats(INITIAL_STATS);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { stats, alerts, isLoading };
}
