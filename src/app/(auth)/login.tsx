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
import { FontSize, Layout, Radius, Shadow, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
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
 * Login: pantalla CLARA/CREMA, alineada con el resto de la app (la app no
 * tiene modo oscuro). Fondo crema cálido con acentos de marca (petróleo y
 * oro), branding arriba y la tarjeta del formulario sobre `surface`.
 *
 * Nota de convención (2026-10-15): el login dejó de ser la pantalla oscura
 * de la app. Ahora es claro, como todo lo demás. La constante `LoginColors`
 * (petróleo profundo) quedó como legacy — ya no se usa aquí.
 */
export default function LoginScreen() {
  const Colors = useColores();
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
      <StatusBar style="dark" />
      {/* Formas decorativas suaves (sin degradado: expo-linear-gradient no está instalado). */}
      <View style={styles.decorTop} pointerEvents="none" />
      <View style={styles.decorBottom} pointerEvents="none" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.contentWrapper}>
            <View style={styles.brand}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('@/assets/images/brand/logo-mark.png')}
                  style={styles.logo}
                  contentFit="contain"
                />
              </View>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandTitle}>MR. LANA</Text>
                <Text style={styles.brandTitleAccent}>PEOPLE</Text>
              </View>
              <Text style={styles.brandTagline}>Tu portal de Recursos Humanos</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.heading}>Bienvenido de nuevo</Text>
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
                <Ionicons name="qr-code-outline" size={20} color={Colors.primaryDark} />
                <Text style={styles.qrButtonText}>Escanear código QR</Text>
              </Pressable>
            </View>
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
      backgroundColor: Colors.background,
    },
    flex: {
      flex: 1,
    },
    // Blob menta en la esquina superior: da profundidad sin degradado.
    decorTop: {
      position: 'absolute',
      top: -140,
      right: -110,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: Colors.primarySoft,
    },
    // Blob crema/oro en la esquina inferior.
    decorBottom: {
      position: 'absolute',
      bottom: -150,
      left: -120,
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: Colors.secondarySoft,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    contentWrapper: {
      width: '100%',
      maxWidth: Layout.maxFormWidth,
      alignSelf: 'center',
      gap: Spacing.xxl,
    },
    brand: {
      alignItems: 'center',
      gap: Spacing.sm,
    },
    logoBadge: {
      width: 104,
      height: 104,
      borderRadius: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.surface,
      borderWidth: 2,
      borderColor: Colors.secondary,
      marginBottom: Spacing.sm,
      ...Shadow.md,
    },
    logo: {
      width: 72,
      height: 72,
    },
    brandTitleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: Spacing.sm,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    brandTitle: {
      fontSize: FontSize.xxxl,
      fontWeight: '800',
      color: Colors.primaryDark,
      letterSpacing: 1,
    },
    brandTitleAccent: {
      fontSize: FontSize.xxl,
      fontWeight: '800',
      color: Colors.secondary,
      letterSpacing: 4,
    },
    brandTagline: {
      fontSize: FontSize.md,
      color: Colors.textMuted,
      textAlign: 'center',
    },
    form: {
      backgroundColor: Colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.xl,
      gap: Spacing.lg,
      ...Shadow.md,
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
      backgroundColor: Colors.border,
    },
    qrDividerText: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
      fontWeight: '700',
    },
    qrTitle: {
      fontSize: FontSize.md,
      fontWeight: '800',
      color: Colors.text,
      textAlign: 'center',
    },
    qrSubtitle: {
      fontSize: FontSize.sm,
      color: Colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    qrButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      alignSelf: 'stretch',
      minHeight: Layout.minTouchTarget,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: Colors.secondary,
      backgroundColor: Colors.secondarySoft,
      marginTop: Spacing.xs,
    },
    qrButtonPressed: {
      opacity: 0.85,
    },
    qrButtonText: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: Colors.primaryDark,
    },
  });
