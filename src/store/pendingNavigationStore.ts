import { create } from 'zustand';

import type { Experience } from '@/store/experienceStore';

export interface PendingPushNavigation {
  /** Ruta interna a la que se debe navegar (ver `resolveResourceRoute`). */
  route: string;
  /** Experiencia a la que pertenece la ruta — `null` si es una ruta compartida (ej. `/notificaciones`) que no depende de qué árbol esté montado. */
  experience: Experience | null;
}

interface PendingNavigationState {
  pending: PendingPushNavigation | null;
  setPendingPushNavigation: (navigation: PendingPushNavigation) => void;
  clearPendingPushNavigation: () => void;
}

/**
 * Cola de UNA navegación pendiente originada por un push (AGENTS.md sección
 * 11/12: "no debe intentar router.push antes de que la ruta RH exista/esté
 * montada", igual para cold start). `useNotificationResponseRouting` solo
 * ENCOLA aquí — nunca llama `router.push` directamente — porque no sabe si
 * el árbol de navegación (Mi espacio o Gestión RH) que contiene esa ruta ya
 * terminó de montarse. Quien sí lo sabe es `PendingPushNavigationController`
 * (montado dentro de `(app)/_layout.tsx`, después de que `experienceStore`
 * y el bootstrap ya resolvieron): navega en cuanto el árbol correcto está
 * listo y limpia la cola — sin `setTimeout` mágicos.
 */
export const usePendingNavigationStore = create<PendingNavigationState>((set) => ({
  pending: null,
  setPendingPushNavigation: (navigation) => set({ pending: navigation }),
  clearPendingPushNavigation: () => set({ pending: null }),
}));

/** Atajo fuera de componentes (ver `authStore.logout`/401): una navegación pendiente nunca debe sobrevivir a un cambio de cuenta. */
export function setPendingPushNavigation(navigation: PendingPushNavigation): void {
  usePendingNavigationStore.getState().setPendingPushNavigation(navigation);
}

export function clearPendingPushNavigation(): void {
  usePendingNavigationStore.getState().clearPendingPushNavigation();
}
