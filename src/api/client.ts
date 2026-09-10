import axios, { type AxiosError } from 'axios';

import { queryKeys } from './queryKeys';
import { API_URL, REQUEST_TIMEOUT_MS } from '@/constants/config';
import { queryClient } from '@/api/queryClient';
import { useMaintenanceStore } from '@/store/maintenanceStore';

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
  (response) => {
    // Una respuesta exitosa significa que el backend ya no está en
    // mantenimiento — quita la pantalla completa si seguía activa.
    if (useMaintenanceStore.getState().active) useMaintenanceStore.getState().setActive(false);
    return response;
  },
  (error: AxiosError) => {
    if (__DEV__) {
      console.warn(
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

    if (error.response?.status === 403) {
      // Auditoría de integración — "ERROR 403": si RH pierde un permiso
      // mientras la app sigue abierta (alguien se lo quitó desde el panel
      // web a media sesión), el próximo 403 de cualquier endpoint invalida
      // `mobile/bootstrap` — el siguiente render recalcula
      // capabilities/features/permissions reales y el botón/módulo que ya
      // no debería estar ahí desaparece solo, en vez de quedarse
      // reintentando la misma acción prohibida una y otra vez.
      void queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap });
    }

    if (error.response?.status === 503) {
      useMaintenanceStore.getState().setActive(true);
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
