import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { StyleSheet, Text, View } from 'react-native';

import type { LocalUploadFile } from '@/api/upload';
import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { toast } from '@/store/toastStore';
import { logError } from '@/utils/errors';

export interface FilePickButtonProps {
  label: string;
  file: LocalUploadFile | null;
  onChange: (file: LocalUploadFile | null) => void;
  /** MIME aceptados por el FormRequest del backend. */
  types?: string[];
  maxSizeMb?: number;
}

/** PDF/JPG/PNG por defecto — `config('contratos.extensiones_permitidas')`. */
export const LABOR_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/**
 * Selector de archivo compacto para formularios (comprobante de envío,
 * importación CSV/XLSX...). El archivo se queda en la caché temporal del
 * picker (nunca en almacenamiento público) y solo viaja por multipart.
 */
export function FilePickButton({ label, file, onChange, types = LABOR_FILE_TYPES, maxSizeMb = 20 }: FilePickButtonProps) {
  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > maxSizeMb * 1024 * 1024) {
        toast.error(`El archivo supera el límite de ${maxSizeMb} MB.`);
        return;
      }
      onChange({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
    } catch (error) {
      logError('FilePickButton', error);
      toast.error('No fue posible seleccionar el archivo.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale accessibilityRole="button" accessibilityLabel={file ? `Archivo ${file.name}. Cambiar` : `Seleccionar ${label}`} onPress={() => void pick()} style={styles.button}>
        <Ionicons name={file ? 'document-attach' : 'attach-outline'} size={20} color={Colors.primaryDark} />
        <Text style={styles.fileName} numberOfLines={1}>
          {file ? file.name : 'Seleccionar archivo'}
        </Text>
        {file ? (
          <PressableScale accessibilityRole="button" accessibilityLabel="Quitar archivo" onPress={() => onChange(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </PressableScale>
        ) : null}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  fileName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
});
