import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import type { BirthdayGreeting } from '@/types/birthday';
import { birthdaySeenStorageKey } from '@/utils/birthday';
import { logError } from '@/utils/errors';

/**
 * Muestra la celebración de cumpleaños UNA sola vez por felicitación
 * (AGENTS.md sección 34): la primera vez que la app carga ese día con un
 * `greeting` vigente, navega a `/cumpleanos` y marca
 * `birthdayGreetingSeen:{id}` en SecureStore — nunca se repite al cambiar
 * de tab. El hero del Dashboard (`BirthdayHeroCard`) sigue disponible el
 * resto del día aunque el modal ya se haya visto.
 */
export function useBirthdayAutoCelebration(greeting: BirthdayGreeting | null | undefined): void {
  const router = useRouter();
  const triggeredForId = useRef<number | null>(null);

  useEffect(() => {
    if (!greeting) return undefined;
    if (triggeredForId.current === greeting.id) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const key = birthdaySeenStorageKey(greeting.id);
        const seen = await SecureStore.getItemAsync(key);
        if (cancelled || seen === 'true') return;

        triggeredForId.current = greeting.id;
        router.push('/cumpleanos');
        await SecureStore.setItemAsync(key, 'true');
      } catch (error) {
        logError('useBirthdayAutoCelebration', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [greeting, router]);
}
