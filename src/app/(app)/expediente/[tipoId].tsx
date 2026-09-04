import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge';
import { DocumentUploadSheet, type PickedDocumentFile } from '@/components/DocumentUploadSheet';
import { ErrorState } from '@/components/ErrorState';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useExpediente, useUploadDocumento } from '@/hooks/queries/useExpediente';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getErrorMessage, logError } from '@/utils/errors';
import { downloadAndOpenFile } from '@/utils/fileDownload';

export default function DocumentoDetalleScreen() {
  const router = useRouter();
  const { tipoId } = useLocalSearchParams<{ tipoId: string }>();
  const token = useAuthStore((state) => state.token);
  const { data, isLoading, isError, error, refetch } = useExpediente();
  const uploadMutation = useUploadDocumento();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const entry = data?.documentos.find((item) => String(item.tipo.id) === tipoId);
  const documento = entry?.documento;

  const handleUpload = async (file: PickedDocumentFile) => {
    if (!entry) return;
    await uploadMutation.mutateAsync({
      documentTypeId: entry.tipo.id,
      fileUri: file.uri,
      fileName: file.name,
      mimeType: file.mimeType,
    });
  };

  const handleViewFile = async () => {
    if (!documento) return;
    setDownloading(true);
    try {
      // GET /api/v1/colaborador/documentos/{id}/descargar — pendiente en backend (ver docs/MOBILE_BACKEND_REQUIREMENTS.md P0.4).
      await downloadAndOpenFile(`/colaborador/documentos/${documento.id}/descargar`, token, documento.original_name);
    } catch (downloadError) {
      logError('documento.descargar', downloadError);
      toast.error(getErrorMessage(downloadError));
    } finally {
      setDownloading(false);
    }
  };

  const needsCorrection = documento?.status === 'rechazado' || documento?.status === 'requiere_correccion';

  return (
    <View style={styles.container}>
      <AppHeader title={entry?.tipo.nombre ?? 'Documento'} showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={120} radius={Radius.lg} />
            <SkeletonBlock height={160} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !entry ? (
          <ErrorState message="No encontramos este documento en tu expediente." onRetry={() => void refetch()} />
        ) : (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>Estado</Text>
                <DocumentStatusBadge status={documento?.status} />
              </View>
              {entry.tipo.requerido ? <Text style={styles.requiredNote}>Este documento es requerido para tu expediente.</Text> : null}
            </Card>

            {needsCorrection && documento?.rejection_reason ? (
              <>
                <MascotAssistant message={MascotMessagesCorreccion} type="warning" priority="high" dismissible={false} />
                <Card style={styles.rejectionCard}>
                  <View style={styles.rejectionHeader}>
                    <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                    <Text style={styles.rejectionTitle}>Observación de Recursos Humanos</Text>
                  </View>
                  <Text style={styles.rejectionText}>{documento.rejection_reason}</Text>
                </Card>
              </>
            ) : documento?.comments ? (
              <Card>
                <Text style={styles.commentsLabel}>Comentarios</Text>
                <Text style={styles.commentsText}>{documento.comments}</Text>
              </Card>
            ) : null}

            {documento ? (
              <Card>
                <DetailRow label="Archivo" value={documento.original_name} />
                <DetailRow label="Versión" value={`v${documento.version}`} />
                {documento.created_at ? <DetailRow label="Fecha de carga" value={formatDateLong(documento.created_at)} /> : null}
                {documento.subido_por ? <DetailRow label="Cargado por" value={documento.subido_por} /> : null}
                {documento.reviewed_at ? <DetailRow label="Última revisión" value={formatDateTime(documento.reviewed_at)} /> : null}
                {documento.revisado_por ? <DetailRow label="Revisado por" value={documento.revisado_por} last /> : null}
              </Card>
            ) : (
              <Card>
                <Text style={styles.emptyText}>Todavía no has cargado este documento.</Text>
              </Card>
            )}

            <View style={styles.actions}>
              {documento ? (
                <Button title="Ver archivo" variant="outline" onPress={() => void handleViewFile()} loading={downloading} disabled={downloading} />
              ) : null}
              <Button title={documento ? 'Reemplazar documento' : 'Subir documento'} onPress={() => setSheetVisible(true)} />
            </View>
          </>
        )}
      </ScrollView>

      {entry ? (
        <DocumentUploadSheet visible={sheetVisible} title={entry.tipo.nombre} onClose={() => setSheetVisible(false)} onConfirm={handleUpload} />
      ) : null}
    </View>
  );
}

const MascotMessagesCorreccion = 'Este documento necesita una corrección. Revisa la observación de Recursos Humanos.';

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
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
  },
  headerLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  requiredNote: {
    fontSize: FontSize.xs,
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
  commentsLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  commentsText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  detailRow: {
    paddingVertical: Spacing.sm,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
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
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.md,
  },
});
