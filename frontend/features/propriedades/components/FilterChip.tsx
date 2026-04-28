import { Text, TouchableOpacity } from 'react-native';

import { styles } from '../styles';

export function FilterChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && { borderColor: color, backgroundColor: `${color}1F` }]}
      onPress={onPress}
      activeOpacity={0.85}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
