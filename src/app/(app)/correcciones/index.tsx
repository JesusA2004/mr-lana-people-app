import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ciclo/Screen';
import { EmptyState } from '@/components/EmptyState';
import { FilaLista, GrupoLista, TarjetaAviso, textoConteo } from '@/components/ui';
import { Spacing } from '@/constants/colors';
import { useCorrecciones } from '@/hooks/queries/useCorrecciones';
import type { Correccion } from '@/types/correcciones';
import { destinoCorreccion, estadoCorreccionVisual } from '@/utils/correcciones';
import { formatDateShort } from '@/utils/dates';

const ORIGEN: Record<string, string> = {
  documento: 'Documento',
  foto: 'Foto de perfil',
};

function subtitulo(c: Correccion): string {
  const partes: string[] = [];
  if (ORIGEN[c.origen]) partes.push(ORIGEN[c.origen]!);
  if (c.campos.length > 0) partes.push(c.campos.join(', '));
  const fecha = c.actualizada_en ?? c.creada_en;
  if (fecha) partes.push(formatDateShort(fecha));
  return partes.join(' · ') || c.estado_etiqueta;
}

/**
 * Mis correcciones: cambios de datos, documentos rechazados y foto, con su
 * estado. Primero lo que requiere acción de la persona (responder a RH o
 * volver a subir), luego lo que está en revisión y al final lo resuelto.
 */
export default function MisCorreccionesScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useCorrecciones();
  const correcciones = data?.data ?? [];
  const requieren = correcciones.filter((c) => c.requiere_accion);
  const enProceso = correcciones.filter((c) => !c.requiere_accion && (c.estado === 'enviada' || c.estado === 'en_revision'));
  const resueltas = correcciones.filter((c) => !c.requiere_accion && c.estado !== 'enviada' && c.estado !== 'en_revision');

  const abrir = (c: Correccion) => router.push(destinoCorreccion(c).ruta as never);

  const fila = (c: Correccion) => {
    const visual = estadoCorreccionVisual(c.estado);
    const estado = c.estado_etiqueta || visual.texto;
    // Estado = ícono del estado + texto en su tono (en una fila angosta un chip a la derecha aplastaba el título).
    return (
      <FilaLista
        key={c.id}
        icono={visual.icono}
        tono={visual.tono}
        titulo={c.titulo}
        subtitulo={`${estado} · ${subtitulo(c)}`}
        subtituloConTono
        accessibilityLabel={`${c.titulo}: ${estado}. ${subtitulo(c)}`}
        onPress={() => abrir(c)}
      />
    );
  };

  return (
    <Screen title="Mis correcciones" isLoading={isLoading} error={error} onRetry={() => void refetch()} refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={styles.contenido}>
        {requieren.length > 0 ? (
          <TarjetaAviso
            icono="alert-circle-outline"
            tono="aviso"
            titulo={textoConteo(requieren.length, 'corrección necesita tu respuesta', 'correcciones necesitan tu respuesta') ?? ''}
            mensaje="Recursos Humanos te pidió algo. Ábrela para ver qué necesita."
          />
        ) : null}

        {correcciones.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="Sin correcciones"
            message="Cuando pidas un cambio a tus datos o Recursos Humanos te pida corregir un documento, aquí verás en qué va."
          />
        ) : null}

        {requieren.length > 0 ? <GrupoLista titulo="Requieren tu acción">{requieren.map(fila)}</GrupoLista> : null}
        {enProceso.length > 0 ? <GrupoLista titulo="En revisión" descripcion="Recursos Humanos las está revisando.">{enProceso.map(fila)}</GrupoLista> : null}
        {resueltas.length > 0 ? <GrupoLista titulo="Resueltas">{resueltas.map(fila)}</GrupoLista> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: Spacing.lg,
  },
});
