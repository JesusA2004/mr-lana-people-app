import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ciclo/Screen';
import { EmptyState } from '@/components/EmptyState';
import { ControlSegmentado, FilaLista, GrupoLista, TarjetaAviso } from '@/components/ui';
import { Spacing } from '@/constants/colors';
import { useBandejaAprobaciones } from '@/hooks/queries/useAprobaciones';
import type { AprobacionItem } from '@/types/aprobaciones';
import { formatDateShort } from '@/utils/dates';
import { lineaEstadoBandeja, motivoSinTurno, pillCortoFlujo } from '@/utils/flujoAprobacion';
import { formatCurrencyMXN } from '@/utils/formatters';

type Filtro = 'me_toca' | 'en_espera';

const ICONO_TIPO: Record<string, React.ComponentProps<typeof FilaLista>['icono']> = {
  vacaciones: 'airplane-outline',
  prestamo: 'cash-outline',
  incapacidad: 'medkit-outline',
  baja_colaborador: 'exit-outline',
  actualizacion_datos: 'create-outline',
};

function detalleItem(item: AprobacionItem): string {
  const partes = [item.solicitante];
  if (item.fecha_inicio) partes.push(`${formatDateShort(item.fecha_inicio)}${item.fecha_fin && item.fecha_fin !== item.fecha_inicio ? ` – ${formatDateShort(item.fecha_fin)}` : ''}`);
  if (item.monto_solicitado !== null) partes.push(formatCurrencyMXN(item.monto_solicitado));
  return partes.join(' · ');
}

/**
 * Bandeja de aprobaciones (jefes, gerentes, regionales y RH). Lo que se ve
 * y si hay botón lo decide el motor del backend:
 * - «Me toca»: `puede_actuar_usuario_actual = true` (visto bueno o autorización).
 * - «En espera»: me tocará después o espera a otra persona — sin botón
 *   activo y con el motivo humano («Aún no es tu turno: primero debe aprobar X.»).
 */
export default function BandejaAprobacionesScreen() {
  const router = useRouter();
  const { bandeja, isLoading, isRefetching, error, refetch } = useBandejaAprobaciones();
  const [filtro, setFiltro] = useState<Filtro>('me_toca');
  const lista = filtro === 'me_toca' ? bandeja.meToca : bandeja.enEspera;

  const abrir = (item: AprobacionItem) =>
    router.push({ pathname: '/aprobaciones/[id]', params: { id: String(item.id), origen: item.origen } });

  return (
    <Screen
      title="Aprobaciones"
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      refreshing={isRefetching}
      onRefresh={refetch}
      header={
        <View style={styles.filtros}>
          <ControlSegmentado
            accessibilityLabel="Filtrar aprobaciones"
            opciones={[
              { valor: 'me_toca', etiqueta: `Me toca${bandeja.meToca.length > 0 ? ` (${bandeja.meToca.length})` : ''}` },
              { valor: 'en_espera', etiqueta: `En espera${bandeja.enEspera.length > 0 ? ` (${bandeja.enEspera.length})` : ''}` },
            ]}
            valor={filtro}
            onChange={setFiltro}
          />
        </View>
      }>
      <View style={styles.contenido}>
        {filtro === 'en_espera' && lista.length > 0 ? (
          <TarjetaAviso
            icono="time-outline"
            tono="info"
            titulo="Todavía no es tu turno"
            mensaje="Estas solicitudes esperan a otra persona. Te avisaremos cuando te toque decidir."
          />
        ) : null}

        {lista.length === 0 ? (
          <EmptyState
            icon={filtro === 'me_toca' ? 'checkmark-done-outline' : 'time-outline'}
            title={filtro === 'me_toca' ? 'Estás al día' : 'Nada en espera'}
            message={
              filtro === 'me_toca'
                ? 'No tienes solicitudes por aprobar ahora. Cuando una llegue a tu turno, aparecerá aquí.'
                : 'No hay solicitudes que te vayan a llegar más adelante.'
            }
          />
        ) : (
          <GrupoLista titulo={filtro === 'me_toca' ? 'Por decidir' : 'En espera'}>
            {lista.map((item) => {
              const pill = pillCortoFlujo(item.flujo);
              const estado = lineaEstadoBandeja(item.flujo);
              return (
                <FilaLista
                  key={`${item.origen}-${item.id}`}
                  icono={ICONO_TIPO[item.tipo] ?? 'document-text-outline'}
                  tono={item.flujo.puede_actuar_usuario_actual ? 'aviso' : 'info'}
                  titulo={item.tipo_etiqueta}
                  subtitulo={`${detalleItem(item)}\n${estado}`}
                  pill={pill}
                  accessibilityLabel={`${item.tipo_etiqueta} de ${item.solicitante}. ${estado}.${item.flujo.puede_actuar_usuario_actual ? '' : ` ${motivoSinTurno(item.flujo)}`}`}
                  onPress={() => abrir(item)}
                />
              );
            })}
          </GrupoLista>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filtros: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  contenido: {
    gap: Spacing.lg,
  },
});
