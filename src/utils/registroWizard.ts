import { maxDocumentosCarta } from './cartaCompromiso';
import { esGeneradoPorSistema } from './documentosGenerados';
import { CAMPOS_DOMICILIO, validarDomicilio, type ValoresDomicilio } from './domicilio';

import type { CampoRegistro, EstadoRegistro } from '@/types/registro';

/**
 * Lógica PURA del asistente de registro completo (pantalla `src/app/registro.tsx`):
 * qué campos van en cada paso, validaciones de formato con mensajes claros y
 * en qué paso reanudar. La regla de negocio (qué es obligatorio, qué ya
 * capturó RH) la manda el backend en `GET /colaborador/registro`; aquí solo
 * se organiza y se valida antes de enviar (el backend vuelve a validar).
 */

export type ClavePaso = 'personales' | 'domicilio' | 'emergencia' | 'medicos' | 'foto' | 'solicitud' | 'documentos' | 'revision';

export interface PasoRegistro {
  clave: ClavePaso;
  titulo: string;
  descripcion: string;
  icono: 'person-outline' | 'home-outline' | 'call-outline' | 'medkit-outline' | 'camera-outline' | 'clipboard-outline' | 'documents-outline' | 'checkmark-done-outline';
  opcional?: boolean;
}

export const PASOS_REGISTRO: readonly PasoRegistro[] = [
  { clave: 'personales', titulo: 'Tus datos personales', descripcion: 'Como aparecen en tu INE, CURP y constancia del SAT.', icono: 'person-outline' },
  { clave: 'domicilio', titulo: 'Tu domicilio', descripcion: 'Como aparece en tu comprobante de domicilio.', icono: 'home-outline' },
  { clave: 'emergencia', titulo: 'Contacto de emergencia', descripcion: 'A quién avisamos si te pasa algo, y tu beneficiario.', icono: 'call-outline' },
  { clave: 'medicos', titulo: 'Datos médicos', descripcion: 'Opcional y confidencial: solo lo ve personal autorizado.', icono: 'medkit-outline', opcional: true },
  { clave: 'foto', titulo: 'Fotografía para expediente', descripcion: 'Será tu foto de perfil y la de tu expediente.', icono: 'camera-outline' },
  {
    clave: 'solicitud',
    titulo: 'Solicitud de empleo',
    descripcion: 'Tu solicitud de empleo y estudio socioeconómico, por secciones cortas.',
    icono: 'clipboard-outline',
  },
  { clave: 'documentos', titulo: 'Tus documentos', descripcion: 'Toma una foto clara o elige el archivo.', icono: 'documents-outline' },
  { clave: 'revision', titulo: 'Revisa y termina', descripcion: 'Confirma que todo está listo para entrar.', icono: 'checkmark-done-outline' },
];

/** Campos por paso (en orden de captura). Lo que el backend agregue y no esté aquí cae en «personales». */
export const CAMPOS_POR_PASO: Record<'personales' | 'domicilio' | 'emergencia', readonly string[]> = {
  personales: [
    'genero',
    'fecha_nacimiento',
    'lugar_nacimiento',
    'nacionalidad',
    'estado_civil',
    'curp',
    'rfc',
    'nss',
    'clave_elector',
    'profesion',
    'telefono',
    'correo_personal',
  ],
  domicilio: CAMPOS_DOMICILIO,
  emergencia: ['contacto_emergencia_nombre', 'contacto_emergencia_parentesco', 'contacto_emergencia_telefono', 'beneficiario_nombre', 'beneficiario_parentesco'],
};

/** Datos médicos: van a su tabla cifrada (`datos_medicos`), nunca con el resto. */
export const CAMPOS_MEDICOS = ['condicion_medica', 'alergias'] as const;

export function esCampoMedico(campo: string): boolean {
  return (CAMPOS_MEDICOS as readonly string[]).includes(campo);
}

/** Campos del backend que corresponden a un paso de datos. */
export function camposDelPaso(paso: 'personales' | 'domicilio' | 'emergencia', campos: readonly CampoRegistro[]): CampoRegistro[] {
  const conocidos = new Set<string>([...CAMPOS_POR_PASO.personales, ...CAMPOS_POR_PASO.domicilio, ...CAMPOS_POR_PASO.emergencia]);
  const orden = CAMPOS_POR_PASO[paso];
  const propios = orden.map((clave) => campos.find((c) => c.campo === clave)).filter((c): c is CampoRegistro => c !== undefined);

  if (paso !== 'personales') return propios;

  const extra = campos.filter((c) => !conocidos.has(c.campo) && !esCampoMedico(c.campo));
  return [...propios, ...extra];
}

const CURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CLAVE_ELECTOR = /^[A-Z]{6}\d{8}[HM]\d{3}$/;

