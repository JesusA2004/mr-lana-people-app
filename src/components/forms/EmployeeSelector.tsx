import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PressableScale } from '../PressableScale';

import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';
import { useRhColaboradores } from '@/hooks/queries/useRhColaboradores';

export interface EmployeeSelectorProps {
  label: string;
  value?: number;
  onChange: (id: number, nombre: string) => void;
  error?: string;
  helper?: string;
  /** Nombre ya elegido — para no perder el texto si la búsqueda se limpia. */
  selectedName?: string;
}

const DEBOUNCE_MS = 350;
const PER_PAGE = 20;

/**
 * Selector de colaborador para `colaborador_objetivo_id` (hoy solo lo pide
 * `baja_colaborador`). Consulta `GET /api/v1/rh/colaboradores?q=`, que ya
 * viene acotado por el alcance organizacional de quien pregunta — la app
 * NUNCA decide a quién puede ver: solo pinta lo que el backend devuelve.
 *
 * La búsqueda va con debounce y página acotada: nunca se cargan miles de
 * usuarios de golpe (sección 38).
 */
export function EmployeeSelector({ label, value, onChange, error, helper, selectedName }: EmployeeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const params = useMemo(() => ({ q: debounced || undefined, per_page: PER_PAGE }), [debounced]);
  const { data, isLoading, isError } = useRhColaboradores(params, open);
  const colaboradores = data?.data ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale
        haptic={false}
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={[styles.input, error && styles.inputError] as object}>
        <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
        <Text style={[styles.value, !selectedName && styles.placeholder]}>
          {selectedName ?? (value ? `Colaborador #${value}` : 'Busca un colaborador')}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </PressableScale>
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Elegir colaborador</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10} onPress={() => setOpen(false)}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Nombre, apellidos o número de empleado"
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={Colors.primary} />
          ) : isError ? (
            <Text style={styles.emptyText}>No pudimos cargar el directorio. Revisa tu conexión.</Text>
          ) : (
            <FlatList
              data={colaboradores}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
              ListEmptyComponent={<Text style={styles.emptyText}>No encontramos colaboradores con ese criterio.</Text>}
              renderItem={({ item }) => (
                <PressableScale
                  haptic={false}
                  onPress={() => {
                    onChange(item.id, item.nombre);
                    setOpen(false);
                  }}
                  style={[styles.row, item.id === value && styles.rowActive] as object}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>{item.nombre}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {[item.numero_empleado, item.puesto, item.sucursal].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                    </Text>
                  </View>
                  {item.id === value ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                </PressableScale>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
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
  modal: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, gap: Spacing.md },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  loader: { marginTop: Spacing.xl },
  listContent: { paddingBottom: Spacing.xxl },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  rowText: { flex: 1 },
  rowName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});
