import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyMessage, Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { PressableScale } from '@/components/PressableScale';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useRhRecepcionCorte } from '@/hooks/queries/useRhRecepcionDocumental';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { MetricasRecepcion, SucursalRecepcion } from '@/types/recepcionDocumental';
import { parametroSucursal, textoCumplimiento } from '@/utils/recepcionDocumental';

/**
 * Detalle del periodo: métricas, sucursales (las que tienen pendientes
 * primero, orden del backend) y resumen por evento con el texto del backend
 * cuando no hubo eventos.
 */
export default function CorteRecepcionScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { corte: param } = useLocalSearchParams<{ corte: string }>();
  const corteId = Number(param);
  const query = useRhRecepcionCorte(Number.isInteger(corteId) && corteId > 0 ? corteId : null);
  const corte = query.data;

  const abrir = (sucursal: SucursalRecepcion) => router.push(`/(app)/rh/recepcion-documental/${corteId}/${parametroSucursal(sucursal.sucursal_id)}` as never);

  return (
    <Screen
      title={corte?.etiqueta ?? 'Periodo'}
      subtitle={corte ? `${corte.estado_etiqueta}${corte.fecha_inicio && corte.fecha_fin ? ` · ${corte.fecha_inicio} al ${corte.fecha_fin}` : ''}` : undefined}
      isLoading={query.isLoading}
      error={query.error}
      hayDatos={Boolean(corte)}
      notFoundMessage="Este periodo ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {corte ? (
        <View style={styles.contenido}>
          <Metricas metricas={corte.metricas} />
          {corte.estado === 'cerrado' ? <Notice tone="info">Periodo cerrado: solo consulta. Para cambiar algo, RH debe reabrirlo desde el Portal Web.</Notice> : null}
          {!corte.permisos.recibir && corte.estado !== 'cerrado' ? <Notice tone="info">Tienes acceso de consulta: no puedes marcar recepciones.</Notice> : null}

          <SectionTitle>Sucursales</SectionTitle>
          {corte.sucursales.length === 0 ? (
            <EmptyMessage message={`No hay originales esperados en tus sucursales durante ${corte.etiqueta.toLowerCase()}.`} />
          ) : (
            <View style={styles.lista}>
              {corte.sucursales.map((sucursal) => (
                <FilaSucursal key={sucursal.sucursal_id ?? 'sin'} sucursal={sucursal} onPress={() => abrir(sucursal)} />
              ))}
            </View>
          )}

          <SectionTitle>Por evento</SectionTitle>
          <Card style={styles.eventos}>
            {corte.reglas.map((regla) => (
              <View key={regla.regla} style={styles.evento}>
                <Text style={styles.eventoTitulo}>{regla.etiqueta}</Text>
                <Text style={styles.eventoDetalle}>
                  {regla.metricas.renglones === 0 ? regla.sin_eventos : `${regla.metricas.recibidos} de ${regla.metricas.esperados} recibidos · ${regla.metricas.pendientes} pendientes`}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function Metricas({ metricas }: { metricas: MetricasRecepcion }) {
  const styles = useEstilos(crearEstilos);
  const items: { etiqueta: string; valor: string; destacado?: boolean }[] = [
    { etiqueta: 'Cumplimiento', valor: textoCumplimiento(metricas.cumplimiento), destacado: true },
    { etiqueta: 'Esperados', valor: String(metricas.esperados) },
    { etiqueta: 'Recibidos', valor: String(metricas.recibidos) },
    { etiqueta: 'Pendientes', valor: String(metricas.pendientes) },
    { etiqueta: 'No recibidos', valor: String(metricas.no_recibidos) },
    { etiqueta: 'Con incidencia', valor: String(metricas.incidencias) },
  ];
  return (
    <View style={styles.metricas}>
      {items.map((item) => (
        <View key={item.etiqueta} style={[styles.metrica, item.destacado ? styles.metricaDestacada : null]} accessible accessibilityLabel={`${item.etiqueta}: ${item.valor}`}>
          <Text style={styles.metricaValor}>{item.valor}</Text>
          <Text style={styles.metricaEtiqueta}>{item.etiqueta}</Text>
        </View>
      ))}
    </View>
  );
}

function FilaSucursal({ sucursal, onPress }: { sucursal: SucursalRecepcion; onPress: () => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const faltan = sucursal.metricas.pendientes + sucursal.metricas.no_recibidos;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${sucursal.nombre}: ${faltan} por recibir`} style={styles.sucursal}>
      <View style={[styles.sucursalIcono, faltan > 0 ? styles.sucursalIconoPendiente : styles.sucursalIconoListo]}>
        <Ionicons name={faltan > 0 ? 'time-outline' : 'checkmark'} size={20} color={faltan > 0 ? Colors.warning : Colors.success} />
      </View>
      <View style={styles.sucursalTextos}>
        <Text style={styles.sucursalNombre}>{sucursal.nombre}</Text>
        <Text style={styles.sucursalDetalle}>
          {faltan > 0 ? `${faltan} por recibir · ` : 'Todo recibido · '}
          {`${sucursal.metricas.recibidos} de ${sucursal.metricas.esperados} · ${textoCumplimiento(sucursal.metricas.cumplimiento)}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </PressableScale>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    contenido: { gap: Spacing.lg },
    lista: { gap: Spacing.sm },
    metricas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    metrica: { flexGrow: 1, flexBasis: '30%', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 2 },
    metricaDestacada: { backgroundColor: Colors.primarySoft, borderColor: Colors.primarySoft },
    metricaValor: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
    metricaEtiqueta: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
    sucursal: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
      minHeight: 64,
    },
    sucursalIcono: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    sucursalIconoPendiente: { backgroundColor: Colors.warningSoft },
    sucursalIconoListo: { backgroundColor: Colors.successSoft },
    sucursalTextos: { flex: 1, gap: 2 },
    sucursalNombre: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    sucursalDetalle: { fontSize: FontSize.sm, color: Colors.textMuted },
    eventos: { gap: Spacing.md },
    evento: { gap: 2 },
    eventoTitulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    eventoDetalle: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
  });
