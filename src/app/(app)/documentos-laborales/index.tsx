import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useLaborDocumentsInfinite } from '@/hooks/queries/useLaborDocuments';
import type { LaborDocument, LaborDocumentType } from '@/types/laborDocument';
import { formatDateShort } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { groupLaborDocumentsByYear } from '@/utils/laborDocuments';

const FILTERS: { label: string; value: LaborDocumentType | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Contratos', value: 'contrato' },
  { label: 'Recibos', value: 'recibo_nomina' },
  { label: 'Constancias', value: 'constancia' },
  { label: 'Otros', value: 'otro' },
];

const TIPO_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  contrato: 'document-text-outline',
  recibo_nomina: 'cash-outline',
  carta: 'mail-outline',
  constancia: 'ribbon-outline',
  otro: 'document-outline',
};

/**
 * "Mi espacio → Documentos laborales" (AGENTS.md de este encargo, sección
 * 19): lo que la EMPRESA le entrega al colaborador — contrato, recibos de
 * nómina, constancias — distinto del expediente (lo que el colaborador
 * ENTREGA a RH). GAP DE BACKEND: `GET /colaborador/documentos-laborales`
 * todavía no existe en capacitaciones — la pantalla queda lista y muestra
 * un estado claro mientras tanto, ver `docs/BACKEND_GAPS_FINAL.md`.
 */
export default function DocumentosLaboralesScreen() {
  const router = useRouter();
  const [tipo, setTipo] = useState<LaborDocumentType | 'todos'>('todos');

  const params = useMemo(() => ({ tipo: tipo === 'todos' ? undefined : tipo }), [tipo]);
  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useLaborDocumentsInfinite(
    params,
    true,
  );

  const documentos = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const grupos = useMemo(() => groupLaborDocumentsByYear(documentos), [documentos]);

  return (
    <View style={styles.container}>
      <AppHeader title="Documentos laborales" showBack onBackPress={() => router.back()} />

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <PressableScale
            haptic={false}
            accessibilityLabel={item.label}
            onPress={() => setTipo(item.value)}
            style={[styles.filterChip, tipo === item.value && styles.filterChipActive] as object}>
            <Text style={[styles.filterLabel, tipo === item.value && styles.filterLabelActive]}>{item.label}</Text>
          </PressableScale>
        )}
      />

      <FlatList
        data={grupos}
        keyExtractor={(group) => group.anio}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        renderItem={({ item: group }) => (
          <View style={styles.yearGroup}>
            <Text style={styles.yearLabel}>{group.anio}</Text>
            {group.documentos.map((documento, index) => (
              <FadeInView key={documento.id} index={index % 10}>
                <DocumentRow documento={documento} onPress={() => openDocument(router, documento)} />
              </FadeInView>
            ))}
          </View>
        )}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <Text style={styles.footerLoadingText}>Cargando más…</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <SkeletonCardList count={4} />
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
          ) : (
            <MascotAssistant message="Todavía no tienes documentos laborales disponibles." type="tip" dismissible={false} />
          )
        }
      />
    </View>
  );
}

function openDocument(router: ReturnType<typeof useRouter>, documento: LaborDocument) {
  router.push({
    pathname: '/documentos-laborales/[id]',
    params: {
      id: String(documento.id),
      titulo: documento.titulo,
      puedeDescargar: documento.puede_descargar ? '1' : '0',
    },
  } as never);
}

function DocumentRow({ documento, onPress }: { documento: LaborDocument; onPress: () => void }) {
  return (
    <Card onPress={documento.puede_ver ? onPress : undefined} style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={TIPO_ICON[documento.tipo] ?? 'document-outline'} size={18} color={Colors.primaryDark} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {documento.titulo}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {documento.periodo ?? formatDateShort(documento.fecha)}
        </Text>
      </View>
      {documento.puede_ver ? <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterLabelActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  yearGroup: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  yearLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  rowSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  footerLoading: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  footerLoadingText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
