import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FieldComparisonRow, FieldMatchRow } from '@/components/FieldComparisonRow';
import { MotivoModal } from '@/components/MotivoModal';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { rhDocumentosApi } from '@/api/rh/documentos';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhDocumentExtraction, useRhDocumentExtractionAplicar, useRhDocumentExtractionIgnorar } from '@/hooks/queries/useRhDocumentExtraction';
import { useRhDocumento, useRhDocumentoAprobar, useRhDocumentoRechazar } from '@/hooks/queries/useRhDocumentos';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import type { DocumentExtraction, ExtractedFieldKey, ExtractionApplicableField } from '@/types/documentExtraction';
import { hasPermission } from '@/utils/capabilities';
import { formatDateTime } from '@/utils/dates';
import {
  extractedFieldLabel,
  extractionStatusLabel,
  isApplicableField,
  isExtractionInProgress,
  normalizeFechaNacimientoParaAplicar,
} from '@/utils/documentExtraction';
import { getErrorMessage, isConcurrencyConflict, logError } from '@/utils/errors';
import { isExperimentalFeatureEnabled } from '@/utils/featureFlags';
import { joinName } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { canApprove, canReject } from '@/utils/rhActions';

/** Detalle de documento RH (AGENTS.md sección 11): visor seguro dentro de la app, nunca descarga/comparte. */
export default function RhDocumentoDetailScreen() {
  const router = useRouter();
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const user = useAuthStore((state) => state.user);
  const { data: documento, isLoading, isError, error, refetch, isRefetching } = useRhDocumento(id);
  const aprobar = useRhDocumentoAprobar();
  const rechazar = useRhDocumentoRechazar();
  const [showRechazar, setShowRechazar] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const bootstrap = useMobileBootstrap(true);
  // "Análisis automático" — módulo EXPERIMENTAL fail-CLOSED (auditoría de
  // integración: el backend real ya lo implementa por completo, pero se
  // mantiene oculto hasta que `mobile/bootstrap` mande
  // `features.document_extraction: true` explícito — decisión de producto,
  // ver docs/BACKEND_GAPS_FINAL.md). Mientras esté apagado, la query ni
  // siquiera se dispara.
  const extractionEnabled = isExperimentalFeatureEnabled(bootstrap.data?.features, 'document_extraction');
  const permissions = bootstrap.data?.user.permissions;
  const canAplicar = hasPermission(permissions, 'rh.documentos.extraccion.aplicar');
  const canIgnorar = hasPermission(permissions, 'rh.documentos.extraccion.ignorar');

  const extraction = useRhDocumentExtraction(id, extractionEnabled);
  const aplicar = useRhDocumentExtractionAplicar(id);
  const ignorar = useRhDocumentExtractionIgnorar(id);
  const [selections, setSelections] = useState<Partial<Record<ExtractedFieldKey, 'detected' | 'current'>>>({});
  const scrollRef = useRef<ScrollView>(null);
  const extractionOffsetRef = useRef<number | null>(null);
  const scrolledToFocusRef = useRef(false);

  const pending = aprobar.isPending || rechazar.isPending;

  function maybeScrollToExtraction() {
    if (focus !== 'extraccion' || scrolledToFocusRef.current) return;
    if (extractionOffsetRef.current === null) return;
    scrolledToFocusRef.current = true;
    scrollRef.current?.scrollTo({ y: extractionOffsetRef.current, animated: true });
  }

  function handleActionError(err: unknown) {
    logError('rhDocumento.accion', err);
    haptics.error();
    if (isConcurrencyConflict(err)) {
      toast.error('Este documento ya fue atendido. Actualizamos la información.');
      void refetch();
      return;
    }
    toast.error(getErrorMessage(err));
  }

  const handleAprobar = () => {
    if (!id) return;
    Alert.alert('Aprobar documento', '¿Confirmas que quieres aprobar este documento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: () =>
          aprobar.mutate(
            { id },
            {
              onSuccess: () => {
                haptics.success();
                toast.success('Documento aprobado.');
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
          toast.success('Documento rechazado.');
          setShowRechazar(false);
        },
        onError: handleActionError,
      },
    );
  };

  if (viewerOpen && id) {
    const watermarkLabel = `${joinName(user?.nombre, user?.apellidos) ?? 'RH'} · ${formatDateTime(new Date().toISOString())}`;
    return (
      <SecureDocumentViewer
        path={rhDocumentosApi.verPath(id)}
        title={documento?.nombre ?? 'Documento'}
        watermarkLabel={watermarkLabel}
        onClose={() => setViewerOpen(false)}
        // Documento interno de expediente RH: nunca ofrecer descarga/compartir (sección 33).
        allowDownload={false}
      />
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={documento?.nombre ?? 'Documento'} showBack onBackPress={() => router.back()} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={160} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !documento ? null : (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.tipo}>{documento.tipo ?? documento.nombre}</Text>
                <StatusBadge status={documento.estado} />
              </View>
              <Text style={styles.collaboratorName}>{documento.colaborador.nombre}</Text>
              <Text style={styles.collaboratorMeta}>
                {[
                  documento.colaborador.numero_empleado ? `N.º ${documento.colaborador.numero_empleado}` : null,
                  documento.colaborador.puesto,
                  documento.colaborador.sucursal,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Card>

            <Button title="Ver documento" leftIcon="eye-outline" variant="outline" onPress={() => setViewerOpen(true)} />

            {documento.fecha_subida ? (
              <Card style={styles.fieldCard}>
                <FieldRow icon="cloud-upload-outline" label="Subido" value={formatDateTime(documento.fecha_subida)} />
                {documento.fecha_revision ? <FieldRow icon="checkmark-done-outline" label="Revisado" value={formatDateTime(documento.fecha_revision)} /> : null}
              </Card>
            ) : null}

            {documento.motivo_rechazo ? (
              <Card style={[styles.fieldCard, styles.rejectionCard]}>
                <Text style={styles.fieldLabel}>Motivo de rechazo</Text>
                <Text style={styles.fieldValue}>{documento.motivo_rechazo}</Text>
              </Card>
            ) : null}

            {extractionEnabled && extraction.data?.elegible ? (
              <View
                onLayout={(event) => {
                  extractionOffsetRef.current = event.nativeEvent.layout.y;
                  maybeScrollToExtraction();
                }}>
                <ExtractionSection
                  response={extraction.data}
                  isLoadingFirstTime={extraction.isLoading}
                  selections={selections}
                  onSelect={(field, selection) => setSelections((prev) => ({ ...prev, [field]: selection }))}
                  canAplicar={canAplicar}
                  canIgnorar={canIgnorar}
                  onAplicar={() => {
                    const extraccion = extraction.data?.extraccion;
                    if (!extraccion?.differences) return;
                    const valores: Partial<Record<ExtractionApplicableField, string>> = {};
                    for (const [field, diff] of Object.entries(extraccion.differences)) {
                      if (!isApplicableField(field)) continue;
                      if (selections[field as ExtractedFieldKey] !== 'detected') continue;
                      valores[field] = field === 'fecha_nacimiento' ? normalizeFechaNacimientoParaAplicar(diff!.detectado) : diff!.detectado;
                    }
                    if (Object.keys(valores).length === 0) return;
                    aplicar.mutate(valores, {
                      onSuccess: () => {
                        haptics.success();
                        toast.success('Cambios aplicados.');
                        setSelections({});
                      },
                      onError: (err) => {
                        logError('rhDocumentExtraction.aplicar', err);
                        toast.error(getErrorMessage(err));
                      },
                    });
                  }}
                  onIgnorar={() =>
                    ignorar.mutate(undefined, {
                      onSuccess: () => toast.success('Análisis descartado.'),
                      onError: (err) => toast.error(getErrorMessage(err)),
                    })
                  }
                  applying={aplicar.isPending}
                  ignoring={ignorar.isPending}
                  hasSelection={Object.values(selections).some((value) => value === 'detected')}
                />
              </View>
            ) : null}

            {canApprove(documento.acciones_permitidas) || canReject(documento.acciones_permitidas) ? (
              <View style={styles.actions}>
                {canReject(documento.acciones_permitidas) ? (
                  <Button title="Rechazar" variant="danger" onPress={() => setShowRechazar(true)} disabled={pending} style={styles.actionButton} />
                ) : null}
                {canApprove(documento.acciones_permitidas) ? (
                  <Button title="Aprobar" onPress={handleAprobar} loading={aprobar.isPending} disabled={pending} style={styles.actionButton} />
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <MotivoModal
        visible={showRechazar}
        title="Rechazar documento"
        description="Explica al colaborador qué debe corregir de este documento."
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

interface ExtractionSectionProps {
  response: { elegible: boolean; extraccion: DocumentExtraction | null };
  isLoadingFirstTime: boolean;
  selections: Partial<Record<ExtractedFieldKey, 'detected' | 'current'>>;
  onSelect: (field: ExtractedFieldKey, selection: 'detected' | 'current') => void;
  onAplicar: () => void;
  onIgnorar: () => void;
  canAplicar: boolean;
  canIgnorar: boolean;
  applying: boolean;
  ignoring: boolean;
  hasSelection: boolean;
}

/**
 * "Análisis automático" (AGENTS.md de este encargo, secciones 9-10): OCR
 * NUNCA aprueba/rechaza el documento por su cuenta — es puramente
 * informativo, RH sigue decidiendo con los botones Aprobar/Rechazar de
 * arriba, siempre visibles sin importar el estado de esta sección. Solo se
 * monta cuando `response.elegible` es `true` (el padre ya filtra) — nunca
 * cuando el tipo de documento no admite extracción.
 */
function ExtractionSection({
  response,
  isLoadingFirstTime,
  selections,
  onSelect,
  onAplicar,
  onIgnorar,
  canAplicar,
  canIgnorar,
  applying,
  ignoring,
  hasSelection,
}: ExtractionSectionProps) {
  const { extraccion } = response;

  return (
    <Card style={styles.extractionCard}>
      <View style={styles.extractionHeader}>
        <Ionicons name="sparkles-outline" size={18} color={Colors.primaryDark} />
        <Text style={styles.extractionTitle}>Análisis automático</Text>
      </View>

      {isLoadingFirstTime ? (
        <SkeletonBlock height={80} radius={Radius.md} />
      ) : !extraccion ? (
        // `elegible: true` + `extraccion: null` = el job en cola todavía no
        // corrió (nunca un error) — ver App\Jobs\ProcesarDocumentoPersonalJob.
        <Text style={styles.extractionStatus}>{extractionStatusLabel('pending')}</Text>
      ) : (
        <>
          <Text style={styles.extractionStatus}>{extractionStatusLabel(extraccion.status)}</Text>

          {isExtractionInProgress(extraccion.status) ? (
            <SkeletonBlock height={80} radius={Radius.md} />
          ) : extraccion.status === 'failed' ? (
            <View style={styles.extractionFailedBox}>
              <Ionicons name="cloud-offline-outline" size={22} color={Colors.textMuted} />
              <Text style={styles.extractionFailedText}>No pudimos leer este documento automáticamente. Puedes revisarlo manualmente.</Text>
            </View>
          ) : (
            Object.entries(extraccion.differences ?? {}).map(([field, diff]) => {
              const key = field as ExtractedFieldKey;
              const label = extractedFieldLabel(field);
              const confidenceLevel = extraccion.confidence?.[key];

              if (diff!.coincide) {
                return <FieldMatchRow key={field} label={label} value={diff!.detectado} confidenceLevel={confidenceLevel} />;
              }

              return (
                <FieldComparisonRow
                  key={field}
                  label={label}
                  systemValue={diff!.actual}
                  detectedValue={diff!.detectado}
                  confidenceLevel={confidenceLevel}
                  applicable={isApplicableField(field) && canAplicar}
                  selection={selections[key] ?? null}
                  onSelect={(selection) => onSelect(key, selection)}
                />
              );
            })
          )}

          {extraccion.status === 'processed' && (canAplicar || canIgnorar) ? (
            <View style={styles.extractionActions}>
              {canIgnorar ? (
                <Button title="Ignorar" variant="ghost" onPress={onIgnorar} loading={ignoring} disabled={ignoring} style={styles.actionButton} />
              ) : null}
              {canAplicar ? (
                <Button
                  title="Aplicar cambios"
                  onPress={onAplicar}
                  loading={applying}
                  disabled={applying || !hasSelection}
                  style={styles.actionButton}
                />
              ) : null}
            </View>
          ) : null}

          {/* No hay botón "Reprocesar": esa acción no existe en la API móvil
              real — solo en el panel web (ver docs/DOCUMENT_EXTRACTION.md y
              docs/BACKEND_GAPS_FINAL.md). */}
        </>
      )}
    </Card>
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
  extractionCard: {
    gap: Spacing.sm,
  },
  extractionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  extractionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  extractionStatus: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: -Spacing.xs,
  },
  extractionFailedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  extractionFailedText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  extractionActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
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
