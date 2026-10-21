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
    case 'datos_faltantes':
      return [queryKeys.datosFaltantes, queryKeys.miExpediente];
    case 'expediente_incompleto':
    case 'alta_activada':
      return [queryKeys.miAlta, queryKeys.miExpediente, queryKeys.incorporacion, queryKeys.tareas];
    // Aprobaciones (motor 2026-10-20): bandeja y badge al momento del push.
    case 'visto_bueno_pendiente':
    case 'solicitud_visto_bueno':
    case 'solicitud_lista_para_autorizar':
    case 'rh_solicitud':
      return [queryKeys.equipoPendientes, queryKeys.aprobaciones, queryKeys.tareas];
    // Al solicitante: avanzó o cambió su solicitud (o su corrección).
    case 'solicitud':
    case 'solicitud_paso_aprobado':
      return [queryKeys.correcciones, queryKeys.aprobaciones, queryKeys.solicitudes];
    case 'documento':
    case 'foto_perfil':
      return [queryKeys.correcciones];
    case 'evaluacion_pendiente':
    case 'evaluacion_devuelta':
    case 'evaluacion_capturada':
      return [queryKeys.evaluaciones, queryKeys.equipoPendientes, queryKeys.tareas];
    case 'contrato_por_vencer':
      return [queryKeys.rhContratos, queryKeys.tareas];
    case 'descriptivo_puesto_enviado':
      return [queryKeys.miDescriptivoPuesto, queryKeys.tareas];
    case 'aniversario_laboral':
    case 'cumpleanos_general':
    case 'aniversario_general':
    case 'celebracion_mensaje':
      return [queryKeys.celebracionesActivas];
    default:
      return [];
  }
}
