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
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import {
  useRhSolicitud,
  useRhSolicitudAprobar,
  useRhSolicitudCorreccion,
  useRhSolicitudEstado,
  useRhSolicitudRechazar,
} from '@/hooks/queries/useRhSolicitudes';
import { toast } from '@/store/toastStore';
import { hasPermission } from '@/utils/capabilities';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getErrorMessage, isConcurrencyConflict, logError } from '@/utils/errors';
import { humanizeRequestType } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { openRhWeb } from '@/utils/openRhWeb';
import { canApprove, canReject, canRequestCorrection } from '@/utils/rhActions';
import { blockedApprovalReason, type BlockedApproval } from '@/utils/rhBlockedActions';

/**
 * Detalle de solicitud RH: folio, tipo, estado, colaborador, fechas, motivo,
 * adjuntos, workflow, historial y SOLO las acciones que trae
 * `acciones_permitidas` (aprobar/rechazar/solicitar_correccion).
 *
 * Una solicitud tipo `vacaciones` se ve y se resuelve AQUÍ, como cualquier
 * otra: la bandeja legacy `rh/vacaciones` quedó fuera de la navegación
 * nueva (sección 18).
 *
 * "Tomar" (`en_revision`) y "Cerrar" (`cerrada`) usan
 * `PATCH .../estado`. `WorkflowService` todavía no las anuncia en
 * `acciones_permitidas` (gap D-5 de `docs/BACKEND_SYNC_2026_09_15.md`), así
 * que se ofrecen replicando EXACTAMENTE el mapa estado→permiso de
 * `Rh\SolicitudController::actualizarEstado()` — nunca un movimiento libre
 * de tablero. El backend sigue siendo la autoridad final (403/422).
 */
