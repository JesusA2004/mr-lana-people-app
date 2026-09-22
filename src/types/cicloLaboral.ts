/**
 * Ciclo laboral del colaborador (backend 2026-09-22,
 * `docs/backend-rh-completion.md` en capacitaciones). Espejo de:
 *
 *  - `App\Services\Expedientes\ExpedienteService::estadoDocumental()`
 *  - `App\Services\Colaboradores\AltaColaboradorService::checklist()`
 *  - `App\Services\Contratos\ContratoLaboralService::aArray()`
 *  - `App\Services\Colaboradores\JerarquiaColaboradorService::jerarquia()/resumen()`
 *
 * Tipos internos ESTABLES: la forma cruda (`unknown`) pasa siempre por los
 * normalizadores de `src/api/normalizers/cicloLaboral.ts` — decimales como
 * string, relaciones ausentes, etc. se resuelven ahí, nunca en pantalla.
 */

import type { DocumentStatus } from './document';

/** `App\Enums\EstadoAltaColaborador` — orden real del flujo de alta. */
export const ESTADOS_ALTA = [
  'pendiente_documentos',
  'documentacion_en_revision',
  'pendiente_contrato',
  'pendiente_firma',
  'pendiente_activacion',
  'activo',
  'baja',
] as const;
export type EstadoAlta = (typeof ESTADOS_ALTA)[number];

/** `App\Enums\TipoContratacion`. */
export type TipoContratacion = 'periodo_prueba' | 'capacitacion_inicial' | 'tiempo_determinado' | 'indeterminado';

/** `App\Enums\EstadoContratoLaboral`. */
export type EstadoContratoLaboral = 'vigente' | 'renovado' | 'terminado' | 'cancelado';

/** `App\Enums\CategoriaDocumento`. */
export type CategoriaDocumento =
  | 'personales'
  | 'contratos'
  | 'vacaciones'
  | 'permisos'
  | 'prestamos'
  | 'actas'
  | 'nomina_interna'
  | 'baja_finiquito'
  | 'otros';

/** Una fila de `estadoDocumental().documentos` — solo obligatorios (`document_types.requerido`). */
export interface ExpedienteDocumentoEstado {
  document_type_id: number;
  clave: string | null;
  nombre: string;
  categoria: CategoriaDocumento | string | null;
  obligatorio: boolean;
  estado: DocumentStatus | string;
  documento_id: number | null;
  version: number | null;
  cargado_en: string | null;
  validado_en: string | null;
  motivo_rechazo: string | null;
  observaciones: string | null;
}

/**
 * `ExpedienteService::estadoDocumental()`. "Completo" = TODOS los
 * obligatorios APROBADOS (no solo cargados) — la app nunca recalcula esto.
 */
export interface EstadoDocumental {
  requeridos: number;
  entregados: number;
  aprobados: number;
  en_revision: number;
  rechazados: number;
  faltantes: number;
  porcentaje: number;
  completo: boolean;
  documentos: ExpedienteDocumentoEstado[];
}

/** `GET /colaborador/expediente`. */
export interface MiExpediente {
  estado_alta: EstadoAlta | null;
  estado_alta_etiqueta: string | null;
  expediente: EstadoDocumental;
  expediente_cerrado: boolean;
}

/** `ContratoLaboralService::aArray()`. */
export interface ContratoLaboral {
  id: number;
  colaborador_id: number | null;
  /** Solo viene cuando el backend precargó la relación (ej. `rh/contratos/por-vencer`). */
  colaborador: string | null;
  tipo: TipoContratacion | string;
  tipo_etiqueta: string;
  estado: EstadoContratoLaboral | string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  /** Calculado por el backend (`ContratoLaboral::diasParaVencer()`), nunca en el dispositivo. */
  dias_para_vencer: number | null;
  sueldo_mensual: number | null;
  documento_id: number | null;
  documento_firmado: boolean;
  contrato_anterior_id: number | null;
  aviso_vencimiento_en: string | null;
  evaluacion_id: number | null;
}

export interface DocumentoContractual {
  id: number;
  clave: string | null;
  titulo: string | null;
  estado: string | null;
  firmado: boolean;
}

/** `AltaColaboradorService::checklist()` — mismo shape para `GET /colaborador/alta` y `GET /rh/colaboradores/{id}/alta`. */
export interface AltaChecklist {
  estado_alta: EstadoAlta | null;
  estado_alta_etiqueta: string | null;
  estatus: string | null;
  estructura: {
    empresa: string | null;
    sucursal: string | null;
    departamento: string | null;
    puesto: string | null;
    jefe_inmediato: string | null;
    gerente: string | null;
    sueldo_mensual: number | null;
    fecha_ingreso: string | null;
    tipo_contratacion: TipoContratacion | string | null;
    periodo_prueba_inicio: string | null;
    periodo_prueba_fin: string | null;
  };
  expediente: EstadoDocumental;
  contrato: ContratoLaboral | null;
  documentos_contractuales: DocumentoContractual[];
  /** Claves del paquete contractual que no se pudieron generar (falta plantilla activa). */
  documentos_contractuales_sin_plantilla: string[];
  acceso: {
    tiene_cuenta: boolean;
    bloqueado: boolean;
  };
}

/** `JerarquiaColaboradorService::resumen()` — `null` en la API cuando la persona no existe; NUNCA se inventa. */
export interface PersonaResumen {
  id: number;
  nombre: string;
  numero_empleado: string | null;
  puesto: string | null;
  departamento: string | null;
  sucursal: string | null;
  empresa: string | null;
}

/** `GET /colaborador/jerarquia` y `GET /rh/colaboradores/{id}/jerarquia`. */
export interface Jerarquia {
  colaborador: PersonaResumen | null;
  jefe_inmediato: PersonaResumen | null;
  gerente: PersonaResumen | null;
  subordinados_directos: PersonaResumen[];
}

/** Nodo de `GET /rh/organigrama` — personas, no puestos. */
export interface PersonaOrganigrama extends PersonaResumen {
  subordinados: PersonaOrganigrama[];
}
