import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/ciclo/Screen';
import { CorreccionResumen } from '@/components/CorreccionResumen';
import { EmptyState } from '@/components/EmptyState';
import { FormularioRespuestaCorreccion } from '@/components/FormularioRespuestaCorreccion';
import { Spacing } from '@/constants/colors';
import { useCorrecciones, useResponderCorreccion } from '@/hooks/queries/useCorrecciones';
import { useSolicitud } from '@/hooks/queries/useSolicitudes';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { construirRespuesta, destinoCorreccion, erroresRespuesta, normalizeDatosPropuestos, solicitudIdDeCorreccion, validarRespuesta } from '@/utils/correcciones';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

/**
 * Detalle de una corrección: estado (chip + 3 pasos), comentario de RH,
 * historial y, cuando RH pidió más información, el formulario de respuesta
 * (mensaje obligatorio + corregir lo propuesto) con «Enviar respuesta» en la
 * barra inferior. Destino de los avisos/push de corrección.
 */
export default function CorreccionDetalleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clave = id ? decodeURIComponent(id) : '';
  const { data, isLoading, error, refetch, isRefetching } = useCorrecciones();
  const correccion = data?.data.find((c) => c.id === clave) ?? null;
  const solicitudId = correccion ? solicitudIdDeCorreccion(correccion) : null;
  const puedeResponder = Boolean(correccion?.puede_responder && solicitudId);
  // El detalle de la solicitud trae lo que se propuso (para corregirlo).
  const solicitud = useSolicitud(puedeResponder && solicitudId ? solicitudId : undefined);
  const datos = normalizeDatosPropuestos(solicitud.data?.datos_propuestos);
  const responder = useResponderCorreccion(solicitudId);
  const { isOffline } = useNetworkStatus();

  const [mensaje, setMensaje] = useState('');
  const [valores, setValores] = useState<Record<string, string>>({});
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [erroresDatos, setErroresDatos] = useState<Record<string, string>>({});

  const enviar = () => {
    const problema = validarRespuesta(mensaje);
    setErrorMensaje(problema);
    if (problema) {
      haptics.warning();
      return;
    }
    responder.mutate(construirRespuesta(mensaje, datos, valores), {
      onSuccess: (resultado) => {
        haptics.success();
        toast.success(resultado.message ?? 'Respuesta enviada. Recursos Humanos revisará de nuevo tu solicitud.');
        setMensaje('');
        setValores({});
        setErroresDatos({});
      },
      onError: (err) => {
        logError('correcciones.responder', err);
        haptics.error();
        const validacion = getValidationErrors(err);
        if (validacion) {
          const errores = erroresRespuesta(validacion);
          setErrorMensaje(errores.mensaje ?? null);
          setErroresDatos(errores.datos);
          if (!errores.mensaje && Object.keys(errores.datos).length === 0) toast.error(getErrorMessage(err));
          return;
        }
        toast.error(getErrorMessage(err));
      },
    });
  };

  const destino = correccion ? destinoCorreccion(correccion) : null;
  const accionExterna = correccion?.requiere_accion && correccion.origen !== 'solicitud' && destino ? destino : null;

  const footer = puedeResponder ? (
    <Button title="Enviar respuesta" leftIcon="send" loading={responder.isPending} disabled={responder.isPending || isOffline} onPress={enviar} />
  ) : accionExterna ? (
    <Button title={accionExterna.accion} leftIcon="arrow-forward" onPress={() => router.push(accionExterna.ruta as never)} />
  ) : undefined;

  return (
    <Screen
      title="Corrección"
      form
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      footer={footer}
      footerNota={puedeResponder && isOffline ? 'Sin conexión: podrás enviarla cuando vuelva la red.' : undefined}>
      {!correccion ? (
        <EmptyState
          icon="search-outline"
          title="No encontramos esta corrección"
          message="Puede que ya se haya resuelto hace tiempo. Revisa la lista de tus correcciones."
          actionLabel="Ver mis correcciones"
          onAction={() => router.replace('/correcciones')}
        />
      ) : (
        <View style={styles.contenido}>
          <CorreccionResumen correccion={correccion} />
          {puedeResponder ? (
            <FormularioRespuestaCorreccion
              mensaje={mensaje}
              onMensaje={(texto) => {
                setMensaje(texto);
                if (errorMensaje) setErrorMensaje(null);
              }}
              errorMensaje={errorMensaje}
              datos={datos}
              valores={valores}
              onValor={(campo, valor) => {
                setValores((v) => ({ ...v, [campo]: valor }));
                if (erroresDatos[campo]) setErroresDatos(({ [campo]: _quitado, ...resto }) => resto);
              }}
              erroresDatos={erroresDatos}
              editable={!responder.isPending}
            />
          ) : null}
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
