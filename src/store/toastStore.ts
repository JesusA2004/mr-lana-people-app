import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  /** Etiqueta de una acción opcional dentro del toast, ej. "Ver" o "Deshacer". */
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
}

let counter = 0;

/**
 * Cola global de toasts/snackbars. Reemplaza el uso de Alert.alert para
 * feedback no bloqueante ("Solicitud enviada", "No fue posible cargar el
 * archivo", etc.), con una acción opcional ("Ver", "Deshacer"). Montado una
 * sola vez desde <ToastHost /> en el layout raíz.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = 'info', options) => {
    const id = `toast-${Date.now()}-${counter++}`;
    set((state) => ({ toasts: [...state.toasts, { id, type, message, ...options }] }));
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

export const toast = {
  success: (message: string, options?: ToastOptions) => useToastStore.getState().show(message, 'success', options),
  error: (message: string, options?: ToastOptions) => useToastStore.getState().show(message, 'error', options),
  warning: (message: string, options?: ToastOptions) => useToastStore.getState().show(message, 'warning', options),
  info: (message: string, options?: ToastOptions) => useToastStore.getState().show(message, 'info', options),
};
