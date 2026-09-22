import { useExperienceStore, type Experience } from '@/store/experienceStore';
import { setPendingPushNavigation } from '@/store/pendingNavigationStore';

/**
 * Abre una ruta que puede vivir en el OTRO árbol de navegación (Mi espacio
 * ↔ Gestión RH) — mismo mecanismo que el tap de un push: cambia de
 * experiencia si hace falta y ENCOLA la navegación para que
 * `PendingPushNavigationController` la ejecute cuando el árbol correcto ya
 * está montado. Usado por push, centro de notificaciones y bandeja de
 * tareas: nunca un `router.push` a una ruta desmontada (+not-found).
 *
 * `experience === null` = ruta compartida: navega en el árbol actual.
 */
export function openCrossExperienceRoute(route: string, experience: Experience | null): void {
  if (experience) {
    const current = useExperienceStore.getState().experience;
    if (current !== experience) void useExperienceStore.getState().setExperience(experience);
  }
  setPendingPushNavigation({ route, experience });
}
