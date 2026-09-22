export const AUDITORIA_THEME = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
  leafLight: '#4dc85a',
  gold: '#f5c842',
  error: '#ff6b6b',
  blue: '#5b9cff',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textMuted: 'rgba(255,255,255,0.58)',
  cardBg: 'rgba(10,31,13,0.86)',
  cardBorder: 'rgba(77,200,90,0.13)',
} as const;

export const AUDIT_RULES = [
  'Distancia calculada entre GPS EXIF da foto e coordenada da propriedade.',
  'Coerencia entre cidade/UF do IP publico e regiao rural atendida.',
  'Velocidade media inferida entre fotos e visitas consecutivas.',
  'Indicios de VPN por ASN, organizacao, proxy, datacenter ou provedor cloud.',
];
