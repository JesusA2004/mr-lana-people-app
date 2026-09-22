/**
 * Documentos laborales emitidos por el motor documental del backend
 * (`GeneratedDocument` con `estado_flujo`) — contrato REAL desde
 * 2026-09-22: `App\Services\DocumentosLaborales\DocumentoLaboralConsultaService::aArray()`.
 *
 * SUPERA el contrato imaginario anterior (`tipo`/`puede_ver`/
 * `puede_descargar`/`periodo`), que nunca existió en el backend.
 */

import type { ColaboradorRef } from '@/utils/normalize';

/** `App\Enums\EstadoFlujoDocumento` en el orden real del flujo. */
export const ESTADOS_FLUJO_DOCUMENTO = [
  'borrador',
  'generado',
  'pendiente_firma_colaborador',
  'firmado_digitalmente',
  'pendiente_impresion',
  'impreso',
  'pendiente_firma_fisica',
  'firmado_fisicamente',
  'enviado_corporativo',
  'recibido_corporativo',
  'escaneado',
  'archivado',
  'cancelado',
] as const;
export type EstadoFlujoDocumento = (typeof ESTADOS_FLUJO_DOCUMENTO)[number];

/** `?etapa=` de `GET /rh/documentos-laborales` (`FlujoDocumentalService::etapasPendientes()`). */
export const ETAPAS_DOCUMENTO_LABORAL = ['imprimir', 'firma_colaborador', 'firma_fisica', 'enviar', 'recibir', 'escanear'] as const;
export type EtapaDocumentoLaboral = (typeof ETAPAS_DOCUMENTO_LABORAL)[number];

export interface Testigo {
  nombre: string;
  puesto?: string | null;
}

export interface OriginalFisico {
  impreso_en: string | null;
  firmado_fisico_en: string | null;
  huella_registrada: boolean;
  testigos: Testigo[];
  enviado_en: string | null;
  paqueteria: string | null;
  numero_guia: string | null;
  tiene_comprobante: boolean;
  recibido_en: string | null;
  escaneado_en: string | null;
  escaneado_documento_id: number | null;
}

export interface DocumentoEvento {
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  usuario: string | null;
  observaciones: string | null;
  fecha: string | null;
}

export interface LaborDocument {
  id: number;
  titulo: string;
  clave_plantilla: string | null;
  version_plantilla: number | null;
  categoria: string | null;
  estado: EstadoFlujoDocumento | string | null;
  estado_etiqueta: string | null;
  requiere_firma_digital: boolean;
  requiere_impresion: boolean;
  requiere_firma_fisica: boolean;
  requiere_huella: boolean;
  requiere_testigos: boolean;
  firmado_digital_en: string | null;
  generado_en: string | null;
  /** `class_basename` del modelo relacionado: `ContratoLaboral`, `Prestamo`, `ReciboNomina`, `CierreLaboral`, `ActaAdministrativa`, `SolicitudInterna`... */
  related_type: string | null;
  related_id: number | null;
  colaborador: ColaboradorRef | null;
  original_fisico: OriginalFisico | null;
  /** Solo en detalle RH (`GET /rh/documentos-laborales/{id}`). */
  eventos?: DocumentoEvento[];
}

/** `GET /rh/documentos-laborales/pendientes`. */
export type LaborDocumentPendingCounts = Record<EtapaDocumentoLaboral, number>;
