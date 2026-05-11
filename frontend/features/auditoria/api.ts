import { supabase } from '@/src/lib/supabase';

import { buildAuditCase, mapInstructorRisk, mapVisitPhoto } from './helpers';
import type {
  AuditCase,
  AuditSummary,
  FraudAlertRow,
  FraudAnalysisRow,
  InstructorScoreRow,
  VisitAuditDetailRow,
  VisitPhoto,
  VisitPhotoRow,
} from './types';

const ALERT_SELECT =
  'alerta_id, analisado_em, score_total, classificacao, vpn_detectada, distancia_calculada_metros, visita_id, codigo_rastreamento, dt_visita, status_visita, propriedade_id, propriedade_nome, municipio_nome, uf, instrutor_nome, instrutor_id, regional_nome, projeto_nome';

const ANALYSIS_SELECT =
  'id, id_visita, score_distancia, score_ip_regiao, score_deslocamento, score_vpn, score_exif_timestamp, distancia_calculada_metros, ip_acesso, ip_pais, ip_cidade, vpn_detectada, vpn_provedor, exif_consistente, detalhes';

const VISIT_SELECT =
  'id, dt_checkin, dt_checkout, tempo_visita_minutos, latitude_checkin, longitude_checkin, latitude_checkout, longitude_checkout, distancia_metros, tipo_visita, status_visita, observacoes, propriedades(latitude, longitude), produtores(nome)';

const PHOTO_SELECT =
  'id, id_visita, storage_path, url_publica, nome_arquivo, exif_tem_gps, exif_latitude, exif_longitude, distancia_propriedade_metros, enviada_em';

async function fetchPhotosByVisitIds(visitIds: number[]) {
  if (visitIds.length === 0) {
    return new Map<number, VisitPhoto[]>();
  }

  const photosRes = await supabase
    .from('fotos_visita')
    .select(PHOTO_SELECT)
    .in('id_visita', visitIds)
    .order('enviada_em', { ascending: true });

  if (photosRes.error) throw photosRes.error;

  const rows = (photosRes.data ?? []) as VisitPhotoRow[];
  const signedUrlEntries = await Promise.all(
    rows.map(async (row) => {
      if (row.url_publica || !row.storage_path) {
        return [row.id, null] as const;
      }

      const { data } = await supabase.storage.from('fotos-visitas').createSignedUrl(row.storage_path, 60 * 60);
      return [row.id, data?.signedUrl ?? null] as const;
    })
  );
  const signedUrlByPhotoId = new Map(signedUrlEntries);
  const photosByVisitId = new Map<number, VisitPhoto[]>();

  rows.forEach((row) => {
    const photo = mapVisitPhoto(row, signedUrlByPhotoId.get(row.id));
    const currentPhotos = photosByVisitId.get(row.id_visita) ?? [];
    currentPhotos.push(photo);
    photosByVisitId.set(row.id_visita, currentPhotos);
  });

  return photosByVisitId;
}

export async function fetchAuditCasesByAlerts(alertRows: FraudAlertRow[]) {
  const alertIds = alertRows.map((alert) => alert.alerta_id);
  const visitIds = alertRows.map((alert) => alert.visita_id);
  let analysesById = new Map<number, FraudAnalysisRow>();
  let visitDetailsById = new Map<number, VisitAuditDetailRow>();
  let photosByVisitId = new Map<number, VisitPhoto[]>();

  if (alertIds.length > 0) {
    const analysesRes = await supabase.from('analises_antifraude').select(ANALYSIS_SELECT).in('id', alertIds);

    if (analysesRes.error) throw analysesRes.error;

    analysesById = new Map(((analysesRes.data ?? []) as FraudAnalysisRow[]).map((analysis) => [analysis.id, analysis]));
  }

  if (visitIds.length > 0) {
    const visitsRes = await supabase.from('visitas').select(VISIT_SELECT).in('id', visitIds);

    if (visitsRes.error) throw visitsRes.error;

    visitDetailsById = new Map(((visitsRes.data ?? []) as VisitAuditDetailRow[]).map((visit) => [visit.id, visit]));
    photosByVisitId = await fetchPhotosByVisitIds(visitIds);
  }

  return alertRows.map((alert) => ({
    ...buildAuditCase(alert, analysesById.get(alert.alerta_id), visitDetailsById.get(alert.visita_id)),
    photos: photosByVisitId.get(alert.visita_id) ?? [],
  }));
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
