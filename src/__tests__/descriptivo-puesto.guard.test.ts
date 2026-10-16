/**
 * Guard de «marcar como leído» del descriptivo de puesto
 * (`marcarDescriptivoLeidoUnaVez`): registra la primera lectura en el servidor
 * UNA sola vez por pantalla, pero sin quedarse bloqueado para siempre si la
 * petición falla. Antes, un `onError` dejaba el `ref` con el id y la lectura
 * nunca se reintentaba mientras la pantalla siguiera montada.
 */
// La pantalla arrastra componentes con animaciones nativas (Reanimated/Worklets),
// que no inicializan en el entorno de jest. Como este test NUNCA renderiza la
// pantalla (solo ejercita la función pura del guard), basta un stub mínimo del
// API de Reanimated: sus hooks solo se invocan en render, no al importar.
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView, Image } = require('react-native');
  const identidad = <T,>(valor: T): T => valor;
  const Animated = {
    View,
    Text,
    ScrollView,
    Image,
    createAnimatedComponent: identidad,
  };
  return {
    __esModule: true,
    default: Animated,
    useAnimatedStyle: () => ({}),
    useSharedValue: (valor: unknown) => ({ value: valor }),
    useReducedMotion: () => false,
    withTiming: identidad,
    withDelay: (_ms: number, anim: unknown) => anim,
    withRepeat: identidad,
    withSequence: identidad,
    cancelAnimation: () => undefined,
    Easing: new Proxy({}, { get: () => () => 0 }),
    FadeIn: {},
    FadeOut: {},
    FadeInDown: {},
    FadeInUp: {},
    FadeOutUp: {},
    FadeOutDown: {},
    ZoomIn: {},
  };
});
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => jest.fn()) }));

import { marcarDescriptivoLeidoUnaVez } from '@/app/(app)/descriptivo-puesto';
import type { AcuseDescriptivoPuesto } from '@/types/descriptivoPuesto';

// El logging de error no debe tocar nada real en el test (ni consola ni Sentry).
jest.mock('@/utils/errors', () => ({
  ...jest.requireActual('@/utils/errors'),
  logError: jest.fn(),
}));

/** Acuse mínimo: el guard solo mira `id` y `leidoEn`. */
const acuse = (over: Partial<AcuseDescriptivoPuesto> = {}): AcuseDescriptivoPuesto =>
  ({ id: 12, leidoEn: null, ...over }) as AcuseDescriptivoPuesto;

/** `mutate` falso que imita a react-query: captura el `onError` para dispararlo a mano. */
function crearMutate() {
  let onError: ((error: unknown) => void) | null = null;
  const mutate = jest.fn((_acuseId: number, callbacks: { onError: (error: unknown) => void }) => {
    onError = callbacks.onError;
  });
  return { mutate, fallar: (error: unknown) => onError?.(error) };
}

describe('marcarDescriptivoLeidoUnaVez', () => {
  it('(a) en éxito marca una sola vez aunque la pantalla re-renderice', () => {
    const marcado = { current: null as number | null };
    const { mutate } = crearMutate();
    const data = acuse();

    // Varios renders seguidos con el mismo acuse pendiente (leidoEn === null).
    marcarDescriptivoLeidoUnaVez(data, marcado, mutate);
    marcarDescriptivoLeidoUnaVez(data, marcado, mutate);
    marcarDescriptivoLeidoUnaVez(data, marcado, mutate);

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(12, expect.objectContaining({ onError: expect.any(Function) }));
    // Tras marcar queda "dueño" del guard (la lectura ya quedó en vuelo/registrada).
    expect(marcado.current).toBe(12);
  });

  it('(b) tras un error libera el guard y un re-render vuelve a intentar', () => {
    const marcado = { current: null as number | null };
    const { mutate, fallar } = crearMutate();
    const data = acuse();

    marcarDescriptivoLeidoUnaVez(data, marcado, mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(marcado.current).toBe(12);

    // La petición falla: el guard debe liberarse para permitir un reintento.
    fallar(new Error('500'));
    expect(marcado.current).toBeNull();

    // Próximo render: reintenta de verdad.
    marcarDescriptivoLeidoUnaVez(data, marcado, mutate);
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(marcado.current).toBe(12);
  });

  it('(c) no genera un loop: mientras está en vuelo y en éxito no se vuelve a llamar', () => {
    const marcado = { current: null as number | null };
    const { mutate } = crearMutate();
    const data = acuse();

    // Simula muchos renders seguidos SIN que la mutación resuelva todavía (en vuelo).
    for (let i = 0; i < 50; i += 1) {
      marcarDescriptivoLeidoUnaVez(data, marcado, mutate);
    }
    // El guard sostiene: una sola llamada pese a 50 renders (nada de loop infinito).
    expect(mutate).toHaveBeenCalledTimes(1);

    // Si el servidor ya lo tiene como leído (leidoEn con fecha), nunca se llama.
    const yaLeido = acuse({ leidoEn: '2026-10-15T11:00:00-06:00' });
    const marcadoLimpio = { current: null as number | null };
    marcarDescriptivoLeidoUnaVez(yaLeido, marcadoLimpio, mutate);
    expect(mutate).toHaveBeenCalledTimes(1); // sigue en 1, no se añadió ninguna
  });
});
