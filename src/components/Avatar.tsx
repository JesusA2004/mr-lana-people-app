import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius } from '@/constants/colors';
import { getInitials } from '@/utils/formatters';

export interface AvatarProps {
  name?: string;
  uri?: string;
  size?: number;
}

/**
 * Muestra la foto del colaborador si hay una URL válida y carga
 * correctamente; si no, cae de forma elegante a un avatar con iniciales.
 * La ausencia de foto nunca debe romper Dashboard ni Perfil (ver AGENTS.md
 * / especificación sección 16).
 */
export function Avatar({ name, uri, size = 56 }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, dimension]}
        onError={() => setFailed(true)}
        accessibilityLabel="Foto de perfil"
      />
    );
  }

  return (
    <View style={[styles.fallback, dimension]}>
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
