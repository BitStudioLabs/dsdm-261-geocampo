import { Ionicons } from '@expo/vector-icons';
import type { VisitStatusDb } from '@/features/instrutor/types/visitas';

export const PERIODOS = ['7 dias', 'Mês', 'Ano'] as const;
export type Periodo = (typeof PERIODOS)[number];

export type ReportVisitRow = {
  id: number;
  criado_em: string | null;
  id_propriedade: number | null;
  status_visita: VisitStatusDb;
};

export type ReportPropertyLookup = Record<number, { nome: string | null }>;

export type HistoryItem = {
  id: string;
  title: string;
  date: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: string;
};
