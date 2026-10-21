import { Children, isValidElement, cloneElement, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { SeccionTitulo, type SeccionTituloProps } from './SeccionTitulo';

import { Radius, Shadow, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

export interface GrupoListaProps {
  /** Encabezado de la sección (opcional). */
  titulo?: string;
  descripcion?: string;
  accion?: SeccionTituloProps['accion'];
  children: React.ReactNode;
}

/**
 * Lista agrupada en una sola tarjeta (iOS «inset grouped» / M3 list en
 * surface). Marca sola la última `FilaLista` como `ultima` (sin separador).
 * Nada de tarjeta dentro de tarjeta: las filas son planas.
 */
export function GrupoLista({ titulo, descripcion, accion, children }: GrupoListaProps) {
  const styles = useEstilos(crearEstilos);
  const filas = Children.toArray(children).filter(isValidElement) as ReactElement<{ ultima?: boolean }>[];

  return (
    <View style={styles.seccion}>
      {titulo ? <SeccionTitulo titulo={titulo} descripcion={descripcion} accion={accion} /> : null}
      <View style={styles.tarjeta}>{filas.map((fila, i) => (i === filas.length - 1 ? cloneElement(fila, { ultima: true }) : fila))}</View>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    seccion: {
      gap: Spacing.md,
    },
    tarjeta: {
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: 'hidden',
      ...Shadow.sm,
    },
  });
