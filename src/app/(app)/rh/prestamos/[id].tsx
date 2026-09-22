import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PrestamoDetail } from '@/components/ciclo/PrestamoDetail';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhOperarPrestamo, useRhPrestamo } from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';
import { canGenerarDocumentosPrestamo, canResguardarPrestamo } from '@/utils/loan';

const CLAVE_LABEL: Record<string, string> = { contrato_prestamo: 'contrato de préstamo', pagare: 'pagaré' };

/**
 * Detalle RH de préstamo: generar contrato/pagaré (plantillas) y
 * resguardar (exige ambos firmados — misma guarda que el backend).
 */
export default function RhPrestamoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRhPrestamo(id);
  const prestamo = query.data;
  const bootstrap = useMobileBootstrap(true);
  const permissions = bootstrap.data?.user.permissions;
  const operar = useRhOperarPrestamo(Number(id));
  const { isOffline } = useNetworkStatus();

  const generar = () =>
    operar.mutate('generar_documentos', {
      onSuccess: ({ pendientes }) => {
        haptics.success();
        if (pendientes.length > 0) {
          toast.warning(
            `Sin plantilla configurada para: ${pendientes.map((c) => CLAVE_LABEL[c] ?? c).join(', ')}. Solicita a RH o Jurídico que cargue el formato.`,
          );
        } else {
          toast.success('Documentos del préstamo generados.');
        }
      },
      onError: (error) => {
        logError('rhPrestamo.documentos', error);
        toast.error(getActionErrorMessage(error));
      },
    });

  const resguardar = () =>
    Alert.alert('Resguardar préstamo', 'Confirmas que el contrato y el pagaré firmados quedan bajo custodia de RH.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resguardar',
        onPress: () =>
          operar.mutate('resguardar', {
            onSuccess: () => {
              haptics.success();
              toast.success('Préstamo resguardado.');
            },
            onError: (error) => {
              logError('rhPrestamo.resguardar', error);
              toast.error(getActionErrorMessage(error));
            },
          }),
      },
    ]);

  const puedeGenerar = prestamo ? canGenerarDocumentosPrestamo(prestamo, permissions) : false;
  const puedeResguardar = prestamo ? canResguardarPrestamo(prestamo, permissions) : false;

  return (
    <Screen
      title="Préstamo"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Este préstamo ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {prestamo ? (
        <>
          <PrestamoDetail
            prestamo={prestamo}
            showColaborador
            onOpenDocumento={(documento) => router.push(`/(app)/rh/documentos-laborales/${documento.id}` as never)}
          />
          {puedeGenerar || puedeResguardar ? (
            <Card>
              <SectionTitle>Acciones</SectionTitle>
              {isOffline ? <Notice tone="warning">Sin conexión: requiere confirmación del servidor.</Notice> : null}
              {puedeGenerar ? (
                <Button title="Generar contrato y pagaré" variant="outline" disabled={isOffline} loading={operar.isPending && operar.variables === 'generar_documentos'} onPress={generar} />
              ) : null}
              {puedeResguardar ? (
                <Button title="Resguardar documentos" disabled={isOffline} loading={operar.isPending && operar.variables === 'resguardar'} onPress={resguardar} />
              ) : null}
            </Card>
          ) : null}
          {prestamo.solicitud_id ? (
            <Button title="Ver solicitud de origen" variant="ghost" onPress={() => router.push(`/(app)/rh/solicitudes/${prestamo.solicitud_id}` as never)} />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
