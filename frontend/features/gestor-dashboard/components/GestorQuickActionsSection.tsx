import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { THEME } from '../constants';
import { styles } from '../styles';

export function GestorQuickActionsSection() {
  return (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>Ações Rapidas</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(77,200,90,0.2)' }]}>
            <FontAwesome6 name="file-export" size={18} color={THEME.leafLight} />
          </View>
          <Text style={styles.actionText}>Exportar Relatorio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs-gestor)/cadastro-usuario' as any)}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(91,156,255,0.2)' }]}>
            <FontAwesome6 name="user-plus" size={18} color={THEME.blue} />
          </View>
          <Text style={styles.actionText}>Novo Instrutor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs-gestor)/cadastro-propriedade' as any)}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(245,200,66,0.2)' }]}>
            <FontAwesome6 name="house-chimney" size={18} color={THEME.gold} />
          </View>
          <Text style={styles.actionText}>Nova Propriedade</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.actionsRow, { marginTop: 12 }]}>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs-gestor)/atribuicoes-tecnico' as any)}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(91,156,255,0.18)' }]}>
            <FontAwesome6 name="diagram-project" size={18} color={THEME.blue} />
          </View>
          <Text style={styles.actionText}>Atribuir Fazendas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs-gestor)/propriedades' as any)}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(77,200,90,0.18)' }]}>
            <FontAwesome6 name="map-location-dot" size={18} color={THEME.leafLight} />
          </View>
          <Text style={styles.actionText}>Mapa de Propriedades</Text>
        </TouchableOpacity>
        <View style={styles.actionCardGhost} />
      </View>
    </View>
  );
}
