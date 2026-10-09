import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FontSize, LoginColors, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';
import { REMEMBERED_USERNAME_KEY } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage, logError } from '@/utils/errors';

// Se entra con el USUARIO (primer nombre + primer apellido), no con el correo.
const loginSchema = z.object({
  username: z.string().trim().min(1, 'Ingresa tu usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Login: la ÚNICA pantalla oscura de la app, por diseño (petróleo profundo,
 * oro y crema, como el login web). No depende del modo del sistema: el
 * resto de la app es solo claro. La tarjeta del formulario se mantiene
 * clara para que los campos se lean igual que en el resto de la app.
 */
export default function LoginScreen() {
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  // Recuerda solo el usuario (nunca la contraseña) para no tener que
  // volver a escribirlo cada vez que se cierra sesión.
  useEffect(() => {
    SecureStore.getItemAsync(REMEMBERED_USERNAME_KEY)
      .then((saved) => {
        if (saved) setValue('username', saved);
      })
      .catch(() => {});
  }, [setValue]);

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    const username = values.username.trim().replace(/\s+/g, ' ');
    try {
      await login(username, values.password);
      void SecureStore.setItemAsync(REMEMBERED_USERNAME_KEY, username).catch(() => {});
    } catch (error) {
      logError('login', error);
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Image
                source={require('@/assets/images/brand/logo-mark.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <Text style={styles.brandTitle}>MR. LANA</Text>
            <Text style={styles.brandSubtitle}>PEOPLE</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.heading}>Bienvenido</Text>
            <Text style={styles.subheading}>Inicia sesión con tu cuenta de colaborador</Text>

            <Controller
              control={control}
              name="username"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Usuario"
                  placeholder="Nombre Apellido"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.username?.message}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  returnKeyType="next"
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Contraseña"
                  placeholder="••••••••"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry
                  secureToggle
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Button
              title="Ingresar"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitButton}
            />
          </View>

          <View style={styles.qrBlock}>
            <View style={styles.qrDivider}>
              <View style={styles.qrDividerLine} />
              <Text style={styles.qrDividerText}>o</Text>
              <View style={styles.qrDividerLine} />
            </View>
            <Text style={styles.qrTitle}>¿Aún no tienes cuenta?</Text>
            <Text style={styles.qrSubtitle}>
              Si Recursos Humanos ya te entregó un código QR, escanéalo para comenzar tu registro.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Escanear código QR de incorporación"
              onPress={() => router.push('/(auth)/escanear-qr')}
              style={({ pressed }) => [styles.qrButton, pressed && styles.qrButtonPressed]}>
              <Ionicons name="qr-code-outline" size={20} color={LoginColors.cream} />
              <Text style={styles.qrButtonText}>Escanear código QR</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LoginColors.background,
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
    gap: Spacing.xs / 2,
  },
  logoBadge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: LoginColors.gold,
    marginBottom: Spacing.md,
  },
  logo: {
    width: 72,
    height: 72,
  },
  brandTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: LoginColors.text,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: LoginColors.gold,
    letterSpacing: 6,
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: LoginColors.divider,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  heading: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  subheading: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: -Spacing.md,
  },
  formError: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  qrBlock: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  qrDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
    marginBottom: Spacing.xs,
  },
  qrDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: LoginColors.divider,
  },
  qrDividerText: {
    fontSize: FontSize.xs,
    color: LoginColors.textMuted,
    fontWeight: '700',
  },
  qrTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: LoginColors.text,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: FontSize.sm,
    color: LoginColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: LoginColors.gold,
    backgroundColor: LoginColors.qrBackground,
    marginTop: Spacing.xs,
  },
  qrButtonPressed: {
    opacity: 0.85,
  },
  qrButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: LoginColors.cream,
  },
});
