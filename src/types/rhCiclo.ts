/**
 * Operación RH del ciclo laboral (backend 2026-09-22). Espejo de:
 *  - `CierreLaboralService::aArray()` + `FiniquitoService::desglose()`
 *  - `ActaService::aArray()`
 *  - `HeadcountService::coberturaDetallada()`
 *  - `IndicadoresRhService::calcular()`
 *  - `Rh\EstructuraController::vacante()`
 *  - `PlantillaDocumentalService::aArray()` + catálogo de `Rh\PlantillaDocumentalController::index()`
 */

import type { ColaboradorRef } from '@/utils/normalize';

// ---------------------------------------------------------------- Cierres

/** `App\Enums\EstadoCierreLaboral` en orden real (el estado solo avanza). */
export const ESTADOS_CIERRE = [
  'iniciado',
  'aviso_registrado',
  'finiquito_en_proceso',
  'finiquito_firmado',
  'pagado',
  'baja_ejecutada',
  'expediente_cerrado',
  'cancelado',
] as const;
export type EstadoCierre = (typeof ESTADOS_CIERRE)[number];

/** `App\Enums\TipoBaja` — valores confirmados contra el enum del backend. */
export const TIPOS_BAJA: { value: string; label: string }[] = [
  { value: 'renuncia', label: 'Renuncia voluntaria' },
  { value: 'despido', label: 'Despido' },
  { value: 'mutuo_acuerdo', label: 'Mutuo acuerdo' },
  { value: 'fin_contrato', label: 'Fin de contrato' },
  { value: 'abandono', label: 'Abandono de empleo' },
  { value: 'no_renovacion', label: 'No renovación de contrato' },
  { value: 'otro', label: 'Otro' },
];

/** `App\Enums\EstadoFiniquito`. Firmado o pagado ⇒ inmutable en backend. */
export type EstadoFiniquito = 'borrador' | 'revisado' | 'aprobado' | 'firmado' | 'pagado';

export interface FiniquitoRenglon {
  /** `null` = renglón automático (no editable); número = concepto manual editable. */
  id: number | null;
  concepto: string;
  tipo: 'percepcion' | 'deduccion' | string;
  cantidad: number | null;
  importe: number | null;
  observaciones: string | null;
  origen: 'automatico' | 'manual' | string;
}

export interface Finiquito {
  id: number;
  estado: EstadoFiniquito | string;
  total_percepciones: number | null;
  total_deducciones: number | null;
  neto: number | null;
  pagado_en: string | null;
  documento_id: number | null;
  /** Solo en detalle. */
  desglose?: FiniquitoRenglon[];
}

export interface CierreLaboral {
  id: number;
  colaborador: ColaboradorRef | null;
  solicitud_id: number | null;
  evaluacion_id: number | null;
  tipo_baja: string;
  tipo_baja_etiqueta: string | null;
  motivo: string | null;
  fecha_efectiva: string | null;
  estado: EstadoCierre | string;
  estado_etiqueta: string | null;
  aviso_registrado_en: string | null;
  pago_confirmado_en: string | null;
  referencia_pago: string | null;
  baja_ejecutada_en: string | null;
  expediente_cerrado_en: string | null;
  finiquito: Finiquito | null;
}

export interface IniciarCierrePayload {
  tipo_baja: string;
  motivo: string;
  fecha_efectiva: string;
  observaciones?: string | null;
}

export interface FiniquitoConceptoPayload {
  tipo: 'percepcion' | 'deduccion';
  concepto: string;
  cantidad?: number | null;
  importe: number;
  observaciones?: string | null;
}

// ---------------------------------------------------------------- Actas

/**
 * Actas: SOLO CONSULTA en la app. Se levantan y completan en el Portal RH
 * (formato único «Acta administrativa circunstanciada»); el `tipo` y su
 * etiqueta vienen de la API (`tipo_etiqueta`), también en actas históricas.
 */

/** `App\Enums\EstadoActa`. */
export type EstadoActa = 'borrador' | 'generada' | 'firmada' | 'cerrada' | 'cancelada';

export interface ActaTestigo {
  nombre: string;
  puesto?: string | null;
}

export interface ActaDeclaracion {
  persona: string;
  declaracion: string;
}

export interface ActaSeguimiento {
  fecha: string | null;
  nota: string;
}

export interface ActaAnexo {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  fecha_identificacion: string | null;
  relacion_hechos: string | null;
  mime: string | null;
  size: number | null;
}

/** Persona del acta resuelta por el backend desde un colaborador real (`ActaService::fichaPersona`). */
export interface ActaPersona {
  colaborador_id: number | null;
  nombre: string | null;
  puesto: string | null;
  area: string | null;
}

