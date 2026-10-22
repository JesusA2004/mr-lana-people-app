import { Modal, ScrollView, StyleSheet, Text, View, type TextInputProps } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paddingInferiorBarra } from '@/components/BarraAccionInferior';
import { Button } from '@/components/Button';
import { MODO_CIERRE_TECLADO } from '@/components/FormularioScroll';
import { Input } from '@/components/Input';
import { FontSize, LineHeight, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useEstilos } from '@/theme/ThemeProvider';

export interface FormSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  submitting?: boolean;
  confirmDisabled?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}

/**
 * Hoja modal con campos para acciones que requieren datos (envío físico,
 * firma física, pago, cálculo de finiquito...). Evita pantallas gigantes de
 * formulario: cada acción pide solo lo que su FormRequest exige.
 */
export function FormSheet({
  visible,
  title,
  description,
  confirmLabel,
  submitting = false,
  confirmDisabled = false,
  destructive = false,
  onCancel,
  onConfirm,
  children,
}: FormSheetProps) {
  const styles = useEstilos(crearEstilos);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={submitting ? undefined : onCancel}>
      {/* keyboard-controller: la hoja (y sus botones) sube sobre el teclado en Android e iOS. */}
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: paddingInferiorBarra(insets.bottom) }]}>
          <View style={styles.asa} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={MODO_CIERRE_TECLADO} contentContainerStyle={styles.fields}>
            {children}
          </ScrollView>
          <View style={styles.actions}>
            <Button title="Cancelar" variant="outline" onPress={onCancel} disabled={submitting} style={styles.flex} />
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={submitting}
              disabled={confirmDisabled}
              style={styles.flex}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
}

/**
 * Campo de la hoja: es el `Input` estándar (anillo de foco, «Siguiente»
 * encadena al siguiente campo, multilínea que crece, error anunciado).
 */
export function Field({ label, error, ...props }: FieldProps) {
  return <Input label={label} error={error} {...props} />;
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
      padding: Spacing.lg,
      paddingTop: Spacing.sm,
      gap: Spacing.sm,
      maxHeight: '90%',
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
    },
    asa: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: Radius.full,
      backgroundColor: Colors.border,
      marginBottom: Spacing.sm,
    },
    title: {
      fontSize: FontSize.lg,
      lineHeight: LineHeight.lg,
      fontWeight: '800',
      color: Colors.text,
    },
    description: {
      fontSize: FontSize.sm,
      lineHeight: LineHeight.sm,
      color: Colors.textMuted,
    },
    fields: {
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    flex: {
      flex: 1,
    },
  });
