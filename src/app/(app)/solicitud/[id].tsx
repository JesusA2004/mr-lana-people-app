import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { DocumentUploadSheet, type PickedDocumentFile } from '@/components/DocumentUploadSheet';
import { ErrorState } from '@/components/ErrorState';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { MascotMessages } from '@/constants/mascotMessages';
import { useCancelSolicitud, useSolicitud, useUploadSolicitudAdjunto } from '@/hooks/queries/useSolicitudes';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { downloadAndOpenFile } from '@/utils/fileDownload';
import { getDevErrorDetail, getErrorMessage, logError } from '@/utils/errors';
import { humanizeRequestType } from '@/utils/formatters';

const CANCELABLE_STATES = ['creada', 'enviada', 'en_revision', 'requiere_correccion'];

export default function SolicitudDetalleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((state) => state.token);

  const { data: solicitud, isLoading, isError, error, refetch } = useSolicitud(id);
  const cancelMutation = useCancelSolicitud(id ?? '');
  const uploadAdjuntoMutation = useUploadSolicitudAdjunto(id ?? '');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);

  const hasDateRange = Boolean(solicitud?.fecha_inicio || solicitud?.fecha_fin);

  interface DetailItem {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string | null;
  }

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
    { icon: 'time-outline', label: 'Última revisión', value: solicitud?.revisado_en ? formatDateTime(solicitud.revisado_en) : undefined },
  ];
  const details = allDetails.filter((item) => Boolean(item.value));

  const canCancel = solicitud?.estado ? CANCELABLE_STATES.includes(solicitud.estado) : false;

  const handleCancel = () => {
    Alert.alert('Cancelar solicitud', '¿Seguro que deseas cancelar esta solicitud?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: () => {
          cancelMutation.mutate(undefined, {
            onSuccess: () => toast.success('Solicitud cancelada.'),
            onError: (cancelError) => {
              logError('solicitudes.cancel', cancelError);
              toast.error(getErrorMessage(cancelError));
            },
          });
        },
      },
    ]);
  };

  const handleUploadAdjunto = async (file: PickedDocumentFile) => {
    await uploadAdjuntoMutation.mutateAsync({ fileUri: file.uri, fileName: file.name, mimeType: file.mimeType });
  };

  const handleViewAdjunto = async (adjuntoId: string | number, path: string, fileName: string) => {
    setDownloadingId(adjuntoId);
    try {
      await downloadAndOpenFile(path, token, fileName);
    } catch (downloadError) {
      logError('solicitud.verAdjunto', downloadError);
      toast.error(getErrorMessage(downloadError));
    } finally {
      setDownloadingId(null);
    }
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

            <Card>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Documentos adjuntos</Text>
                <PressableScale accessibilityLabel="Adjuntar documento" onPress={() => setSheetVisible(true)} haptic={false}>
                  <Ionicons name="add-circle-outline" size={22} color={Colors.primaryDark} />
                </PressableScale>
              </View>
              {solicitud.documentos && solicitud.documentos.length > 0 ? (
                solicitud.documentos.map((adjunto, index) => (
                  <PressableScale
                    key={adjunto.id}
                    haptic={false}
                    onPress={() => void handleViewAdjunto(adjunto.id, `/solicitudes/${solicitud.id}/documentos/${adjunto.id}/descargar`, adjunto.original_name)}
                    style={[styles.attachmentRow, index === (solicitud.documentos?.length ?? 0) - 1 && styles.detailRowLast] as object}>
                    <Ionicons name="document-attach-outline" size={18} color={Colors.primaryDark} />
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {adjunto.original_name}
                    </Text>
                    {downloadingId === adjunto.id ? <Text style={styles.attachmentHint}>Abriendo…</Text> : null}
                  </PressableScale>
                ))
              ) : (
                <Text style={styles.emptyText}>Aún no has adjuntado documentos a esta solicitud.</Text>
              )}
            </Card>

            {solicitud.documentos_generados && solicitud.documentos_generados.length > 0 ? (
              <Card>
                <Text style={styles.sectionTitle}>Documentos generados por RH</Text>
                {solicitud.documentos_generados.map((generado, index) => (
                  <PressableScale
                    key={generado.id}
                    haptic={false}
                    onPress={() =>
                      void handleViewAdjunto(
                        generado.id,
                        `/solicitudes/${solicitud.id}/documentos-generados/${generado.id}/descargar`,
                        generado.generated_name,
                      )
                    }
                    style={[styles.attachmentRow, index === (solicitud.documentos_generados?.length ?? 0) - 1 && styles.detailRowLast] as object}>
                    <Ionicons name="reader-outline" size={18} color={Colors.primaryDark} />
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {generado.generated_name}
                    </Text>
                  </PressableScale>
                ))}
              </Card>
            ) : null}

            {solicitud.historial && solicitud.historial.length > 0 ? (
              <Card>
                <Text style={styles.sectionTitle}>Seguimiento</Text>
                {solicitud.historial.map((item, index) => (
                  <View key={item.id} style={[styles.historialRow, index === (solicitud.historial?.length ?? 0) - 1 && styles.detailRowLast]}>
                    <View style={styles.historialDot} />
                    <View style={styles.historialText}>
                      <Text style={styles.historialAccion}>{item.accion}</Text>
                      {item.comentario ? <Text style={styles.historialComentario}>{item.comentario}</Text> : null}
                      {item.created_at ? <Text style={styles.historialFecha}>{formatDateTime(item.created_at)}</Text> : null}
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            {canCancel ? (
              <Button
                title="Cancelar solicitud"
                variant="danger"
                onPress={handleCancel}
                loading={cancelMutation.isPending}
                disabled={cancelMutation.isPending}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <DocumentUploadSheet
        visible={sheetVisible}
        title="Adjuntar documento"
        onClose={() => setSheetVisible(false)}
        onConfirm={handleUploadAdjunto}
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
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  attachmentName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  attachmentHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  historialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  historialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  historialText: {
    flex: 1,
  },
  historialAccion: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  historialComentario: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  historialFecha: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
