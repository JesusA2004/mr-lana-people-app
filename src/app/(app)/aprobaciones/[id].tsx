import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonesAprobacion } from '@/components/BotonesAprobacion';
import { Card } from '@/components/Card';
import { Screen } from '@/components/ciclo/Screen';
import { EmptyState } from '@/components/EmptyState';
import { FlujoAprobacionTimeline } from '@/components/FlujoAprobacionTimeline';
import { MotivoModal } from '@/components/MotivoModal';
import { FilaLista, GrupoLista, Pill, SeccionTitulo, TarjetaAviso } from '@/components/ui';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useAprobacionItem, useDecidirAprobacion } from '@/hooks/queries/useAprobaciones';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { useEstilos } from '@/theme/ThemeProvider';
import type { AprobacionItem } from '@/types/aprobaciones';
import { confirmAction } from '@/utils/confirm';
import { openCrossExperienceRoute } from '@/utils/crossNavigation';
import { formatDateLong } from '@/utils/dates';
import { getActionErrorMessage, logError } from '@/utils/errors';
import { etiquetasAccion, formatFechaHoraFlujo, modoAcciones, motivoSinTurno, pillEstadoFlujo, textoPendienteDe } from '@/utils/flujoAprobacion';
import { formatCurrencyMXN } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';

/**
 * Detalle de una aprobación: quién la pidió, qué pide, la línea de tiempo
 * del motor y, abajo, los botones grandes SOLO si a la cuenta le toca.
 */
