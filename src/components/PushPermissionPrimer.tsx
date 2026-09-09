import { useEffect, useRef, useState } from 'react';

import { PermissionPrimerSheet } from './PermissionPrimerSheet';

import { getPushPermissionStatusAsync, registerCurrentPushToken } from '@/services/pushNotifications';
import { usePushPrimerStore } from '@/store/pushPrimerStore';

const SHOW_DELAY_MS = 1200;

/**
 * Decide UNA sola vez por instalación si conviene mostrar el primer de
 * push ("Recibe avisos importantes") — V4 sección 9. Montado en
 * `(app)/_layout.tsx`, así que solo corre para sesiones autenticadas.
 * Nunca se muestra si: no soporta push (Expo Go/web), el permiso ya fue
 * decidido antes (granted/denied), o ya se le preguntó una vez.
 */
export function PushPermissionPrimer() {
  const isLoading = usePushPrimerStore((state) => state.isLoading);
  const hasBeenAsked = usePushPrimerStore((state) => state.hasBeenAsked);
  const load = usePushPrimerStore((state) => state.load);
  const markAsked = usePushPrimerStore((state) => state.markAsked);

  const [visible, setVisible] = useState(false);
  const evaluated = useRef(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isLoading || hasBeenAsked || evaluated.current) return;
    evaluated.current = true;

    const timer = setTimeout(() => {
      void getPushPermissionStatusAsync().then((snapshot) => {
        if (snapshot.status === 'undetermined') setVisible(true);
        else void markAsked();
      });
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isLoading, hasBeenAsked, markAsked]);

  const handleClose = () => {
    setVisible(false);
    void markAsked();
  };

  const handleConfirm = () => {
    setVisible(false);
    void markAsked();
    void registerCurrentPushToken({ promptIfUndetermined: true });
  };

  return (
    <PermissionPrimerSheet
      visible={visible}
      kind="push"
      onClose={handleClose}
      onConfirm={handleConfirm}
      confirmLabel="Activar notificaciones"
      declineLabel="Ahora no"
    />
  );
}
