import { FontAwesome6 } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type AuditSeverity = 'critical' | 'warning' | 'success';
export type Classification = 'valida' | 'suspeita' | 'alto_risco_vpn';

export type AuditIndicator = {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: ComponentProps<typeof FontAwesome6>['name'];
  severity: AuditSeverity;
};

export type AuditCase = {
  id: string;
  visitId: number;
  technicianId: string | null;
  property: string;
  technician: string;
  visitDate: string;
  analyzedAt: string;
  trackingCode: string;
  project: string;
  status: string;
  type: string;
  producer: string;
  checkinAt: string;
  checkoutAt: string;
  durationMinutes: number | null;
  checkinCheckoutMeters: number | null;
  checkinPropertyMeters: number | null;
  checkinCoordinate: string;
  checkoutCoordinate: string;
  photoDistanceMeters: number;
  ipRegion: string;
  propertyRegion: string;
  displacement: string;
  vpnSignal: string;
  riskScore: number;
  classification: Classification;
  indicators: AuditIndicator[];
  photos: VisitPhoto[];
};

export type SameDayTravelCheck = {
  value: string;
  detail: string;
  severity: AuditSeverity;
};

export type VisitPhoto = {
  id: string;
  uri: string | null;
  fileName: string;
  sentAt: string;
  hasGps: boolean;
  distanceMeters: number | null;
  latitude: number | string | null;
  longitude: number | string | null;
};

export type VisitAuditDetailRow = {
  id: number;
  dt_checkin: string | null;
  dt_checkout: string | null;
  tempo_visita_minutos: number | null;
  latitude_checkin: number | string | null;
  longitude_checkin: number | string | null;
  latitude_checkout: number | string | null;
  longitude_checkout: number | string | null;
  distancia_metros: number | string | null;
  tipo_visita: string | null;
  status_visita: string | null;
  observacoes: string | null;
  propriedades:
    | {
        latitude: number | string | null;
        longitude: number | string | null;
      }
    | {
        latitude: number | string | null;
        longitude: number | string | null;
      }[]
    | null;
  produtores:
    | {
        nome: string | null;
      }
    | {
        nome: string | null;
      }[]
    | null;
};

export type VisitPhotoRow = {
  id: string;
  id_visita: number;
  storage_path: string;
  url_publica: string | null;
  nome_arquivo: string | null;
  exif_tem_gps: boolean | null;
  exif_latitude: number | string | null;
  exif_longitude: number | string | null;
  distancia_propriedade_metros: number | string | null;
  enviada_em: string | null;
};

export type SameDayVisitRow = {
  id: number;
  id_instrutor: string;
  dt_visita: string | null;
  dt_checkin: string | null;
  propriedades:
    | {
        nome: string | null;
        latitude: number | string | null;
        longitude: number | string | null;
      }
    | {
        nome: string | null;
        latitude: number | string | null;
        longitude: number | string | null;
      }[]
    | null;
};

export type VisitPhotoMetadataRow = {
  id_visita: number;
  foto_url: string | null;
  foto_path: string | null;
  file_name: string | null;
  has_gps: boolean | null;
  latitude: number | string | null;
  longitude: number | string | null;
  distancia_metros: number | string | null;
  capturado_em: string | null;
};

export type FraudAlertRow = {
  alerta_id: number;
  analisado_em: string | null;
  score_total: number | null;
  classificacao: Classification;
  vpn_detectada: boolean | null;
  distancia_calculada_metros: number | string | null;
  visita_id: number;
  codigo_rastreamento: string | null;
  dt_visita: string | null;
  status_visita: string | null;
  propriedade_id: number | null;
  propriedade_nome: string | null;
  municipio_nome: string | null;
  uf: string | null;
  instrutor_nome: string | null;
  instrutor_id: string | null;
  regional_nome: string | null;
  projeto_nome: string | null;
};

export type FraudAnalysisRow = {
  id: number;
  id_visita: number;
  score_distancia: number | null;
  score_ip_regiao: number | null;
  score_deslocamento: number | null;
  score_vpn: number | null;
  score_exif_timestamp: number | null;
  distancia_calculada_metros: number | string | null;
  ip_acesso: string | null;
  ip_pais: string | null;
  ip_cidade: string | null;
  vpn_detectada: boolean | null;
  vpn_provedor: string | null;
  exif_consistente: boolean | null;
  detalhes: Record<string, unknown> | null;
};

export type AuditSummary = {
  highRisk: number;
  mediumRisk: number;
  clean: number;
};

export type InstructorScoreRow = {
  instrutor_id: string;
  instrutor_nome: string | null;
  regional_nome: string | null;
  total_visitas: number | null;
  visitas_analisadas: number | null;
  score_medio: number | string | null;
  visitas_validas: number | null;
  visitas_suspeitas: number | null;
  visitas_alto_risco: number | null;
};

export type InstructorRisk = {
  id: string;
  name: string;
  regional: string;
  totalVisits: number;
  analyzedVisits: number;
  averageScore: number;
  validVisits: number;
  suspiciousVisits: number;
  highRiskVisits: number;
};
