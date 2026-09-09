import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/colors';
import { getDocumentTypeMeta } from '@/constants/documentTypes';

export interface DocumentTypeIconProps {
  /** `documento.tipo` (la `clave` real del tipo, ej. "rfc", "nss") — ver src/constants/documentTypes.ts. */
  clave?: string | null;
  size?: number;
}

/** Círculo de color + ícono distintivo por tipo de documento — sirve de "previsualización" visual (no hay miniatura real del archivo). */
export function DocumentTypeIcon({ clave, size = 40 }: DocumentTypeIconProps) {
  const meta = getDocumentTypeMeta(clave);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: Math.min(Radius.lg, size / 2.4), backgroundColor: meta.background },
      ]}>
      <Ionicons name={meta.icon} size={Math.round(size * 0.5)} color={meta.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
