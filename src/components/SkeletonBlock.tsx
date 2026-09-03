import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius } from '@/constants/colors';

export interface SkeletonBlockProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}

/** Bloque de carga con pulso discreto, usado en los skeletons de las pantallas. */
export function SkeletonBlock({ width = '100%', height = 16, radius = Radius.sm, style }: SkeletonBlockProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.base, { width, height, borderRadius: radius }, animatedStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surfaceMuted,
  },
});

export function SkeletonCardList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={skeletonCardStyles.card}>
          <SkeletonBlock width="60%" height={14} />
          <SkeletonBlock width="90%" height={12} style={{ marginTop: 8 }} />
          <SkeletonBlock width="40%" height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

const skeletonCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
});
