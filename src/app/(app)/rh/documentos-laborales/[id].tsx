import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { rhDocumentosLaboralesApi } from '@/api/rh/cicloLaboral';
import type { LocalUploadFile } from '@/api/upload';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilePickButton } from '@/components/ciclo/FilePickButton';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { StepTimeline } from '@/components/ciclo/StepTimeline';
import { DocumentUploadSheet } from '@/components/DocumentUploadSheet';
import { MotivoModal } from '@/components/MotivoModal';
import { PressableScale } from '@/components/PressableScale';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhDocumentoLaboral, useRhOperarDocumentoLaboral, type RhDocumentoOperacion } from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { formatDateLong, formatDateTime } from '@/utils/dates';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { joinName, slugifyFilename } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import {
  availableRhDocumentOperations,
  buildLaborDocumentTimeline,
  laborDocumentBadgeStatus,
  laborDocumentKicker,
  RH_DOCUMENT_OPERATION_LABELS,
  type RhDocumentOperation,
} from '@/utils/laborDocuments';

type Sheet = null | 'imprimir' | 'firma_fisica' | 'envio' | 'recepcion' | 'archivar' | 'escaneo' | 'cancelar';

/**
 * Detalle RH de un documento laboral: datos, bitácora real (`eventos`) y
 * acciones contextuales del ORIGINAL FÍSICO (imprimir, firma física, envío,
 * recepción, escaneo, archivar, cancelar) — solo las que el permiso real y
 * el estado actual permiten (`availableRhDocumentOperations`). La firma
 * digital es del colaborador titular y NUNCA se ofrece aquí.
 */
