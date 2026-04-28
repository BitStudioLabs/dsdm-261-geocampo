import type { ROLE_OPTIONS } from './constants';

export type UserRoleOption = (typeof ROLE_OPTIONS)[number]['value'];

export type RegionalOption = {
  id: number;
  nome: string;
  uf: string;
};

export type PickupFeedback = {
  type: 'success' | 'error';
  message: string;
};

export type CadastroUsuarioForm = {
  nomeCompleto: string;
  email: string;
  password: string;
  telefone: string;
  perfil: UserRoleOption;
  regionalId: number | null;
};
