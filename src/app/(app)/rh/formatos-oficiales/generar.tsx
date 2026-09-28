import { Ionicons } from '@expo/vector-icons';
import { EncodingType, File, Paths } from 'expo-file-system';
import * as ScreenCapture from 'expo-screen-capture';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { rhFormatosOficialesApi } from '@/api/rh/formatosOficiales';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { Input } from '@/components/Input';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Stepper } from '@/components/Stepper';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useRhColaboradores } from '@/hooks/queries/useRhColaboradores';
import {
  useRhFormatoOficial,
  useRhFormatoOficialGenerar,
  useRhFormatoOficialPreparar,
  useRhFormatoOficialVistaPrevia,
  useRhFormatosOficiales,
} from '@/hooks/queries/useRhFormatosOficiales';
import type { OfficialFormatGeneracion, OfficialFormatItem, OfficialFormatPreparacion } from '@/types/formatoOficial';
import type { RhColaborador } from '@/types/rh';
import { confirmAction } from '@/utils/confirm';
import { getErrorMessage, logError } from '@/utils/errors';
import { aplicaALabel, buildManualesPayload, manualesPendientes, puedeIniciarGeneracion } from '@/utils/formatoOficial';
import { slugifyFilename } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { openRhWeb } from '@/utils/openRhWeb';
import { uniqueTempFileName } from '@/utils/tempFileName';

type WizardStepKey = 'formato' | 'sujeto' | 'revision' | 'resultado';

/**
 * Wizard de generación de un formato oficial — catálogo → colaborador →
 * preparar (datos resueltos/faltantes/manuales) → vista previa opcional →
 * generar. Mirror del patrón de `solicitud/nueva.tsx` (Stepper + un solo
 * componente con pasos), NO del wizard legacy de `rh/formatos/generar.tsx`
 * (motor DOCX distinto, todavía sin backend real).
 *
 * Candidatos: el backend real acepta `tipo_sujeto: 'candidato'`, pero esta
 * app no tiene (ni el encargo describe) un directorio/búsqueda de
 * candidatos en ningún otro módulo — no existe de dónde sacar un
 * `sujeto_id` válido. En vez de inventar un buscador sin endpoint
 * confirmado, el flujo móvil solo genera para COLABORADOR; un formato que
 * aplica exclusivamente a candidatos se marca como "solo desde el Portal
 * RH" (informativo, nunca oculto del catálogo).
 */
