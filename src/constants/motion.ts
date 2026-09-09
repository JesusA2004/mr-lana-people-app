/**
 * Tokens de animación centralizados (React Native Reanimated). Mantener las
 * duraciones/curvas aquí evita que cada pantalla invente su propio "feel" —
 * debe sentirse premium, no exagerado: movimiento sutil, nunca "caricatura".
 */
export const Motion = {
  duration: {
    /** Feedback de press (scale al tocar) — 80-120ms, respuesta inmediata. */
    press: 100,
    fast: 150,
    base: 220,
    slow: 360,
  },
  scale: {
    /** Valor al presionar tarjetas/botones interactivos (rango 0.96-0.98). */
    pressed: 0.97,
    /** Pico del "bounce" de un ícono/badge al activarse (tab seleccionado, notificación nueva). */
    iconActive: 1.12,
  },
  translate: {
    /** Desplazamiento leve para entradas/transiciones de paso (wizard, mascota). */
    small: 8,
    medium: 16,
  },
  stagger: 60,
} as const;
