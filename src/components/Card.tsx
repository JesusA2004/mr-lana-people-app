import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from './PressableScale';

import { Radius, Shadow, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** Con `onPress`, la tarjeta se siente "premium" (scale + haptic) vía `PressableScale` — mismo feedback táctil que el resto de la app. */
export function Card({ children, onPress, style, padded = true }: CardProps) {
  const styles = useEstilos(crearEstilos);
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.card, padded && styles.padded, style]}>
        {children}
      </PressableScale>
    );
  }

  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      ...Shadow.md,
    },
    padded: {
      padding: Spacing.lg,
    },
  });
