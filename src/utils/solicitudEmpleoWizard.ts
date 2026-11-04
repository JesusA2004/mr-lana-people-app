import type {
  CampoListaSolicitud,
  CampoSolicitud,
  CondicionSolicitud,
  GuardarSeccionSolicitud,
  ListaSolicitud,
  SeccionSolicitud,
  TipoCampoSolicitud,
  ValorSolicitud,
} from '@/types/solicitudEmpleo';

/**
 * Lógica PURA del sub-asistente «Solicitud de empleo y estudio
 * socioeconómico» del registro (docs/SOLICITUD_EMPLEO_Y_SOCIOECONOMICO.md):
 * valores iniciales (lo guardado + sugerencias por confirmar), campos
 * condicionales (`requerido_si`), validación antes de enviar, armado del
 * cuerpo del POST, mapeo de 422 a cada campo y en qué sección retomar.
 * El catálogo y la completitud los decide el backend; aquí solo se evita
 * mandar una sección a medias cuando la persona pide «Guardar y continuar».
 */

/** Valor de un control en pantalla: texto (también números), sí/no, opciones marcadas o nada. */
export type ValorForma = string | boolean | string[] | null;

export interface FormaSeccion {
  valores: Record<string, ValorForma>;
  /** Campos marcados «No aplica». */
  noAplica: string[];
  /** Renglones de la lista de la sección (todo como texto; '' = vacío). */
  filas: Record<string, string>[];
  /** «No tengo dependientes» / «Es mi primer empleo». */
  vacia: boolean;
  /** Campos prellenados con una sugerencia que la persona aún no confirma. */
  sugeridos: string[];
}

// ───────────────────────── Valores ─────────────────────────

/** Valor del backend → valor del control. */
export function aForma(tipo: TipoCampoSolicitud, valor: ValorSolicitud): ValorForma {
  if (tipo === 'booleano') return typeof valor === 'boolean' ? valor : valor === null ? null : valor === 1 || valor === '1' || valor === 'true';
  if (tipo === 'multiselect') return Array.isArray(valor) ? [...valor] : [];
  if (valor === null || Array.isArray(valor) || typeof valor === 'boolean') return tipo === 'select' ? null : '';
  if (tipo === 'select') return String(valor);
  // Montos: «1500.00» se muestra «1500».
  if (tipo === 'moneda') return String(valor).replace(/\.0+$/, '');
  return String(valor);
}

function texto(valor: ValorForma | undefined): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

/** Valor del control → lo que espera el backend (vacío = null). */
export function desdeForma(tipo: TipoCampoSolicitud, valor: ValorForma | undefined): ValorSolicitud {
  if (tipo === 'booleano') return typeof valor === 'boolean' ? valor : null;
  if (tipo === 'multiselect') return Array.isArray(valor) ? [...new Set(valor)] : [];
  const t = texto(valor);
  if (t === '') return null;
  if (tipo === 'entero') return /^-?\d+$/.test(t) ? Number.parseInt(t, 10) : t;
  if (tipo === 'moneda') {
    const n = Number(t.replace(/[$\s,]/g, ''));
    return Number.isFinite(n) ? n : t;
  }
  return t;
}

/** Lo guardado (o la sugerencia, por confirmar) de cada campo, la lista y sus marcas. */
export function formaInicial(seccion: SeccionSolicitud): FormaSeccion {
  const valores: Record<string, ValorForma> = {};
  const sugeridos: string[] = [];
  const noAplica: string[] = [];

  for (const campo of seccion.campos) {
    if (campo.no_aplica) noAplica.push(campo.campo);
    const sinValor = campo.valor === null || (Array.isArray(campo.valor) && campo.valor.length === 0);
    const usarSugerencia = sinValor && campo.sugerencia !== null && !campo.bloqueado && !campo.no_aplica;
    valores[campo.campo] = aForma(campo.tipo, usarSugerencia ? campo.sugerencia : campo.valor);
    if (usarSugerencia) sugeridos.push(campo.campo);
  }

  const filas = (seccion.lista?.filas ?? []).map((fila) => {
    const salida: Record<string, string> = {};
    for (const definicion of seccion.lista?.campos ?? []) {
      const v = fila[definicion.campo];
      salida[definicion.campo] = v === null || v === undefined ? '' : String(v);
    }
    return salida;
  });

  return { valores, noAplica, filas, vacia: Boolean(seccion.lista?.vacia), sugeridos };
}

