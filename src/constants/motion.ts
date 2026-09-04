/**
 * Tokens de animación centralizados (React Native Reanimated). Mantener las
 * duraciones/curvas aquí evita que cada pantalla invente su propio "feel" —
 * ver AGENTS.md sección 14, "debe sentirse premium, no exagerado".
 */
export const Motion = {
  duration: {
    fast: 150,
    base: 220,
    slow: 360,
  },
  scale: {
    /** Valor al presionar tarjetas/botones interactivos. */
    pressed: 0.97,
  },
  stagger: 60,
} as const;
