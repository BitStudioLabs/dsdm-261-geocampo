import { StyleSheet, Text, View } from 'react-native';

import { PROPRIETARIO_THEME as THEME } from '@/features/proprietario/theme';

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.line,
  },
  infoLabel: { flex: 1, color: THEME.textSoft, fontSize: 13 },
  infoValue: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'right' },
});
