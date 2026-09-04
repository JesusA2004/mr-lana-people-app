import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius } from '@/constants/colors';
import { getInitials } from '@/utils/formatters';

export interface AvatarProps {
  name?: string;
  uri?: string;
  /** Headers HTTP para `uri` (por ejemplo, Authorization: Bearer <token> para `foto_url_api`). */
  headers?: Record<string, string>;
  size?: number;
  /** Borde de acento (por ejemplo, para señalar perfil completo). */
  ringColor?: string;
}

/**
 * Muestra una foto por URL (con headers opcionales) si carga correctamente;
 * si no, cae de forma elegante a un avatar con iniciales. La ausencia de
 * foto nunca debe romper Dashboard ni Perfil. Para la cadena de prioridad
 * completa (foto_url_api → foto_url → avatar demo → iniciales) usa
 * `<ProfileAvatar />`, que envuelve este componente.
 */
export function Avatar({ name, uri, headers, size = 56, ringColor }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  const ringStyle = ringColor ? { borderWidth: 2.5, borderColor: ringColor } : null;

  if (uri && !failed) {
    return (
      <Image
        source={{ uri, headers }}
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
