import { create } from 'zustand';

/**
 * Banner «Tienes documentos pendientes» de Inicio: la persona puede cerrarlo
 * y no vuelve a salir en ESTA sesión de la app (solo memoria, nunca disco).
 * Se guarda el folio: una carta nueva vuelve a mostrarlo.
 */
interface CartaCompromisoBannerState {
  ocultoFolio: string | null;
  ocultar: (folio: string) => void;
}

export const useCartaCompromisoBannerStore = create<CartaCompromisoBannerState>((set) => ({
  ocultoFolio: null,
  ocultar: (folio) => set({ ocultoFolio: folio }),
}));
