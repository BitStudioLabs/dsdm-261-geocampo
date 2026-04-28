import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PROPRIETARIO_THEME as THEME } from '@/features/proprietario/theme';

type ProprietarioStatCardProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
};

export function ProprietarioStatCard({ icon, label, value }: ProprietarioStatCardProps) {
  return (
    <View style={styles.statCard}>
      {icon ? (
        <View style={styles.statIcon}>
          <Ionicons name={icon} size={18} color={THEME.primary} />
        </View>
      ) : null}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    width: '48.5%',
    backgroundColor: THEME.panel,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: THEME.line,
    shadowColor: '#030804',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primarySoft,
    marginBottom: 12,
  },
  statValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  statLabel: { color: THEME.textSoft, fontSize: 12, textAlign: 'center' },
});
