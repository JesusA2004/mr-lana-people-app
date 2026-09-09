import type { Ionicons } from '@expo/vector-icons';

export interface GuideSlide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

/**
 * Contenido único de la guía de la app — lo usa tanto el onboarding de
 * primer ingreso (`src/app/onboarding.tsx`) como la guía re-visitable desde
 * Ayuda (`src/app/(app)/guia.tsx`). Un solo lugar para mantener el copy
 * actualizado: describe SOLO lo que la app de colaborador realmente hace
 * hoy (no hay pantallas de RH/admin/gestor en esta app — esas funciones
 * viven en el portal web, ver capacitaciones).
 */
export const GUIDE_SLIDES: GuideSlide[] = [
  {
    icon: 'sparkles-outline',
    title: 'Bienvenido a MR. LANA PEOPLE',
    message: 'Tu app de Recursos Humanos, siempre a la mano.',
  },
  {
    icon: 'home-outline',
    title: 'Inicio: tu día a día de un vistazo',
    message: 'El dashboard resume tu expediente, tus días de vacaciones, tus solicitudes recientes y accesos rápidos a lo que más usas.',
  },
  {
    icon: 'folder-open-outline',
    title: 'Tu expediente digital',
    message: 'Sube tus documentos (INE, RFC, CURP, NSS y más) desde tu celular, revisa su estado y da seguimiento si Recursos Humanos pide una corrección.',
  },
  {
    icon: 'document-text-outline',
    title: 'Solicitudes en segundos',
    message: 'Permisos, incapacidades y otros trámites en un asistente de pasos: elige el tipo, cuéntanos el motivo y envía. Verás el avance en tiempo real.',
  },
  {
    icon: 'airplane-outline',
    title: 'Vacaciones sin complicarte',
    message: 'Consulta tus días disponibles y solicita tus vacaciones eligiendo solo las fechas.',
  },
  {
    icon: 'notifications-outline',
    title: 'Siempre informado',
    message: 'Recibe avisos y da seguimiento al estatus de tus trámites con Recursos Humanos sin tener que preguntar.',
  },
];
