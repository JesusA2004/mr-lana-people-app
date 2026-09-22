import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { ItemCard } from '@/components/ciclo/ItemCard';
import { PersonaRow } from '@/components/ciclo/JerarquiaCard';
import { EmptyMessage, Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { MotivoModal } from '@/components/MotivoModal';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useEquipo, useEquipoPendientes, useVistoBueno } from '@/hooks/queries/useTrabajo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import type { EquipoSolicitudPendiente } from '@/types/team';
import { formatDateShort } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { formatCurrencyMXN, humanizeRequestType } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';

type Tab = 'pendientes' | 'equipo';

/**
 * Mi equipo (jefe) — `GET /equipo`, `GET /equipo/pendientes`,
 * `POST /equipo/solicitudes/{id}/visto-bueno`. Compartida por Mi espacio y
 * Gestión RH. La autoridad es la jerarquía real (`jefe_id`/`gerente_id`),
 * no el rol: si el backend no devuelve equipo ni pendientes, no hay nada
 * que mostrar.
 */
export default function MiEquipoScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pendientes');
  const equipo = useEquipo();
  const pendientes = useEquipoPendientes();
  const vistoBueno = useVistoBueno();
  const { isOffline } = useNetworkStatus();
  const [rechazando, setRechazando] = useState<EquipoSolicitudPendiente | null>(null);

  const solicitudes = pendientes.data?.solicitudes ?? [];
  const evaluaciones = pendientes.data?.evaluaciones ?? [];
  const porDecidir = solicitudes.filter((s) => s.requiere_visto_bueno && !s.visto_bueno);

  const decidir = (solicitud: EquipoSolicitudPendiente, aprobado: boolean, comentario?: string) => {
    vistoBueno.mutate(
      { solicitudId: solicitud.id, aprobado, comentario },
      {
        onSuccess: () => {
          haptics.success();
          setRechazando(null);
          toast.success(aprobado ? 'Visto bueno registrado.' : 'Registraste que no das el visto bueno.');
        },
        onError: (error) => {
          logError('equipo.vistoBueno', error);
          haptics.error();
          toast.error(getActionErrorMessage(error));
          void pendientes.refetch();
        },
      },
    );
  };

  const confirmarAprobar = (solicitud: EquipoSolicitudPendiente) => {
    Alert.alert('Dar visto bueno', `¿Das tu visto bueno a la solicitud de ${solicitud.colaborador ?? 'tu colaborador'}? RH tomará la decisión final.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Dar visto bueno', onPress: () => decidir(solicitud, true) },
    ]);
  };

  const loading = equipo.isLoading || pendientes.isLoading;
  const error = equipo.error && pendientes.error ? pendientes.error : null;

  return (
    <Screen
      title="Mi equipo"
      isLoading={loading}
      error={error}
      notFoundMessage="Tu cuenta no está vinculada a un colaborador, así que no hay equipo que mostrar."
      onRetry={() => {
        void equipo.refetch();
        void pendientes.refetch();
      }}
      refreshing={equipo.isRefetching || pendientes.isRefetching}
      onRefresh={() => {
        void equipo.refetch();
        void pendientes.refetch();
      }}
      header={
        <FilterChips
          options={[
            { value: 'pendientes', label: 'Pendientes', count: porDecidir.length + evaluaciones.length },
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
        <>
          <SectionTitle>Solicitudes de tu equipo</SectionTitle>
          {solicitudes.length === 0 ? (
            <EmptyMessage message="No hay solicitudes de tu equipo en revisión." />
          ) : (
            solicitudes.map((solicitud) => {
              const pendiente = solicitud.requiere_visto_bueno && !solicitud.visto_bueno;
              return (
                <Card key={solicitud.id} style={styles.gap}>
                  <Text style={styles.kicker}>{solicitud.tipo_etiqueta ?? humanizeRequestType(solicitud.tipo)}</Text>
                  <Text style={styles.title}>{solicitud.colaborador ?? 'Colaborador'}</Text>
                  {solicitud.fecha_inicio ? (
                    <Text style={styles.meta}>
                      {formatDateShort(solicitud.fecha_inicio)}
                      {solicitud.fecha_fin ? ` – ${formatDateShort(solicitud.fecha_fin)}` : ''}
                    </Text>
                  ) : null}
                  {solicitud.monto_solicitado !== null ? <Text style={styles.meta}>Monto solicitado: {formatCurrencyMXN(solicitud.monto_solicitado)}</Text> : null}
                  {solicitud.folio ? <Text style={styles.meta}>Folio {solicitud.folio}</Text> : null}
                  {solicitud.visto_bueno ? (
                    <Notice tone={solicitud.visto_bueno === 'aprobado' ? 'success' : 'warning'}>
                      {solicitud.visto_bueno === 'aprobado' ? 'Ya diste tu visto bueno. RH decide.' : 'Registraste que no das tu visto bueno.'}
                    </Notice>
                  ) : !solicitud.requiere_visto_bueno ? (
                    <Text style={styles.meta}>Esta solicitud no requiere tu visto bueno; la atiende RH.</Text>
                  ) : null}
                  {pendiente ? (
                    <View style={styles.actions}>
                      <Button
                        title="No doy visto bueno"
                        variant="outline"
                        disabled={vistoBueno.isPending || isOffline}
                        onPress={() => setRechazando(solicitud)}
                        style={styles.flex}
                      />
                      <Button
                        title="Dar visto bueno"
                        leftIcon="checkmark"
                        loading={vistoBueno.isPending && vistoBueno.variables?.solicitudId === solicitud.id}
                        disabled={vistoBueno.isPending || isOffline}
                        onPress={() => confirmarAprobar(solicitud)}
                        style={styles.flex}
                      />
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}

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
        </>
      )}

      <MotivoModal
        visible={rechazando !== null}
        title="No dar visto bueno"
        description="Explica brevemente el motivo. RH lo verá antes de decidir."
        confirmLabel="Registrar"
        submitting={vistoBueno.isPending}
        onCancel={() => setRechazando(null)}
        onConfirm={(motivo) => rechazando && decidir(rechazando, false, motivo)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.xs,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
