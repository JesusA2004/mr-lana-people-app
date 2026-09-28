import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useRhAniversarios, useRhCelebracionAvisarATodos, useRhCelebracionEnviar } from '@/hooks/queries/useRhCelebraciones';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import type { RhAniversarioFila } from '@/types/celebracion';
import { hasPermission } from '@/utils/capabilities';
import { formatDateShort } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

const RANGOS: { label: string; dias: number }[] = [
  { label: 'Hoy', dias: 0 },
  { label: '7 días', dias: 7 },
  { label: '30 días', dias: 30 },
];

/**
 * Aniversario laboral — SOLO existe en el sistema unificado de
 * celebraciones (`GET /rh/celebraciones/aniversarios`, permiso
 * `celebraciones.ver`). Sin paginación real: un arreglo por rango de
 * fechas, igual que el panel web (AGENTS.md sección 23).
 *
 * Enviar/avisar a todos solo aplican al evento de HOY
 * (`RhCelebracionController::eventoDeHoy()` — fuera del día, 422). Por eso
 * las acciones solo se ofrecen cuando `item.es_hoy` es verdadero.
 */
export default function RhAniversariosScreen() {
  const router = useRouter();
  const bootstrap = useMobileBootstrap(true);
  const [rango, setRango] = useState(30);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setQ(searchInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const puedeVer = hasPermission(bootstrap.data?.user.permissions, 'celebraciones.ver');
  const params = useMemo(() => ({ dias: rango, q: q || undefined }), [rango, q]);
  const query = useRhAniversarios(params, puedeVer);

  if (!bootstrap.isLoading && !puedeVer) {
    return (
      <View style={styles.container}>
        <AppHeader title="Aniversarios" showBack onBackPress={() => router.back()} />
        <View style={styles.deniedWrapper}>
          <Ionicons name="lock-closed-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.deniedText}>No tienes acceso a Aniversarios.</Text>
        </View>
      </View>
    );
  }

  const items = query.data?.data ?? [];

  return (
    <View style={styles.container}>
      <AppHeader title="Aniversarios" showBack onBackPress={() => router.back()} />

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Nombre"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar en aniversarios"
        />
      </View>

      <View style={styles.filterRow}>
        {RANGOS.map((item) => (
          <PressableScale
            key={item.label}
            haptic={false}
            onPress={() => setRango(item.dias)}
            style={[styles.filterChip, rango === item.dias && styles.filterChipActive] as object}>
            <Text style={[styles.filterLabel, rango === item.dias && styles.filterLabelActive]}>{item.label}</Text>
          </PressableScale>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.colaborador_id}-${item.fecha}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item }) => (
          <AniversarioCard
            item={item}
            onPress={item.celebracion_id ? () => router.push(`/celebracion/${item.celebracion_id}` as never) : undefined}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <SkeletonCardList count={4} />
          ) : query.isError ? (
            <ErrorState message="No pudimos cargar los aniversarios." onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState icon="ribbon-outline" message="No hay aniversarios en este periodo." />
          )
        }
      />
    </View>
  );
}

function AniversarioCard({ item, onPress }: { item: RhAniversarioFila; onPress?: () => void }) {
  const token = useAuthStore((state) => state.token);
  const enviar = useRhCelebracionEnviar();
  const avisar = useRhCelebracionAvisarATodos();

  const handleEnviar = () => {
    enviar.mutate(
      { colaboradorId: item.colaborador_id, tipo: 'aniversario_laboral' },
      {
        onSuccess: (data) => {
          haptics.success();
          toast.success(data.message ?? 'Felicitación enviada.');
        },
        onError: (error) => {
          logError('rhAniversarios.enviar', error);
          toast.error(getActionErrorMessage(error));
        },
      },
    );
  };

  const handleAvisar = () => {
    avisar.mutate(
      { colaboradorId: item.colaborador_id, tipo: 'aniversario_laboral' },
      {
        onSuccess: (data) => {
          haptics.success();
          toast.success(data.message ?? 'Aviso enviado.');
        },
        onError: (error) => {
          logError('rhAniversarios.avisar', error);
          toast.error(getActionErrorMessage(error));
        },
      },
    );
  };

  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Avatar name={item.nombre} uri={item.foto_url ?? undefined} headers={token ? { Authorization: `Bearer ${token}` } : undefined} size={44} />
        <View style={styles.cardText}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.nombre}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {[item.puesto, item.sucursal].filter(Boolean).join(' · ')}
          </Text>
          <Text style={styles.cardDetalle}>{item.detalle}</Text>
        </View>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{item.es_hoy ? 'Hoy' : formatDateShort(item.fecha)}</Text>
        </View>
      </View>

      {item.es_hoy ? (
        <View style={styles.actions}>
          {!item.enviada_at ? (
            <Button
              title="Enviar felicitación"
              variant="outline"
              leftIcon="paper-plane-outline"
              loading={enviar.isPending}
              disabled={enviar.isPending || avisar.isPending}
              onPress={handleEnviar}
              style={styles.actionButton}
            />
          ) : (
            <Text style={styles.doneText}>Felicitación enviada</Text>
          )}
          {!item.avisada_todos_at ? (
            <Button
              title="Avisar a todos"
              variant="ghost"
              leftIcon="megaphone-outline"
              loading={avisar.isPending}
              disabled={enviar.isPending || avisar.isPending}
              onPress={handleAvisar}
              style={styles.actionButton}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  filterLabelActive: { color: Colors.white },
  listContent: { width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', padding: Spacing.lg, paddingTop: 0, flexGrow: 1 },
  card: { gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardText: { flex: 1, minWidth: 0 },
  cardName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  cardMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  cardDetalle: { fontSize: FontSize.xs, color: Colors.celebration, fontWeight: '700', marginTop: 2 },
  dateBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.celebrationSoft },
  dateBadgeText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.celebration },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'center' },
  actionButton: { flexGrow: 1, flexBasis: 150 },
  doneText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '700' },
  deniedWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  deniedText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
});
