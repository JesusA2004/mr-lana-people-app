import { useExperienceStore } from '@/store/experienceStore';

interface RouterAtras {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: never) => void;
}

/**
 * «Atrás» que nunca deja atrapado al usuario: si la pantalla quedó sola en
 * la pila (p. ej. se abrió desde un push o la pila se reconstruyó al
 * cambiar de experiencia), vuelve al inicio de la experiencia activa en
 * lugar de no hacer nada.
 */
export function volverAtras(router: RouterAtras): void {
  if (router.canGoBack()) {
    router.back();

    return;
  }

  const experiencia = useExperienceStore.getState().experience;
  router.replace((experiencia === 'rh' ? '/(app)/rh' : '/(app)/(tabs)') as never);
}
