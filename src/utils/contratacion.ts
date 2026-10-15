import type { ContratacionQr, IniciarContratacionPayload } from '@/types/rhCandidato';
import { formatDateTime, toApiDateString } from '@/utils/dates';

export const MODALIDADES_CONTRATACION: { value: IniciarContratacionPayload['tipo_contratacion']; label: string }[] = [
  { value: 'capacitacion_inicial', label: 'Capacitación inicial' },
  { value: 'indeterminado', label: 'Tiempo indeterminado' },
];

export interface ContratacionFormState {
  sueldo: string;
  fechaIngreso: Date;
  modalidad: IniciarContratacionPayload['tipo_contratacion'];
  fechaFin: Date | null;
}

/**
 * Arma el payload de `ContratarCandidatoRequest`. Solo lo laboral: la plaza
 * (sucursal/puesto) la toma el backend de la vacante. Devuelve el error a
 * mostrar si el sueldo no es un número válido.
 */
export function buildIniciarContratacionPayload(form: ContratacionFormState): { payload: IniciarContratacionPayload } | { error: string } {
  const sueldo = Number(form.sueldo.replace(/[$,\s]/g, ''));

  if (form.sueldo.trim() === '' || !Number.isFinite(sueldo) || sueldo < 0) {
    return { error: 'Captura el sueldo mensual (solo números).' };
  }

  if (form.fechaFin && toApiDateString(form.fechaFin) < toApiDateString(form.fechaIngreso)) {
    return { error: 'El fin del periodo no puede ser antes de la fecha de ingreso.' };
  }

  return {
    payload: {
      sueldo_mensual: sueldo,
      fecha_ingreso: toApiDateString(form.fechaIngreso),
      tipo_contratacion: form.modalidad,
      fecha_fin_contrato: form.fechaFin ? toApiDateString(form.fechaFin) : null,
    },
  };
}

/** Texto para compartir la liga de registro por WhatsApp/correo. */
export function mensajeCompartirQr(qr: ContratacionQr, nombre?: string | null): string {
  const saludo = nombre ? `Hola ${nombre}: ` : '';
  const vigencia = qr.expira_en ? ` Vence el ${formatDateTime(qr.expira_en)}.` : '';

  return `${saludo}abre esta liga para crear tu cuenta en MR. LANA PEOPLE y continuar tu contratación (es personal y de un solo uso).${vigencia}\n${qr.registro_url}`;
}
