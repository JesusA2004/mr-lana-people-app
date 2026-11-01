import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { documentosLaboralesApi } from '@/api/documentosLaborales';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DocumentoProtegido } from '@/components/DocumentoProtegido';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { StepTimeline } from '@/components/ciclo/StepTimeline';
import { PressableScale } from '@/components/PressableScale';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useFirmarDocumentoLaboral, useLaborDocument } from '@/hooks/queries/useLaborDocuments';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AUTORIZADO_POR_POLICY_ACTUAL } from '@/utils/autorizacionDocumento';
import { toast } from '@/store/toastStore';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';
import {
  buildLaborDocumentTimeline,
  canColaboradorSign,
  colaboradorDocumentHint,
  laborDocumentBadgeStatus,
  laborDocumentKicker,
} from '@/utils/laborDocuments';

/**
 * Detalle + firma digital de un documento laboral PROPIO.
 *
 * Firma: `POST /colaborador/documentos-laborales/{id}/firmar` con
 * `acepto=true`. Solo se ofrece en `pendiente_firma_colaborador`
 * (`GeneratedDocumentPolicy::firmar`) y exige confirmación consciente: que el
 * documento se haya DIBUJADO en el visor (cerrar o fallar no cuenta) + marcar
 * "Leí y acepto". El colaborador NUNCA
 * administra impresión, envío, recepción ni archivo físico — eso es de RH.
 */
export default function DocumentoLaboralDetailScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = Number(id);
  const query = useLaborDocument(Number.isFinite(numericId) ? numericId : undefined);
  const firmar = useFirmarDocumentoLaboral();
  const { isOffline } = useNetworkStatus();
  /** Solo `onAperturaVerificada` lo enciende: el PDF se dibujó de verdad. */
  const [aperturaVerificada, setAperturaVerificada] = useState(false);
  const [acepto, setAcepto] = useState(false);

  const documento = query.data ?? null;

  const puedeFirmar = !!documento && canColaboradorSign(documento);

  const confirmarFirma = () => {
    if (!documento) return;
    Alert.alert(
      'Firmar / aceptar documento',
      `Vas a firmar digitalmente «${documento.titulo}». Quedará registrada la fecha, el dispositivo y la huella del documento aceptado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Firmar',
          onPress: () =>
            firmar.mutate(
              { id: documento.id },
              {
                onSuccess: () => {
                  haptics.success();
                  toast.success('Documento firmado digitalmente.');
                  setAcepto(false);
                  void query.refetch();
                },
                onError: (error) => {
                  logError('documentoLaboral.firmar', error);
                  haptics.error();
                  toast.error(getActionErrorMessage(error));
                  void query.refetch();
                },
              },
            ),
        },
      ],
    );
  };

  return (
    <Screen
      title="Documento laboral"
      isLoading={query.isLoading}
      error={query.error} hayDatos={query.data !== undefined}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {!documento ? (
        <Notice tone="warning">Este documento ya no está disponible. Puede que RH lo haya cancelado.</Notice>
      ) : (
        <>
          <Card style={styles.gap}>
            <Text style={styles.kicker}>{laborDocumentKicker(documento)}</Text>
            <Text style={styles.title} accessibilityRole="header">
              {documento.titulo}
            </Text>
            <View style={styles.row}>
              <StatusBadge status={laborDocumentBadgeStatus(documento.estado)} label={documento.estado_etiqueta ?? undefined} />
            </View>
            <Text style={styles.hint}>{colaboradorDocumentHint(documento)}</Text>
            <InfoRow label="Emitido" value={formatDateLong(documento.generado_en)} icon="calendar-outline" />
            <InfoRow label="Requiere firma digital" value={documento.requiere_firma_digital ? 'Sí' : 'No'} icon="create-outline" />
            <InfoRow label="Firmado digitalmente" value={formatDateTime(documento.firmado_digital_en)} icon="checkmark-done-outline" />
            <InfoRow label="Versión de plantilla" value={documento.version_plantilla} icon="layers-outline" />
          </Card>

          {/*
            RONDA 2: `documento.puede_descargar`. Hoy `GeneratedDocumentPolicy::descargar`
            autoriza siempre al titular, y `ver` ya filtró esta pantalla. La ruta de consulta
            también será propia en la ronda 2; hoy solo existe `/descargar`.
          */}
          <DocumentoProtegido
            titulo={documento.titulo}
            modo={puedeFirmar ? 'firma' : 'descarga'}
            path={documentosLaboralesApi.descargarPath(documento.id)}
            puedeDescargar={AUTORIZADO_POR_POLICY_ACTUAL}
            pathConsulta={puedeFirmar ? documentosLaboralesApi.descargarPath(documento.id) : undefined}
            onAperturaVerificada={() => setAperturaVerificada(true)}
          />

          {puedeFirmar ? (
            <Card style={styles.gap}>
              <SectionTitle>Firma digital</SectionTitle>
              <Notice tone="info">
                Lee el documento completo antes de firmar. Tu aceptación digital tiene validez interna y queda registrada con fecha, dispositivo y huella
                del archivo.
              </Notice>
              {!aperturaVerificada ? <Text style={styles.hint}>Abre el documento y espera a que se muestre para habilitar la firma.</Text> : null}
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Leí el documento y acepto su contenido"
                disabled={!aperturaVerificada}
                onPress={() => setAcepto((value) => !value)}
                style={[styles.checkRow, !aperturaVerificada && styles.disabled] as object}>
                <Ionicons name={acepto ? 'checkbox' : 'square-outline'} size={24} color={acepto ? Colors.primary : Colors.textMuted} />
                <Text style={styles.checkLabel}>Leí el documento y acepto su contenido.</Text>
              </PressableScale>
              {isOffline ? <Notice tone="warning">Sin conexión: la firma requiere confirmación del servidor.</Notice> : null}
              <Button
                title="Firmar / Aceptar"
                leftIcon="create-outline"
                disabled={!acepto || !aperturaVerificada || isOffline}
                loading={firmar.isPending}
                onPress={confirmarFirma}
              />
            </Card>
          ) : null}

          <Card>
            <SectionTitle>Seguimiento</SectionTitle>
            <View style={styles.timeline}>
              <StepTimeline items={buildLaborDocumentTimeline(documento)} />
            </View>
            {documento.original_fisico || documento.requiere_firma_fisica ? (
              <Text style={styles.hint}>El original físico (impresión, firma autógrafa, envío y archivo) lo gestiona Recursos Humanos.</Text>
            ) : null}
          </Card>

          <Button title="Volver a mis documentos" variant="ghost" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  gap: {
    gap: Spacing.sm,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  checkLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  disabled: {
    opacity: 0.5,
  },
  timeline: {
    marginTop: Spacing.md,
  },
});
