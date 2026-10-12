import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useOrganigramaInduccion } from '@/hooks/queries/useInduccion';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { MiniOrganigramaNodo } from '@/types/induccion';

/** Profundidad abierta al cargar; los niveles más bajos se despliegan al tocar. */
const NIVELES_ABIERTOS = 1;

/**
 * Mini-organigrama VIGENTE (capítulo 4): puesto real + quién lo ocupa hoy +
 * puestos que dependen de él, tal como lo manda el backend
 * (`MiniOrganigramaService`). Nunca una imagen fija ni personas a mano.
 * En el teléfono se muestra como lista jerárquica (un árbol ancho no se lee
 * en 360 px).
 */
export function MiniOrganigrama({ vista, titulo, nota }: { vista: string; titulo: string; nota: string | null }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const query = useOrganigramaInduccion(vista);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="git-network-outline" size={18} color={Colors.primary} />
        <Text style={styles.titulo}>{titulo}</Text>
      </View>
      {nota ? <Text style={styles.nota}>{nota}</Text> : null}

      {query.isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : query.isError ? (
        <PressableScale accessibilityRole="button" onPress={() => void query.refetch()} style={styles.reintentar}>
          <Text style={styles.nota}>No pudimos cargar este organigrama. Toca para reintentar.</Text>
        </PressableScale>
      ) : query.data ? (
        <NodoOrganigrama nodo={query.data} nivel={0} />
      ) : (
        <Text style={styles.nota}>Esta estructura todavía no está configurada en el sistema.</Text>
      )}
    </Card>
  );
}

function NodoOrganigrama({ nodo, nivel }: { nodo: MiniOrganigramaNodo; nivel: number }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const [abierto, setAbierto] = useState(nivel < NIVELES_ABIERTOS);
  const tieneHijos = nodo.hijos.length > 0;
  const ocupantes = nodo.ocupantes.map((o) => o.nombre);

  return (
    <View style={[styles.nodo, nivel > 0 && styles.nodoHijo]}>
      <PressableScale
        haptic={false}
        disabled={!tieneHijos}
        accessibilityRole={tieneHijos ? 'button' : 'none'}
        accessibilityLabel={`${nodo.nombre}${ocupantes.length ? `, ${ocupantes.join(', ')}` : ', vacante'}${tieneHijos ? (abierto ? ', contraer' : ', desplegar') : ''}`}
        onPress={() => setAbierto((v) => !v)}
        style={[styles.fila, nivel === 0 && styles.filaRaiz]}>
        <View style={styles.filaTexto}>
          <Text style={[styles.puesto, nivel === 0 && styles.puestoRaiz]}>{nodo.nombre}</Text>
          <Text style={[styles.ocupante, nivel === 0 && styles.ocupanteRaiz]} numberOfLines={2}>
            {ocupantes.length > 0 ? ocupantes.join(' · ') : 'Vacante'}
          </Text>
        </View>
        {tieneHijos ? (
          <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={18} color={nivel === 0 ? Colors.textInverse : Colors.textMuted} />
        ) : null}
      </PressableScale>
      {abierto && tieneHijos ? (
        <View style={styles.hijos}>
          {nodo.hijos.map((hijo) => (
            <NodoOrganigrama key={hijo.id} nodo={hijo} nivel={nivel + 1} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    card: { gap: Spacing.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    titulo: { flex: 1, fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    nota: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    loading: { paddingVertical: Spacing.lg },
    reintentar: { minHeight: 44, justifyContent: 'center' },
    nodo: { gap: Spacing.xs },
    nodoHijo: {
      marginLeft: Spacing.md,
      paddingLeft: Spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: Colors.secondarySoft,
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 44,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    filaRaiz: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filaTexto: { flex: 1, minWidth: 0 },
    puesto: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
    puestoRaiz: { color: Colors.textInverse, fontSize: FontSize.md },
    ocupante: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
    ocupanteRaiz: { color: Colors.secondarySoft },
    hijos: { gap: Spacing.xs, marginTop: Spacing.xs },
  });
