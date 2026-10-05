import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useEstilos } from '@/theme/ThemeProvider';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';

/**
 * Primer inicio de sesión con contraseña TEMPORAL (la que RH generó con
 * «Generar credenciales»): única pantalla disponible hasta definir una
 * contraseña personal. El backend responde 403 «cambio_contrasena_requerido»
 * a todo lo demás mientras tanto (docs/AUTENTICACION.md). Al guardar,
 * RootNavigator libera la app sola.
 */
const esquema = z
  .object({
    actual: z.string().min(1, 'Escribe la contraseña temporal que te dio RH'),
    nueva: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmacion: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((d) => d.nueva === d.confirmacion, { message: 'Las contraseñas no coinciden', path: ['confirmacion'] })
  .refine((d) => d.nueva.trim() !== d.actual.trim(), { message: 'Debe ser distinta de la temporal', path: ['nueva'] });

type Valores = z.infer<typeof esquema>;

export default function CambiarContrasenaScreen() {
  const styles = useEstilos(crearEstilos);
  const user = useAuthStore((state) => state.user);
  const cambiarContrasena = useAuthStore((state) => state.cambiarContrasena);
  const logout = useAuthStore((state) => state.logout);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { actual: '', nueva: '', confirmacion: '' } });

  const onSubmit = async (v: Valores) => {
    setFormError(null);
    try {
      await cambiarContrasena(v.actual, v.nueva, v.confirmacion);
    } catch (error) {
      logError('cambiarContrasena', error);
      const validacion = getValidationErrors(error);
      setFormError((validacion ? Object.values(validacion)[0]?.[0] : undefined) ?? getErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <Text style={styles.heading}>Crea tu contraseña</Text>
            <Text style={styles.subheading}>
              Entraste con una contraseña temporal{user?.username ? ` (usuario: ${user.username})` : ''}. Antes de continuar, define una contraseña
              personal.
            </Text>

            <Controller
              control={control}
              name="actual"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input label="Contraseña temporal" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.actual?.message} secureTextEntry secureToggle autoCapitalize="none" autoCorrect={false} />
              )}
            />
            <Controller
              control={control}
              name="nueva"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input label="Nueva contraseña" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.nueva?.message} secureTextEntry secureToggle autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" />
              )}
            />
            <Controller
              control={control}
              name="confirmacion"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Confirmar contraseña"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmacion?.message}
                  secureTextEntry
                  secureToggle
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Button title="Guardar y continuar" onPress={handleSubmit(onSubmit)} loading={isSubmitting} disabled={isSubmitting} />
            <Button title="Cerrar sesión" variant="outline" onPress={() => void logout()} disabled={isSubmitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.background },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
    form: {
      backgroundColor: Colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.xl,
      gap: Spacing.lg,
    },
    heading: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
    subheading: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: -Spacing.md, lineHeight: 20 },
    formError: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600', textAlign: 'center' },
  });
