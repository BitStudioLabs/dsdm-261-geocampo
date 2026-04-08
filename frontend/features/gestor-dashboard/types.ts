export type DashboardStats = {
  visitasMes: number;
  instrutores: number;
  propriedades: number;
  alertas: number;
  unreadNotifications: number;
};

export type DashboardAlert = {
  id: string;
  type: 'warning' | 'info' | 'error';
  label: string;
  message: string;
  time: string;
};

export type FraudeAlertRow = {
  alerta_id: number;
  analisado_em: string;
  classificacao: 'suspeita' | 'alto_risco_vpn' | 'valida';
  propriedade_nome: string | null;
  instrutor_nome: string | null;
};
