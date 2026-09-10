import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { MascotAssistant } from '@/components/mascot/MascotAssistant';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhFormatos } from '@/hooks/queries/useRhFormatos';
import type { FormatoTipo, RhFormato } from '@/types/formato';
import { getErrorMessage } from '@/utils/errors';

const TIPOS: { label: string; value: FormatoTipo | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Contratos', value: 'contrato' },
  { label: 'Solicitudes', value: 'solicitud' },
  { label: 'Recibos', value: 'recibo_nomina' },
  { label: 'Cartas', value: 'carta' },
  { label: 'Constancias', value: 'constancia' },
];

const TIPO_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  contrato: 'document-text-outline',
  solicitud: 'create-outline',
  recibo_nomina: 'cash-outline',
  carta: 'mail-outline',
  constancia: 'ribbon-outline',
  otro: 'document-outline',
};

/**
 * Catálogo de formatos automáticos RH (AGENTS.md de este encargo, sección
 * 13). GAP DE BACKEND: `GET /rh/formatos` todavía no existe en
 * capacitaciones — esta pantalla queda lista y muestra un estado claro (no
 * un crash) mientras el backend no despliegue la ruta, ver
 * `docs/BACKEND_GAPS_FINAL.md`.
 */
export default function RhFormatosListScreen() {
  const router = useRouter();
  const [tipo, setTipo] = useState<FormatoTipo | 'todos'>('todos');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const params = useMemo(() => ({ tipo: tipo === 'todos' ? undefined : tipo, q: q || undefined }), [tipo, q]);
  const { data, isLoading, isError, error, refetch, isRefetching } = useRhFormatos(params, true);
  const formatos = data?.data ?? [];

  return (
    <View style={styles.container}>
      <AppHeader title="Formatos" showBack onBackPress={() => router.back()} />

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Buscar formato"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar formato"
        />
      </View>

      <FlatList
        horizontal
        data={TIPOS}
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
        data={formatos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item }) => (
          <FormatoRow formato={item} onPress={() => router.push(`/(app)/rh/formatos/generar?formato=${item.id}` as never)} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonCardList count={4} />
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} devDetail={undefined} />
          ) : (
            <MascotAssistant message="Todavía no hay formatos disponibles." type="tip" dismissible={false} />
          )
        }
      />
    </View>
  );
}

function FormatoRow({ formato, onPress }: { formato: RhFormato; onPress: () => void }) {
  const canGenerar = formato.acciones_permitidas.includes('generar');

  return (
    <Card onPress={canGenerar ? onPress : undefined} style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={TIPO_ICON[formato.tipo] ?? 'document-outline'} size={20} color={Colors.primaryDark} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {formato.nombre}
        </Text>
        {formato.descripcion ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {formato.descripcion}
          </Text>
        ) : null}
        {formato.formatos_salida.length > 0 ? (
          <Text style={styles.rowFormats}>{formato.formatos_salida.map((f) => f.toUpperCase()).join(' · ')}</Text>
        ) : null}
      </View>
      {canGenerar ? <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} /> : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
  rowSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  rowFormats: {
    fontSize: FontSize.xs,
    color: Colors.primaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
});