export default function RhFormatoOficialGenerarScreen() {
  const router = useRouter();
  const { formato: formatoParam } = useLocalSearchParams<{ formato?: string }>();

  const [formatoId, setFormatoId] = useState<string | undefined>(formatoParam);
  const [colaborador, setColaborador] = useState<RhColaborador | null>(null);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [guardarEnExpediente, setGuardarEnExpediente] = useState(true);
  const [preparacion, setPreparacion] = useState<OfficialFormatPreparacion | null>(null);
  const [preparacionError, setPreparacionError] = useState<unknown>(null);
  const [generado, setGenerado] = useState<OfficialFormatGeneracion | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const formatoQuery = useRhFormatoOficial(formatoId);
  const formato = formatoQuery.data;
  const preparar = useRhFormatoOficialPreparar(formatoId);
  const vistaPrevia = useRhFormatoOficialVistaPrevia(formatoId);
  const generar = useRhFormatoOficialGenerar(formatoId);

  const stepKeys = useMemo<WizardStepKey[]>(() => ['formato', 'sujeto', 'revision', 'resultado'], []);
  const stepLabels = ['Formato', 'Persona', 'Revisión', 'Listo'];
  const currentStepKey: WizardStepKey = generado ? 'resultado' : !formatoId ? 'formato' : !colaborador ? 'sujeto' : 'revision';
  const currentIndex = stepKeys.indexOf(currentStepKey);

  const soloCandidato = formato?.aplica_a === 'candidato';

  const runPreparar = async (target: RhColaborador) => {
    if (!formatoId) return;
    setPreparacionError(null);
    try {
      const result = await preparar.mutateAsync({ tipo_sujeto: 'colaborador', sujeto_id: Number(target.id) });
      setPreparacion(result);
      const seeded: Record<string, string> = {};
      for (const manual of result.manuales) seeded[manual.clave] = manual.valor ?? '';
      setManualValues(seeded);
    } catch (error) {
      logError('rhFormatosOficiales.preparar', error);
      setPreparacionError(error);
    }
  };

  const handleSelectColaborador = (item: RhColaborador) => {
    setColaborador(item);
    void runPreparar(item);
  };

  const pendientes = preparacion ? manualesPendientes(preparacion.manuales, manualValues) : [];
  const puedeGenerar = Boolean(preparacion?.puede_generar) && pendientes.length === 0;

  const buildPayload = () => ({
    tipo_sujeto: 'colaborador' as const,
    sujeto_id: Number(colaborador?.id),
    manuales: preparacion ? buildManualesPayload(preparacion.manuales, manualValues) : undefined,
    guardar_en_expediente: preparacion?.puede_guardar_en_expediente ? guardarEnExpediente : undefined,
  });

  const handleVistaPrevia = async () => {
    if (!formatoId || !colaborador || vistaPrevia.isPending) return;
    try {
      const result = await vistaPrevia.mutateAsync(buildPayload());
      setPreviewBase64(result.pdf_base64);
    } catch (error) {
      logError('rhFormatosOficiales.vistaPrevia', error);
      haptics.error();
    }
  };

  const handleGenerar = async () => {
    if (!formatoId || !colaborador || generar.isPending) return;
    const ok = await confirmAction({
      title: 'Generar documento',
      message: `Se generará "${formato?.nombre ?? 'el documento'}" para ${colaborador.nombre}.`,
      confirmLabel: 'Generar',
    });
    if (!ok) return;
    try {
      const result = await generar.mutateAsync(buildPayload());
      haptics.success();
      setGenerado(result);
    } catch (error) {
      logError('rhFormatosOficiales.generar', error);
      haptics.error();
    }
  };

  const goBack = () => {
    if (currentStepKey === 'formato' || (currentStepKey === 'sujeto' && formatoParam)) {
      router.back();
      return;
    }
    if (currentStepKey === 'sujeto') {
      setFormatoId(undefined);
      return;
    }
    if (currentStepKey === 'revision') {
      setColaborador(null);
      setPreparacion(null);
      setManualValues({});
      return;
    }
    // Pantalla de resultado: no hay un paso previo útil al que regresar
    // dentro del wizard — salir es lo esperado (mismo criterio que "Listo").
    router.back();
  };

  if (viewerOpen && generado) {
    return (
      <SecureDocumentViewer
        path={rhFormatosOficialesApi.verPath(generado.id)}
        title={formato?.nombre ?? 'Documento generado'}
        onClose={() => setViewerOpen(false)}
        allowDownload
        downloadFileName={slugifyFilename(`${formato?.nombre ?? 'documento'}-${generado.id}`)}
      />
    );
  }

  if (previewBase64) {
    return <Base64PdfPreviewModal base64={previewBase64} title={formato?.nombre ?? 'Vista previa'} onClose={() => setPreviewBase64(null)} />;
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Generar documento" showBack onBackPress={goBack} />
      <View style={styles.stepperWrapper}>
        <Stepper steps={stepLabels} currentIndex={currentIndex} />
      </View>

      {currentStepKey === 'formato' ? (
        <FormatoPickerStep onSelect={setFormatoId} />
      ) : currentStepKey === 'sujeto' ? (
        formatoQuery.isLoading ? (
          <View style={styles.content}>
            <SkeletonBlock height={220} radius={Radius.lg} />
          </View>
        ) : soloCandidato ? (
          <View style={styles.content}>
            <Card style={styles.noticeCard}>
              <Ionicons name="person-add-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.noticeTitle}>Este formato es solo para candidatos</Text>
              <Text style={styles.noticeText}>
                Genera este documento desde el Portal RH web: el celular todavía no tiene un directorio de candidatos para elegir.
              </Text>
              <Button title="Abrir Portal RH" variant="outline" onPress={() => void openRhWeb('rh/formatos-oficiales')} />
            </Card>
          </View>
        ) : (
          <ColaboradorPickerStep onSelect={handleSelectColaborador} showCandidatoNote={formato?.aplica_a === 'ambos'} />
        )
      ) : currentStepKey === 'revision' && colaborador ? (
        <RevisionStep
          formato={formato}
          colaborador={colaborador}
          preparando={preparar.isPending}
          preparacionError={preparacionError}
          onReintentarPreparar={() => void runPreparar(colaborador)}
          preparacion={preparacion}
          manualValues={manualValues}
          onChangeManual={(clave, value) => setManualValues((prev) => ({ ...prev, [clave]: value }))}
          pendientes={pendientes}
          guardarEnExpediente={guardarEnExpediente}
          onChangeGuardarEnExpediente={setGuardarEnExpediente}
          puedeGenerar={puedeGenerar}
          onVistaPrevia={() => void handleVistaPrevia()}
          vistaPreviaLoading={vistaPrevia.isPending}
          onGenerar={() => void handleGenerar()}
          generarLoading={generar.isPending}
          generarError={generar.error}
        />
      ) : currentStepKey === 'resultado' && generado ? (
        <ResultadoStep
          generacion={generado}
          onVerDocumento={() => setViewerOpen(true)}
          onDone={() => router.replace(`/(app)/rh/formatos-oficiales/${generado.formato_id}` as never)}
        />
      ) : null}
    </View>
  );
}

