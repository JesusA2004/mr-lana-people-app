import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Screen } from '@/components/ciclo/Screen';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { useLeerTarea, useResolverTarea, useTareas } from '@/hooks/queries/useTrabajo';
import { toast } from '@/store/toastStore';
import type { Tarea, TareasEstadoFiltro } from '@/types/task';
import { canUseRhExperience } from '@/utils/capabilities';
import { openCrossExperienceRoute } from '@/utils/crossNavigation';
import { formatDateShort } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { resolveTaskRoute } from '@/utils/taskRoutes';

const PRIORIDAD: Record<string, { label: string; color: string; background: string }> = {
  urgente: { label: 'Urgente', color: Colors.danger, background: Colors.dangerSoft },
  alta: { label: 'Alta', color: Colors.warning, background: Colors.warningSoft },
  media: { label: 'Media', color: Colors.info, background: Colors.infoSoft },
  baja: { label: 'Baja', color: Colors.textMuted, background: Colors.neutralSoft },
};

const FILTROS: { value: TareasEstadoFiltro; label: string }[] = [
  { value: 'abiertas', label: 'Abiertas' },
  { value: 'resueltas', label: 'Resueltas' },
  { value: 'todas', label: 'Todas' },
];

/**
 * Bandeja de tareas — `GET /tareas`, `POST /tareas/{id}/leer|resolver`.
 * Tarea = acción pendiente (con objeto relacionado); Notificación =
 * aviso/evento. Se cuentan por separado y nunca se duplican visualmente:
 * esta pantalla solo muestra tareas. La navegación usa `related_type`/
 * `related_id`/`accion` (ver `utils/taskRoutes.ts`), nunca el título.
 */
export default function TareasScreen() {
  const [estado, setEstado] = useState<TareasEstadoFiltro>('abiertas');
  const query = useTareas({ estado });
  const bootstrap = useMobileBootstrap(true);
  const leer = useLeerTarea();
  const resolver = useResolverTarea();
  const canUseRh = bootstrap.data ? canUseRhExperience(bootstrap.data.capabilities, bootstrap.data.features) : false;

  const tareas = query.data?.pages.flatMap((page) => page.data) ?? [];
  const conteos = query.data?.pages[0]?.conteos;

  const abrir = (tarea: Tarea) => {
    if (!tarea.read_at) leer.mutate(tarea.id, { onError: (error) => logError('tareas.leer', error) });
    const destino = resolveTaskRoute(tarea);
    if (!destino) {
      toast.info('Esta tarea no tiene una pantalla en la app. Atiéndela desde el Portal RH.');
      return;
    }
    if (destino.experience === 'rh' && !canUseRh) {
      toast.info('Esta tarea se atiende desde Gestión RH, que no está habilitada para tu cuenta en la app.');
      return;
    }
    openCrossExperienceRoute(destino.route, destino.experience);
  };

  const confirmarResolver = (tarea: Tarea) => {
    Alert.alert('Marcar como resuelta', 'Úsalo solo si ya atendiste esto por otro medio. La tarea dejará de aparecer como pendiente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Marcar resuelta',
        onPress: () =>
          resolver.mutate(tarea.id, {
            onSuccess: () => toast.success('Tarea resuelta.'),
            onError: (error) => {
              logError('tareas.resolver', error);
              toast.error(getActionErrorMessage(error));
            },
          }),
      },
    ]);
  };

  return (
    <Screen
      title="Tareas"
      subtitle={conteos ? `${conteos.abiertas} abiertas · ${conteos.vencidas} vencidas` : 'Pendientes por atender'}
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      header={<FilterChips options={FILTROS} value={estado} onChange={setEstado} />}>
      {tareas.length === 0 ? (
        <EmptyMessage message={estado === 'abiertas' ? 'No tienes tareas pendientes. ¡Todo al día!' : 'No hay tareas en esta sección.'} />
      ) : (
        <View style={styles.list}>
          {tareas.map((tarea) => {
            const prioridad = PRIORIDAD[tarea.prioridad] ?? PRIORIDAD.media;
            const vencida = !!tarea.vence_en && !tarea.resolved_at && new Date(`${tarea.vence_en}T23:59:59`) < new Date();
            return (
              <Card key={tarea.id} onPress={() => abrir(tarea)} style={styles.card}>
                <View style={styles.headerRow}>
                  {!tarea.read_at && !tarea.resolved_at ? <View style={styles.unreadDot} accessibilityLabel="No leída" /> : null}
                  <Text style={styles.kicker} numberOfLines={1}>
                    {tarea.tipo_etiqueta ?? tarea.tipo}
                  </Text>
                  <View style={[styles.priority, { backgroundColor: prioridad.background }]}>
                    <Text style={[styles.priorityText, { color: prioridad.color }]}>{prioridad.label}</Text>
                  </View>
                </View>
                <Text style={styles.title}>{tarea.titulo}</Text>
                {tarea.descripcion ? <Text style={styles.meta}>{tarea.descripcion}</Text> : null}
                {tarea.colaborador ? (
                  <View style={styles.inline}>
                    <Ionicons name="person-circle-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.meta}>{tarea.colaborador.nombre}</Text>
                  </View>
                ) : null}
                {tarea.vence_en ? (
                  <Text style={[styles.meta, vencida && styles.overdue]}>
                    {vencida ? 'Vencida · ' : 'Vence: '}
                    {formatDateShort(tarea.vence_en)}
                  </Text>
                ) : null}
                {tarea.resolved_at ? <Text style={styles.meta}>Resuelta el {formatDateShort(tarea.resolved_at)}</Text> : null}
                {!tarea.resolved_at ? (
                  <View style={styles.actions}>
                    <Button title="Marcar resuelta" variant="ghost" onPress={() => confirmarResolver(tarea)} disabled={resolver.isPending} />
                  </View>
                ) : null}
              </Card>
            );
          })}
          <LoadMore hasNextPage={query.hasNextPage} isFetching={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  kicker: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
  },
  priority: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  overdue: {
    color: Colors.danger,
    fontWeight: '700',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
