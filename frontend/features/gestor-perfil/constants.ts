import { Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const GESTOR_PERFIL_THEME = {
  skyTop: '#0a1f0d',
  leafLight: '#4dc85a',
  gold: '#f5c842',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textMuted: 'rgba(255,255,255,0.55)',
  cardBg: 'rgba(10,31,13,0.85)',
  error: '#ff6b6b',
  blue: '#5b9cff',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.1)',
} as const;

export const GESTOR_PERFIL_SCREEN = {
  width: SCREEN_W,
  height: SCREEN_H,
} as const;

export const GESTOR_PERFIL_STARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * (SCREEN_H * 0.2),
  size: Math.random() * 2 + 0.8,
  delay: Math.random() * 2000,
}));
