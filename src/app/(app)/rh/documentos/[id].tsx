import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { MotivoModal } from '@/components/MotivoModal';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { rhDocumentosApi } from '@/api/rh/documentos';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhDocumento, useRhDocumentoAprobar, useRhDocumentoRechazar } from '@/hooks/queries/useRhDocumentos';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { formatDateTime } from '@/utils/dates';
import { getErrorMessage, isConcurrencyConflict, logError } from '@/utils/errors';
import { joinName } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { canApprove, canReject } from '@/utils/rhActions';

/** Detalle de documento RH (AGENTS.md sección 11): visor seguro dentro de la app, nunca descarga/comparte. */
export default function RhDocumentoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const { data: documento, isLoading, isError, error, refetch, isRefetching } = useRhDocumento(id);
  const aprobar = useRhDocumentoAprobar();
  const rechazar = useRhDocumentoRechazar();
  const [showRechazar, setShowRechazar] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const pending = aprobar.isPending || rechazar.isPending;

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
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
