import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { BarraAccionInferior } from '@/components/BarraAccionInferior';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DocumentStatusBadge } from '@/components/DocumentStatusBadge';
import { DocumentTypeIcon } from '@/components/DocumentTypeIcon';
import { DocumentUploadSheet, type PickedDocumentFile } from '@/components/DocumentUploadSheet';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { TarjetaAviso } from '@/components/ui';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { useIncorporacion, useSolicitarCambioDocumento, useUploadDocumento } from '@/hooks/queries/useIncorporacion';
import { toast } from '@/store/toastStore';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getErrorMessage, logError } from '@/utils/errors';
import { confirmAction } from '@/utils/confirm';

export default function DocumentoDetalleScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  // `ref=documento`: se abrió desde un push `documento` cuyo resource_id es
  // el id del ARCHIVO (no del tipo) — ver `utils/appLinks.ts`.
  const { tipoId, ref } = useLocalSearchParams<{ tipoId: string; ref?: string }>();
  const { data, isLoading, isError, error, refetch } = useIncorporacion();
  const uploadMutation = useUploadDocumento();
  const solicitarCambioMutation = useSolicitarCambioDocumento();
  const [sheetVisible, setSheetVisible] = useState(false);
  // «Este archivo trae también la otra carta» (solo tipos con par).
  const [incluyePar, setIncluyePar] = useState(false);

  const documento =
    ref === 'documento'
      ? data?.documentos.find((item) => item.documento_id !== null && item.documento_id !== undefined && String(item.documento_id) === tipoId)
      : data?.documentos.find((item) => String(item.id) === tipoId);

  const handleUpload = async (file: PickedDocumentFile, onProgress: (percent: number) => void) => {
    if (!documento) return;
    await uploadMutation.mutateAsync({
      documentTypeId: documento.id,
      fileUri: file.uri,
      fileName: file.name,
      mimeType: file.mimeType,
      incluyePar: ofrecePar && incluyePar,
      onProgress,
    });
    if (ofrecePar && incluyePar && documento.par) {
      toast.success(`Se registró también en «${documento.par.nombre}». Recursos Humanos revisa cada una por separado.`);
    }
    setIncluyePar(false);
  };

  const handleSolicitarCambio = async () => {
    if (!documento) return;
    const ok = await confirmAction({
      title: 'Solicitar cambio',
      message: `Le pediremos a Recursos Humanos que autorice reemplazar «${documento.nombre}». Cuando lo autorice podrás subir el nuevo archivo.`,
      confirmLabel: 'Solicitar cambio',
    });
    if (!ok) return;
    try {
      await solicitarCambioMutation.mutateAsync(documento.id);
      toast.success('Le pedimos a Recursos Humanos que autorice el cambio.');
    } catch (solicitudError) {
      logError('documento.solicitarCambio', solicitudError);
      toast.error(getErrorMessage(solicitudError));
    }
  };

  const needsCorrection = documento?.estado === 'rechazado' || documento?.estado === 'requiere_correccion';
  const canUploadDirectly = Boolean(documento && (documento.puede_subir || documento.puede_reemplazar));
  const canRequestChange = Boolean(documento?.puede_solicitar_cambio);
  const hasUploadedFile = Boolean(documento && documento.estado !== 'pendiente');
  const ofrecePar = Boolean(canUploadDirectly && documento?.par?.puede_subir);

  return (
    <View style={styles.container}>
      <AppHeader title={documento?.nombre ?? 'Documento'} showBack onBackPress={() => router.back()} titleNumberOfLines={0} />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={120} radius={Radius.lg} />
            <SkeletonBlock height={160} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !documento ? (
          <ErrorState
            message={ref === 'documento' ? 'Este documento ya no está disponible. Puede que lo hayas reemplazado por una versión nueva.' : 'No encontramos este documento en tu expediente.'}
            onRetry={() => void refetch()}
          />
        ) : (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.previewRow}>
                <DocumentTypeIcon clave={documento.tipo} size={56} />
                <View style={styles.previewText}>
                  <Text style={styles.previewName}>{documento.nombre}</Text>
                  {documento.obligatorio ? <Text style={styles.requiredNote}>Documento requerido</Text> : null}
                </View>
              </View>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>Estado</Text>
                <DocumentStatusBadge status={documento.estado} />
              </View>
              {documento.mensaje ? <Text style={styles.requiredNote}>{documento.mensaje}</Text> : null}
            </Card>

            {needsCorrection && documento.motivo_rechazo ? (
              <TarjetaAviso icono="alert-circle-outline" tono="peligro" titulo="Observación de Recursos Humanos" mensaje={documento.motivo_rechazo}>
                <Text style={styles.rejectionHint}>{MascotMessagesCorreccion}</Text>
              </TarjetaAviso>
            ) : null}

            {hasUploadedFile ? (
              <Card>
                {documento.fecha_subida ? <DetailRow label="Fecha de carga" value={formatDateLong(documento.fecha_subida)} /> : null}
                {documento.fecha_revision ? <DetailRow label="Última revisión" value={formatDateTime(documento.fecha_revision)} last /> : null}
              </Card>
            ) : (
              <Card>
                <Text style={styles.emptyText}>Todavía no has cargado este documento.</Text>
              </Card>
            )}

            {ofrecePar && documento.par ? (
              <Card>
                <View style={styles.parRow}>
                  <View style={styles.previewText}>
                    <Text style={styles.parTitle}>Este archivo trae también la «{documento.par.nombre}»</Text>
                    <Text style={styles.requiredNote}>
                      Puedes subir cada carta por separado (foto o PDF) o, si vienen juntas, un solo archivo para las dos. Recursos Humanos revisa cada
                      una por su lado.
                    </Text>
                  </View>
                  <Switch value={incluyePar} onValueChange={setIncluyePar} accessibilityLabel={`Este archivo trae también la ${documento.par.nombre}`} />
                </View>
              </Card>
            ) : null}

            {canRequestChange && !canUploadDirectly ? (
              <TarjetaAviso
                icono="information-circle-outline"
                tono="info"
                titulo={documento.estado === 'aprobado' ? 'Documento aprobado' : 'Documento en revisión'}
                mensaje="Si necesitas reemplazarlo, primero pide autorización a Recursos Humanos con «Solicitar cambio»."
              />
            ) : null}

          </>
        )}
      </ScrollView>

      {/* Acción principal fija abajo: respeta la barra de navegación del teléfono (safe area). */}
      {documento && !isLoading && !isError && (canUploadDirectly || canRequestChange) ? (
        <BarraAccionInferior sobreTeclado={false}>
          {canUploadDirectly ? (
            <Button
              title={hasUploadedFile ? 'Reemplazar documento' : 'Subir documento'}
              leftIcon={hasUploadedFile ? 'swap-horizontal-outline' : 'cloud-upload-outline'}
              onPress={() => setSheetVisible(true)}
            />
          ) : (
            <Button
              title="Solicitar cambio"
              leftIcon="repeat-outline"
              variant="outline"
              onPress={() => void handleSolicitarCambio()}
              loading={solicitarCambioMutation.isPending}
              disabled={solicitarCambioMutation.isPending}
            />
          )}
        </BarraAccionInferior>
      ) : null}

      {documento ? (
        <DocumentUploadSheet visible={sheetVisible} title={documento.nombre} onClose={() => setSheetVisible(false)} onConfirm={handleUpload} />
      ) : null}
    </View>
  );
}

const MascotMessagesCorreccion = 'Este documento necesita una corrección. Revisa la observación de Recursos Humanos.';

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const styles = useEstilos(crearEstilos);
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
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
    gap: Spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  previewText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  previewName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
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
  parRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  parTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  rejectionHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
