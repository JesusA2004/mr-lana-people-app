import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Colors, FontSize } from '@/constants/colors';
import { Motion } from '@/constants/motion';

export interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  /** `ColorValue` porque así lo entrega `tabBarIcon` de expo-router/react-navigation, no siempre un `string` plano. */
  color: ColorValue;
  focused: boolean;
  size?: number;
  /** Número a mostrar en el badge (documentos pendientes, solicitudes con corrección, etc). 0/undefined = sin badge. */
  badgeCount?: number;
}

/**
 * Ícono de tab con un "bounce" discreto al seleccionarse (1 → 1.12 → 1,
 * nada de rebote exagerado) y badge numérico opcional — máximo "99+".
 */
export function TabIcon({ name, color, focused, size = 23, badgeCount }: TabIconProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!focused || reducedMotion) return;
    scale.value = withSequence(
      withTiming(Motion.scale.iconActive, { duration: Motion.duration.press }),
      withTiming(1, { duration: Motion.duration.press }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar al cambio de foco.
  }, [focused, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const badgeLabel = badgeCount && badgeCount > 0 ? (badgeCount > 99 ? '99+' : String(badgeCount)) : null;

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Ionicons name={name} size={size} color={color} />
      </Animated.View>
      {badgeLabel ? (
        <View style={styles.badge} accessibilityLabel={`${badgeLabel} pendientes`}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {badgeLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  badgeText: {
    color: Colors.white,
    fontSize: FontSize.xs - 2,
    fontWeight: '800',
  },
});
