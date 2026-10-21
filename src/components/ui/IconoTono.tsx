import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { coloresTono, type Tono } from './tonos';

import { Radius } from '@/constants/colors';
import { useColores } from '@/theme/ThemeProvider';

export type NombreIcono = keyof typeof Ionicons.glyphMap;

export interface IconoTonoProps {
  icono: NombreIcono;
  tono?: Tono;
  /** Lado del contenedor (default 40). El glifo mide ~la mitad. */
  tamano?: number;
  /** Relleno sólido (glifo blanco) en vez de fondo suave: para el aviso más importante de la pantalla. */
  solido?: boolean;
}

/** Ícono dentro de un «squircle» suave del tono: el elemento visual base de filas, tarjetas y avisos. */
export function IconoTono({ icono, tono = 'primario', tamano = 40, solido = false }: IconoTonoProps) {
  const Colors = useColores();
  const c = coloresTono(Colors, tono);
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.base, { width: tamano, height: tamano, borderRadius: tamano >= 40 ? Radius.md : Radius.sm, backgroundColor: solido ? c.texto : c.fondo }]}>
      <Ionicons name={icono} size={Math.round(tamano * 0.5)} color={solido ? Colors.white : c.texto} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