export interface ActaTestigoHechos extends ActaPersona {
  relacion: string | null;
  relacion_etiqueta: string | null;
  relacion_otro: string | null;
  declaro: boolean;
  manifestacion: string | null;
}

export interface ActaTestigoAsistencia extends ActaPersona {
  manifestacion: string | null;
}

/** `actas.circunstanciada` (`ActaService::resolverCircunstanciada`). */
export interface ActaCircunstanciada {
  disposiciones: string | null;
  incidencia: {
    tipo: string | null;
    tipo_etiqueta: string | null;
    otro: string | null;
    fecha_hechos: string | null;
    hora_hechos: string | null;
    lugar_hechos: string | null;
  };
  responsable: {
    caracter: string | null;
    caracter_etiqueta: string | null;
    nombre: string | null;
    puesto: string | null;
    area: string | null;
    manifestacion: string | null;
  };
  jefe: ActaPersona & { participa: boolean; manifestacion: string | null };
  testigos_hechos: ActaTestigoHechos[];
  testigos_asistencia: ActaTestigoAsistencia[];
  trabajador: { manifesto: boolean | null; manifestacion: string | null; elementos: string | null };
  incidencias_levantamiento: string | null;
  cierre: { fecha: string | null; hora: string | null };
  entrega: { estado: string; motivo: string | null; por: string | null; en: string | null };
}

export interface Acta {
  id: number;
  folio: string | null;
  tipo: string;
  tipo_etiqueta: string | null;
  /** Resumen para listados (en la circunstanciada, el tipo de incidencia). */
  motivo: string | null;
  estado: EstadoActa | string;
  colaborador: ColaboradorRef | null;
  fecha: string | null;
  hora: string | null;
  lugar: string | null;
  negativa_firma: boolean;
  documento_id: number | null;
  cerrada_en: string | null;
  /** Detalle. */
  hechos?: string | null;
  testigos?: ActaTestigo[];
  declaraciones?: ActaDeclaracion[];
  motivo_negativa?: string | null;
  circunstanciada?: ActaCircunstanciada | null;
  seguimiento?: ActaSeguimiento[];
  anexos?: ActaAnexo[];
}

// ---------------------------------------------------------------- Estructura

export interface CoberturaFila {
  empresa_id: number | null;
  empresa: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  puesto_id: number | null;
  puesto: string | null;
  autorizados: number;
  activos: number;
  vacantes: number;
  excedentes: number;
  cobertura: number;
}

export interface CoberturaTotales {
  autorizados: number;
  activos: number;
  vacantes: number;
  excedentes: number;
  cobertura: number;
}

export interface Cobertura {
  filas: CoberturaFila[];
  totales: CoberturaTotales;
}

export interface EmbudoEtapa {
  estado: string;
  etiqueta: string;
  total: number;
}

/** `IndicadoresRhService::calcular()` — todo calculado en backend; `null` = sin datos (nunca 0 inventado). */
export interface IndicadoresRh {
  periodo: { desde: string | null; hasta: string | null };
  plantilla_activa: number | null;
  plantilla_autorizada: number | null;
  cobertura: number | null;
  vacantes_plantilla: number | null;
  excedentes_plantilla: number | null;
  vacantes_abiertas: number | null;
  altas_periodo: number | null;
  bajas_periodo: number | null;
  rotacion: number | null;
  permanencia_promedio_dias: { activos: number | null; bajas_periodo: number | null };
  contratos_por_vencer: { dias: number | null; total: number | null };
  tiempo_contratacion_dias: { vacantes: number | null; candidatos: number | null };
  contratados_periodo: number | null;
  inversion_reclutamiento: number | null;
  costo_por_contratacion: number | null;
  embudo_candidatos: EmbudoEtapa[];
}

export interface VacanteDetalle {
  id: number;
  empresa: string | null;
  sucursal: string | null;
  puesto: string | null;
  motivo: string | null;
  estado: string | null;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  dias_abierta: number | null;
  plazas_requeridas: number | null;
  plazas_cubiertas: number | null;
  plazas_disponibles: number | null;
  candidato_contratado: string | null;
  colaborador_contratado: ColaboradorRef | null;
}

// ---------------------------------------------------------------- Plantillas documentales

export interface PlantillaDocumental {
  id: number;
  clave: string | null;
  nombre: string;
  categoria: string | null;
  motor: string | null;
  version: number | null;
  activo: boolean;
  requiere_firma_digital: boolean;
  requiere_impresion: boolean;
  requiere_firma_fisica: boolean;
}

export interface PlantillaCatalogoEntrada {
  clave: string;
  nombre: string;
  configurada: boolean;
}

export interface PlantillasDocumentales {
  plantillas: PlantillaDocumental[];
  catalogo: PlantillaCatalogoEntrada[];
}
