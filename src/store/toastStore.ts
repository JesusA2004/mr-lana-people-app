import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

let counter = 0;

/**
 * Cola global de toasts/snackbars (ver AGENTS.md sección 33). Reemplaza el
 * uso de Alert.alert para feedback no bloqueante ("Solicitud enviada",
 * "No fue posible cargar el archivo", etc.). Montado una sola vez desde
 * <ToastHost /> en el layout raíz.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = 'info') => {
    const id = `toast-${Date.now()}-${counter++}`;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show(message, 'success'),
  error: (message: string) => useToastStore.getState().show(message, 'error'),
  warning: (message: string) => useToastStore.getState().show(message, 'warning'),
  info: (message: string) => useToastStore.getState().show(message, 'info'),
};
