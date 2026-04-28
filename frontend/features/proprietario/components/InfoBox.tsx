import { StyleSheet, Text, View } from 'react-native';

import { PROPRIETARIO_THEME as THEME } from '@/features/proprietario/theme';

export function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoBoxLabel}>{label}</Text>
      <Text style={styles.infoBoxValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    flex: 1,
    backgroundColor: THEME.panelStrong,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.line,
  },
  infoBoxLabel: { color: THEME.textSoft, fontSize: 11, marginBottom: 4 },
  infoBoxValue: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
