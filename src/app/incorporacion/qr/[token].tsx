import { zodResolver } from '@hookform/resolvers/zod';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { incorporacionInvitacionApi } from '@/api/incorporacionInvitacion';
import { BarraAccionInferior } from '@/components/BarraAccionInferior';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { FormularioScroll } from '@/components/FormularioScroll';
import { Input } from '@/components/Input';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import { REMEMBERED_USERNAME_KEY } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';
import type { InvitacionValida } from '@/types/invitation';
import { getErrorMessage, getValidationErrors, logError, normalizeError } from '@/utils/errors';

const PARTICULAS = ['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa'];

/**
 * Usuario PROBABLE (primer nombre + primer apellido, sin acentos) solo para
 * prellenar el login si se perdió la conexión al registrarse. El definitivo
 * lo asigna el backend (puede llevar sufijo 2, 3… si se repite).
 */
function usuarioProbable(nombre: string, apellidos?: string): string {
  const limpiar = (t: string) =>
    t
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  const titulo = (p: string, i: number) => (i > 0 && PARTICULAS.includes(p.toLowerCase()) ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
  const paterno: string[] = [];

  for (const palabra of limpiar(apellidos ?? '')) {
    paterno.push(palabra);
    if (!PARTICULAS.includes(palabra.toLowerCase())) break;
  }

  return [limpiar(nombre).slice(0, 1).map(titulo).join(' '), paterno.map(titulo).join(' ')].filter(Boolean).join(' ');
}

const registroSchema = z
  .object({
    name: z.string().min(1, 'Ingresa tu nombre'),
    apellidos: z.string().optional(),
    // Opcional: se inicia sesión con el usuario, no con el correo.
    email: z.union([z.literal(''), z.string().trim().email('Ingresa un correo electrónico válido')]).optional(),
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
/** Lo que sigue después de crear la cuenta (el registro completo, `src/app/registro.tsx`). */
const LO_QUE_SIGUE: { icono: keyof typeof Ionicons.glyphMap; texto: string }[] = [
  { icono: 'person-outline', texto: 'Tus datos personales (CURP, RFC, NSS…)' },
  { icono: 'home-outline', texto: 'Tu domicilio y contacto de emergencia' },
  { icono: 'documents-outline', texto: 'Tus documentos, con foto o archivo' },
];

export default function IncorporacionQrScreen() {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const [alturaBarra, setAlturaBarra] = useState(0);
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const loginWithToken = useAuthStore((state) => state.loginWithToken);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invitacion, setInvitacion] = useState<InvitacionValida | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  /**
   * Caso crítico (auditoría de integración — "INCORPORACIÓN QR"): si
   * `POST registrar` sí creó la cuenta en el backend pero la respuesta se
   * perdió por la red antes de llegar al teléfono, la app no puede saber
   * si la cuenta existe o no. Reintentar el mismo formulario normalmente
   * fallaría (el token de invitación ya quedó "usado" del lado del
   * backend) y dejaría a la persona en un loop confuso — en vez de eso, un
   * error DE RED (nunca un 422/409 real, esos sí significan que el
   * backend respondió y el registro falló de verdad) durante el envío
   * muestra una recuperación explícita: intentar iniciar sesión con lo que
   * ya capturó, en vez de insistir en crear otra cuenta.
   */
  const [registrationAmbiguous, setRegistrationAmbiguous] = useState<{ usuario: string } | null>(null);

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
    setRegistrationAmbiguous(null);
    let requestSent = false;
    try {
      requestSent = true;
      const response = await incorporacionInvitacionApi.registrar(token, {
        name: values.name.trim(),
        apellidos: values.apellidos?.trim() || undefined,
        email: values.email?.trim() || undefined,
        password: values.password,
        password_confirmation: values.passwordConfirmation,
        telefono: values.telefono?.trim() || undefined,
      });

      const usuario = response.usuario.username;
      if (usuario) {
        void SecureStore.setItemAsync(REMEMBERED_USERNAME_KEY, usuario).catch(() => {});
      }

      await loginWithToken(response.token, {
        id: response.usuario.id,
        username: usuario,
        name: response.usuario.name,
        nombre: response.usuario.name,
        apellidos: response.usuario.apellidos ?? undefined,
        email: response.usuario.email ?? null,
        correo: response.usuario.email ?? null,
        roles: response.usuario.roles,
        permisos: response.usuario.permisos,
        // false → el enrutador raíz muestra el registro completo (datos +
        // documentos) antes de dejarlo entrar. Backend anterior: ausente.
        registro_completo: response.usuario.registro_completo,
      });

      // Para las siguientes veces: se entra con el usuario, no con el correo.
      if (usuario) {
        Alert.alert('Tu usuario', `Para iniciar sesión usa tu usuario «${usuario}» y la contraseña que acabas de crear.`);
      }
      // El cambio de `isAuthenticated`/`registro_completo` en authStore hace
      // que RootNavigator (Stack.Protected en _layout.tsx) muestre el
      // registro completo, onboarding o (app); con registro pendiente se
      // navega explícito porque esta pantalla pública no está protegida.
      if (response.usuario.registro_completo === false) {
        router.replace('/registro');
      }
    } catch (error) {
      logError('incorporacionInvitacion.registrar', error);
      const { isNetworkError } = normalizeError(error);

      // Solo un error DE RED (la petición nunca obtuvo respuesta) es
      // ambiguo — un 422/409/etc. real significa que el backend sí
      // respondió y el registro de verdad no se completó, ahí el mensaje
      // normal de validación sigue siendo correcto.
      if (requestSent && isNetworkError) {
        setRegistrationAmbiguous({ usuario: usuarioProbable(values.name, values.apellidos) });
        return;
      }

      const validation = getValidationErrors(error);
      const firstValidationMessage = validation ? Object.values(validation)[0]?.[0] : undefined;
      setFormError(firstValidationMessage ?? getErrorMessage(error));
    }
  };

  const mostrarFormulario = Boolean(invitacion) && !invalidReason && !registrationAmbiguous && !loading && !loadError;
  const primerNombre = invitacion?.datos_prellenados?.nombre?.trim().split(/\s+/)[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FormularioScroll alturaBarra={mostrarFormulario ? alturaBarra : 0} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contenido}>
          <View style={styles.brand}>
            <BrandLogo width={230} />
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
              <Ionicons name="qr-code-outline" size={32} color={Colors.warning} />
              <Text style={styles.invalidTitle}>No podemos continuar</Text>
              <Text style={styles.invalidText}>{invalidReason}</Text>
              <Button title="Ir a inicio de sesión" variant="outline" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: Spacing.md }} />
            </Card>
          ) : registrationAmbiguous ? (
            <Card style={styles.invalidCard}>
              <Text style={styles.invalidTitle}>Tu registro pudo haberse completado</Text>
              <Text style={styles.invalidText}>
                Perdimos la conexión justo al crear tu cuenta. Es posible que ya haya quedado lista — intenta iniciar sesión con tu usuario
                (primer nombre + primer apellido, probablemente «{registrationAmbiguous.usuario}») antes de registrarte de nuevo.
              </Text>
              <Button
                title="Intentar iniciar sesión"
                onPress={() => {
                  // Reutiliza el "usuario recordado" que ya prellena
                  // login.tsx — no hace falta un param de ruta dedicado.
                  void SecureStore.setItemAsync(REMEMBERED_USERNAME_KEY, registrationAmbiguous.usuario).catch(() => {});
                  router.replace('/(auth)/login');
                }}
                style={{ marginTop: Spacing.md }}
              />
              <Button title="Reintentar registro" variant="outline" onPress={() => setRegistrationAmbiguous(null)} style={{ marginTop: Spacing.sm }} />
            </Card>
          ) : invitacion ? (
            <>
              <View style={styles.bienvenida}>
                <Text style={styles.heading} accessibilityRole="header">
                  {primerNombre ? `¡Bienvenido, ${primerNombre}!` : '¡Bienvenido a Mr. Lana!'}
                </Text>
                <Text style={styles.subheading}>
                  {[invitacion.datos_prellenados?.puesto, invitacion.datos_prellenados?.sucursal].filter(Boolean).join(' · ') ||
                    'Recursos Humanos te invitó a unirte al equipo.'}
                </Text>
              </View>

              <View style={styles.ruta}>
                <Text style={styles.rutaTitulo}>Tu registro, en un solo lugar</Text>
                <View style={styles.rutaPaso}>
                  <View style={[styles.rutaIcono, styles.rutaIconoActivo]}>
                    <Text style={styles.rutaNumero}>1</Text>
                  </View>
                  <Text style={[styles.rutaTexto, styles.rutaTextoActivo]}>Crea tu cuenta (ahora)</Text>
                </View>
                {LO_QUE_SIGUE.map((item, index) => (
                  <View key={item.texto} style={styles.rutaPaso}>
                    <View style={styles.rutaIcono}>
                      <Ionicons name={item.icono} size={16} color={Colors.primaryDark} />
                    </View>
                    <Text style={styles.rutaTexto}>{`${index + 2}. ${item.texto}`}</Text>
                  </View>
                ))}
                <Text style={styles.rutaNota}>Ten a la mano tu INE, CURP, RFC, NSS y comprobante de domicilio. Tu avance se guarda solo.</Text>
              </View>

              <View style={styles.form}>
                <Text style={styles.formTitulo}>Crea tu cuenta</Text>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      label="Nombre(s)"
                      placeholder="Como aparece en tu INE"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.name?.message}
                      autoCapitalize="words"
                      textContentType="givenName"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="apellidos"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input label="Apellidos" placeholder="Paterno y materno" value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="words" textContentType="familyName" />
                  )}
                />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      label="Correo electrónico (opcional)"
                      placeholder="tucorreo@ejemplo.com"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="emailAddress"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="telefono"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      label="Teléfono celular"
                      placeholder="10 dígitos"
                      value={value}
                      onChangeText={(texto) => onChange(texto.replace(/[^0-9]/g, ''))}
                      onBlur={onBlur}
                      keyboardType="phone-pad"
                      maxLength={10}
                      textContentType="telephoneNumber"
                    />
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
                      textContentType="newPassword"
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
              </View>
            </>
          ) : null}
        </View>
      </FormularioScroll>

      {mostrarFormulario ? (
        <BarraAccionInferior onAltura={setAlturaBarra}>
          <Button title="Crear mi cuenta y continuar" rightIcon="chevron-forward" onPress={handleSubmit(onSubmit)} loading={isSubmitting} disabled={isSubmitting} />
        </BarraAccionInferior>
      ) : null}
    </SafeAreaView>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    scrollContent: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xxl,
    },
    contenido: {
      width: '100%',
      maxWidth: Layout.maxFormWidth,
      alignSelf: 'center',
      gap: Spacing.xl,
    },
    brand: {
      alignItems: 'center',
      paddingTop: Spacing.md,
    },
    bienvenida: {
      gap: Spacing.xs,
    },
    heading: {
      fontSize: FontSize.xxl,
      fontWeight: '800',
      color: Colors.text,
    },
    subheading: {
      fontSize: FontSize.md,
      color: Colors.textMuted,
      lineHeight: 21,
    },
    ruta: {
      backgroundColor: Colors.primarySoft,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    rutaTitulo: {
      fontSize: FontSize.md,
      fontWeight: '800',
      color: Colors.primaryDark,
    },
    rutaPaso: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    rutaIcono: {
      width: 32,
      height: 32,
      borderRadius: Radius.full,
      backgroundColor: Colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rutaIconoActivo: {
      backgroundColor: Colors.primary,
    },
    rutaNumero: {
      fontSize: FontSize.sm,
      fontWeight: '800',
      color: Colors.white,
    },
    rutaTexto: {
      flex: 1,
      fontSize: FontSize.sm,
      color: Colors.text,
    },
    rutaTextoActivo: {
      fontWeight: '800',
    },
    rutaNota: {
      fontSize: FontSize.xs,
      color: Colors.textMuted,
      lineHeight: 17,
    },
    form: {
      backgroundColor: Colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.xl,
      gap: Spacing.lg,
    },
    formTitulo: {
      fontSize: FontSize.lg,
      fontWeight: '800',
      color: Colors.text,
    },
    formError: {
      fontSize: FontSize.sm,
      color: Colors.danger,
      fontWeight: '600',
      textAlign: 'center',
    },
    invalidCard: {
      gap: Spacing.sm,
      alignItems: 'flex-start',
    },
    invalidTitle: {
      fontSize: FontSize.lg,
      fontWeight: '800',
      color: Colors.text,
    },
    invalidText: {
      fontSize: FontSize.sm,
      color: Colors.textMuted,
      lineHeight: 19,
    },
  });
