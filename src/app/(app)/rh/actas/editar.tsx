import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field } from '@/components/ciclo/FormSheet';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { DateField } from '@/components/forms/DateField';
import { PressableScale } from '@/components/PressableScale';
import { Stepper } from '@/components/Stepper';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhActa, useRhGuardarActa } from '@/hooks/queries/useRhCicloLaboral';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import { TIPOS_ACTA, type Acta, type ActaDeclaracion, type ActaTestigo } from '@/types/rhCiclo';
import { fromApiDateString, toApiDateString } from '@/utils/dates';
import { getActionErrorMessage, getFieldError, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

const PASOS = ['Datos', 'Hechos', 'Personas'];

/**
 * Crear (`POST /rh/colaboradores/{id}/actas`) o editar un BORRADOR
 * (`PATCH /rh/actas/{id}`, que prohíbe cambiar el tipo). Stepper de 3 pasos
 * para no presentar un formulario gigante. El usuario captura HECHOS; el
 * texto jurídico lo aporta la plantilla del tipo de acta.
 */
export default function RhEditarActaScreen() {
  const { colaboradorId, nombre, actaId } = useLocalSearchParams<{ colaboradorId?: string; nombre?: string; actaId?: string }>();
  const existente = useRhActa(actaId);

  return (
    <Screen title={actaId ? 'Editar acta' : 'Nueva acta'} subtitle={nombre ?? existente.data?.colaborador?.nombre} isLoading={!!actaId && existente.isLoading} error={existente.error}>
      {!actaId || existente.data ? <ActaForm key={existente.data?.id ?? 'nueva'} acta={existente.data ?? null} actaId={actaId} colaboradorId={colaboradorId} /> : null}
    </Screen>
  );
}

function ActaForm({ acta, actaId, colaboradorId }: { acta: Acta | null; actaId?: string; colaboradorId?: string }) {
  const router = useRouter();
  const guardar = useRhGuardarActa();
  const { isOffline } = useNetworkStatus();

  const [paso, setPaso] = useState(0);
  const [tipo, setTipo] = useState<string>(acta?.tipo ?? 'administrativa');
  const [fecha, setFecha] = useState<Date | undefined>(acta ? fromApiDateString(acta.fecha) : new Date());
  const [hora, setHora] = useState(acta?.hora ? acta.hora.slice(0, 5) : '');
  const [lugar, setLugar] = useState(acta?.lugar ?? '');
  const [hechos, setHechos] = useState(acta?.hechos ?? '');
  const [testigos, setTestigos] = useState<ActaTestigo[]>(acta?.testigos ?? []);
  const [declaraciones, setDeclaraciones] = useState<ActaDeclaracion[]>(acta?.declaraciones ?? []);

  const horaValida = hora === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
  const pasoValido = paso === 0 ? !!fecha && horaValida : paso === 1 ? hechos.trim().length > 0 : true;

  const enviar = () => {
    if (!fecha) return;
    guardar.mutate(
      {
        actaId: actaId ? Number(actaId) : undefined,
        colaboradorId,
        payload: {
          tipo: actaId ? undefined : tipo,
          fecha: toApiDateString(fecha),
          hora: hora || null,
          lugar: lugar.trim() || null,
          hechos: hechos.trim(),
          testigos: testigos.filter((t) => t.nombre.trim()),
          declaraciones: declaraciones.filter((d) => d.persona.trim() && d.declaracion.trim()),
        },
      },
      {
        onSuccess: (acta) => {
          haptics.success();
          toast.success(actaId ? 'Borrador actualizado.' : 'Acta creada como borrador.');
          router.replace(`/(app)/rh/actas/${acta.id}` as never);
        },
        onError: (error) => {
          logError('rhActa.guardar', error);
          haptics.error();
          toast.error(getActionErrorMessage(error));
        },
      },
    );
  };

  return (
    <>
      <Stepper steps={PASOS} currentIndex={paso} />

      {paso === 0 ? (
        <Card style={styles.gap}>
          <SectionTitle>Datos del acta</SectionTitle>
          {actaId ? (
            <Text style={styles.muted}>Tipo: {TIPOS_ACTA.find((t) => t.value === tipo)?.label ?? tipo} (no se puede cambiar)</Text>
          ) : (
            <View style={styles.chips}>
              <FilterChips options={TIPOS_ACTA} value={tipo} onChange={setTipo} />
            </View>
          )}
          <DateField label="Fecha de los hechos" value={fecha} onChange={setFecha} error={getFieldError(guardar.error, 'fecha')} />
          <Field label="Hora (HH:MM, opcional)" value={hora} onChangeText={setHora} placeholder="09:30" maxLength={5} keyboardType="numbers-and-punctuation" error={!horaValida ? 'Usa el formato HH:MM.' : getFieldError(guardar.error, 'hora')} />
          <Field label="Lugar (opcional)" value={lugar} onChangeText={setLugar} maxLength={255} />
        </Card>
      ) : null}

      {paso === 1 ? (
        <Card style={styles.gap}>
          <SectionTitle>Hechos</SectionTitle>
          <Notice tone="info">Describe objetivamente lo ocurrido. El formato legal lo aporta la plantilla cargada por RH/Jurídico.</Notice>
          <Field label="Hechos" value={hechos} onChangeText={setHechos} multiline maxLength={20000} style={styles.hechos} error={getFieldError(guardar.error, 'hechos')} />
        </Card>
      ) : null}

      {paso === 2 ? (
        <>
          <Card style={styles.gap}>
            <SectionTitle>Testigos (máx. 5)</SectionTitle>
            {testigos.map((t, i) => (
              <View key={i} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>Testigo {i + 1}</Text>
                  <RemoveButton label={`Quitar testigo ${i + 1}`} onPress={() => setTestigos((prev) => prev.filter((_, idx) => idx !== i))} />
                </View>
                <Field label="Nombre" value={t.nombre} onChangeText={(v) => setTestigos((prev) => prev.map((x, idx) => (idx === i ? { ...x, nombre: v } : x)))} maxLength={160} />
                <Field label="Puesto (opcional)" value={t.puesto ?? ''} onChangeText={(v) => setTestigos((prev) => prev.map((x, idx) => (idx === i ? { ...x, puesto: v } : x)))} maxLength={120} />
              </View>
            ))}
            {testigos.length < 5 ? <Button title="Agregar testigo" variant="ghost" leftIcon="add-circle-outline" onPress={() => setTestigos((prev) => [...prev, { nombre: '', puesto: '' }])} /> : null}
          </Card>
          <Card style={styles.gap}>
            <SectionTitle>Declaraciones</SectionTitle>
            {declaraciones.map((d, i) => (
              <View key={i} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>Declaración {i + 1}</Text>
                  <RemoveButton label={`Quitar declaración ${i + 1}`} onPress={() => setDeclaraciones((prev) => prev.filter((_, idx) => idx !== i))} />
                </View>
                <Field label="Persona" value={d.persona} onChangeText={(v) => setDeclaraciones((prev) => prev.map((x, idx) => (idx === i ? { ...x, persona: v } : x)))} maxLength={160} />
                <Field
                  label="Declaración"
                  value={d.declaracion}
                  multiline
                  onChangeText={(v) => setDeclaraciones((prev) => prev.map((x, idx) => (idx === i ? { ...x, declaracion: v } : x)))}
                  maxLength={5000}
                />
              </View>
            ))}
            {declaraciones.length < 20 ? (
              <Button title="Agregar declaración" variant="ghost" leftIcon="add-circle-outline" onPress={() => setDeclaraciones((prev) => [...prev, { persona: '', declaracion: '' }])} />
            ) : null}
          </Card>
        </>
      ) : null}

      {isOffline ? <Notice tone="warning">Sin conexión: guardar requiere confirmación del servidor.</Notice> : null}
      <View style={styles.actions}>
        {paso > 0 ? <Button title="Atrás" variant="outline" onPress={() => setPaso((p) => p - 1)} style={styles.flex} /> : null}
        {paso < PASOS.length - 1 ? (
          <Button title="Siguiente" disabled={!pasoValido} onPress={() => setPaso((p) => p + 1)} style={styles.flex} />
        ) : (
          <Button title={actaId ? 'Guardar cambios' : 'Crear borrador'} disabled={!fecha || !hechos.trim() || !horaValida || isOffline} loading={guardar.isPending} onPress={enviar} style={styles.flex} />
        )}
      </View>
    </>
  );
}

function RemoveButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10}>
      <Ionicons name="trash-outline" size={20} color={Colors.danger} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: Spacing.md,
  },
  chips: {
    marginHorizontal: -Spacing.lg,
  },
  muted: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  hechos: {
    minHeight: 200,
  },
  item: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
