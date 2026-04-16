import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { fetchInstructorDashboardData, resolveInstructorAvatarUrl } from '@/features/instrutor/api/dashboard';
import type { DashboardFilter, DashboardItem, DashboardStats } from '@/features/instrutor/types/dashboard';
import { extractAvatarPath, getAvatarStorageKey } from '@/features/instrutor/utils/dashboardAvatar';
import { buildActiveSummaryText, getSectionCopy } from '@/features/instrutor/utils/dashboardFormatting';

export function useInstructorDashboard() {
  const { profile, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('atribuidas');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarStoragePath, setAvatarStoragePath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [assignedItems, setAssignedItems] = useState<DashboardItem[]>([]);
  const [completedItems, setCompletedItems] = useState<DashboardItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ atribuidas: '0', hoje: '0', concluidas: '0' });
  const hasFocusedOnceRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    const currentUserId = profile?.id ?? user?.id;

    if (!currentUserId) {
      setAssignedItems([]);
      setCompletedItems([]);
      setStats({ atribuidas: '0', hoje: '0', concluidas: '0' });
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    setErrorMessage('');
    const nextData = await fetchInstructorDashboardData(currentUserId);
    setAssignedItems(nextData.assignedItems);
    setCompletedItems(nextData.completedItems);
    setStats(nextData.stats);
  }, [profile?.id, user?.id]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setIsLoading(true);
      try {
        await loadDashboard();
      } catch (error) {
        console.error('Erro ao carregar painel do instrutor:', error);
        if (mounted) {
          setErrorMessage('Não foi possível carregar suas visitas agora.');
          setAssignedItems([]);
          setCompletedItems([]);
          setStats({ atribuidas: '0', hoje: '0', concluidas: '0' });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setRefreshing(false);
        }
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [loadDashboard, refreshing]);

  useEffect(() => {
    const currentUserId = profile?.id ?? user?.id;
    if (!currentUserId) return;

    const userId = currentUserId;
    let cancelled = false;

    async function hydrateAvatarPath() {
      try {
        const savedPath = await AsyncStorage.getItem(getAvatarStorageKey(userId));
        if (!cancelled && savedPath) {
          setAvatarStoragePath(savedPath);
        }
      } catch (error) {
        console.error('Erro ao restaurar avatar do dashboard:', error);
      }
    }

    hydrateAvatarPath();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      setRefreshing((current) => !current);
    }, [])
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveAvatar() {
      const sourcePath = profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : avatarStoragePath;
      if (!sourcePath) return;

      const nextAvatarUrl = await resolveInstructorAvatarUrl({
        avatarStoragePath: sourcePath,
        profilePhotoUrl: profile?.fotoUrl ?? null,
      });

      if (!cancelled) {
        setAvatarUrl(nextAvatarUrl);
      }
    }

    resolveAvatar();
    return () => {
      cancelled = true;
    };
  }, [avatarStoragePath, profile?.fotoUrl]);

  useEffect(() => {
    const currentUserId = profile?.id ?? user?.id;
    const sourcePath = profile?.fotoUrl ? extractAvatarPath(profile.fotoUrl) : avatarStoragePath;
    if (!currentUserId || !sourcePath) return;

    const userId = currentUserId;
    setAvatarStoragePath(sourcePath);
    AsyncStorage.setItem(getAvatarStorageKey(userId), sourcePath).catch((error) => {
      console.error('Erro ao persistir avatar do dashboard:', error);
    });
  }, [avatarStoragePath, profile?.fotoUrl, profile?.id, user?.id]);

  const displayName = useMemo(() => {
    const fullName = profile?.nomeCompleto ?? user?.user_metadata?.nome_completo ?? 'Instrutor';
    return fullName.trim();
  }, [profile?.nomeCompleto, user?.user_metadata]);

  const shortName = useMemo(() => displayName.split(' ').filter(Boolean)[0] ?? 'Instrutor', [displayName]);

  const filteredProperties = useMemo(() => {
    if (activeFilter === 'concluidas') return completedItems;
    if (activeFilter === 'hoje') {
      return assignedItems.filter((item) => item.status === 'Hoje' || item.status === 'Em andamento');
    }
    return assignedItems;
  }, [activeFilter, assignedItems, completedItems]);

  const sectionCopy = useMemo(() => getSectionCopy(activeFilter), [activeFilter]);
  const activeSummaryText = useMemo(() => buildActiveSummaryText(activeFilter, stats), [activeFilter, stats]);

  const statCards = useMemo(
    () =>
      [
        { id: 'atribuidas', label: 'Atribuídas', helper: 'Carteira ativa', value: stats.atribuidas, icon: 'layers-outline' as const },
        { id: 'hoje', label: 'Hoje', value: stats.hoje, icon: 'sunny-outline' as const },
        {
          id: 'concluidas',
          label: 'Concluídas',
          helper: 'Histórico recente',
          value: stats.concluidas,
          icon: 'checkmark-done-outline' as const,
        },
      ] as const,
    [stats]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  return {
    activeFilter,
    activeSummaryText,
    avatarUrl,
    errorMessage,
    filteredProperties,
    handleRefresh,
    isLoading,
    refreshing,
    sectionCopy,
    setActiveFilter,
    shortName,
    statCards,
    stats,
  };
}
