import type { AltaCatalogos, AltaColaboradorPayload } from '@/api/rh/alta';

import { toApiDateString } from './dates';

export interface AltaFormState {
  name: string;
  apellidos: string;
  genero: string;
  telefono: string;
  email: string;
  fechaNacimiento?: Date;
  curp: string;
  rfc: string;
  nss: string;
  numeroEmpleado: string;
  /** Solo filtra sucursales en la UI; la empresa sale de la sucursal en backend. */
  empresaId: string;
  sucursalId: string;
  departamentoId: string;
  puestoId: string;
  jefeId: string;
  sueldo?: number;
  fechaIngreso?: Date;
  tipoContratacion: string;
  fechaFinContrato?: Date;
  crearAcceso: boolean;
}

export const EMPTY_ALTA_FORM: AltaFormState = {
  name: '',
  apellidos: '',
  genero: '',
  telefono: '',
  email: '',
  curp: '',
  rfc: '',
  nss: '',
  numeroEmpleado: '',
  empresaId: '',
  sucursalId: '',
  departamentoId: '',
  puestoId: '',
  jefeId: '',
  tipoContratacion: '',
  crearAcceso: true,
};

/** El tipo de contratación elegido exige fecha fin (dato del backend, nunca inferido). */
export function requiereFechaFin(catalogos: Pick<AltaCatalogos, 'tipos_contratacion'> | undefined, tipo: string): boolean {
  return Boolean(catalogos?.tipos_contratacion.find((t) => t.value === tipo)?.requiere_fecha_fin);
}

/** Sucursales de la empresa elegida (sin empresa: todas las del alcance). */
export function sucursalesPara(catalogos: Pick<AltaCatalogos, 'sucursales'> | undefined, empresaId: string) {
  const sucursales = catalogos?.sucursales ?? [];
  if (!empresaId) return sucursales;
  return sucursales.filter((s) => String(s.empresa_id) === empresaId);
}

/** Pasos del alta y los campos (claves de error del backend) que valida cada uno. */
export const ALTA_FORM_STEPS = [
  { key: 'personales', label: 'Personales', fields: ['name', 'apellidos', 'genero', 'telefono', 'email', 'fecha_nacimiento', 'curp', 'rfc', 'nss'] },
  { key: 'laborales', label: 'Laborales', fields: ['sucursal_principal_id', 'departamento_id', 'puesto_id', 'jefe_id'] },
  { key: 'contratacion', label: 'Contratación', fields: ['fecha_ingreso', 'tipo_contratacion', 'fecha_fin_contrato', 'sueldo_mensual', 'numero_empleado'] },
] as const;

/** Errores del paso indicado (para no avanzar con campos obligatorios vacíos). */
export function erroresDelPaso(errores: Partial<Record<string, string>>, paso: number): Partial<Record<string, string>> {
  const campos = new Set<string>(ALTA_FORM_STEPS[paso]?.fields ?? []);
  return Object.fromEntries(Object.entries(errores).filter(([campo]) => campos.has(campo)));
}

/** Paso donde vive un campo con error del backend (para regresar ahí). */
export function pasoDeCampo(campo: string): number {
  const index = ALTA_FORM_STEPS.findIndex((step) => (step.fields as readonly string[]).includes(campo));
  return index < 0 ? 0 : index;
}

/** Puestos del departamento elegido (sin departamento: todos). */
export function puestosPara(catalogos: Pick<AltaCatalogos, 'puestos'> | undefined, departamentoId: string) {
  const puestos = catalogos?.puestos ?? [];
  if (!departamentoId) return puestos;
  return puestos.filter((p) => p.departamento_id === null || String(p.departamento_id) === departamentoId);
}

/** Jefes de la sucursal elegida (la lista completa puede tener cientos). */
export function jefesPara(catalogos: Pick<AltaCatalogos, 'jefes'> | undefined, sucursalId: string) {
  const jefes = catalogos?.jefes ?? [];
  if (!sucursalId) return jefes;
  return jefes.filter((j) => String(j.sucursal_id) === sucursalId);
}

/**
 * Errores de captura ANTES de mandar (el backend valida todo de nuevo; esto
 * solo evita viajes inútiles con campos obligatorios vacíos).
 */
export function validarAlta(form: AltaFormState, catalogos: Pick<AltaCatalogos, 'tipos_contratacion'> | undefined): Partial<Record<string, string>> {
  const errores: Partial<Record<string, string>> = {};
  if (!form.name.trim()) errores.name = 'Captura el nombre.';
  if (!form.sucursalId) errores.sucursal_principal_id = 'Elige la sucursal.';
  if (!form.puestoId) errores.puesto_id = 'Elige el puesto.';
  if (form.sueldo === undefined || form.sueldo < 0) errores.sueldo_mensual = 'Captura el sueldo mensual.';
  if (!form.fechaIngreso) errores.fecha_ingreso = 'Elige la fecha de ingreso.';
  if (!form.tipoContratacion) errores.tipo_contratacion = 'Elige el tipo de contratación.';
  if (form.tipoContratacion && requiereFechaFin(catalogos, form.tipoContratacion)) {
    if (!form.fechaFinContrato) errores.fecha_fin_contrato = 'Este tipo de contrato requiere fecha de vencimiento.';
    else if (form.fechaIngreso && form.fechaFinContrato < form.fechaIngreso) errores.fecha_fin_contrato = 'Debe ser igual o posterior al ingreso.';
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errores.email = 'Correo no válido.';
  if (form.curp.trim() && !/^[A-Za-z0-9]{18}$/.test(form.curp.trim())) errores.curp = 'La CURP tiene 18 caracteres.';
  if (form.rfc.trim() && !/^[A-Za-z&Ññ0-9]{12,13}$/u.test(form.rfc.trim())) errores.rfc = 'El RFC tiene 12 o 13 caracteres.';
  if (form.nss.trim() && !/^\d{11}$/.test(form.nss.trim())) errores.nss = 'El NSS tiene 11 dígitos.';
  if (form.crearAcceso && !form.email.trim()) errores.email = 'Para crear su acceso a la app captura su correo.';
  return errores;
}

const opt = (value: string) => (value.trim() ? value.trim() : null);

export function buildAltaPayload(form: AltaFormState, catalogos: Pick<AltaCatalogos, 'tipos_contratacion'> | undefined): AltaColaboradorPayload {
  return {
    name: form.name.trim(),
    apellidos: opt(form.apellidos),
    genero: opt(form.genero),
    telefono: opt(form.telefono),
    email: opt(form.email),
    fecha_nacimiento: form.fechaNacimiento ? toApiDateString(form.fechaNacimiento) : null,
    curp: opt(form.curp)?.toUpperCase() ?? null,
    rfc: opt(form.rfc)?.toUpperCase() ?? null,
    nss: opt(form.nss),
    numero_empleado: opt(form.numeroEmpleado),
    sucursal_principal_id: Number(form.sucursalId),
    departamento_id: form.departamentoId ? Number(form.departamentoId) : null,
    puesto_id: Number(form.puestoId),
    jefe_id: form.jefeId ? Number(form.jefeId) : null,
    sueldo_mensual: form.sueldo ?? 0,
    fecha_ingreso: form.fechaIngreso ? toApiDateString(form.fechaIngreso) : '',
    tipo_contratacion: form.tipoContratacion,
    fecha_fin_contrato: requiereFechaFin(catalogos, form.tipoContratacion) && form.fechaFinContrato ? toApiDateString(form.fechaFinContrato) : null,
    crear_acceso: form.crearAcceso,
  };
}
