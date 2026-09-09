import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/colors';

export interface SuccessCheckProps {
  size?: number;
}

/** Check animado (escala con leve "overshoot") para pantallas de éxito — solicitud enviada, documento subido, etc. */
export function SuccessCheck({ size = 96 }: SuccessCheckProps) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.08, { duration: 260, easing: Easing.out(Easing.back(1.4)) }),
      withTiming(1, { duration: 140 }),
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, animatedStyle]}>
      <Ionicons name="checkmark" size={size * 0.5} color={Colors.white} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
