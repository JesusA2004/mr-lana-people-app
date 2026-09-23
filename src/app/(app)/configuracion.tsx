import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PressableScale } from '@/components/PressableScale';
import { ExperienceSwitchCard } from '@/components/ExperienceSwitchCard';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { SHOW_DEV_TOOLS } from '@/constants/config';
import { useMobileBootstrap } from '@/hooks/queries/useMobileBootstrap';
import { authenticateWithBiometricsAsync, biometricLabel, getBiometricCapabilityAsync, type BiometricKind } from '@/services/biometricAuth';
import {
  getPushPermissionStatusAsync,
  openNotificationSettings,
  type PushPermissionSnapshot,
  registerCurrentPushToken,
} from '@/services/pushNotifications';
import { useAuthStore } from '@/store/authStore';
import { useBiometricStore } from '@/store/biometricStore';
import { toast } from '@/store/toastStore';
import { getCurrentAppVersion, getCurrentBuildNumber } from '@/utils/appVersion';
import { canSwitchExperience, experienceAvailability } from '@/utils/experience';
import { joinName } from '@/utils/formatters';

export default function ConfiguracionScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pushSnapshot, setPushSnapshot] = useState<PushPermissionSnapshot | null>(null);

  const [biometricCapable, setBiometricCapable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricKind | null>(null);
  const biometricEnabled = useBiometricStore((state) => state.enabled);
  const setBiometricEnabled = useBiometricStore((state) => state.setEnabled);

  const bootstrap = useMobileBootstrap(true);
  const puedeCambiarExperiencia = canSwitchExperience(experienceAvailability(bootstrap.data?.capabilities, bootstrap.data?.features));

  const nombre = joinName(user?.nombre, user?.apellidos);

  const refreshPushStatus = () => void getPushPermissionStatusAsync().then(setPushSnapshot);

  useEffect(() => {
    refreshPushStatus();
    void getBiometricCapabilityAsync().then((capability) => {
      setBiometricCapable(capability.hasHardware && capability.isEnrolled);
      setBiometricType(capability.primaryType);
    });
  }, []);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
          setLoggingOut(false);
        },
      },
    ]);
  };

  const pushInfo = describePushSnapshot(pushSnapshot);

  const handleActivatePush = async () => {
    // `canAskAgain` (no `status === 'undetermined'`) decide si el sistema
    // todavía puede mostrar su diálogo: en Android el primer chequeo puede
    // llegar `denied` con `canAskAgain: true`.
    await registerCurrentPushToken({ promptIfUndetermined: true });
    refreshPushStatus();
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!value) {
      await setBiometricEnabled(false);
      toast.info('Desactivamos el desbloqueo biométrico.');
      return;
    }
    const result = await authenticateWithBiometricsAsync('Confirma tu identidad para activar el desbloqueo biométrico');
    if (result.success) {
      await setBiometricEnabled(true);
      toast.success('Desbloqueo biométrico activado.');
    } else if (!result.cancelled) {
      toast.error('No pudimos confirmar tu biometría. Inténtalo de nuevo.');
    }
  };

  const biometricStatusLabel = biometricCapable ? biometricLabel(biometricType) : 'No configurada en este dispositivo';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Configuración" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Cuenta</Text>
        <Card style={styles.userCard}>
          <Avatar name={nombre} size={48} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{nombre ?? 'Colaborador'}</Text>
            {user?.correo ? <Text style={styles.userEmail}>{user.correo}</Text> : null}
          </View>
        </Card>

        {puedeCambiarExperiencia ? (
          <>
            <Text style={styles.sectionLabel}>Experiencia</Text>
            <ExperienceSwitchCard compact />
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Notificaciones</Text>
        <Card style={styles.pushCard}>
          <View style={styles.pushHeader}>
            <View style={styles.settingIcon}>
              <Ionicons name={pushInfo.icon} size={18} color={Colors.primaryDark} />
            </View>
            <View style={styles.toggleTextColumn}>
              <Text style={styles.settingLabel}>Notificaciones push</Text>
              <Text style={[styles.settingValue, { color: pushInfo.color }]}>{pushInfo.label}</Text>
            </View>
          </View>
          {pushInfo.hint ? <Text style={styles.hint}>{pushInfo.hint}</Text> : null}
          {pushSnapshot && pushSnapshot.status !== 'unsupported' && !(pushSnapshot.status === 'granted' && !pushSnapshot.provisional) ? (
            <View style={styles.pushActions}>
              {pushSnapshot.status !== 'granted' && pushSnapshot.canAskAgain ? (
                <Button title="Activar" leftIcon="notifications-outline" fullWidth={false} style={styles.pushButton} onPress={() => void handleActivatePush()} />
              ) : null}
              <Button
                title="Abrir ajustes"
                variant="outline"
                leftIcon="settings-outline"
                fullWidth={false}
                style={styles.pushButton}
                onPress={() => void openNotificationSettings()}
              />
            </View>
          ) : null}
        </Card>

        <Text style={styles.sectionLabel}>Seguridad</Text>
        <Card style={{ gap: 0 }} padded={false}>
          <View style={styles.toggleRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="finger-print-outline" size={18} color={Colors.primaryDark} />
            </View>
            <View style={styles.toggleTextColumn}>
              <Text style={styles.settingLabel}>Desbloqueo biométrico</Text>
              <Text style={styles.settingValue}>{biometricStatusLabel}</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={(value) => void handleToggleBiometric(value)}
              disabled={!biometricCapable}
              trackColor={{ false: Colors.border, true: Colors.primarySoft }}
              thumbColor={biometricEnabled ? Colors.primary : Colors.surface}
            />
          </View>
          <SettingRow icon="shield-checkmark-outline" label="Privacidad" onPress={() => router.push('/ayuda')} last />
        </Card>

        <Text style={styles.sectionLabel}>Aplicación</Text>
        <Card style={{ gap: 0 }} padded={false}>
          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingIcon}>
              <Ionicons name="phone-portrait-outline" size={18} color={Colors.primaryDark} />
            </View>
            <View style={styles.toggleTextColumn}>
              <Text style={styles.settingLabel}>Versión</Text>
              <Text style={styles.settingValue}>
                {getCurrentAppVersion()} (build {getCurrentBuildNumber()})
              </Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionLabel}>Ayuda</Text>
        <Card style={{ gap: 0 }} padded={false}>
          <SettingRow icon="sparkles-outline" label="Guía de la app" onPress={() => router.push('/guia')} />
          <SettingRow icon="help-buoy-outline" label="Preguntas frecuentes" onPress={() => router.push('/ayuda')} last />
        </Card>

        {SHOW_DEV_TOOLS ? (
          <>
            <Text style={styles.sectionLabel}>Herramientas QA</Text>
            <Card style={{ gap: 0 }} padded={false}>
              <SettingRow icon="pulse-outline" label="Diagnóstico Push" onPress={() => router.push('/dev/diagnostico-push' as never)} />
              <SettingRow icon="color-palette-outline" label="Design QA" onPress={() => router.push('/dev/design-qa' as never)} last />
            </Card>
          </>
        ) : null}

        <Button title="Cerrar sesión" onPress={handleLogout} variant="danger" loading={loggingOut} disabled={loggingOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Estado del permiso en palabras (nunca solo color). iOS "provisional"
 * entrega en silencio a la bandeja: cuenta como permitido pero se nombra.
 */
function describePushSnapshot(snapshot: PushPermissionSnapshot | null): {
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  if (!snapshot) return { label: 'Consultando…', icon: 'notifications-outline', color: Colors.textMuted };
  if (snapshot.status === 'unsupported') {
    return { label: 'No disponible aquí', hint: 'Expo Go y la web no reciben push. Usa la app instalada.', icon: 'notifications-off-outline', color: Colors.textMuted };
  }
  if (snapshot.status === 'granted' && snapshot.provisional) {
    return { label: 'Entrega silenciosa', hint: 'Llegan al centro de notificaciones sin sonido ni banner.', icon: 'notifications-outline', color: Colors.warning };
  }
  if (snapshot.status === 'granted') return { label: 'Activadas', icon: 'notifications', color: Colors.success };
  if (snapshot.status === 'denied') {
    return {
      label: 'Desactivadas',
      hint: snapshot.canAskAgain ? 'Actívalas para enterarte de aprobaciones y documentos por firmar.' : 'Las desactivaste en el sistema: actívalas desde Ajustes.',
      icon: 'notifications-off-outline',
      color: Colors.danger,
    };
  }
  return { label: 'Sin configurar', hint: 'Actívalas para enterarte de aprobaciones y documentos por firmar.', icon: 'notifications-outline', color: Colors.textMuted };
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <PressableScale
      haptic={false}
      onPress={onPress}
      style={[styles.settingRow, !last && styles.settingRowBorder] as object}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={18} color={Colors.primaryDark} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxFormWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  pushCard: {
    gap: Spacing.md,
  },
  pushHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pushActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pushButton: {
    flexGrow: 1,
    flexBasis: 130,
    minHeight: 44,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -Spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  toggleTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  settingValue: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
