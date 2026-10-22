import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { rhExpedientesApi } from '@/api/rh/expedientes';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DescargaExpedienteModal } from '@/components/DescargaExpedienteModal';
import { ErrorState } from '@/components/ErrorState';
import { FilaDocumentoExpediente } from '@/components/FilaDocumentoExpediente';
import { MotivoModal } from '@/components/MotivoModal';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useRhExpediente, useRhExpedienteAprobarIncorporacion, useRhExpedienteRechazarIncorporacion } from '@/hooks/queries/useRhExpedientes';
import { usePermisos } from '@/hooks/usePermisos';
import { toast } from '@/store/toastStore';
import { getErrorMessage, isConcurrencyConflict, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/**
 * Expediente completo RH (AGENTS.md sección 14): detalle del colaborador,
 * documentos (cada uno con «Descargar» si el backend lo autoriza), «Descargar
 * expediente completo (ZIP)» con pantalla de progreso, y aprobar/rechazar
 * incorporación. `rh_auxiliar` (solo lectura) nunca ve estos dos botones —
 * se comprueba contra el permiso real, no contra el nombre del rol.
 */
export default function RhExpedienteDetailScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { colaborador: colaboradorId } = useLocalSearchParams<{ colaborador: string }>();
  const { data: expediente, isLoading, isError, error, refetch, isRefetching } = useRhExpediente(colaboradorId);
  const permisos = usePermisos();
  const aprobarIncorporacion = useRhExpedienteAprobarIncorporacion();
  const rechazarIncorporacion = useRhExpedienteRechazarIncorporacion();
  const [showRechazar, setShowRechazar] = useState(false);
  const [descargandoZip, setDescargandoZip] = useState(false);

  const canApproveIncorporation = permisos.puede('rh.expedientes.incorporacion.aprobar');
  const canRejectIncorporation = permisos.puede('rh.expedientes.incorporacion.rechazar');
  const puedeZip = expediente?.puede_descargar_expediente === true;
  const nombreColaborador = expediente?.colaborador.nombre ?? 'Colaborador';
  const numeroEmpleado = expediente?.colaborador.numero_empleado;
  const nombreZip = numeroEmpleado ? `Expediente ${numeroEmpleado} - ${nombreColaborador}` : `Expediente - ${nombreColaborador}`;
  const pending = aprobarIncorporacion.isPending || rechazarIncorporacion.isPending;

  function handleActionError(err: unknown) {
    logError('rhExpediente.accion', err);
    haptics.error();
    if (isConcurrencyConflict(err)) {
      toast.error('Este expediente ya fue atendido. Actualizamos la información.');
      void refetch();
      return;
    }
    toast.error(getErrorMessage(err));
  }

  const handleAprobar = () => {
    if (!colaboradorId) return;
    Alert.alert('Aprobar incorporación', 'Esto activará al colaborador para que use el portal normal. ¿Confirmas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: () =>
          aprobarIncorporacion.mutate(colaboradorId, {
            onSuccess: () => {
              haptics.success();
              toast.success('Incorporación aprobada.');
            },
            onError: handleActionError,
          }),
      },
    ]);
  };

  const handleRechazar = (motivo: string) => {
    if (!colaboradorId) return;
    rechazarIncorporacion.mutate(
      { colaboradorId, motivo },
      {
        onSuccess: () => {
          haptics.success();
          toast.success('Incorporación rechazada.');
          setShowRechazar(false);
        },
        onError: handleActionError,
      },
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Expediente" showBack onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: Spacing.lg }}>
            <SkeletonBlock height={120} radius={Radius.lg} />
            <SkeletonBlock height={240} radius={Radius.lg} />
          </View>
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !expediente ? null : (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.collaboratorName}>{expediente.colaborador.nombre}</Text>
                <StatusBadge status={expediente.estado} />
              </View>
              <Text style={styles.collaboratorMeta}>
                {[
                  expediente.colaborador.numero_empleado ? `N.º ${expediente.colaborador.numero_empleado}` : null,
                  expediente.colaborador.puesto,
                  expediente.colaborador.sucursal,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {/* Contacto corporativo (no el correo de acceso ni datos personales); se omite si no lo tiene. */}
              {expediente.colaborador.correo_corporativo ? (
                <Text style={styles.collaboratorMeta}>Correo corporativo: {expediente.colaborador.correo_corporativo}</Text>
              ) : null}
              {expediente.colaborador.telefono_corporativo ? (
                <Text style={styles.collaboratorMeta}>Teléfono corporativo: {expediente.colaborador.telefono_corporativo}</Text>
              ) : null}
            </Card>

            {puedeZip && colaboradorId ? (
              <Card style={styles.zipCard}>
                <View style={styles.zipRow}>
                  <View style={styles.zipIcon}>
                    <Ionicons name="archive-outline" size={24} color={Colors.primaryDark} />
                  </View>
                  <View style={styles.documentText}>
                    <Text style={styles.zipTitle}>Expediente completo</Text>
                    <Text style={styles.collaboratorMeta}>Un ZIP con todos los documentos vigentes, su historial y un índice.</Text>
                  </View>
                </View>
                <Button title="Descargar expediente completo (ZIP)" leftIcon="download-outline" onPress={() => setDescargandoZip(true)} />
              </Card>
            ) : null}

            <Text style={styles.sectionTitle}>Documentos</Text>
            <View style={styles.list}>
              {expediente.documentos.map((documento) => {
                const documentoId = documento.id;
                return (
                  <FilaDocumentoExpediente
                    key={documentoId ?? `tipo-${documento.tipo_id ?? documento.tipo}`}
                    nombre={documento.nombre}
                    obligatorio={documento.obligatorio}
                    estado={documento.estado}
                    motivoRechazo={documento.motivo_rechazo}
                    tituloDescarga={`${documento.nombre} - ${nombreColaborador}`}
                    pathDescarga={
                      documentoId !== null && documento.puede_descargar && colaboradorId
                        ? rhExpedientesApi.descargarDocumentoPath(colaboradorId, documentoId)
                        : null
                    }
                    onPress={
                      documentoId !== null
                        ? () => router.push(`/(app)/rh/expedientes/${colaboradorId}/documentos/${documentoId}` as never)
                        : undefined
                    }
                  />
                );
              })}
            </View>

            {canApproveIncorporation || canRejectIncorporation ? (
              <View style={styles.actions}>
                {canRejectIncorporation ? (
                  <Button title="Rechazar incorporación" variant="danger" onPress={() => setShowRechazar(true)} disabled={pending} style={styles.actionButton} />
                ) : null}
                {canApproveIncorporation ? (
                  <Button title="Aprobar incorporación" onPress={handleAprobar} loading={aprobarIncorporacion.isPending} disabled={pending} style={styles.actionButton} />
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <MotivoModal
        visible={showRechazar}
        title="Rechazar incorporación"
        description="El colaborador podrá seguir corrigiendo documentos y volver a enviarse a revisión."
        confirmLabel="Rechazar"
        submitting={rechazarIncorporacion.isPending}
        onCancel={() => setShowRechazar(false)}
        onConfirm={handleRechazar}
      />

      {colaboradorId ? (
        <DescargaExpedienteModal
          visible={descargandoZip}
          path={rhExpedientesApi.descargarZipPath(colaboradorId)}
          colaborador={nombreColaborador}
          nombreArchivo={nombreZip}
          onClose={() => setDescargandoZip(false)}
        />
      ) : null}
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
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collaboratorName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    flexShrink: 1,
  },
  collaboratorMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  list: {
    gap: Spacing.sm,
  },
  zipCard: {
    gap: Spacing.md,
  },
  zipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  zipIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zipTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  documentText: {
    flex: 1,
    minWidth: 0,
  },
  documentName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  documentReason: {
    fontSize: FontSize.xs,
    color: Colors.danger,
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
