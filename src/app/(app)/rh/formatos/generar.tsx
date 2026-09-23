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
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { rhFormatosApi } from '@/api/rh/formatos';
import { useRhColaboradores } from '@/hooks/queries/useRhColaboradores';
import { useRhFormatoGenerar, useRhFormatoPreparation, useRhFormatos } from '@/hooks/queries/useRhFormatos';
import type { FormatoOutput, GeneratedDocument } from '@/types/formato';
import type { RhColaborador } from '@/types/rh';
import { getErrorMessage, logError } from '@/utils/errors';
import { slugifyFilename } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { confirmAction } from '@/utils/confirm';

/**
 * `preparar`/`generar`/`generados/{id}/preview` NO existen todavía en el
 * backend real (confirmado contra `routes/api.php` — solo catálogo +
 * descarga de lo ya generado, ver `docs/BACKEND_GAPS_FINAL.md`). El wizard
 * de abajo queda completo y compilando para el día que existan, pero esta
 * pantalla nunca debe dejar a RH pulsar una acción que hoy solo puede
 * responder 404 — ninguna navegación real de la app enlaza aquí (ver
 * `rh/formatos/index.tsx` y `rh/colaboradores/[id].tsx`), y esta bandera
 * es una segunda barrera por si algún día se alcanza por deep link directo.
 */
const GENERACION_MOVIL_DISPONIBLE = false;

export default function RhFormatoGenerarScreen() {
  const router = useRouter();

  // Nunca condicionar hooks a esta bandera (rules-of-hooks): el wizard real
  // vive en un componente hijo separado (`FormatoGenerarWizard`) que solo
  // se monta cuando `GENERACION_MOVIL_DISPONIBLE` es `true`.
  if (!GENERACION_MOVIL_DISPONIBLE) {
    return (
      <View style={styles.container}>
        <AppHeader title="Generar documento" showBack onBackPress={() => router.back()} />
        <View style={styles.resultWrapper}>
          <Ionicons name="construct-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.resultTitle}>Todavía no disponible desde el celular</Text>
          <Text style={styles.resultSubtitle}>Genera este documento desde el panel web de MR. LANA PEOPLE por ahora.</Text>
          <Button title="Regresar" onPress={() => router.back()} style={styles.resultButton} />
        </View>
      </View>
    );
  }

  return <FormatoGenerarWizard />;
}

/**
 * Wizard corto de generación de formato (AGENTS.md de este encargo,
 * secciones 42-44): seleccionar formato → prellenar → revisar faltantes →
 * vista previa → generar → descargar. Separado del export default para
 * respetar rules-of-hooks: solo se monta cuando la generación móvil está
 * habilitada.
 */
function FormatoGenerarWizard() {
  const router = useRouter();
  const { formato: formatoParam, colaborador: colaboradorParam } = useLocalSearchParams<{ formato?: string; colaborador?: string }>();

  const [formatoId, setFormatoId] = useState<string | undefined>(formatoParam);
  const [colaboradorId, setColaboradorId] = useState<string | undefined>(colaboradorParam);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  // Solo se guarda la elección EXPLÍCITA de la persona — el valor por
  // default (primer `formatos_salida` del formato) se deriva del render,
  // nunca se sincroniza con un efecto (evita el cascading render de
  // `setState` dentro de `useEffect`).
  const [outputOverride, setOutputOverride] = useState<FormatoOutput | undefined>(undefined);
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const preparation = useRhFormatoPreparation(formatoId, colaboradorId);
  const generar = useRhFormatoGenerar();
  const output = outputOverride ?? preparation.data?.formato.formatos_salida[0];

  // Paso 1: elegir formato (solo si no llegó por parámetro, ej. desde el detalle de un colaborador).
  if (!formatoId) {
    return <FormatoPickerStep onSelect={(id) => setFormatoId(id)} onBack={() => router.back()} />;
  }

  // Paso 2: elegir colaborador (solo si no llegó por parámetro, ej. desde la lista de formatos).
  if (!colaboradorId) {
    return <ColaboradorPickerStep onSelect={(id) => setColaboradorId(id)} onBack={() => setFormatoId(undefined)} />;
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
    if (!formatoId || !colaboradorId || generar.isPending) return;
    const ok = await confirmAction({
      title: 'Generar documento',
      message: 'Se generará el documento con los datos revisados y quedará en el expediente del colaborador.',
      confirmLabel: 'Generar',
    });
    if (!ok) return;
    generar.mutate(
      { formatoId, payload: { colaborador_id: colaboradorId, overrides, output } },
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
              <Text style={styles.formatoNombre}>{preparation.data.formato.nombre}</Text>
              <Text style={styles.colaboradorNombre}>{preparation.data.colaborador.nombre}</Text>
            </Card>

            <Text style={styles.sectionTitle}>Datos completos</Text>
            <Card style={styles.dataCard}>
              {Object.entries(preparation.data.valores)
                .filter(([, value]) => Boolean(value))
                .map(([field, value]) => (
                  <View key={field} style={styles.dataRow}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.dataLabel}>{field}</Text>
                    <Text style={styles.dataValue} numberOfLines={1}>
                      {value}
                    </Text>
                  </View>
                ))}
            </Card>

            {preparation.data.faltantes.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Faltantes</Text>
                <Card style={styles.dataCard}>
                  {preparation.data.faltantes.map((faltante) => (
                    <Input
                      key={faltante.field}
                      label={faltante.label}
                      placeholder={`Completar ${faltante.label.toLowerCase()} (solo para este documento)`}
                      value={overrides[faltante.field] ?? ''}
                      onChangeText={(value) => setOverrides((prev) => ({ ...prev, [faltante.field]: value }))}
                    />
                  ))}
                </Card>
              </>
            ) : null}

            {preparation.data.formato.formatos_salida.length > 1 ? (
              <>
                <Text style={styles.sectionTitle}>Formato de salida</Text>
                <View style={styles.outputRow}>
                  {preparation.data.formato.formatos_salida.map((option) => (
                    <Button
                      key={option}
                      title={option.toUpperCase()}
                      variant={output === option ? 'primary' : 'outline'}
                      fullWidth={false}
                      onPress={() => setOutputOverride(option)}
                      style={styles.outputButton}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {generar.isError ? <Text style={styles.errorText}>{getErrorMessage(generar.error)}</Text> : null}

            <Button
              title={generar.isPending ? 'Generando documento…' : 'Generar documento'}
              onPress={() => void handleGenerar()}
              loading={generar.isPending}
              disabled={generar.isPending}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FormatoPickerStep({ onSelect, onBack }: { onSelect: (id: string) => void; onBack: () => void }) {
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

const styles = StyleSheet.create({
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
    textTransform: 'capitalize',
  },
  dataValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  outputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  outputButton: {
    flex: 1,
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
