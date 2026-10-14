import { Redirect } from 'expo-router';

/**
 * Para el colaborador, un aviso de RH es una notificación más: ya no existe
 * un módulo "Avisos" separado (ver NotificationFeedService en el backend y
 * `(app)/notificaciones.tsx`). Esta ruta solo se conserva por compatibilidad
 * con enlaces/deep links antiguos — redirige al Centro de Notificaciones
 * unificado. El detalle de un aviso concreto (`/avisos/[id]`) sigue
 * existiendo: es el destino al que navega una tarjeta de aviso, no un
 * módulo aparte.
 */
export default function AvisosIndexRedirect() {
  return <Redirect href="/notificaciones" />;
}
