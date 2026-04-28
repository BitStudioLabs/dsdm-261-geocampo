import type { AtribuicaoRow, VisitaRow } from '@/features/instrutor/types/visitas';

export function formatDate(value?: string | null) {
  if (!value) {
    return '--/--/----';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--/--/----';
  }

  return parsed.toLocaleDateString('pt-BR');
}

export function formatTime(value?: string | null) {
  if (!value) {
    return '--:--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--:--';
  }

  return parsed.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toTimestamp(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
}

export function hasPendingAssignment(item: AtribuicaoRow, latestVisit?: VisitaRow | null) {
  if (!latestVisit) return true;

  const assignmentTimestamp = toTimestamp(item.atualizado_em ?? item.criado_em ?? null);
  const visitTimestamp = toTimestamp(latestVisit.criado_em ?? null);

  if (assignmentTimestamp == null || visitTimestamp == null) {
    return true;
  }

  return visitTimestamp < assignmentTimestamp;
}

export function calculateDistanceInMeters(
  originLat: number,
  originLon: number,
  targetLat: number,
  targetLon: number
) {
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