/** Renglón nuevo vacío de la lista. */
export function filaVacia(lista: ListaSolicitud): Record<string, string> {
  return Object.fromEntries(lista.campos.map((c) => [c.campo, '']));
}

/** ¿Se puede agregar otro renglón? (el formato impreso tiene un número fijo). */
export function puedeAgregarFila(lista: ListaSolicitud, forma: FormaSeccion): boolean {
  return !lista.bloqueada && !forma.vacia && forma.filas.length < lista.maximo;
}

// ───────────────────────── Condiciones ─────────────────────────

/** Valores con los que se evalúan las condiciones: lo guardado + lo que se está capturando. */
export function contextoDe(seccion: SeccionSolicitud, forma: FormaSeccion): Record<string, ValorSolicitud> {
  const contexto: Record<string, ValorSolicitud> = {};
  for (const campo of seccion.campos) {
    contexto[campo.campo] = campo.bloqueado || !(campo.campo in forma.valores) ? campo.valor : desdeForma(campo.tipo, forma.valores[campo.campo]);
  }
  return contexto;
}

/** Espejo de `PerfilIngresoService::esRequerido()` para una condición. */
export function cumpleCondicion(condicion: CondicionSolicitud, contexto: Record<string, ValorSolicitud>): boolean {
  const referencia = contexto[condicion.campo] ?? null;
  const esperado = condicion.valor;

  switch (condicion.operador) {
    case 'igual':
      return referencia === esperado;
    case 'en':
      return Array.isArray(esperado) && typeof referencia === 'string' && esperado.includes(referencia);
    case 'distinto':
      return referencia !== null && referencia !== esperado;
    case 'positivo': {
      const n = typeof referencia === 'number' ? referencia : typeof referencia === 'string' ? Number(referencia) : Number.NaN;
      return Number.isFinite(n) && n > 0;
    }
    case 'contiene':
      return Array.isArray(referencia) && typeof esperado === 'string' && referencia.includes(esperado);
    default:
      return true;
  }
}

/** Un campo condicional solo se muestra cuando su condición se cumple (si no, el formato imprime «No aplica»). */
export function campoVisible(campo: CampoSolicitud, contexto: Record<string, ValorSolicitud>): boolean {
  return campo.requerido_si === null || cumpleCondicion(campo.requerido_si, contexto);
}

export function campoRequerido(campo: CampoSolicitud, contexto: Record<string, ValorSolicitud>): boolean {
  return campo.requerido_si !== null ? cumpleCondicion(campo.requerido_si, contexto) : campo.requerido;
}

/** Campos que la persona captura en esta pantalla (visibles y editables). */
export function camposEditables(seccion: SeccionSolicitud, forma: FormaSeccion): CampoSolicitud[] {
  const contexto = contextoDe(seccion, forma);
  return seccion.campos.filter((c) => !c.bloqueado && c.origen === 'solicitud' && campoVisible(c, contexto));
}

/** Datos ya registrados que solo se muestran (de «Datos personales» o capturados por RH). */
export function camposDeSoloLectura(seccion: SeccionSolicitud): CampoSolicitud[] {
  return seccion.campos.filter((c) => c.bloqueado || c.origen === 'datos_personales');
}

/**
 * Lo que falta de la sección y NO se captura aquí (vive en el paso «Datos
 * personales» del registro, p. ej. la CURP): se avisa con un atajo.
 */
