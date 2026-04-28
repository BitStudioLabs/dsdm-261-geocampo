import { Ionicons } from '@expo/vector-icons';
import type { VisitStatusDb } from '@/features/instrutor/types/visitas';

export type StatusType = 'Agendada' | 'Hoje' | 'Em andamento' | 'Concluída';
export type DashboardFilter = 'atribuidas' | 'hoje' | 'concluidas';

export type DashboardItem = {
  id: string;
  nome: string;
  local: string;
  distancia: string;
  status: StatusType;
  visitaEm: string;
  icone: keyof typeof Ionicons.glyphMap;
  iconeBg: string;
};

export type DashboardStats = Record<DashboardFilter, string>;

export type AtribuicaoDashboardRow = {
  id: number;
  id_propriedade: number;
  ativa: boolean;
  atualizado_em?: string | null;
  criado_em?: string | null;
};

export type VisitaDashboardRow = {
  id: number;
  id_propriedade: number | null;
  criado_em?: string | null;
  status_visita?: VisitStatusDb;
};

export type DashboardPropertyLookup = Record<
  number,
  {
    id: number;
    nome: string | null;
    municipio_nome: string | null;
    uf: string | null;
  }
>;

export type SectionCopy = {
  eyebrow: string;
  title: string;
  description: string;
};
