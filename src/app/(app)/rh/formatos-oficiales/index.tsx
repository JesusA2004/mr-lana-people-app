import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { FilterChips, type FilterChipOption } from '@/components/ciclo/FilterChips';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useRhFormatosOficiales } from '@/hooks/queries/useRhFormatosOficiales';
import type { OfficialFormatItem } from '@/types/formatoOficial';
import { formatDateShort } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';
import { aplicaALabel } from '@/utils/formatoOficial';

type AplicaAFilter = 'todos' | 'colaborador' | 'candidato' | 'ambos';

const APLICA_A_OPTIONS: FilterChipOption<AplicaAFilter>[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'colaborador', label: 'Colaboradores' },
  { value: 'candidato', label: 'Candidatos' },
  { value: 'ambos', label: 'Ambos' },
];

const APLICA_A_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  colaborador: 'person-outline',
  candidato: 'person-add-outline',
  ambos: 'people-outline',
};

/**
 * Catálogo de formatos oficiales (PDF fijo + overlay de datos) —
 * `GET /rh/formatos-oficiales`, espejo real de
 * `App\Http\Controllers\Api\V1\Rh\FormatoOficialController`. DISTINTO del
 * catálogo DOCX legacy (`rh/formatos/index.tsx`), que sigue existiendo
 * aparte. RH móvil es solo consumidor: administrar plantillas (subir PDF,
 * mapear coordenadas, versionar/publicar) se queda en el Portal RH web.
 *
 * `tipo` se filtra LOCAL (los valores son un catálogo abierto que define
 * cada empresa — no hay un enum fijo que la app pueda precargar como en
 * `EstadoVacante`), a partir de los tipos presentes en el resultado ya
 * cargado; `q`/`archivados`/`aplica_a` sí se mandan al backend porque son
 * ejes reales de la consulta (`FormatoOficialController::index`).
 */
export default function RhFormatosOficialesScreen() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [aplicaA, setAplicaA] = useState<AplicaAFilter>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setQ(searchInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      q: q || undefined,
      archivados: showArchived || undefined,
      aplica_a: aplicaA === 'todos' ? undefined : aplicaA,
    }),
    [q, showArchived, aplicaA],
  );
  const query = useRhFormatosOficiales(params, true);

  // Defensa extra: aunque `archivados` ya viaja al backend, nunca se confía
  // en que el filtro del lado del servidor sea la única barrera (sección
  // "lista/archivado" del encargo) — un archivado nunca aparece por
  // accidente si el toggle está apagado.
  const visibles = useMemo(() => {
    const data = query.data ?? [];
    return showArchived ? data : data.filter((item) => !item.archivado);
  }, [query.data, showArchived]);

  const tipoOptions = useMemo<FilterChipOption<string>[]>(() => {
    const seen = new Map<string, string>();
    for (const item of visibles) {
      if (!seen.has(item.tipo)) seen.set(item.tipo, item.tipo_etiqueta);
    }
    return [{ value: 'todos', label: 'Todos los tipos' }, ...Array.from(seen, ([value, label]) => ({ value, label }))];
  }, [visibles]);

  const formatos = useMemo(
    () => (tipoFilter === 'todos' ? visibles : visibles.filter((item) => item.tipo === tipoFilter)),
    [visibles, tipoFilter],
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Formatos oficiales" showBack onBackPress={() => router.back()} />

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Buscar por nombre"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar formato oficial por nombre"
        />
        {searchInput ? (
          <PressableScale haptic={false} accessibilityLabel="Limpiar búsqueda" onPress={() => setSearchInput('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </PressableScale>
        ) : null}
      </View>

      <FilterChips options={APLICA_A_OPTIONS} value={aplicaA} onChange={setAplicaA} />
      {tipoOptions.length > 2 ? <FilterChips options={tipoOptions} value={tipoFilter} onChange={setTipoFilter} /> : null}

      <PressableScale haptic={false} onPress={() => setShowArchived((prev) => !prev)} style={styles.archivedToggle}>
        <Ionicons name={showArchived ? 'checkbox' : 'square-outline'} size={18} color={Colors.primaryDark} />
        <Text style={styles.archivedToggleText}>Ver archivados</Text>
      </PressableScale>

      <FlatList
        data={formatos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item }) => (
          <FormatoOficialRow formato={item} onPress={() => router.push(`/(app)/rh/formatos-oficiales/${item.id}` as never)} />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <SkeletonCardList count={4} />
          ) : query.isError ? (
            <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="document-text-outline" message="No hay formatos oficiales con ese filtro." />
          )
        }
      />
    </View>
  );
}

function FormatoOficialRow({ formato, onPress }: { formato: OfficialFormatItem; onPress: () => void }) {
  return (
    <Card style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={APLICA_A_ICON[formato.aplica_a] ?? 'document-outline'} size={20} color={Colors.primaryDark} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {formato.nombre}
        </Text>
        <Text style={styles.rowType} numberOfLines={1}>
          {formato.tipo_etiqueta} · {aplicaALabel(formato.aplica_a)}
        </Text>
        {formato.descripcion ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {formato.descripcion}
          </Text>
        ) : null}
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
          {formato.version_vigente ? (
            <View style={[styles.badge, styles.badgeInfo]}>
              <Text style={styles.badgeInfoText}>
                v{formato.version_vigente.numero}
                {formato.version_vigente.publicada_en ? ` · ${formatDateShort(formato.version_vigente.publicada_en)}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
  },
  archivedToggleText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  listContent: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  rowType: {
    fontSize: FontSize.xs,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeWarning: { backgroundColor: Colors.warningSoft },
  badgeWarningText: { fontSize: 10, fontWeight: '700', color: Colors.warning },
  badgeMuted: { backgroundColor: Colors.neutralSoft },
  badgeMutedText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  badgeInfo: { backgroundColor: Colors.infoSoft },
  badgeInfoText: { fontSize: 10, fontWeight: '700', color: Colors.info },
});
