import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '../PressableScale';

import { FontSize, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';

export interface DiasVacacionesPickerProps {
  label: string;
  /** Días elegidos `YYYY-MM-DD`, ordenados. */
  value: string[];
  onChange: (dias: string[]) => void;
  /** Días de la semana que no se pueden elegir (0 = domingo, regla MR. LANA). */
  diasNoSeleccionables?: number[];
  maximo?: number;
  helper?: string;
  error?: string;
}

const NOMBRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function iso(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function etiqueta(clave: string): string {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Vacaciones por días específicos: el colaborador toca los días que quiere
 * (no un rango). Domingos y días pasados no se pueden elegir; el backend
 * vuelve a validar todo (FechasSolicitudService).
 */
export function DiasVacacionesPicker({ label, value, onChange, diasNoSeleccionables = [0], maximo = 60, helper, error }: DiasVacacionesPickerProps) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [mes, setMes] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const seleccion = useMemo(() => new Set(value), [value]);

  const celdas = useMemo(() => {
    const desfase = (mes.getDay() + 6) % 7;
    const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const lista: (Date | null)[] = Array.from({ length: desfase }, () => null);
    for (let dia = 1; dia <= total; dia++) lista.push(new Date(mes.getFullYear(), mes.getMonth(), dia));
    return lista;
  }, [mes]);

  const deshabilitado = (fecha: Date) => fecha < hoy || diasNoSeleccionables.includes(fecha.getDay());

  const alternar = (fecha: Date) => {
    if (deshabilitado(fecha)) return;
    const clave = iso(fecha);
    const nueva = new Set(seleccion);
    if (nueva.has(clave)) nueva.delete(clave);
    else if (nueva.size < maximo) nueva.add(clave);
    onChange([...nueva].sort());
  };

  const puedeRetroceder = mes.getFullYear() > hoy.getFullYear() || mes.getMonth() > hoy.getMonth();
  const titulo = mes.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}

      <View style={styles.calendario}>
        <View style={styles.cabecera}>
          <PressableScale
            accessibilityLabel="Mes anterior"
            haptic={false}
            disabled={!puedeRetroceder}
            onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
            style={[styles.flecha, !puedeRetroceder && { opacity: 0.3 }] as object}>
            <Ionicons name="chevron-back" size={18} color={Colors.text} />
          </PressableScale>
          <Text style={styles.titulo}>{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</Text>
          <PressableScale accessibilityLabel="Mes siguiente" haptic={false} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} style={styles.flecha}>
            <Ionicons name="chevron-forward" size={18} color={Colors.text} />
          </PressableScale>
        </View>

        <View style={styles.fila}>
          {NOMBRES.map((n, i) => (
            <Text key={i} style={styles.nombreDia}>
              {n}
            </Text>
          ))}
        </View>

        <View style={styles.rejilla}>
          {celdas.map((fecha, i) => {
            if (!fecha) return <View key={`v-${i}`} style={styles.celda} />;
            const clave = iso(fecha);
            const elegido = seleccion.has(clave);
            const bloqueado = deshabilitado(fecha);
            return (
              <View key={clave} style={styles.celda}>
                <PressableScale
                  haptic={!bloqueado}
                  disabled={bloqueado}
                  accessibilityRole="button"
                  accessibilityLabel={`${etiqueta(clave)}${elegido ? ', seleccionado' : ''}${bloqueado && fecha.getDay() === 0 ? ', domingo no cuenta como vacaciones' : ''}`}
                  onPress={() => alternar(fecha)}
                  style={[styles.dia, elegido && styles.diaElegido, bloqueado && styles.diaBloqueado] as object}>
                  <Text style={[styles.diaTexto, elegido && styles.diaTextoElegido, bloqueado && styles.diaTextoBloqueado] as object}>{fecha.getDate()}</Text>
                </PressableScale>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.contador}>
        Días seleccionados: <Text style={styles.contadorNumero}>{value.length}</Text>
      </Text>
      {value.length > 0 ? (
        <View style={styles.chips}>
          {value.map((dia) => (
            <PressableScale key={dia} accessibilityLabel={`Quitar ${etiqueta(dia)}`} haptic={false} onPress={() => onChange(value.filter((d) => d !== dia))} style={styles.chip}>
              <Text style={styles.chipTexto}>{etiqueta(dia)}</Text>
              <Ionicons name="close" size={12} color={Colors.primaryDark} />
            </PressableScale>
          ))}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    wrap: { gap: Spacing.xs },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
    helper: { fontSize: FontSize.xs, color: Colors.textMuted },
    calendario: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.sm, backgroundColor: Colors.surface },
    cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
    flecha: { padding: Spacing.xs },
    titulo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    fila: { flexDirection: 'row' },
    nombreDia: { width: `${100 / 7}%`, textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted },
    rejilla: { flexDirection: 'row', flexWrap: 'wrap' },
    celda: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
    dia: { flex: 1, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    diaElegido: { backgroundColor: Colors.primary },
    diaBloqueado: { opacity: 0.35 },
    diaTexto: { fontSize: FontSize.sm, color: Colors.text },
    diaTextoElegido: { color: Colors.white, fontWeight: '700' },
    diaTextoBloqueado: { textDecorationLine: 'line-through' },
    contador: { fontSize: FontSize.sm, color: Colors.text },
    contadorNumero: { fontWeight: '700' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.primarySoft },
    chipTexto: { fontSize: FontSize.xs, color: Colors.primaryDark },
    error: { fontSize: FontSize.xs, color: Colors.danger },
  });
