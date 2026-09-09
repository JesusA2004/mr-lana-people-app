import { useEffect, useRef, useState } from 'react';

import { PermissionPrimerSheet } from './PermissionPrimerSheet';

import { getBiometricCapabilityAsync, authenticateWithBiometricsAsync } from '@/services/biometricAuth';
import { useBiometricStore } from '@/store/biometricStore';
import { toast } from '@/store/toastStore';

const SHOW_DELAY_MS = 1600;

/**
 * "¿Quieres usar tu huella/Face ID para desbloquear MR. LANA PEOPLE?" — se
 * ofrece UNA sola vez, después del primer login, y solo si el dispositivo
 * de verdad tiene biometría registrada (V4 sección 31). Montado en
 * `(app)/_layout.tsx`, igual que `PushPermissionPrimer`.
 */
export function BiometricEnrollPrimer() {
  const isLoading = useBiometricStore((state) => state.isLoading);
  const hasBeenPrompted = useBiometricStore((state) => state.hasBeenPrompted);
  const enabled = useBiometricStore((state) => state.enabled);
  const load = useBiometricStore((state) => state.load);
  const setEnabled = useBiometricStore((state) => state.setEnabled);
  const markPrompted = useBiometricStore((state) => state.markPrompted);

  const [visible, setVisible] = useState(false);
  const evaluated = useRef(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isLoading || hasBeenPrompted || enabled || evaluated.current) return;
    evaluated.current = true;

    const timer = setTimeout(() => {
      void getBiometricCapabilityAsync().then((capability) => {
        if (capability.hasHardware && capability.isEnrolled) {
          setVisible(true);
        } else {
          void markPrompted();
        }
      });
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isLoading, hasBeenPrompted, enabled, markPrompted]);

  const handleClose = () => {
    setVisible(false);
    void markPrompted();
  };

  const handleConfirm = async () => {
    setVisible(false);
    // Verifica que de verdad funciona ANTES de activarla — si el sensor
    // falla aquí, mejor que el colaborador lo sepa ahora que la primera
    // vez que intente entrar y quede atorado.
    const result = await authenticateWithBiometricsAsync('Confirma tu identidad para activar el desbloqueo biométrico');
    if (result.success) {
      await setEnabled(true);
      toast.success('Desbloqueo biométrico activado.');
    } else if (!result.cancelled) {
      toast.warning('No pudimos confirmar tu biometría. Puedes activarla después desde Configuración.');
    }
    await markPrompted();
  };

  return (
    <PermissionPrimerSheet
      visible={visible}
      kind="biometric"
      onClose={handleClose}
      onConfirm={() => void handleConfirm()}
      confirmLabel="Activar"
      declineLabel="Ahora no"
    />
  );
}
