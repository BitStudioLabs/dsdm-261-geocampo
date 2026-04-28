export const THEME = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
  leafLight: '#4dc85a',
  blue: '#5b9cff',
  gold: '#f5c842',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textMuted: 'rgba(255,255,255,0.55)',
  cardBg: 'rgba(10,31,13,0.85)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.1)',
  error: '#ff6b6b',
  success: '#2eaf6d',
} as const;

export const ROLE_OPTIONS = [
  { value: 'instrutor', label: 'Instrutor de Campo', hint: 'Realiza visitas e acompanha propriedades em campo.' },
  { value: 'proprietario', label: 'Proprietario Rural', hint: 'Acessa dados da propria fazenda e seu cadastro.' },
  { value: 'admin', label: 'Gestor Institucional', hint: 'Gerencia usuarios, auditoria e operação da plataforma.' },
] as const;