/** Edad cumplida a `hoy` (fecha local AAAA-MM-DD). */
export function edadCumplida(fechaIso: string, hoy: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaIso);
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let edad = hoy.getFullYear() - anio;
  if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) edad -= 1;
  return edad;
}

/** AAMMDD de una fecha AAAA-MM-DD (lo que traen la CURP y el RFC). */
function aammdd(fechaIso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaIso);
  return m ? `${m[1].slice(2)}${m[2]}${m[3]}` : null;
}

/**
 * Error de formato de UN campo (null = válido o vacío). Mensajes en
 * lenguaje claro: qué está mal y cómo debe verse.
 */
export function validarFormato(campo: string, valor: string, hoy: Date = new Date()): string | null {
  const v = valor.trim();
  if (!v) return null;

  switch (campo) {
    case 'curp':
      return CURP.test(v.toUpperCase()) ? null : 'La CURP tiene 18 caracteres (4 letras, 6 números de tu fecha, H o M, 5 letras y 2 caracteres finales).';
    case 'rfc':
      return RFC.test(v.toUpperCase()) ? null : 'El RFC tiene 13 caracteres: 4 letras, 6 números de tu fecha y 3 de homoclave.';
    case 'nss':
      return /^\d{11}$/.test(v) ? null : 'El NSS son 11 números (viene en tu alta del IMSS).';
    case 'telefono':
    case 'contacto_emergencia_telefono':
      return /^\d{10}$/.test(v) ? null : 'Escribe el teléfono a 10 dígitos, sin espacios ni lada internacional.';
    case 'correo_personal':
      return CORREO.test(v) ? null : 'Escribe un correo válido, por ejemplo nombre@gmail.com.';
    case 'clave_elector':
      return CLAVE_ELECTOR.test(v.toUpperCase()) ? null : 'La clave de elector tiene 18 caracteres y viene al frente de tu INE.';
    case 'fecha_nacimiento': {
      const edad = edadCumplida(v, hoy);
      if (edad === null) return 'Elige tu fecha de nacimiento.';
      if (edad < 15) return 'Revisa tu fecha de nacimiento: debes tener al menos 15 años.';
      if (edad > 100) return 'Revisa tu fecha de nacimiento.';
      return null;
    }
    default:
      return null;
  }
}

/**
 * Coherencia entre datos (errores típicos al teclear): la fecha de la CURP y
 * del RFC debe ser tu fecha de nacimiento, y la letra de sexo de la CURP tu
 * sexo registrado.
 */
export function validarCoherencia(valores: Record<string, string | undefined>): Record<string, string> {
  const errores: Record<string, string> = {};
  const nacimiento = aammdd(valores.fecha_nacimiento ?? '');
  const curp = (valores.curp ?? '').trim().toUpperCase();
  const rfc = (valores.rfc ?? '').trim().toUpperCase();

  if (nacimiento && CURP.test(curp) && curp.slice(4, 10) !== nacimiento) {
    errores.curp = 'La fecha dentro de tu CURP no coincide con tu fecha de nacimiento. Revisa ambas.';
  }

  if (nacimiento && RFC.test(rfc)) {
    const inicio = rfc.length === 13 ? 4 : 3;
    if (rfc.slice(inicio, inicio + 6) !== nacimiento) {
      errores.rfc = 'La fecha dentro de tu RFC no coincide con tu fecha de nacimiento. Revisa ambas.';
    }
  }

  const genero = valores.genero;
  if (CURP.test(curp) && (genero === 'femenino' || genero === 'masculino')) {
    const letra = curp.charAt(10);
    if ((genero === 'femenino' && letra !== 'M') || (genero === 'masculino' && letra !== 'H')) {
      errores.curp ??= 'La letra de sexo de tu CURP (H o M) no coincide con el sexo que elegiste.';
    }
  }

  return errores;
}

/**
 * Valida un paso de datos completo: obligatorios (los que el backend marca
 * y no están bloqueados), formatos, domicilio estructurado y coherencia.
 */
export function validarPaso(
  paso: 'personales' | 'domicilio' | 'emergencia',
  campos: readonly CampoRegistro[],
  valores: Record<string, string | undefined>,
  hoy: Date = new Date(),
): Record<string, string> {
  const errores: Record<string, string> = {};
  const propios = camposDelPaso(paso, campos);

  for (const campo of propios) {
    if (campo.bloqueado) continue;
    const valor = (valores[campo.campo] ?? '').trim();
    if (!valor) {
      if (campo.obligatorio) errores[campo.campo] = campo.tipo === 'opciones' || campo.tipo === 'date' ? 'Elige una opción para continuar.' : 'Falta este dato.';
      continue;
    }
    const formato = validarFormato(campo.campo, valor, hoy);
    if (formato) errores[campo.campo] = formato;
  }

  if (paso === 'domicilio') {
    const editables = propios.filter((c) => !c.bloqueado).map((c) => c.campo);
    const domicilio = validarDomicilio(valores as ValoresDomicilio, editables.length > 0);
    for (const [campo, mensaje] of Object.entries(domicilio)) {
      if (mensaje && editables.includes(campo) && !errores[campo]) errores[campo] = mensaje;
    }
  }

  if (paso === 'personales') {
    for (const [campo, mensaje] of Object.entries(validarCoherencia(valores))) {
      const definicion = propios.find((c) => c.campo === campo);
      if (definicion && !definicion.bloqueado && !errores[campo]) errores[campo] = mensaje;
    }
  }

  return errores;
}

