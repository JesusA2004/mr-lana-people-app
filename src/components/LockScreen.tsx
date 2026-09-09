import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from './Button';
import { PressableScale } from './PressableScale';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { authenticateWithBiometricsAsync, biometricLabel, getBiometricCapabilityAsync, type BiometricKind } from '@/services/biometricAuth';
import { useAppLockStore } from '@/store/appLockStore';
import { useAuthStore } from '@/store/authStore';
import { useBiometricStore } from '@/store/biometricStore';
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
 * Auto-lock (V4 sección 33): tras `AUTO_LOCK_MINUTES` en background, se
 * exige reautenticación antes de volver a ver cualquier dato — sin cerrar
 * la sesión (el token sigue siendo válido). Si el colaborador activó
 * biometría (Configuración → Seguridad), se intenta primero automáticamente
 * al mostrarse; si falla, se cancela, o no está activada, cae al formulario
 * de contraseña (`authStore.login()` reconfirma la contraseña real y de
 * paso refresca el token). Nunca deja al usuario atrapado sin salida (V4
 * sección 118): contraseña y "Cerrar sesión" siempre están disponibles.
 */
export function LockScreen({ visible }: LockScreenProps) {
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const unlock = useAppLockStore((state) => state.unlock);
  const biometricEnabled = useBiometricStore((state) => state.enabled);

  const [formError, setFormError] = useState<string | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricKind | null>(null);
  const attemptedRef = useRef(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UnlockFormValues>({
    resolver: zodResolver(unlockSchema),
    defaultValues: { password: '' },
  });

  const tryBiometric = async () => {
    setBiometricBusy(true);
    const result = await authenticateWithBiometricsAsync('Desbloquea MR. LANA PEOPLE');
    setBiometricBusy(false);
    if (result.success) {
      haptics.success();
      unlock();
    }
    // Si falla/cancela: se queda en esta misma pantalla con el formulario de contraseña ya visible — nunca atrapado.
  };

  useEffect(() => {
    if (!visible) {
      attemptedRef.current = false;
      return;
    }
    if (!biometricEnabled || attemptedRef.current) return;
    attemptedRef.current = true;

    void getBiometricCapabilityAsync().then((capability) => {
      setBiometricType(capability.primaryType);
      if (capability.hasHardware && capability.isEnrolled) void tryBiometric();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reintentar cuando `visible` cambia a true, no en cada render.
  }, [visible, biometricEnabled]);

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

            {biometricEnabled ? (
              <PressableScale onPress={() => void tryBiometric()} disabled={biometricBusy} style={styles.biometricButton}>
                <Ionicons name="finger-print-outline" size={22} color={Colors.primaryDark} />
                <Text style={styles.biometricText}>{biometricBusy ? 'Verificando…' : `Usar ${biometricLabel(biometricType)}`}</Text>
              </PressableScale>
            ) : null}

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
    gap: Spacing.lg,
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignSelf: 'center',
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  biometricText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primaryDark,
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
