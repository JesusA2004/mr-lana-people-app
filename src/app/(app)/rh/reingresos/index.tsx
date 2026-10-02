import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { ItemCard, LoadMore } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { MotivoModal } from '@/components/MotivoModal';
import { SkeletonCardList } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhDecidirReingreso, useRhReingresoBuscar, useRhReingresoHistorial, useRhReingresos, useRhSolicitarReingreso } from '@/hooks/queries/useRhReingresos';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import type { ReingresoCandidatoBusqueda } from '@/types/rhReingreso';
import { formatDateLong } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

type Tab = 'buscar' | 'solicitudes';
type FiltroEstado = 'todos' | 'solicitado' | 'revision_rh' | 'autorizado' | 'rechazado' | 'completado';

const TABS: { value: Tab; label: string }[] = [
  { value: 'buscar', label: 'Buscar y solicitar' },
  { value: 'solicitudes', label: 'Solicitudes' },
];

const FILTROS_ESTADO: { value: FiltroEstado; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'solicitado', label: 'Solicitados' },
  { value: 'revision_rh', label: 'Revisión RH' },
  { value: 'autorizado', label: 'Autorizados' },
  { value: 'rechazado', label: 'Rechazados' },
  { value: 'completado', label: 'Completados' },
];

/**
 * Reingreso de la MISMA persona (AGENTS.md sección 35): buscar en el
 * histórico, revisar por qué salió y solicitar/decidir — nunca se da de
 * alta a alguien nuevo si ya existe.
 */