/** Normaliza lo capturado como lo espera el backend (CURP/RFC/clave en mayúsculas, sin espacios dobles). */
export function normalizarValor(campo: string, valor: string): string {
  const limpio = valor.replace(/\s+/g, ' ').trim();
  return ['curp', 'rfc', 'clave_elector'].includes(campo) ? limpio.toUpperCase().replace(/\s/g, '') : limpio;
}

/** Lo que se manda en el paso: solo campos editables y distintos de lo guardado. */
export function datosParaEnviar(
  paso: 'personales' | 'domicilio' | 'emergencia',
  campos: readonly CampoRegistro[],
  valores: Record<string, string | undefined>,
): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const campo of camposDelPaso(paso, campos)) {
    if (campo.bloqueado) continue;
    const valor = normalizarValor(campo.campo, valores[campo.campo] ?? '');
    if (valor === '' && campo.actual === null) continue;
    if (valor !== (campo.actual ?? '')) salida[campo.campo] = valor;
  }
  return salida;
}

/** Valores iniciales del formulario: lo ya guardado (registro reanudado) + borrador local. */
export function valoresIniciales(campos: readonly CampoRegistro[], borrador: Record<string, string> = {}): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const campo of campos) {
    if (esCampoMedico(campo.campo)) continue;
    if (campo.actual !== null) valores[campo.campo] = campo.actual;
  }
  for (const [campo, valor] of Object.entries(borrador)) {
    const definicion = campos.find((c) => c.campo === campo);
    if (definicion && !definicion.bloqueado && valor.trim() !== '') valores[campo] = valor;
  }
  return valores;
}

/** ¿Al paso le falta algún obligatorio según el backend? */
export function pasoIncompleto(paso: 'personales' | 'domicilio' | 'emergencia', estado: EstadoRegistro): boolean {
  const faltan = new Set(estado.datos.faltan.map((f) => f.campo));
  return camposDelPaso(paso, estado.datos.campos).some((c) => faltan.has(c.campo));
}

/** ¿Falta la fotografía para expediente y el backend la exige? (backend anterior sin bloque `foto` → no). */
export function fotoPendiente(estado: EstadoRegistro): boolean {
  return Boolean(estado.foto?.obligatoria && !estado.foto.completo);
}

/**
 * ¿Falta completar la Solicitud de empleo + Estudio socioeconómico y el
 * backend la exige? (backend anterior sin el bloque → no).
 */
export function solicitudPendiente(estado: EstadoRegistro): boolean {
  return Boolean(estado.solicitud_empleo?.exigida && !estado.solicitud_empleo.completo);
}

/**
 * Lo que falta, en texto para la persona. Lo manda el backend
 * (`pendientes`); si exige la foto y no la listó (versión intermedia), se
 * agrega para que nunca falte en «Todavía falta».
 */
export function pendientesLegibles(estado: EstadoRegistro): string[] {
  const lista = estado.pendientes.filter((p) => p.trim() !== '');
  if (fotoPendiente(estado) && !lista.some((p) => /fotograf/i.test(p))) lista.push('fotografía para expediente');
  // El backend no la lista en `pendientes` del registro: se agrega aquí (el detalle va en su fila).
  if (solicitudPendiente(estado) && !lista.some((p) => /solicitud de empleo/i.test(p))) lista.push('solicitud de empleo y estudio socioeconómico');
  return lista;
}

/**
 * Paso donde reanudar al volver a abrir la app: el primer paso de datos con
 * faltantes; luego la foto si falta; luego la solicitud de empleo; si no, documentos; si todo está, revisión.
 * Un `guardado` local (último paso que la persona alcanzó) gana si es anterior.
 */
