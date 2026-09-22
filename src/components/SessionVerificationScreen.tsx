import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './Button';

import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/authStore';

/**
 * Hay una sesión guardada pero no se pudo verificar (sin internet, timeout
 * o servidor caído). NO es "tu sesión expiró": la cuenta sigue guardada y
 * se reintenta sola en cuanto NetInfo detecta conexión o la app vuelve a
 * primer plano. Solo un 401 real manda a Login.
 */
export function SessionVerificationScreen() {
  const retry = useAuthStore((state) => state.retrySessionVerification);
  const discard = useAuthStore((state) => state.discardPendingSession);
  const isVerifying = useAuthStore((state) => state.isVerifying);
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    let wasOffline = false;
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      if (online && wasOffline) void retry();
      wasOffline = !online;
    });
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void retry();
    });
    return () => {
      unsubscribeNet();
      appStateSub.remove();
    };
  }, [retry]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.iconWrap} accessible={false}>
            <Ionicons name={isOffline ? 'cloud-offline-outline' : 'sync-outline'} size={32} color={Colors.primaryDark} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {isOffline ? 'Sin conexión' : 'No pudimos verificar tu sesión'}
          </Text>
          <Text style={styles.body}>
            {isOffline
              ? 'No pudimos verificar tu sesión porque no hay conexión. Tu cuenta sigue guardada en este teléfono.'
              : 'El servidor no respondió a tiempo. Tu cuenta sigue guardada en este teléfono.'}
          </Text>
          <Text style={styles.hint}>Entraremos automáticamente en cuanto vuelva la conexión.</Text>

          <View style={styles.actions}>
            <Button title="Reintentar" leftIcon="refresh" loading={isVerifying} onPress={() => void retry()} />
            <Button title="Entrar con otra cuenta" variant="ghost" disabled={isVerifying} onPress={() => void discard()} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxFormWidth,
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
});
