import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { rhFormatosOficialesApi } from '@/api/rh/formatosOficiales';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { SkeletonBlock, SkeletonCardList } from '@/components/SkeletonBlock';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useRhFormatoOficial, useRhFormatosOficialesGenerados } from '@/hooks/queries/useRhFormatosOficiales';
import type { OfficialFormatGeneracion } from '@/types/formatoOficial';
import { formatDateShort, formatDateTime } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { aplicaALabel, puedeIniciarGeneracion } from '@/utils/formatoOficial';
import { slugifyFilename } from '@/utils/formatters';

/**
 * Detalle de un formato oficial (`GET /rh/formatos-oficiales/{formato}`):
 * datos generales, versión vigente y el histórico de documentos ya
 * generados para ESTE formato (paginado real). El CTA de generar solo se
 * habilita cuando `puedeIniciarGeneracion` es true — un formato "falta
 * configurar" o archivado nunca debe llegar al wizard (respondería con
 * `puede_generar: false` de todas formas, pero no tiene sentido ni siquiera
 * ofrecer el botón).
 */
export default function RhFormatoOficialDetalleScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detalle = useRhFormatoOficial(id);
  const generados = useRhFormatosOficialesGenerados({ formato_id: id }, Boolean(id));
  const [viewerGeneracion, setViewerGeneracion] = useState<OfficialFormatGeneracion | null>(null);

  const generaciones = useMemo(() => generados.data?.pages.flatMap((page) => page.data) ?? [], [generados.data]);
  const total = generados.data?.pages[0]?.meta?.total;

  const formato = detalle.data;

  if (viewerGeneracion) {
    return (
      <SecureDocumentViewer
        path={rhFormatosOficialesApi.verPath(viewerGeneracion.id)}
        title={formato?.nombre ?? 'Documento generado'}
        onClose={() => setViewerGeneracion(null)}
        allowDownload
        downloadFileName={slugifyFilename(`${formato?.nombre ?? 'documento'}-${viewerGeneracion.id}`)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Formato oficial" showBack onBackPress={() => router.back()} titleNumberOfLines={0} />

      <FlatList
        data={generaciones}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (generados.hasNextPage && !generados.isFetchingNextPage) void generados.fetchNextPage();
        }}
        ListHeaderComponent={
          detalle.isLoading ? (
            <SkeletonBlock height={220} radius={Radius.lg} />
          ) : detalle.isError ? (
            <ErrorState message={getErrorMessage(detalle.error)} onRetry={() => void detalle.refetch()} />
          ) : !formato ? null : (
            <>
              <Card style={styles.headerCard}>
                <Text style={styles.nombre}>{formato.nombre}</Text>
                <Text style={styles.tipo}>
                  {formato.tipo_etiqueta} · {aplicaALabel(formato.aplica_a)}
                </Text>
                {formato.descripcion ? <Text style={styles.descripcion}>{formato.descripcion}</Text> : null}

                <View style={styles.badgeRow}>
                  {!formato.lista ? (
                    <View style={[styles.badge, styles.badgeWarning]}>
                      <Text style={styles.badgeWarningText}>Falta configurar</Text>
                    </View>
                  ) : null}
                  {formato.archivado ? (
                    <View style={[styles.badge, styles.badgeMuted]}>
                      <Text style={styles.badgeMutedText}>Archivado</Text>
                    </View>
                  ) : null}
                </View>

                {formato.version_vigente ? (
                  <Text style={styles.versionText}>
                    Versión vigente: v{formato.version_vigente.numero}
                    {formato.version_vigente.publicada_en ? ` · publicada el ${formatDateShort(formato.version_vigente.publicada_en)}` : ''}
                    {' · '}
                    {formato.version_vigente.campos} {formato.version_vigente.campos === 1 ? 'campo' : 'campos'}
                  </Text>
                ) : (
                  <Text style={styles.versionText}>Sin versión publicada todavía.</Text>
                )}

                {!puedeIniciarGeneracion(formato) ? (
                  <View style={styles.notice}>
                    <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
                    <Text style={styles.noticeText}>
                      {formato.archivado
                        ? 'Este formato está archivado: no se pueden generar documentos nuevos.'
                        : 'Este formato todavía no está configurado en el Portal RH.'}
                    </Text>
                  </View>
                ) : (
                  <Button
                    title="Generar documento"
                    leftIcon="document-text-outline"
                    onPress={() => router.push(`/(app)/rh/formatos-oficiales/generar?formato=${formato.id}` as never)}
                  />
                )}
              </Card>

              {formato.versiones.length > 1 ? (
                <Card style={styles.versionesCard}>
                  <Text style={styles.sectionTitle}>Historial de versiones</Text>
                  {formato.versiones.map((version) => (
                    <View key={version.id} style={styles.versionRow}>
                      <Ionicons name="layers-outline" size={16} color={Colors.textMuted} />
                      <Text style={styles.versionRowText}>
                        v{version.numero}
                        {version.publicada_en ? ` · ${formatDateShort(version.publicada_en)}` : ' · sin publicar'}
                        {version.fidelidad ? ` · fidelidad ${version.fidelidad}` : ''}
                      </Text>
                    </View>
                  ))}
                </Card>
              ) : null}

              <Text style={styles.sectionTitle}>
                Documentos generados{typeof total === 'number' ? ` (${total})` : ''}
              </Text>
            </>
          )
        }
        renderItem={({ item }) => (
          <GeneracionRow generacion={item} onPress={() => setViewerGeneracion(item)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListFooterComponent={generados.isFetchingNextPage ? <Text style={styles.footerText}>Cargando más…</Text> : null}
        ListEmptyComponent={
          !detalle.isLoading && formato ? (
            generados.isLoading ? (
              <SkeletonCardList count={2} />
            ) : generados.isError ? (
              <ErrorState message={getErrorMessage(generados.error)} onRetry={() => void generados.refetch()} />
            ) : (
              <EmptyState icon="folder-open-outline" message="Todavía no se ha generado ningún documento con este formato." />
            )
          ) : null
        }
      />
    </View>
  );
}

function GeneracionRow({ generacion, onPress }: { generacion: OfficialFormatGeneracion; onPress: () => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  return (
    <Card style={styles.generacionRow} onPress={onPress}>
      <Ionicons name="document-text-outline" size={20} color={Colors.primaryDark} />
      <View style={styles.rowText}>
        <Text style={styles.generacionPersona} numberOfLines={1}>
          {generacion.persona ?? (generacion.tipo_persona === 'candidato' ? 'Candidato' : 'Colaborador')}
        </Text>
        <Text style={styles.generacionMeta} numberOfLines={1}>
          v{generacion.version}
          {generacion.generado_en ? ` · ${formatDateTime(generacion.generado_en)}` : ''}
          {generacion.generado_por ? ` · ${generacion.generado_por}` : ''}
        </Text>
        {generacion.en_expediente ? (
          <View style={styles.expedienteTag}>
            <Ionicons name="folder-outline" size={12} color={Colors.primaryDark} />
            <Text style={styles.expedienteTagText}>En expediente</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="eye-outline" size={18} color={Colors.textMuted} />
    </Card>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
    flexGrow: 1,
  },
  headerCard: { gap: Spacing.xs, marginBottom: Spacing.md },
  nombre: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  tipo: { fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: '700' },
  descripcion: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  badgeWarning: { backgroundColor: Colors.warningSoft },
  badgeWarningText: { fontSize: 10, fontWeight: '700', color: Colors.warning },
  badgeMuted: { backgroundColor: Colors.neutralSoft },
  badgeMutedText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  versionText: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs },
  notice: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningSoft,
    alignItems: 'flex-start',
    marginTop: Spacing.sm,
  },
  noticeText: { flex: 1, fontSize: FontSize.xs, color: Colors.text, lineHeight: 18 },
  versionesCard: { gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  versionRowText: { flex: 1, fontSize: FontSize.xs, color: Colors.text },
  generacionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  generacionPersona: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  generacionMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  expedienteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    marginTop: 2,
  },
  expedienteTagText: { fontSize: 10, fontWeight: '700', color: Colors.primaryDark },
  footerText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', textAlign: 'center', paddingVertical: Spacing.md },
});
