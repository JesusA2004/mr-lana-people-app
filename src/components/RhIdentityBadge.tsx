import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/colors';

export type RhIdentityBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

/** 24 / 32 / 48 / 64 / 96 — los tamaños en los que se revisó en Design QA. */
export const RH_BADGE_DIAMETER: Record<RhIdentityBadgeSize, number> = { xs: 24, sm: 32, md: 48, lg: 64, hero: 96 };

export interface RhIdentityBadgeProps {
  size?: RhIdentityBadgeSize;
  /** Halo que "respira" (solo tiene sentido en `lg`/`hero`). Se apaga con Reduce Motion. */
  animated?: boolean;
  /**
   * Si el badge comunica contexto ("Gestión RH") pásalo aquí; sin label es
   * decorativo y queda oculto para lectores de pantalla.
   */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** `#RRGGBB` → `rgba(r,g,b,a)`; cualquier otra forma se devuelve tal cual. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const n = Number.parseInt(match[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Identidad visual de "Gestión RH": squircle en tinta RH con un grupo
 * abstracto de personas y un nodo de acento (la organización conectada),
 * más un halo exterior fino. Sin oveja, sin caras, sin emoji — se lee
 * igual a 24 px que a 96 px. La marca Mr. Lana general sigue usando su
 * logo; este badge solo identifica la experiencia administrativa.
 */
export function RhIdentityBadge({ size = 'md', animated = false, accessibilityLabel, style }: RhIdentityBadgeProps) {
  const d = RH_BADGE_DIAMETER[size];
  const reduceMotion = useReducedMotion();
  const breathe = useSharedValue(0);
  const shouldAnimate = animated && !reduceMotion && (size === 'lg' || size === 'hero');

  useEffect(() => {
    if (!shouldAnimate) {
      breathe.value = 0;
      return;
    }
    breathe.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [shouldAnimate, breathe]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 1 - breathe.value * 0.45,
    transform: [{ scale: 1 + breathe.value * 0.06 }],
  }));

  const showHalo = d >= 32;
  const showNode = d >= 32;
  const haloGap = Math.max(2, Math.round(d * 0.08));
  const outer = showHalo ? d + haloGap * 2 : d;
  const radius = Math.round(d * 0.32);
  const icon = Math.round(d * 0.52);
  const node = Math.max(6, Math.round(d * 0.2));

  return (
    <View
      style={[{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }, style]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      {showHalo ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius + haloGap,
              borderWidth: Math.max(1, Math.round(d / 40)),
              borderColor: withAlpha(Colors.rhAccent, 0.45),
              backgroundColor: withAlpha(Colors.rhAccent, 0.08),
            },
            haloStyle,
          ]}
        />
      ) : null}
      <View style={{ width: d, height: d, borderRadius: radius, backgroundColor: Colors.rhInk, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Brillo diagonal sutil: da volumen sin gradiente. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -d * 0.35,
            left: -d * 0.35,
            width: d,
            height: d,
            borderRadius: d,
            backgroundColor: withAlpha(Colors.onRhInk, 0.07),
          }}
        />
        <Ionicons name="people" size={icon} color={Colors.onRhInk} />
      </View>
      {showNode ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: haloGap - node * 0.2,
            right: haloGap - node * 0.2,
            width: node,
            height: node,
            borderRadius: node,
            backgroundColor: Colors.rhAccent,
            borderWidth: Math.max(1.5, d / 32),
            borderColor: Colors.background,
          }}
        />
      ) : null}
    </View>
  );
}
