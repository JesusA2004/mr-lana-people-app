import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { MotivoModal } from '@/components/MotivoModal';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { WorkflowTimeline } from '@/components/WorkflowTimeline';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useRhVacacion, useRhVacacionAprobar, useRhVacacionRechazar } from '@/hooks/queries/useRhVacaciones';
import { toast } from '@/store/toastStore';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getErrorMessage, isConcurrencyConflict, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';
import { canApprove, canReject } from '@/utils/rhActions';

/** Detalle de vacaciones RH (AGENTS.md sección 10): colaborador, periodo, días, saldo disponible, motivo/comentario y acciones reales. */
export default function RhVacacionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: vacacion, isLoading, isError, error, refetch, isRefetching } = useRhVacacion(id);
  const aprobar = useRhVacacionAprobar();
  const rechazar = useRhVacacionRechazar();
  const [showRechazar, setShowRechazar] = useState(false);

  const pending = aprobar.isPending || rechazar.isPending;

  function handleActionError(err: unknown) {
    logError('rhVacacion.accion', err);
    haptics.error();
    if (isConcurrencyConflict(err)) {
      toast.error('Esta solicitud de vacaciones ya fue atendida. Actualizamos la información.');
      void refetch();
      return;
    }
    toast.error(getErrorMessage(err));
  }

  const handleAprobar = () => {
    if (!id) return;
    Alert.alert('Aprobar vacaciones', '¿Confirmas que quieres aprobar esta solicitud de vacaciones?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: () =>
          aprobar.mutate(id, {
            onSuccess: () => {
              haptics.success();
              toast.success('Vacaciones aprobadas.');
            },
            onError: handleActionError,
          }),
      },
    ]);
  };

  const handleRechazar = (motivo: string) => {
    if (!id) return;
    rechazar.mutate(
      { id, motivo },
      {
        onSuccess: () => {
          haptics.success();
          toast.success('Vacaciones rechazadas.');
          setShowRechazar(false);
        },
        onError: handleActionError,
      },
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Vacaciones" showBack onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={160} radius={Radius.lg} />
            <SkeletonBlock height={180} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !vacacion ? null : (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.tipo}>Solicitud de vacaciones</Text>
                <StatusBadge status={vacacion.estado} />
              </View>
              <Text style={styles.collaboratorName}>{vacacion.colaborador.nombre}</Text>
              <Text style={styles.collaboratorMeta}>
                {[
                  vacacion.colaborador.numero_empleado ? `N.º ${vacacion.colaborador.numero_empleado}` : null,
                  vacacion.colaborador.puesto,
                  vacacion.colaborador.sucursal,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Card>

            <Card style={styles.fieldCard}>
              <FieldRow icon="calendar-outline" label="Periodo" value={`${formatDateLong(vacacion.fecha_inicio)} – ${formatDateLong(vacacion.fecha_fin)}`} />
              <FieldRow icon="airplane-outline" label="Días solicitados" value={String(vacacion.dias_solicitados)} />
              {typeof vacacion.saldo_disponible === 'number' ? (
                <FieldRow icon="wallet-outline" label="Saldo disponible" value={`${vacacion.saldo_disponible} días`} />
              ) : null}
            </Card>

            {vacacion.comentario ? (
              <Card style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Comentario</Text>
                <Text style={styles.fieldValue}>{vacacion.comentario}</Text>
              </Card>
            ) : null}

            {vacacion.motivo_rechazo ? (
              <Card style={[styles.fieldCard, styles.rejectionCard]}>
                <Text style={styles.fieldLabel}>Motivo de rechazo</Text>
                <Text style={styles.fieldValue}>{vacacion.motivo_rechazo}</Text>
              </Card>
            ) : null}

            {vacacion.workflow ? (
              <Card>
                <Text style={styles.fieldLabel}>Seguimiento</Text>
                <WorkflowTimeline workflow={vacacion.workflow} />
              </Card>
            ) : null}

            {vacacion.historial && vacacion.historial.length > 0 ? (
              <Card style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Historial</Text>
                {vacacion.historial.map((entrada, index) => (
                  <View key={index} style={styles.historyRow}>
                    <Text style={styles.historyAction}>{entrada.accion}</Text>
                    <Text style={styles.historyMeta}>{formatDateTime(entrada.fecha)}</Text>
                    {entrada.comentario ? <Text style={styles.historyComment}>{entrada.comentario}</Text> : null}
                  </View>
                ))}
              </Card>
            ) : null}

            {canApprove(vacacion.acciones_permitidas) || canReject(vacacion.acciones_permitidas) ? (
              <View style={styles.actions}>
                {canReject(vacacion.acciones_permitidas) ? (
                  <Button title="Rechazar" variant="danger" onPress={() => setShowRechazar(true)} disabled={pending} style={styles.actionButton} />
                ) : null}
                {canApprove(vacacion.acciones_permitidas) ? (
                  <Button title="Aprobar" onPress={handleAprobar} loading={aprobar.isPending} disabled={pending} style={styles.actionButton} />
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <MotivoModal
        visible={showRechazar}
        title="Rechazar vacaciones"
        description="Explica al colaborador por qué se rechaza esta solicitud."
        confirmLabel="Rechazar"
        submitting={rechazar.isPending}
        onCancel={() => setShowRechazar(false)}
        onConfirm={handleRechazar}
      />
    </View>
  );
}

function FieldRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={16} color={Colors.primaryDark} />
      <Text style={styles.fieldRowLabel}>{label}</Text>
      <Text style={styles.fieldRowValue}>{value}</Text>
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
    marginBottom: Spacing.xs,
  },
  tipo: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  collaboratorName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  collaboratorMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  fieldCard: {
    gap: Spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fieldRowLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  fieldRowValue: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  rejectionCard: {
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.dangerSoft,
  },
  historyRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
    gap: 2,
  },
  historyAction: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  historyMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  historyComment: {
    fontSize: FontSize.sm,
    color: Colors.text,
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
