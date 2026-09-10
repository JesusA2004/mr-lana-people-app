import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Button } from './Button';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';

export type PermissionPrimerKind = 'camera' | 'gallery' | 'push' | 'biometric' | 'qr';

export interface PermissionPrimerSheetProps {
  visible: boolean;
  kind: PermissionPrimerKind;
  /** true cuando el permiso ya fue negado y el sistema no permite volver a pedirlo (hay que ir a Ajustes). */
  blocked?: boolean;
  onClose: () => void;
  /** Solo se llama cuando `blocked` es false: dispara el diálogo nativo del sistema (o activa biometría, según `kind`). */
  onConfirm: () => void;
  /** Etiqueta del botón de confirmar cuando no está bloqueado. Default: "Permitir acceso". */
  confirmLabel?: string;
  /** Etiqueta del botón de descartar. Default: "Ahora no". */
  declineLabel?: string;
}

const COPY: Record<PermissionPrimerKind, { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }> = {
  camera: {
    icon: 'camera-outline',
    title: 'Necesitamos tu cámara',
    message: 'La usamos solo para fotografiar el documento que vas a subir a tu expediente. Nunca se guarda ni se comparte fuera de la app.',
  },
  gallery: {
    icon: 'image-outline',
    title: 'Necesitamos tus fotos',
    message: 'La usamos solo para elegir la imagen del documento que vas a subir. Nunca accedemos a nada más de tu galería.',
  },
  push: {
    icon: 'notifications-outline',
    title: 'Recibe avisos importantes',
    message: 'Te notificaremos cuando Recursos Humanos revise tus solicitudes, vacaciones o documentos — así no tienes que estar checando la app.',
  },
  biometric: {
    icon: 'finger-print-outline',
    title: 'Desbloquea más rápido',
    message: 'Usa tu huella o reconocimiento facial para volver a entrar a MR. LANA PEOPLE sin escribir tu contraseña cada vez.',
  },
  qr: {
    icon: 'qr-code-outline',
    title: 'Necesitamos tu cámara',
    message: 'Permite usar la cámara para leer el código QR que te entregó Recursos Humanos.',
  },
};

/**
 * Explicación propia ANTES del diálogo nativo del sistema operativo. El
 * diálogo nativo de permisos (el que aparece en inglés/con estilo genérico
 * si el idioma del teléfono no es español) es del sistema operativo — ni
 * esta ni ninguna app puede restylearlo, es un límite de seguridad de
 * iOS/Android. Lo que sí controlamos es TODO lo que rodea a esa pregunta:
 * por qué la pedimos, con marca propia, antes de disparar el diálogo del
 * sistema, y qué hacer si el usuario ya la negó (mandarlo a Ajustes en vez
 * de dejarlo atorado).
 */
export function PermissionPrimerSheet({
  visible,
  kind,
  blocked = false,
  onClose,
  onConfirm,
  confirmLabel = 'Permitir acceso',
  declineLabel = 'Ahora no',
}: PermissionPrimerSheetProps) {
  const copy = COPY[kind];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
        <Animated.View entering={ZoomIn.duration(220)} style={styles.sheet}>
          <View style={styles.iconCircle}>
            <Ionicons name={copy.icon} size={30} color={Colors.primaryDark} />
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.message}>
            {blocked
              ? 'Desactivaste este permiso antes. Actívalo desde los ajustes de tu teléfono para poder continuar.'
              : copy.message}
          </Text>

          <View style={styles.actions}>
            <Button title={declineLabel} variant="ghost" onPress={onClose} style={styles.actionButton} />
            <Button
              title={blocked ? 'Abrir configuración' : confirmLabel}
              leftIcon={blocked ? 'settings-outline' : 'checkmark-circle-outline'}
              onPress={() => {
                if (blocked) {
                  void Linking.openSettings();
                  onClose();
                } else {
                  onConfirm();
                }
              }}
              style={styles.actionButton}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    alignSelf: 'stretch',
  },
  actionButton: {
    flex: 1,
  },
});
