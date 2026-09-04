import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { API_URL, APP_NAME } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';
import { joinName } from '@/utils/formatters';

export default function ConfiguracionScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pushStatus, setPushStatus] = useState<Notifications.PermissionStatus | null>(null);

  const nombre = joinName(user?.nombre, user?.apellidos);

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((result) => setPushStatus(result.status))
      .catch(() => setPushStatus(null));
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

  const pushStatusLabel =
    pushStatus === 'granted' ? 'Activadas' : pushStatus === 'denied' ? 'Desactivadas' : 'Sin definir';

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

        <Text style={styles.sectionLabel}>Preferencias</Text>
        <Card style={{ gap: 0 }} padded={false}>
          <SettingRow
            icon="notifications-outline"
            label="Notificaciones push"
            value={pushStatusLabel}
            onPress={() => void Linking.openSettings()}
          />
          <SettingRow icon="shield-checkmark-outline" label="Privacidad" value="Ver aviso" onPress={() => router.push('/ayuda')} last />
        </Card>

        <Text style={styles.sectionLabel}>Soporte</Text>
        <Card style={{ gap: 0 }} padded={false}>
          <SettingRow icon="help-buoy-outline" label="Ayuda y preguntas frecuentes" onPress={() => router.push('/ayuda')} last />
        </Card>

        <Button title="Cerrar sesión" onPress={handleLogout} variant="danger" loading={loggingOut} disabled={loggingOut} />

        <Text style={styles.footer}>
          {APP_NAME} · Versión {Constants.expoConfig?.version ?? '1.0.0'}
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
  },
});
