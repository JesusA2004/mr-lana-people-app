import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { Input } from '@/components/Input';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { rhFormatosApi } from '@/api/rh/formatos';
import { useRhColaboradores } from '@/hooks/queries/useRhColaboradores';
import { useRhFormatoGenerar, useRhFormatoPreparation, useRhFormatos } from '@/hooks/queries/useRhFormatos';
import type { GeneratedDocument } from '@/types/formato';
import type { RhColaborador } from '@/types/rh';
import { getErrorMessage, logError } from '@/utils/errors';
import { slugifyFilename } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { confirmAction } from '@/utils/confirm';

export default function RhFormatoGenerarScreen() {
  return <FormatoGenerarWizard />;
}

/**
 * Wizard de generación de formato: elegir plantilla → elegir colaborador →
 * revisar datos resueltos/faltantes → capturar variables manuales → generar
 * → descargar/vista previa. Mismo motor DOCX que Portal RH
 * (`App\Http\Controllers\Api\V1\Rh\FormatoController`, ver
 * docs/PLANTILLAS_FORMATOS.md) — la app solo consume, no administra
 * plantillas (subir DOCX, mapear variables) ni elige candidato todavía: no
 * existe `GET /rh/candidatos` para buscarlos desde el celular (gap ya
 * documentado, ver docs/FINAL_MOBILE_AUDIT.md), así que este wizard solo
 * ofrece colaborador.
 */
