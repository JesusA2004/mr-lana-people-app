import type { AxiosError } from 'axios';

import type { ApiErrorPayload } from '@/types/api';

export interface NormalizedError {
  message: string;
  status?: number;
  validationErrors?: Record<string, string[]>;
  /** true cuando la petición no obtuvo respuesta del servidor. */
  isNetworkError?: boolean;
}

const FRIENDLY_NETWORK_MESSAGE = 'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';

function isAxiosError(error: unknown): error is AxiosError<ApiErrorPayload> {
  return typeof error === 'object' && error !== null && (error as { isAxiosError?: unknown }).isAxiosError === true;
}

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

/**
 * Log técnico de errores ya controlados por la interfaz.
 * Se usa console.warn para no disparar el overlay rojo de Expo/React Native
 * por errores esperados como credenciales inválidas, 422 o servidor local apagado.
 */
export function logError(context: string, error: unknown): void {
  if (!__DEV__) return;

  const normalized = normalizeError(error);
  if (isAxiosError(error)) {
    console.warn(`[${context}]`, {
      message: normalized.message,
      status: normalized.status,
      isNetworkError: normalized.isNetworkError,
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      code: error.code,
    });
    return;
  }

  console.warn(`[${context}]`, normalized);
}
