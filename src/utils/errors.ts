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
  /** true cuando el dispositivo no tiene conexión (no solo que el servidor no respondió). */
  isOffline?: boolean;
}

const FRIENDLY_NETWORK_MESSAGE = 'Tenemos problemas para conectar con el servidor. Inténtalo más tarde.';
export const OFFLINE_MESSAGE = 'Necesitas conexión para continuar.';
const TIMEOUT_MESSAGE = 'El servidor tardó demasiado en responder. Inténtalo de nuevo.';
export const NOT_AVAILABLE_MESSAGE = 'Este elemento ya no está disponible.';

/**
 * Error propio de la app (no de Axios) con un mensaje YA pensado para el
 * usuario — p. ej. SecureStore no pudo guardar la sesión. `normalizeError`
 * lo respeta tal cual en vez de caer en "Ocurrió un error inesperado".
 */
export class AppError extends Error {
  readonly userMessage: string;

  constructor(userMessage: string, options?: { cause?: unknown }) {
    super(userMessage);
    this.name = 'AppError';
    this.userMessage = userMessage;
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

/**
 * Estado de conectividad conocido por la app (NetInfo → React Query
 * `onlineManager`, ver `bindQueryClientToNetworkStatus`). Se inyecta para no
 * acoplar este módulo puro a React Query y poder probarlo.
 */
let isDeviceOnline: () => boolean = () => true;
export function setConnectivityProbe(probe: () => boolean): void {
  isDeviceOnline = probe;
}

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

/**
 * Mensajes del backend que NO deben llegar al usuario (AGENTS/QA: nunca
 * "HTTP 422", nombres de clases, "Policy denied", trazas de JS). Los mensajes
 * de validación del backend ya vienen en español y se muestran tal cual.
 */
const TECHNICAL_MESSAGE_PATTERN =
  /(HTTP\s?\d{3}|Exception|SQLSTATE|Stack trace|This action is unauthorized|Unauthenticated|Policy|No query results for model|Cannot read propert|undefined is not|\bApp\\|GeneratedDocument|Server Error|^Not Found$|^Forbidden$|Too Many Attempts|Route \[)/i;

export function safeBackendMessage(message: unknown): string | undefined {
  if (typeof message !== 'string') return undefined;
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 400 || TECHNICAL_MESSAGE_PATTERN.test(trimmed)) return undefined;
  return trimmed;
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
  if (error instanceof AppError) {
    return { message: error.userMessage };
  }

  if (isAxiosError(error)) {
    if (!error.response) {
      // Sin respuesta: distinguir "no hay internet" (acción del usuario:
      // conectarse) de "el servidor no respondió a tiempo" y de "no llegamos
      // al servidor" — los tres siguen siendo isNetworkError (nunca 401).
      if (!isDeviceOnline()) return { message: OFFLINE_MESSAGE, isNetworkError: true, isOffline: true };
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return { message: TIMEOUT_MESSAGE, isNetworkError: true };
      return { message: FRIENDLY_NETWORK_MESSAGE, isNetworkError: true };
    }

    const { status, data } = error.response;

    switch (status) {
      case 401:
        return { message: 'Tu sesión ha expirado. Vuelve a iniciar sesión.', status };
      case 400:
        return { message: 'No pudimos procesar la solicitud. Revisa la información e inténtalo de nuevo.', status };
      case 403:
        return { message: safeBackendMessage(data?.message) ?? 'No tienes permiso para realizar esta acción.', status };
      case 404:
        return { message: safeBackendMessage(data?.message) ?? NOT_AVAILABLE_MESSAGE, status };
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
          message: safeBackendMessage(data?.message) ?? 'Revisa los datos marcados.',
          status,
          validationErrors: data?.errors,
        };
      case 429:
        return { message: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.', status };
      case 500:
        return { message: 'Ocurrió un error en el servidor. Intenta más tarde.', status };
      case 502:
      case 504:
        return { message: 'El servidor no está respondiendo en este momento. Intenta más tarde.', status };
      case 503:
        return { message: 'Estamos realizando mantenimiento. Intenta de nuevo en unos minutos.', status };
      default:
        if (status >= 500) return { message: 'Ocurrió un error en el servidor. Intenta más tarde.', status };
        return { message: safeBackendMessage(data?.message) ?? 'Ocurrió un error inesperado.', status };
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

/**
 * Fallas que NO dicen nada sobre la validez de la sesión: sin conexión,
 * timeout, servidor caído (5xx) o limitado (429). Ante estas nunca se borra
 * un token persistido — solo un 401 real (o un rechazo definitivo) lo hace.
 */
export function isTransientError(error: unknown): boolean {
  const { status, isNetworkError } = normalizeError(error);
  return Boolean(isNetworkError) || status === 429 || (status !== undefined && status >= 500);
}
