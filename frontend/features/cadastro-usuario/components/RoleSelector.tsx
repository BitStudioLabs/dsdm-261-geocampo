import { FontAwesome6 } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

import { ROLE_OPTIONS, THEME } from '../constants';
import { styles } from '../styles';
import type { UserRoleOption } from '../types';

interface RoleSelectorProps {
  value: UserRoleOption;
  onChange: (value: UserRoleOption) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorHint}>Escolha o nivel de acesso que esse usuario tera dentro do sistema.</Text>
      <View style={styles.selectorGrid}>
        {ROLE_OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.selectorCard, selected && styles.selectorCardActive]}
              onPress={() => onChange(option.value)}
              activeOpacity={0.9}>
              <View style={styles.selectorHeader}>
                <Text style={[styles.selectorTitle, selected && styles.selectorTitleActive]}>{option.label}</Text>
                {selected ? <FontAwesome6 name="circle-check" size={14} color={THEME.leafLight} /> : null}
              </View>
              <Text style={[styles.selectorDescription, selected && styles.selectorDescriptionActive]}>{option.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
