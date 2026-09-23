import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { StepTimeline } from '@/components/ciclo/StepTimeline';
import { RequestStatusTimeline } from '@/components/RequestStatusTimeline';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { SolicitudFormatoOficialCard } from '@/components/SolicitudFormatoOficialCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { useCancelSolicitud, useSolicitud } from '@/hooks/queries/useSolicitudes';
import { toast } from '@/store/toastStore';
import { canCancelSolicitud } from '@/types/request';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getDevErrorDetail, getErrorMessage, logError } from '@/utils/errors';
import { formatCurrencyMXN, humanizeRequestType } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { loanStagesToTimeline } from '@/utils/loanRequest';

/**
 * Detalle de una solicitud propia.
 *
 * `SolicitudInternaResource` todavía serializa solo los campos planos: no
 * incluye los adjuntos ni la bitácora de historial, aunque
 * `SolicitudController::show()` sí los cargue en memoria (gap D-1 de
 * `docs/BACKEND_SYNC_2026_09_15.md`). Esta pantalla muestra únicamente lo
 * que el backend devuelve de verdad — nunca inventa una lista de adjuntos.
 *
 * Sincronización 2026-09-15: las secciones "Documentos de tu solicitud",
 * "Archivos enviados" y "Seguimiento detallado" están preparadas para
 * cuando el Resource los mande, pero se protegen con la presencia real del
 * payload (`solicitud.documentos_generados?.length`,
 * `solicitud.adjuntos?.length`, `solicitud.historial?.length`) — hoy
 * ninguna se dibuja porque ninguno de esos campos llega todavía.
 *
 * Lo que sí ya existe y se usa aquí: `POST /solicitudes/{id}/cancelar`.
 */
