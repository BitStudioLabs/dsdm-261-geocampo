import { AUDITORIA_THEME as THEME } from './constants';
import type {
  AuditCase,
  AuditSeverity,
  FraudAlertRow,
  FraudAnalysisRow,
  InstructorRisk,
  InstructorScoreRow,
  SameDayTravelCheck,
  SameDayVisitRow,
  VisitAuditDetailRow,
  VisitPhoto,
  VisitPhotoMetadataRow,
  VisitPhotoRow,
} from './types';

export function getSeverityColor(severity: AuditSeverity) {
  if (severity === 'critical') return THEME.error;
  if (severity === 'warning') return THEME.gold;
  return THEME.leafLight;
}

export function getRiskLabel(score: number) {
  if (score < 60) return 'Alto risco';
  if (score < 80) return 'Suspeita';
  return 'Confiavel';
}

export function formatDistance(distanceMeters: number) {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return 'Sem dado';
  }

  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(2).replace('.', ',')} km`;
  }

  return `${distanceMeters} m`;
}

export function parseNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseOptionalNumber(value: number | string | null | undefined) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateDistanceInMeters(originLat: number, originLon: number, targetLat: number, targetLon: number) {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(targetLat - originLat);
  const deltaLon = toRadians(targetLon - originLon);
  const lat1 = toRadians(originLat);
  const lat2 = toRadians(targetLat);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadius * c);
}

function formatCoordinate(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) {
    return 'Coordenada não informada';
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Data não informada';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Data não informada';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function formatAuditDateTime(value?: string | null) {
  return formatDateTime(value);
}

function formatTime(value?: string | null) {
  if (!value) {
    return 'Não informado';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Não informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function formatShortTime(value?: string | null) {
  if (!value) {
    return 'sem horario';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'sem horario';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function scoreSeverity(score?: number | null): AuditSeverity {
  if (score == null) return 'warning';
  if (score < 60) return 'critical';
  if (score < 80) return 'warning';
  return 'success';
}

function scoreValue(score?: number | null) {
  return score == null ? 'Sem score' : `${score}/100`;
}

function getVisitTimestamp(row: SameDayVisitRow) {
  const value = row.dt_checkin ?? row.dt_visita;
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getVisitCoordinate(row: SameDayVisitRow) {
  const property = getSingleRelation(row.propriedades);
  const latitude = parseOptionalNumber(property?.latitude);
  const longitude = parseOptionalNumber(property?.longitude);

  if (latitude == null || longitude == null) {
    return null;
  }

  return {
    latitude,
    longitude,
    name: property?.nome ?? `Visita #${row.id}`,
  };
}

export function evaluateSameDayTravel(currentVisitId: number, sameDayVisits: SameDayVisitRow[]): SameDayTravelCheck {
  const orderedVisits = sameDayVisits
    .map((visit) => ({ visit, timestamp: getVisitTimestamp(visit), coordinate: getVisitCoordinate(visit) }))
    .filter((item): item is { visit: SameDayVisitRow; timestamp: number; coordinate: { latitude: number; longitude: number; name: string } } =>
      item.timestamp != null && item.coordinate != null
    )
    .sort((a, b) => a.timestamp - b.timestamp);
  const currentIndex = orderedVisits.findIndex((item) => item.visit.id === currentVisitId);

  if (orderedVisits.length <= 1 || currentIndex < 0) {
    return {
      value: 'Sem comparacao',
      detail: 'Nao ha outra visita do mesmo instrutor no mesmo dia com horario e coordenadas suficientes para comparar.',
      severity: 'success',
    };
  }

  const currentVisit = orderedVisits[currentIndex];
  const neighbors = [orderedVisits[currentIndex - 1], orderedVisits[currentIndex + 1]].filter(Boolean);
  const strongestCheck = neighbors
    .map((neighbor) => {
      const distanceMeters = calculateDistanceInMeters(
        currentVisit.coordinate.latitude,
        currentVisit.coordinate.longitude,
        neighbor.coordinate.latitude,
        neighbor.coordinate.longitude
      );
      const minutesBetween = Math.abs(currentVisit.timestamp - neighbor.timestamp) / 60000;
      const speedKmh = minutesBetween > 0 ? (distanceMeters / 1000) / (minutesBetween / 60) : Number.POSITIVE_INFINITY;

      return {
        neighbor,
        distanceMeters,
        minutesBetween,
        speedKmh,
      };
    })
    .sort((a, b) => b.speedKmh - a.speedKmh)[0];

  if (!strongestCheck) {
    return {
      value: 'Sem comparacao',
      detail: 'Nao ha visita anterior ou posterior no mesmo dia para comparar o deslocamento.',
      severity: 'success',
    };
  }

  const roundedSpeed = Number.isFinite(strongestCheck.speedKmh) ? Math.round(strongestCheck.speedKmh) : null;
  const roundedMinutes = Math.max(1, Math.round(strongestCheck.minutesBetween));
  const neighborName = strongestCheck.neighbor.coordinate.name;
  const neighborTime = formatShortTime(strongestCheck.neighbor.visit.dt_checkin ?? strongestCheck.neighbor.visit.dt_visita);
  const distanceText = formatDistance(strongestCheck.distanceMeters);

  if (roundedSpeed == null || strongestCheck.minutesBetween <= 0) {
    return {
      value: 'Critico',
      detail: `Outra visita do mesmo instrutor aparece no mesmo horario em ${neighborName}, a ${distanceText}.`,
      severity: 'critical',
    };
  }

  if (roundedSpeed > 120) {
    return {
      value: `${roundedSpeed} km/h`,
      detail: `No mesmo dia, ha outra visita em ${neighborName} as ${neighborTime}. O deslocamento exigiria ${distanceText} em ${roundedMinutes} min.`,
      severity: 'critical',
    };
  }

  if (roundedSpeed > 80) {
    return {
      value: `${roundedSpeed} km/h`,
      detail: `No mesmo dia, ha outra visita em ${neighborName} as ${neighborTime}. O deslocamento e possivel, mas exige verificacao.`,
      severity: 'warning',
    };
  }

  return {
    value: `${roundedSpeed} km/h`,
    detail: `Comparado com outra visita do mesmo dia em ${neighborName} as ${neighborTime}; deslocamento estimado de ${distanceText} em ${roundedMinutes} min.`,
    severity: 'success',
  };
}

