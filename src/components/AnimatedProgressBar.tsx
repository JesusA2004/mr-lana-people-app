import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Colors, Radius } from '@/constants/colors';
import { Motion } from '@/constants/motion';

export interface AnimatedProgressBarProps {
  /** 0 a 100. */
  percent: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function AnimatedProgressBar({
  percent,
  color = Colors.primary,
  trackColor = Colors.surfaceMuted,
  height = 8,
}: AnimatedProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clamped, { duration: Motion.duration.slow, easing: Easing.out(Easing.cubic) });
  }, [clamped, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View
      style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}>
      <Animated.View style={[styles.fill, { backgroundColor: color, borderRadius: height / 2 }, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
