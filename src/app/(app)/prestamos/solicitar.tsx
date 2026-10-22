import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice, Screen } from '@/components/ciclo/Screen';
import { MoneyField } from '@/components/forms/MoneyField';
import { ElegibilidadPrestamoResumen } from '@/components/ElegibilidadPrestamoResumen';
import { Input } from '@/components/Input';
import { FontSize, LineHeight, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { usePrestamoElegibilidad } from '@/hooks/queries/useCorrecciones';
import { useCreateSolicitud } from '@/hooks/queries/useSolicitudes';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { confirmAction } from '@/utils/confirm';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';
import { formatCurrencyMXN } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';
import { isSelfServiceModuleEnabled } from '@/utils/modules';
import { buildLoanRequestPayload, LOAN_REASON_MAX, validateLoanRequest, type LoanRequestErrors } from '@/utils/loanRequest';
import { vistaElegibilidad } from '@/utils/prestamoElegibilidad';

/**
 * Solicitar préstamo: el colaborador solo dice cuánto y para qué. Plazo,
 * periodicidad y condiciones los define RH al autorizar — nunca se le
 * preguntan aquí. Entra como solicitud `prestamo`; el seguimiento (visto
 * bueno → RH → firma) se ve en Préstamos.
 */
export default function SolicitarPrestamoScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const crear = useCreateSolicitud();
  const { isOffline } = useNetworkStatus();
  const bootstrap = useMobileBootstrap(true);
  const prestamosEnabled = isSelfServiceModuleEnabled(bootstrap.data?.features, 'prestamos');
  const [monto, setMonto] = useState<number | undefined>();
  const [motivo, setMotivo] = useState('');
  const [errors, setErrors] = useState<LoanRequestErrors>({});
  // 6 meses de antigüedad: lo decide el backend con SU fecha (nunca la del teléfono).
  const elegibilidad = usePrestamoElegibilidad();
  const vista = vistaElegibilidad(elegibilidad.data);

  const enviar = async () => {
    if (!vista.botonHabilitado) return;
    const found = validateLoanRequest(monto, motivo);
    setErrors(found);
    if (found.monto || found.motivo || monto === undefined) {
      haptics.warning();
      return;
    }

    const ok = await confirmAction({
      title: 'Solicitar préstamo',
      message: `Monto: ${formatCurrencyMXN(monto)}\nMotivo: ${motivo.trim()}`,
      confirmLabel: 'Enviar solicitud',
    });
    if (!ok) return;

    crear.mutate(buildLoanRequestPayload(monto, motivo), {
      onSuccess: () => {
        haptics.success();
        toast.success('Solicitud enviada. Te avisaremos cuando avance.');
        // Sin módulo Préstamos, el seguimiento vive en Mis solicitudes.
        router.replace((prestamosEnabled ? '/prestamos' : '/(app)/(tabs)/solicitudes') as never);
      },
      onError: (error) => {
        logError('prestamo.solicitar', error);
        haptics.error();
        const validation = getValidationErrors(error);
        if (validation) {
          // 422 de antigüedad («Necesitas mínimo 6 meses…») llega en monto_solicitado: se muestra tal cual y se refresca la elegibilidad.
          setErrors({ monto: validation.monto_solicitado?.[0], motivo: validation.motivo?.[0] });
          if (validation.monto_solicitado?.[0]) toast.error(validation.monto_solicitado[0]);
          void elegibilidad.refetch();
          return;
        }
        toast.error(getErrorMessage(error));
      },
    });
  };

  return (
    <Screen
      title="Solicitar préstamo"
      form
      isLoading={elegibilidad.isLoading}
      refreshing={elegibilidad.isRefetching}
      onRefresh={() => void elegibilidad.refetch()}
      footerNota={isOffline ? 'Sin conexión: podrás enviarla cuando vuelva la red.' : !vista.botonHabilitado ? (vista.disponibleDesde ?? undefined) : undefined}
      footer={
        <Button
          title={vista.botonTitulo}
          leftIcon={vista.botonHabilitado ? 'send' : 'lock-closed-outline'}
          onPress={() => void enviar()}
          loading={crear.isPending}
          disabled={!vista.botonHabilitado || isOffline || crear.isPending}
        />
      }>
      <ElegibilidadPrestamoResumen elegibilidad={elegibilidad.data} />

      {vista.botonHabilitado ? (
      <Card style={styles.card}>
        <MoneyField
          label="¿Cuánto necesitas?"
          value={monto}
          onChange={(value) => {
            setMonto(value);
            if (errors.monto) setErrors((e) => ({ ...e, monto: undefined }));
          }}
          error={errors.monto}
        />

        <Input
          label="Motivo"
          value={motivo}
          onChangeText={(text) => {
            setMotivo(text);
            if (errors.motivo) setErrors((e) => ({ ...e, motivo: undefined }));
          }}
          placeholder="Explica brevemente para qué necesitas el préstamo"
          multiline
          maxLength={LOAN_REASON_MAX}
          error={errors.motivo}
          accessibilityLabel="Motivo del préstamo"
        />
      </Card>
      ) : null}

      <Text style={styles.help}>Tu jefe inmediato da el visto bueno y después Recursos Humanos define el plazo y las condiciones.</Text>

      {isOffline ? <Notice tone="warning">Sin conexión: podrás enviarla cuando vuelva la red.</Notice> : null}
    </Screen>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  card: {
    gap: Spacing.lg,
  },
  help: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: LineHeight.sm,
  },
});