export function faltantesDeDatosPersonales(seccion: SeccionSolicitud): string[] {
  const propios = new Set(seccion.campos.filter((c) => c.origen === 'datos_personales').map((c) => c.etiqueta));
  return seccion.faltantes.filter((f) => propios.has(f));
}

// ───────────────────────── Validación ─────────────────────────

function vacio(campo: Pick<CampoSolicitud, 'tipo' | 'min'>, valor: ValorForma | undefined): boolean {
  if (campo.tipo === 'booleano') return typeof valor !== 'boolean';
  if (campo.tipo === 'multiselect') return campo.min !== null && (!Array.isArray(valor) || valor.length < campo.min);
  if (campo.tipo === 'select') return typeof valor !== 'string' || valor === '';
  return texto(valor) === '';
}

function mensajeFalta(campo: Pick<CampoSolicitud, 'tipo' | 'min'>): string {
  if (campo.tipo === 'multiselect' && campo.min !== null) return campo.min === 1 ? 'Elige al menos una opción.' : `Elige al menos ${campo.min} opciones.`;
  if (campo.tipo === 'booleano' || campo.tipo === 'select' || campo.tipo === 'multiselect') return 'Elige una opción para continuar.';
  if (campo.tipo === 'fecha') return 'Elige la fecha.';
  return 'Falta este dato.';
}

/** Error de formato de un valor (null = válido o vacío). */
export function errorDeFormato(campo: Pick<CampoSolicitud, 'tipo' | 'min' | 'max'>, valor: ValorForma | undefined): string | null {
  const t = texto(valor);
  if (t === '') return null;

  switch (campo.tipo) {
    case 'entero': {
      if (!/^\d+$/.test(t)) return 'Escribe solo números enteros, sin puntos ni letras.';
      const n = Number.parseInt(t, 10);
      if (campo.min !== null && n < campo.min) return campo.max !== null ? `Escribe un número entre ${campo.min} y ${campo.max}.` : `El mínimo es ${campo.min}.`;
      if (campo.max !== null && n > campo.max) return campo.min !== null ? `Escribe un número entre ${campo.min} y ${campo.max}.` : `El máximo es ${campo.max}.`;
      return null;
    }
    case 'moneda': {
      const n = Number(t.replace(/[$\s,]/g, ''));
      if (!Number.isFinite(n) || n < 0) return 'Escribe solo el monto en números, por ejemplo 1500.';
      if (n > 99999999) return 'Revisa el monto: es demasiado grande.';
      return null;
    }
    case 'fecha':
      return /^\d{4}-\d{2}-\d{2}$/.test(t) ? null : 'Elige la fecha.';
    case 'mes':
      return /^\d{4}-(0[1-9]|1[0-2])$/.test(t) ? null : 'Escribe mes y año como AAAA-MM, por ejemplo 2021-03.';
    default:
      return campo.max !== null && t.length > campo.max ? `Escribe como máximo ${campo.max} caracteres.` : null;
  }
}

/** ¿El renglón tiene algo capturado? (los totalmente vacíos no se envían). */
function filaConDatos(fila: Record<string, string>): boolean {
  return Object.values(fila).some((v) => v.trim() !== '');
}

/** Obligatorio de un dato del renglón (mismas reglas que `PerfilIngresoService::faltantesDeLista`). */
export function requeridoEnFila(lista: ListaSolicitud, campo: CampoListaSolicitud, fila: Record<string, string>): boolean {
  if (campo.requerido) return true;
  if (campo.campo === 'parentesco_otro') return (fila.parentesco ?? '') === 'otro';
  if (campo.campo === 'edad') return lista.campos.some((c) => c.campo === 'fecha_nacimiento') && (fila.fecha_nacimiento ?? '').trim() === '';
  return false;
}

/** ¿El dato del renglón se muestra? («Otro parentesco» solo con «Otro»). */
export function visibleEnFila(campo: CampoListaSolicitud, fila: Record<string, string>): boolean {
  return campo.campo !== 'parentesco_otro' || (fila.parentesco ?? '') === 'otro';
}

