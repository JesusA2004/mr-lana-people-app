import type { AllowedAction, RhDocumento, RhExpediente, RhExpedienteDocumento } from '@/types/rh';

/**
 * La API real (`Api\V1\Rh\ExpedienteController::show` /
 * `DocumentoController::show`) no usa exactamente los nombres que pinta la
 * app: el expediente trae `estado_incorporacion`, el colaborador viene con
 * `nombre` y `apellidos` por separado y cada documento trae `documento_id`
 * (el archivo vigente) y `tipo_id`; el detalle de documento trae
 * `tipo_documento`. Aquí se acomodan sin inventar nada: lo que falta queda
 * null/false (fail-closed: sin bandera = sin botón).
 */
type Crudo = Record<string, unknown>;

const texto = (valor: unknown): string | null => (typeof valor === 'string' && valor.trim() !== '' ? valor : null);
const numero = (valor: unknown): number | null => (typeof valor === 'number' && Number.isFinite(valor) ? valor : null);
const acciones = (valor: unknown): AllowedAction[] => (Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : []);

function normalizarDocumentoExpediente(crudo: Crudo): RhExpedienteDocumento {
  return {
    ...crudo,
    id: numero(crudo.id) ?? numero(crudo.documento_id),
    tipo_id: numero(crudo.tipo_id) ?? undefined,
    tipo: texto(crudo.tipo) ?? '',
    nombre: texto(crudo.nombre) ?? 'Documento',
    obligatorio: crudo.obligatorio === true,
    estado: texto(crudo.estado) ?? 'pendiente',
    motivo_rechazo: texto(crudo.motivo_rechazo),
    fecha_subida: texto(crudo.fecha_subida),
    fecha_revision: texto(crudo.fecha_revision),
    nombre_original: texto(crudo.nombre_original),
    acciones_permitidas: acciones(crudo.acciones_permitidas),
    puede_descargar: crudo.puede_descargar === true,
    puede_pedir_correccion: crudo.puede_pedir_correccion === true,
  };
}

export function normalizarRhExpediente(payload: unknown): RhExpediente {
  const crudo = (payload && typeof payload === 'object' ? payload : {}) as Crudo;
  const colaborador = (crudo.colaborador && typeof crudo.colaborador === 'object' ? crudo.colaborador : {}) as Crudo;
  const nombre = [texto(colaborador.nombre), texto(colaborador.apellidos)].filter(Boolean).join(' ');
  const documentos = Array.isArray(crudo.documentos) ? (crudo.documentos as Crudo[]) : [];

  return {
    ...crudo,
    colaborador: {
      ...colaborador,
      id: numero(colaborador.id) ?? 0,
      nombre: nombre || 'Colaborador',
      numero_empleado: texto(colaborador.numero_empleado),
      puesto: texto(colaborador.puesto),
      sucursal: texto(colaborador.sucursal),
      estatus: texto(colaborador.estatus) ?? undefined,
      correo_corporativo: texto(colaborador.correo_corporativo),
      telefono_corporativo: texto(colaborador.telefono_corporativo),
    },
    estado: texto(crudo.estado) ?? texto(crudo.estado_incorporacion) ?? 'incompleto',
    documentos: documentos.filter((d) => d && typeof d === 'object').map(normalizarDocumentoExpediente),
    acciones_permitidas: acciones(crudo.acciones_permitidas),
    puede_descargar_expediente: crudo.puede_descargar_expediente === true,
  };
}

export function normalizarRhDocumento(payload: unknown): RhDocumento {
  const crudo = (payload && typeof payload === 'object' ? payload : {}) as Crudo;
  const colaborador = (crudo.colaborador && typeof crudo.colaborador === 'object' ? crudo.colaborador : {}) as Crudo;
  const tipo = texto(crudo.tipo) ?? texto(crudo.tipo_documento);

  return {
    ...crudo,
    id: numero(crudo.id) ?? 0,
    tipo,
    nombre: texto(crudo.nombre) ?? tipo ?? 'Documento',
    estado: texto(crudo.estado) ?? 'pendiente',
    colaborador: {
      ...colaborador,
      id: numero(colaborador.id) ?? 0,
      nombre: texto(colaborador.nombre) ?? 'Colaborador',
      numero_empleado: texto(colaborador.numero_empleado),
      puesto: texto(colaborador.puesto),
      sucursal: texto(colaborador.sucursal),
    },
    fecha_subida: texto(crudo.fecha_subida),
    fecha_revision: texto(crudo.fecha_revision),
    motivo_rechazo: texto(crudo.motivo_rechazo),
    nombre_original: texto(crudo.nombre_original),
    acciones_permitidas: acciones(crudo.acciones_permitidas),
    puede_descargar: crudo.puede_descargar === true,
    puede_pedir_correccion: crudo.puede_pedir_correccion === true,
  };
}
