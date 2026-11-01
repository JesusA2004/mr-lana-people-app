import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Screen, SectionTitle } from '@/components/ciclo/Screen';
import { SiguientePasoCard } from '@/components/ciclo/SiguientePasoCard';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useRhBaja } from '@/hooks/queries/useRhBajas';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { formatDateLong, formatDateTime } from '@/utils/dates';

/**
 * Detalle de una baja (consulta): `GET /rh/bajas/{id}`. Sin acciones: la
 * revisión de Jurídico se retiró del flujo y Contraloría solo consulta.
 */
export default function RhBajaScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRhBaja(id);
  const baja = query.data;

  return (
    <Screen
      title="Baja"
      subtitle={baja?.folio ?? undefined}
      isLoading={query.isLoading}
      error={query.error}
      hayDatos={baja !== undefined}
      notFoundMessage="Esta baja ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {baja ? (
        <>
          <Card style={styles.gap}>
            <View style={styles.encabezado}>
              <Text style={styles.titulo} accessibilityRole="header">
                {baja.colaborador}
              </Text>
              <StatusBadge status={baja.estatus} label={baja.estatus_etiqueta ?? undefined} />
            </View>
            <InfoRow label="Número de empleado" value={baja.numero_empleado} />
            <InfoRow label="Puesto" value={baja.puesto} icon="briefcase-outline" />
            <InfoRow label="Sucursal" value={baja.sucursal} icon="location-outline" />
            <InfoRow label="Forma de salida" value={baja.forma_etiqueta} />
            <InfoRow label="Causal" value={baja.causal ?? baja.causal_nombre} />
            <InfoRow label="Fecha de baja" value={formatDateLong(baja.fecha_baja)} icon="calendar-outline" />
            <InfoRow label="Fecha de ingreso" value={formatDateLong(baja.fecha_ingreso)} />
            <InfoRow label="Recontratable" value={baja.recontratable_etiqueta} />
            <InfoRow label="Registró" value={baja.solicitado_por} />
            {baja.comentarios ? <InfoRow label="Comentarios" value={baja.comentarios} /> : null}
          </Card>

          <SiguientePasoCard paso={baja.siguiente_paso} />

          {baja.documentos.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Documentos</SectionTitle>
              {baja.documentos.map((documento, index) => (
                <View key={documento.id ?? `d${index}`} style={styles.fila}>
                  <Ionicons name={documento.cumplido ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={documento.cumplido ? Colors.success : Colors.textMuted} />
                  <Text style={styles.texto}>
                    {documento.nombre}
                    {documento.obligatorio ? '' : ' (opcional)'}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {baja.bitacora.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Bitácora</SectionTitle>
              {baja.bitacora.map((entrada) => (
                <View key={entrada.id} style={styles.entrada}>
                  <Text style={styles.texto}>{entrada.accion}</Text>
                  <Text style={styles.meta}>{[entrada.usuario, entrada.fecha ? formatDateTime(entrada.fecha) : null].filter(Boolean).join(' · ')}</Text>
                  {entrada.motivo ? <Text style={styles.meta}>{entrada.motivo}</Text> : null}
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    gap: { gap: Spacing.sm },
    encabezado: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    titulo: { flexShrink: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
    fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    entrada: { gap: 2, paddingVertical: Spacing.xs },
    texto: { flexShrink: 1, fontSize: FontSize.sm, color: Colors.text },
    meta: { fontSize: FontSize.xs, color: Colors.textMuted },
  });
