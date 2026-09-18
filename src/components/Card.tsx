import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from './PressableScale';

import { Colors, Radius, Shadow, Spacing } from '@/constants/colors';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** Con `onPress`, la tarjeta se siente "premium" (scale + haptic) vía `PressableScale` — mismo feedback táctil que el resto de la app. */
export function Card({ children, onPress, style, padded = true }: CardProps) {
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.card, padded && styles.padded, style]}>
        {children}
      </PressableScale>
    );
  }

  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
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
