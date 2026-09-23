import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { MotivoModal } from '@/components/MotivoModal';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useRhExpediente, useRhExpedienteAprobarIncorporacion, useRhExpedienteRechazarIncorporacion } from '@/hooks/queries/useRhExpedientes';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { toast } from '@/store/toastStore';
import { getErrorMessage, isConcurrencyConflict, logError } from '@/utils/errors';
import { hasPermission } from '@/utils/capabilities';
import { haptics } from '@/utils/haptics';

/**
 * Expediente completo RH (AGENTS.md sección 14): detalle del colaborador,
 * documentos y navegación al visor seguro de cada uno + aprobar/rechazar
 * incorporación. `rh_auxiliar` (solo lectura) nunca ve estos dos botones —
 * se comprueba contra el permiso real, no contra el nombre del rol.
 */
export default function RhExpedienteDetailScreen() {
  const router = useRouter();
  const { colaborador: colaboradorId } = useLocalSearchParams<{ colaborador: string }>();
  const { data: expediente, isLoading, isError, error, refetch, isRefetching } = useRhExpediente(colaboradorId);
  const bootstrap = useMobileBootstrap(true);
  const aprobarIncorporacion = useRhExpedienteAprobarIncorporacion();
  const rechazarIncorporacion = useRhExpedienteRechazarIncorporacion();
  const [showRechazar, setShowRechazar] = useState(false);

  const permissions = bootstrap.data?.user.permissions;
  const canApproveIncorporation = hasPermission(permissions, 'rh.expedientes.incorporacion.aprobar');
  const canRejectIncorporation = hasPermission(permissions, 'rh.expedientes.incorporacion.rechazar');
  const pending = aprobarIncorporacion.isPending || rechazarIncorporacion.isPending;

  function handleActionError(err: unknown) {
    logError('rhExpediente.accion', err);
    haptics.error();
    if (isConcurrencyConflict(err)) {
      toast.error('Este expediente ya fue atendido. Actualizamos la información.');
      void refetch();
      return;
    }
    toast.error(getErrorMessage(err));
  }

  const handleAprobar = () => {
    if (!colaboradorId) return;
    Alert.alert('Aprobar incorporación', 'Esto activará al colaborador para que use el portal normal. ¿Confirmas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: () =>
          aprobarIncorporacion.mutate(colaboradorId, {
            onSuccess: () => {
              haptics.success();
              toast.success('Incorporación aprobada.');
            },
            onError: handleActionError,
          }),
      },
    ]);
  };

  const handleRechazar = (motivo: string) => {
    if (!colaboradorId) return;
    rechazarIncorporacion.mutate(
      { colaboradorId, motivo },
      {
        onSuccess: () => {
          haptics.success();
          toast.success('Incorporación rechazada.');
          setShowRechazar(false);
        },
        onError: handleActionError,
      },
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Expediente" showBack onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={120} radius={Radius.lg} />
            <SkeletonBlock height={240} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !expediente ? null : (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.collaboratorName}>{expediente.colaborador.nombre}</Text>
                <StatusBadge status={expediente.estado} />
              </View>
              <Text style={styles.collaboratorMeta}>
                {[
                  expediente.colaborador.numero_empleado ? `N.º ${expediente.colaborador.numero_empleado}` : null,
                  expediente.colaborador.puesto,
                  expediente.colaborador.sucursal,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Card>

            <Text style={styles.sectionTitle}>Documentos</Text>
            <View style={styles.list}>
              {expediente.documentos.map((documento) => (
                <PressableScale
                  key={documento.id}
                  style={styles.documentRow}
                  onPress={() => router.push(`/(app)/rh/expedientes/${colaboradorId}/documentos/${documento.id}` as never)}>
                  <View style={styles.documentText}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {documento.nombre}
                      {documento.obligatorio ? ' *' : ''}
                    </Text>
                    {documento.motivo_rechazo ? (
                      <Text style={styles.documentReason} numberOfLines={1}>
                        {documento.motivo_rechazo}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge status={documento.estado} />
                </PressableScale>
              ))}
            </View>

            {canApproveIncorporation || canRejectIncorporation ? (
              <View style={styles.actions}>
                {canRejectIncorporation ? (
                  <Button title="Rechazar incorporación" variant="danger" onPress={() => setShowRechazar(true)} disabled={pending} style={styles.actionButton} />
                ) : null}
                {canApproveIncorporation ? (
                  <Button title="Aprobar incorporación" onPress={handleAprobar} loading={aprobarIncorporacion.isPending} disabled={pending} style={styles.actionButton} />
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <MotivoModal
        visible={showRechazar}
        title="Rechazar incorporación"
        description="El colaborador podrá seguir corrigiendo documentos y volver a enviarse a revisión."
        confirmLabel="Rechazar"
        submitting={rechazarIncorporacion.isPending}
        onCancel={() => setShowRechazar(false)}
        onConfirm={handleRechazar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  headerCard: {
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collaboratorName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    flexShrink: 1,
  },
  collaboratorMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  list: {
    gap: Spacing.sm,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  documentText: {
    flex: 1,
    minWidth: 0,
  },
  documentName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  documentReason: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
