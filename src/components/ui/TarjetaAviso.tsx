import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { IconoTono, type NombreIcono } from './IconoTono';
import { coloresTono, type Tono } from './tonos';

import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';

export interface TarjetaAvisoProps {
  titulo: string;
  mensaje?: string | null;
  icono: NombreIcono;
  tono?: Tono;
  /** Texto del llamado a la acción («Completar», «Ver»). Solo si hay `onPress`. */
  accion?: string;
  onPress?: () => void;
  /** Contenido extra debajo del mensaje (p. ej. una línea de tiempo). */
  children?: React.ReactNode;
}

/**
 * Aviso accionable de alta jerarquía: «Completa tu información», «Un
 * documento necesita corrección», «Esperando a Alberto…». Ícono sólido en el
 * tono + título + mensaje + acción explícita. Toda la tarjeta es tocable (≥
 * 64 dp). Sin `onPress` es solo informativa (no se ve «activa»).
 */
export function TarjetaAviso({ titulo, mensaje, icono, tono = 'aviso', accion, onPress, children }: TarjetaAvisoProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const c = coloresTono(Colors, tono);

  const cuerpo = (
    <View style={styles.fila}>
      <IconoTono icono={icono} tono={tono} tamano={44} solido />
      <View style={styles.textos}>
        <Text style={styles.titulo}>{titulo}</Text>
        {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
        {children}
        {onPress && accion ? (
          <View style={styles.accionFila}>
            <Text style={[styles.accion, { color: Colors.primaryDark }]}>{accion}</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primaryDark} />
          </View>
        ) : null}
      </View>
    </View>
  );

  const estilo = [styles.tarjeta, { backgroundColor: c.fondo, borderColor: c.borde }];
  if (!onPress) {
    return (
      <View style={estilo} accessible accessibilityLabel={[titulo, mensaje].filter(Boolean).join('. ')}>
        {cuerpo}
      </View>
    );
  }
  return (
    <PressableScale onPress={onPress} accessibilityLabel={[titulo, mensaje, accion].filter(Boolean).join('. ')} style={estilo}>
      {cuerpo}
    </PressableScale>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    tarjeta: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      padding: Spacing.lg,
      minHeight: 64,
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
    },
    textos: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    titulo: {
      fontSize: FontSize.md,
      fontWeight: '800',
      color: Colors.text,
    },
    mensaje: {
      fontSize: FontSize.sm,
      color: Colors.text,
      lineHeight: 19,
    },
    accionFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: Spacing.xs,
    },
    accion: {
      fontSize: FontSize.sm,
      fontWeight: '800',
    },
  });
