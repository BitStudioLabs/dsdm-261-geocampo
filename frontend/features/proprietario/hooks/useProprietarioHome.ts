import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchProducerDashboardData } from '@/features/proprietario/api/proprietario';
import type { ProducerDashboardState } from '@/features/proprietario/types';
import { buildDisplayName } from '@/features/proprietario/utils/formatting';

const EMPTY_STATE: ProducerDashboardState = {
  producer: null,
  properties: [],
  visitsCount: 0,
};

export function useProprietarioHome() {
  const { profile, refreshProfile, user } = useAuth();
  const userId = profile?.id ?? user?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<ProducerDashboardState>(EMPTY_STATE);

  const loadData = useCallback(async () => {
    if (!userId) {
      setState(EMPTY_STATE);
      return;
    }

    setState(await fetchProducerDashboardData(userId));
  }, [userId]);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      try {
        await loadData();
      } catch (error) {
        console.error('Erro ao carregar painel do proprietario:', error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshProfile(), loadData()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, refreshProfile]);

  const displayName = useMemo(
    () => buildDisplayName({ profileName: profile?.nomeCompleto, producerName: state.producer?.nome, email: user?.email }),
    [profile?.nomeCompleto, state.producer?.nome, user?.email]
  );

  const totalArea = useMemo(() => state.properties.reduce((sum, item) => sum + Number(item.area_total ?? 0), 0), [state.properties]);

  const highlightedProperty = useMemo(
    () => state.properties.find((item) => item.instrutores.length > 0) ?? state.properties[0] ?? null,
    [state.properties]
  );

  const activePropertiesCount = useMemo(
    () => state.properties.filter((item) => item.status_propriedade === 'ativo').length,
    [state.properties]
  );

  return {
    activePropertiesCount,
    displayName,
    handleRefresh,
    highlightedProperty,
    loading,
    refreshing,
    state,
    totalArea,
  };
}
