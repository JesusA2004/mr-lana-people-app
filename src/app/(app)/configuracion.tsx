import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { API_URL, APP_NAME } from '@/constants/config';
import { authenticateWithBiometricsAsync, biometricLabel, getBiometricCapabilityAsync, type BiometricKind } from '@/services/biometricAuth';
import { getPushPermissionStatusAsync, type PushPermissionSnapshot, registerCurrentPushToken } from '@/services/pushNotifications';
import { useAuthStore } from '@/store/authStore';
import { useBiometricStore } from '@/store/biometricStore';
import { toast } from '@/store/toastStore';
import { supportsRemotePush } from '@/utils/runtime';
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

  const handlePushRowPress = async () => {
    if (!pushSnapshot || pushSnapshot.status === 'unsupported') return;
    if (pushSnapshot.status === 'undetermined') {
      await registerCurrentPushToken({ promptIfUndetermined: true });
      refreshPushStatus();
      return;
    }
    // 'granted' o 'denied': el sistema ya no deja re-preguntar desde la app, solo Ajustes.
    void Linking.openSettings();
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

  const pushStatusLabel = !pushSnapshot
    ? '…'
    : pushSnapshot.status === 'unsupported'
      ? 'No disponible en Expo Go'
      : pushSnapshot.status === 'granted'
        ? 'Activadas'
        : pushSnapshot.status === 'denied'
          ? 'Desactivadas'
          : 'Sin definir';

  const biometricStatusLabel = biometricCapable ? biometricLabel(biometricType) : 'No configurada en este dispositivo';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Configuración" showBack onBackPress={() => router.back()} />

      <View style={styles.content}>
        <Card style={styles.userCard}>
          <Avatar name={nombre} size={48} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{nombre ?? 'Colaborador'}</Text>
            {user?.correo ? <Text style={styles.userEmail}>{user.correo}</Text> : null}
          </View>
        </Card>

        <Text style={styles.sectionLabel}>Notificaciones</Text>
        <Card style={{ gap: 0 }} padded={false}>
          <SettingRow icon="notifications-outline" label="Notificaciones push" value={pushStatusLabel} onPress={() => void handlePushRowPress()} last />
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
          <SettingRow
            icon="shield-checkmark-outline"
            label="Privacidad y protección"
            value="Ver detalle"
            onPress={() => router.push('/ayuda')}
            last
          />
        </Card>

        <Text style={styles.sectionLabel}>Soporte</Text>
        <Card style={{ gap: 0 }} padded={false}>
          <SettingRow icon="sparkles-outline" label="Guía de la app" onPress={() => router.push('/guia')} />
          <SettingRow icon="help-buoy-outline" label="Ayuda y preguntas frecuentes" onPress={() => router.push('/ayuda')} last />
        </Card>

        <Button title="Cerrar sesión" onPress={handleLogout} variant="danger" loading={loggingOut} disabled={loggingOut} />

        <Text style={styles.footer}>
          {APP_NAME}
          {'\n'}Versión {Constants.expoConfig?.version ?? '1.0.0'}
          {Constants.expoConfig?.android?.versionCode ? ` · Build ${Constants.expoConfig.android.versionCode}` : ''}
          {!supportsRemotePush ? '\nExpo Go — push remoto no disponible' : ''}
          {__DEV__ ? `\n${API_URL}` : ''}
        </Text>
      </View>
    </SafeAreaView>
  );
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
    padding: Spacing.lg,
    gap: Spacing.lg,
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
  footer: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
    lineHeight: 18,
  },
});
