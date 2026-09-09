import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Button } from './Button';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';

export interface ExitConfirmSheetProps {
  visible: boolean;
  onContinueEditing: () => void;
  onExit: () => void;
}

/** "¿Salir sin enviar?" — V4 sección 47: evita perder un formulario a medio llenar por un back accidental. */
export function ExitConfirmSheet({ visible, onContinueEditing, onExit }: ExitConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onContinueEditing}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
        <Animated.View entering={ZoomIn.duration(200)} style={styles.sheet}>
          <Text style={styles.title}>¿Salir sin enviar?</Text>
          <Text style={styles.message}>Perderás la información que ya escribiste en esta solicitud.</Text>
          <View style={styles.actions}>
            <Button title="Continuar editando" onPress={onContinueEditing} style={styles.actionButton} />
            <Button title="Salir" variant="danger" onPress={onExit} style={styles.actionButton} />
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
    gap: Spacing.sm,
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
    marginBottom: Spacing.sm,
  },
  actions: {
    gap: Spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
});
