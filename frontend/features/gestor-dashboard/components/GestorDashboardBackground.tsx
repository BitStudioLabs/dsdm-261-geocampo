import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { styles } from '../styles';

function Star({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withSequence(withTiming(0.9, { duration: 1200 }), withTiming(0.3, { duration: 1200 })), -1, true));
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.85)' }, style]} />;
}

interface GestorDashboardBackgroundProps {
  height: number;
  stars: { id: number; x: number; y: number; size: number; delay: number }[];
}

export function GestorDashboardBackground({ height, stars }: GestorDashboardBackgroundProps) {
  return (
    <View style={[styles.skyBg, { height: height * 0.35 }]}>
      {stars.map((star) => <Star key={star.id} x={star.x} y={star.y} size={star.size} delay={star.delay} />)}
      <View style={styles.moon}>
        <View style={styles.moonInner}>
          <View style={[styles.crater, { width: 8, height: 8, top: 10, left: 12 }]} />
          <View style={[styles.crater, { width: 5, height: 5, top: 22, left: 28 }]} />
          <View style={[styles.crater, { width: 6, height: 6, top: 30, left: 14 }]} />
        </View>
      </View>
    </View>
  );
}
