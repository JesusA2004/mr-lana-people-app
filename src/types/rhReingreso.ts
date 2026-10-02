/**
 * Reingreso de la MISMA persona (`App\Services\CicloLaboral\ReingresoService`).
 * Nunca se crea un colaborador nuevo: se busca, se revisa su historial y RH
 * decide. Espejo de `ReingresoService::buscar()/historial()/aArray()`.
 */

import type { CandidatoAccion, CicloAprobacionResumen } from './rhCandidato';

export const ESTADOS_REINGRESO = ['solicitado', 'revision_rh', 'autorizado', 'rechazado', 'completado'] as const;
export type EstadoReingreso = (typeof ESTADOS_REINGRESO)[number];

/** `ReingresoService::buscar()` — candidatos a reingresar entre el histórico de colaboradores. */
export interface ReingresoCandidatoBusqueda {
  id: number;
  nombre: string;
  numero_empleado: string | null;
  curp: string | null;
  rfc: string | null;
  puesto: string | null;
  sucursal: string | null;
  estatus: string;
  dado_de_baja: boolean;
  fecha_baja: string | null;
  causa_salida: string | null;
  reingreso_abierto: boolean;
}

export interface ReingresoHistorialSalida {
  id: number;
  causa: string;
  motivo: string | null;
  fecha_efectiva: string;
  estado: string;
}

export interface ReingresoHistorialContrato {
  id: number;
  tipo: string;
  inicio: string;
  fin: string | null;
  estado: string;
}

export interface ReingresoHistorialEvaluacion {
  id: number;
  calificacion: number | null;
}

/** `ReingresoService::historial()` — lo que RH revisa antes de decidir. */
export interface ReingresoHistorial {
  colaborador: {
    id: number;
    nombre: string;
    numero_empleado: string | null;
    puesto: string | null;
    sucursal: string | null;
    fecha_ingreso: string | null;
    fecha_baja: string | null;
    estatus: string;
  };
  salidas: ReingresoHistorialSalida[];
  contratos: ReingresoHistorialContrato[];
  evaluaciones: ReingresoHistorialEvaluacion[];
}

export interface ReingresoDocumentoRequerido {
  id: number;
  nombre: string | undefined;
}

/** `ReingresoService::aArray()`. */
export interface Reingreso {
  id: number;
  colaborador: { id: number; nombre: string; numero_empleado: string | null } | null;
  estado: EstadoReingreso | string;
  estado_etiqueta: string | null;
  motivo: string | null;
  puesto: string | null;
  sucursal: string | null;
  tipo_contratacion: string | null;
  fecha_reingreso: string | null;
  documentos_requeridos: ReingresoDocumentoRequerido[];
  comentario_decision: string | null;
  solicitado_por: string | null;
  decidido_por: string | null;
  decidido_en: string | null;
  completado_en: string | null;
  creado_en: string | null;
  aprobaciones: CicloAprobacionResumen[];
  acciones_permitidas: CandidatoAccion[];
}

/** `POST /rh/reingresos` — `colaborador_id` va aparte en el cliente. */
export interface SolicitarReingresoPayload {
  motivo: string;
  puesto_id?: number | null;
  sucursal_id?: number | null;
  jefe_id?: number | null;
  tipo_contratacion?: string | null;
  sueldo_mensual?: number | null;
  fecha_reingreso?: string | null;
  documentos_adicionales?: number[];
}
