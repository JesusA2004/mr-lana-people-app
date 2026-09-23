import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { MotivoModal } from '@/components/MotivoModal';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useRhIncorporacion, useRhIncorporacionAprobar, useRhIncorporacionRechazar } from '@/hooks/queries/useRhIncorporaciones';
import { toast } from '@/store/toastStore';
import { getErrorMessage, isConcurrencyConflict, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';
import { canApprove, canReject } from '@/utils/rhActions';
import { toExpedienteProgress } from '@/utils/expedienteProgress';

/**
 * Detalle de incorporación RH (AGENTS.md sección 12): progreso de
 * documentación + aprobar/rechazar la incorporación completa. Las acciones
 * por documento individual (aprobar/rechazar/autorizar cambio) viven en el
 * expediente completo — este detalle enlaza ahí.
 */
export default function RhIncorporacionDetailScreen() {
  const router = useRouter();
  const { colaborador: colaboradorId } = useLocalSearchParams<{ colaborador: string }>();
  const { data: incorporacion, isLoading, isError, error, refetch, isRefetching } = useRhIncorporacion(colaboradorId);
  const aprobar = useRhIncorporacionAprobar();
  const rechazar = useRhIncorporacionRechazar();
  const [showRechazar, setShowRechazar] = useState(false);

  const pending = aprobar.isPending || rechazar.isPending;

  function handleActionError(err: unknown) {
    logError('rhIncorporacion.accion', err);
    haptics.error();
    if (isConcurrencyConflict(err)) {
      toast.error('Esta incorporación ya fue atendida. Actualizamos la información.');
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
          aprobar.mutate(colaboradorId, {
            onSuccess: () => {
              haptics.success();
              toast.success('Incorporación aprobada. El colaborador ya puede usar la app normal.');
            },
            onError: handleActionError,
          }),
      },
    ]);
  };

  const handleRechazar = (motivo: string) => {
    if (!colaboradorId) return;
    rechazar.mutate(
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
      <AppHeader title="Incorporación" showBack onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={140} radius={Radius.lg} />
            <SkeletonBlock height={220} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !incorporacion ? null : (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.collaboratorName}>{incorporacion.colaborador.nombre}</Text>
                <StatusBadge status={incorporacion.estado} />
              </View>
              <Text style={styles.collaboratorMeta}>
                {[
                  incorporacion.colaborador.numero_empleado ? `N.º ${incorporacion.colaborador.numero_empleado}` : null,
                  incorporacion.colaborador.puesto,
                  incorporacion.colaborador.sucursal,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <AnimatedProgressBar percent={toExpedienteProgress(incorporacion.progreso).porcentaje} />
              <Text style={styles.progressCaption}>
                {incorporacion.progreso.aprobados} de {incorporacion.progreso.total} documentos aprobados
              </Text>
            </Card>

            <Card style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>Documentos</Text>
              {incorporacion.documentos.map((documento) => (
                <View key={documento.id} style={styles.documentRow}>
                  <View style={styles.documentText}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {documento.nombre}
                      {documento.obligatorio ? ' *' : ''}
                    </Text>
                    {documento.motivo_rechazo ? (
                      <Text style={styles.documentReason} numberOfLines={2}>
                        {documento.motivo_rechazo}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge status={documento.estado} />
                </View>
              ))}
            </Card>

            <Button
              title="Ver expediente completo"
              variant="outline"
              leftIcon="folder-open-outline"
              onPress={() => router.push(`/(app)/rh/expedientes/${colaboradorId}` as never)}
            />

            {canApprove(incorporacion.acciones_permitidas) || canReject(incorporacion.acciones_permitidas) ? (
              <View style={styles.actions}>
                {canReject(incorporacion.acciones_permitidas) ? (
                  <Button title="Rechazar" variant="danger" onPress={() => setShowRechazar(true)} disabled={pending} style={styles.actionButton} />
                ) : null}
                {canApprove(incorporacion.acciones_permitidas) ? (
                  <Button title="Aprobar" onPress={handleAprobar} loading={aprobar.isPending} disabled={pending} style={styles.actionButton} />
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
        submitting={rechazar.isPending}
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
    gap: Spacing.sm,
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
  progressCaption: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  fieldCard: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
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
