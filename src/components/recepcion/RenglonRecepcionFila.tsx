import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FilterChips } from '@/components/ciclo/FilterChips';
import { Field, FormSheet } from '@/components/ciclo/FormSheet';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { EstadoRenglonRecepcion, MarcarRecepcionPayload, RenglonRecepcion } from '@/types/recepcionDocumental';
import { esRecibido } from '@/utils/recepcionDocumental';

export interface RenglonRecepcionFilaProps {
  renglon: RenglonRecepcion;
  /** `permisos.recibir` del corte (permiso + corte no cerrado): sin él no hay casilla. */
  puedeRecibir: boolean;
  /** `permisos.observar`: observación / no recibido / no aplica. */
  puedeObservar: boolean;
  onTocar: (renglon: RenglonRecepcion) => void;
  onMas: (renglon: RenglonRecepcion) => void;
}

/** Un original esperado: casilla grande para palomear de un toque y «…» para observar. */
export function RenglonRecepcionFila({ renglon, puedeRecibir, puedeObservar, onTocar, onMas }: RenglonRecepcionFilaProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const recibido = esRecibido(renglon.estado);
  const incidencia = renglon.estado === 'no_recibido' || renglon.estado === 'recibido_con_observacion';
  const detalle = renglon.estado === 'no_aplica' ? renglon.justificacion : renglon.observaciones;
  const cantidad = renglon.cantidad_esperada > 1 ? ` · ${renglon.cantidad_recibida} de ${renglon.cantidad_esperada}` : '';
  const icono = recibido ? 'checkmark-circle' : renglon.estado === 'no_aplica' ? 'remove-circle-outline' : incidencia ? 'alert-circle' : 'ellipse-outline';
  const color = recibido ? Colors.success : incidencia ? Colors.warning : Colors.textMuted;

  return (
    <View style={styles.fila}>
      {puedeRecibir ? (
        <Pressable
          testID={`casilla-${renglon.id}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: recibido }}
          accessibilityLabel={`${renglon.tipo_etiqueta}: ${recibido ? 'recibido. Toca para regresarlo a pendiente' : 'marcar como recibido'}`}
          hitSlop={8}
          onPress={() => onTocar(renglon)}
          style={({ pressed }) => [styles.casilla, recibido ? styles.casillaMarcada : null, pressed ? styles.presionado : null]}>
          {recibido ? <Ionicons name="checkmark" size={26} color={Colors.white} /> : null}
        </Pressable>
      ) : (
        <View style={styles.estadoIcono} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons name={icono} size={24} color={color} />
        </View>
      )}
      <View style={styles.textos}>
        <Text style={styles.tipo}>{renglon.tipo_etiqueta}</Text>
        <Text style={[styles.estado, { color }]}>{`${renglon.estado_etiqueta}${cantidad}`}</Text>
        {detalle ? <Text style={styles.detalle}>{detalle}</Text> : null}
      </View>
      {puedeObservar ? (
        <Pressable
          testID={`mas-${renglon.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Más opciones de ${renglon.tipo_etiqueta}`}
          hitSlop={8}
          onPress={() => onMas(renglon)}
          style={({ pressed }) => [styles.mas, pressed ? styles.presionado : null]}>
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const OPCIONES: { value: Exclude<EstadoRenglonRecepcion, 'pendiente' | 'recibido'>; label: string }[] = [
  { value: 'recibido_con_observacion', label: 'Llegó con observación' },
  { value: 'no_recibido', label: 'No recibido' },
  { value: 'no_aplica', label: 'No aplica' },
];

export interface MarcarRecepcionSheetProps {
  renglon: RenglonRecepcion | null;
  onCancel: () => void;
  onConfirm: (renglon: RenglonRecepcion, payload: MarcarRecepcionPayload) => void;
}

/**
 * Observación / No recibido / No aplica con motivo obligatorio (el backend
 * exige `observaciones` o `justificacion` y lo vuelve a validar).
 */
export function MarcarRecepcionSheet({ renglon, onCancel, onConfirm }: MarcarRecepcionSheetProps) {
  const [estado, setEstado] = useState<(typeof OPCIONES)[number]['value']>('recibido_con_observacion');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (renglon) return undefined;
    const t = setTimeout(() => {
      setEstado('recibido_con_observacion');
      setMotivo('');
    }, 0);
    return () => clearTimeout(t);
  }, [renglon]);

  const texto = motivo.trim();
  const etiqueta = estado === 'no_aplica' ? 'Por qué no aplica' : estado === 'no_recibido' ? 'Por qué no llegó' : 'Qué llegó mal';

  return (
    <FormSheet
      visible={renglon !== null}
      title={renglon ? renglon.tipo_etiqueta : ''}
      description={renglon ? `${renglon.colaborador.nombre}${renglon.evento_descripcion ? ` · ${renglon.evento_descripcion}` : ''}` : undefined}
      confirmLabel="Guardar"
      confirmDisabled={texto === ''}
      onCancel={onCancel}
      onConfirm={() => {
        if (!renglon || texto === '') return;
        onConfirm(renglon, estado === 'no_aplica' ? { estado, justificacion: texto } : { estado, observaciones: texto });
      }}>
      <FilterChips options={OPCIONES} value={estado} onChange={setEstado} />
      <Field label={`${etiqueta} (obligatorio)`} value={motivo} onChangeText={setMotivo} multiline maxLength={2000} placeholder="Escribe el motivo" />
    </FormSheet>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, minHeight: Layout.minTouchTarget },
    casilla: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      borderWidth: 2,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    casillaMarcada: { backgroundColor: Colors.success, borderColor: Colors.success },
    estadoIcono: { width: 44, alignItems: 'center' },
    presionado: { opacity: 0.6 },
    textos: { flex: 1, gap: 2 },
    tipo: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    estado: { fontSize: FontSize.sm, fontWeight: '600' },
    detalle: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 19 },
    mas: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full },
  });
