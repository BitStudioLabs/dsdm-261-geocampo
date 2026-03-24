import { Dimensions } from 'react-native';

import type { CornConfig, StarConfig } from './types';

export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const COLORS = {
  skyTop: '#0a1f0d',
  skyMid: '#0f2e14',
  skyBottom: '#1a4a20',
  ground: '#3d2b1a',
  groundTop: '#5a3d20',
  soilDark: '#2e1f0e',
  stemGreen: '#2d8c3e',
  stemDark: '#1a5c28',
  leafLight: '#4dc85a',
  leafMid: '#3aaa4a',
  leafDark: '#2d8c3e',
  cornYellow: '#f5c842',
  cornGold: '#e6a800',
  silkColor: '#f9e4a0',
  huskGreen: '#3aaa4a',
  huskDark: '#2d8c3e',
  moonLight: 'rgba(255,248,200,0.15)',
  starColor: 'rgba(255,255,255,0.8)',
  fogColor: 'rgba(100,200,100,0.05)',
  inputBg: 'rgba(255,255,255,0.08)',
  inputBorder: 'rgba(255,255,255,0.18)',
  inputFocus: 'rgba(77,200,90,0.5)',
  btnGreen: '#2d8c3e',
  btnLight: '#4dc85a',
  white: '#ffffff',
  offWhite: '#f0f8f0',
  textGray: 'rgba(255,255,255,0.55)',
  link: '#7de88a',
  cardBg: 'rgba(10,31,13,0.85)',
  gold: '#f5c842',
} as const;

export const STARS: StarConfig[] = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: Math.random() * (SCREEN_H * 0.5),
  size: Math.random() * 2.5 + 0.8,
  opacity: Math.random() * 0.6 + 0.3,
  twinkleDelay: Math.random() * 3000,
}));

export const CORN_PLANTS: CornConfig[] = [
  { id: 0, x: SCREEN_W * 0.02, maxHeight: 100, delay: 0, scale: 0.65, leafCount: 3, hasCob: false, swayOffset: 0 },
  { id: 1, x: SCREEN_W * 0.08, maxHeight: 145, delay: 150, scale: 0.85, leafCount: 4, hasCob: true, swayOffset: 500 },
  { id: 2, x: SCREEN_W * 0.15, maxHeight: 120, delay: 80, scale: 0.75, leafCount: 3, hasCob: false, swayOffset: 200 },
  { id: 3, x: SCREEN_W * 0.22, maxHeight: 160, delay: 300, scale: 0.95, leafCount: 4, hasCob: true, swayOffset: 800 },
  { id: 4, x: SCREEN_W * 0.30, maxHeight: 110, delay: 120, scale: 0.70, leafCount: 3, hasCob: false, swayOffset: 100 },
  { id: 5, x: SCREEN_W * 0.38, maxHeight: 175, delay: 450, scale: 1.0, leafCount: 5, hasCob: true, swayOffset: 600 },
  { id: 6, x: SCREEN_W * 0.46, maxHeight: 130, delay: 200, scale: 0.80, leafCount: 3, hasCob: false, swayOffset: 350 },
  { id: 7, x: SCREEN_W * 0.54, maxHeight: 165, delay: 380, scale: 0.98, leafCount: 4, hasCob: true, swayOffset: 750 },
  { id: 8, x: SCREEN_W * 0.62, maxHeight: 115, delay: 60, scale: 0.72, leafCount: 3, hasCob: false, swayOffset: 450 },
  { id: 9, x: SCREEN_W * 0.70, maxHeight: 155, delay: 280, scale: 0.92, leafCount: 4, hasCob: true, swayOffset: 900 },
  { id: 10, x: SCREEN_W * 0.78, maxHeight: 125, delay: 160, scale: 0.78, leafCount: 3, hasCob: false, swayOffset: 250 },
  { id: 11, x: SCREEN_W * 0.86, maxHeight: 150, delay: 420, scale: 0.88, leafCount: 4, hasCob: true, swayOffset: 550 },
  { id: 12, x: SCREEN_W * 0.94, maxHeight: 105, delay: 40, scale: 0.68, leafCount: 3, hasCob: false, swayOffset: 700 },
];

export const FIREFLIES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  startX: SCREEN_W * (0.08 + Math.random() * 0.84),
  startY: SCREEN_H * (0.18 + Math.random() * 0.42),
  delay: i * 220,
  size: 2.5 + Math.random() * 2.5,
  drift: 18 + Math.random() * 28,
  duration: 3200 + Math.random() * 2200,
}));
