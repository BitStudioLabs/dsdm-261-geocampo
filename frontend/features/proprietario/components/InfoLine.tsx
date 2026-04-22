import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PROPRIETARIO_THEME as THEME } from '@/features/proprietario/theme';

export function InfoLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={15} color={THEME.primary} />
      <Text style={styles.infoLineText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  infoLineText: { flex: 1, color: THEME.textSoft, fontSize: 13, lineHeight: 18 },
});
