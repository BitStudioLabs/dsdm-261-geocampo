import { FontAwesome6 } from '@expo/vector-icons';
import type { AnimatedStyle } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { Text, View } from 'react-native';

import { COLORS } from '../constants';
import { styles } from '../styles';

interface LoginHeaderProps {
  animatedStyle: AnimatedStyle<any>;
}

export function LoginHeader({ animatedStyle }: LoginHeaderProps) {
  return (
    <Animated.View style={[styles.logoArea, animatedStyle]}>
      <View style={styles.logoIcon}>
        <FontAwesome6 name="wheat-awn" size={34} color={COLORS.white} />
      </View>
      <Text style={styles.appName}>GeoCampo</Text>
      <Text style={styles.appTagline}>Gestao Rural de Campo</Text>
    </Animated.View>
  );
}
