import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ItemCard } from '@/components/ciclo/ItemCard';
import { Screen, SectionTitle } from '@/components/ciclo/Screen';
import { StepTimeline } from '@/components/ciclo/StepTimeline';
import { ElegibilidadPrestamoResumen } from '@/components/ElegibilidadPrestamoResumen';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { useMisPrestamos } from '@/hooks/queries/useCicloLaboral';
import { usePrestamoElegibilidad } from '@/hooks/queries/useCorrecciones';
import { useSolicitudes } from '@/hooks/queries/useSolicitudes';
import { formatDateShort } from '@/utils/dates';
import { formatCurrencyMXN } from '@/utils/formatters';
import { prestamoEstadoBadge, prestamoEstadoLabel } from '@/utils/loan';
import { loanRequestsInProgress, loanStagesToTimeline } from '@/utils/loanRequest';
import { vistaElegibilidad } from '@/utils/prestamoElegibilidad';

/**
 * Préstamos del colaborador:
 * 1) solicitudes en trámite con su avance real (visto bueno → RH → firma,
 *    calculado por el backend), 2) préstamos autorizados.
 * Solicitar = pantalla mínima de monto + motivo. Sin la antigüedad mínima
 * (6 meses, la decide el backend) no hay botón: se muestra el aviso con la
 * fecha en que podrá solicitarlo. Sin respuesta de elegibilidad (backend
 * anterior o red) el botón sigue y el backend valida con 422.
 */
export default function MisPrestamosScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const prestamosQuery = useMisPrestamos();
  const solicitudesQuery = useSolicitudes();
  const prestamos = prestamosQuery.data ?? [];
  const enTramite = loanRequestsInProgress(solicitudesQuery.data);
  const vacio = prestamos.length === 0 && enTramite.length === 0;
  const elegibilidad = usePrestamoElegibilidad();
  const puedeSolicitar = vistaElegibilidad(elegibilidad.data).botonHabilitado;
  const irASolicitar = () => router.push('/prestamos/solicitar' as never);

  const refetch = () => {
    void prestamosQuery.refetch();
    void solicitudesQuery.refetch();
    void elegibilidad.refetch();
  };

  return (
    <Screen
      title="Préstamos"
      isLoading={prestamosQuery.isLoading || solicitudesQuery.isLoading}
      error={prestamosQuery.error}
      notFoundMessage="Tu cuenta todavía no está vinculada a un expediente de colaborador."
      onRetry={refetch}
      refreshing={prestamosQuery.isRefetching || solicitudesQuery.isRefetching}
      onRefresh={refetch}>
      {!puedeSolicitar ? <ElegibilidadPrestamoResumen elegibilidad={elegibilidad.data} /> : null}
      {vacio ? (
        <Card>
          <EmptyState
            icon="cash-outline"
            title="No tienes préstamos activos"
            message={puedeSolicitar ? 'Puedes solicitar uno directamente desde People. Aquí verás su avance y documentos.' : 'Cuando cumplas la antigüedad mínima podrás solicitarlo aquí y ver su avance y documentos.'}
            actionLabel={puedeSolicitar ? 'Solicitar préstamo' : undefined}
            onAction={puedeSolicitar ? irASolicitar : undefined}
          />
        </Card>
      ) : (
        <>
          {puedeSolicitar ? <Button title="Solicitar préstamo" leftIcon="add-circle-outline" onPress={irASolicitar} /> : null}

          {enTramite.length > 0 ? (
            <View style={styles.section}>
              <SectionTitle>En trámite</SectionTitle>
              {enTramite.map((solicitud) => (
                <Card key={String(solicitud.id)} onPress={() => router.push({ pathname: '/solicitud/[id]', params: { id: String(solicitud.id) } })} style={styles.tramite}>
                  <View style={styles.tramiteHeader}>
                    <View style={styles.flex}>
                      <Text style={styles.amount}>{formatCurrencyMXN(solicitud.prestamo?.monto_solicitado ?? null)}</Text>
                      {solicitud.creada_en ? <Text style={styles.meta}>Solicitado el {formatDateShort(solicitud.creada_en)}</Text> : null}
                    </View>
                    <StatusBadge status={solicitud.estado} label={solicitud.estado_etiqueta} />
                  </View>
                  {solicitud.prestamo?.etapas.length ? <StepTimeline items={loanStagesToTimeline(solicitud.prestamo.etapas)} /> : null}
                  {solicitud.motivo_rechazo ? <Text style={styles.rechazo}>Motivo: {solicitud.motivo_rechazo}</Text> : null}
                </Card>
              ))}
            </View>
          ) : null}

          {prestamos.length > 0 ? (
            <View style={styles.section}>
              <SectionTitle>Mis préstamos</SectionTitle>
              {prestamos.map((prestamo) => (
                <ItemCard
                  key={prestamo.id}
                  icon="cash-outline"
                  kicker={prestamo.folio}
                  title={formatCurrencyMXN(prestamo.monto_autorizado ?? prestamo.monto_solicitado)}
                  subtitle={prestamo.plazo_autorizado !== null ? `${prestamo.plazo_autorizado} pagos${prestamo.periodicidad ? ` · ${prestamo.periodicidad}` : ''}` : null}
                  lines={[prestamo.fecha_solicitud ? `Solicitado el ${formatDateShort(prestamo.fecha_solicitud)}` : null]}
                  status={prestamoEstadoBadge(prestamo.estado)}
                  statusLabel={prestamoEstadoLabel(prestamo.estado)}
                  onPress={() => router.push({ pathname: '/prestamos/[id]', params: { id: String(prestamo.id) } })}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  tramite: {
    gap: Spacing.md,
  },
  tramiteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  amount: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  rechazo: {
    fontSize: FontSize.sm,
    color: Colors.danger,
  },
});
