import type { Experience } from '@/store/experienceStore';
import type { Tarea } from '@/types/task';

export interface TaskDestination {
  route: string;
  /** Árbol que contiene la ruta; `null` = ruta compartida (existe en ambas experiencias). */
  experience: Experience | null;
}

/**
 * Destino de una tarea de la bandeja. Se resuelve SOLO con los campos
 * estables que manda el backend (`TareaService::aArray()`): `related_type`
 * (class_basename del modelo), `related_id`, `accion` y `tipo` — nunca a
 * partir del título humano. `null` cuando la tarea no tiene una pantalla
 * móvil (se muestra sin navegación, con opción de resolverla).
 *
 * Acciones reales que emite el backend: `subir_documentos`,
 * `revisar_expediente`, `activar_colaborador`, `firmar_documento`,
 * `generar_documento`, `capturar_evaluacion`, `autorizar_evaluacion`,
 * `revisar_vencimiento`, `calcular_finiquito`, `visto_bueno` (+ etapas del
 * original físico sin `accion`).
 */
export function resolveTaskRoute(tarea: Pick<Tarea, 'tipo' | 'accion' | 'related_type' | 'related_id' | 'colaborador'>): TaskDestination | null {
  const id = tarea.related_id;
  const colaboradorId = tarea.colaborador?.id;

  switch (tarea.related_type) {
    case 'GeneratedDocument':
      if (!id) return null;
      // La firma digital es SIEMPRE del titular (tarea asignada a su cuenta) → Mi espacio.
      if (tarea.accion === 'firmar_documento' || tarea.tipo === 'firma_pendiente') {
        return { route: `/documentos-laborales/${id}`, experience: 'colaborador' };
      }
      return { route: `/(app)/rh/documentos-laborales/${id}`, experience: 'rh' };

    case 'EvaluacionPeriodoPrueba':
      return id ? { route: `/evaluaciones/${id}`, experience: null } : { route: '/evaluaciones', experience: null };

    case 'Colaborador':
      if (tarea.accion === 'subir_documentos') return { route: '/(app)/(tabs)/expediente', experience: 'colaborador' };
      if (tarea.accion === 'revisar_expediente' && id) return { route: `/(app)/rh/expedientes/${id}`, experience: 'rh' };
      if (id) return { route: `/(app)/rh/colaboradores/${id}`, experience: 'rh' };
      return null;

    case 'ContratoLaboral':
      if (tarea.tipo === 'contrato_por_vencer' || tarea.accion === 'revisar_vencimiento') {
        return { route: '/(app)/rh/contratos/por-vencer', experience: 'rh' };
      }
      // contrato_pendiente / generar_documento: la generación vive en el Portal RH; se abre el colaborador.
      return colaboradorId ? { route: `/(app)/rh/colaboradores/${colaboradorId}`, experience: 'rh' } : null;

    case 'SolicitudInterna':
      if (!id) return null;
      if (tarea.accion === 'visto_bueno') return { route: '/equipo', experience: null };
      return { route: `/(app)/rh/solicitudes/${id}`, experience: 'rh' };

    case 'Prestamo':
      return id ? { route: `/(app)/rh/prestamos/${id}`, experience: 'rh' } : null;

    case 'CierreLaboral':
      return id ? { route: `/(app)/rh/cierres/${id}`, experience: 'rh' } : null;

    case 'ReciboNomina':
      return id ? { route: `/recibos/${id}`, experience: 'colaborador' } : null;

    case 'ActaAdministrativa':
      return id ? { route: `/(app)/rh/actas/${id}`, experience: 'rh' } : null;

    default:
      return null;
  }
}
