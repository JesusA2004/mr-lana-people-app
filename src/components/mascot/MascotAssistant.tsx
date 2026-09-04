import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { MascotAvatar, type MascotOrientation, type MascotSize } from './MascotAvatar';

import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export type MascotTipType = 'info' | 'success' | 'warning' | 'tip';
export type MascotPriority = 'low' | 'normal' | 'high';

const ACCENT_BY_TYPE: Record<MascotTipType, string> = {
  info: Colors.info,
  success: Colors.success,
  warning: Colors.warning,
  tip: Colors.primary,
};

export interface MascotAssistantProps {
  message: string;
  type?: MascotTipType;
  orientation?: MascotOrientation;
  size?: MascotSize;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  /** 'high' evita que el usuario la cierre y usa un borde de acento más marcado. */
  priority?: MascotPriority;
  style?: object;
}

/**
 * Asistente visual de la mascota (ver AGENTS.md sección 5-6). Úsalo de forma
 * contextual — no en todas partes — para guiar al colaborador con un mensaje
 * corto y, opcionalmente, una acción concreta.
 *
 * <MascotAssistant message="Te faltan 3 documentos..." actionLabel="Completar expediente" onAction={...} />
 */
export function MascotAssistant({
  message,
  type = 'tip',
  orientation = 'right',
  size = 'md',
  actionLabel,
  onAction,
  dismissible = true,
  priority = 'normal',
  style,
}: MascotAssistantProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const accent = ACCENT_BY_TYPE[type];
  const canDismiss = dismissible && priority !== 'high';

  return (
    <Animated.View
      entering={FadeInDown.duration(260)}
      exiting={FadeOutDown.duration(180)}
      style={[styles.container, priority === 'high' && { borderColor: accent, borderWidth: 1.5 }, style]}
      accessibilityRole="alert">
      <MascotAvatar orientation={orientation} size={size} />

      <View style={styles.body}>
        <Text style={styles.message}>{message}</Text>

        {actionLabel && onAction ? (
          <Button title={actionLabel} onPress={onAction} variant="outline" fullWidth={false} style={styles.action} />
        ) : null}
      </View>

      {canDismiss ? (
        <PressableScale
          accessibilityLabel="Cerrar sugerencia"
          onPress={() => setDismissed(true)}
          haptic={false}
          style={styles.dismiss}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.card,
  },
  body: {
    flex: 1,
    gap: Spacing.sm,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  action: {
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: Spacing.md,
  },
  dismiss: {
    padding: Spacing.xs,
  },
});