/**
 * Errores de la sección por campo (`campo`, o `lista.indice.campo` en los
 * renglones; `lista` para la lista entera). `exigirRequeridos = false` en
 * «Guardar y salir»: solo formato (guardar a medias está permitido).
 */
export function validarSeccion(seccion: SeccionSolicitud, forma: FormaSeccion, exigirRequeridos = true): Record<string, string> {
  const errores: Record<string, string> = {};
  const contexto = contextoDe(seccion, forma);

  for (const campo of camposEditables(seccion, forma)) {
    if (forma.noAplica.includes(campo.campo)) continue;
    const valor = forma.valores[campo.campo];
    if (vacio(campo, valor)) {
      if (exigirRequeridos && campoRequerido(campo, contexto)) errores[campo.campo] = mensajeFalta(campo);
      continue;
    }
    const formato = errorDeFormato(campo, valor);
    if (formato) errores[campo.campo] = formato;
  }

  const lista = seccion.lista;
  if (!lista || lista.bloqueada) return errores;

  const filas = forma.filas;
  if (forma.vacia && filas.some(filaConDatos)) {
    errores[lista.clave] = `Marcaste «${lista.etiqueta_vacia ?? 'No tengo'}» pero hay renglones capturados: quítalos o desmarca la opción.`;
    return errores;
  }
  if (filas.length > lista.maximo) errores[lista.clave] = `El formato solo tiene espacio para ${lista.maximo}.`;

  filas.forEach((fila, i) => {
    for (const campo of lista.campos) {
      if (!visibleEnFila(campo, fila)) continue;
      const valor = fila[campo.campo] ?? '';
      const clave = `${lista.clave}.${i}.${campo.campo}`;
      if (vacio(campo, valor)) {
        if (exigirRequeridos && requeridoEnFila(lista, campo, fila)) errores[clave] = campo.campo === 'edad' ? 'Escribe la edad o su fecha de nacimiento.' : mensajeFalta(campo);
        continue;
      }
      const formato = errorDeFormato(campo, valor);
      if (formato) errores[clave] = formato;
    }
  });

  if (exigirRequeridos && !forma.vacia && !errores[lista.clave]) {
    const capturadas = filas.filter(filaConDatos).length;
    const minimo = Math.max(lista.minimo, lista.bandera_vacia ? 1 : 0);
    if (capturadas < minimo) {
      errores[lista.clave] =
        lista.bandera_vacia && lista.minimo === 0
          ? `Agrega al menos un renglón o marca «${lista.etiqueta_vacia ?? 'No tengo'}».`
          : `Captura al menos ${minimo} (${lista.etiqueta.toLowerCase()}).`;
    }
  }

  return errores;
}

// ───────────────────────── Envío ─────────────────────────

/**
 * Cuerpo de `POST registro/solicitud/{seccion}`: solo lo que la persona
 * captura aquí. Un condicional que dejó de aplicar se limpia (si tenía
 * valor). `no_aplica` va completa si la sección admite «No aplica».
 */
export function cuerpoSeccion(seccion: SeccionSolicitud, forma: FormaSeccion): GuardarSeccionSolicitud {
  const datos: Record<string, unknown> = {};
  const contexto = contextoDe(seccion, forma);

  for (const campo of seccion.campos) {
    if (campo.bloqueado || campo.origen !== 'solicitud') continue;
    if (forma.noAplica.includes(campo.campo)) {
      datos[campo.campo] = null;
      continue;
    }
    if (!campoVisible(campo, contexto)) {
      if (campo.valor !== null) datos[campo.campo] = null;
      continue;
    }
    datos[campo.campo] = desdeForma(campo.tipo, forma.valores[campo.campo]);
  }

  const lista = seccion.lista;
  if (lista && !lista.bloqueada) {
    datos[lista.clave] = forma.vacia
      ? []
      : forma.filas.filter(filaConDatos).map((fila) => {
          const salida: Record<string, string | number | null> = {};
          for (const campo of lista.campos) {
            const v = visibleEnFila(campo, fila) ? (fila[campo.campo] ?? '').trim() : '';
            salida[campo.campo] = v === '' ? null : campo.tipo === 'entero' && /^\d+$/.test(v) ? Number.parseInt(v, 10) : v;
          }
          return salida;
        });
    if (lista.bandera_vacia) datos[lista.bandera_vacia] = forma.vacia;
  }

  const admiteNoAplica = seccion.campos.some((c) => c.permite_no_aplica && !c.bloqueado);
  return admiteNoAplica ? { datos, no_aplica: forma.noAplica.filter((c) => seccion.campos.some((d) => d.campo === c && d.permite_no_aplica)) } : { datos };
}

