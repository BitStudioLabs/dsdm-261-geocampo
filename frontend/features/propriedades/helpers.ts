import { THEME } from './constants';
import type { CoordinateKind, FilterValue, PropertyStatus, RawPropertyRow, PropertyRow } from './types';

const STATUS_META: Record<Exclude<FilterValue, 'todos'>, { label: string; color: string; bg: string }> = {
  ativo: { label: 'Ativa', color: THEME.green, bg: 'rgba(77,200,90,0.15)' },
  em_analise: { label: 'Em analise', color: THEME.amber, bg: 'rgba(245,158,11,0.16)' },
  inativo: { label: 'Inativa', color: THEME.red, bg: 'rgba(255,107,107,0.16)' },
};

export function getStatusMeta(status: PropertyStatus) {
  return STATUS_META[status ?? 'ativo'] ?? STATUS_META.ativo;
}

export function getArrangementLabel(value: string | null) {
  if (value === 'nao_arrendada') return 'Nao arrendada';
  if (value === 'arrendada') return 'Arrendada';
  if (value === 'parcialmente_arrendada') return 'Arrendamento parcial';
  return 'Nao informado';
}

function withinBrazilRange(kind: CoordinateKind, value: number) {
  if (kind === 'latitude') {
    return value >= -35 && value <= 6;
  }

  return value >= -75 && value <= -30;
}

function buildCoordinateCandidate(digits: string, sign: number, integerDigits: number) {
  if (digits.length <= integerDigits) {
    return null;
  }

  const integerPart = digits.slice(0, integerDigits);
  const decimalPart = digits.slice(integerDigits);

  return sign * Number(`${integerPart}.${decimalPart}`);
}

function normalizeCoordinate(value: unknown, kind: CoordinateKind) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Math.abs(value) <= (kind === 'latitude' ? 90 : 180)) {
      return value;
    }

    const digits = String(Math.trunc(Math.abs(value)));
    const options = kind === 'latitude' ? [1, 2] : [2, 3];

    for (const integerDigits of options) {
      const candidate = buildCoordinateCandidate(digits, value < 0 ? -1 : 1, integerDigits);
      if (candidate != null && withinBrazilRange(kind, candidate)) {
        return candidate;
      }
    }

    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\s+/g, '').replace(',', '.');
  const direct = Number(normalized);
  if (Number.isFinite(direct) && Math.abs(direct) <= (kind === 'latitude' ? 90 : 180)) {
    return direct;
  }

  const sign = normalized.startsWith('-') ? -1 : 1;
  const digits = normalized.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  const options = kind === 'latitude' ? [1, 2] : [2, 3];
  for (const integerDigits of options) {
    const candidate = buildCoordinateCandidate(digits, sign, integerDigits);
    if (candidate != null && withinBrazilRange(kind, candidate)) {
      return candidate;
    }
  }

  return null;
}

export function normalizeProperty(property: RawPropertyRow): PropertyRow {
  return {
    ...property,
    latitude: normalizeCoordinate(property.latitude, 'latitude'),
    longitude: normalizeCoordinate(property.longitude, 'longitude'),
  };
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
