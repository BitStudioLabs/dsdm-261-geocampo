export type GestorStats = {
  totalInstrutores: number;
  alertasFraude: number;
  visitasMes: number;
  notificacoesNaoLidas: number;
};

export type GestorProfileFeedback = {
  message: string;
  type: 'success' | 'error';
  scope: 'profile' | 'general';
};
