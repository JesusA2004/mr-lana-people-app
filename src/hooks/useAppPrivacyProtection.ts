import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

import { toast } from '@/store/toastStore';

/**
 * Clave única para no chocar con otro `preventScreenCaptureAsync`/
 * `allowScreenCaptureAsync` que llegue a existir en la app.
 */
const PROTECTION_KEY = 'mrlana-people-authenticated';

/** Intensidad del blur de iOS en app switcher/background — alto a propósito: no debe leerse nada. */
const IOS_APP_SWITCHER_BLUR = 0.9;

/**
 * Bloquea capturas/grabación de pantalla y protege la vista previa del app
 * switcher mientras `enabled` es `true`. Pensada para envolver TODA la parte
 * autenticada (`(app)`), no solo documentos — se activa al montar el layout
 * de `(app)` y se libera automáticamente al desmontarlo (logout).
 *
 * - Android: `preventScreenCaptureAsync` aplica `FLAG_SECURE` — bloquea
 *   screenshot y screen recording, y de forma automática también oculta el
 *   preview en Recientes/App Switcher (documentado por el propio paquete).
 * - iOS: `preventScreenCaptureAsync` bloquea grabación (iOS 11+) y screenshot
 *   (iOS 13+); `enableAppSwitcherProtectionAsync` añade el blur en
 *   background/app switcher/Siri/Control Center, que iOS no cubre con el
 *   bloqueo anterior.
 *
 * Limitación real (no se puede evitar desde software): una foto tomada con
 * OTRO dispositivo físico a la pantalla.
 */
export function useAppPrivacyProtection(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;

    let mounted = true;

    ScreenCapture.preventScreenCaptureAsync(PROTECTION_KEY).catch(() => {});
    if (Platform.OS === 'ios') {
      ScreenCapture.enableAppSwitcherProtectionAsync(IOS_APP_SWITCHER_BLUR).catch(() => {});
    }

    const subscription = ScreenCapture.addScreenshotListener(() => {
      if (!mounted) return;
      toast.warning('Se detectó una captura de pantalla. Evita compartir información de colaboradores.');
    });

    return () => {
      mounted = false;
      subscription.remove();
      ScreenCapture.allowScreenCaptureAsync(PROTECTION_KEY).catch(() => {});
      if (Platform.OS === 'ios') {
        ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
      }
    };
  }, [enabled]);
}