// ───────────────────────── Errores del backend ─────────────────────────

const CLAVES_GENERALES = new Set(['datos', 'registro', 'no_aplica', 'seccion', 'solicitud_empleo']);

/**
 * 422 del backend → error por campo (`datos.tipo_sanguineo` →
 * `tipo_sanguineo`, `datos.dependientes.0.nombre` → `dependientes.0.nombre`)
 * y uno general (registro cerrado, dato ya registrado por RH, «No aplica»
 * no permitido…). Los mensajes ya vienen en español.
 */
export function mapearErroresSolicitud(errores: Record<string, string[] | undefined> | null | undefined): { campos: Record<string, string>; general: string | null } {
  const campos: Record<string, string> = {};
  let general: string | null = null;

  for (const [clave, mensajes] of Object.entries(errores ?? {})) {
    const mensaje = mensajes?.find((m) => typeof m === 'string' && m.trim() !== '');
    if (!mensaje) continue;
    const campo = clave.replace(/^datos\./, '');
    if (CLAVES_GENERALES.has(campo)) general ??= mensaje;
    else campos[campo] = mensaje;
  }

  if (!general && Object.keys(campos).length > 0) general = 'Revisa los campos marcados en rojo.';
  return { campos, general };
}

// ───────────────────────── Navegación ─────────────────────────

/**
 * Sección donde abrir el sub-asistente: la pedida (si existe); si no, la
 * primera incompleta; con todo completo, la primera.
 */
export function indiceParaRetomar(secciones: readonly Pick<SeccionSolicitud, 'clave' | 'completa'>[], preferida?: string | null): number {
  if (preferida) {
    const i = secciones.findIndex((s) => s.clave === preferida);
    if (i >= 0) return i;
  }
  const incompleta = secciones.findIndex((s) => !s.completa);
  return incompleta >= 0 ? incompleta : 0;
}

/**
 * Del 422 de `registro/finalizar` («… Falta: Datos personales: …;
 * Vivienda: ….») la PRIMERA sección mencionada (para llevar a la persona
 * justo ahí). null si el mensaje no nombra ninguna.
 */
export function seccionDesdeMensaje(mensaje: string, secciones: readonly Pick<SeccionSolicitud, 'clave' | 'titulo'>[]): string | null {
  let mejor: { clave: string; posicion: number } | null = null;
  for (const s of secciones) {
    const posicion = mensaje.indexOf(`${s.titulo}:`);
    if (posicion >= 0 && (mejor === null || posicion < mejor.posicion)) mejor = { clave: s.clave, posicion };
  }
  return mejor?.clave ?? null;
}

/** «Sección 3 de 9». */
export function textoSeccion(indice: number, total: number): string {
  return `Sección ${indice + 1} de ${total}`;
}

/** Secciones con nota fija: el croquis se dibuja a mano; la situación económica es confidencial. */
export const NOTA_CROQUIS = 'El croquis de tu domicilio no se captura aquí: lo dibujarás a mano en el formato impreso cuando lo firmes.';
export const NOTA_PRIVACIDAD = 'Estos datos son confidenciales: se guardan cifrados y solo los ve personal autorizado de Recursos Humanos para tu estudio socioeconómico.';
