import type { AxiosError } from 'axios';

import type { ApiErrorPayload } from '@/types/api';

export interface NormalizedError {
  message: string;
  status?: number;
  validationErrors?: Record<string, string[]>;
  /** true cuando la petición nunca llegó a obtener respuesta del servidor (sin conexión, IP incorrecta, timeout, servidor caído). */
  isNetworkError?: boolean;
}

const FRIENDLY_NETWORK_MESSAGE = 'Tenemos problemas para conectar con el servidor. Inténtalo más tarde.';

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
      case 422:
        return {
          message: data?.message ?? 'Revisa los datos ingresados.',
          status,
          validationErrors: data?.errors,
        };
      case 500:
        return { message: 'Ocurrió un error en el servidor. Intenta más tarde.', status };
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

/** Log técnico para desarrollo. Nunca debe recibir tokens ni contraseñas. */
export function logError(context: string, error: unknown): void {
  if (__DEV__) {
    console.error(`[${context}]`, normalizeError(error), error);
  }
}

/**
 * Detalle técnico ("GET /colaborador/expediente → 404") para mostrar SOLO en
 * DEV cuando una pantalla depende de un endpoint que el backend todavía no
 * agregó (AGENTS.md sección 29: "no degradar toda la UI a próximamente", en
 * DEV sí mostrar un mensaje técnico claro). Nunca se muestra en producción.
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
