import * as Clipboard from 'expo-clipboard';
import * as Device from 'expo-device';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice } from '@/components/ciclo/Screen';
import { Colors, FontSize, Layout, Spacing } from '@/constants/colors';
import { SHOW_DEV_TOOLS } from '@/constants/config';
import {
  getPushPermissionStatusAsync,
  openNotificationSettings,
  registerCurrentPushToken,
  resolveEasProjectId,
  sendTestPush,
} from '@/services/pushNotifications';
import { maskPushToken, usePushDiagnosticsStore, type PushPermissionState } from '@/store/pushDiagnosticsStore';
import { toast } from '@/store/toastStore';
import { getCurrentVersionLabel } from '@/utils/appVersion';
import { formatDateTime } from '@/utils/dates';
import { getErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';
import { supportsRemotePush } from '@/utils/runtime';

const PERMISSION_LABEL: Record<PushPermissionState, string> = {
  granted: 'Granted (permitido)',
  provisional: 'Provisional (entrega silenciosa)',
  denied: 'Denied (rechazado)',
  undetermined: 'Undetermined (sin preguntar)',
  unsupported: 'No soportado en este entorno',
  unknown: 'Sin consultar',
};

/**
 * Diagnóstico Push — SOLO QA (`SHOW_DEV_TOOLS`: `__DEV__` o build preview).
 * La ruta ni se registra en producción (`Stack.Protected` en
 * `(app)/_layout.tsx`); el `Redirect` de abajo es una segunda defensa.
 *
 * Todo lo que muestra es local: nunca el Bearer, el token Expo solo
 * enmascarado (se puede copiar completo a propósito). "Enviar push de
 * prueba" solo dispara el envío del backend — la recepción se comprueba con
 * la notificación real, nunca se simula.
 */
export default function DiagnosticoPushScreen() {
  const router = useRouter();
  const diag = usePushDiagnosticsStore();
  const [registering, setRegistering] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);

  useEffect(() => {
    if (!SHOW_DEV_TOOLS) return;
    void diag.loadPersisted();
    void getPushPermissionStatusAsync();
    if (!diag.projectId) diag.setProjectId(resolveEasProjectId());
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SHOW_DEV_TOOLS) return <Redirect href="/notificaciones" />;

  const handleRegister = async () => {
    setRegistering(true);
    const result = await registerCurrentPushToken({ promptIfUndetermined: true });
    setRegistering(false);
    if (result.status === 'registered') {
      haptics.success();
      toast.success('Token registrado en el servidor.');
    } else {
      haptics.warning();
      toast.error(result.status === 'no_permission' ? 'Sin permiso de notificaciones.' : (result.message ?? `No se registró (${result.status}).`));
    }
  };

  const handleSendTest = async () => {
    setSending(true);
    try {
      await sendTestPush();
      haptics.success();
      setSentAt(new Date().toISOString());
      toast.success('Notificación de prueba enviada.');
    } catch (error) {
      logError('diagnosticoPush.sendTest', error);
      haptics.error();
      const message = getErrorMessage(error);
      diag.setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    if (!diag.token) return;
    await Clipboard.setStringAsync(diag.token);
    haptics.tap();
    toast.success('Token completo copiado.');
  };

  const last = diag.lastPushReceived;

  return (
    <View style={styles.container}>
      <AppHeader title="Diagnóstico Push" subtitle="Solo QA · no visible en producción" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          {!supportsRemotePush ? <Notice tone="warning">Push remoto no está disponible aquí (Expo Go o web). Usa el APK preview o un Development Build.</Notice> : null}
          {!Device.isDevice ? <Notice tone="warning">Emulador/simulador: normalmente no recibe push remoto.</Notice> : null}

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Estado</Text>
            <Row label="Push remoto disponible" value={supportsRemotePush ? 'Sí' : 'No'} />
            <Row label="Permiso" value={PERMISSION_LABEL[diag.permission]} />
            <Row label="Dispositivo físico" value={Device.isDevice ? 'Sí' : 'No'} />
            <Row label="Plataforma" value={Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS} />
            <Row label="Project ID EAS" value={diag.projectId ?? resolveEasProjectId() ?? 'Falta (extra.eas.projectId)'} mono />
            <Row label="Versión" value={getCurrentVersionLabel()} />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Token</Text>
            <Row label="Expo Push Token" value={diag.token ? maskPushToken(diag.token) : 'Sin registrar en esta sesión'} mono />
            <Row label="Último registro" value={diag.lastRegisteredAt ? formatDateTime(diag.lastRegisteredAt) : '—'} />
            <Row label="Último error" value={diag.lastError ?? '—'} tone={diag.lastError ? 'danger' : undefined} />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Último push recibido</Text>
            {last ? (
              <>
                <Row label="type" value={last.type ?? '—'} mono />
                <Row label="resource_id" value={last.resourceId ?? '—'} mono />
                <Row label="related_type" value={last.relatedType ?? '—'} mono />
                <Row label="accion" value={last.accion ?? '—'} mono />
                <Row label="Origen" value={last.via === 'foreground' ? 'foreground (app abierta)' : 'response (tocada)'} />
                <Row label="Hora" value={formatDateTime(last.at)} />
              </>
            ) : (
              <Text style={styles.muted}>Todavía no llega ninguno en esta sesión.</Text>
            )}
            {sentAt ? <Text style={styles.muted}>Prueba enviada {formatDateTime(sentAt)} — espera la notificación real.</Text> : null}
          </Card>

          <View style={styles.actions}>
            <Button title={sending ? 'Enviando…' : 'Enviar push de prueba'} leftIcon="paper-plane-outline" loading={sending} onPress={() => void handleSendTest()} />
            <Button title="Volver a registrar" variant="outline" leftIcon="refresh" loading={registering} onPress={() => void handleRegister()} />
            <Button title="Copiar token completo" variant="outline" leftIcon="copy-outline" disabled={!diag.token} onPress={() => void handleCopy()} />
            <Button title="Abrir ajustes de notificaciones" variant="outline" leftIcon="settings-outline" onPress={() => void openNotificationSettings()} />
            <Button
              title="Limpiar diagnóstico local"
              variant="ghost"
              leftIcon="trash-outline"
              onPress={() => {
                diag.clearDiagnostics();
                setSentAt(null);
                toast.info('Diagnóstico local limpio.');
              }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, mono = false, tone }: { label: string; value: string; mono?: boolean; tone?: 'danger' }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono, tone === 'danger' && { color: Colors.danger }]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxFormWidth,
    alignSelf: 'center',
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: Spacing.md,
    rowGap: 2,
  },
  rowLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  rowValue: {
    flexShrink: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: FontSize.xs,
  },
  muted: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  actions: {
    gap: Spacing.sm,
  },
});
