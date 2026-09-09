import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from './AnimatedProgressBar';
import { Button } from './Button';
import { PermissionPrimerSheet, type PermissionPrimerKind } from './PermissionPrimerSheet';
import { PressableScale } from './PressableScale';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { toast } from '@/store/toastStore';
import { getErrorMessage, logError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

export interface PickedDocumentFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface DocumentUploadSheetProps {
  visible: boolean;
  /** Título del documento que se está subiendo, ej. "Número de Seguro Social (NSS)". Puede ser largo: el header lo envuelve en hasta 2 líneas, nunca lo desborda. */
  title: string;
  onClose: () => void;
  /** Ejecuta la subida real (API); recibe `onProgress` para pintar la barra real de subida. El sheet muestra progreso/errores alrededor de esta promesa. */
  onConfirm: (file: PickedDocumentFile, onProgress: (percent: number) => void) => Promise<void>;
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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionPrimer, setPermissionPrimer] = useState<{ kind: PermissionPrimerKind; blocked: boolean } | null>(null);

  const reset = () => {
    setStep('choose');
    setFile(null);
    setSubmitting(false);
    setProgress(0);
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

  const launchCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateSize(asset.fileSize)) return;
    setFile({ uri: asset.uri, name: asset.fileName ?? `foto-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize });
    setStep('preview');
  };

  const launchGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!validateSize(asset.fileSize)) return;
    setFile({ uri: asset.uri, name: asset.fileName ?? `imagen-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg', size: asset.fileSize });
    setStep('preview');
  };

  /**
   * Antes de disparar el diálogo nativo de permisos (el que el sistema
   * operativo dibuja con su propio estilo/idioma — eso no lo controla
   * ninguna app), mostramos nuestra propia explicación con marca. Si el
   * permiso ya estaba concedido, se salta directo a la acción.
   */
  const pickFromCamera = async () => {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.granted) {
      await launchCamera();
      return;
    }
    setPermissionPrimer({ kind: 'camera', blocked: current.status === 'denied' && !current.canAskAgain });
  };

  const pickFromGallery = async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) {
      await launchGallery();
      return;
    }
    setPermissionPrimer({ kind: 'gallery', blocked: current.status === 'denied' && !current.canAskAgain });
  };

  const handlePermissionConfirm = async () => {
    if (!permissionPrimer) return;
    const { kind } = permissionPrimer;
    setPermissionPrimer(null);

    if (kind === 'camera') {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      if (result.granted) await launchCamera();
      else if (!result.canAskAgain) setPermissionPrimer({ kind: 'camera', blocked: true });
    } else {
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (result.granted) await launchGallery();
      else if (!result.canAskAgain) setPermissionPrimer({ kind: 'gallery', blocked: true });
    }
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
    setProgress(0);
    setSubmitting(true);
    try {
      await onConfirm(file, setProgress);
      haptics.success();
      toast.success('Documento cargado correctamente.');
      reset();
      onClose();
    } catch (uploadError) {
      logError('DocumentUploadSheet.onConfirm', uploadError);
      haptics.error();
      setError(getErrorMessage(uploadError));
      setProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  const isImage = file?.mimeType.startsWith('image/');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="document-text-outline" size={18} color={Colors.primaryDark} />
            </View>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {title}
            </Text>
          </View>
          <PressableScale accessibilityLabel="Cerrar" onPress={handleClose} haptic={false} disabled={submitting} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={Colors.text} />
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

              {submitting ? (
                <View style={styles.progressBlock}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressLabel}>Subiendo documento…</Text>
                    <Text style={styles.progressPercent}>{progress}%</Text>
                  </View>
                  <AnimatedProgressBar percent={progress} height={8} />
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

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
                  title={error ? 'Reintentar' : 'Confirmar y subir'}
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

      <PermissionPrimerSheet
        visible={Boolean(permissionPrimer)}
        kind={permissionPrimer?.kind ?? 'camera'}
        blocked={permissionPrimer?.blocked ?? false}
        onClose={() => setPermissionPrimer(null)}
        onConfirm={() => void handlePermissionConfirm()}
      />
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
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    flexWrap: 'wrap',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: '600',
  },
  progressBlock: {
    gap: Spacing.xs,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  progressPercent: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
});