export default function AprobacionDetalleScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string; origen?: string }>();
  const numero = Number(id);
  const { item, isLoading, error, refetch, isRefetching } = useAprobacionItem(Number.isFinite(numero) ? numero : null);
  const decidir = useDecidirAprobacion();
  const { isOffline } = useNetworkStatus();
  const [rechazando, setRechazando] = useState(false);

  const ejecutar = (solicitud: AprobacionItem, aprobado: boolean, comentario?: string) => {
    decidir.mutate(
      { item: solicitud, aprobado, comentario },
      {
        onSuccess: (resultado) => {
          haptics.success();
          setRechazando(false);
          toast.success(
            resultado.message ??
              (aprobado
                ? solicitud.flujo.accion_usuario_actual === 'visto_bueno'
                  ? 'Visto bueno registrado. La solicitud sigue su curso.'
                  : 'Solicitud aprobada.'
                : 'Registramos tu rechazo. Avisaremos a quien la pidió.'),
          );
          router.back();
        },
        onError: (err) => {
          logError('aprobaciones.decidir', err);
          haptics.error();
          // 422 con el texto humano del backend (p. ej. «Aún no es tu turno…»): se muestra tal cual y se refresca.
          toast.error(getActionErrorMessage(err));
          refetch();
        },
      },
    );
  };

  const aprobar = async (solicitud: AprobacionItem) => {
    const etiquetas = etiquetasAccion(solicitud.flujo.accion_usuario_actual);
    const ok = await confirmAction({
      title: etiquetas.aprobar,
      message: `${solicitud.tipo_etiqueta} de ${solicitud.solicitante}. ${etiquetas.confirmar}`.trim(),
      confirmLabel: etiquetas.aprobar,
    });
    if (ok) ejecutar(solicitud, true);
  };

  const pill = item ? pillEstadoFlujo(item.flujo) : null;
  const modo = item ? modoAcciones(item.flujo, item.tipo) : 'sin_turno';
  const bloqueadoPorEstructura = item?.flujo.pasos.some((p) => p.estado === 'pendiente' && p.bloqueado) ?? false;

  return (
    <Screen
      title="Aprobación"
      subtitle={item?.folio ? `Folio ${item.folio}` : undefined}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      refreshing={isRefetching}
      onRefresh={refetch}
      footerNota={item ? (modo === 'sin_turno' ? motivoSinTurno(item.flujo) : isOffline ? 'Sin conexión: podrás decidir cuando vuelva la red.' : undefined) : undefined}
      footer={
        item ? (
          <BotonesAprobacion
            flujo={item.flujo}
            tipo={item.tipo}
            offline={isOffline}
            ocupado={decidir.isPending}
            aprobando={decidir.isPending && decidir.variables?.aprobado === true}
            onAprobar={() => void aprobar(item)}
            onRechazar={() => setRechazando(true)}
            onRevisarDetalle={() => openCrossExperienceRoute(`/(app)/rh/solicitudes/${item.id}`, 'rh')}
          />
        ) : undefined
      }>
      {!item ? (
        <EmptyState
          icon="checkmark-done-outline"
          title="Ya no está en tu bandeja"
          message="Esta solicitud ya fue decidida o dejó de esperarte. Revisa tu bandeja para ver lo pendiente."
          actionLabel="Ver bandeja"
          onAction={() => router.replace('/aprobaciones')}
        />
      ) : (
        <View style={styles.contenido}>
          <Card style={styles.encabezado}>
            <Text style={styles.kicker}>{item.tipo_etiqueta}</Text>
            <Text style={styles.titulo}>{item.solicitante}</Text>
            {pill ? <Pill texto={pill.texto} tono={pill.tono} icono={pill.icono} /> : null}
          </Card>

          {modo === 'sin_turno' ? (
            <TarjetaAviso
              icono={bloqueadoPorEstructura ? 'lock-closed-outline' : 'time-outline'}
              tono={bloqueadoPorEstructura ? 'peligro' : 'info'}
              titulo={textoPendienteDe(item.flujo) ?? 'Todavía no es tu turno'}
              mensaje={motivoSinTurno(item.flujo)}
            />
          ) : (
            <TarjetaAviso
              icono="hand-right-outline"
              tono="aviso"
              titulo="Te toca decidir"
              mensaje={
                modo === 'revisar_detalle'
                  ? 'Abre el detalle para revisar la información completa antes de decidir.'
                  : 'Revisa la información y aprueba o rechaza. Quien la pidió recibirá un aviso.'
              }
            />
          )}

          <GrupoLista titulo="Lo que pide">
            {item.fecha_inicio ? (
              <FilaLista
                etiqueta="Fechas"
                icono="calendar-outline"
                titulo={[item.fecha_inicio, item.fecha_fin && item.fecha_fin !== item.fecha_inicio ? item.fecha_fin : null]
                  .filter((v): v is string => Boolean(v))
                  .map((v) => formatDateLong(v))
                  .join(' — ')}
              />
            ) : null}
            {item.monto_solicitado !== null ? <FilaLista etiqueta="Monto solicitado" icono="cash-outline" titulo={formatCurrencyMXN(item.monto_solicitado)} /> : null}
            {item.motivo ? <FilaLista etiqueta="Motivo" icono="chatbox-ellipses-outline" titulo={item.motivo} /> : null}
            {item.creada_en ? <FilaLista etiqueta="Enviada" icono="paper-plane-outline" titulo={formatFechaHoraFlujo(item.creada_en)} /> : null}
          </GrupoLista>

          <SeccionTitulo titulo="Seguimiento" descripcion="Quién aprueba y en qué orden. Lo define la estructura de la empresa." />
          <Card>
            <FlujoAprobacionTimeline flujo={item.flujo} />
          </Card>
        </View>
      )}

      <MotivoModal
        visible={rechazando}
        title="Rechazar solicitud"
        description="Explica brevemente el motivo. Quien la pidió lo verá."
        confirmLabel="Rechazar"
        submitting={decidir.isPending}
        onCancel={() => setRechazando(false)}
        onConfirm={(motivo) => item && ejecutar(item, false, motivo)}
      />
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    contenido: {
      gap: Spacing.lg,
    },
    encabezado: {
      gap: Spacing.xs,
    },
    kicker: {
      fontSize: FontSize.xs,
      fontWeight: '800',
      color: Colors.primaryDark,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    titulo: {
      fontSize: FontSize.xl,
      fontWeight: '800',
      color: Colors.text,
    },
  });
