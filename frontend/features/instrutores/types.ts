export type UsuarioRow = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  perfil: 'admin' | 'instrutor' | 'proprietario';
  telefone: string | null;
  ativo: boolean;
  id_regional: number | null;
  foto_url?: string | null;
};

export type RegionalOption = {
  id: number;
  nome: string;
  uf: string;
};

export type PropriedadeVinculada = {
  id: number;
  nome: string | null;
  municipio_nome: string | null;
  uf: string | null;
  projeto_nome: string | null;
  ativa: boolean;
};

export type FeedbackState = {
  type: 'success' | 'error';
  message: string;
} | null;

export type EditFormState = {
  nomeCompleto: string;
  telefone: string;
  perfil: UsuarioRow['perfil'];
  ativo: boolean;
  regionalId: number | null;
};
