import type { VisitHistoryItem, VisitStatusDb } from '@/features/instrutor/types/visitas';

export function mapVisitStatusToHistoryLabel(status?: VisitStatusDb): VisitHistoryItem['status'] {
  if (status === 'pendente' || status === 'em_andamento') {
    return 'Enviada';
  }

  return 'Concluída';
}