function FormatoGenerarWizard() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { formato: formatoParam, colaborador: colaboradorParam } = useLocalSearchParams<{ formato?: string; colaborador?: string }>();

  const [plantillaId, setPlantillaId] = useState<string | undefined>(formatoParam);
  const [colaboradorId, setColaboradorId] = useState<string | undefined>(colaboradorParam);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const preparationPayload = colaboradorId ? { tipo_sujeto: 'colaborador' as const, sujeto_id: colaboradorId } : undefined;
  const preparation = useRhFormatoPreparation(plantillaId, preparationPayload);
  const generar = useRhFormatoGenerar();

  const manuales = preparation.data?.manuales ?? [];
  // No recalcular localmente si faltan datos automáticos requeridos (ej.
  // {{curp}} marcado obligatorio en Portal RH → Formatos → Variables): el
  // backend es la única fuente de verdad de `puede_generar`, ver
  // App\Services\Formatos\FormatoPreviewService.
  const manualesCompletos = manuales.every((manual) => !manual.requerido || (overrides[manual.clave] ?? manual.valor).trim() !== '');
  const puedeGenerarAhora = manualesCompletos && (preparation.data?.puede_generar ?? true);
  const faltantesBloqueantes = (preparation.data?.faltantes ?? []).filter((f) => f.requerido);
  const faltantesInformativos = (preparation.data?.faltantes ?? []).filter((f) => !f.requerido);

  // Paso 1: elegir plantilla (solo si no llegó por parámetro).
  if (!plantillaId) {
    return <FormatoPickerStep onSelect={(id) => setPlantillaId(id)} onBack={() => router.back()} />;
  }

  // Paso 2: elegir colaborador (solo si no llegó por parámetro, ej. desde el detalle de un colaborador).
  if (!colaboradorId) {
    return <ColaboradorPickerStep onSelect={(id) => setColaboradorId(id)} onBack={() => setPlantillaId(undefined)} />;
  }

  if (generated) {
    return (
      <GeneratedResultStep
        generated={generated}
        viewerOpen={viewerOpen}
        onPreview={() => setViewerOpen(true)}
        onCloseViewer={() => setViewerOpen(false)}
        onDone={() => router.back()}
      />
    );
  }

  const handleGenerar = async () => {
    if (!plantillaId || !colaboradorId || generar.isPending || !puedeGenerarAhora) return;
    const ok = await confirmAction({
      title: 'Generar documento',
      message: 'Se generará el documento con los datos revisados y quedará en el expediente del colaborador.',
      confirmLabel: 'Generar',
    });
    if (!ok) return;
    generar.mutate(
      { plantillaId, payload: { tipo_sujeto: 'colaborador', sujeto_id: colaboradorId, extra: overrides } },
      {
        onSuccess: (result) => {
          haptics.success();
          setGenerated(result);
        },
        onError: (err) => {
          logError('rhFormatos.generar', err);
          haptics.error();
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Generar documento" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {preparation.isLoading ? (
          <SkeletonBlock height={220} radius={Radius.lg} />
        ) : preparation.isError ? (
          <ErrorState message={getErrorMessage(preparation.error)} onRetry={() => void preparation.refetch()} />
        ) : !preparation.data ? null : (
          <>
            <Card style={styles.headerCard}>
              <Text style={styles.formatoNombre}>{preparation.data.plantilla.nombre}</Text>
              <Text style={styles.colaboradorNombre}>{preparation.data.sujeto.nombre}</Text>
            </Card>

            {preparation.data.datos.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Datos completos</Text>
                <Card style={styles.dataCard}>
                  {preparation.data.datos.map((dato) => (
                    <View key={dato.clave} style={styles.dataRow}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      <Text style={styles.dataLabel}>{dato.etiqueta}</Text>
                      <Text style={styles.dataValue} numberOfLines={1}>
                        {dato.valor}
                      </Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            {manuales.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Datos por capturar</Text>
                <Card style={styles.dataCard}>
                  {manuales.map((manual) => (
                    <Input
                      key={manual.clave}
                      label={manual.requerido ? `${manual.etiqueta} *` : manual.etiqueta}
                      placeholder={manual.descripcion ?? `Completar ${manual.etiqueta.toLowerCase()}`}
                      value={overrides[manual.clave] ?? manual.valor}
                      onChangeText={(value) => setOverrides((prev) => ({ ...prev, [manual.clave]: value }))}
                    />
                  ))}
                </Card>
              </>
            ) : null}

            {faltantesBloqueantes.length > 0 ? (
              <Text style={styles.errorText}>
                Faltan datos obligatorios: {faltantesBloqueantes.map((f) => f.etiqueta).join(', ')}.
              </Text>
            ) : null}

            {faltantesInformativos.length > 0 ? (
              <Text style={styles.avisoText}>
                Sin dato todavía (no impide generar): {faltantesInformativos.map((f) => f.etiqueta).join(', ')}.
              </Text>
            ) : null}

            {!manualesCompletos ? <Text style={styles.errorText}>Completa los campos marcados con * antes de generar.</Text> : null}
            {generar.isError ? <Text style={styles.errorText}>{getErrorMessage(generar.error)}</Text> : null}

            <Button
              title={generar.isPending ? 'Generando documento…' : 'Generar documento'}
              onPress={() => void handleGenerar()}
              loading={generar.isPending}
              disabled={generar.isPending || !puedeGenerarAhora}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FormatoPickerStep({ onSelect, onBack }: { onSelect: (id: string) => void; onBack: () => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const { data, isLoading, isError, error, refetch } = useRhFormatos(true);
  const formatos = data ?? [];

  return (
    <View style={styles.container}>
      <AppHeader title="Elegir formato" showBack onBackPress={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <SkeletonBlock height={220} radius={Radius.lg} />
        ) : isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : formatos.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no hay formatos disponibles.</Text>
        ) : (
          formatos.map((formato) => (
            <Card key={formato.id} onPress={() => onSelect(String(formato.id))} style={styles.pickerRow}>
              <Text style={styles.pickerRowTitle}>{formato.nombre}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ColaboradorPickerStep({ onSelect, onBack }: { onSelect: (id: string) => void; onBack: () => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const [q, setQ] = useState('');
  const { data, isLoading } = useRhColaboradores({ q: q || undefined, per_page: 20 }, true);
  const colaboradores = useMemo(() => data?.data ?? [], [data]);

  return (
    <View style={styles.container}>
      <AppHeader title="Elegir colaborador" showBack onBackPress={onBack} />
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
        />
      </View>
      <FlatList
        data={colaboradores}
        keyExtractor={(item: RhColaborador) => String(item.id)}
        contentContainerStyle={styles.content}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Sin resultados.</Text> : null}
        renderItem={({ item }) => (
          <Card onPress={() => onSelect(String(item.id))} style={styles.pickerRow}>
            <Text style={styles.pickerRowTitle}>{item.nombre}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Card>
        )}
      />
    </View>
  );
}

function GeneratedResultStep({
  generated,
  viewerOpen,
  onPreview,
  onCloseViewer,
  onDone,
}: {
  generated: GeneratedDocument;
  viewerOpen: boolean;
  onPreview: () => void;
  onCloseViewer: () => void;
  onDone: () => void;
}) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  if (viewerOpen) {
    return (
      <SecureDocumentViewer
        path={rhFormatosApi.previewPath(generated.documento_generado_id)}
        title={generated.nombre}
        onClose={onCloseViewer}
        allowDownload={generated.acciones_permitidas.includes('download')}
        downloadFileName={slugifyFilename(generated.nombre)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Documento generado" />
      <View style={styles.resultWrapper}>
        <View style={styles.resultIcon}>
          <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
        </View>
        <Text style={styles.resultTitle}>{generated.nombre}</Text>
        <Text style={styles.resultSubtitle}>{generated.filename}</Text>

        <View style={styles.resultActions}>
          {generated.acciones_permitidas.includes('preview') ? (
            <Button title="Vista previa" leftIcon="eye-outline" variant="outline" onPress={onPreview} style={styles.resultButton} />
          ) : null}
        </View>
        <Button title="Listo" onPress={onDone} style={styles.resultButton} />
      </View>
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
    maxWidth: Layout.maxFormWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  headerCard: {
    gap: 2,
  },
  formatoNombre: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  colaboradorNombre: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  dataCard: {
    gap: Spacing.sm,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dataLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  dataValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  avisoText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontWeight: '600',
    textAlign: 'center',
  },
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
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  pickerRowTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  resultWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  resultTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  resultActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
  },
  resultButton: {
    flex: 1,
    marginTop: Spacing.sm,
  },
});