function FormatoPickerStep({ onSelect }: { onSelect: (id: string) => void }) {
  const { data, isLoading, isError, error, refetch } = useRhFormatosOficiales({}, true);
  const formatos = useMemo(() => (data ?? []).filter((item) => puedeIniciarGeneracion(item)), [data]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>¿Qué formato quieres generar?</Text>
      {isLoading ? (
        <SkeletonBlock height={220} radius={Radius.lg} />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : formatos.length === 0 ? (
        <Text style={styles.emptyText}>No hay formatos listos para generar todavía.</Text>
      ) : (
        formatos.map((formato: OfficialFormatItem) => (
          <Card key={formato.id} onPress={() => onSelect(String(formato.id))} style={styles.pickerRow}>
            <View style={styles.rowText}>
              <Text style={styles.pickerRowTitle}>{formato.nombre}</Text>
              <Text style={styles.pickerRowSubtitle}>
                {formato.tipo_etiqueta} · {aplicaALabel(formato.aplica_a)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function ColaboradorPickerStep({ onSelect, showCandidatoNote }: { onSelect: (item: RhColaborador) => void; showCandidatoNote: boolean }) {
  const [q, setQ] = useState('');
  const { data, isLoading } = useRhColaboradores({ q: q || undefined, per_page: 20 }, true);
  const colaboradores = useMemo(() => data?.data ?? [], [data]);

  return (
    <View style={styles.pickerContainer}>
      {showCandidatoNote ? (
        <View style={styles.candidatoNote}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.primaryDark} />
          <Text style={styles.candidatoNoteText}>Este formato también aplica a candidatos; genera para candidatos desde el Portal RH.</Text>
        </View>
      ) : null}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Nombre o número de empleado"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar colaborador"
        />
      </View>
      <FlatList
        data={colaboradores}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Sin resultados.</Text> : null}
        renderItem={({ item }) => (
          <Card onPress={() => onSelect(item)} style={styles.pickerRow}>
            <Text style={styles.pickerRowTitle}>{item.nombre}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Card>
        )}
      />
    </View>
  );
}

function RevisionStep({
  formato,
  colaborador,
  preparando,
  preparacionError,
  onReintentarPreparar,
  preparacion,
  manualValues,
  onChangeManual,
  pendientes,
  guardarEnExpediente,
  onChangeGuardarEnExpediente,
  puedeGenerar,
  onVistaPrevia,
  vistaPreviaLoading,
  onGenerar,
  generarLoading,
  generarError,
}: {
  formato: OfficialFormatItem | undefined;
  colaborador: RhColaborador;
  preparando: boolean;
  preparacionError: unknown;
  onReintentarPreparar: () => void;
  preparacion: OfficialFormatPreparacion | null;
  manualValues: Record<string, string>;
  onChangeManual: (clave: string, value: string) => void;
  pendientes: { clave: string }[];
  guardarEnExpediente: boolean;
  onChangeGuardarEnExpediente: (value: boolean) => void;
  puedeGenerar: boolean;
  onVistaPrevia: () => void;
  vistaPreviaLoading: boolean;
  onGenerar: () => void;
  generarLoading: boolean;
  generarError: unknown;
}) {
  if (preparando) {
    return (
      <View style={styles.content}>
        <SkeletonBlock height={280} radius={Radius.lg} />
      </View>
    );
  }

  if (preparacionError) {
    return (
      <View style={styles.content}>
        <ErrorState message={getErrorMessage(preparacionError)} onRetry={onReintentarPreparar} />
      </View>
    );
  }

  if (!preparacion) return null;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card style={styles.headerCard}>
        <Text style={styles.formatoNombre}>{formato?.nombre}</Text>
        <Text style={styles.colaboradorNombre}>{colaborador.nombre}</Text>
      </Card>

      {!preparacion.puede_generar ? (
        <View style={styles.blockedNotice}>
          <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
          <Text style={styles.blockedNoticeText}>{preparacion.motivo ?? 'No se puede generar este documento todavía.'}</Text>
        </View>
      ) : null}

      {preparacion.datos.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Datos que se usarán</Text>
          <Card style={styles.dataCard}>
            {preparacion.datos.map((dato, index) => (
              <View key={`${dato.etiqueta}-${index}`} style={styles.dataRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.dataLabel} numberOfLines={1}>
                  {dato.etiqueta}
                </Text>
                <Text style={styles.dataValue} numberOfLines={1}>
                  {dato.valor}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {preparacion.faltantes.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Faltantes en el expediente</Text>
          <Card style={styles.dataCard}>
            {preparacion.faltantes.map((faltante) => (
              <View key={faltante.variable} style={styles.dataRow}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
                <Text style={styles.dataLabel}>{faltante.etiqueta}</Text>
              </View>
            ))}
            {/* `completar_url` es una ruta WEB — nunca se navega desde la app
                (ver `openRhWeb`/AGENTS.md de este encargo); se avisa como
                texto informativo, no como link. */}
            <Text style={styles.hintText}>Completa estos datos en el expediente desde el Portal RH.</Text>
          </Card>
        </>
      ) : null}

      {preparacion.manuales.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Datos manuales</Text>
          <Card style={styles.dataCard}>
            {preparacion.manuales.map((manual) => (
              <Input
                key={manual.clave}
                label={manual.requerido ? `${manual.etiqueta} *` : manual.etiqueta}
                placeholder={`Escribe ${manual.etiqueta.toLowerCase()}`}
                value={manualValues[manual.clave] ?? ''}
                onChangeText={(value) => onChangeManual(manual.clave, value)}
              />
            ))}
          </Card>
        </>
      ) : null}

      {preparacion.puede_guardar_en_expediente ? (
        <Card style={styles.toggleCard}>
          <View style={styles.rowText}>
            <Text style={styles.toggleLabel}>Guardar en el expediente</Text>
            <Text style={styles.toggleHint}>El documento generado quedará disponible en el expediente del colaborador.</Text>
          </View>
          <Switch
            value={guardarEnExpediente}
            onValueChange={onChangeGuardarEnExpediente}
            trackColor={{ false: Colors.border, true: Colors.primarySoft }}
            thumbColor={guardarEnExpediente ? Colors.primary : Colors.surface}
          />
        </Card>
      ) : null}

      {generarError ? <Text style={styles.errorText}>{getErrorMessage(generarError)}</Text> : null}

      <View style={styles.actionsRow}>
        <Button title="Vista previa" variant="outline" leftIcon="eye-outline" onPress={onVistaPrevia} loading={vistaPreviaLoading} style={styles.actionButton} />
        <Button
          title="Generar"
          leftIcon="document-text-outline"
          onPress={onGenerar}
          loading={generarLoading}
          disabled={!puedeGenerar || generarLoading}
          style={styles.actionButton}
        />
      </View>
      {pendientes.length > 0 ? <Text style={styles.hintText}>Completa los campos obligatorios (*) para poder generar.</Text> : null}
    </ScrollView>
  );
}

function ResultadoStep({ generacion, onVerDocumento, onDone }: { generacion: OfficialFormatGeneracion; onVerDocumento: () => void; onDone: () => void }) {
  return (
    <View style={styles.resultWrapper}>
      <View style={styles.resultIcon}>
        <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
      </View>
      <Text style={styles.resultTitle}>Documento generado</Text>
      <Text style={styles.resultSubtitle}>
        {generacion.formato} · {generacion.persona ?? ''}
      </Text>
      {generacion.en_expediente ? <Text style={styles.resultSubtitle}>Guardado en el expediente.</Text> : null}

      <View style={styles.resultActions}>
        <Button title="Ver documento" leftIcon="eye-outline" variant="outline" onPress={onVerDocumento} style={styles.resultButton} />
        <Button title="Listo" onPress={onDone} style={styles.resultButton} />
      </View>
    </View>
  );
}

const PDF_PREVIEW_PROTECTION_KEY = 'mrlana-formato-oficial-preview';

/**
 * Vista previa ANTES de generar: el backend regresa un PDF en base64
 * (`vista-previa`), no una ruta autenticada como los documentos ya
 * generados — por eso no reutiliza `SecureDocumentViewer` (pensado para
 * streaming vía `path`) sino que escribe el PDF a un archivo temporal y lo
 * muestra en un WebView propio, con la misma protección de captura de
 * pantalla mientras está abierto.
 */
function Base64PdfPreviewModal({ base64, title, onClose }: { base64: string; title: string; onClose: () => void }) {
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync(PDF_PREVIEW_PROTECTION_KEY);
    let file: File | null = null;
    let cancelled = false;

    // El escrito a disco es síncrono (JSI), pero el `setState` se dispara
    // desde dentro de este callback (no directo en el cuerpo del efecto) —
    // mismo patrón que `SecureDocumentViewer` para no disparar renders en
    // cascada (`react-hooks/set-state-in-effect`).
    (() => {
      try {
        const created = new File(Paths.cache, uniqueTempFileName('pdf'));
        created.create();
        created.write(base64, { encoding: EncodingType.Base64 });
        file = created;
        if (cancelled) return;
        setFileUri(created.uri);
      } catch (err) {
        if (cancelled) return;
        logError('formatosOficiales.vistaPreviaPdf', err);
        setError(getErrorMessage(err));
      }
    })();

    return () => {
      cancelled = true;
      void ScreenCapture.allowScreenCaptureAsync(PDF_PREVIEW_PROTECTION_KEY);
      try {
        file?.delete();
      } catch {
        // No crítico: el sistema limpia Paths.cache eventualmente.
      }
    };
  }, [base64]);

  const handleShare = async () => {
    if (!fileUri) return;
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(fileUri, { dialogTitle: title });
    } catch (err) {
      logError('formatosOficiales.vistaPreviaPdf.share', err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.previewSafeArea}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle} numberOfLines={1}>
          Vista previa · {title}
        </Text>
        <View style={styles.previewHeaderActions}>
          {fileUri ? (
            <Button title="Compartir" variant="ghost" leftIcon="share-outline" fullWidth={false} loading={sharing} onPress={() => void handleShare()} style={styles.previewCloseButton} />
          ) : null}
          <Button title="Cerrar" variant="ghost" leftIcon="close" fullWidth={false} onPress={onClose} style={styles.previewCloseButton} />
        </View>
      </View>
      <View style={styles.previewBody}>
        {error ? (
          <ErrorState message={error} />
        ) : fileUri ? (
          <WebView
            source={{ uri: fileUri }}
            originWhitelist={['file://*']}
            allowFileAccess
            allowingReadAccessToURL={fileUri}
            javaScriptEnabled={false}
            style={styles.previewWebview}
          />
        ) : (
          <SkeletonBlock height={420} radius={Radius.lg} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stepperWrapper: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  content: {
    width: '100%',
    maxWidth: Layout.maxFormWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  pickerContainer: { flex: 1 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  candidatoNote: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
  },
  candidatoNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.text },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.sm },
  pickerRowTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, flex: 1 },
  pickerRowSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  noticeCard: { alignItems: 'center', gap: Spacing.sm, textAlign: 'center' },
  noticeTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  noticeText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  headerCard: { gap: 2 },
  formatoNombre: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  colaboradorNombre: { fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: '700' },
  blockedNotice: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'flex-start',
  },
  blockedNoticeText: { flex: 1, fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600' },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  dataCard: { gap: Spacing.sm },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dataLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  dataValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  hintText: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs },
  toggleCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  toggleLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  toggleHint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  rowText: { flex: 1, minWidth: 0 },
  errorText: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600', textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: { flex: 1 },
  resultWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  resultTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  resultSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  resultActions: { gap: Spacing.md, marginTop: Spacing.lg, alignSelf: 'stretch' },
  resultButton: { flex: 1, marginTop: Spacing.sm },
  previewSafeArea: { flex: 1, backgroundColor: Colors.black },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  previewTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginRight: Spacing.sm },
  previewHeaderActions: { flexDirection: 'row', alignItems: 'center' },
  previewCloseButton: { minHeight: 36 },
  previewBody: { flex: 1, backgroundColor: Colors.black },
  previewWebview: { flex: 1, backgroundColor: Colors.black },
});
