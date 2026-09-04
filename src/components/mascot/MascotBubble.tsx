import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MascotAvatar, type MascotOrientation, type MascotSize } from './MascotAvatar';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';

export interface MascotBubbleProps {
  message: string;
  orientation?: MascotOrientation;
  size?: MascotSize;
}

/**
 * Variante minimal de la mascota: avatar + globo de texto, sin acción ni
 * cierre. Pensada para onboarding y encabezados de wizard (ver AGENTS.md
 * sección 12: "Selecciona qué tipo de trámite deseas realizar.").
 */
export function MascotBubble({ message, orientation = 'right', size = 'md' }: MascotBubbleProps) {
  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.row}>
      <MascotAvatar orientation={orientation} size={size} />
      <View style={styles.bubble}>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bubble: {
    flex: 1,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  message: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
});
