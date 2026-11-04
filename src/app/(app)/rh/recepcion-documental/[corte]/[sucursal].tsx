import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FiltrosRenglones } from '@/api/rh/recepcionDocumental';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { LoadMore } from '@/components/ciclo/ItemCard';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { MarcarRecepcionSheet, RenglonRecepcionFila } from '@/components/recepcion/RenglonRecepcionFila';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useMarcarRecepcion, useRhRecepcionCorte, useRhRecepcionRenglones } from '@/hooks/queries/useRhRecepcionDocumental';
import { useEstilos } from '@/theme/ThemeProvider';
import type { RenglonRecepcion } from '@/types/recepcionDocumental';
import { agruparRenglones, estadoAlTocar, sucursalDeParametro, textoCumplimiento, textoSeccionVacia } from '@/utils/recepcionDocumental';

type Filtro = 'todos' | 'no' | 'si';
const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'no', label: 'Por recibir' },
  { value: 'si', label: 'Recibidos' },
];

/**
 * Una sucursal del periodo: SUCURSAL → evento (Altas, Nómina, Vacaciones,
 * Préstamos, Bajas…) → persona → documentos, con casilla grande para
 * palomear de un toque (optimista) y «…» para observación / no recibido /
 * no aplica. Casillas y «…» solo con los permisos que manda el backend.
 */
export default function SucursalRecepcionScreen() {
  const styles = useEstilos(crearEstilos);
  const params = useLocalSearchParams<{ corte: string; sucursal: string }>();
  const corteId = Number(params.corte);
  const valido = Number.isInteger(corteId) && corteId > 0;
  const sucursal = sucursalDeParametro(params.sucursal);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [observando, setObservando] = useState<RenglonRecepcion | null>(null);

  const filtros = useMemo<FiltrosRenglones>(
    () => ({ ...(sucursal !== null ? { sucursal_id: sucursal } : {}), ...(filtro !== 'todos' ? { recibido: filtro } : {}) }),
    [sucursal, filtro],
  );
  const corte = useRhRecepcionCorte(valido ? corteId : null);
  const renglones = useRhRecepcionRenglones(valido ? corteId : null, filtros, sucursal !== null);
  const marcar = useMarcarRecepcion(corteId, filtros);

  const detalle = corte.data;
  const permisos = detalle?.permisos;
  const datosSucursal = detalle?.sucursales.find((s) => (s.sucursal_id ?? 'sin') === sucursal);
  const lista = useMemo(() => renglones.data?.pages.flatMap((p) => p.data) ?? [], [renglones.data]);
  const secciones = useMemo(() => agruparRenglones(lista, detalle?.reglas ?? []), [lista, detalle?.reglas]);
  const completo = !renglones.hasNextPage;

  const tocar = (renglon: RenglonRecepcion) => marcar.mutate({ renglon, payload: { estado: estadoAlTocar(renglon) } });

  return (
    <Screen
      title={datosSucursal?.nombre ?? 'Sucursal'}
      subtitle={detalle ? `${detalle.etiqueta}${datosSucursal ? ` · ${textoCumplimiento(datosSucursal.metricas.cumplimiento)}` : ''}` : undefined}
      isLoading={corte.isLoading || renglones.isLoading}
      error={corte.error ?? renglones.error}
      hayDatos={lista.length > 0}
      notFoundMessage="Esta sucursal o periodo ya no está disponible."
      onRetry={() => {
        void corte.refetch();
        void renglones.refetch();
      }}
      refreshing={renglones.isRefetching && !renglones.isFetchingNextPage}
      onRefresh={() => {
        void corte.refetch();
        void renglones.refetch();
      }}
      header={<FilterChips options={FILTROS} value={filtro} onChange={setFiltro} />}>
      <View style={styles.contenido}>
        {datosSucursal ? (
          <Text style={styles.resumen}>
            {`Esperados ${datosSucursal.metricas.esperados} · Recibidos ${datosSucursal.metricas.recibidos} · Pendientes ${datosSucursal.metricas.pendientes}`}
          </Text>
        ) : null}
        {permisos && !permisos.recibir ? <Notice tone="info">Solo consulta: no tienes permiso para marcar recepciones en este periodo.</Notice> : null}

        {secciones.map((seccion) => {
          if (seccion.personas.length === 0 && !completo) return null;
          const regla = detalle?.reglas.find((r) => r.regla === seccion.regla);
          return (
            <View key={seccion.regla} style={styles.seccion}>
              <SectionTitle>{seccion.etiqueta}</SectionTitle>
              {seccion.personas.length === 0 ? (
                <Text style={styles.vacio}>{textoSeccionVacia(filtro, { etiqueta: seccion.etiqueta, sinEventos: seccion.sinEventos, renglonesPeriodo: regla?.metricas.renglones ?? 0 })}</Text>
              ) : (
                seccion.personas.map((persona) => (
                  <Card key={persona.clave} style={styles.persona}>
                    <Text style={styles.personaNombre}>{persona.nombre}</Text>
                    <Text style={styles.personaDetalle}>
                      {[persona.numeroEmpleado ? `#${persona.numeroEmpleado}` : null, persona.puesto, persona.evento, persona.fechaEvento].filter(Boolean).join(' · ')}
                    </Text>
                    {persona.documentos.map((renglon) => (
                      <RenglonRecepcionFila
                        key={renglon.id}
                        renglon={renglon}
                        puedeRecibir={permisos?.recibir === true}
                        puedeObservar={permisos?.observar === true}
                        onTocar={tocar}
                        onMas={setObservando}
                      />
                    ))}
                  </Card>
                ))
              )}
            </View>
          );
        })}

        <LoadMore hasNextPage={renglones.hasNextPage} isFetching={renglones.isFetchingNextPage} onPress={() => void renglones.fetchNextPage()} />
      </View>

      <MarcarRecepcionSheet
        renglon={observando}
        onCancel={() => setObservando(null)}
        onConfirm={(renglon, payload) => {
          setObservando(null);
          marcar.mutate({ renglon, payload });
        }}
      />
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    contenido: { gap: Spacing.lg },
    resumen: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
    seccion: { gap: Spacing.sm },
    vacio: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    persona: { gap: Spacing.xs },
    personaNombre: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    personaDetalle: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xs },
  });
