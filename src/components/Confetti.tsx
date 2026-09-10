import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/colors';

const PARTICLE_COLORS = [Colors.primary, Colors.secondary, Colors.warning, Colors.info];
const PARTICLE_COUNT = 14;

interface Particle {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

function generateParticles(width: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
    id,
    left: Math.random() * width,
    color: PARTICLE_COLORS[id % PARTICLE_COLORS.length] as string,
    delay: Math.random() * 600,
    duration: 2200 + Math.random() * 900,
    size: 6 + Math.random() * 5,
  }));
}

/**
 * Confetti discreto — partículas ligeras, nunca infantil ni exagerado
 * (AGENTS.md sección 35). Respeta "Reducir movimiento" del sistema por
 * completo: no renderiza nada, la pantalla sigue siendo funcional e
 * idéntica en contenido. Las posiciones aleatorias se generan en un efecto
 * (nunca durante el render, que debe ser puro) y se difieren a un callback
 * para no encadenar renders síncronos.
 */
export function Confetti() {
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = setTimeout(() => setParticles(generateParticles(width)), 0);
    return () => clearTimeout(timer);
  }, [width, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((particle) => (
        <ConfettiParticle key={particle.id} particle={particle} />
      ))}
    </View>
  );
}

function ConfettiParticle({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(particle.delay, withRepeat(withTiming(1, { duration: particle.duration, easing: Easing.linear }), -1, false));
  }, [particle, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * 620 }, { rotate: `${progress.value * 340}deg` }],
    opacity: 1 - progress.value * 0.6,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: particle.left, width: particle.size, height: particle.size, backgroundColor: particle.color, borderRadius: particle.size / 3 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: -20,
  },
});
