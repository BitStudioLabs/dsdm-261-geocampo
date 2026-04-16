import type { Periodo } from '@/features/instrutor/types/reports';
import type { VisitStatusDb } from '@/features/instrutor/types/visitas';

export function getPeriodStart(periodo: Periodo) {
  const now = new Date();

  if (periodo === '7 dias') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (periodo === 'Mês') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(now.getFullYear(), 0, 1);
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '--/--/---- - --:--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--/--/---- - --:--';
  }

  return parsed.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function getVisitIcon(status?: VisitStatusDb) {
  if (status === 'pendente' || status === 'em_andamento') {
    return 'paper-plane-outline' as const;
  }

  return 'checkmark-done-outline' as const;
}

export function getVisitStatusLabel(status?: VisitStatusDb) {
  if (status === 'pendente' || status === 'em_andamento') {
    return 'Enviada';
  }

  return 'Concluída';
}

export function buildVisitsLabel(periodoAtivo: Periodo) {
  if (periodoAtivo === '7 dias') {
    return 'Visitas em 7 dias';
  }

  if (periodoAtivo === 'Mês') {
    return 'Visitas no mês';
  }

  return 'Visitas no ano';
}

export function buildPeriodSummaryLabel(periodoAtivo: Periodo) {
  return periodoAtivo === 'Mês' ? 'mês' : periodoAtivo.toLowerCase();
}

export function buildSectionPeriodLabel(periodoAtivo: Periodo) {
  return periodoAtivo === 'Mês' ? 'MÊS' : periodoAtivo.toUpperCase();
}
