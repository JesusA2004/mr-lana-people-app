import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from './Button';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useAppLockStore } from '@/store/appLockStore';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

const unlockSchema = z.object({
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

type UnlockFormValues = z.infer<typeof unlockSchema>;

export interface LockScreenProps {
  visible: boolean;
}

/**
 * Auto-lock (AGENTS.md V3 sección 46): tras `AUTO_LOCK_MINUTES` en
 * background, se exige contraseña de nuevo antes de volver a ver cualquier
 * dato — sin cerrar la sesión. Reutiliza `authStore.login()` con el correo
 * ya conocido: si la contraseña es correcta, refresca el token (Sanctum
 * emite uno nuevo) y desbloquea; si falla, se queda en esta pantalla. No
 * usa biometría todavía — ver recomendación de `expo-local-authentication`
 * en el reporte de entrega.
 */
export function LockScreen({ visible }: LockScreenProps) {
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const unlock = useAppLockStore((state) => state.unlock);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockSchema),
    defaultValues: { password: '' },
  });

  if (!visible) return null;

  const email = user?.correo ?? user?.email ?? '';
  const nombre = user?.nombre ?? user?.name;

  const onSubmit = async (values: UnlockFormValues) => {
    setFormError(null);
    try {
      await login(email, values.password);
      haptics.success();
      unlock();
      reset();
    } catch (error) {
      logError('LockScreen.unlock', error);
      haptics.error();
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <Image source={require('@/assets/images/brand/logo-mark.png')} style={styles.logo} contentFit="contain" />
              <Text style={styles.lockedTitle}>Sesión protegida</Text>
              <Text style={styles.lockedSubtitle}>{nombre ? `Hola de nuevo, ${nombre}` : 'Ingresa tu contraseña para continuar'}</Text>
            </View>

            <View style={styles.form}>
              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange, onBlur } }) => (
                  <View style={styles.field}>
                    <Text style={styles.label}>Contraseña</Text>
                    <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onSubmitEditing={handleSubmit(onSubmit)}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="password"
                        textContentType="password"
                        returnKeyType="done"
                        placeholder="••••••••"
                        placeholderTextColor={Colors.textMuted}
                        style={styles.textInput}
                      />
                    </View>
                    {errors.password ? <Text style={styles.errorText}>{errors.password.message}</Text> : null}
                  </View>
                )}
              />

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Button title="Desbloquear" onPress={handleSubmit(onSubmit)} loading={isSubmitting} disabled={isSubmitting} />
              <Button title="Cerrar sesión" variant="ghost" onPress={() => void logout()} disabled={isSubmitting} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    zIndex: 1000,
    elevation: 1000,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: 4,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: Spacing.sm,
  },
  lockedTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  lockedSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  inputWrapperError: {
    borderColor: Colors.danger,
  },
  textInput: {
    minHeight: 52,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: '600',
  },
  formError: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontWeight: '600',
    textAlign: 'center',
  },
});