export default function SolicitudDetalleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const { data: solicitud, isLoading, isError, error, refetch } = useSolicitud(id);
  const cancelMutation = useCancelSolicitud();

  const hasDateRange = Boolean(solicitud?.fecha_inicio || solicitud?.fecha_fin);
  const puedeCancelar = canCancelSolicitud(solicitud);

  interface DetailItem {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string | null;
  }

  const montoRaw = solicitud?.prestamo?.monto_solicitado ?? solicitud?.monto_solicitado;
  const monto = typeof montoRaw === 'number' && Number.isFinite(montoRaw) ? montoRaw : undefined;

  const allDetails: DetailItem[] = [
    { icon: 'chatbox-ellipses-outline', label: 'Motivo', value: solicitud?.motivo },
    { icon: 'reader-outline', label: 'Observaciones', value: solicitud?.observaciones },
    {
      icon: 'calendar-outline',
      label: 'Fechas',
      value: hasDateRange
        ? [solicitud?.fecha_inicio, solicitud?.fecha_fin]
            .filter((value): value is string => Boolean(value))
            .map((value) => formatDateLong(value))
            .join(' — ')
        : undefined,
    },
    // Solo aparecen si el backend los manda; el filtro descarta filas vacías.
    { icon: 'cash-outline', label: 'Monto solicitado', value: monto !== undefined ? formatCurrencyMXN(monto) : undefined },
    { icon: 'time-outline', label: 'Última revisión', value: solicitud?.revisado_en ? formatDateTime(solicitud.revisado_en) : undefined },
  ];
  const details = allDetails.filter((item) => Boolean(item.value));

  const handleCancel = () => {
    if (!id) return;
    setConfirmVisible(false);

    cancelMutation.mutate(id, {
      onSuccess: (result) => {
        haptics.success();
        toast.success(result.message ?? 'Cancelamos tu solicitud.');
      },
      onError: (cancelError) => {
        logError('solicitudes.cancelar', cancelError);
        haptics.warning();
        // 403 (el estado ya no lo permite) / 422: el backend manda el
        // mensaje exacto y la app lo muestra tal cual, sin reinterpretarlo.
        toast.error(getErrorMessage(cancelError));
        // Aunque falle, el estado real pudo haber cambiado: refrescar.
        void refetch();
      },
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Detalle de solicitud" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={100} radius={Radius.lg} />
            <SkeletonBlock height={160} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} devDetail={getDevErrorDetail(error)} onRetry={() => void refetch()} />
        ) : solicitud ? (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.type}>{solicitud.tipo_etiqueta ?? humanizeRequestType(solicitud.tipo)}</Text>
                <StatusBadge status={solicitud.estado} label={solicitud.estado_etiqueta} />
              </View>
              {solicitud.folio ? <Text style={styles.folio}>Folio {solicitud.folio}</Text> : null}
              {solicitud.creada_en ? <Text style={styles.date}>{formatDateLong(solicitud.creada_en)}</Text> : null}
            </Card>

            <Card>
              {/* Préstamo: avance real calculado por el backend (visto bueno → RH → firma). */}
              {solicitud.prestamo?.etapas.length ? (
                <StepTimeline items={loanStagesToTimeline(solicitud.prestamo.etapas)} />
              ) : (
                <RequestStatusTimeline estado={solicitud.estado} estadoEtiqueta={solicitud.estado_etiqueta} />
              )}
            </Card>

            {solicitud.estado === 'requiere_correccion' && solicitud.motivo_rechazo ? (
              <MascotAssistant message={MascotMessages.documentoRechazado} type="warning" priority="high" dismissible={false} />
            ) : null}

            {solicitud.motivo_rechazo ? (
              <Card style={styles.rejectionCard}>
                <View style={styles.rejectionHeader}>
                  <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                  <Text style={styles.rejectionTitle}>Motivo de rechazo / corrección</Text>
                </View>
                <Text style={styles.rejectionText}>{solicitud.motivo_rechazo}</Text>
              </Card>
            ) : null}

            {details.length > 0 ? (
              <Card>
                {details.map((item, index) => (
                  <View key={item.label} style={[styles.detailRow, index === details.length - 1 && styles.detailRowLast]}>
                    <View style={styles.detailIcon}>
                      <Ionicons name={item.icon} size={16} color={Colors.primaryDark} />
                    </View>
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>{item.label}</Text>
                      <Text style={styles.detailValue}>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            {/* Preparación forward-compatible (sección 2/3): se dibuja sola
                el día que el Resource mande documentos_generados/
                formatos_oficiales — hoy no manda ninguno de los dos. */}
            <SolicitudFormatoOficialCard solicitud={solicitud} />

            {solicitud.adjuntos && solicitud.adjuntos.length > 0 ? (
              <Card>
                <Text style={styles.sectionTitle}>Archivos enviados</Text>
                {solicitud.adjuntos.map((adjunto, index) => (
                  <View
                    key={adjunto.id}
                    style={[styles.detailRow, index === solicitud.adjuntos!.length - 1 && styles.detailRowLast]}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="document-attach-outline" size={16} color={Colors.primaryDark} />
                    </View>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {adjunto.nombre}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}

            {solicitud.historial && solicitud.historial.length > 0 ? (
              <Card>
                <Text style={styles.sectionTitle}>Seguimiento detallado</Text>
                {solicitud.historial.map((entrada, index) => (
                  <View
                    key={`${entrada.fecha}-${index}`}
                    style={[styles.historyRow, index === solicitud.historial!.length - 1 && styles.detailRowLast]}>
                    <Text style={styles.historyAction}>{entrada.accion}</Text>
                    {entrada.usuario ? <Text style={styles.historyMeta}>{entrada.usuario}</Text> : null}
                    <Text style={styles.historyMeta}>{formatDateTime(entrada.fecha)}</Text>
                    {entrada.comentario ? <Text style={styles.historyComment}>{entrada.comentario}</Text> : null}
                  </View>
                ))}
              </Card>
            ) : null}

            {puedeCancelar ? (
              <Button
                title="Cancelar solicitud"
                variant="danger"
                leftIcon="close-circle-outline"
                loading={cancelMutation.isPending}
                disabled={cancelMutation.isPending}
                onPress={() => setConfirmVisible(true)}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={() => setConfirmVisible(false)}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>¿Cancelar esta solicitud?</Text>
            <Text style={styles.sheetBody}>
              Recursos Humanos dejará de revisarla y no se puede reabrir. Si la necesitas, tendrás que crear una nueva.
            </Text>
            <Button title="Sí, cancelar" variant="danger" onPress={handleCancel} />
            <Button title="Mejor no" variant="ghost" onPress={() => setConfirmVisible(false)} />
          </View>
        </View>
      </Modal>
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
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  headerCard: {
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  type: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    flexShrink: 1,
  },
  folio: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  rejectionCard: {
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.dangerSoft,
    gap: Spacing.xs,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rejectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.danger,
  },
  rejectionText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  detailRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  historyRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
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
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sheetTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  sheetBody: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
});
