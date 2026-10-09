import { Input } from '../Input';

import { DateField } from './DateField';
import { DiasVacacionesPicker } from './DiasVacacionesPicker';
import { MoneyField } from './MoneyField';
import { OpcionesField } from './OpcionesField';
import { TimeField } from './TimeField';

import { campoCopy, specialFieldKind } from '@/constants/requestTypes';
import type { SolicitudCampo } from '@/types/request';
import { fromApiDateString, toApiDateString } from '@/utils/dates';

export interface DynamicRequestFieldProps {
  campo: SolicitudCampo;
  /** Valor actual; las fechas viajan siempre como `YYYY-MM-DD`, nunca como `Date`. Lista de días para `dates`. */
  value: string | number | string[] | undefined;
  onChange: (value: string | number | string[] | undefined) => void;
  error?: string;
  /** `dates` (vacaciones): días de la semana que no se pueden elegir (0 = domingo). */
  diasNoSeleccionables?: number[];
}

/**
 * Dibuja UN campo de `campos[]` con el control que corresponde. Todo el
 * formulario de "Nueva solicitud" se construye recorriendo `campos[]` y
 * renderizando este componente — no hay un switch gigante dentro de la
 * pantalla ni un formulario hardcodeado por tipo (sección 6/37).
 *
 * Orden de decisión:
 *   1. Campos con control dedicado por su significado (`monto_solicitado` → dinero).
 *   2. El `type` que mandó el backend (`date`/`time`/`opciones`/`number`/`text`).
 *   3. Texto, para cualquier `type` futuro que la app todavía no conozca —
 *      el usuario puede seguir enviando la solicitud.
 */
export function DynamicRequestField({
  campo,
  value,
  onChange,
  error,
  diasNoSeleccionables,
}: DynamicRequestFieldProps) {
  const copy = campoCopy(campo);
  const helper = copy.helper ?? campo.ayuda;
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

  if (campo.type === 'dates') {
    return (
      <DiasVacacionesPicker
        label={label}
        value={Array.isArray(value) ? value : []}
        onChange={(dias) => onChange(dias)}
        diasNoSeleccionables={diasNoSeleccionables}
        maximo={campo.max}
        helper={helper}
        error={error}
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
        helper={helper}
      />
    );
  }

  if (campo.type === 'opciones' && campo.opciones) {
    return (
      <OpcionesField
        label={label}
        value={typeof value === 'string' ? value : undefined}
        opciones={campo.opciones}
        onChange={(next) => onChange(next)}
        error={error}
        helper={helper}
      />
    );
  }

  if (campo.type === 'time') {
    return <TimeField label={label} value={typeof value === 'string' ? value : undefined} onChange={(next) => onChange(next)} error={error} helper={helper} />;
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
