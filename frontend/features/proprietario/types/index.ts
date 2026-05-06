export type Producer = {
  id: number;
  nome: string | null;
  telefone?: string | null;
  email?: string | null;
  cpf_cnpj?: string | null;
};

export type ProducerProperty = {
  id: number;
  nome: string;
  municipio_nome: string | null;
  uf: string | null;
  area_total: number | null;
  status_propriedade: string | null;
  instrutores: string[];
};

export type ProducerPropertyDetails = ProducerProperty & {
  status_arrendamento: string | null;
  bairro: string | null;
  referencia: string | null;
  como_chegar: string | null;
  telefone: string | null;
};

export type ProducerDashboardState = {
  producer: Producer | null;
  properties: ProducerProperty[];
  visitsCount: number;
};

export type ProducerProfileState = {
  producer: Producer | null;
  properties: ProducerProperty[];
  visitsCount: number;
};

export type ProprietarioFeedback = {
  type: 'success' | 'error';
  message: string;
} | null;

export type AssignmentRow = {
  id_propriedade: number | null;
  id_instrutor: string | null;
  usuarios?: { nome_completo?: string | null } | { nome_completo?: string | null }[] | null;
};
