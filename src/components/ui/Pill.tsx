import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { NombreIcono } from './IconoTono';
import { coloresTono, type Tono } from './tonos';

import { FontSize, Radius, Spacing } from '@/constants/colors';
import { useColores } from '@/theme/ThemeProvider';

export interface PillProps {
  texto: string;
  tono?: Tono;
  icono?: NombreIcono;
}

/**
 * Chip de estado (ícono + texto, nunca solo color): «Pendiente», «Aprobado»,
 * «Esperando jefe directo», «3 nuevas». Solo informa — no es tocable.
 */
export function Pill({ texto, tono = 'primario', icono }: PillProps) {
  const Colors = useColores();
  const c = coloresTono(Colors, tono);
  return (
    <View style={[styles.pill, { backgroundColor: c.fondo }]} accessibilityRole="text" accessibilityLabel={texto}>
      {icono ? <Ionicons name={icono} size={13} color={c.texto} /> : null}
      <Text style={[styles.texto, { color: c.texto }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  texto: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    flexShrink: 1,
  },
});
