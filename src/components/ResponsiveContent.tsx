import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Layout } from '@/constants/colors';

export interface ResponsiveContentProps {
  children: React.ReactNode;
  /** Tope de ancho explícito; por defecto `Layout.maxContentWidth` (o `maxFormWidth` con `form`). */
  maxWidth?: number;
  /** Formularios: ancho de lectura cómodo (~560). */
  form?: boolean;
  /** Padding horizontal propio (por defecto ninguno: lo pone el ScrollView/pantalla). */
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Centra el contenido con un ancho máximo: en teléfono ocupa el 100 %; en
 * tablet (600–820 px) nunca estira cards de borde a borde. Usar DENTRO del
 * ScrollView de la pantalla, no como contenedor de toda la app.
 */
export function ResponsiveContent({ children, maxWidth, form = false, padding, style }: ResponsiveContentProps) {
  const cap = maxWidth ?? (form ? Layout.maxFormWidth : Layout.maxContentWidth);
  return <View style={[styles.base, { maxWidth: cap }, padding !== undefined && { paddingHorizontal: padding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignSelf: 'center',
  },
});
