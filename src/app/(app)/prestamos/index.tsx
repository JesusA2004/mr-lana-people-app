import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ItemCard } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { Spacing } from '@/constants/colors';
import { useMisPrestamos } from '@/hooks/queries/useCicloLaboral';
import { formatDateShort } from '@/utils/dates';
import { formatCurrencyMXN } from '@/utils/formatters';
import { prestamoEstadoBadge, prestamoEstadoLabel } from '@/utils/loan';

/**
 * Mis préstamos — `GET /colaborador/prestamos`. La SOLICITUD de préstamo
 * sigue entrando por Solicitudes (tipo `prestamo`): un préstamo aparece
 * aquí cuando RH/Dirección lo autoriza. Mientras tanto se sigue en
 * "Mis solicitudes".
 */
export default function MisPrestamosScreen() {
  const router = useRouter();
  const query = useMisPrestamos();
  const prestamos = query.data ?? [];

  return (
    <Screen
      title="Mis préstamos"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Tu cuenta todavía no está vinculada a un expediente de colaborador."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      <Notice tone="info">
        Para pedir un préstamo crea una solicitud de tipo «Préstamo interno». Tu jefe inmediato da el visto bueno y después RH/Dirección autoriza
        monto y plazo.
      </Notice>
      <Button title="Solicitar préstamo" leftIcon="add-circle-outline" onPress={() => router.push('/solicitud/nueva')} />
      {prestamos.length === 0 ? (
        <EmptyMessage message="No tienes préstamos autorizados. Las solicitudes en revisión aparecen en Mis solicitudes." />
      ) : (
        <View style={styles.list}>
          {prestamos.map((prestamo) => (
            <ItemCard
              key={prestamo.id}
              icon="cash-outline"
              kicker={prestamo.folio}
              title={formatCurrencyMXN(prestamo.monto_autorizado ?? prestamo.monto_solicitado)}
              subtitle={prestamo.plazo_autorizado !== null ? `${prestamo.plazo_autorizado} pagos · ${prestamo.periodicidad ?? ''}` : null}
              lines={[prestamo.fecha_solicitud ? `Solicitado el ${formatDateShort(prestamo.fecha_solicitud)}` : null]}
              status={prestamoEstadoBadge(prestamo.estado)}
              statusLabel={prestamoEstadoLabel(prestamo.estado)}
              onPress={() => router.push({ pathname: '/prestamos/[id]', params: { id: String(prestamo.id) } })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
});