export default function RhDocumentoLaboralScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRhDocumentoLaboral(id);
  const documento = query.data;
  const bootstrap = useMobileBootstrap(true);
  const user = useAuthStore((state) => state.user);
  const operar = useRhOperarDocumentoLaboral(Number(id), documento?.colaborador?.id ?? null);
  const { isOffline } = useNetworkStatus();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [observaciones, setObservaciones] = useState('');
  const [huella, setHuella] = useState(false);
  const [testigo, setTestigo] = useState('');
  const [paqueteria, setPaqueteria] = useState('');
  const [guia, setGuia] = useState('');
  const [comprobante, setComprobante] = useState<LocalUploadFile | null>(null);

  if (viewerOpen && documento) {
    return (
      <SecureDocumentViewer
        path={rhDocumentosLaboralesApi.descargarPath(documento.id)}
        title={documento.titulo}
        watermarkLabel={`${joinName(user?.nombre, user?.apellidos) ?? 'RH'} · ${new Date().toLocaleString('es-MX')}`}
        onClose={() => setViewerOpen(false)}
        allowDownload
        downloadFileName={slugifyFilename(documento.titulo)}
      />
    );
  }

  const ops = documento ? availableRhDocumentOperations(documento, bootstrap.data?.user.permissions) : [];

  const resetForm = () => {
    setSheet(null);
    setObservaciones('');
    setHuella(false);
    setTestigo('');
    setPaqueteria('');
    setGuia('');
    setComprobante(null);
  };

  const ejecutar = (op: RhDocumentoOperacion, exito: string) => {
    operar.mutate(op, {
      onSuccess: () => {
        haptics.success();
        toast.success(exito);
        resetForm();
      },
      onError: (error) => {
        logError('rhDocumentoLaboral.operar', error);
        haptics.error();
        toast.error(getActionErrorMessage(error));
      },
    });
  };

  const abrirOperacion = (op: RhDocumentOperation) => setSheet(op);

  return (
    <Screen
      title="Documento laboral"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Este documento ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {documento ? (
        <>
          <Card style={styles.gap}>
            <Text style={styles.kicker}>{laborDocumentKicker(documento)}</Text>
            <Text style={styles.title}>{documento.titulo}</Text>
            <View style={styles.row}>
              <StatusBadge status={laborDocumentBadgeStatus(documento.estado)} label={documento.estado_etiqueta ?? undefined} />
            </View>
            {documento.colaborador ? (
              <PressableScale
                accessibilityRole="link"
                onPress={() => router.push(`/(app)/rh/colaboradores/${documento.colaborador?.id}` as never)}
                style={styles.linkRow}>
                <Ionicons name="person-circle-outline" size={18} color={Colors.primaryDark} />
                <Text style={styles.link}>
                  {documento.colaborador.nombre}
                  {documento.colaborador.numero_empleado ? ` · ${documento.colaborador.numero_empleado}` : ''}
                </Text>
              </PressableScale>
            ) : null}
            <InfoRow label="Generado" value={formatDateLong(documento.generado_en)} />
            <InfoRow label="Plantilla" value={documento.clave_plantilla ? `${documento.clave_plantilla} v${documento.version_plantilla ?? '?'}` : null} />
            <InfoRow
              label="Requiere"
              value={[
                documento.requiere_firma_digital && 'firma digital',
                documento.requiere_impresion && 'impresión',
                documento.requiere_firma_fisica && 'firma física',
                documento.requiere_huella && 'huella',
                documento.requiere_testigos && 'testigos',
              ]
                .filter(Boolean)
                .join(', ')}
            />
            <InfoRow label="Firmado digitalmente" value={formatDateTime(documento.firmado_digital_en)} />
            <Button title="Ver documento" variant="outline" leftIcon="eye-outline" onPress={() => setViewerOpen(true)} />
          </Card>

          {documento.original_fisico ? (
            <Card style={styles.gap}>
              <SectionTitle>Original físico</SectionTitle>
              <InfoRow label="Impreso" value={formatDateTime(documento.original_fisico.impreso_en)} />
              <InfoRow label="Firma física" value={formatDateTime(documento.original_fisico.firmado_fisico_en)} />
              <InfoRow label="Huella registrada" value={documento.original_fisico.firmado_fisico_en ? (documento.original_fisico.huella_registrada ? 'Sí' : 'No') : null} />
              <InfoRow label="Testigos" value={documento.original_fisico.testigos.map((t) => t.nombre).join(', ')} />
              <InfoRow label="Paquetería" value={documento.original_fisico.paqueteria} />
              <InfoRow label="Guía" value={documento.original_fisico.numero_guia} />
              <InfoRow label="Enviado" value={formatDateTime(documento.original_fisico.enviado_en)} />
              <InfoRow label="Comprobante de envío" value={documento.original_fisico.enviado_en ? (documento.original_fisico.tiene_comprobante ? 'Sí' : 'No') : null} />
              <InfoRow label="Recibido" value={formatDateTime(documento.original_fisico.recibido_en)} />
              <InfoRow label="Escaneado" value={formatDateTime(documento.original_fisico.escaneado_en)} />
            </Card>
          ) : null}

          {ops.length > 0 ? (
            <Card style={styles.gap}>
              <SectionTitle>Acciones</SectionTitle>
              {isOffline ? <Notice tone="warning">Sin conexión: las acciones requieren confirmación del servidor.</Notice> : null}
              {ops.map((op) => (
                <Button
                  key={op}
                  title={RH_DOCUMENT_OPERATION_LABELS[op]}
                  variant={op === 'cancelar' ? 'danger' : 'outline'}
                  disabled={isOffline || operar.isPending}
                  onPress={() => abrirOperacion(op)}
                />
              ))}
            </Card>
          ) : (
            <Notice tone="info">
              {documento.estado === 'pendiente_firma_colaborador'
                ? 'Esperando la firma digital del colaborador desde su app.'
                : 'No hay acciones disponibles para tu cuenta en esta etapa.'}
            </Notice>
          )}

          <Card>
            <SectionTitle>Flujo</SectionTitle>
            <View style={styles.timeline}>
              <StepTimeline items={buildLaborDocumentTimeline(documento)} />
            </View>
          </Card>

          {documento.eventos && documento.eventos.length > 0 ? (
            <Card>
              <SectionTitle>Bitácora</SectionTitle>
              <View style={styles.timeline}>
                <StepTimeline
                  items={documento.eventos.map((evento, index) => ({
                    key: `${evento.fecha}-${index}`,
                    label: evento.accion.replace(/_/g, ' '),
                    status: 'done',
                    date: evento.fecha,
                    detail: [evento.usuario, evento.observaciones].filter(Boolean).join(' — ') || null,
                  }))}
                />
              </View>
            </Card>
          ) : null}

          {/* Imprimir / recepción / archivar: solo observaciones opcionales. */}
          <FormSheet
            visible={sheet === 'imprimir' || sheet === 'recepcion' || sheet === 'archivar'}
            title={sheet ? RH_DOCUMENT_OPERATION_LABELS[sheet as RhDocumentOperation] : ''}
            confirmLabel="Confirmar"
            submitting={operar.isPending}
            onCancel={resetForm}
            onConfirm={() => {
              const obs = observaciones.trim() || null;
              if (sheet === 'imprimir') ejecutar({ tipo: 'imprimir', observaciones: obs }, 'Documento marcado como impreso.');
              if (sheet === 'recepcion') ejecutar({ tipo: 'recepcion', observaciones: obs }, 'Recepción registrada.');
              if (sheet === 'archivar') ejecutar({ tipo: 'archivar', observaciones: obs }, 'Documento archivado.');
            }}>
            <Field label="Observaciones (opcional)" value={observaciones} onChangeText={setObservaciones} multiline maxLength={1000} />
          </FormSheet>

          <FormSheet
            visible={sheet === 'firma_fisica'}
            title="Registrar firma física"
            description="Registra que el colaborador firmó el original impreso."
            confirmLabel="Registrar"
            submitting={operar.isPending}
            confirmDisabled={(documento.requiere_huella && !huella) || (documento.requiere_testigos && testigo.trim() === '')}
            onCancel={resetForm}
            onConfirm={() =>
              ejecutar(
                {
                  tipo: 'firma_fisica',
                  payload: {
                    huella_registrada: huella,
                    testigos: testigo.trim() ? testigo.split(',').map((nombre) => ({ nombre: nombre.trim() })).filter((t) => t.nombre) : undefined,
                    observaciones: observaciones.trim() || null,
                  },
                },
                'Firma física registrada.',
              )
            }>
            {documento.requiere_huella ? (
              <PressableScale accessibilityRole="button" accessibilityLabel="Huella recabada" onPress={() => setHuella((v) => !v)} style={styles.checkRow}>
                <Ionicons name={huella ? 'checkbox' : 'square-outline'} size={24} color={huella ? Colors.primary : Colors.textMuted} />
                <Text style={styles.checkLabel}>Se recabó la huella del colaborador (obligatorio)</Text>
              </PressableScale>
            ) : null}
            <Field
              label={documento.requiere_testigos ? 'Testigos (obligatorio, separa con comas)' : 'Testigos (opcional, separa con comas)'}
              value={testigo}
              onChangeText={setTestigo}
              error={getFieldError(operar.error, 'testigos')}
            />
            <Field label="Observaciones (opcional)" value={observaciones} onChangeText={setObservaciones} multiline maxLength={1000} />
          </FormSheet>

          <FormSheet
            visible={sheet === 'envio'}
            title="Registrar envío a corporativo"
            confirmLabel="Registrar envío"
            submitting={operar.isPending}
            confirmDisabled={paqueteria.trim() === '' || guia.trim() === ''}
            onCancel={resetForm}
            onConfirm={() =>
              ejecutar(
                { tipo: 'envio', payload: { paqueteria: paqueteria.trim(), numero_guia: guia.trim(), observaciones: observaciones.trim() || null, comprobante } },
                'Envío registrado.',
              )
            }>
            <Field label="Paquetería" value={paqueteria} onChangeText={setPaqueteria} maxLength={80} error={getFieldError(operar.error, 'paqueteria')} />
            <Field label="Número de guía" value={guia} onChangeText={setGuia} maxLength={80} autoCapitalize="characters" error={getFieldError(operar.error, 'numero_guia')} />
            <FilePickButton label="Comprobante (opcional)" file={comprobante} onChange={setComprobante} />
            <Field label="Observaciones (opcional)" value={observaciones} onChangeText={setObservaciones} multiline maxLength={1000} />
          </FormSheet>

          <DocumentUploadSheet
            visible={sheet === 'escaneo'}
            title={`Escaneo del original: ${documento.titulo}`}
            onClose={resetForm}
            onConfirm={async (file) => {
              await operar.mutateAsync({ tipo: 'escaneo', archivo: { uri: file.uri, name: file.name, mimeType: file.mimeType } });
              haptics.success();
              toast.success('Escaneo registrado y archivado en el expediente.');
              resetForm();
            }}
          />

          <MotivoModal
            visible={sheet === 'cancelar'}
            title="Cancelar documento"
            description="El documento quedará cancelado y ya no seguirá su flujo. Esta acción queda en la bitácora."
            confirmLabel="Cancelar documento"
            submitting={operar.isPending}
            onCancel={resetForm}
            onConfirm={(motivo) =>
              Alert.alert('¿Cancelar el documento?', 'No se puede deshacer.', [
                { text: 'No', style: 'cancel' },
                { text: 'Sí, cancelar', style: 'destructive', onPress: () => ejecutar({ tipo: 'cancelar', motivo }, 'Documento cancelado.') },
              ])
            }
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.xs,
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
    marginBottom: Spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 40,
  },
  link: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  timeline: {
    marginTop: Spacing.md,
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
});