export default function RhSolicitudDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: solicitud, isLoading, isError, error, refetch, isRefetching } = useRhSolicitud(id);
  const bootstrap = useMobileBootstrap(true);
  const aprobar = useRhSolicitudAprobar();
  const rechazar = useRhSolicitudRechazar();
  const correccion = useRhSolicitudCorreccion();
  const estadoMutation = useRhSolicitudEstado();
  const [modal, setModal] = useState<'rechazar' | 'correccion' | null>(null);
  const [blocked, setBlocked] = useState<BlockedApproval | null>(null);

  const pending = aprobar.isPending || rechazar.isPending || correccion.isPending || estadoMutation.isPending;

  const permissions = bootstrap.data?.user.permissions;
  // Espejo de `actualizarEstado()`: `en_revision` exige la habilidad
  // `revisar`; `cerrada`, la habilidad `cerrar`.
  const puedeTomar = solicitud?.estado === 'enviada' && hasPermission(permissions, 'solicitudes.revisar');
  const puedeCerrar = solicitud?.estado === 'aprobada' && hasPermission(permissions, 'solicitudes.cerrar');

  function handleActionError(err: unknown) {
    logError('rhSolicitud.accion', err);
    haptics.error();

    // Los 422 dirigidos de una baja (falta evidencia / falta finiquito) NO
    // son un conflicto de concurrencia: traen la instrucción exacta de qué
    // falta y hay que mostrarla tal cual, antes de caer en el mensaje
    // genérico de "ya fue atendida".
    const blocker = blockedApprovalReason(err);
    if (blocker) {
      setBlocked(blocker);
      void refetch();
      return;
    }

    if (isConcurrencyConflict(err)) {
      toast.error('Esta solicitud ya fue atendida. Actualizamos la información.');
      void refetch();
      return;
    }
    toast.error(getErrorMessage(err));
  }

  const handleEstado = (estado: 'en_revision' | 'cerrada') => {
    if (!id) return;
    estadoMutation.mutate(
      { id, estado },
      {
        onSuccess: () => {
          haptics.success();
          toast.success(estado === 'en_revision' ? 'Tomaste esta solicitud para revisión.' : 'Solicitud cerrada.');
        },
        onError: handleActionError,
      },
    );
  };

  const handleAprobar = () => {
    if (!id) return;
    Alert.alert('Aprobar solicitud', '¿Confirmas que quieres aprobar esta solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: () =>
          aprobar.mutate(
            { id },
            {
              onSuccess: () => {
                haptics.success();
                toast.success('Solicitud aprobada.');
              },
              onError: handleActionError,
            },
          ),
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
          toast.success('Solicitud rechazada.');
          setModal(null);
        },
        onError: handleActionError,
      },
    );
  };

  const handleCorreccion = (motivo: string) => {
    if (!id) return;
    correccion.mutate(
      { id, motivo },
      {
        onSuccess: () => {
          haptics.success();
          toast.success('Se pidió corrección al colaborador.');
          setModal(null);
        },
        onError: handleActionError,
      },
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title={solicitud?.folio ?? 'Solicitud'} showBack onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={160} radius={Radius.lg} />
            <SkeletonBlock height={220} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !solicitud ? null : (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.tipo}>{humanizeRequestType(solicitud.tipo)}</Text>
                <StatusBadge status={solicitud.estado} />
              </View>
              <Text style={styles.collaboratorName}>{solicitud.colaborador.nombre}</Text>
              <Text style={styles.collaboratorMeta}>
                {[
                  solicitud.colaborador.numero_empleado ? `N.º ${solicitud.colaborador.numero_empleado}` : null,
                  solicitud.colaborador.puesto,
                  solicitud.colaborador.sucursal,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Card>

            {blocked ? (
              <Card style={styles.blockedCard}>
                <View style={styles.blockedHeader}>
                  <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                  <Text style={styles.blockedTitle}>No se puede aprobar todavía</Text>
                </View>
                <Text style={styles.fieldValue}>{blocked.message}</Text>
                {blocked.webPath ? (
                  <Button
                    title={blocked.webCtaLabel ?? 'Abrir Portal RH'}
                    variant="outline"
                    leftIcon="open-outline"
                    onPress={() => void openRhWeb(blocked.webPath)}
                  />
                ) : null}
                <Button title="Entendido" variant="ghost" onPress={() => setBlocked(null)} />
              </Card>
            ) : null}

            {solicitud.fecha_inicio || solicitud.fecha_fin ? (
              <Card style={styles.fieldCard}>
                <FieldRow icon="calendar-outline" label="Fechas" value={formatDateRange(solicitud.fecha_inicio, solicitud.fecha_fin)} />
              </Card>
            ) : null}

            {solicitud.motivo ? (
              <Card style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Motivo</Text>
                <Text style={styles.fieldValue}>{solicitud.motivo}</Text>
              </Card>
            ) : null}

            {solicitud.motivo_rechazo ? (
              <Card style={[styles.fieldCard, styles.rejectionCard]}>
                <Text style={styles.fieldLabel}>Motivo de rechazo</Text>
                <Text style={styles.fieldValue}>{solicitud.motivo_rechazo}</Text>
              </Card>
            ) : null}

            {solicitud.adjuntos.length > 0 ? (
              <Card style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Adjuntos</Text>
                {solicitud.adjuntos.map((adjunto) => (
                  <View key={adjunto.id} style={styles.attachmentRow}>
                    <Ionicons name="document-attach-outline" size={16} color={Colors.textMuted} />
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {adjunto.nombre}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}

            <Card>
              <Text style={styles.fieldLabel}>Seguimiento</Text>
              <WorkflowTimeline workflow={solicitud.workflow} />
            </Card>

            {solicitud.historial.length > 0 ? (
              <Card style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Historial</Text>
                {solicitud.historial.map((entrada, index) => (
                  <View key={index} style={styles.historyRow}>
                    <Text style={styles.historyAction}>{entrada.accion}</Text>
                    {entrada.usuario ? <Text style={styles.historyMeta}>{entrada.usuario}</Text> : null}
                    <Text style={styles.historyMeta}>{formatDateTime(entrada.fecha)}</Text>
                    {entrada.comentario ? <Text style={styles.historyComment}>{entrada.comentario}</Text> : null}
                  </View>
                ))}
              </Card>
            ) : null}

            {puedeTomar || puedeCerrar ? (
              <View style={styles.actions}>
                {puedeTomar ? (
                  <Button
                    title="Marcar en revisión"
                    variant="outline"
                    leftIcon="eye-outline"
                    onPress={() => handleEstado('en_revision')}
                    disabled={pending}
                    style={styles.actionButton}
                  />
                ) : null}
                {puedeCerrar ? (
                  <Button
                    title="Cerrar solicitud"
                    variant="outline"
                    leftIcon="lock-closed-outline"
                    onPress={() => handleEstado('cerrada')}
                    disabled={pending}
                    style={styles.actionButton}
                  />
                ) : null}
              </View>
            ) : null}

            {canApprove(solicitud.acciones_permitidas) || canReject(solicitud.acciones_permitidas) || canRequestCorrection(solicitud.acciones_permitidas) ? (
              <View style={styles.actions}>
                {canRequestCorrection(solicitud.acciones_permitidas) ? (
                  <Button
                    title="Pedir corrección"
                    variant="outline"
                    onPress={() => setModal('correccion')}
                    disabled={pending}
                    style={styles.actionButton}
                  />
                ) : null}
                {canReject(solicitud.acciones_permitidas) ? (
                  <Button title="Rechazar" variant="danger" onPress={() => setModal('rechazar')} disabled={pending} style={styles.actionButton} />
                ) : null}
                {canApprove(solicitud.acciones_permitidas) ? (
                  <Button title="Aprobar" onPress={handleAprobar} loading={aprobar.isPending} disabled={pending} style={styles.actionButton} />
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <MotivoModal
        visible={modal === 'rechazar'}
        title="Rechazar solicitud"
        description="Explica al colaborador por qué se rechaza — este mensaje es lo primero que verá."
        confirmLabel="Rechazar"
        submitting={rechazar.isPending}
        onCancel={() => setModal(null)}
        onConfirm={handleRechazar}
      />
      <MotivoModal
        visible={modal === 'correccion'}
        title="Solicitar corrección"
        description="Explica qué debe corregir el colaborador antes de volver a enviarla."
        confirmLabel="Solicitar corrección"
        submitting={correccion.isPending}
        onCancel={() => setModal(null)}
        onConfirm={handleCorreccion}
      />
    </View>
  );
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (start && end && start !== end) return `${formatDateLong(start)} – ${formatDateLong(end)}`;
  return formatDateLong(start ?? end);
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
  blockedCard: {
    backgroundColor: Colors.warningSoft,
    borderColor: Colors.warningSoft,
    gap: Spacing.sm,
  },
  blockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  blockedTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.warning,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  attachmentName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
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
