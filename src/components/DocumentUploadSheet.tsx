import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { PressableScale } from './PressableScale';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { toast } from '@/store/toastStore';
import { getErrorMessage, logError } from '@/utils/errors';

export interface PickedDocumentFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface DocumentUploadSheetProps {
  visible: boolean;
  /** Título del documento que se está subiendo, ej. "Identificación oficial". */
  title: string;
  onClose: () => void;
  /** Ejecuta la subida real (API); el sheet muestra progreso/errores alrededor de esta promesa. */
  onConfirm: (file: PickedDocumentFile) => Promise<void>;
  /** MB máximos permitidos por el backend (config('expedientes.max_upload_mb'), hoy 20). Solo valida en cliente para feedback rápido; el backend sigue siendo la fuente de verdad. */
  maxSizeMb?: number;
}

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

type Step = 'choose' | 'preview';

/**
 * Hoja reutilizable para cargar un documento del expediente o adjuntar un
 * archivo a una solicitud (AGENTS.md sección 5/17): elegir cámara/galería o
 * un PDF, previsualizar, confirmar y subir con feedback de progreso. Nunca
 * simula una subida exitosa — si `onConfirm` falla, se muestra el error tal
 * cual.
 */
export function DocumentUploadSheet({ visible, title, onClose, onConfirm, maxSizeMb = 20 }: DocumentUploadSheetProps) {
  const [step, setStep] = useState<Step>('choose');
  const [file, setFile] = useState<PickedDocumentFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('choose');
    setFile(null);
    setSubmitting(false);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const validateSize = (size?: number): boolean => {
    if (!size) return true;
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (size > maxBytes) {
      toast.error(`El archivo supera el límite de ${maxSizeMb} MB.`);
      return false;
    }
    return true;
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.warning('Necesitamos permiso de cámara para tomar la foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateSize(asset.fileSize)) return;
    setFile({ uri: asset.uri, name: asset.fileName ?? `foto-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize });
    setStep('preview');
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.warning('Necesitamos permiso para acceder a tus fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateSize(asset.fileSize)) return;
    setFile({ uri: asset.uri, name: asset.fileName ?? `imagen-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize });
    setStep('preview');
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ACCEPTED_MIME_TYPES, copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateSize(asset.size ?? undefined)) return;
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/pdf', size: asset.size ?? undefined });
    setStep('preview');
  };

  const handleConfirm = async () => {
    if (!file) return;
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(file);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      toast.success('Documento cargado correctamente.');
      reset();
      onClose();
    } catch (uploadError) {
      logError('DocumentUploadSheet.onConfirm', uploadError);
      setError(getErrorMessage(uploadError));
    } finally {
      setSubmitting(false);
    }
  };

  const isImage = file?.mimeType.startsWith('image/');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <PressableScale accessibilityLabel="Cerrar" onPress={handleClose} haptic={false} disabled={submitting}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </PressableScale>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {step === 'choose' ? (
            <>
              <Text style={styles.helperText}>Elige cómo quieres cargar tu documento. Formatos: PDF, JPG o PNG.</Text>
              <OptionRow icon="camera-outline" label="Tomar foto" onPress={() => void pickFromCamera()} />
              <OptionRow icon="image-outline" label="Elegir de galería" onPress={() => void pickFromGallery()} />
              <OptionRow icon="document-attach-outline" label="Elegir archivo PDF" onPress={() => void pickDocument()} />
            </>
          ) : file ? (
            <>
              <Text style={styles.helperText}>Confirma que este es el documento correcto antes de enviarlo.</Text>
              <View style={styles.previewCard}>
                {isImage ? (
                  <Image source={{ uri: file.uri }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.previewFileIcon}>
                    <Ionicons name="document-text" size={32} color={Colors.primaryDark} />
                  </View>
                )}
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName} numberOfLines={2}>
                    {file.name}
                  </Text>
                  {file.size ? <Text style={styles.previewSize}>{(file.size / (1024 * 1024)).toFixed(1)} MB</Text> : null}
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.previewActions}>
                <Button
                  title="Elegir otro"
                  variant="outline"
                  onPress={() => {
                    setFile(null);
                    setError(null);
                    setStep('choose');
                  }}
                  disabled={submitting}
                  style={styles.previewActionButton}
                />
                <Button
                  title="Confirmar y subir"
                  onPress={() => void handleConfirm()}
                  loading={submitting}
                  disabled={submitting}
                  style={styles.previewActionButton}
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function OptionRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.optionRow}>
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={20} color={Colors.primaryDark} />
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    flexShrink: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  helperText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  previewFileIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  previewSize: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  previewActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  previewActionButton: {
    flex: 1,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: '600',
  },
});
