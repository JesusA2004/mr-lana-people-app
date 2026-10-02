import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { Input } from './Input';

import { Colors, FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

export interface MotivoModalProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: (motivo: string) => void;
}

/**
 * Modal de motivo obligatorio — rechazar/solicitar corrección en Gestión RH
 * SIEMPRE exige texto (AGENTS.md secciones 9/10/12: "motivo obligatorio").
 * Reutilizable en solicitudes, vacaciones, documentos e incorporaciones —
 * un solo componente en vez de repetir el mismo formulario cuatro veces.
 */
export function MotivoModal({ visible, title, description, confirmLabel, submitting = false, onCancel, onConfirm }: MotivoModalProps) {
  const styles = useEstilos(crearEstilos);
  const insets = useSafeAreaInsets();
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (visible) return undefined;
    const timer = setTimeout(() => setMotivo(''), 0);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleConfirm = () => {
    const trimmed = motivo.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={submitting ? () => {} : onCancel}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={submitting ? undefined : onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <Input
            label="Motivo"
            placeholder="Escribe el motivo…"
            value={motivo}
            onChangeText={setMotivo}
            multiline
            numberOfLines={4}
            style={styles.textarea}
            editable={!submitting}
            autoFocus
          />
          <View style={styles.actions}>
            <Button title="Cancelar" variant="outline" onPress={onCancel} disabled={submitting} style={styles.actionButton} />
            <Button
              title={confirmLabel}
              variant="danger"
              onPress={handleConfirm}
              disabled={submitting || motivo.trim().length === 0}
              loading={submitting}
              style={styles.actionButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: -Spacing.sm,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
