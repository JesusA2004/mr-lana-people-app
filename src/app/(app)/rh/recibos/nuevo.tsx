import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field } from '@/components/ciclo/FormSheet';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { DateField } from '@/components/forms/DateField';
import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhCrearRecibo } from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { toApiDateString } from '@/utils/dates';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { parseCurrencyInput } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';

interface ConceptoForm {
  tipo: 'percepcion' | 'deduccion';
  concepto: string;
  importe: string;
  cantidad: string;
}

const NUEVO: ConceptoForm = { tipo: 'percepcion', concepto: '', importe: '', cantidad: '' };

/**
 * Recibo interno individual — `POST /rh/colaboradores/{id}/recibos`
 * (`ReciboNominaRequest`). La app captura conceptos; folio, totales y PDF
 * los genera el backend. No es CFDI.
 */
export default function RhNuevoReciboScreen() {
  const router = useRouter();
  const { colaboradorId, nombre } = useLocalSearchParams<{ colaboradorId: string; nombre?: string }>();
  const crear = useRhCrearRecibo(colaboradorId);
  const { isOffline } = useNetworkStatus();
  const [inicio, setInicio] = useState<Date | undefined>();
  const [fin, setFin] = useState<Date | undefined>();
  const [pago, setPago] = useState<Date | undefined>();
  const [observaciones, setObservaciones] = useState('');
  const [conceptos, setConceptos] = useState<ConceptoForm[]>([{ ...NUEVO }]);

  const validos = conceptos.every((c) => c.concepto.trim() !== '' && parseCurrencyInput(c.importe) !== undefined);
  const listo = !!inicio && !!fin && conceptos.length > 0 && validos;

  const actualizar = (index: number, patch: Partial<ConceptoForm>) => setConceptos((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const enviar = () => {
    if (!inicio || !fin) return;
    Alert.alert('Generar recibo interno', `Se generará el recibo de ${nombre ?? 'este colaborador'} y quedará disponible en su app.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Generar',
        onPress: () =>
          crear.mutate(
            {
              periodo_inicio: toApiDateString(inicio),
              periodo_fin: toApiDateString(fin),
              fecha_pago: pago ? toApiDateString(pago) : null,
              tipo_periodo: 'semanal',
              observaciones: observaciones.trim() || null,
              conceptos: conceptos.map((c) => ({
                tipo: c.tipo,
                concepto: c.concepto.trim(),
                importe: parseCurrencyInput(c.importe) ?? 0,
                cantidad: c.cantidad.trim() ? Number(c.cantidad) : null,
              })),
            },
            {
              onSuccess: (recibo) => {
                haptics.success();
                toast.success(`Recibo ${recibo.folio ?? ''} generado.`);
                router.replace(`/(app)/rh/recibos/${recibo.id}` as never);
              },
              onError: (error) => {
                logError('rhRecibo.crear', error);
                haptics.error();
                toast.error(getActionErrorMessage(error));
              },
            },
          ),
      },
    ]);
  };

  return (
    <Screen title="Nuevo recibo interno" subtitle={nombre}>
      <Card style={styles.gap}>
        <SectionTitle>Periodo</SectionTitle>
        <DateField label="Inicio" value={inicio} onChange={setInicio} error={getFieldError(crear.error, 'periodo_inicio')} />
        <DateField label="Fin" value={fin} onChange={setFin} error={getFieldError(crear.error, 'periodo_fin')} />
        <DateField label="Fecha de pago (opcional)" value={pago} onChange={setPago} />
      </Card>

      <Card style={styles.gap}>
        <SectionTitle>Conceptos</SectionTitle>
        {conceptos.map((c, index) => (
          <View key={index} style={styles.concepto}>
            <View style={styles.conceptoHeader}>
              <Text style={styles.conceptoTitle}>Concepto {index + 1}</Text>
              {conceptos.length > 1 ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar concepto ${index + 1}`}
                  onPress={() => setConceptos((prev) => prev.filter((_, i) => i !== index))}
                  hitSlop={10}>
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                </PressableScale>
              ) : null}
            </View>
            <View style={styles.chips}>
              <FilterChips
                options={[
                  { value: 'percepcion', label: 'Percepción' },
                  { value: 'deduccion', label: 'Deducción' },
                ]}
                value={c.tipo}
                onChange={(tipo) => actualizar(index, { tipo })}
              />
            </View>
            <Field label="Concepto" value={c.concepto} onChangeText={(v) => actualizar(index, { concepto: v })} maxLength={150} error={getFieldError(crear.error, `conceptos.${index}.concepto`)} />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Field label="Importe" keyboardType="decimal-pad" value={c.importe} onChangeText={(v) => actualizar(index, { importe: v })} error={getFieldError(crear.error, `conceptos.${index}.importe`)} />
              </View>
              <View style={styles.flex}>
                <Field label="Cantidad" keyboardType="decimal-pad" value={c.cantidad} onChangeText={(v) => actualizar(index, { cantidad: v })} placeholder="1" />
              </View>
            </View>
          </View>
        ))}
        <Button title="Agregar concepto" variant="ghost" leftIcon="add-circle-outline" onPress={() => setConceptos((prev) => [...prev, { ...NUEVO }])} />
        <Field label="Observaciones (opcional)" value={observaciones} onChangeText={setObservaciones} multiline maxLength={1000} />
      </Card>

      {getFieldError(crear.error, 'conceptos') ? <Notice tone="danger">{getFieldError(crear.error, 'conceptos')}</Notice> : null}
      {isOffline ? <Notice tone="warning">Sin conexión: requiere confirmación del servidor.</Notice> : null}
      <Button title="Generar recibo" disabled={!listo || isOffline} loading={crear.isPending} onPress={enviar} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.md,
  },
  concepto: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  conceptoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conceptoTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  chips: {
    marginHorizontal: -Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
