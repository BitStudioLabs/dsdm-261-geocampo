import { supabase } from '@/src/lib/supabase';
import type { HistoryItem, ReportPropertyLookup, ReportVisitRow } from '@/features/instrutor/types/reports';
import type { Periodo } from '@/features/instrutor/types/reports';
import { formatDateTime, getPeriodStart, getVisitIcon, getVisitStatusLabel } from '@/features/instrutor/utils/reportFormatting';

export async function fetchInstructorReports(params: { currentUserId: string; periodoAtivo: Periodo }) {
  const { currentUserId, periodoAtivo } = params;
  const start = getPeriodStart(periodoAtivo);

  const { data: visitsData, error: visitsError } = await supabase
    .from('visitas')
    .select('id, criado_em, id_propriedade, status_visita')
    .eq('id_instrutor', currentUserId)
    .gte('criado_em', start.toISOString())
    .order('criado_em', { ascending: false });

  if (visitsError) {
    throw visitsError;
  }

  const visits = (visitsData ?? []) as ReportVisitRow[];
  const propertyIds = Array.from(
    new Set(visits.map((item) => item.id_propriedade).filter((value): value is number => typeof value === 'number'))
  );

  let propertyLookup: ReportPropertyLookup = {};

  if (propertyIds.length > 0) {
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('propriedades')
      .select('id, nome')
      .in('id', propertyIds);

    if (propertiesError) {
      throw propertiesError;
    }

    propertyLookup = (propertiesData ?? []).reduce<ReportPropertyLookup>((acc, property) => {
      acc[property.id] = property;
      return acc;
    }, {});
  }

  const history: HistoryItem[] = visits.map((visit, index) => ({
    id: String(visit.id),
    title: (visit.id_propriedade ? propertyLookup[visit.id_propriedade]?.nome : null) ?? `Visita ${index + 1}`,
    date: formatDateTime(visit.criado_em),
    icon: getVisitIcon(visit.status_visita),
    status: getVisitStatusLabel(visit.status_visita),
  }));

  return { history };
}
