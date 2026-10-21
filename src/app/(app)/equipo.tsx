import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard } from '@/components/ciclo/ItemCard';
import { PersonaRow } from '@/components/ciclo/JerarquiaCard';
import { EmptyMessage, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { FilaLista, GrupoLista } from '@/components/ui';
import { Spacing } from '@/constants/colors';
import { useEquipo, useEquipoPendientes } from '@/hooks/queries/useTrabajo';
import { formatDateShort } from '@/utils/dates';

type Tab = 'pendientes' | 'equipo';

/**
 * Mi equipo (jefe) — `GET /equipo` y `GET /equipo/pendientes`. Compartida
 * por Mi espacio y Gestión RH. La autoridad es la jerarquía real, no el rol.
 *
 * Desde 2026-10-20 los vistos buenos viven en UNA sola bandeja
 * (`/aprobaciones`, motor de aprobaciones del backend): ahí se ve el flujo
 * completo y los botones solo se activan cuando te toca. Aquí queda el
 * acceso con su contador, el equipo directo y las evaluaciones.
 */
export default function MiEquipoScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pendientes');
  const equipo = useEquipo();
  const pendientes = useEquipoPendientes();

  const evaluaciones = pendientes.data?.evaluaciones ?? [];
  const porDecidirCount = pendientes.data?.aprobar.length ?? 0;
  const enEsperaCount = pendientes.data?.en_espera.length ?? 0;

  const loading = equipo.isLoading || pendientes.isLoading;
  const error = equipo.error && pendientes.error ? pendientes.error : null;
  const refrescar = () => {
    void equipo.refetch();
    void pendientes.refetch();
  };

  let subtituloAprobaciones = 'No hay solicitudes de tu equipo por decidir';
  if (porDecidirCount > 0) subtituloAprobaciones = `${porDecidirCount} ${porDecidirCount === 1 ? 'solicitud espera' : 'solicitudes esperan'} tu decisión`;
  else if (enEsperaCount > 0) subtituloAprobaciones = `${enEsperaCount} en espera de un paso anterior`;

  return (
    <Screen
      title="Mi equipo"
      isLoading={loading}
      error={error}
      notFoundMessage="Tu cuenta no está vinculada a un colaborador, así que no hay equipo que mostrar."
      onRetry={refrescar}
      refreshing={equipo.isRefetching || pendientes.isRefetching}
      onRefresh={refrescar}
      header={
        <FilterChips
          options={[
            { value: 'pendientes', label: 'Pendientes', count: porDecidirCount + evaluaciones.length },
            { value: 'equipo', label: 'Colaboradores', count: equipo.data?.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      }>
      {tab === 'equipo' ? (
        (equipo.data ?? []).length === 0 ? (
          <EmptyMessage message="No tienes colaboradores directos registrados." />
        ) : (
          <Card>
            {(equipo.data ?? []).map((persona) => (
              <PersonaRow key={persona.id} persona={persona} />
            ))}
          </Card>
        )
      ) : (
        <View style={styles.contenido}>
          <GrupoLista titulo="Solicitudes de tu equipo">
            <FilaLista
              icono="checkmark-done-outline"
              tono={porDecidirCount > 0 ? 'aviso' : 'primario'}
              titulo="Aprobaciones"
              subtitulo={subtituloAprobaciones}
              badge={porDecidirCount}
              onPress={() => router.push('/aprobaciones')}
            />
          </GrupoLista>

          <View>
            <SectionTitle>Evaluaciones de periodo de prueba</SectionTitle>
            {evaluaciones.length === 0 ? (
              <EmptyMessage message="No tienes evaluaciones pendientes." />
            ) : (
              evaluaciones.map((evaluacion) => (
                <ItemCard
                  key={evaluacion.id}
                  icon="clipboard-outline"
                  title={evaluacion.colaborador}
                  subtitle={evaluacion.fecha_limite ? `Fecha límite: ${formatDateShort(evaluacion.fecha_limite)}` : null}
                  status={evaluacion.estado === 'devuelta' ? 'requiere_correccion' : 'pendiente'}
                  statusLabel={evaluacion.estado === 'devuelta' ? 'Devuelta para corrección' : 'Pendiente de evaluar'}
                  onPress={() => router.push({ pathname: '/evaluaciones/[id]', params: { id: String(evaluacion.id) } })}
                />
              ))
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: Spacing.lg,
  },
});