export function mapInstructorRisk(row: InstructorScoreRow): InstructorRisk {
  return {
    id: row.instrutor_id,
    name: row.instrutor_nome ?? 'Instrutor não informado',
    regional: row.regional_nome ?? 'Regional não informada',
    totalVisits: row.total_visitas ?? 0,
    analyzedVisits: row.visitas_analisadas ?? 0,
    averageScore: Math.round(parseNumber(row.score_medio)),
    validVisits: row.visitas_validas ?? 0,
    suspiciousVisits: row.visitas_suspeitas ?? 0,
    highRiskVisits: row.visitas_alto_risco ?? 0,
  };
}

export function getInstructorRiskColor(instructor: InstructorRisk) {
  if (instructor.highRiskVisits > 0 || instructor.averageScore < 60) {
    return THEME.error;
  }

  if (instructor.suspiciousVisits > 0 || instructor.averageScore < 80) {
    return THEME.gold;
  }

  return THEME.leafLight;
}

export function buildAuditCase(
  alert: FraudAlertRow,
  analysis?: FraudAnalysisRow,
  visitDetail?: VisitAuditDetailRow,
  sameDayTravelCheck?: SameDayTravelCheck
): AuditCase {
  const distance = parseNumber(analysis?.distancia_calculada_metros ?? alert.distancia_calculada_metros);
  const property = getSingleRelation(visitDetail?.propriedades);
  const producer = getSingleRelation(visitDetail?.produtores);
  const checkinLat = parseOptionalNumber(visitDetail?.latitude_checkin);
  const checkinLon = parseOptionalNumber(visitDetail?.longitude_checkin);
  const checkoutLat = parseOptionalNumber(visitDetail?.latitude_checkout);
  const checkoutLon = parseOptionalNumber(visitDetail?.longitude_checkout);
  const propertyLat = parseOptionalNumber(property?.latitude);
  const propertyLon = parseOptionalNumber(property?.longitude);
  const checkinCheckoutMeters =
    checkinLat != null && checkinLon != null && checkoutLat != null && checkoutLon != null
      ? calculateDistanceInMeters(checkinLat, checkinLon, checkoutLat, checkoutLon)
      : null;
  const checkinPropertyMeters =
    parseOptionalNumber(visitDetail?.distancia_metros) ??
    (checkinLat != null && checkinLon != null && propertyLat != null && propertyLon != null
      ? calculateDistanceInMeters(checkinLat, checkinLon, propertyLat, propertyLon)
      : null);
  const propertyRegion = [alert.municipio_nome, alert.uf].filter(Boolean).join(', ') || 'Região não informada';
  const ipRegion = [analysis?.ip_cidade, analysis?.ip_pais].filter(Boolean).join(', ') || 'IP não registrado';
  const vpnDetected = analysis?.vpn_detectada ?? alert.vpn_detectada ?? false;
  const details = analysis?.detalhes ?? {};
  const displacementDetails =
    typeof details.deslocamento === 'string'
      ? details.deslocamento
      : typeof details.diferenca_tempo_minutos === 'number'
        ? `${details.diferenca_tempo_minutos} min entre captura e registro`
        : 'Sem historico suficiente para inferir trajeto';
  const riskScore = alert.score_total ?? 0;

  return {
    id: String(alert.alerta_id),
    visitId: alert.visita_id,
    technicianId: alert.instrutor_id,
    property: alert.propriedade_nome ?? 'Propriedade sem nome',
    technician: alert.instrutor_nome ?? 'Instrutor não informado',
    visitDate: formatDateTime(alert.dt_visita ?? alert.analisado_em),
    analyzedAt: formatDateTime(alert.analisado_em),
    trackingCode: alert.codigo_rastreamento ?? `Visita #${alert.visita_id}`,
    project: alert.projeto_nome ?? 'Projeto não informado',
    status: visitDetail?.status_visita ?? alert.status_visita ?? 'Status não informado',
    type: visitDetail?.tipo_visita ?? 'Tipo não informado',
    producer: producer?.nome ?? 'Produtor não informado',
    checkinAt: formatTime(visitDetail?.dt_checkin),
    checkoutAt: formatTime(visitDetail?.dt_checkout),
    durationMinutes: visitDetail?.tempo_visita_minutos ?? null,
    checkinCheckoutMeters,
    checkinPropertyMeters,
    checkinCoordinate: formatCoordinate(checkinLat, checkinLon),
    checkoutCoordinate: formatCoordinate(checkoutLat, checkoutLon),
    photoDistanceMeters: Math.round(distance),
    ipRegion,
    propertyRegion,
    displacement: displacementDetails,
    vpnSignal: vpnDetected
      ? analysis?.vpn_provedor
        ? `VPN/proxy detectado: ${analysis.vpn_provedor}`
        : 'VPN/proxy detectado'
      : 'Sem VPN registrada',
    riskScore,
    classification: alert.classificacao,
    indicators: [
      {
        id: 'distance',
        label: 'Distancia da foto',
        value: formatDistance(Math.round(distance)),
        detail:
          analysis?.score_distancia == null
            ? 'Distancia ainda não pontuada pela analise antifraude.'
            : 'Comparação entre o GPS EXIF da foto e a coordenada oficial da propriedade.',
        icon: 'map-location-dot',
        severity: scoreSeverity(analysis?.score_distancia),
      },
      {
        id: 'ip',
        label: 'IP/região',
        value: scoreValue(analysis?.score_ip_regiao),
        detail:
          ipRegion === 'IP não registrado'
            ? 'A analise não gravou cidade ou pais do IP de acesso.'
            : `IP identificado em ${ipRegion}; propriedade em ${propertyRegion}.`,
        icon: 'tower-broadcast',
        severity: scoreSeverity(analysis?.score_ip_regiao),
      },
      {
        id: 'route',
        label: 'Deslocamento',
        value: scoreValue(analysis?.score_deslocamento),
        detail: displacementDetails,
        icon: 'route',
        severity: scoreSeverity(analysis?.score_deslocamento),
      },
      {
        id: 'vpn',
        label: 'VPN/proxy',
        value: vpnDetected ? 'Detectada' : scoreValue(analysis?.score_vpn),
        detail: vpnDetected
          ? analysis?.vpn_provedor ?? 'A analise marcou o acesso como VPN, proxy ou datacenter.'
          : 'Nenhum indicador de VPN gravado para esta analise.',
        icon: 'shield-halved',
        severity: vpnDetected ? 'critical' : scoreSeverity(analysis?.score_vpn),
      },
      {
        id: 'geographic_impossibility',
        label: 'Viagens impossíveis',
        value: sameDayTravelCheck?.value ?? 'Sem comparacao',
        detail: sameDayTravelCheck?.detail ?? 'Comparacao limitada as visitas do mesmo instrutor realizadas no mesmo dia.',
        icon: 'triangle-exclamation',
        severity: sameDayTravelCheck?.severity ?? 'success',
      },
    ],
    photos: [],
  };
}

export function mapVisitPhoto(row: VisitPhotoRow, signedUrl?: string | null): VisitPhoto {
  return {
    id: row.id,
    uri: row.url_publica || signedUrl || null,
    fileName: row.nome_arquivo ?? 'Foto da visita',
    sentAt: formatDateTime(row.enviada_em),
    hasGps: row.exif_tem_gps ?? false,
    distanceMeters: parseOptionalNumber(row.distancia_propriedade_metros),
    latitude: row.exif_latitude,
    longitude: row.exif_longitude,
  };
}

export function mapVisitPhotoMetadata(row: VisitPhotoMetadataRow, signedUrl?: string | null): VisitPhoto {
  const fallbackId = [row.id_visita, row.foto_path, row.foto_url, row.file_name].filter(Boolean).join(':');

  return {
    id: fallbackId || `foto-${row.id_visita}`,
    uri: row.foto_url || signedUrl || null,
    fileName: row.file_name ?? 'Foto da visita',
    sentAt: formatDateTime(row.capturado_em),
    hasGps: row.has_gps ?? false,
    distanceMeters: parseOptionalNumber(row.distancia_metros),
    latitude: row.latitude,
    longitude: row.longitude,
  };
}
