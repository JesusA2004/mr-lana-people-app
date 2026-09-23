import { Input } from '../Input';

import { DateField } from './DateField';
import { MoneyField } from './MoneyField';

import { requestFieldCopy, specialFieldKind } from '@/constants/requestTypes';
import type { SolicitudCampo } from '@/types/request';
import { fromApiDateString, toApiDateString } from '@/utils/dates';

export interface DynamicRequestFieldProps {
  campo: SolicitudCampo;
  /** Valor actual; las fechas viajan siempre como `YYYY-MM-DD`, nunca como `Date`. */
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  error?: string;
}

/**
 * Dibuja UN campo de `campos[]` con el control que corresponde. Todo el
 * formulario de "Nueva solicitud" se construye recorriendo `campos[]` y
 * renderizando este componente — no hay un switch gigante dentro de la
 * pantalla ni un formulario hardcodeado por tipo (sección 6/37).
 *
 * Orden de decisión:
 *   1. Campos con control dedicado por su significado (`monto_solicitado` → dinero).
 *   2. El `type` que mandó el backend (`date`/`number`/`select`/`text`).
 *   3. Texto, para cualquier `type` futuro que la app todavía no conozca —
 *      el usuario puede seguir enviando la solicitud.
 */
export function DynamicRequestField({
  campo,
  value,
  onChange,
  error,
}: DynamicRequestFieldProps) {
  const copy = requestFieldCopy(campo.name);
  const label = campo.required ? copy.label : copy.label.includes('opcional') ? copy.label : `${copy.label} (opcional)`;

  if (specialFieldKind(campo) === 'money') {
    return (
      <MoneyField
        label={label}
        value={typeof value === 'number' ? value : value ? Number(value) : undefined}
        onChange={(next) => onChange(next)}
        error={error}
        helper={copy.helper}
        placeholder={copy.placeholder}
      />
    );
  }

  if (campo.type === 'date') {
    return (
      <DateField
        label={label}
        value={typeof value === 'string' ? fromApiDateString(value) : undefined}
        onChange={(date) => onChange(toApiDateString(date))}
        error={error}
        helper={copy.helper}
      />
    );
  }

  if (campo.type === 'number') {
    return (
      <Input
        label={label}
        placeholder={copy.placeholder}
        keyboardType="number-pad"
        inputMode="numeric"
        value={value === undefined ? '' : String(value)}
        onChangeText={(text) => {
          const digits = text.replace(/[^0-9]/g, '');
          onChange(digits === '' ? undefined : Number(digits));
        }}
        error={error ?? undefined}
      />
    );
  }

  // `select` sin catálogo conocido cae aquí a propósito: mejor un campo de
  // texto que el usuario pueda llenar que un desplegable vacío. Si el
  // backend empieza a mandar opciones dentro de `campos[]`, este es el
  // único lugar que hay que tocar.
  return (
    <Input
      label={label}
      placeholder={copy.placeholder}
      value={value === undefined ? '' : String(value)}
      onChangeText={(text) => onChange(text)}
      error={error ?? undefined}
      multiline={copy.multiline}
      style={copy.multiline ? { minHeight: 96, textAlignVertical: 'top' } : undefined}
    />
  );
}
