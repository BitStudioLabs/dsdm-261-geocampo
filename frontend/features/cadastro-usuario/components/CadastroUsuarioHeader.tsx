import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { THEME } from '../constants';
import { styles } from '../styles';

export function CadastroUsuarioHeader() {
  return (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
        <FontAwesome6 name="arrow-left" size={14} color={THEME.white} />
      </TouchableOpacity>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>Novo Usuario</Text>
        <Text style={styles.subtitle}>Crie um novo acesso e o perfil correspondente no sistema.</Text>
      </View>
    </View>
  );
}
