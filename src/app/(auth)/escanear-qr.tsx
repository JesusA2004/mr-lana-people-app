import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PermissionPrimerSheet } from '@/components/PermissionPrimerSheet';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { toast } from '@/store/toastStore';
import { haptics } from '@/utils/haptics';
import { maskTokenForLog, parseIncorporacionQr } from '@/utils/parseIncorporacionQr';

/**
 * Escáner QR real (AGENTS.md sección 21-26) — puerta de entrada al proceso
 * autónomo de incorporación para quien todavía no tiene cuenta. Pantalla
 * pública, fuera de `(app)`: nunca exige sesión. Solo acepta el QR de
 * incorporación real (`parseIncorporacionQr`) — cualquier otro código se
 * rechaza sin navegar ni ejecutar nada.
 */
export default function EscanearQrScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [showPrimer, setShowPrimer] = useState(false);
  const [torch, setTorch] = useState(false);
  const [devPasteOpen, setDevPasteOpen] = useState(false);
  const processingRef = useRef(false);
  const primerEvaluated = useRef(false);

  // `useCameraPermissions` resuelve async (empieza en `null`): el primer
  // propio (AGENTS.md sección 23) solo se muestra UNA vez que ya sabemos
  // de verdad que el permiso no está concedido — nunca antes de tiempo. El
  // `setState` se difiere a un callback (no directo en el cuerpo del
  // efecto) para no encadenar renders síncronos.
  useEffect(() => {
    if (!permission || primerEvaluated.current) return undefined;
    primerEvaluated.current = true;
    if (permission.granted) return undefined;
    const timer = setTimeout(() => setShowPrimer(true), 0);
    return () => clearTimeout(timer);
  }, [permission]);

  const handleScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (processingRef.current) return;
      processingRef.current = true;

      const parsed = parseIncorporacionQr(result.data);
      if (!parsed) {
        haptics.warning();
        toast.error('Este código no es un QR de incorporación de MR. LANA PEOPLE.');
        setTimeout(() => {
          processingRef.current = false;
        }, 1200);
        return;
      }

      haptics.success();
      if (__DEV__) console.log('[QR] token válido, prefijo:', maskTokenForLog(parsed.token));
      router.replace({ pathname: '/incorporacion/qr/[token]', params: { token: parsed.token } });
    },
    [router],
  );

  const handleConfirmPermission = () => {
    setShowPrimer(false);
    void requestPermission();
  };

  const blocked = Boolean(permission && !permission.granted && !permission.canAskAgain);
  const canScan = Boolean(permission?.granted);

  return (
    <SafeAreaView style={styles.safeArea} accessibilityLabel="Escáner de código QR de incorporación">
      {canScan ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScanned}
        />
      ) : (
        <View style={styles.fallback} />
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Text style={styles.title}>Escanea tu código</Text>
          <Text style={styles.subtitle}>Coloca el código dentro del recuadro.</Text>
        </View>

        <View style={styles.frameWrapper} pointerEvents="none">
          <View style={styles.frame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        </View>

        <View style={styles.bottomBar}>
          {canScan ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={torch ? 'Apagar linterna' : 'Encender linterna'}
              onPress={() => setTorch((value) => !value)}
              style={styles.torchButton}>
              <Ionicons name={torch ? 'flash' : 'flash-outline'} size={22} color={Colors.white} />
            </Pressable>
          ) : null}

          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} fullWidth={false} style={styles.cancelButton} />

          {__DEV__ ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pegar token QR (solo desarrollo)"
              onPress={() => setDevPasteOpen(true)}
              style={styles.devButton}>
              <Ionicons name="code-slash-outline" size={18} color={Colors.white} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <PermissionPrimerSheet
        visible={showPrimer}
        kind="qr"
        blocked={blocked}
        onClose={() => {
          setShowPrimer(false);
          router.back();
        }}
        onConfirm={handleConfirmPermission}
        confirmLabel="Permitir cámara"
      />

      {__DEV__ ? (
        <DevQrPasteModal
          visible={devPasteOpen}
          onClose={() => setDevPasteOpen(false)}
          onSubmit={(token) => {
            setDevPasteOpen(false);
            router.replace({ pathname: '/incorporacion/qr/[token]', params: { token } });
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

/** Solo `__DEV__` (AGENTS.md sección 76): pegar un token de prueba sin cámara real. Nunca en producción. */
function DevQrPasteModal({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (token: string) => void }) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const raw = value.trim();
    if (!raw) return;
    const parsed = parseIncorporacionQr(raw);
    if (parsed) {
      onSubmit(parsed.token);
      return;
    }
    // En DEV se acepta también un token "pelado" (sin URL) para pruebas rápidas.
    if (/^[A-Za-z0-9]{16,128}$/.test(raw)) {
      onSubmit(raw);
      return;
    }
    toast.error('Ese texto no parece un token ni una liga de QR válida.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.devBackdrop}>
        <View style={styles.devSheet}>
          <Text style={styles.devTitle}>Pegar token QR (DEV)</Text>
          <Input label="Token o liga completa" value={value} onChangeText={setValue} autoCapitalize="none" autoCorrect={false} placeholder="https://people.mr-lana.com/incorporacion/qr/..." />
          <View style={styles.devActions}>
            <Button title="Cancelar" variant="outline" onPress={onClose} style={styles.devActionButton} />
            <Button title="Ir" onPress={handleSubmit} style={styles.devActionButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  fallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.black,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  frameWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: Radius.xl,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  torchButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingHorizontal: Spacing.xl,
  },
  devButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  devSheet: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  devTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  devActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  devActionButton: {
    flex: 1,
  },
});
