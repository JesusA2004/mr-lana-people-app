import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paddingInferiorBarra } from '../BarraAccionInferior';
import { PressableScale } from '../PressableScale';
import { CampoBusqueda } from '../ui/CampoBusqueda';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  placeholder?: string;
  /** Buscador dentro de la hoja (catálogos largos): filtra al escribir, sin mínimo de letras. */
  buscable?: boolean;
}

/** Quita acentos y mayúsculas para buscar «basica» y encontrar «Básica». */
export function textoBuscable(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Opciones que coinciden con lo escrito (vacío = todas). */
export function filtrarOpciones(options: readonly SelectOption[], busqueda: string): SelectOption[] {
  const q = textoBuscable(busqueda);
  return q === '' ? [...options] : options.filter((o) => textoBuscable(o.label).includes(q));
}

/** Selector de opción única en hoja inferior — sin dependencias nativas extra, idéntico en Android/iOS. */
export function SelectField({ label, value, options, onChange, error, helper, placeholder = 'Selecciona una opción', buscable = false }: SelectFieldProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const visibles = buscable ? filtrarOpciones(options, busqueda) : options;
  const cerrar = () => {
    setOpen(false);
    setBusqueda('');
  };
  const insets = useSafeAreaInsets();
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale
        haptic={false}
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={[styles.input, error && styles.inputError] as object}>
        <Text style={[styles.value, !selected && styles.placeholder]}>{selected?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </PressableScale>
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={cerrar}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar" onPress={cerrar} />
          <View style={[styles.sheet, { paddingBottom: paddingInferiorBarra(insets.bottom) }]}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {buscable ? <CampoBusqueda value={busqueda} onChangeText={setBusqueda} placeholder={'Buscar en ' + label.toLowerCase()} /> : null}
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {buscable && visibles.length === 0 ? <Text style={styles.helper}>Sin coincidencias. Prueba con otra palabra.</Text> : null}
              {visibles.map((option) => {
                const active = option.value === value;
                return (
                  <PressableScale
                    key={option.value}
                    haptic={false}
                    onPress={() => {
                      onChange(option.value);
                      cerrar();
                    }}
                    style={[styles.option, active && styles.optionActive] as object}>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{option.label}</Text>
                    {active ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputError: { borderColor: Colors.danger },
  value: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  placeholder: { color: Colors.textMuted },
  error: { fontSize: FontSize.xs, color: Colors.danger, fontWeight: '600' },
  helper: { fontSize: FontSize.xs, color: Colors.textMuted },
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: '70%',
  },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  sheetScroll: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceMuted,
  },
  optionActive: { backgroundColor: Colors.primarySoft },
  optionLabel: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  optionLabelActive: { fontWeight: '700', color: Colors.primaryDark },
});
