import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchProducerProperties } from '@/features/proprietario/api/proprietario';
import type { ProducerPropertyDetails } from '@/features/proprietario/types';

export function useProprietarioFazendas() {
  const { profile, refreshProfile, user } = useAuth();
  const userId = profile?.id ?? user?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [properties, setProperties] = useState<ProducerPropertyDetails[]>([]);

  const loadData = useCallback(async () => {
    if (!userId) {
      setProperties([]);
      return;
    }

    setProperties(await fetchProducerProperties(userId));
  }, [userId]);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      try {
        await loadData();
      } catch (error) {
        console.error('Erro ao carregar fazendas do proprietario:', error);
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

  const filteredProperties = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return properties;

    return properties.filter((item) =>
      [item.nome, item.municipio_nome, item.uf, item.bairro]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [properties, search]);

  return {
    filteredProperties,
    handleRefresh,
    loading,
    properties,
    refreshing,
    search,
    setSearch,
  };
}
