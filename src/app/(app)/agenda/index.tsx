import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ItemCard } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { TarjetaAviso } from '@/components/ui';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useAgenda } from '@/hooks/queries/useAgenda';
import { useAbrirNotificacion, useNotificaciones } from '@/hooks/queries/useNotificaciones';
import { useEstilos } from '@/theme/ThemeProvider';
import { agendaBadge } from '@/utils/agenda';
import { formatDateLong } from '@/utils/dates';

/**
 * «Mi agenda» (pág. 24): próximas citas de la sucursal, agrupadas por día.
 * El alcance y las acciones vienen del backend; subgerente solo consulta
 * salvo que RH le asigne permisos.
 */
export default function AgendaScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const query = useAgenda();
  const notificaciones = useNotificaciones();
  const abrir = useAbrirNotificacion();
  const dias = query.data?.dias ?? [];
  const avisos = notificaciones.items.filter((n) => n.data?.type === 'agenda_evento' && !n.leida);
  const aviso = avisos[0];

  const abrirAviso = () => {
    if (!aviso) return;
    abrir.mutate(aviso.id);
    if (aviso.data?.resource_id) router.push(`/agenda/${aviso.data.resource_id}` as never);
  };

  return (
    <Screen
      title="Mi agenda"
      subtitle="Entrevistas y estudios socioeconómicos"
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
        void notificaciones.refetch();
      }}>
      {aviso ? (
        <TarjetaAviso
          icono="notifications-outline"
          tono="info"
          titulo={aviso.titulo ?? 'Nuevo evento'}
          mensaje={avisos.length > 1 ? `${aviso.mensaje ?? ''} (${avisos.length} avisos sin leer)` : (aviso.mensaje ?? '')}
          accion="Ver cita"
          onPress={abrirAviso}
        />
      ) : null}

      {query.data?.puede_agendar ? <Button title="Agendar" leftIcon="add-circle-outline" onPress={() => router.push('/agenda/nueva' as never)} /> : null}

      {dias.length === 0 ? (
        <EmptyMessage message="No tienes citas próximas." />
      ) : (
        dias.map((dia) => (
          <View key={dia.fecha} style={styles.dia}>
            <Text style={styles.fecha} accessibilityRole="header">
              {formatDateLong(dia.fecha)}
            </Text>
            {dia.eventos.map((evento) => (
              <ItemCard
                key={evento.id}
                icon={evento.tipo === 'entrevista' ? 'chatbubbles-outline' : 'home-outline'}
                kicker={`${evento.hora} · ${evento.tipo_etiqueta}`}
                title={evento.candidato.nombre}
                subtitle={[evento.candidato.puesto, evento.sucursal.nombre].filter(Boolean).join(' · ')}
                lines={[evento.origen_etiqueta]}
                status={agendaBadge(evento.estado)}
                statusLabel={evento.estado_etiqueta}
                onPress={() => router.push(`/agenda/${evento.id}` as never)}
              />
            ))}
          </View>
        ))
      )}

      {dias.length > 0 ? <Notice tone="info">Recordatorio: un día antes y el mismo día de cada cita.</Notice> : null}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    dia: { gap: Spacing.sm },
    fecha: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  });
