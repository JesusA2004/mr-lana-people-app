import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DatoFaltante } from '@/api/cicloLaboral';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice, Screen } from '@/components/ciclo/Screen';
import { DateField } from '@/components/forms/DateField';
import { OpcionesField } from '@/components/forms/OpcionesField';
import { Input } from '@/components/Input';
import { SuccessCheck } from '@/components/SuccessCheck';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { useDatosFaltantes } from '@/hooks/queries/useCicloLaboral';
import { useCreateSolicitud } from '@/hooks/queries/useSolicitudes';
import { toast } from '@/store/toastStore';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { fromApiDateString, toApiDateString } from '@/utils/dates';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';

/**
 * «Completa tu información» — `GET /colaborador/datos-faltantes`.
 *
 * El colaborador NUNCA edita su expediente directo: aquí propone los datos
 * que faltan y se envía una solicitud de actualización de datos
 * (`tipo: actualizacion_datos`, `datos: {...}`). Solo cuando Recursos
 * Humanos la autoriza pasan al expediente, y la completitud se recalcula
 * sola en el backend.
 */
export default function CompletarDatosScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const query = useDatosFaltantes();
  const crear = useCreateSolicitud();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviada, setEnviada] = useState(false);

  const datos = query.data;
  const capturados = Object.entries(valores).filter(([, v]) => v.trim() !== '');

  const cambiar = (campo: string, valor: string) => {
    setValores((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => {
      const { [campo]: _quitado, ...resto } = actual;
      return resto;
    });
  };

  const enviar = async () => {
    if (capturados.length === 0 || crear.isPending) {
      toast.warning('Captura al menos un dato para enviarlo a Recursos Humanos.');
      return;
    }

    try {
      await crear.mutateAsync({ tipo: 'actualizacion_datos', motivo: '', datos: Object.fromEntries(capturados) });
      setEnviada(true);
    } catch (error) {
      logError('datosFaltantes.enviar', error);
      const validacion = getValidationErrors(error);
      if (validacion) {
        const mapa: Record<string, string> = {};
        for (const [clave, mensajes] of Object.entries(validacion)) {
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
      <Screen title="Completa tu información">
        <View style={styles.exito}>
          <SuccessCheck size={96} />
          <Text style={styles.exitoTitulo}>Enviado a Recursos Humanos</Text>
          <Text style={styles.exitoTexto}>Cuando RH lo autorice, tus datos se actualizan solos en tu expediente.</Text>
          <Button title="Ver mis solicitudes" leftIcon="list-outline" onPress={() => router.replace('/(app)/(tabs)/solicitudes')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Completa tu información"
      subtitle="Datos que pide tu contrato"
      form
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Tu cuenta todavía no tiene un expediente vinculado."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {datos ? (
        datos.completo ? (
          <Card style={styles.completo}>
            <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
            <Text style={styles.exitoTitulo}>Tu información está completa</Text>
            <Text style={styles.exitoTexto}>No falta ningún dato personal en tu expediente.</Text>
          </Card>
        ) : datos.solicitud_en_revision ? (
          <Notice tone="info">
            Ya enviaste tus datos y Recursos Humanos los está revisando. Te avisaremos cuando se apliquen a tu expediente.
          </Notice>
        ) : (
          <>
            <Notice tone="warning">
              {`Faltan ${datos.faltan.length} ${datos.faltan.length === 1 ? 'dato' : 'datos'} en tu expediente. Captúralos y Recursos Humanos los revisa antes de guardarlos.`}
            </Notice>
            <View style={styles.campos}>
              {datos.faltan.map((dato) => (
                <CampoDato key={dato.campo} dato={dato} valor={valores[dato.campo]} error={errores[dato.campo]} onChange={(v) => cambiar(dato.campo, v)} />
              ))}
            </View>
            <Button
              title={capturados.length > 0 ? `Enviar ${capturados.length} ${capturados.length === 1 ? 'dato' : 'datos'} a RH` : 'Enviar a RH'}
              leftIcon="send-outline"
              loading={crear.isPending}
              disabled={crear.isPending || capturados.length === 0}
              onPress={() => void enviar()}
            />
          </>
        )
      ) : null}
    </Screen>
  );
}

function CampoDato({ dato, valor, error, onChange }: { dato: DatoFaltante; valor?: string; error?: string; onChange: (valor: string) => void }) {
  if (dato.tipo === 'opciones' && dato.opciones) {
    return <OpcionesField label={dato.etiqueta} value={valor} opciones={dato.opciones} onChange={onChange} error={error} />;
  }

  if (dato.tipo === 'date') {
    return (
      <DateField
        label={dato.etiqueta}
        value={valor ? fromApiDateString(valor) : undefined}
        onChange={(fecha) => onChange(toApiDateString(fecha))}
        error={error}
      />
    );
  }

  const numerico = dato.tipo === 'tel' || dato.tipo === 'number';

  return (
    <Input
      label={dato.etiqueta}
      value={valor ?? ''}
      onChangeText={(texto) => onChange(numerico ? texto.replace(/[^0-9]/g, '') : dato.campo === 'curp' || dato.campo === 'rfc' ? texto.toUpperCase() : texto)}
      keyboardType={dato.tipo === 'tel' ? 'phone-pad' : dato.tipo === 'number' ? 'number-pad' : dato.tipo === 'email' ? 'email-address' : 'default'}
      autoCapitalize={dato.tipo === 'email' ? 'none' : dato.campo === 'curp' || dato.campo === 'rfc' ? 'characters' : 'sentences'}
      maxLength={dato.campo === 'curp' ? 18 : dato.campo === 'rfc' ? 13 : dato.campo === 'nss' ? 11 : dato.tipo === 'tel' ? 10 : dato.campo === 'domicilio_cp' ? 5 : 255}
      error={error}
    />
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    campos: { gap: Spacing.lg },
    completo: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
    exito: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
    exitoTitulo: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
    exitoTexto: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  });
