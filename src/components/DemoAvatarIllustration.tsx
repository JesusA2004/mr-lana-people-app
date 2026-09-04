import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/colors';

export interface DemoAvatarIllustrationProps {
  size: number;
}

/**
 * Avatar ilustrado neutro (silueta genérica), 100% dibujado con Views — no
 * es una fotografía real ni un asset descargado. Úsalo solo para previsualizar
 * en DEV cómo se vería la interfaz con foto (ver `SHOW_DEMO_PROFILE_PHOTO`
 * en constants/config.ts) — nunca debe aparecer en producción ni confundirse
 * con datos reales del colaborador.
 */
export function DemoAvatarIllustration({ size }: DemoAvatarIllustrationProps) {
  const headSize = size * 0.42;
  const shouldersSize = size * 0.72;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      accessibilityLabel="Avatar de ejemplo (solo desarrollo)">
      <View
        style={[
          styles.shoulders,
          {
            width: shouldersSize,
            height: shouldersSize / 1.4,
            borderTopLeftRadius: shouldersSize,
            borderTopRightRadius: shouldersSize,
            bottom: -size * 0.06,
          },
        ]}
      />
      <View style={[styles.head, { width: headSize, height: headSize, borderRadius: headSize / 2, top: size * 0.16 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  head: {
    position: 'absolute',
    backgroundColor: Colors.secondary,
    opacity: 0.55,
  },
  shoulders: {
    backgroundColor: Colors.secondary,
    opacity: 0.55,
    borderRadius: Radius.full,
  },
});