export function pasoParaReanudar(estado: EstadoRegistro, guardado?: ClavePaso | null, sinTener: readonly number[] = []): number {
  const indice = (clave: ClavePaso) => PASOS_REGISTRO.findIndex((p) => p.clave === clave);
  let sugerido: ClavePaso = 'revision';

  for (const paso of ['personales', 'domicilio', 'emergencia'] as const) {
    if (pasoIncompleto(paso, estado)) {
      sugerido = paso;
      break;
    }
  }

  if (sugerido === 'revision' && fotoPendiente(estado)) sugerido = 'foto';
  if (sugerido === 'revision' && solicitudPendiente(estado)) sugerido = 'solicitud';

  // Documentos incompletos → paso de documentos, salvo que todo lo que falta
  // ya esté marcado «No tengo» (va a la carta compromiso).
  const todoMarcado = documentosSinTener(estado, sinTener).length > 0 && documentosSinResolver(estado, sinTener).length === 0;
  if (sugerido === 'revision' && !estado.documentos.completo && !todoMarcado) sugerido = 'documentos';
  if (guardado && indice(guardado) >= 0 && indice(guardado) < indice(sugerido)) return indice(guardado);
  return indice(sugerido);
}

/**
 * Documentos que todavía falta subir (o corregir) para terminar. Nunca los
 * que genera PEOPLE (Solicitud de empleo, Estudio socioeconómico): salen del
 * paso «Solicitud de empleo», no se suben ni se marcan «No tengo».
 */
export function documentosPorSubir(estado: EstadoRegistro) {
  return estado.documentos.lista.filter(
    (d) => d.obligatorio && !esGeneradoPorSistema(d) && ['pendiente', 'rechazado', 'requiere_correccion', 'vencido', 'cambio_autorizado'].includes(d.estado),
  );
}

/**
 * Marcas «No tengo este documento» que siguen aplicando: solo documentos que
 * todavía faltan. Si la persona ya lo subió (o RH lo quitó de la lista), la
 * marca se descarta sola. Conserva el orden de la lista del backend.
 */
export function sinTenerVigentes(estado: EstadoRegistro, sinTener: readonly number[]): number[] {
  const marcados = new Set(sinTener);
  return documentosPorSubir(estado)
    .filter((d) => marcados.has(d.id))
    .map((d) => d.id);
}

/** Documentos que faltan y NO están marcados «No tengo»: estos sí bloquean el paso de documentos. */
export function documentosSinResolver(estado: EstadoRegistro, sinTener: readonly number[]) {
  const marcados = new Set(sinTener);
  return documentosPorSubir(estado).filter((d) => !marcados.has(d.id));
}

/** Documentos marcados «No tengo» (los que irán en la carta compromiso). */
export function documentosSinTener(estado: EstadoRegistro, sinTener: readonly number[]) {
  const marcados = new Set(sinTener);
  return documentosPorSubir(estado).filter((d) => marcados.has(d.id));
}

/** Máximo de documentos «No tengo» que cubre una carta compromiso (backend; 2 por defecto). */
export function maxCartaRegistro(estado: EstadoRegistro): number {
  return maxDocumentosCarta(estado.max_documentos_carta);
}

/**
 * ¿Marcó «No tengo» en más documentos de los que cubre una carta? Puede
 * terminar igual, pero sin carta: la app quedará limitada a subir
 * documentos hasta que le falten el máximo o menos (entonces la carta se
 * genera sola en el backend).
 */
export function excedeMaximoCarta(estado: EstadoRegistro, sinTener: readonly number[]): boolean {
  return documentosSinTener(estado, sinTener).length > maxCartaRegistro(estado);
}

/**
 * ¿Se puede terminar el registro? Lo decide el backend (`puede_finalizar`),
 * salvo cuando solo faltan documentos y TODOS están marcados «No tengo»:
 * entonces se termina con carta compromiso (el backend vuelve a validarlo en
 * `registro/finalizar` con `documentos_sin_tener`).
 */
export function puedeFinalizarRegistro(estado: EstadoRegistro, sinTener: readonly number[]): boolean {
  if (fotoPendiente(estado)) return false;
  if (solicitudPendiente(estado)) return false;
  if (estado.puede_finalizar) return true;
  return estado.aplica && estado.datos.completo && documentosSinTener(estado, sinTener).length > 0 && documentosSinResolver(estado, sinTener).length === 0;
}

/**
 * ¿«Siguiente»/«Entrar a la app» va deshabilitado? En el paso «foto»,
 * mientras el backend no confirme `foto.completo` (si la exige); en
 * revisión, mientras no se pueda finalizar.
 */
export function siguienteDeshabilitado(clave: ClavePaso | undefined, estado: EstadoRegistro | undefined, sinTener: readonly number[], guardando = false): boolean {
  if (guardando) return true;
  if (!estado || !clave) return false;
  if (clave === 'foto') return fotoPendiente(estado);
  if (clave === 'revision') return !puedeFinalizarRegistro(estado, sinTener);
  return false;
}

/** «1 documento» / «3 documentos». */
export function textoDocumentos(n: number): string {
  return n === 1 ? '1 documento' : `${n} documentos`;
}

/** Texto del progreso del asistente: «Paso 2 de 6». */
export function textoProgreso(indice: number): string {
  return `Paso ${indice + 1} de ${PASOS_REGISTRO.length}`;
}
