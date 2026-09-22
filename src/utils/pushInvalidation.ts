import { queryKeys } from '@/api/queryKeys';
import type { PushNotificationData } from '@/types/pushNotification';

/** Cachés del ciclo laboral a refrescar por tipo de push (solo las relacionadas). */
export function pushCicloKeys(type: PushNotificationData['type']): readonly (readonly unknown[])[] {
  switch (type) {
    case 'documento_firma_pendiente':
      return [queryKeys.laborDocumentsRoot, queryKeys.documentosPendientes, queryKeys.miAlta, queryKeys.tareas];
    case 'recibo_nomina':
      return [queryKeys.misRecibos];
    case 'prestamo_autorizado':
      return [queryKeys.misPrestamos, queryKeys.solicitudes];
    case 'expediente_incompleto':
    case 'alta_activada':
      return [queryKeys.miAlta, queryKeys.miExpediente, queryKeys.incorporacion, queryKeys.tareas];
    case 'visto_bueno_pendiente':
      return [queryKeys.equipoPendientes, queryKeys.tareas];
    case 'evaluacion_pendiente':
    case 'evaluacion_devuelta':
    case 'evaluacion_capturada':
      return [queryKeys.evaluaciones, queryKeys.equipoPendientes, queryKeys.tareas];
    case 'contrato_por_vencer':
      return [queryKeys.rhContratos, queryKeys.tareas];
    default:
      return [];
  }
}
