import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { incorporacionInvitacionApi } from '@/api/incorporacionInvitacion';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { Input } from '@/components/Input';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import type { InvitacionValida } from '@/types/invitation';
import { getErrorMessage, getValidationErrors, logError } from '@/utils/errors';

const registroSchema = z
  .object({
    name: z.string().min(1, 'Ingresa tu nombre'),
    apellidos: z.string().optional(),
    email: z.string().min(1, 'Ingresa tu correo electrónico').email('Ingresa un correo electrónico válido'),
    telefono: z.string().optional(),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    passwordConfirmation: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'],
  });

type RegistroFormValues = z.infer<typeof registroSchema>;

const MOTIVO_MENSAJE: Record<string, string> = {
  invalido: 'Este código QR no es válido. Pide a Recursos Humanos que te comparta uno nuevo.',
  vencido: 'El código QR venció. Solicita a Recursos Humanos que genere uno nuevo.',
  revocado: 'Este código QR fue revocado. Contacta a Recursos Humanos.',
  usado: 'Este código QR ya fue utilizado. Solicita uno nuevo a Recursos Humanos.',
  correo_no_coincide: 'El correo no coincide con la invitación. Verifica el correo que te compartió Recursos Humanos.',
};

/**
 * Deep link `mrlanapeopleapp://incorporacion/qr/{token}` (esquema real
 * configurado en app.json — el QR que genera RH hoy codifica la liga web
 * universal `{APP_URL}/incorporacion/qr/{token}`, ver
 * capacitaciones/docs/API_MOVIL.md, "Registro por QR temporal"; para que
 * ese enlace abra la app directamente hace falta además configurar
 * Universal Links/App Links sobre el dominio de producción, fuera del
 * alcance de este cambio — ver ENTREGA). Pantalla pública, fuera de
 * `(auth)`/`(app)`: valida el token contra la API pública (sin Bearer
 * token, el token del QR es la única puerta de entrada) y, si es válido,
 * completa el registro y entra directo a la incorporación documental.
 */
export default function IncorporacionQrScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const loginWithToken = useAuthStore((state) => state.loginWithToken);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invitacion, setInvitacion] = useState<InvitacionValida | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await incorporacionInvitacionApi.validar(token);
        if (cancelled) return;
        if (response.valida) {
          setInvitacion(response);
        } else {
          setInvalidReason(MOTIVO_MENSAJE[response.estado] ?? response.message);
        }
      } catch (error) {
        if (cancelled) return;
        logError('incorporacionInvitacion.validar', error);
        setLoadError(getErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, retryTick]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroFormValues>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      name: invitacion?.datos_prellenados?.nombre ?? '',
      apellidos: '',
      email: invitacion?.datos_prellenados?.email ?? '',
      telefono: invitacion?.datos_prellenados?.telefono ?? '',
      password: '',
      passwordConfirmation: '',
    },
    values: invitacion
      ? {
          name: invitacion.datos_prellenados?.nombre ?? '',
          apellidos: '',
          email: invitacion.datos_prellenados?.email ?? '',
          telefono: invitacion.datos_prellenados?.telefono ?? '',
          password: '',
          passwordConfirmation: '',
        }
      : undefined,
  });

  const onSubmit = async (values: RegistroFormValues) => {
    if (!token) return;
    setFormError(null);
    try {
      const response = await incorporacionInvitacionApi.registrar(token, {
        name: values.name.trim(),
        apellidos: values.apellidos?.trim() || undefined,
        email: values.email.trim(),
        password: values.password,
        password_confirmation: values.passwordConfirmation,
        telefono: values.telefono?.trim() || undefined,
      });

      await loginWithToken(response.token, {
        id: response.usuario.id,
        name: response.usuario.name,
        apellidos: response.usuario.apellidos ?? undefined,
        email: response.usuario.email,
        roles: response.usuario.roles,
        permisos: response.usuario.permisos,
      });
      // Sin navegación explícita: igual que login.tsx, el cambio de
      // `isAuthenticated` en authStore hace que RootNavigator (Stack.Protected
      // en _layout.tsx) muestre onboarding o (app) automáticamente.
    } catch (error) {
      logError('incorporacionInvitacion.registrar', error);
      const validation = getValidationErrors(error);
      const firstValidationMessage = validation ? Object.values(validation)[0]?.[0] : undefined;
      setFormError(firstValidationMessage ?? getErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.brandTitle}>MR. LANA</Text>
            <Text style={styles.brandSubtitle}>PEOPLE</Text>
          </View>

          {loading ? (
            <View style={{ gap: Spacing.lg }}>
              <SkeletonBlock height={80} radius={Radius.lg} />
              <SkeletonBlock height={240} radius={Radius.lg} />
            </View>
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={() => setRetryTick((tick) => tick + 1)} />
          ) : invalidReason ? (
            <Card style={styles.invalidCard}>
              <Text style={styles.invalidTitle}>No podemos continuar</Text>
              <Text style={styles.invalidText}>{invalidReason}</Text>
              <Button title="Ir a inicio de sesión" variant="outline" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: Spacing.md }} />
            </Card>
          ) : invitacion ? (
            <View style={styles.form}>
              <Text style={styles.heading}>Completa tu registro</Text>
              <Text style={styles.subheading}>
                {[invitacion.datos_prellenados?.puesto, invitacion.datos_prellenados?.sucursal].filter(Boolean).join(' · ') ||
                  'Recursos Humanos te invitó a unirte a MR. LANA.'}
              </Text>

              {invitacion.fases.length > 0 ? (
                <View style={styles.fasesRow}>
                  {invitacion.fases
                    .slice()
                    .sort((a, b) => a.orden - b.orden)
                    .map((fase) => (
                      <View key={fase.clave} style={styles.faseChip}>
                        <Text style={styles.faseChipText}>{fase.nombre}</Text>
                      </View>
                    ))}
                </View>
              ) : null}

              <Controller
                control={control}
                name="name"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input label="Nombre" placeholder="Tu nombre" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
                )}
              />
              <Controller
                control={control}
                name="apellidos"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input label="Apellidos" placeholder="Tus apellidos" value={value} onChangeText={onChange} onBlur={onBlur} />
                )}
              />
              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="Correo electrónico"
                    placeholder="tucorreo@ejemplo.com"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              <Controller
                control={control}
                name="telefono"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input label="Teléfono" placeholder="Opcional" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="Contraseña"
                    placeholder="Mínimo 8 caracteres"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    secureTextEntry
                    secureToggle
                    autoCapitalize="none"
                  />
                )}
              />
              <Controller
                control={control}
                name="passwordConfirmation"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    label="Confirmar contraseña"
                    placeholder="Repite tu contraseña"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.passwordConfirmation?.message}
                    secureTextEntry
                    secureToggle
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              <Button title="Crear mi cuenta" onPress={handleSubmit(onSubmit)} loading={isSubmitting} disabled={isSubmitting} />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
    gap: Spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  brandTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 6,
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
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
  fasesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  faseChip: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  faseChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  formError: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontWeight: '600',
    textAlign: 'center',
  },
  invalidCard: {
    gap: Spacing.sm,
  },
  invalidTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  invalidText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
