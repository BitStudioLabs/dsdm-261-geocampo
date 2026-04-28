export function parseNum(v: string) {
  const s = v.replace(',', '.').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function formatOptionalNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '';
  return String(value).replace('.', ',');
}

export function formatCoordinateValue(value: number | null | undefined, type: 'lat' | 'lon') {
  if (value == null || Number.isNaN(value)) return '';
  return formatCoordinateInput(String(value).replace('.', ','), type);
}

export function formatCoordinateInput(value: string, type: 'lat' | 'lon') {
  const normalized = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', ',');
  if (!normalized) return '';
  const negative = normalized.startsWith('-') || normalized.replace(/\D/g, '').length > 0;
  const digits = normalized.replace(/\D/g, '');

  if (!digits) return negative ? '-' : '';

  let integerLength = type === 'lat' ? 2 : 3;
  if (type === 'lat' && Number(digits.slice(0, 2)) > 90) integerLength = 1;
  if (type === 'lon' && Number(digits.slice(0, 3)) > 180) integerLength = 2;

  const boundedIntegerLength = Math.min(integerLength, Math.max(digits.length - 1, 1));
  const integer = digits.slice(0, boundedIntegerLength);
  const decimal = digits.slice(boundedIntegerLength, boundedIntegerLength + 8);

  return `${negative ? '-' : ''}${integer}${decimal ? `,${decimal}` : ''}`;
}

export function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
