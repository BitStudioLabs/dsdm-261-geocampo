export function formatArea(area: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(area);
}

export function statusLabel(status: string | null) {
  if (status === 'ativo') return 'Ativa';
  if (status === 'inativo') return 'Inativa';
  if (status === 'em_analise') return 'Em analise';
  return 'Sem status';
}

export function leaseLabel(status: string | null) {
  if (status === 'arrendada') return 'Arrendada';
  if (status === 'parcialmente_arrendada') return 'Parcialmente arrendada';
  if (status === 'nao_arrendada') return 'Nao arrendada';
  return 'Sem informacao';
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }
  return 'Erro desconhecido.';
}

export function formatMemberSince(value: string | null | undefined) {
  if (!value) return 'Nao informado';
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(value));
}

export function buildDisplayName({
  email,
  producerName,
  profileName,
}: {
  email?: string | null;
  producerName?: string | null;
  profileName?: string | null;
}) {
  return profileName ?? producerName ?? email ?? 'Proprietario Rural';
}
