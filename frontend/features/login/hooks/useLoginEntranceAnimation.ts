import { useEffect } from 'react';
import {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useLoginEntranceAnimation() {
  const cardSlide = useSharedValue(80);
  const cardOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const moonScale = useSharedValue(0);
  const moonGlow = useSharedValue(0);

  useEffect(() => {
    moonScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    moonGlow.value = withDelay(
      500,
      withRepeat(
        withSequence(withTiming(1, { duration: 2000 }), withTiming(0.5, { duration: 2000 })),
        -1,
        true
      )
    );

    cardSlide.value = withDelay(1800, withSpring(0, { damping: 15, stiffness: 80 }));
    cardOpacity.value = withDelay(1800, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(1600, withSpring(1, { damping: 10, stiffness: 100 }));
    logoOpacity.value = withDelay(1600, withTiming(1, { duration: 500 }));
  }, [cardOpacity, cardSlide, logoOpacity, logoScale, moonGlow, moonScale]);

  const moonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: moonScale.value }],
  }));

  const moonGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(moonGlow.value, [0, 1], [0.3, 0.8]),
    transform: [{ scale: interpolate(moonGlow.value, [0, 1], [1, 1.2]) }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardSlide.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  return {
    logoStyle,
    cardStyle,
    badgeStyle,
    moonStyle,
    moonGlowStyle,
  };
}
