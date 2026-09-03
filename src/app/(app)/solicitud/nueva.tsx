import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { solicitudesApi } from '@/api/solicitudes';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import type { RequestType } from '@/types/request';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';
import { humanizeRequestType } from '@/utils/formatters';

const REQUEST_TYPES: RequestType[] = [
  'permiso_con_goce',
  'permiso_sin_goce',
  'incapacidad',
  'constancia_laboral',
  'actualizacion_datos',
  'actualizacion_bancaria',
  'reposicion_documental',
  'prestamo_interno',
  'general',
];

const schema = z.object({
  tipo: z.string().min(1, 'Selecciona un tipo de solicitud'),
  motivo: z.string().trim().min(1, 'Describe brevemente tu solicitud').max(2000, 'Máximo 2000 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export default function NuevaSolicitudScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: '', motivo: '' },
  });

  const selectedTipo = useWatch({ control, name: 'tipo' });

  const submit = async (values: FormValues) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const solicitud = await solicitudesApi.create({
        tipo: values.tipo as RequestType,
        motivo: values.motivo.trim(),
      });
      router.replace({ pathname: '/solicitud/[id]', params: { id: String(solicitud.id) } });
    } catch (error) {
      logError('solicitudes.create', error);
      const validation = getValidationErrors(error);
      const firstValidationMessage = validation ? Object.values(validation)[0]?.[0] : undefined;
      setFormError(firstValidationMessage ?? getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (values: FormValues) => {
    Alert.alert('Confirmar envío', '¿Deseas enviar esta solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar', onPress: () => void submit(values) },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Nueva solicitud" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tipo de solicitud</Text>
        <View style={styles.typeGrid}>
          {REQUEST_TYPES.map((tipo) => {
            const active = selectedTipo === tipo;
            return (
              <Pressable
                key={tipo}
                onPress={() => setValue('tipo', tipo, { shouldValidate: true })}
                style={[styles.typeChip, active && styles.typeChipActive]}>
                <Text style={[styles.typeChipLabel, active && styles.typeChipLabelActive]}>
                  {humanizeRequestType(tipo)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.tipo ? <Text style={styles.formError}>{errors.tipo.message}</Text> : null}

        <Controller
          control={control}
          name="motivo"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Motivo"
              placeholder="Cuéntanos el detalle de tu solicitud"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.motivo?.message}
              multiline
              style={styles.multilineInput}
            />
          )}
        />

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Button title="Enviar solicitud" onPress={handleSubmit(onSubmit)} loading={submitting} disabled={submitting} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text,
  },
  typeChipLabelActive: {
    color: Colors.white,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  formError: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: '600',
  },
});
