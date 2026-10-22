import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { StatusBadge } from '@/components/StatusBadge';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhColaboradores } from '@/hooks/queries/useRhColaboradores';
import type { RhColaborador } from '@/types/rh';
import { hasPermission } from '@/utils/capabilities';
import { getErrorMessage } from '@/utils/errors';
import { openRhWeb } from '@/utils/openRhWeb';

/** Directorio RH (AGENTS.md sección 13): buscador rápido, solo datos que la API devuelve — el expediente vive en `rh/expedientes`. */
export default function RhColaboradoresScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useRhColaboradores({ q: q || undefined, per_page: 40 }, true);
  const colaboradores = data?.data ?? [];
  const bootstrap = useMobileBootstrap(true);
  const puedeAlta = hasPermission(bootstrap.data?.user.permissions, 'colaboradores.alta');

  return (
    <View style={styles.container}>
      <AppHeader
        title="Colaboradores"
        subtitle={data?.meta?.total ? `${data.meta.total} en total` : undefined}
        right={
          puedeAlta ? (
            // Altas: Portal Web (invitación QR / alta completa).
            <PressableScale accessibilityLabel="Dar de alta en el Portal Web" onPress={() => void openRhWeb('rh/incorporacion/invitaciones')} style={styles.addButton}>
              <Ionicons name="person-add-outline" size={20} color={Colors.primaryDark} />
            </PressableScale>
          ) : undefined
        }
      />

      <CampoBusqueda
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Nombre o número de empleado"
        accessibilityLabel="Buscar colaborador"
        style={styles.searchWrapper}
      />

      <FlatList
        data={colaboradores}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item, index }) => (
          <FadeInView index={index % 10}>
            <ColaboradorRow colaborador={item} onPress={() => router.push(`/(app)/rh/colaboradores/${item.id}` as never)} />
          </FadeInView>
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonCardList count={5} />
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
          ) : (
            <EmptyState
              icon={q ? 'search-outline' : 'people-outline'}
              title={q ? 'Sin coincidencias' : undefined}
              message={q ? 'No hay colaboradores que coincidan. Prueba con otro nombre o número de empleado.' : 'Sin colaboradores en tu alcance.'}
            />
          )
        }
      />
    </View>
  );
}

function ColaboradorRow({ colaborador, onPress }: { colaborador: RhColaborador; onPress: () => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const pendientes = (colaborador.solicitudes_pendientes ?? 0) + (colaborador.vacaciones_pendientes ?? 0) + (colaborador.documentos_pendientes ?? 0);

  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {colaborador.nombre}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {[colaborador.numero_empleado ? `N.º ${colaborador.numero_empleado}` : null, colaborador.puesto, colaborador.sucursal]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      {colaborador.estatus ? <StatusBadge status={colaborador.estatus} /> : null}
      {pendientes > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendientes}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Card>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchWrapper: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
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
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  rowMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badge: {
    minWidth: 22,
    minHeight: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.danger,
  },
});
