import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, Layout, Shadow, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

/** Margen que siempre queda entre los botones y el borde inferior (o la barra de navegación). */
export const MARGEN_BARRA_INFERIOR = Spacing.md;

/**
 * Padding inferior de la barra: el inset del sistema (barra de gestos o de
 * 3 botones de Android, home indicator de iOS) MÁS un margen fijo. Sin
 * barra de navegación (inset 0) los botones quedan abajo con solo el
 * margen; con barra, suben exactamente lo que mide.
 */
export function paddingInferiorBarra(insetInferior: number): number {
  return Math.max(0, insetInferior) + MARGEN_BARRA_INFERIOR;
}

/**
 * Con el teclado abierto el inset ya queda DEBAJO del teclado: la barra se
 * desplaza ese mismo inset hacia abajo para quedar pegada al teclado (solo
 * con el margen) en vez de flotar con un hueco del alto de la barra del sistema.
 */
export function desplazamientoConTeclado(insetInferior: number): number {
  return Math.max(0, insetInferior);
}

export interface BarraAccionInferiorProps {
  /** Botones (Aceptar / Confirmar / Siguiente / Guardar…). Uno primario por barra. */
  children: React.ReactNode;
  /** Texto corto encima de los botones (p. ej. por qué el botón está deshabilitado). */
  nota?: string;
  /** Botones lado a lado (Atrás | Siguiente) en vez de apilados. */
  fila?: boolean;
  /** Sube con el teclado (default). Desactívalo en pantallas sin campos de texto. */
  sobreTeclado?: boolean;
  /** Avisa el alto real medido (para dar `bottomOffset` al scroll y que nada quede tapado). */
  onAltura?: (altura: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Barra fija de acciones al pie de la pantalla — ÚNICO lugar donde se
 * resuelve el safe area inferior de los botones de acción en la app:
 *
 * - Respeta `insets.bottom` (react-native-safe-area-context) + margen: los
 *   botones nunca chocan con la barra de navegación del teléfono.
 * - Sube sobre el teclado (`KeyboardStickyView` de
 *   react-native-keyboard-controller) para que «Siguiente/Guardar» siga a la
 *   vista mientras se escribe.
 * - Fondo `surface` con borde superior y sombra mínima: se separa del
 *   contenido que pasa por debajo.
 *
 * Úsala como hermana del scroll (no dentro): ver `Screen` (prop `footer`) y
 * `FormularioScroll`. Ejemplo:
 *
 * ```tsx
 * <BarraAccionInferior fila>
 *   <Button title="Atrás" variant="outline" onPress={atras} />
 *   <Button title="Siguiente" onPress={siguiente} />
 * </BarraAccionInferior>
 * ```
 */
export function BarraAccionInferior({ children, nota, fila = false, sobreTeclado = true, onAltura, style, testID }: BarraAccionInferiorProps) {
  const styles = useEstilos(crearEstilos);
  const insets = useSafeAreaInsets();

  const medir = (event: LayoutChangeEvent) => onAltura?.(event.nativeEvent.layout.height);

  return (
    <KeyboardStickyView enabled={sobreTeclado} offset={{ closed: 0, opened: desplazamientoConTeclado(insets.bottom) }}>
      <View
        testID={testID}
        onLayout={medir}
        style={[styles.barra, { paddingBottom: paddingInferiorBarra(insets.bottom) }, style]}>
        <View style={styles.interior}>
          {nota ? (
            <Text style={styles.nota} accessibilityLiveRegion="polite">
              {nota}
            </Text>
          ) : null}
          <View style={fila ? styles.fila : styles.columna}>{children}</View>
        </View>
      </View>
    </KeyboardStickyView>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    barra: {
      backgroundColor: Colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors.border,
      paddingTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      ...Shadow.sm,
    },
    interior: {
      width: '100%',
      maxWidth: Layout.maxFormWidth,
      alignSelf: 'center',
      gap: Spacing.sm,
    },
    nota: {
      fontSize: FontSize.sm,
      color: Colors.textMuted,
      textAlign: 'center',
    },
    fila: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    columna: {
      gap: Spacing.sm,
    },
  });
