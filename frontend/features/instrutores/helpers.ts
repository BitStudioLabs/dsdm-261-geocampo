import type { RegionalOption } from './types';

export function getInitials(name: string | null, email: string | null) {
  const source = (name ?? email ?? 'Usuario').trim();
  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function getRegionalLabel(regionais: RegionalOption[], regionalId: number | null) {
  if (!regionalId) {
    return 'Regional nao definida';
  }

  const regional = regionais.find((item) => item.id === regionalId);
  if (!regional) {
    return 'Regional nao definida';
  }

  return `${regional.nome} (${regional.uf})`;
}
