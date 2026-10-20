import { StyleSheet, Text, View } from 'react-native';

import { SelectField } from './SelectField';

import { Input } from '@/components/Input';
import { FontSize, Spacing, type ColorPalette } from '@/constants/colors';
import { ESTADOS_REPUBLICA } from '@/constants/estadosRepublica';
import { useEstilos } from '@/theme/ThemeProvider';
import {
  CAMPOS_DOMICILIO,
  ETIQUETAS_DOMICILIO,
  estadoOficial,
  maximoDomicilio,
  type CampoDomicilio,
  type ValoresDomicilio,
} from '@/utils/domicilio';

export interface DomicilioFieldsProps {
  valores: ValoresDomicilio;
  errores?: Partial<Record<string, string>>;
  onChange: (campo: CampoDomicilio, valor: string) => void;
  /** Solo estos campos (p. ej. los que faltan); por defecto, los siete. */
  campos?: readonly CampoDomicilio[];
  /** Opciones de estado que manda la API (respaldo: la lista local). */
  estados?: readonly string[];
  /** Valor vigente por campo: se muestra como ayuda («Actual: …»). */
  actuales?: ValoresDomicilio;
}

/**
 * Domicilio estructurado: calle, número exterior/interior, colonia, C.P.
 * (teclado numérico, 5 dígitos), municipio/alcaldía y estado (de la lista).
 */
export function DomicilioFields({ valores, errores = {}, onChange, campos = CAMPOS_DOMICILIO, estados = ESTADOS_REPUBLICA, actuales }: DomicilioFieldsProps) {
  const styles = useEstilos(crearEstilos);
  const opcionesEstado = estados.map((estado) => ({ value: estado, label: estado }));

  return (
    <View style={styles.campos}>
      {campos.map((campo) => {
        const actual = actuales?.[campo];
        const ayuda = actual ? <Text style={styles.actual}>{`Actual: ${actual}`}</Text> : null;

        if (campo === 'domicilio_estado') {
          return (
            <View key={campo} style={styles.campo}>
              <SelectField
                label={ETIQUETAS_DOMICILIO[campo]}
                value={estadoOficial(valores[campo], estados) || undefined}
                options={opcionesEstado}
                onChange={(valor) => onChange(campo, valor)}
                placeholder="Elige el estado"
                error={errores[campo]}
              />
              {ayuda}
            </View>
          );
        }

        const esCp = campo === 'domicilio_cp';

        return (
          <View key={campo} style={styles.campo}>
            <Input
              label={ETIQUETAS_DOMICILIO[campo]}
              value={valores[campo] ?? ''}
              onChangeText={(texto) => onChange(campo, esCp ? texto.replace(/[^0-9]/g, '').slice(0, 5) : texto)}
              keyboardType={esCp ? 'number-pad' : 'default'}
              autoCapitalize={esCp ? 'none' : 'words'}
              maxLength={maximoDomicilio(campo)}
              placeholder={esCp ? '5 dígitos' : campo === 'domicilio_numero_exterior' ? '123 o S/N' : undefined}
              textContentType={esCp ? 'postalCode' : campo === 'domicilio_calle' ? 'streetAddressLine1' : undefined}
              error={errores[campo]}
            />
            {ayuda}
          </View>
        );
      })}
    </View>
  );
}

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    campos: { gap: Spacing.lg },
    campo: { gap: Spacing.xs },
    actual: { fontSize: FontSize.xs, color: Colors.textMuted },
  });
