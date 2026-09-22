import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { documentosLaboralesApi } from '@/api/documentosLaborales';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { StepTimeline } from '@/components/ciclo/StepTimeline';
import { PressableScale } from '@/components/PressableScale';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useFirmarDocumentoLaboral, useLaborDocument } from '@/hooks/queries/useLaborDocuments';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { slugifyFilename } from '@/utils/formatters';
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
 * (`GeneratedDocumentPolicy::firmar`) y exige confirmación consciente:
 * abrir el documento + marcar "Leí y acepto". El colaborador NUNCA
 * administra impresión, envío, recepción ni archivo físico — eso es de RH.
 */
export default function DocumentoLaboralDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = Number(id);
  const query = useLaborDocument(Number.isFinite(numericId) ? numericId : undefined);
  const firmar = useFirmarDocumentoLaboral();
  const { isOffline } = useNetworkStatus();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [leido, setLeido] = useState(false);
  const [acepto, setAcepto] = useState(false);

  const documento = query.data ?? null;

  if (viewerOpen && documento) {
    return (
      <SecureDocumentViewer
        path={documentosLaboralesApi.descargarPath(documento.id)}
        title={documento.titulo}
        onClose={() => {
          setViewerOpen(false);
          setLeido(true);
        }}
        allowDownload
        downloadFileName={slugifyFilename(documento.titulo)}
      />
    );
  }

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
      error={query.error}
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
            <Button title="Ver documento" leftIcon="eye-outline" variant="outline" onPress={() => setViewerOpen(true)} />
          </Card>

          {puedeFirmar ? (
            <Card style={styles.gap}>
              <SectionTitle>Firma digital</SectionTitle>
              <Notice tone="info">
                Lee el documento completo antes de firmar. Tu aceptación digital tiene validez interna y queda registrada con fecha, dispositivo y huella
                del archivo.
              </Notice>
              {!leido ? <Text style={styles.hint}>Abre el documento con «Ver documento» para habilitar la firma.</Text> : null}
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Leí el documento y acepto su contenido"
                disabled={!leido}
                onPress={() => setAcepto((value) => !value)}
                style={[styles.checkRow, !leido && styles.disabled] as object}>
                <Ionicons name={acepto ? 'checkbox' : 'square-outline'} size={24} color={acepto ? Colors.primary : Colors.textMuted} />
                <Text style={styles.checkLabel}>Leí el documento y acepto su contenido.</Text>
              </PressableScale>
              {isOffline ? <Notice tone="warning">Sin conexión: la firma requiere confirmación del servidor.</Notice> : null}
              <Button
                title="Firmar / Aceptar"
                leftIcon="create-outline"
                disabled={!acepto || !leido || isOffline}
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

const styles = StyleSheet.create({
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
