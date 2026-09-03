import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { APP_NAME } from '@/constants/config';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { pickString } from '@/utils/formatters';

export default function ConfiguracionScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [loggingOut, setLoggingOut] = useState(false);

  const nombre = pickString(user, ['nombre', 'name']);

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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Configuración" showBack onBackPress={() => router.back()} />

      <View style={styles.content}>
        <Card style={styles.userCard}>
          <View style={styles.userIcon}>
            <Ionicons name="person-outline" size={20} color={Colors.primaryDark} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{nombre ?? 'Colaborador'}</Text>
            {user?.email ? <Text style={styles.userEmail}>{String(user.email)}</Text> : null}
          </View>
        </Card>

        <Button title="Cerrar sesión" onPress={handleLogout} variant="danger" loading={loggingOut} disabled={loggingOut} />

        <Text style={styles.footer}>{APP_NAME} · Versión 1.0.0</Text>
      </View>
    </SafeAreaView>
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
  userIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  footer: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
});
