import { create } from 'zustand';

interface MaintenanceState {
  active: boolean;
  setActive: (value: boolean) => void;
}

/**
 * Cualquier respuesta 503 de la API (ver `src/api/client.ts`) activa esta
 * bandera — `MaintenanceScreen` la lee desde la raíz de la app y toma toda
 * la pantalla con un mensaje amistoso (V4 sección 71), en vez de dejar que
 * cada pantalla individual muestre su propio error técnico.
 */
export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  active: false,
  setActive: (value) => set({ active: value }),
}));
