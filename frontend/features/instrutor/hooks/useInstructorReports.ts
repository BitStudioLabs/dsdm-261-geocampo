import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { fetchInstructorReports } from '@/features/instrutor/api/reports';
import type { HistoryItem, Periodo } from '@/features/instrutor/types/reports';
import { buildVisitsLabel } from '@/features/instrutor/utils/reportFormatting';
import { useAuth } from '@/contexts/AuthContext';

export function useInstructorReports() {
  const { profile, user } = useAuth();
  const [periodoAtivo, setPeriodoAtivo] = useState<Periodo>('Mês');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const hasFocusedOnceRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function loadRelatorios() {
      const currentUserId = profile?.id ?? user?.id;

      if (!currentUserId) {
        if (mounted) {
          setHistory([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage('');
        const result = await fetchInstructorReports({ currentUserId, periodoAtivo });

        if (mounted) {
          setHistory(result.history);
        }
      } catch (error) {
        console.error('Erro ao carregar relatórios do instrutor:', error);
        if (mounted) {
          setErrorMessage('Não foi possível carregar os relatórios agora.');
          setHistory([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadRelatorios();

    return () => {
      mounted = false;
    };
  }, [periodoAtivo, profile?.id, reloadToken, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      setReloadToken((current) => current + 1);
    }, [])
  );

  const visitsLabel = useMemo(() => buildVisitsLabel(periodoAtivo), [periodoAtivo]);

  return {
    errorMessage,
    history,
    isLoading,
    periodoAtivo,
    setPeriodoAtivo,
    visitsLabel,
  };
}
