import type {
  AtribuicaoDashboardRow,
  DashboardFilter,
  DashboardItem,
  DashboardPropertyLookup,
  DashboardStats,
  SectionCopy,
  StatusType,
  VisitaDashboardRow,
} from '@/features/instrutor/types/dashboard';

export function formatVisitDate(dateValue?: string | null) {
  if (!dateValue) return 'Sem data definida';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Sem data definida';

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay =
    parsed.getDate() === today.getDate() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getFullYear() === today.getFullYear();

  const isTomorrow =
    parsed.getDate() === tomorrow.getDate() &&
    parsed.getMonth() === tomorrow.getMonth() &&
    parsed.getFullYear() === tomorrow.getFullYear();

  const time = parsed.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSameDay) return `Hoje às ${time}`;
  if (isTomorrow) return `Amanhã às ${time}`;

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function mapVisitStatusToLabel(
  status?: VisitaDashboardRow['status_visita'],
  dateValue?: string | null,
  isCompleted?: boolean
): StatusType {
  if (
    status === 'pendente' ||
    status === 'em_andamento' ||
    status === 'finalizada' ||
    status === 'em_analise' ||
    status === 'aprovada' ||
    status === 'rejeitada' ||
    isCompleted
  ) {
    return 'Concluída';
  }

  if (!dateValue) return 'Agendada';

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Agendada';

  const now = new Date();
  const sameDay =
    parsed.getDate() === now.getDate() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getFullYear() === now.getFullYear();

  if (sameDay) {
    return parsed.getTime() <= now.getTime() ? 'Em andamento' : 'Hoje';
  }

  return 'Agendada';
}

export function toTimestamp(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
}

export function hasPendingAssignment(item: AtribuicaoDashboardRow, latestVisit?: VisitaDashboardRow | null) {
  if (!latestVisit) return true;

  const assignmentTimestamp = toTimestamp(item.atualizado_em ?? item.criado_em ?? null);
  const visitTimestamp = toTimestamp(latestVisit.criado_em ?? null);

  if (assignmentTimestamp == null || visitTimestamp == null) {
    return true;
  }

  return visitTimestamp < assignmentTimestamp;
}

export function getIconByIndex(index: number) {
  const options = [
    { icone: 'leaf-outline', iconeBg: '#DDF5E3' },
    { icone: 'paw-outline', iconeBg: '#EEF4DD' },
    { icone: 'nutrition-outline', iconeBg: '#F4EFD8' },
    { icone: 'flower-outline', iconeBg: '#E4F2E6' },
    { icone: 'home-outline', iconeBg: '#E9F0D7' },
    { icone: 'rose-outline', iconeBg: '#F0E7D7' },
  ] as const;

  return options[index % options.length];
}

export function buildAssignmentItem(
  item: AtribuicaoDashboardRow,
  propertyLookup: DashboardPropertyLookup,
  index: number,
  latestVisit?: VisitaDashboardRow | null
): DashboardItem {
  const iconData = getIconByIndex(index);
  const visitDate = latestVisit?.criado_em ?? item.atualizado_em ?? item.criado_em ?? null;
  const property = propertyLookup[item.id_propriedade] ?? null;

  return {
    id: `atr-${item.id}`,
    nome: property?.nome ?? 'Propriedade sem nome',
    local: [property?.municipio_nome, property?.uf].filter(Boolean).join(', ') || 'Localização não informada',
    distancia: latestVisit ? 'Nova visita pendente' : 'A conferir',
    status: mapVisitStatusToLabel(latestVisit?.status_visita, visitDate, false),
    visitaEm: formatVisitDate(visitDate),
    ...iconData,
  };
}

export function buildVisitItem(
  item: VisitaDashboardRow,
  propertyLookup: DashboardPropertyLookup,
  index: number
): DashboardItem {
  const iconData = getIconByIndex(index);
  const doneDate = item.criado_em ?? null;
  const property = item.id_propriedade ? propertyLookup[item.id_propriedade] ?? null : null;

  return {
    id: `vis-${item.id}`,
    nome: property?.nome ?? 'Propriedade sem nome',
    local: [property?.municipio_nome, property?.uf].filter(Boolean).join(', ') || 'Localização não informada',
    distancia: 'Visita realizada',
    status: mapVisitStatusToLabel(item.status_visita, doneDate, true),
    visitaEm: formatVisitDate(doneDate),
    ...iconData,
  };
}

export function getSectionCopy(activeFilter: DashboardFilter): SectionCopy {
  if (activeFilter === 'concluidas') {
    return {
      eyebrow: 'Histórico concluído',
      title: 'Visitas já realizadas por você',
      description: 'Use essa lista para revisar os registros finalizados e validar o histórico recente.',
    };
  }

  if (activeFilter === 'hoje') {
    return {
      eyebrow: 'Agenda do dia',
      title: 'Prioridades programadas para hoje',
      description: 'Aqui ficam apenas as propriedades que exigem ação imediata no seu turno.',
    };
  }

  return {
    eyebrow: 'Carteira ativa',
    title: 'Propriedades atribuídas ao seu usuário',
    description: 'Acompanhe tudo que ainda precisa ser visitado e organize sua próxima ida a campo.',
  };
}

export function buildActiveSummaryText(activeFilter: DashboardFilter, stats: DashboardStats) {
  if (activeFilter === 'concluidas') {
    return `${stats.concluidas} visita${stats.concluidas === '1' ? '' : 's'} concluída${stats.concluidas === '1' ? '' : 's'}`;
  }

  if (activeFilter === 'hoje') {
    return `${stats.hoje} prioridade${stats.hoje === '1' ? '' : 's'} para hoje`;
  }

  return `${stats.atribuidas} propriedade${stats.atribuidas === '1' ? '' : 's'} aguardando visita`;
}
