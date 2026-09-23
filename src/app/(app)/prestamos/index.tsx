import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ItemCard } from '@/components/ciclo/ItemCard';
import { Screen, SectionTitle } from '@/components/ciclo/Screen';
import { StepTimeline } from '@/components/ciclo/StepTimeline';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useMisPrestamos } from '@/hooks/queries/useCicloLaboral';
import { useSolicitudes } from '@/hooks/queries/useSolicitudes';
import { formatDateShort } from '@/utils/dates';
import { formatCurrencyMXN } from '@/utils/formatters';
import { prestamoEstadoBadge, prestamoEstadoLabel } from '@/utils/loan';
import { loanRequestsInProgress, loanStagesToTimeline } from '@/utils/loanRequest';

/**
 * Préstamos del colaborador:
 * 1) solicitudes en trámite con su avance real (visto bueno → RH → firma,
 *    calculado por el backend), 2) préstamos autorizados.
 * Solicitar = pantalla mínima de monto + motivo.
 */
export default function MisPrestamosScreen() {
  const router = useRouter();
  const prestamosQuery = useMisPrestamos();
  const solicitudesQuery = useSolicitudes();
  const prestamos = prestamosQuery.data ?? [];
  const enTramite = loanRequestsInProgress(solicitudesQuery.data);
  const vacio = prestamos.length === 0 && enTramite.length === 0;

  const refetch = () => {
    void prestamosQuery.refetch();
    void solicitudesQuery.refetch();
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
      {vacio ? (
        <Card>
          <EmptyState
            icon="cash-outline"
            title="No tienes préstamos activos"
            message="Puedes solicitar uno directamente desde People. Aquí verás su avance y documentos."
            actionLabel="Solicitar préstamo"
            onAction={() => router.push('/prestamos/solicitar' as never)}
          />
        </Card>
      ) : (
        <>
          <Button title="Solicitar préstamo" leftIcon="add-circle-outline" onPress={() => router.push('/prestamos/solicitar' as never)} />

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

const styles = StyleSheet.create({
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
