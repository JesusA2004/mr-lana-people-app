import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { rhExpedientesApi } from '@/api/rh/expedientes';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { MotivoModal } from '@/components/MotivoModal';
import { DescargaDocumento } from '@/components/DescargaDocumento';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import {
  useRhExpediente,
  useRhExpedienteAprobarDocumento,
  useRhExpedienteAutorizarCambioDocumento,
  useRhExpedientePedirCorreccionDocumento,
  useRhExpedienteRechazarDocumento,
} from '@/hooks/queries/useRhExpedientes';
import { usePermisos } from '@/hooks/usePermisos';
import { toast } from '@/store/toastStore';
import { formatDateTime } from '@/utils/dates';
import { tipoEsperadoPorNombre } from '@/utils/descargaDocumento';
import { getErrorMessage, isConcurrencyConflict, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/**
 * Documento individual del expediente: se abre en el lector del teléfono
 * (PDF/imagen) y aquí mismo quedan Aprobar / Pedir corrección / Rechazar /
 * Autorizar cambio, siempre por permiso real. «Guardar en el teléfono» solo
 * si el backend manda `puede_descargar` (un gerente nunca descarga).
 */
export default function RhExpedienteDocumentoScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { colaborador: colaboradorId, documento: documentoId } = useLocalSearchParams<{ colaborador: string; documento: string }>();
  const permisos = usePermisos();
  const { data: expediente, isLoading, isError, error, refetch, isRefetching } = useRhExpediente(colaboradorId);
  const aprobar = useRhExpedienteAprobarDocumento();
  const rechazar = useRhExpedienteRechazarDocumento();
  const autorizarCambio = useRhExpedienteAutorizarCambioDocumento();
  const pedirCorreccion = useRhExpedientePedirCorreccionDocumento();
  const [showRechazar, setShowRechazar] = useState(false);
  const [showCorreccion, setShowCorreccion] = useState(false);

  const documento = useMemo(() => expediente?.documentos.find((item) => String(item.id) === String(documentoId)), [expediente, documentoId]);

  const canApproveDoc = permisos.puede('rh.expedientes.documentos.aprobar');
  const canRejectDoc = permisos.puede('rh.expedientes.documentos.rechazar');
  const canAuthorizeChange = permisos.puede('rh.expedientes.documentos.autorizar-cambio');
  const canCorrect = documento?.puede_pedir_correccion === true;
  const puedeGuardar = documento?.puede_descargar === true;
  const puedeAbrir = puedeGuardar || permisos.puede('rh.expedientes.documentos.ver');
  const pending = aprobar.isPending || rechazar.isPending || autorizarCambio.isPending || pedirCorreccion.isPending;

  function handleActionError(err: unknown) {
    logError('rhExpedienteDocumento.accion', err);
    haptics.error();
    if (isConcurrencyConflict(err)) {
      toast.error('Este documento ya fue atendido. Actualizamos la información.');
      void refetch();
      return;
    }
    toast.error(getErrorMessage(err));
  }

  const handleAprobar = () => {
    if (!colaboradorId || !documentoId) return;
    Alert.alert('Aprobar documento', '¿Confirmas que quieres aprobar este documento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: () =>
          aprobar.mutate(
            { colaboradorId, documentoId },
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
    if (!colaboradorId || !documentoId) return;
    rechazar.mutate(
      { colaboradorId, documentoId, motivo },
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

  const handleAutorizarCambio = () => {
    if (!colaboradorId || !documentoId) return;
    Alert.alert('Autorizar cambio', 'El colaborador podrá reemplazar este documento. ¿Confirmas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Autorizar',
        onPress: () =>
          autorizarCambio.mutate(
            { colaboradorId, documentoId },
            {
              onSuccess: () => {
                haptics.success();
                toast.success('Cambio autorizado.');
              },
              onError: handleActionError,
            },
          ),
      },
    ]);
  };

  const handleCorreccion = (motivo: string) => {
    if (!colaboradorId || !documentoId) return;
    pedirCorreccion.mutate(
      { colaboradorId, documentoId, motivo },
      {
        onSuccess: () => {
          haptics.success();
          toast.success('Se pidió corrección al colaborador.');
          setShowCorreccion(false);
        },
        onError: handleActionError,
      },
    );
  };

  // Solo un archivo entregado y por revisar admite decisión (mismos estados que el backend).
  const decidible = documento?.id != null && ['cargado', 'en_revision', 'cambio_solicitado'].includes(documento.estado);
  const verAprobar = canApproveDoc && decidible;
  const verRechazar = canRejectDoc && decidible;
  const verAutorizar = canAuthorizeChange && documento?.estado === 'cambio_solicitado';

  return (
    <View style={styles.container}>
      <AppHeader title={documento?.nombre ?? 'Documento'} showBack onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={160} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !documento ? (
          <ErrorState message="No encontramos este documento en el expediente." onRetry={() => void refetch()} />
        ) : (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.tipo} numberOfLines={2}>
                  {documento.nombre}
                </Text>
                <StatusBadge status={documento.estado} />
              </View>
            </Card>

            {puedeAbrir && colaboradorId && documentoId ? (
              <DescargaDocumento
                titulo={`${documento.nombre} - ${expediente?.colaborador.nombre ?? ''}`}
                path={
                  puedeGuardar
                    ? rhExpedientesApi.descargarDocumentoPath(colaboradorId, documentoId)
                    : rhExpedientesApi.verDocumentoPath(colaboradorId, documentoId)
                }
                tipoEsperado={tipoEsperadoPorNombre(documento.nombre_original)}
                permitirGuardar={puedeGuardar}
                accionPrincipal="abrir"
              />
            ) : null}

            {documento.fecha_subida ? (
              <Card style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Subido</Text>
                <Text style={styles.fieldValue}>{formatDateTime(documento.fecha_subida)}</Text>
              </Card>
            ) : null}

            {documento.motivo_rechazo ? (
              <Card style={[styles.fieldCard, styles.rejectionCard]}>
                <Text style={styles.fieldLabel}>Motivo de rechazo</Text>
                <Text style={styles.fieldValue}>{documento.motivo_rechazo}</Text>
              </Card>
            ) : null}

            {verAprobar || verRechazar || verAutorizar || canCorrect ? (
              <Card style={styles.decisionCard}>
                <Text style={styles.decisionTitle}>¿Qué decides sobre este documento?</Text>
                {verAprobar ? (
                  <Button title="Aprobar" leftIcon="checkmark-circle-outline" onPress={handleAprobar} loading={aprobar.isPending} disabled={pending} />
                ) : null}
                {canCorrect || verRechazar ? (
                  <View style={styles.actions}>
                    {canCorrect ? (
                      <Button
                        title="Pedir corrección"
                        variant="outline"
                        leftIcon="create-outline"
                        onPress={() => setShowCorreccion(true)}
                        disabled={pending}
                        style={styles.actionButton}
                      />
                    ) : null}
                    {verRechazar ? (
                      <Button
                        title="Rechazar"
                        variant="danger"
                        leftIcon="close-circle-outline"
                        onPress={() => setShowRechazar(true)}
                        disabled={pending}
                        style={styles.actionButton}
                      />
                    ) : null}
                  </View>
                ) : null}
                {verAutorizar ? (
                  <Button
                    title="Autorizar cambio"
                    variant="outline"
                    leftIcon="swap-horizontal-outline"
                    onPress={handleAutorizarCambio}
                    loading={autorizarCambio.isPending}
                    disabled={pending}
                  />
                ) : null}
              </Card>
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

      <MotivoModal
        visible={showCorreccion}
        title="Pedir corrección"
        description="Dile al colaborador qué debe corregir; podrá volver a subir el documento desde Mi expediente."
        confirmLabel="Pedir corrección"
        submitting={pedirCorreccion.isPending}
        onCancel={() => setShowCorreccion(false)}
        onConfirm={handleCorreccion}
      />
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
    gap: Spacing.md,
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
  tipo: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  fieldCard: {
    gap: Spacing.xs,
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
  },
  rejectionCard: {
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.dangerSoft,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  decisionCard: {
    gap: Spacing.sm,
  },
  decisionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  actionButton: {
    flex: 1,
  },
});
