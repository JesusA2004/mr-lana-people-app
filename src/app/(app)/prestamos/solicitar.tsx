import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice, Screen } from '@/components/ciclo/Screen';
import { MoneyField } from '@/components/forms/MoneyField';
import { ElegibilidadPrestamoResumen } from '@/components/ElegibilidadPrestamoResumen';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
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
  const Colors = useColores();
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
          // 422 de antigüedad («Disponible al cumplir 6 meses…») llega en monto_solicitado: se muestra tal cual y se refresca la elegibilidad.
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

        <View style={styles.field}>
          <Text style={styles.label}>Motivo</Text>
          <TextInput
            value={motivo}
            onChangeText={(text) => {
              setMotivo(text);
              if (errors.motivo) setErrors((e) => ({ ...e, motivo: undefined }));
            }}
            placeholder="Explica brevemente para qué necesitas el préstamo"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={LOAN_REASON_MAX}
            style={[styles.textarea, errors.motivo && styles.textareaError]}
            accessibilityLabel="Motivo del préstamo"
          />
          <View style={styles.row}>
            {errors.motivo ? <Text style={styles.error}>{errors.motivo}</Text> : <View />}
            <Text style={styles.counter}>
              {motivo.length}/{LOAN_REASON_MAX}
            </Text>
          </View>
        </View>
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
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  textarea: {
    minHeight: 110,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  textareaError: {
    borderColor: Colors.danger,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  error: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.danger,
  },
  counter: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  help: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
});
