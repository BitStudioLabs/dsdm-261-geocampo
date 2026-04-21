import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/src/lib/supabase';
import type {
  AtribuicaoDashboardRow,
  DashboardItem,
  DashboardPropertyLookup,
  DashboardStats,
  VisitaDashboardRow,
} from '@/features/instrutor/types/dashboard';
import { buildAssignmentItem, buildVisitItem, hasPendingAssignment } from '@/features/instrutor/utils/dashboardFormatting';

type DashboardCachePayload = {
  assignedItems: DashboardItem[];
  completedItems: DashboardItem[];
  stats: DashboardStats;
  cachedAt: string;
};

const DASHBOARD_CACHE_PREFIX = 'instrutor-dashboard-cache:';

function getDashboardCacheKey(userId: string) {
  return `${DASHBOARD_CACHE_PREFIX}${userId}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Erro desconhecido.';
}

function isOfflineLikeError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('network request failed') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('timed out') ||
    message.includes('timeout')
  );
}

async function readDashboardCache(userId: string) {
  const raw = await AsyncStorage.getItem(getDashboardCacheKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DashboardCachePayload;
  } catch {
    return null;
  }
}

async function persistDashboardCache(userId: string, payload: DashboardCachePayload) {
  await AsyncStorage.setItem(getDashboardCacheKey(userId), JSON.stringify(payload));
}

export async function fetchInstructorDashboardData(currentUserId: string): Promise<{
  assignedItems: DashboardItem[];
  completedItems: DashboardItem[];
  stats: DashboardStats;
  isOfflineMode: boolean;
}> {
  const cachedDashboard = await readDashboardCache(currentUserId);

  try {
    const [atribuicoesRes, visitasRes] = await Promise.all([
      supabase
        .from('atribuicoes')
        .select('id, id_propriedade, ativa, atualizado_em, criado_em')
        .eq('id_instrutor', currentUserId)
        .eq('ativa', true)
        .order('atualizado_em', { ascending: false }),
      supabase
        .from('visitas')
        .select('id, id_propriedade, criado_em, status_visita')
        .eq('id_instrutor', currentUserId)
        .order('criado_em', { ascending: false })
        .limit(50),
    ]);

    if (atribuicoesRes.error) throw atribuicoesRes.error;
    if (visitasRes.error) throw visitasRes.error;

    const atribuicoes = (atribuicoesRes.data ?? []) as AtribuicaoDashboardRow[];
    const visitas = (visitasRes.data ?? []) as VisitaDashboardRow[];

    const latestVisitByProperty = visitas.reduce<Record<number, VisitaDashboardRow>>((acc, visit) => {
      if (visit.id_propriedade == null) return acc;
      if (!acc[visit.id_propriedade]) acc[visit.id_propriedade] = visit;
      return acc;
    }, {});

    const propertyIds = Array.from(
      new Set(
        [...atribuicoes.map((item) => item.id_propriedade), ...visitas.map((item) => item.id_propriedade)].filter(
          (value): value is number => typeof value === 'number'
        )
      )
    );

    let propertyLookup: DashboardPropertyLookup = {};

    if (propertyIds.length > 0) {
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('propriedades')
        .select('id, nome, municipio_nome, uf')
        .in('id', propertyIds);

      if (propertiesError) throw propertiesError;

      propertyLookup = (propertiesData ?? []).reduce<DashboardPropertyLookup>((acc, property) => {
        acc[property.id] = property;
        return acc;
      }, {});
    }

    const assignedItems = atribuicoes
      .filter((item) => hasPendingAssignment(item, latestVisitByProperty[item.id_propriedade] ?? null))
      .map((item, index) => buildAssignmentItem(item, propertyLookup, index, null));

    const completedItems = Object.values(latestVisitByProperty).map((item, index) =>
      buildVisitItem(item, propertyLookup, index)
    );

    const hojeCount = assignedItems.filter((item) => item.status === 'Hoje' || item.status === 'Em andamento').length;

    const response = {
      assignedItems,
      completedItems,
      stats: {
        atribuidas: String(assignedItems.length),
        hoje: String(hojeCount),
        concluidas: String(completedItems.length),
      },
      isOfflineMode: false,
    };

    await persistDashboardCache(currentUserId, {
      assignedItems: response.assignedItems,
      completedItems: response.completedItems,
      stats: response.stats,
      cachedAt: new Date().toISOString(),
    });

    return response;
  } catch (error) {
    if (cachedDashboard && isOfflineLikeError(error)) {
      return {
        assignedItems: cachedDashboard.assignedItems,
        completedItems: cachedDashboard.completedItems,
        stats: cachedDashboard.stats,
        isOfflineMode: true,
      };
    }

    throw error;
  }
}

export async function resolveInstructorAvatarUrl(params: {
  avatarStoragePath: string | null;
  profilePhotoUrl?: string | null;
}) {
  const { avatarStoragePath, profilePhotoUrl } = params;
  const sourcePath = profilePhotoUrl ? profilePhotoUrl : avatarStoragePath;

  if (!sourcePath) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage.from('avatares').createSignedUrl(sourcePath, 3600);

    if (!error && data?.signedUrl) {
      return `${data.signedUrl}${data.signedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    }
  } catch (error) {
    console.error('Erro ao resolver avatar do dashboard:', error);
  }

  const fallbackUrl =
    profilePhotoUrl && profilePhotoUrl.startsWith('http')
      ? profilePhotoUrl
      : supabase.storage.from('avatares').getPublicUrl(sourcePath).data.publicUrl;

  return `${fallbackUrl}${fallbackUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
}
