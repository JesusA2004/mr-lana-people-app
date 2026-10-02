import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { MiProceso } from '@/types/miProceso';
import { rutaDeDestino } from '@/utils/miProceso';

/**
 * "Lo que necesitas hacer" del Inicio. Pinta EXACTAMENTE lo que manda
 * `GET /colaborador/mi-proceso` (títulos, textos y botones); la app no
 * calcula etapa ni acción. Si no hay nada pendiente no ocupa espacio.
 */
export function LoQueNecesitasHacer({
  data,
  isLoading,
  isError,
  onRetry,
}: {
  data: MiProceso | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();

  if (isLoading) {
    return <SkeletonBlock height={120} radius={Radius.lg} />;
  }

  if (isError) {
    return (
      <Card style={styles.card} onPress={onRetry}>
        <Text style={styles.titulo}>Lo que necesitas hacer</Text>
        <Text style={styles.texto}>No pudimos cargar tus pendientes. Toca para reintentar.</Text>
      </Card>
    );
  }

  if (!data || data.pendientes.length === 0) {
    return null;
  }

  const docs = data.documentos;
  const porcentaje = docs && docs.requeridos > 0 ? Math.round((docs.aprobados / docs.requeridos) * 100) : null;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.icon}>
          <Ionicons name="checkbox-outline" size={16} color={Colors.primaryDark} />
        </View>
        <Text style={styles.titulo}>Lo que necesitas hacer</Text>
      </View>

      {porcentaje !== null ? (
        <View style={styles.docs}>
          <AnimatedProgressBar percent={porcentaje} />
          <Text style={styles.texto}>
            {docs?.aprobados ?? 0} de {docs?.requeridos ?? 0} documentos aprobados
          </Text>
        </View>
      ) : null}

      {data.pendientes.map((p, index) => (
        <View key={p.clave} style={[styles.item, index > 0 && styles.itemDivider]}>
          <Ionicons
            name={p.tipo === 'accion' ? 'arrow-forward-circle' : 'time-outline'}
            size={20}
            color={p.tipo === 'accion' ? Colors.primary : Colors.textMuted}
          />
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{p.titulo}</Text>
            {p.descripcion ? <Text style={styles.texto}>{p.descripcion}</Text> : null}
            {p.detalle.length > 0 ? <Text style={styles.detalle}>{p.detalle.join(' · ')}</Text> : null}
            {p.accion?.destino ? (
              <Button
                title={p.accion.etiqueta}
                variant="outline"
                rightIcon="arrow-forward"
                fullWidth={false}
                style={styles.cta}
                onPress={() => {
                  const destino = p.accion?.destino;
                  if (destino) router.push(rutaDeDestino(destino));
                }}
              />
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      gap: Spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    icon: {
      width: 28,
      height: 28,
      borderRadius: Radius.full,
      backgroundColor: Colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titulo: {
      fontSize: FontSize.md,
      fontWeight: '800',
      color: Colors.text,
    },
    docs: {
      gap: Spacing.xs,
    },
    item: {
      flexDirection: 'row',
      gap: Spacing.md,
      paddingTop: Spacing.sm,
    },
    itemDivider: {
      borderTopWidth: 1,
      borderTopColor: Colors.divider,
      paddingTop: Spacing.md,
    },
    itemText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    itemTitle: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: Colors.text,
    },
    texto: {
      fontSize: FontSize.sm,
      color: Colors.textMuted,
    },
    detalle: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
    },
    cta: {
      alignSelf: 'flex-start',
      marginTop: Spacing.sm,
    },
  });
