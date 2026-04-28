import { FontAwesome6 } from '@expo/vector-icons';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { THEME } from '../constants';
import { styles } from '../styles';
import type { RegionalOption } from '../types';

interface RegionalSelectorProps {
  isLoading: boolean;
  regionais: RegionalOption[];
  selectedRegionalId: number | null;
  onSelect: (regionalId: number) => void;
}

export function RegionalSelector({
  isLoading,
  regionais,
  selectedRegionalId,
  onSelect,
}: RegionalSelectorProps) {
  return (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorHint}>Defina a regional principal vinculada a esse usuario.</Text>
      {isLoading ? (
        <View style={styles.loadingRegionais}>
          <ActivityIndicator size="small" color={THEME.leafLight} />
          <Text style={styles.loadingRegionaisText}>Carregando regionais...</Text>
        </View>
      ) : (
        <View style={styles.selectorGrid}>
          {regionais.map((regional) => {
            const selected = selectedRegionalId === regional.id;

            return (
              <TouchableOpacity
                key={regional.id}
                style={[styles.selectorCard, selected && styles.selectorCardActive]}
                onPress={() => onSelect(regional.id)}
                activeOpacity={0.9}>
                <View style={styles.selectorHeader}>
                  <Text style={[styles.selectorTitle, selected && styles.selectorTitleActive]}>{regional.nome}</Text>
                  {selected ? <FontAwesome6 name="location-dot" size={14} color={THEME.gold} /> : null}
                </View>
                <Text style={[styles.selectorDescription, selected && styles.selectorDescriptionActive]}>
                  Unidade {regional.uf}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
