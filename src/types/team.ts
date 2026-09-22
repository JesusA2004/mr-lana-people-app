/**
 * Vista de jefe — `App\Http\Controllers\Api\V1\EquipoController`.
 * La autoridad es la estructura jerárquica REAL (`jefe_id`/`gerente_id`),
 * no el nombre del rol: la app solo muestra "Mi equipo" si el backend
 * devuelve subordinados o pendientes.
 */

export interface EquipoSolicitudPendiente {
  id: number;
  folio: string | null;
  tipo: string;
  tipo_etiqueta: string | null;
  estado: string;
  colaborador: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  monto_solicitado: number | null;
  requiere_visto_bueno: boolean;
  /** Decisión ya registrada por el jefe (`aprobado`/`rechazado`...) o `null` si aún no decide. */
  visto_bueno: string | null;
  creada_en: string | null;
}

export interface EquipoEvaluacionPendiente {
  id: number;
  colaborador: string;
  estado: string;
  fecha_limite: string | null;
}

export interface EquipoPendientes {
  solicitudes: EquipoSolicitudPendiente[];
  evaluaciones: EquipoEvaluacionPendiente[];
}

export interface VistoBuenoResult {
  solicitud_id: number;
  decision: string | null;
  estado_solicitud: string | null;
}
