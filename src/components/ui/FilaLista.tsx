import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { IconoTono, type NombreIcono } from './IconoTono';
import { Pill } from './Pill';
import { coloresTono, textoBadge, type Tono } from './tonos';

import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';

export interface FilaListaProps {
  titulo: string;
  /** Segunda línea (estado, descripción corta). */
  subtitulo?: string | null;
  /** Etiqueta pequeña ARRIBA del título (modo dato: «Puesto» → «Gerente»). */
  etiqueta?: string;
  icono?: NombreIcono;
  tono?: Tono;
  /** Color del subtítulo según el tono (estado del documento). */
  subtituloConTono?: boolean;
  /** Chip a la derecha (estado). */
  pill?: { texto: string; tono?: Tono; icono?: NombreIcono };
  /** Contador a la derecha (no leídas, pendientes). 0 = no se muestra. */
  badge?: number;
  /** Valor corto a la derecha («$1,200», «12 días»). */
  valor?: string;
  onPress?: () => void;
  /** Sin separador inferior (última fila del grupo). */
  ultima?: boolean;
  accessibilityLabel?: string;
  /** Haptic ligero al tocar (default false: las listas se tocan mucho). */
  haptic?: boolean;
}

/**
 * Fila de lista estándar (Material 3 «list item» / iOS «inset grouped»):
 * ícono en squircle + título + subtítulo + trailing (pill, badge, valor y
 * chevron si es tocable). Mínimo 56 dp de alto; el área táctil es la fila
 * completa. Úsala dentro de `GrupoLista`.
 */
export function FilaLista({
  titulo,
  subtitulo,
  etiqueta,
  icono,
  tono = 'primario',
  subtituloConTono = false,
  pill,
  badge,
  valor,
  onPress,
  ultima = false,
  accessibilityLabel,
  haptic = false,
}: FilaListaProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const badgeTexto = textoBadge(badge);
  const colorSubtitulo = subtituloConTono ? { color: coloresTono(Colors, tono).texto } : null;

  const contenido = (
    <>
      {icono ? <IconoTono icono={icono} tono={tono} tamano={etiqueta ? 36 : 40} /> : null}
      <View style={styles.textos}>
        {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}
        <Text style={[styles.titulo, etiqueta ? styles.tituloDato : null]}>{titulo}</Text>
        {subtitulo ? <Text style={[styles.subtitulo, colorSubtitulo]}>{subtitulo}</Text> : null}
      </View>
      {pill ? <Pill texto={pill.texto} tono={pill.tono} icono={pill.icono} /> : null}
      {valor ? <Text style={styles.valor}>{valor}</Text> : null}
      {badgeTexto ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>{badgeTexto}</Text>
        </View>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.fila, !ultima && styles.separador]} accessible accessibilityLabel={accessibilityLabel ?? [etiqueta, titulo, subtitulo].filter(Boolean).join(': ')}>
        {contenido}
      </View>
    );
  }

  return (
    <PressableScale
      haptic={haptic}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? [titulo, subtitulo, pill?.texto, badgeTexto ? `${badgeTexto} nuevos` : null].filter(Boolean).join('. ')}
      rippleColor={Colors.surfaceMuted}
      style={[styles.fila, !ultima && styles.separador]}>
      {contenido}
    </PressableScale>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      minHeight: 60,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    separador: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.divider,
    },
    textos: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    etiqueta: {
      fontSize: FontSize.xs,
      fontWeight: '600',
      color: Colors.textMuted,
    },
    titulo: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: Colors.text,
    },
    tituloDato: {
      fontWeight: '600',
    },
    subtitulo: {
      fontSize: FontSize.sm,
      color: Colors.textMuted,
      lineHeight: 18,
    },
    valor: {
      fontSize: FontSize.md,
      fontWeight: '800',
      color: Colors.primaryDark,
    },
    badge: {
      minWidth: 24,
      height: 24,
      borderRadius: Radius.full,
      paddingHorizontal: 6,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeTexto: {
      fontSize: FontSize.xs,
      fontWeight: '800',
      color: Colors.white,
    },
  });
