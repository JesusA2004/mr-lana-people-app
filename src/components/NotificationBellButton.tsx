import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Colors, Radius } from '@/constants/colors';
import { Motion } from '@/constants/motion';

export interface NotificationBellButtonProps {
  unreadCount?: number;
}

/** Botón de acceso a notificaciones con badge de no leídas, usado en el header del Dashboard. */
export function NotificationBellButton({ unreadCount = 0 }: NotificationBellButtonProps) {
  const router = useRouter();
  const scale = useSharedValue(1);
  const previousCount = useRef(unreadCount);

  useEffect(() => {
    // Solo "rebota" cuando SUBE el conteo (notificación nueva) — no al bajar (marcar leída).
    if (unreadCount > previousCount.current) {
      scale.value = withSequence(
        withTiming(Motion.scale.iconActive, { duration: Motion.duration.press }),
        withTiming(1, { duration: Motion.duration.press }),
      );
    }
    previousCount.current = unreadCount;
  }, [unreadCount, scale]);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
      hitSlop={10}
      onPress={() => router.push('/notificaciones')}
      style={styles.button}>
      <Ionicons name="notifications-outline" size={20} color={Colors.text} />
      {unreadCount > 0 ? (
        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
