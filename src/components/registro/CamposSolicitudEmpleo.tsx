import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DateField } from '@/components/forms/DateField';
import { OpcionesField } from '@/components/forms/OpcionesField';
import { SelectField } from '@/components/forms/SelectField';
import { Input } from '@/components/Input';
import { PressableScale } from '@/components/PressableScale';
import { FontSize, Layout, Radius, Spacing, type ColorPalette } from '@/constants/colors';
import { useColores, useEstilos } from '@/theme/ThemeProvider';
import type { CampoListaSolicitud, CampoSolicitud, ListaSolicitud, OpcionSolicitud, TipoCampoSolicitud } from '@/types/solicitudEmpleo';
import { fromApiDateString, toApiDateString } from '@/utils/dates';
import { haptics } from '@/utils/haptics';
import { puedeAgregarFila, visibleEnFila, type FormaSeccion, type ValorForma } from '@/utils/solicitudEmpleoWizard';

const SI_NO: OpcionSolicitud[] = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
];

/** Más de estas opciones → hoja con buscador. */
const OPCIONES_PARA_BUSCAR = 8;

function esTelefono(campo: string): boolean {
  return campo.includes('telefono');
}

/** «2021-03» mientras se teclea: solo números y el guion se pone solo. */
export function formatearMes(texto: string): string {
  const digitos = texto.replace(/[^0-9]/g, '').slice(0, 6);
  return digitos.length > 4 ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : digitos;
}

/** Montos: números con un punto decimal opcional (máx. 2 decimales). */
export function limpiarMonto(texto: string): string {
  const limpio = texto.replace(/[^0-9.]/g, '');
  const [entero, ...resto] = limpio.split('.');
  return resto.length === 0 ? entero : `${entero}.${resto.join('').slice(0, 2)}`;
}

interface ControlProps {
  campo: string;
  etiqueta: string;
  tipo: TipoCampoSolicitud;
  opciones: OpcionSolicitud[];
  max: number | null;
  valor: ValorForma | undefined;
  error?: string;
  ayuda?: string | null;
  onChange: (valor: ValorForma) => void;
}

/** Un control según el tipo del catálogo (texto, número, monto, sí/no, opciones, fecha, mes). */
export function ControlSolicitud({ campo, etiqueta, tipo, opciones, max, valor, error, ayuda, onChange }: ControlProps) {
  const texto = typeof valor === 'string' ? valor : '';
  const ayudaTexto = ayuda ?? undefined;

  if (tipo === 'booleano') {
    return (
      <OpcionesField
        label={etiqueta}
        value={valor === true ? 'si' : valor === false ? 'no' : undefined}
        opciones={SI_NO}
        onChange={(v) => onChange(v === 'si')}
        error={error}
        helper={ayudaTexto}
      />
    );
  }

  if (tipo === 'select') {
    return opciones.length > 4 ? (
      <SelectField
        label={etiqueta}
        value={texto || undefined}
        options={opciones}
        onChange={onChange}
        error={error}
        helper={ayudaTexto}
        placeholder="Elige una opción"
        buscable={opciones.length > OPCIONES_PARA_BUSCAR}
      />
    ) : (
      <OpcionesField label={etiqueta} value={texto || undefined} opciones={opciones} onChange={onChange} error={error} helper={ayudaTexto} />
    );
  }

  if (tipo === 'multiselect') {
    return <MultiOpciones etiqueta={etiqueta} opciones={opciones} valor={Array.isArray(valor) ? valor : []} onChange={onChange} error={error} ayuda={ayudaTexto} />;
  }

  if (tipo === 'fecha') {
    return (
      <DateField
        label={etiqueta}
        value={texto ? fromApiDateString(texto) : undefined}
        onChange={(fecha) => onChange(toApiDateString(fecha))}
        error={error}
        helper={ayudaTexto}
        placeholder="Elige la fecha"
      />
    );
  }

  if (tipo === 'entero') {
    return (
      <Input
        label={etiqueta}
        value={texto}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={7}
        error={error}
        hint={ayudaTexto}
      />
    );
  }

  if (tipo === 'moneda') {
    return (
      <Input
        label={etiqueta}
        value={texto}
        onChangeText={(t) => onChange(limpiarMonto(t))}
        keyboardType="decimal-pad"
        inputMode="decimal"
        leftIcon="cash-outline"
        placeholder="0"
        maxLength={11}
        error={error}
        hint={ayudaTexto ?? 'En pesos, al mes. Escribe 0 si no tienes ese gasto.'}
      />
    );
  }

  if (tipo === 'mes') {
    return (
      <Input
        label={etiqueta}
        value={texto}
        onChangeText={(t) => onChange(formatearMes(t))}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="AAAA-MM"
        maxLength={7}
        error={error}
        hint={ayudaTexto ?? 'Año y mes, por ejemplo 2021-03.'}
      />
    );
  }

  const telefono = esTelefono(campo);
  return (
    <Input
      label={etiqueta}
      value={texto}
      onChangeText={(t) => onChange(telefono ? t.replace(/[^0-9]/g, '') : t)}
      keyboardType={telefono ? 'phone-pad' : 'default'}
      textContentType={telefono ? 'telephoneNumber' : undefined}
      autoCapitalize="sentences"
      multiline={tipo === 'texto_largo'}
      maxLength={max ?? (tipo === 'texto_largo' ? 300 : 191)}
      placeholder={telefono ? '10 dígitos' : undefined}
      error={error}
      hint={ayudaTexto}
    />
  );
}

