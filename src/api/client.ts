import axios, { type AxiosError } from 'axios';

import { API_URL, REQUEST_TIMEOUT_MS } from '@/constants/config';

/**
 * Cliente Axios central. Toda la app debe consumir la API a través de este
 * módulo (directamente o mediante los archivos de src/api/*.ts) para que
 * baseURL, timeout, headers, Bearer token y manejo de 401 estén garantizados
 * en un único lugar.
 */
// eslint-disable-next-line import/no-named-as-default-member -- axios.create() is the documented API.
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
  },
});

let authToken: string | null = null;

/** Establece (o limpia con `null`) el token Bearer usado en cada request. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registrado por el auth store: se ejecuta cuando cualquier request recibe 401. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.set('Authorization', `Bearer ${authToken}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (__DEV__) {
      console.error(
        '[API]',
        error.config?.method?.toUpperCase(),
        error.config?.url,
        error.response?.status,
        error.response?.data,
      );
    }

    if (error.response?.status === 401) {
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  },
);

/**
 * Desenvuelve la forma más común de respuesta de Laravel API Resources:
 * `{ data: T }`. Si el payload no trae esa envoltura, se devuelve tal cual.
 * Mantener esta normalización aquí evita hacks distintos en cada pantalla.
 */
export function extractData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
