import type { UsuarioRow } from './types';

export const INSTRUTORES_THEME = {
  skyTop: '#0a1f0d',
  leafLight: '#4dc85a',
  gold: '#f5c842',
  blue: '#5b9cff',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textMuted: 'rgba(255,255,255,0.55)',
  cardBg: 'rgba(10,31,13,0.85)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.1)',
  error: '#ff6b6b',
} as const;

export const ROLE_LABELS: Record<UsuarioRow['perfil'], string> = {
  admin: 'Gestor Institucional',
  instrutor: 'Tecnico de Campo',
  proprietario: 'Proprietario Rural',
};

export const ROLE_EDIT_OPTIONS: { value: UsuarioRow['perfil']; label: string; hint: string }[] = [
  { value: 'admin', label: 'Gestor Institucional', hint: 'Gerencia usuarios, auditoria e operacao.' },
  { value: 'instrutor', label: 'Tecnico de Campo', hint: 'Realiza visitas e acompanha propriedades.' },
  { value: 'proprietario', label: 'Proprietario Rural', hint: 'Acessa dados da fazenda e seu cadastro.' },
];

export const PAGE_SIZE_OPTIONS = [8, 16, 24] as const;
