import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { PressableScale } from '@/components/PressableScale';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { useRhCandidatos } from '@/hooks/queries/useRhCandidatos';
import { candidatoBadge } from '@/utils/candidato';
import { formatDateShort } from '@/utils/dates';

type Filtro =
  | 'todos'
  | 'recibidos'
  | 'entrevista_pendiente'
  | 'psicometricas_pendientes'
  | 'socioeconomico_pendiente'
  | 'referencias_pendientes'
  | 'preseleccion_gerente'
  | 'autorizacion_rh_pendiente'
  | 'en_contratacion'
  | 'contratado';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'recibidos', label: 'Recibidos' },
  { value: 'entrevista_pendiente', label: 'Entrevista' },
  { value: 'psicometricas_pendientes', label: 'Psicométricas' },
  { value: 'socioeconomico_pendiente', label: 'Socioeconómico' },
  { value: 'referencias_pendientes', label: 'Referencias' },
  { value: 'preseleccion_gerente', label: 'Preautorización' },
  { value: 'autorizacion_rh_pendiente', label: 'Autorización RH' },
  { value: 'en_contratacion', label: 'En contratación' },
  { value: 'contratado', label: 'Contratados' },
];

/** Reclutamiento — `GET /rh/candidatos` (permiso `candidatos.ver`, alcance). */
export default function RhCandidatosScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [searchInput, setSearchInput] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setBusqueda(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const query = useRhCandidatos({ estado: filtro === 'todos' ? undefined : filtro, busqueda: busqueda || undefined });
  const candidatos = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen
      title="Candidatos"
      subtitle="Reclutamiento y selección"
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={
        <View style={styles.header}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Nombre o correo..."
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Buscar candidato"
            />
            {searchInput ? (
              <PressableScale haptic={false} accessibilityLabel="Limpiar búsqueda" onPress={() => setSearchInput('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </PressableScale>
            ) : null}
          </View>
          <FilterChips options={FILTROS} value={filtro} onChange={setFiltro} />
        </View>
      }>
      {candidatos.length === 0 ? (
        <EmptyMessage message="No hay candidatos en esta sección." />
      ) : (
        <View style={styles.list}>
          {candidatos.map((candidato) => (
            <ItemCard
              key={candidato.id}
              icon="person-outline"
              kicker={candidato.puesto_objetivo}
              title={candidato.nombre_completo}
              subtitle={candidato.sucursal}
              lines={[candidato.creado_en ? `Recibido: ${formatDateShort(candidato.creado_en)}` : null]}
              status={candidatoBadge(candidato.estado)}
              statusLabel={candidato.estado_etiqueta}
              onPress={() => router.push(`/(app)/rh/candidatos/${candidato.id}` as never)}
            />
          ))}
          <LoadMore hasNextPage={query.hasNextPage} isFetching={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  list: {
    gap: Spacing.md,
  },
});
