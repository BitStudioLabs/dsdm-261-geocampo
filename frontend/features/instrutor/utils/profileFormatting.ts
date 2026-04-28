import { colors } from '@/src/theme/colors';
import type { ProfilePreferenceItem, ProfileStats, ProfileSummaryCard } from '@/features/instrutor/types/profile';

const PREFERENCIAS_BASE = [
  {
    id: '1',
    title: 'Região de atuação',
    icon: 'navigate-circle-outline',
  },
  {
    id: '2',
    title: 'Notificações',
    icon: 'notifications-outline',
  },
  {
    id: '3',
    title: 'Sincronização offline',
    icon: 'cloud-done-outline',
  },
  {
    id: '4',
    title: 'Segurança da conta',
    icon: 'shield-checkmark-outline',
  },
] as const;

export function buildDisplayName(params: {
  profileName?: string | null;
  userMetadataName?: string | null;
  userMetadataAltName?: string | null;
  email?: string | null;
}) {
  return params.profileName ?? params.userMetadataName ?? params.userMetadataAltName ?? params.email ?? 'Usuário';
}

export function buildRegionLabel(params: { regionalNome?: string | null; regionalUf?: string | null }) {
  if (!params.regionalNome) {
    return 'Regional não vinculada';
  }

  return `${params.regionalNome}${params.regionalUf ? ` - ${params.regionalUf}` : ''}`;
}

export function buildSummaryCards(isLoading: boolean, stats: ProfileStats, primaryColor: string, yellowColor: string) {
  const cards: ProfileSummaryCard[] = [
    {
      id: '1',
      label: 'Visitas no mês',
      value: isLoading ? '...' : String(stats.visitasMes),
      icon: 'clipboard-outline',
      color: yellowColor,
    },
    {
      id: '2',
      label: 'Atribuídas',
      value: isLoading ? '...' : String(stats.atribuidas),
      icon: 'business-outline',
      color: colors.info,
    },
    {
      id: '3',
      label: 'Concluídas',
      value: isLoading ? '...' : String(stats.concluidas),
      icon: 'checkmark-done-outline',
      color: primaryColor,
    },
  ];

  return cards;
}

export function buildPreferencesCopy(params: { regionLabel: string; ativo?: boolean | null }): ProfilePreferenceItem[] {
  return [
    {
      ...PREFERENCIAS_BASE[0],
      subtitle: params.regionLabel,
    },
    {
      ...PREFERENCIAS_BASE[1],
      subtitle: 'Alertas de visitas e resultado das análises',
    },
    {
      ...PREFERENCIAS_BASE[2],
      subtitle: 'Sincronização local habilitada para este dispositivo',
    },
    {
      ...PREFERENCIAS_BASE[3],
      subtitle: params.ativo ? 'Conta ativa e autenticada no sistema' : 'Conta com acesso pendente',
    },
  ];
}
