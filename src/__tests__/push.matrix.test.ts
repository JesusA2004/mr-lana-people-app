import { existeRuta, rutasDeLaApp } from '@/testing/navegacionInventario';

import { experienceForPush, experienceForRoute, resolveResourceRoute } from '@/utils/appLinks';
import type { PushNotificationData } from '@/types/pushNotification';

jest.mock('@/constants/config', () => ({ SHOW_DEV_TOOLS: false, API_URL: 'http://test' }));

/**
 * TODOS los avisos que emite el backend real (`PushNotifier`,
 * `NotificadorRhService::notificar/notificarEvento`, tareas de candidato),
 * con el `related_type` que manda cada uno. Para cada uno: abre una pantalla
 * que EXISTE, en el árbol correcto, y nunca truena con ids basura.
 */
type Caso = { type: string; related_type?: string; destinatario: 'colaborador' | 'rh' | 'compartido' };

const CASOS: Caso[] = [
  // Colaborador
  { type: 'solicitud', destinatario: 'colaborador' },
  { type: 'documento', destinatario: 'colaborador' },
  { type: 'vacaciones', destinatario: 'colaborador' },
  { type: 'incorporacion', destinatario: 'colaborador' },
  { type: 'documento_firma_pendiente', related_type: 'GeneratedDocument', destinatario: 'colaborador' },
  { type: 'recibo_nomina', related_type: 'ReciboNomina', destinatario: 'colaborador' },
  { type: 'prestamo_autorizado', related_type: 'Prestamo', destinatario: 'colaborador' },
  { type: 'expediente_incompleto', related_type: 'Colaborador', destinatario: 'colaborador' },
  { type: 'datos_faltantes', related_type: 'Colaborador', destinatario: 'colaborador' },
  { type: 'alta_activada', related_type: 'Colaborador', destinatario: 'colaborador' },
  { type: 'onboarding_habilitado', related_type: 'OnboardingProceso', destinatario: 'colaborador' },
  { type: 'onboarding_reevaluacion', related_type: 'OnboardingAvance', destinatario: 'colaborador' },
  { type: 'reingreso_autorizado', related_type: 'Reingreso', destinatario: 'colaborador' },
  // Jefe / compartidas
  { type: 'solicitud_visto_bueno', related_type: 'SolicitudInterna', destinatario: 'compartido' },
  { type: 'evaluacion_pendiente', related_type: 'EvaluacionPeriodoPrueba', destinatario: 'compartido' },
  { type: 'evaluacion_devuelta', related_type: 'EvaluacionPeriodoPrueba', destinatario: 'compartido' },
  { type: 'evaluacion_capturada', related_type: 'EvaluacionPeriodoPrueba', destinatario: 'compartido' },
  { type: 'cumpleanos_muro', destinatario: 'compartido' },
  // RH / aprobadores
  { type: 'rh_solicitud', destinatario: 'rh' },
  { type: 'rh_vacaciones', destinatario: 'rh' },
  { type: 'rh_documento', destinatario: 'rh' },
  { type: 'rh_incorporacion', destinatario: 'rh' },
  { type: 'rh_cumpleanos', destinatario: 'rh' },
  { type: 'contrato_por_vencer', related_type: 'ContratoLaboral', destinatario: 'rh' },
  { type: 'contratos_listos', related_type: 'ContratoLaboral', destinatario: 'rh' },
  { type: 'onboarding_refuerzo', related_type: 'OnboardingAvance', destinatario: 'rh' },
  { type: 'onboarding_activos', related_type: 'OnboardingProceso', destinatario: 'rh' },
  { type: 'candidato_preautorizado', related_type: 'Candidato', destinatario: 'rh' },
  { type: 'candidato_revision_perfil', related_type: 'Candidato', destinatario: 'rh' },
  { type: 'candidato_autorizacion_rh', related_type: 'Candidato', destinatario: 'rh' },
  { type: 'cierre_baja_solicitada', related_type: 'CierreLaboral', destinatario: 'rh' },
  { type: 'cierre_preautorizacion', related_type: 'CierreLaboral', destinatario: 'rh' },
  { type: 'cierre_autorizacion_rh', related_type: 'CierreLaboral', destinatario: 'rh' },
  { type: 'pago_por_programar', related_type: 'CierreLaboral', destinatario: 'rh' },
  { type: 'cita_finiquito', related_type: 'CierreLaboral', destinatario: 'rh' },
  { type: 'reingreso_solicitado', related_type: 'Reingreso', destinatario: 'rh' },
];

describe('matriz de push / deep links', () => {
  const rutas = rutasDeLaApp();

  it.each(CASOS)('$type abre una pantalla real en el árbol correcto', ({ type, related_type, destinatario }) => {
    const data: PushNotificationData = { type, related_type, resource_id: 15, colaborador_id: 7 };
    const route = resolveResourceRoute(data);

    expect(route).not.toBeNull();
    expect(existeRuta(route as string, rutas)).toBe(true);

    const experiencia = experienceForPush(data, route);
    if (destinatario === 'rh') expect(experiencia).toBe('rh');
    if (destinatario === 'colaborador') expect(experiencia).toBe('colaborador');
    if (destinatario === 'compartido') expect(experiencia).toBeNull();
    // La experiencia nunca contradice la ruta: una pantalla de RH jamás se
    // abre con el árbol del colaborador (y viceversa).
    const deRuta = experienceForRoute(route);
    if (deRuta !== null) expect(experiencia).toBe(deRuta);
  });

  it.each(CASOS)('$type con id inexistente/basura no truena y abre algo válido', ({ type, related_type }) => {
    for (const resource_id of [null, undefined, 'abc', '0', -3, '1/../x', '']) {
      const route = resolveResourceRoute({ type, related_type, resource_id, colaborador_id: 'xx' });
      if (route !== null) expect(existeRuta(route, rutas)).toBe(true);
    }
  });

  it('un tipo desconocido no inventa ruta (cae en el centro de notificaciones)', () => {
    expect(resolveResourceRoute({ type: 'tipo_que_no_existe' })).toBeNull();
    expect(resolveResourceRoute({})).toBeNull();
  });
});
