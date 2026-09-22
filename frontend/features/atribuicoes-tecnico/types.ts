export type InstrutorOption = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  ativo: boolean;
  score_medio?: number | null;
};

export type PropriedadeOption = {
  id: number;
  nome: string | null;
  municipio_nome: string | null;
  uf: string | null;
  status_propriedade: 'ativo' | 'inativo' | 'em_analise' | null;
};

export type AtribuicaoRow = {
  id: number;
  id_propriedade: number;
  ativa: boolean;
};

export type AtribuicoesFeedback = {
  type: 'success' | 'error';
  message: string;
} | null;
