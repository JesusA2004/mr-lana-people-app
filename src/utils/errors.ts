import type { AxiosError } from 'axios';

import type { ApiErrorPayload } from '@/types/api';

export interface NormalizedError {
  message: string;
  status?: number;
  validationErrors?: Record<string, string[]>;
  /** true cuando la petición nunca llegó a obtener respuesta del servidor (sin conexión, IP incorrecta, timeout, servidor caído). */
  isNetworkError?: boolean;
  /**
   * 422 del motor documental por plantilla faltante/inactiva/inválida
   * (`MotorDocumentalService`, error de validación en la clave
   * `plantilla`). No es un "error inesperado": falta configuración que
   * RH/Jurídico debe cargar.
   */
  isMissingTemplate?: boolean;
  /** Mensaje original del backend cuando `message` es una versión amigable del mismo problema. */
  detail?: string;
}

const FRIENDLY_NETWORK_MESSAGE = 'Tenemos problemas para conectar con el servidor. Inténtalo más tarde.';

export const MISSING_TEMPLATE_MESSAGE =
  'Este documento todavía no tiene una plantilla configurada. Solicita a RH o Jurídico que cargue el formato correspondiente.';

/**
 * true cuando un 422 viene del motor documental por la plantilla (la clave
 * de validación es `plantilla`). Es la señal estable del backend — nunca se
 * detecta por el texto del mensaje.
 */
export function isMissingTemplatePayload(errors: Record<string, string[]> | undefined): boolean {
  return !!errors && Array.isArray(errors.plantilla) && errors.plantilla.length > 0;
}

function isAxiosError(error: unknown): error is AxiosError<ApiErrorPayload> {
  return typeof error === 'object' && error !== null && (error as { isAxiosError?: unknown }).isAxiosError === true;
}

/**
 * Convierte cualquier error (Axios/Laravel u otro) en un mensaje entendible
 * para el usuario final. Nunca expone stack traces, HTML de Laravel ni JSON
 * crudo — esos detalles solo se registran vía `logError` en desarrollo.
 *
 * Cualquier falla de red (servidor apagado, IP incorrecta, sin internet,
 * timeout) cae siempre en el mismo mensaje amistoso: nunca debe "tronar" la
 * app ni mostrar detalles técnicos.
 */
export function normalizeError(error: unknown): NormalizedError {
  if (isAxiosError(error)) {
    if (!error.response) {
      return { message: FRIENDLY_NETWORK_MESSAGE, isNetworkError: true };
    }

    const { status, data } = error.response;

    switch (status) {
      case 401:
        return { message: 'Tu sesión ha expirado. Vuelve a iniciar sesión.', status };
      case 403:
        return { message: 'No tienes permisos para realizar esta acción.', status };
      case 404:
        return { message: 'No se encontró la información solicitada.', status };
      case 409:
        return { message: 'Esta información cambió mientras tanto. Actualiza la pantalla e inténtalo de nuevo.', status };
      case 422:
        if (isMissingTemplatePayload(data?.errors)) {
          return {
            message: MISSING_TEMPLATE_MESSAGE,
            status,
            validationErrors: data?.errors,
            isMissingTemplate: true,
            // El texto del backend es seguro (ya en español, sin rutas ni datos sensibles): nombra la plantilla concreta.
            detail: data?.errors?.plantilla?.[0] ?? data?.message,
          };
        }
        return {
          message: data?.message ?? 'Revisa los datos ingresados.',
          status,
          validationErrors: data?.errors,
        };
      case 429:
        return { message: 'Hiciste demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo.', status };
      case 500:
        return { message: 'Ocurrió un error en el servidor. Intenta más tarde.', status };
      case 503:
        return { message: 'Estamos realizando mantenimiento. Intenta de nuevo en unos minutos.', status };
      default:
        return { message: data?.message ?? 'Ocurrió un error inesperado.', status };
    }
  }

  return { message: 'Ocurrió un error inesperado.' };
}

export function getErrorMessage(error: unknown): string {
  return normalizeError(error).message;
}

export function getValidationErrors(error: unknown): Record<string, string[]> | undefined {
  return normalizeError(error).validationErrors;
}

/** Primer mensaje de validación de un campo (422) — para pintarlo debajo del input correspondiente. */
export function getFieldError(error: unknown, field: string): string | undefined {
  return normalizeError(error).validationErrors?.[field]?.[0];
}

/**
 * Mensaje para un toast/alerta de acción: el amigable y, si el backend dio
 * un detalle concreto (ej. qué plantilla falta), ambos.
 */
export function getActionErrorMessage(error: unknown): string {
  const normalized = normalizeError(error);
  return normalized.detail && normalized.detail !== normalized.message ? `${normalized.message}\n\n${normalized.detail}` : normalized.message;
}

/** true si el error es un 404 real de Axios — usado por endpoints donde "no existe hoy" es un estado válido (ej. sin felicitación de cumpleaños). */
export function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

/** true si el error es un 409/422 de "esta información cambió mientras tanto" — doble aprobación RH concurrente (AGENTS.md sección 65). */
export function isConcurrencyConflict(error: unknown): boolean {
  return isAxiosError(error) && (error.response?.status === 409 || error.response?.status === 422);
}

/** Log técnico para desarrollo. Nunca debe recibir tokens ni contraseñas. */
export function logError(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[${context}]`, normalizeError(error), error);
  }
}

/**
 * Detalle técnico ("GET /colaborador/incorporacion → 404") para mostrar SOLO
 * en DEV cuando una pantalla depende de un endpoint que el backend todavía
 * no agregó (AGENTS.md sección 29: "no degradar toda la UI a próximamente",
 * en DEV sí mostrar un mensaje técnico claro). Nunca se muestra en
 * producción.
 */
export function getDevErrorDetail(error: unknown): string | undefined {
  if (!__DEV__) return undefined;
  if (!isAxiosError(error)) return undefined;

  const method = error.config?.method?.toUpperCase();
  const url = error.config?.url;
  const status = error.response?.status;

  if (!method || !url) return undefined;
  return status ? `${method} ${url} → ${status}` : `${method} ${url} → sin respuesta del servidor`;
}
