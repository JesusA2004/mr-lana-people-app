import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice, Screen } from '@/components/ciclo/Screen';
import { DomicilioFields } from '@/components/forms/DomicilioFields';
import { SuccessCheck } from '@/components/SuccessCheck';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useDatosFaltantes } from '@/hooks/queries/useCicloLaboral';
import { useCreateSolicitud } from '@/hooks/queries/useSolicitudes';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { cambiosDomicilio, esCampoDomicilio, validarDomicilio, type CampoDomicilio, type ValoresDomicilio } from '@/utils/domicilio';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';

/**
 * «Solicitar cambio de domicilio» — el colaborador NUNCA edita su
 * expediente directo: propone su domicilio campo por campo (calle, número,
 * colonia, C.P., municipio, estado) con una solicitud de actualización de
 * datos y solo cuando Recursos Humanos la autoriza pasa al expediente.
 */
export default function CambiarDomicilioScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const query = useDatosFaltantes();
  const crear = useCreateSolicitud();
  // Solo lo que la persona corrige; se muestra sobre lo vigente.
  const [editados, setEditados] = useState<ValoresDomicilio>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviada, setEnviada] = useState(false);

  const domicilio = query.data?.domicilio ?? null;
  const actuales = useMemo(() => {
    const mapa: ValoresDomicilio = {};
    for (const campo of domicilio?.campos ?? []) {
      if (esCampoDomicilio(campo.campo) && campo.actual) mapa[campo.campo] = campo.actual;
    }
    return mapa;
  }, [domicilio]);
  const estadosApi = domicilio?.campos.find((c) => c.campo === 'domicilio_estado')?.opciones?.map((o) => o.value);

  const valores: ValoresDomicilio = { ...actuales, ...editados };

  const cambiar = (campo: CampoDomicilio, valor: string) => {
    setEditados((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => {
      const { [campo]: _quitado, ...resto } = actual;
      return resto;
    });
  };

  const enviar = async () => {
    if (crear.isPending) return;

    const validacion = validarDomicilio(valores, true, estadosApi) as Record<string, string>;
    if (Object.keys(validacion).length > 0) {
      setErrores(validacion);
      toast.error(Object.values(validacion)[0] ?? 'Revisa tu domicilio.');
      return;
    }

    const cambios = cambiosDomicilio(valores, actuales);
    if (Object.keys(cambios).length === 0) {
      toast.warning('Tu domicilio ya está así en tu expediente: no hay nada que cambiar.');
      return;
    }

    try {
      await crear.mutateAsync({ tipo: 'actualizacion_datos', motivo: '', datos: cambios });
      setEnviada(true);
    } catch (error) {
      logError('cambiarDomicilio.enviar', error);
      const respuesta = getValidationErrors(error);
      if (respuesta) {
        const mapa: Record<string, string> = {};
        for (const [clave, mensajes] of Object.entries(respuesta)) {
          if (mensajes?.[0]) mapa[clave.replace(/^datos\./, '')] = mensajes[0];
        }
        setErrores(mapa);
        toast.error(Object.values(mapa)[0] ?? getErrorMessage(error));
        return;
      }
      toast.error(getErrorMessage(error));
    }
  };

  if (enviada) {
    return (
      <Screen title="Cambiar mi domicilio">
        <View style={styles.exito}>
          <SuccessCheck size={96} />
          <Text style={styles.exitoTitulo}>Enviado a Recursos Humanos</Text>
          <Text style={styles.exitoTexto}>Cuando RH lo autorice, tu domicilio se actualiza en tu expediente.</Text>
          <Button title="Ver mis solicitudes" leftIcon="list-outline" onPress={() => router.replace('/(app)/(tabs)/solicitudes')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Cambiar mi domicilio"
      subtitle="Recursos Humanos lo revisa antes de guardarlo"
      form
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Tu cuenta todavía no tiene un expediente vinculado."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {query.data && !domicilio ? (
        <Notice tone="info">Esta función todavía no está disponible. Pide el cambio con «Solicitar actualización de datos».</Notice>
      ) : query.data?.solicitud_en_revision ? (
        <Notice tone="info">Ya tienes una actualización de datos en revisión. Espera a que Recursos Humanos la resuelva para pedir otra.</Notice>
      ) : domicilio ? (
        <>
          {domicilio.texto ? (
            <Card style={styles.actual}>
              <Ionicons name="home-outline" size={22} color={Colors.primaryDark} />
              <View style={styles.actualTexto}>
                <Text style={styles.actualTitulo}>Domicilio registrado</Text>
                <Text style={styles.exitoTexto}>{domicilio.texto}</Text>
              </View>
            </Card>
          ) : null}
          <DomicilioFields valores={valores} errores={errores} estados={estadosApi} actuales={actuales} onChange={cambiar} />
          <Button title="Enviar a RH" leftIcon="send-outline" loading={crear.isPending} disabled={crear.isPending} onPress={() => void enviar()} />
        </>
      ) : null}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    actual: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.lg },
    actualTexto: { flex: 1, gap: 2 },
    actualTitulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    exito: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
    exitoTitulo: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
    exitoTexto: { fontSize: FontSize.sm, color: Colors.textMuted },
  });