export default function RhReingresosScreen() {
  const [tab, setTab] = useState<Tab>('buscar');
  const { isOffline } = useNetworkStatus();

  // --- Buscar / solicitar ---
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => setQ(searchInput.trim()), 400);
    return () => clearTimeout(handle);
  }, [searchInput]);
  const busqueda = useRhReingresoBuscar(q, tab === 'buscar');

  const [seleccionado, setSeleccionado] = useState<ReingresoCandidatoBusqueda | null>(null);
  const historial = useRhReingresoHistorial(seleccionado?.id);
  const [solicitarAbierto, setSolicitarAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const solicitar = useRhSolicitarReingreso();

  // --- Solicitudes / decidir ---
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const solicitudes = useRhReingresos(filtroEstado === 'todos' ? undefined : filtroEstado, tab === 'solicitudes');
  const reingresos = solicitudes.data?.pages.flatMap((p) => p.data) ?? [];
  const [decidiendo, setDecidiendo] = useState<{ id: number; rechazar: boolean } | null>(null);
  const decidir = useRhDecidirReingreso();

  const abrirHistorial = (candidato: ReingresoCandidatoBusqueda) => setSeleccionado(candidato);

  const confirmarSolicitar = () => {
    if (!seleccionado || motivo.trim() === '') return;
    solicitar.mutate(
      { colaboradorId: seleccionado.id, payload: { motivo: motivo.trim() } },
      {
        onSuccess: () => {
          haptics.success();
          toast.success('Reingreso solicitado.');
          setSolicitarAbierto(false);
          setSeleccionado(null);
          setMotivo('');
        },
        onError: (error) => {
          logError('rhReingreso.solicitar', error);
          haptics.error();
          toast.error(getActionErrorMessage(error));
        },
      },
    );
  };

  const confirmarAutorizar = (id: number) =>
    Alert.alert('Autorizar reingreso', 'La persona reactiva su cuenta y entra de nuevo a Etapa 2 del ciclo laboral.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Autorizar',
        onPress: () =>
          decidir.mutate(
            { id, viable: true },
            {
              onSuccess: () => {
                haptics.success();
                toast.success('Reingreso autorizado.');
              },
              onError: (error) => {
                logError('rhReingreso.decidir', error);
                haptics.error();
                toast.error(getActionErrorMessage(error));
              },
            },
          ),
      },
    ]);

  return (
    <Screen title="Reingresos" subtitle="Reactivar a la misma persona" header={<FilterChips options={TABS} value={tab} onChange={setTab} />}>
      {tab === 'buscar' ? (
        <View style={styles.gapLg}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Nombre, número de empleado, CURP o RFC"
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Buscar persona para reingreso"
            />
          </View>

          {q.length > 0 && q.length < 3 ? <Notice tone="info">Escribe al menos 3 caracteres.</Notice> : null}
          {busqueda.isLoading ? <SkeletonCardList count={2} /> : null}
          {busqueda.data?.length === 0 && q.length >= 3 ? <EmptyMessage message="No se encontró a nadie con ese dato." /> : null}

          {(busqueda.data ?? []).map((persona) => (
            <ItemCard
              key={persona.id}
              icon="person-outline"
              kicker={persona.numero_empleado}
              title={persona.nombre}
              subtitle={`${persona.puesto ?? 'Sin puesto'} · ${persona.sucursal ?? 'Sin sucursal'}`}
              lines={[persona.causa_salida ? `Salió por: ${persona.causa_salida}` : null, persona.reingreso_abierto ? 'Ya tiene un reingreso en trámite' : null]}
              status={persona.reingreso_abierto ? 'en_revision' : persona.dado_de_baja ? 'rechazada' : 'aprobada'}
              statusLabel={persona.reingreso_abierto ? 'Reingreso en trámite' : persona.dado_de_baja ? 'Baja' : 'Activo'}
              onPress={() => abrirHistorial(persona)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.gapLg}>
          <FilterChips options={FILTROS_ESTADO} value={filtroEstado} onChange={setFiltroEstado} />
          {solicitudes.isLoading ? (
            <SkeletonCardList count={3} />
          ) : reingresos.length === 0 ? (
            <EmptyMessage message="No hay reingresos en esta sección." />
          ) : (
            <View style={styles.gap}>
              {reingresos.map((r) => {
                const puedeAutorizar = r.acciones_permitidas.some((a) => a.clave === 'autorizar');
                const puedeRechazar = r.acciones_permitidas.some((a) => a.clave === 'rechazar');
                return (
                  <Card key={r.id} style={styles.gap}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{r.colaborador?.nombre ?? 'Colaborador'}</Text>
                    </View>
                    <InfoRow label="Estado" value={r.estado_etiqueta} />
                    <InfoRow label="Motivo" value={r.motivo} />
                    <InfoRow label="Puesto" value={r.puesto} />
                    <InfoRow label="Sucursal" value={r.sucursal} />
                    <InfoRow label="Solicitado por" value={r.solicitado_por} />
                    <InfoRow label="Decidido por" value={r.decidido_por} />
                    {puedeAutorizar || puedeRechazar ? (
                      <View style={styles.actionsRow}>
                        {isOffline ? <Notice tone="warning">Sin conexión: espera para decidir.</Notice> : null}
                        {puedeAutorizar ? <Button title="Autorizar" disabled={isOffline || decidir.isPending} onPress={() => confirmarAutorizar(r.id)} /> : null}
                        {puedeRechazar ? <Button title="No viable" variant="danger" disabled={isOffline || decidir.isPending} onPress={() => setDecidiendo({ id: r.id, rechazar: true })} /> : null}
                      </View>
                    ) : null}
                  </Card>
                );
              })}
              <LoadMore hasNextPage={solicitudes.hasNextPage} isFetching={solicitudes.isFetchingNextPage} onPress={() => void solicitudes.fetchNextPage()} />
            </View>
          )}
        </View>
      )}

      {/* Historial de la persona seleccionada, antes de decidir si se solicita el reingreso. */}
      <FormSheet
        visible={seleccionado !== null && !solicitarAbierto}
        title={seleccionado?.nombre ?? 'Historial'}
        confirmLabel="Solicitar reingreso"
        submitting={false}
        confirmDisabled={seleccionado?.reingreso_abierto === true}
        onCancel={() => setSeleccionado(null)}
        onConfirm={() => setSolicitarAbierto(true)}>
        {historial.isLoading ? (
          <SkeletonCardList count={2} />
        ) : historial.data ? (
          <>
            <SectionTitle>Última salida</SectionTitle>
            {historial.data.salidas.length === 0 ? (
              <Text style={styles.muted}>Sin registro de bajas.</Text>
            ) : (
              historial.data.salidas.slice(0, 3).map((s) => (
                <View key={s.id} style={styles.subItem}>
                  <Text style={styles.subItemTitle}>
                    {s.causa} — {formatDateLong(s.fecha_efectiva)}
                  </Text>
                  {s.motivo ? <Text style={styles.muted}>{s.motivo}</Text> : null}
                </View>
              ))
            )}
            <SectionTitle>Contratos</SectionTitle>
            {historial.data.contratos.length === 0 ? (
              <Text style={styles.muted}>Sin contratos registrados.</Text>
            ) : (
              historial.data.contratos.slice(0, 3).map((c) => (
                <View key={c.id} style={styles.subItem}>
                  <Text style={styles.subItemTitle}>{c.tipo}</Text>
                  <Text style={styles.muted}>
                    {formatDateLong(c.inicio)} — {c.fin ? formatDateLong(c.fin) : 'Indeterminado'} · {c.estado}
                  </Text>
                </View>
              ))
            )}
            {seleccionado?.reingreso_abierto ? <Notice tone="warning">Esta persona ya tiene un reingreso en trámite.</Notice> : null}
          </>
        ) : null}
      </FormSheet>

      <FormSheet
        visible={solicitarAbierto}
        title="Solicitar reingreso"
        description={`Se solicita el reingreso de ${seleccionado?.nombre ?? ''}. RH revisará documentos vencidos/faltantes y decidirá.`}
        confirmLabel="Solicitar"
        submitting={solicitar.isPending}
        confirmDisabled={motivo.trim() === ''}
        onCancel={() => setSolicitarAbierto(false)}
        onConfirm={confirmarSolicitar}>
        <Field label="Motivo del reingreso" value={motivo} onChangeText={setMotivo} multiline maxLength={2000} />
      </FormSheet>

      <MotivoModal
        visible={decidiendo?.rechazar === true}
        title="Marcar como no viable"
        description="El reingreso queda rechazado."
        confirmLabel="Confirmar"
        submitting={decidir.isPending}
        onCancel={() => setDecidiendo(null)}
        onConfirm={(comentario) =>
          decidiendo &&
          decidir.mutate(
            { id: decidiendo.id, viable: false, comentario },
            {
              onSuccess: () => {
                haptics.success();
                toast.success('Reingreso rechazado.');
                setDecidiendo(null);
              },
              onError: (error) => {
                logError('rhReingreso.decidir', error);
                haptics.error();
                toast.error(getActionErrorMessage(error));
              },
            },
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.sm,
  },
  gapLg: {
    gap: Spacing.lg,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
  subItem: {
    gap: 2,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  subItemTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  muted: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
