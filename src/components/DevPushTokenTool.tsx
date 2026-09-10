import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { API_URL } from '@/constants/config';
import { toast } from '@/store/toastStore';
import { getCurrentAppVersion, getCurrentBuildNumber } from '@/utils/appVersion';
import { supportsRemotePush } from '@/utils/runtime';

/**
 * Herramienta SOLO DEV para copiar el Expo Push Token del dispositivo
 * actual y probarlo a mano con la Expo Push Notification Tool mientras el
 * backend no envía push real (ver docs/BUILD_AND_TEST_V4.md, sección 7).
 * `__DEV__` se revisa en el punto de montaje (Configuración) — este
 * componente además nunca hace nada si `supportsRemotePush` es falso
 * (Expo Go) y nunca loggea el token por su cuenta.
 */
export function DevPushTokenTool() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleShowToken = async () => {
    setErrorMessage(null);
    setToken(null);
    setVisible(true);

    if (!supportsRemotePush) {
      setErrorMessage('Push remoto no está disponible en Expo Go. Usa un Development Build.');
      return;
    }

    setLoading(true);
    try {
      const Notifications = await import('expo-notifications');
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        setErrorMessage('No se encontró un projectId de EAS en la configuración de la app.');
        return;
      }
      const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
      setToken(data);
    } catch {
      setErrorMessage('No se pudo obtener el Expo Push Token en este dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!token) return;
    await Clipboard.setStringAsync(token);
    toast.success('Token copiado.');
  };

  const handleCopyApiUrl = async () => {
    await Clipboard.setStringAsync(API_URL);
    toast.success('API endpoint copiado.');
  };

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="bug-outline" size={16} color={Colors.warning} />
          <Text style={styles.headerText}>Pruebas de desarrollo</Text>
        </View>
        <Text style={styles.description}>Solo visible en modo desarrollo — nunca aparece en producción.</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versión</Text>
          <Text style={styles.infoValue}>
            {getCurrentAppVersion()} ({getCurrentBuildNumber()})
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel} numberOfLines={1}>
            API endpoint
          </Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {API_URL || '—'}
          </Text>
        </View>
        <Button title="Copiar API endpoint" variant="ghost" onPress={() => void handleCopyApiUrl()} />

        <Button title="Mostrar Expo Push Token" variant="outline" onPress={() => void handleShowToken()} />
      </Card>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Expo Push Token</Text>
            {loading ? (
              <Text style={styles.message}>Obteniendo token…</Text>
            ) : errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : token ? (
              <Text style={styles.tokenText} selectable>
                {token}
              </Text>
            ) : null}

            <View style={styles.actions}>
              {token ? <Button title="Copiar token" onPress={() => void handleCopy()} style={styles.actionButton} /> : null}
              <Button title="Cerrar" variant="ghost" onPress={() => setVisible(false)} style={styles.actionButton} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
    borderColor: Colors.warningSoft,
    backgroundColor: Colors.warningSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  infoValue: {
    flexShrink: 1,
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
  },
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    textAlign: 'center',
  },
  tokenText: {
    fontSize: FontSize.xs,
    color: Colors.text,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontFamily: 'monospace',
  },
  actions: {
    gap: Spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
});
