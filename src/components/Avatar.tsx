import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius } from '@/constants/colors';
import { getInitials } from '@/utils/formatters';

export interface AvatarProps {
  name?: string;
  uri?: string;
  size?: number;
  /** Borde de acento (por ejemplo, para señalar perfil completo). */
  ringColor?: string;
}

/**
 * Muestra la foto del colaborador si hay una URL válida y carga
 * correctamente; si no, cae de forma elegante a un avatar con iniciales.
 * La ausencia de foto nunca debe romper Dashboard ni Perfil (ver AGENTS.md
 * / especificación sección 16). `foto_url` del backend hoy depende de sesión
 * web (ver docs/MOBILE_BACKEND_REQUIREMENTS.md), así que en la práctica casi
 * siempre se usa el fallback de iniciales — es un camino esperado, no un bug.
 */
export function Avatar({ name, uri, size = 56, ringColor }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  const ringStyle = ringColor ? { borderWidth: 2.5, borderColor: ringColor } : null;

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, dimension, ringStyle]}
        onError={() => setFailed(true)}
        accessibilityLabel="Foto de perfil"
      />
    );
  }

  return (
    <View style={[styles.fallback, dimension, ringStyle]}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.surfaceMuted,
  },
  fallback: {
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  initials: {
    color: Colors.primaryDark,
    fontWeight: '700',
    fontSize: FontSize.lg,
  },
});
