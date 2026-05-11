import { supabase } from '@/src/lib/supabase';

import { buildAuditCase, mapInstructorRisk } from './helpers';
import type { AuditCase, AuditSummary, FraudAlertRow, FraudAnalysisRow, InstructorScoreRow, VisitAuditDetailRow } from './types';

const ALERT_SELECT =
  'alerta_id, analisado_em, score_total, classificacao, vpn_detectada, distancia_calculada_metros, visita_id, codigo_rastreamento, dt_visita, status_visita, propriedade_id, propriedade_nome, municipio_nome, uf, instrutor_nome, instrutor_id, regional_nome, projeto_nome';

const ANALYSIS_SELECT =
  'id, id_visita, score_distancia, score_ip_regiao, score_deslocamento, score_vpn, score_exif_timestamp, distancia_calculada_metros, ip_acesso, ip_pais, ip_cidade, vpn_detectada, vpn_provedor, exif_consistente, detalhes';

const VISIT_SELECT =
  'id, dt_checkin, dt_checkout, tempo_visita_minutos, latitude_checkin, longitude_checkin, latitude_checkout, longitude_checkout, distancia_metros, tipo_visita, status_visita, observacoes, propriedades(latitude, longitude), produtores(nome)';

export async function fetchAuditCasesByAlerts(alertRows: FraudAlertRow[]) {
  const alertIds = alertRows.map((alert) => alert.alerta_id);
  const visitIds = alertRows.map((alert) => alert.visita_id);
  let analysesById = new Map<number, FraudAnalysisRow>();
  let visitDetailsById = new Map<number, VisitAuditDetailRow>();

  if (alertIds.length > 0) {
    const analysesRes = await supabase.from('analises_antifraude').select(ANALYSIS_SELECT).in('id', alertIds);

    if (analysesRes.error) throw analysesRes.error;

    analysesById = new Map(((analysesRes.data ?? []) as FraudAnalysisRow[]).map((analysis) => [analysis.id, analysis]));
  }

  if (visitIds.length > 0) {
    const visitsRes = await supabase.from('visitas').select(VISIT_SELECT).in('id', visitIds);

    if (visitsRes.error) throw visitsRes.error;

    visitDetailsById = new Map(((visitsRes.data ?? []) as VisitAuditDetailRow[]).map((visit) => [visit.id, visit]));
  }

  return alertRows.map((alert) => buildAuditCase(alert, analysesById.get(alert.alerta_id), visitDetailsById.get(alert.visita_id)));
}

export async function fetchInstructorAuditCases(instructorId: string) {
  const alertsRes = await supabase
    .from('vw_alertas_fraude')
    .select(ALERT_SELECT)
    .eq('instrutor_id', instructorId)
    .order('analisado_em', { ascending: false })
    .limit(50);

  if (alertsRes.error) throw alertsRes.error;

  return fetchAuditCasesByAlerts((alertsRes.data ?? []) as FraudAlertRow[]);
}

export async function fetchAuditDashboardData(): Promise<{
  auditCases: AuditCase[];
  instructorRisks: ReturnType<typeof mapInstructorRisk>[];
  auditSummary: AuditSummary;
}> {
  const [alertsRes, instructorsRes, validCountRes, suspiciousCountRes, highRiskCountRes] = await Promise.all([
    supabase.from('vw_alertas_fraude').select(ALERT_SELECT).order('analisado_em', { ascending: false }).limit(20),
    supabase
      .from('vw_score_instrutores')
      .select(
        'instrutor_id, instrutor_nome, regional_nome, total_visitas, visitas_analisadas, score_medio, visitas_validas, visitas_suspeitas, visitas_alto_risco'
      )
      .order('visitas_alto_risco', { ascending: false })
      .order('visitas_suspeitas', { ascending: false })
      .order('score_medio', { ascending: true, nullsFirst: false })
      .limit(50),
    supabase.from('analises_antifraude').select('*', { count: 'exact', head: true }).eq('classificacao', 'valida'),
    supabase.from('analises_antifraude').select('*', { count: 'exact', head: true }).eq('classificacao', 'suspeita'),
    supabase.from('analises_antifraude').select('*', { count: 'exact', head: true }).eq('classificacao', 'alto_risco_vpn'),
  ]);

  if (alertsRes.error) throw alertsRes.error;
  if (instructorsRes.error) throw instructorsRes.error;
  if (validCountRes.error) throw validCountRes.error;
  if (suspiciousCountRes.error) throw suspiciousCountRes.error;
  if (highRiskCountRes.error) throw highRiskCountRes.error;

  const mappedInstructors = ((instructorsRes.data ?? []) as InstructorScoreRow[])
    .map(mapInstructorRisk)
    .filter((instructor) => instructor.suspiciousVisits + instructor.highRiskVisits > 0);

  return {
    auditCases: await fetchAuditCasesByAlerts((alertsRes.data ?? []) as FraudAlertRow[]),
    instructorRisks: mappedInstructors,
    auditSummary: {
      highRisk: highRiskCountRes.count ?? 0,
      mediumRisk: suspiciousCountRes.count ?? 0,
      clean: validCountRes.count ?? 0,
    },
  };
}
