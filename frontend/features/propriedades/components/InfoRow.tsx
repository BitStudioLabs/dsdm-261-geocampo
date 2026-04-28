import { FontAwesome6 } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { THEME } from '../constants';
import { styles } from '../styles';

export function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <FontAwesome6 name={icon} size={11} color={THEME.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}
