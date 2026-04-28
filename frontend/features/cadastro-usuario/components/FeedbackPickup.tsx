import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEME } from '../constants';
import { styles } from '../styles';
import type { PickupFeedback } from '../types';

export function FeedbackPickup({ feedback }: { feedback: PickupFeedback | null }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-18)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!feedback) {
      return;
    }

    translateY.setValue(-18);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [feedback, opacity, translateY]);

  if (!feedback) {
    return null;
  }

  const isSuccess = feedback.type === 'success';
  return (
    <View pointerEvents="none" style={[styles.pickupWrapper, { top: insets.top + 12 }]}>
      <Animated.View
        style={[
          styles.pickupCard,
          isSuccess ? styles.pickupSuccess : styles.pickupError,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        <View style={[styles.pickupAccent, isSuccess ? styles.pickupAccentSuccess : styles.pickupAccentError]} />
        <View style={[styles.pickupIcon, isSuccess ? styles.pickupIconSuccess : styles.pickupIconError]}>
          <FontAwesome6 name={isSuccess ? 'circle-check' : 'triangle-exclamation'} size={13} color={isSuccess ? THEME.success : THEME.error} />
        </View>
        <View style={styles.pickupContent}>
          <Text style={styles.pickupText}>{feedback.message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}
