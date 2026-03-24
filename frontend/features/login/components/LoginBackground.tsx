import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { AnimatedStyle, SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { COLORS, CORN_PLANTS, FIREFLIES, SCREEN_H, SCREEN_W, STARS } from '../constants';
import { styles } from '../styles';
import type { CornConfig, LeafProps, StarConfig } from '../types';

function AnimatedStar({ star }: { star: StarConfig }) {
  const twinkle = useSharedValue(star.opacity);

  useEffect(() => {
    twinkle.value = withDelay(
      star.twinkleDelay,
      withRepeat(
        withSequence(
          withTiming(star.opacity * 0.3, { duration: 1500 }),
          withTiming(star.opacity, { duration: 1500 })
        ),
        -1,
        true
      )
    );
  }, [star.opacity, star.twinkleDelay, twinkle]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: twinkle.value,
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

function AnimatedLeaf({ index, side, posFromBottom, leafLen, leafH, progress, swayOffset }: LeafProps) {
  const sway = useSharedValue(0);

  useEffect(() => {
    sway.value = withDelay(
      swayOffset + index * 100,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [index, sway, swayOffset]);

  const animatedStyle = useAnimatedStyle(() => {
    const leafProgress = interpolate(progress.value, [0.3, 0.5 + index * 0.08, 1], [0, 0, 1], 'clamp');
    const baseRotation = side > 0 ? -30 : 30;
    const swayAmount = sway.value * 5;

    return {
      opacity: leafProgress,
      transform: [
        { rotate: `${baseRotation + swayAmount}deg` },
        { translateY: leafH / 2 },
        { scaleX: leafProgress },
        { scaleY: leafProgress },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: posFromBottom,
          [side > 0 ? 'left' : 'right']: -leafLen * 0.1,
          width: leafLen,
          height: leafH,
          backgroundColor: index % 2 === 0 ? COLORS.leafLight : COLORS.leafMid,
          borderRadius: leafH / 2,
          borderTopLeftRadius: side > 0 ? leafH / 4 : leafH / 2,
          borderTopRightRadius: side > 0 ? leafH / 2 : leafH / 4,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 2,
        },
        animatedStyle,
      ]}
    />
  );
}

function AnimatedCob({ maxHeight, scale, progress }: { maxHeight: number; scale: number; progress: SharedValue<number> }) {
  const cobH = maxHeight * 0.25 * scale;
  const cobW = 8 * scale;

  const animatedStyle = useAnimatedStyle(() => {
    const cobProgress = interpolate(progress.value, [0.6, 0.85, 1], [0, 0, 1], 'clamp');

    return {
      opacity: cobProgress,
      transform: [{ scale: cobProgress }, { rotate: '-8deg' }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: maxHeight * 0.5,
          left: 5 * scale,
        },
        animatedStyle,
      ]}>
      <View
        style={{
          width: cobW + 6,
          height: cobH + 10,
          backgroundColor: COLORS.huskGreen,
          borderRadius: (cobW + 6) / 2,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 4,
          elevation: 4,
        }}>
        <View
          style={{
            position: 'absolute',
            left: -2,
            width: cobW + 2,
            height: cobH + 4,
            backgroundColor: COLORS.huskDark,
            borderRadius: (cobW + 2) / 2,
            opacity: 0.5,
          }}
        />
        <View
          style={{
            width: cobW,
            height: cobH,
            backgroundColor: COLORS.cornYellow,
            borderRadius: cobW / 2,
            overflow: 'hidden',
          }}>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <View
              key={rowIndex}
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                height: cobH / 6,
              }}>
              {Array.from({ length: 3 }).map((_, colIndex) => (
                <View
                  key={colIndex}
                  style={{
                    width: cobW / 3.5,
                    height: cobH / 7,
                    backgroundColor:
                      (rowIndex + colIndex) % 2 === 0 ? COLORS.cornYellow : COLORS.cornGold,
                    borderRadius: 2,
                    margin: 0.5,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={{ position: 'absolute', top: -8, flexDirection: 'row', gap: 1 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={index}
              style={{
                width: 1,
                height: 10 + Math.random() * 6,
                backgroundColor: COLORS.silkColor,
                borderRadius: 1,
                transform: [{ rotate: `${-15 + index * 7}deg` }],
              }}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function CornPlant({ config }: { config: CornConfig }) {
  const { x, maxHeight, delay, scale, leafCount, hasCob, swayOffset } = config;
  const progress = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 2500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    sway.value = withDelay(
      delay + 2000 + swayOffset,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [delay, progress, sway, swayOffset]);

  const stemStyle = useAnimatedStyle(() => {
    const height = interpolate(progress.value, [0, 1], [0, maxHeight]);
    const width = interpolate(progress.value, [0, 0.2, 1], [0, 3 * scale, 4.5 * scale]);
    const swayRotation = sway.value * 2;

    return {
      width,
      height,
      transform: [{ rotate: `${swayRotation}deg` }, { translateX: sway.value * 1.5 }],
    };
  });

  const tasselStyle = useAnimatedStyle(() => {
    const tasselProgress = interpolate(progress.value, [0.7, 0.9, 1], [0, 0, 1], 'clamp');
    const swayRotation = sway.value * 4;

    return {
      opacity: tasselProgress,
      transform: [{ scaleY: tasselProgress }, { rotate: `${swayRotation}deg` }],
    };
  });

  const rootStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15], [0, 1], 'clamp'),
  }));

  return (
    <View style={[styles.cornContainer, { left: x - (8 * scale) / 2, bottom: 0 }]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: -4,
            width: 20 * scale,
            height: 8 * scale,
            alignSelf: 'center',
          },
          rootStyle,
        ]}>
        {[-1, 0, 1].map((dir) => (
          <View
            key={dir}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 10 * scale + dir * 4 * scale,
              width: 2 * scale,
              height: 6 * scale,
              backgroundColor: COLORS.stemDark,
              borderRadius: 2,
              transform: [{ rotate: `${dir * 25}deg` }],
            }}
          />
        ))}
      </Animated.View>

      <Animated.View
        style={[
          {
            backgroundColor: COLORS.stemGreen,
            borderRadius: 3,
            alignSelf: 'center',
            borderWidth: 0.5,
            borderLeftColor: COLORS.stemDark,
            borderRightColor: COLORS.leafLight,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            shadowColor: COLORS.leafLight,
            shadowOpacity: 0.3,
            shadowRadius: 3,
          },
          stemStyle,
        ]}
      />

      {Array.from({ length: leafCount }).map((_, index) => {
        const side = index % 2 === 0 ? 1 : -1;
        const posFromBottom = (maxHeight / (leafCount + 1)) * (index + 1);
        const leafLen = (28 + index * 5) * scale;
        const leafH = (8 + index * 2) * scale;

        return (
          <AnimatedLeaf
            key={index}
            index={index}
            side={side}
            posFromBottom={posFromBottom}
            leafLen={leafLen}
            leafH={leafH}
            progress={progress}
            swayOffset={swayOffset}
          />
        );
      })}

      {hasCob && <AnimatedCob maxHeight={maxHeight} scale={scale} progress={progress} />}

      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: maxHeight,
            alignSelf: 'center',
            alignItems: 'center',
          },
          tasselStyle,
        ]}>
        {[-2, -1, 0, 1, 2].map((index) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              width: 1.5 * scale,
              height: (12 - Math.abs(index) * 2) * scale,
              backgroundColor: index === 0 ? COLORS.cornYellow : COLORS.gold,
              borderRadius: 2,
              transform: [{ rotate: `${index * 12}deg` }, { translateY: Math.abs(index) * 2 }],
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
}

function PollenParticle({ startX, startY, delay }: { startX: number; startY: number; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      3000 + delay,
      withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, false)
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => {
    const x = startX + Math.sin(progress.value * Math.PI * 2) * 30 + progress.value * 20;
    const y = startY + progress.value * 100;
    const opacity = interpolate(progress.value, [0, 0.1, 0.9, 1], [0, 0.6, 0.6, 0]);

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: COLORS.gold,
      opacity,
    };
  });

  return <Animated.View style={style} />;
}

function PollenParticles() {
  const particles = Array.from({ length: 12 }, (_, index) => ({
    id: index,
    startX: Math.random() * SCREEN_W,
    startY: SCREEN_H * 0.3 + Math.random() * SCREEN_H * 0.2,
  }));

  return (
    <>
      {particles.map((particle) => (
        <PollenParticle
          key={particle.id}
          startX={particle.startX}
          startY={particle.startY}
          delay={particle.id * 400}
        />
      ))}
    </>
  );
}

function Firefly({
  startX,
  startY,
  delay,
  size,
  drift,
  duration,
}: {
  startX: number;
  startY: number;
  delay: number;
  size: number;
  drift: number;
  duration: number;
}) {
  const progress = useSharedValue(0);
  const blink = useSharedValue(0.3);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true)
    );

    blink.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900 + Math.random() * 500 }),
          withTiming(0.25, { duration: 1100 + Math.random() * 700 })
        ),
        -1,
        true
      )
    );
  }, [blink, delay, duration, progress]);

  const glowStyle = useAnimatedStyle(() => {
    const x = startX + Math.sin(progress.value * Math.PI * 2) * drift;
    const y = startY + Math.cos(progress.value * Math.PI * 2) * (drift * 0.55);
    const scale = interpolate(blink.value, [0.25, 1], [0.8, 1.45]);
    const opacity = interpolate(blink.value, [0.25, 1], [0.2, 0.95]);

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#f7f29b',
      opacity,
      shadowColor: '#fff6a8',
      shadowOpacity: opacity,
      shadowRadius: 10,
      elevation: 8,
      transform: [{ scale }],
    };
  });

  const haloStyle = useAnimatedStyle(() => {
    const x = startX + Math.sin(progress.value * Math.PI * 2) * drift - size * 1.6;
    const y = startY + Math.cos(progress.value * Math.PI * 2) * (drift * 0.55) - size * 1.6;
    const haloOpacity = interpolate(blink.value, [0.25, 1], [0.05, 0.28]);
    const haloScale = interpolate(blink.value, [0.25, 1], [0.9, 1.35]);
    const haloSize = size * 4.2;

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      width: haloSize,
      height: haloSize,
      borderRadius: haloSize / 2,
      backgroundColor: '#f5e663',
      opacity: haloOpacity,
      transform: [{ scale: haloScale }],
    };
  });

  return (
    <>
      <Animated.View pointerEvents="none" style={haloStyle} />
      <Animated.View pointerEvents="none" style={glowStyle} />
    </>
  );
}