function MultiOpciones({
  etiqueta,
  opciones,
  valor,
  onChange,
  error,
  ayuda,
}: {
  etiqueta: string;
  opciones: OpcionSolicitud[];
  valor: string[];
  onChange: (valor: string[]) => void;
  error?: string;
  ayuda?: string;
}) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.grupo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.ayuda}>Puedes marcar varias.</Text>
      <View style={styles.chips}>
        {opciones.map((opcion) => {
          const activa = valor.includes(opcion.value);
          return (
            <Pressable
              key={opcion.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: activa }}
              accessibilityLabel={opcion.label}
              onPress={() => {
                haptics.selection();
                onChange(activa ? valor.filter((v) => v !== opcion.value) : [...valor, opcion.value]);
              }}
              style={({ pressed }) => [styles.chip, activa ? styles.chipActivo : null, pressed ? styles.presionado : null]}>
              <Ionicons name={activa ? 'checkbox' : 'square-outline'} size={18} color={activa ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.chipTexto, activa ? styles.chipTextoActivo : null]}>{opcion.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

/** Casilla «No aplica» / «No tengo…». */
export function CasillaSolicitud({ etiqueta, marcada, onCambiar }: { etiqueta: string; marcada: boolean; onCambiar: (marcada: boolean) => void }) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={etiqueta}
      onPress={() => {
        haptics.selection();
        onCambiar(!marcada);
      }}
      style={({ pressed }) => [styles.casilla, marcada ? styles.casillaActiva : null, pressed ? styles.presionado : null]}>
      <Ionicons name={marcada ? 'checkbox' : 'square-outline'} size={20} color={marcada ? Colors.primary : Colors.textMuted} />
      <Text style={[styles.casillaTexto, marcada ? styles.casillaTextoActiva : null]}>{etiqueta}</Text>
    </Pressable>
  );
}

/** Un dato de la sección con su «No aplica» y su marca de sugerencia. */
export function CampoSolicitudEmpleo({
  campo,
  valor,
  requerido,
  error,
  noAplica,
  sugerido,
  onChange,
  onNoAplica,
}: {
  campo: CampoSolicitud;
  valor: ValorForma | undefined;
  requerido: boolean;
  error?: string;
  noAplica: boolean;
  sugerido: boolean;
  onChange: (valor: ValorForma) => void;
  onNoAplica: (marcado: boolean) => void;
}) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const etiqueta = requerido || campo.permite_no_aplica ? campo.etiqueta : `${campo.etiqueta} (opcional)`;

  return (
    <View style={styles.grupo}>
      {sugerido && !noAplica ? (
        <View style={styles.sugerencia}>
          <Ionicons name="sparkles-outline" size={14} color={Colors.primaryDark} />
          <Text style={styles.sugerenciaTexto}>Lo prellenamos con lo que ya sabemos: confírmalo o cámbialo.</Text>
        </View>
      ) : null}
      {noAplica ? (
        <View style={styles.noAplica}>
          <Text style={styles.etiqueta}>{campo.etiqueta}</Text>
          <Text style={styles.ayuda}>Marcado como «No aplica».</Text>
        </View>
      ) : (
        <ControlSolicitud
          campo={campo.campo}
          etiqueta={etiqueta}
          tipo={campo.tipo}
          opciones={campo.opciones}
          max={campo.max}
          valor={valor}
          error={error}
          ayuda={campo.ayuda}
          onChange={onChange}
        />
      )}
      {campo.permite_no_aplica ? <CasillaSolicitud etiqueta="No aplica" marcada={noAplica} onCambiar={onNoAplica} /> : null}
      {noAplica && error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Lista editable (dependientes ≤6, empleos ≤3, referencias 2–4) con agregar/quitar y su «No tengo…». */
export function ListaSolicitudEditor({
  lista,
  forma,
  errores,
  onCambiarFila,
  onAgregar,
  onQuitar,
  onVacia,
}: {
  lista: ListaSolicitud;
  forma: FormaSeccion;
  errores: Record<string, string>;
  onCambiarFila: (indice: number, campo: string, valor: string) => void;
  onAgregar: () => void;
  onQuitar: (indice: number) => void;
  onVacia: (vacia: boolean) => void;
}) {
  const Colors = useColores();
  const styles = useEstilos(crearEstilos);
  const errorLista = errores[lista.clave];
  const singular = lista.singular.toLowerCase();

  if (lista.bloqueada) {
    return (
      <View style={styles.bloqueada}>
        <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.ayuda}>{`Recursos Humanos ya registró ${lista.etiqueta.toLowerCase()}. Si algo está mal, solicita una corrección cuando entres a la app.`}</Text>
      </View>
    );
  }

  return (
    <View style={styles.grupo}>
      <Text style={styles.etiqueta}>{lista.etiqueta}</Text>
      <Text style={styles.ayuda}>
        {lista.minimo > 0 ? `Captura de ${lista.minimo} a ${lista.maximo}.` : `Hasta ${lista.maximo}.`}
      </Text>
      {lista.bandera_vacia && lista.etiqueta_vacia ? <CasillaSolicitud etiqueta={lista.etiqueta_vacia} marcada={forma.vacia} onCambiar={onVacia} /> : null}

      {!forma.vacia
        ? forma.filas.map((fila, i) => (
            <View key={`${lista.clave}-${i}`} style={styles.fila}>
              <View style={styles.filaEncabezado}>
                <Text style={styles.filaTitulo}>{`${lista.singular} ${i + 1}`}</Text>
                <PressableScale accessibilityLabel={`Quitar ${singular} ${i + 1}`} haptic={false} onPress={() => onQuitar(i)} style={styles.quitar}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  <Text style={styles.quitarTexto}>Quitar</Text>
                </PressableScale>
              </View>
              {lista.campos
                .filter((c) => visibleEnFila(c, fila))
                .map((c: CampoListaSolicitud) => (
                  <ControlSolicitud
                    key={c.campo}
                    campo={c.campo}
                    etiqueta={c.requerido || c.campo === 'parentesco_otro' ? c.etiqueta : `${c.etiqueta} (opcional)`}
                    tipo={c.tipo}
                    opciones={c.opciones}
                    max={c.max}
                    valor={fila[c.campo] ?? ''}
                    error={errores[`${lista.clave}.${i}.${c.campo}`]}
                    onChange={(v) => onCambiarFila(i, c.campo, typeof v === 'string' ? v : '')}
                  />
                ))}
            </View>
          ))
        : null}

      {puedeAgregarFila(lista, forma) ? (
        <Button title={`Agregar ${singular}`} variant="outline" leftIcon="add-circle-outline" onPress={onAgregar} />
      ) : !forma.vacia && forma.filas.length >= lista.maximo ? (
        <Text style={styles.ayuda}>{`Ya capturaste el máximo que cabe en el formato (${lista.maximo}).`}</Text>
      ) : null}
      {errorLista ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {errorLista}
        </Text>
      ) : null}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    grupo: { gap: Spacing.sm },
    etiqueta: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
    ayuda: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
    error: { fontSize: FontSize.xs, color: Colors.danger, fontWeight: '600' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      minHeight: Layout.minTouchTarget,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    chipActivo: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
    chipTexto: { fontSize: FontSize.sm, color: Colors.text },
    chipTextoActivo: { fontWeight: '700', color: Colors.primaryDark },
    presionado: { opacity: 0.7 },
    casilla: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: Layout.minTouchTarget,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: Colors.surfaceMuted,
    },
    casillaActiva: { backgroundColor: Colors.primarySoft },
    casillaTexto: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
    casillaTextoActiva: { color: Colors.primaryDark, fontWeight: '700' },
    sugerencia: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      alignSelf: 'flex-start',
      backgroundColor: Colors.primarySoft,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    sugerenciaTexto: { fontSize: FontSize.xs, color: Colors.primaryDark, fontWeight: '600', flexShrink: 1 },
    noAplica: { gap: 2, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    fila: {
      gap: Spacing.md,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    filaEncabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    filaTitulo: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
    quitar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: Layout.minTouchTarget, paddingHorizontal: Spacing.sm },
    quitarTexto: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.danger },
    bloqueada: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: Spacing.md },
  });
