import { create } from 'zustand';

interface MaintenanceState {
  active: boolean;
  /** Mensaje real de `app/config.message` cuando existe — fallback genérico si no. */
  message: string | null;
  setActive: (value: boolean, message?: string | null) => void;
}

/**
 * Dos fuentes activan esta bandera: cualquier respuesta 503 de la API (ver
 * `src/api/client.ts`) y `GET /api/v1/app/config` → `maintenance: true`
 * consultado al iniciar la app, antes incluso de login (AGENTS.md sección
 * 38/58) — `MaintenanceScreen` la lee desde la raíz de la app y toma toda
 * la pantalla, en vez de dejar que cada pantalla individual muestre su
 * propio error técnico.
 */
export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  active: false,
  message: null,
  setActive: (value, message = null) => set({ active: value, message: value ? message : null }),
}));