function Fireflies() {
  return (
    <>
      {FIREFLIES.map((firefly) => (
        <Firefly key={firefly.id} {...firefly} />
      ))}
    </>
  );
}

interface LoginBackgroundProps {
  moonStyle: AnimatedStyle<any>;
  moonGlowStyle: AnimatedStyle<any>;
}

export function LoginBackground({ moonStyle, moonGlowStyle }: LoginBackgroundProps) {
  return (
    <>
      <View style={styles.sky}>
        <View style={styles.skyGrad1} />
        <View style={styles.skyGrad2} />
        <View style={styles.skyGrad3} />
      </View>

      {STARS.map((star) => (
        <AnimatedStar key={star.id} star={star} />
      ))}

      <Animated.View style={[styles.moon, moonStyle]}>
        <View style={styles.moonInner}>
          <View style={[styles.crater, { top: 8, left: 10, width: 8, height: 8 }]} />
          <View style={[styles.crater, { top: 20, left: 25, width: 5, height: 5 }]} />
          <View style={[styles.crater, { top: 30, left: 12, width: 6, height: 6 }]} />
        </View>
        <Animated.View style={[styles.moonGlow, moonGlowStyle]} />
      </Animated.View>

      <PollenParticles />
      <Fireflies />

      <View style={styles.ground}>
        <View style={styles.groundTop} />
        <View style={styles.groundMid} />
        <View style={styles.soilLines}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={[styles.soilLine, { opacity: 0.4 - index * 0.08 }]} />
          ))}
        </View>
      </View>

      <View style={styles.fog} />
      <View style={styles.fogLight} />

      <View style={styles.cornField} pointerEvents="none">
        {CORN_PLANTS.map((config) => (
          <CornPlant key={config.id} config={config} />
        ))}
      </View>
    </>
  );
}
