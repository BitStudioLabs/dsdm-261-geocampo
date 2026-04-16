import { Ionicons } from '@expo/vector-icons';

export type ProfileStats = {
  visitasMes: number;
  atribuidas: number;
  concluidas: number;
};

export type ProfileSummaryCard = {
  id: string;
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export type ProfilePreferenceItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};
