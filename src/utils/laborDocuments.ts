import type { EstadoFlujoDocumento, LaborDocument } from '@/types/laborDocument';
import { ESTADOS_FLUJO_DOCUMENTO } from '@/types/laborDocument';

/**
 * Helpers de PRESENTACIÓN de documentos laborales. Ninguno decide
 * autorización: el backend (`GeneratedDocumentPolicy` +
 * `FlujoDocumentalService::exigirEstado()`) es la autoridad y responde
 * 403/422 si algo no procede. Aquí solo se evita ofrecer un botón que el
 * backend rechazaría con seguridad, espejo exacto de sus guardas de estado.
 */

const ORDEN = new Map<string, number>(ESTADOS_FLUJO_DOCUMENTO.map((estado, index) => [estado, index]));

export function estadoIndex(estado: string | null | undefined): number {
  return estado ? (ORDEN.get(estado) ?? -1) : -1;
}

/** Estados en los que el colaborador ya aceptó/firmó (`EstadoFlujoDocumento::estaFirmado()`). */
const FIRMADOS = new Set<string>([
  'firmado_digitalmente',
  'pendiente_impresion',
  'impreso',
  'pendiente_firma_fisica',
  'firmado_fisicamente',
  'enviado_corporativo',
  'recibido_corporativo',
  'escaneado',
  'archivado',
]);

export function isLaborDocumentSigned(documento: Pick<LaborDocument, 'estado'>): boolean {
  return !!documento.estado && FIRMADOS.has(documento.estado);
}

/** Espejo de `GeneratedDocumentPolicy::firmar()` (lado estado): solo en `pendiente_firma_colaborador`. */
export function canColaboradorSign(documento: Pick<LaborDocument, 'estado'>): boolean {
  return documento.estado === 'pendiente_firma_colaborador';
}

export function requiresPhysicalOriginal(documento: Pick<LaborDocument, 'requiere_impresion' | 'requiere_firma_fisica'>): boolean {
  return documento.requiere_impresion || documento.requiere_firma_fisica;
}

/** Tono visual (StatusBadge) por estado del flujo documental. */
export function laborDocumentBadgeStatus(estado: string | null | undefined): string {
  switch (estado) {
    case 'pendiente_firma_colaborador':
      return 'requiere_correccion';
    case 'firmado_digitalmente':
    case 'firmado_fisicamente':
    case 'archivado':
    case 'escaneado':
      return 'aprobado';
    case 'cancelado':
      return 'cancelada';
    case 'generado':
      return 'cargado';
    default:
      return 'en_revision';
  }
}

/** Texto corto para el colaborador: qué sigue con este documento (sin mencionar operación interna de RH). */
export function colaboradorDocumentHint(documento: LaborDocument): string {
  if (canColaboradorSign(documento)) return 'Requiere tu firma digital.';
  if (documento.estado === 'cancelado') return 'Este documento fue cancelado por RH.';
  if (documento.estado === 'archivado') return 'Documento completo y archivado en tu expediente.';
  if (isLaborDocumentSigned(documento) && requiresPhysicalOriginal(documento)) {
    return documento.firmado_digital_en
      ? 'Firmado digitalmente. RH gestionará el original físico (impresión y firma autógrafa).'
      : 'RH gestionará el original físico de este documento.';
  }
  if (isLaborDocumentSigned(documento)) return 'Firmado digitalmente.';
  return 'Disponible para consulta.';
}

export type LaborDocumentFilter = 'todos' | 'por_firmar' | 'firmados' | 'contratos' | 'comprobantes';

export const LABOR_DOCUMENT_FILTERS: { value: LaborDocumentFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'por_firmar', label: 'Por firmar' },
  { value: 'firmados', label: 'Firmados' },
  { value: 'contratos', label: 'Contratos' },
  { value: 'comprobantes', label: 'Comprobantes' },
];

/** Categorías reales (`App\Enums\CategoriaDocumento`) que se muestran como "comprobantes". */
const CATEGORIAS_COMPROBANTE = new Set(['vacaciones', 'permisos', 'nomina_interna', 'prestamos']);

/**
 * Filtro local sobre la lista ya descargada. "Por firmar" usa el filtro real
 * del backend (`?estado=pendientes_firma`) en la pantalla; aquí solo aplica
 * a la lista completa en caché.
 */
export function filterLaborDocuments(documentos: LaborDocument[], filtro: LaborDocumentFilter): LaborDocument[] {
  switch (filtro) {
    case 'todos':
      return documentos;
    case 'por_firmar':
      return documentos.filter(canColaboradorSign);
    case 'firmados':
      return documentos.filter(isLaborDocumentSigned);
    case 'contratos':
      return documentos.filter((doc) => doc.categoria === 'contratos');
    case 'comprobantes':
      return documentos.filter((doc) => !!doc.categoria && CATEGORIAS_COMPROBANTE.has(doc.categoria));
  }
}

export type TimelineStepStatus = 'done' | 'current' | 'pending' | 'cancelled';

export interface LaborDocumentTimelineStep {
  key: string;
  label: string;
  status: TimelineStepStatus;
  date?: string | null;
}

/**
 * Pasos del flujo que APLICAN a este documento según las banderas que el
 * backend copió de la plantilla (`requiere_*`). El avance se deduce del
 * `estado` real y de las fechas del seguimiento físico — nunca se inventa
 * un paso que la plantilla no pide.
 */
