import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

const LABEL_COLOR: Record<ButtonVariant, string> = {
  primary: Colors.white,
  secondary: Colors.white,
  outline: Colors.primary,
  ghost: Colors.primary,
  danger: Colors.white,
};

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Ícono a la izquierda del texto (Ionicons). Se oculta durante `loading` para no competir con el spinner. */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Ícono a la derecha del texto (Ionicons). */
  rightIcon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Botón base de toda la app. `loading` nunca cambia el ancho del botón: el
 * contenido (texto + íconos) se mantiene en el layout pero invisible
 * (`opacity: 0`) mientras el spinner se dibuja encima, así el botón no
 * "salta" al activarse/desactivarse el loading.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const labelColor = LABEL_COLOR[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}>
      <View style={[styles.content, loading && styles.contentHidden]}>
        {leftIcon ? <Ionicons name={leftIcon} size={18} color={labelColor} /> : null}
        <Text style={[styles.label, variantLabelStyles[variant]]} numberOfLines={1}>
          {title}
        </Text>
        {rightIcon ? <Ionicons name={rightIcon} size={18} color={labelColor} /> : null}
      </View>
      {loading ? (
        <View style={styles.spinnerOverlay} pointerEvents="none">
          <ActivityIndicator color={labelColor} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  contentHidden: {
    opacity: 0,
  },
  spinnerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.danger,
  },
});

const variantLabelStyles = StyleSheet.create({
  primary: { color: Colors.white },
  secondary: { color: Colors.white },
  outline: { color: Colors.primary },
  ghost: { color: Colors.primary },
  danger: { color: Colors.white },
});
