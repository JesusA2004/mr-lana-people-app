import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { rhExpedientesApi } from '@/api/rh/expedientes';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { MotivoModal } from '@/components/MotivoModal';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import {
  useRhExpediente,
  useRhExpedienteAprobarDocumento,
  useRhExpedienteAutorizarCambioDocumento,
  useRhExpedienteRechazarDocumento,
} from '@/hooks/queries/useRhExpedientes';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { hasPermission } from '@/utils/capabilities';
import { formatDateTime } from '@/utils/dates';
import { getErrorMessage, isConcurrencyConflict, logError } from '@/utils/errors';
import { joinName } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';

/** Documento individual del expediente (AGENTS.md sección 14): visor seguro + aprobar/rechazar/autorizar cambio, siempre por permiso real. */
export default function RhExpedienteDocumentoScreen() {
  const router = useRouter();
  const { colaborador: colaboradorId, documento: documentoId } = useLocalSearchParams<{ colaborador: string; documento: string }>();
  const user = useAuthStore((state) => state.user);
  const bootstrap = useMobileBootstrap(true);
  const { data: expediente, isLoading, isError, error, refetch, isRefetching } = useRhExpediente(colaboradorId);
  const aprobar = useRhExpedienteAprobarDocumento();
  const rechazar = useRhExpedienteRechazarDocumento();
  const autorizarCambio = useRhExpedienteAutorizarCambioDocumento();
  const [showRechazar, setShowRechazar] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const documento = useMemo(() => expediente?.documentos.find((item) => String(item.id) === String(documentoId)), [expediente, documentoId]);

  const permissions = bootstrap.data?.user.permissions;
  const canApproveDoc = hasPermission(permissions, 'rh.expedientes.documentos.aprobar');
  const canRejectDoc = hasPermission(permissions, 'rh.expedientes.documentos.rechazar');
  const canAuthorizeChange = hasPermission(permissions, 'rh.expedientes.documentos.autorizar-cambio');
  const pending = aprobar.isPending || rechazar.isPending || autorizarCambio.isPending;

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

  if (viewerOpen && colaboradorId && documentoId) {
    const watermarkLabel = `${joinName(user?.nombre, user?.apellidos) ?? 'RH'} · ${formatDateTime(new Date().toISOString())}`;
    return (
      <SecureDocumentViewer
        path={rhExpedientesApi.verDocumentoPath(colaboradorId, documentoId)}
        title={documento?.nombre ?? 'Documento'}
        watermarkLabel={watermarkLabel}
        onClose={() => setViewerOpen(false)}
      />
    );
  }

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

            <Button title="Ver documento" leftIcon="eye-outline" variant="outline" onPress={() => setViewerOpen(true)} />

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

            {canApproveDoc || canRejectDoc || canAuthorizeChange ? (
              <View style={styles.actions}>
                {canAuthorizeChange ? (
                  <Button
                    title="Autorizar cambio"
                    variant="outline"
                    onPress={handleAutorizarCambio}
                    loading={autorizarCambio.isPending}
                    disabled={pending}
                    style={styles.actionButton}
                  />
                ) : null}
                {canRejectDoc ? (
                  <Button title="Rechazar" variant="danger" onPress={() => setShowRechazar(true)} disabled={pending} style={styles.actionButton} />
                ) : null}
                {canApproveDoc ? (
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
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