export function buildLaborDocumentTimeline(documento: LaborDocument): LaborDocumentTimelineStep[] {
  const fisico = documento.original_fisico;
  const idx = estadoIndex(documento.estado);
  const cancelado = documento.estado === 'cancelado';
  const steps: { key: string; label: string; reachedAt: EstadoFlujoDocumento; date?: string | null }[] = [
    { key: 'generado', label: 'Generado', reachedAt: 'generado', date: documento.generado_en },
  ];

  if (documento.requiere_firma_digital) {
    steps.push({ key: 'firma_digital', label: 'Firma digital del colaborador', reachedAt: 'firmado_digitalmente', date: documento.firmado_digital_en });
  }
  if (requiresPhysicalOriginal(documento)) {
    steps.push({ key: 'impresion', label: 'Impresión', reachedAt: 'impreso', date: fisico?.impreso_en });
  }
  if (documento.requiere_firma_fisica) {
    steps.push({ key: 'firma_fisica', label: 'Firma física', reachedAt: 'firmado_fisicamente', date: fisico?.firmado_fisico_en });
  }
  if (requiresPhysicalOriginal(documento)) {
    steps.push(
      { key: 'envio', label: 'Envío a corporativo', reachedAt: 'enviado_corporativo', date: fisico?.enviado_en },
      { key: 'recepcion', label: 'Recepción en corporativo', reachedAt: 'recibido_corporativo', date: fisico?.recibido_en },
      { key: 'escaneo', label: 'Escaneo del original', reachedAt: 'escaneado', date: fisico?.escaneado_en },
    );
  }
  steps.push({ key: 'archivado', label: 'Archivado', reachedAt: 'archivado' });

  let currentAssigned = false;
  return steps.map((step) => {
    // Un paso está hecho si su fecha existe o si el estado actual ya lo rebasó.
    // Un paso con fecha real sí ocurrió aunque después se cancelara el documento.
    const done = !!step.date || (!cancelado && idx >= 0 && idx >= estadoIndex(step.reachedAt));
    if (done) return { key: step.key, label: step.label, status: 'done', date: step.date ?? null };
    if (cancelado) return { key: step.key, label: step.label, status: 'cancelled', date: null };
    if (!currentAssigned) {
      currentAssigned = true;
      return { key: step.key, label: step.label, status: 'current', date: null };
    }
    return { key: step.key, label: step.label, status: 'pending', date: null };
  });
}

// ------------------------------------------------------------ RH: operaciones disponibles

export type RhDocumentOperation = 'imprimir' | 'firma_fisica' | 'envio' | 'recepcion' | 'escaneo' | 'archivar' | 'cancelar';

/**
 * Operaciones del original físico que tiene sentido OFRECER para este
 * documento: permiso real (`documentos_laborales.operar_fisico` /
 * `documentos_laborales.cancelar`, igual que `GeneratedDocumentPolicy`) +
 * estado permitido por la guarda de `FlujoDocumentalService` de cada
 * transición. El colaborador nunca ve estas acciones (la firma digital es
 * del titular, `firmar()`).
 */
export function availableRhDocumentOperations(documento: LaborDocument, permissions: string[] | undefined): RhDocumentOperation[] {
  const perms = new Set(permissions ?? []);
  const estado = documento.estado ?? '';
  const ops: RhDocumentOperation[] = [];

  if (perms.has('documentos_laborales.operar_fisico')) {
    // Con original físico el flujo SIEMPRE pasa por `pendiente_impresion` (aunque solo pida firma física).
    if (['pendiente_impresion', 'generado', 'firmado_digitalmente'].includes(estado) && requiresPhysicalOriginal(documento)) ops.push('imprimir');
    if (['pendiente_firma_fisica', 'impreso'].includes(estado) && documento.requiere_firma_fisica) ops.push('firma_fisica');
    if (['firmado_fisicamente', 'impreso'].includes(estado) && requiresPhysicalOriginal(documento)) ops.push('envio');
    if (estado === 'enviado_corporativo') ops.push('recepcion');
    if (['recibido_corporativo', 'firmado_fisicamente', 'impreso'].includes(estado) && requiresPhysicalOriginal(documento)) ops.push('escaneo');

    const archivables = ['escaneado'];
    if (!requiresPhysicalOriginal(documento)) archivables.push('generado', 'firmado_digitalmente');
    if (!documento.requiere_firma_fisica) archivables.push('impreso');
    if (archivables.includes(estado)) ops.push('archivar');
  }

  if (perms.has('documentos_laborales.cancelar') && estado !== 'archivado' && estado !== 'cancelado' && estado !== '') {
    ops.push('cancelar');
  }

  return ops;
}

export const RH_DOCUMENT_OPERATION_LABELS: Record<RhDocumentOperation, string> = {
  imprimir: 'Marcar impreso',
  firma_fisica: 'Registrar firma física',
  envio: 'Registrar envío',
  recepcion: 'Registrar recepción',
  escaneo: 'Subir escaneo',
  archivar: 'Archivar',
  cancelar: 'Cancelar documento',
};

export const ETAPA_LABELS: Record<string, string> = {
  imprimir: 'Por imprimir',
  firma_colaborador: 'Firma del colaborador',
  firma_fisica: 'Firma física',
  enviar: 'Por enviar',
  recibir: 'Por recibir',
  escanear: 'Por escanear',
};

const CATEGORIA_LABEL: Record<string, string> = {
  contratos: 'Contrato',
  vacaciones: 'Vacaciones',
  permisos: 'Permiso',
  prestamos: 'Préstamo',
  actas: 'Acta',
  nomina_interna: 'Nómina interna',
  baja_finiquito: 'Baja y finiquito',
  personales: 'Personal',
  otros: 'Documento',
};

/** Etiqueta corta de la categoría real (`App\Enums\CategoriaDocumento`). */
export function laborDocumentKicker(documento: Pick<LaborDocument, 'categoria'>): string {
  return (documento.categoria && CATEGORIA_LABEL[documento.categoria]) ?? 'Documento';
}
