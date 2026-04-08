import { FontAwesome6 } from '@expo/vector-icons';
import type { AnimatedStyle } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { Text, View } from 'react-native';

import { COLORS } from '../constants';
import { styles } from '../styles';

interface ProfileBadgeProps {
  animatedStyle: AnimatedStyle<any>;
}

export function ProfileBadge({ animatedStyle }: ProfileBadgeProps) {
  return (
    <Animated.View style={[styles.profileBadge, animatedStyle]}>
      <View style={styles.avatarBox}>
        <FontAwesome6 name="user-tie" size={20} color={COLORS.white} />
      </View>
      <View style={styles.badgeCopy}>
        <Text style={styles.badgeName}>Perfis suportados</Text>
        <Text style={styles.badgeRole}>Gestor, Instrutor e Proprietario</Text>
      </View>
    </Animated.View>
  );
}
