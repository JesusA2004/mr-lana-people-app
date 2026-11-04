import type {
  ContenidoEvaluacionInduccion,
  EvaluacionInduccion,
  InduccionResumen,
  IntentoInduccion,
  MaterialInduccion,
  MiInduccionAsignada,
  RespuestasInduccion,
} from '@/types/induccion';

/**
 * Lógica de PRESENTACIÓN de la inducción. El estado real (qué páginas
 * del PDF oficial están vistas, si la evaluación está habilitada, la calificación, el
 * reintento) lo decide el backend; aquí solo se traduce a texto y se
 * elige qué mostrar. Nunca se califica en el teléfono.
 */

export type FaseInduccion =
  | 'sin_induccion'
  | 'contenido'
  | 'evaluacion_disponible'
  | 'pendiente_rh'
  | 'reforzamiento'
  | 'reevaluacion_disponible'
  | 'aprobada';

export function faseInduccion(resumen: InduccionResumen | null, evaluacion: EvaluacionInduccion | null): FaseInduccion {
  if (!resumen && !evaluacion) return 'sin_induccion';
  if (evaluacion) {
    switch (evaluacion.estado) {
      case 'aprobada':
        return 'aprobada';
      case 'pendiente_calificacion_rh':
        return 'pendiente_rh';
      case 'requiere_reforzamiento':
        return 'reforzamiento';
      case 'reevaluacion_habilitada':
        return evaluacion.puedePresentar ? 'reevaluacion_disponible' : 'reforzamiento';
      case 'disponible':
        return evaluacion.puedePresentar ? 'evaluacion_disponible' : 'contenido';
    }
  }
  return 'contenido';
}

/** "12 de 30 páginas" — los números vienen del servidor. */
export function textoProgreso(resumen: InduccionResumen): string {
  const total = resumen.totalPaginas;
  return `${Math.min(resumen.paginasVistas.length, total)} de ${total} ${total === 1 ? 'página' : 'páginas'}`;
}

export const VIDEO_PREPARANDO_MENSAJE = 'El video se está procesando, intenta más tarde.';

/** Texto cuando el video aún no se puede reproducir (el del backend si lo mandó). */
export function mensajeVideoPreparando(material: MaterialInduccion | null | undefined): string {
  return material?.videoMensaje ?? VIDEO_PREPARANDO_MENSAJE;
}

/** ¿La persona tiene un VIDEO obligatorio asignado? (`miInduccion.material`, o el material activo si el servidor no lo manda). */
export function videoRequerido(asignada: MiInduccionAsignada | null | undefined, material: MaterialInduccion | null | undefined): boolean {
  if (asignada?.material) return asignada.material.incluido && asignada.material.tipo === 'video';
  return material?.tipo === 'video';
}

/**
 * ¿Se habilita «Terminé la inducción»? Espejo de
 * InduccionPdfService::terminar(): las hojas solo si la presentación está
 * asignada y el video solo si está asignado y el servidor lo reporta
 * completo. El backend vuelve a validar; esto solo evita un botón inútil.
 */
export function puedeTerminarInduccion(opciones: {
  completado: boolean;
  paginasFaltantes: number;
  presentacionIncluida: boolean;
  videoRequerido: boolean;
  videoCompletado: boolean;
}): boolean {
  if (opciones.completado) return false;
  if (opciones.presentacionIncluida && opciones.paginasFaltantes > 0) return false;
  return !opciones.videoRequerido || opciones.videoCompletado;
}

/**
 * Anti-adelanto del reproductor. El servidor entrega el HLS COMPLETO (el
 * video precarga y no se traba) y solo acredita como visto lo que avanza al
 * ritmo del tiempo real (heartbeat); el seek manual lo bloquea el cliente.
 *
 * Se valida la POSICIÓN, nunca la carga: con `timeUpdate` cada ~0.5 s, un
 * avance mayor a lo que pudo reproducirse en el tiempo real transcurrido
 * (`segundosReales`, mínimo `SALTO_MAXIMO_SEGUNDOS`) es un salto manual; si
 * cae más allá de lo ya visto (+ `TOLERANCIA_SALTO_SEGUNDOS`, para los
 * micro-saltos del reproductor al salir de un buffering) se regresa ahí. Un
 * buffering deja el tiempo quieto y luego sigue: nunca cuenta como adelanto.
 * El máximo visto solo sube lo que de verdad avanzó la reproducción (encadenar
 * saltos pequeños no lo «estira»). Mismo criterio que el portal
 * (resources/js/lib/induccion/antiAdelantoVideo.ts).
 */
export const SALTO_MAXIMO_SEGUNDOS = 2.5;
export const TOLERANCIA_SALTO_SEGUNDOS = 3;

export function evaluarSaltoVideo(
  anterior: number,
  actual: number,
  maximoVisto: number,
  maximoServidor: number,
  segundosReales = 0,
): { regresarA: number | null; maximoVisto: number } {
  const delta = actual - anterior;
  const continuo = delta >= 0 && delta <= Math.max(SALTO_MAXIMO_SEGUNDOS, segundosReales + 1);
  if (continuo) {
    return { regresarA: null, maximoVisto: Math.max(maximoVisto, Math.min(actual, maximoVisto + delta)) };
  }
  // Salto (seek): retroceder o moverse dentro de lo visto se permite.
  const limite = Math.max(maximoVisto, maximoServidor);
  if (actual > limite + TOLERANCIA_SALTO_SEGUNDOS) return { regresarA: limite, maximoVisto };
  return { regresarA: null, maximoVisto };
}

/** Páginas que aún no se han mostrado (para «Te faltan N»). */
export function paginasFaltantes(resumen: InduccionResumen | null, total: number): number {
  if (!resumen || total <= 0) return total;
  return Math.max(0, total - new Set(resumen.paginasVistas.filter((p) => p >= 1 && p <= total)).size);
}

/** CUÁLES páginas faltan (en orden), para decir «te falta la página 30» y llevar ahí. */
export function listaPaginasFaltantes(paginasVistas: readonly number[], total: number): number[] {
  if (total <= 0) return [];
  const vistas = new Set(paginasVistas);
  const faltan: number[] = [];
  for (let pagina = 1; pagina <= total; pagina += 1) if (!vistas.has(pagina)) faltan.push(pagina);
  return faltan;
}

/** «Te falta la página 30» / «Te faltan las páginas 12, 13 y 30» / «Te faltan 12 páginas (empieza en la 5)». */
export function textoPaginasFaltantes(faltan: readonly number[]): string {
  if (faltan.length === 0) return 'Ya viste todas las páginas.';
  if (faltan.length === 1) return `Te falta la página ${faltan[0]}`;
  if (faltan.length <= 5) return `Te faltan las páginas ${faltan.slice(0, -1).join(', ')} y ${faltan[faltan.length - 1]}`;
  return `Te faltan ${faltan.length} páginas (empieza en la ${faltan[0]})`;
}

/**
 * Orden obligatorio presentación → video: páginas que todavía bloquean el
 * video. Las manda el backend (`material.paginasFaltantes`); se descuentan
 * las que la persona ya vio en esta sesión. Vacío = el video se puede abrir.
 */
export function paginasQueBloqueanVideo(material: MaterialInduccion | null | undefined, paginasVistas: readonly number[]): number[] {
  if (!material?.videoBloqueado) return [];
  const vistas = new Set(paginasVistas);
  return material.paginasFaltantes.filter((p) => !vistas.has(p));
}

/** «12:05» / «1:02:09» para el reproductor. */
export function formatoTiempo(segundos: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(segundos) ? segundos : 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * Barra de progreso propia del video: convierte el toque/arrastre (fracción
 * 0–1 del ancho) en segundos, SIN pasar de lo ya visto. Adelantar más allá
 * de lo visto no es posible desde la barra (el anti-adelanto de
 * `evaluarSaltoVideo` sigue cuidando cualquier otro caso).
 */
export function posicionDesdeBarra(fraccion: number, duracion: number, maximoVisto: number): number {
  if (!Number.isFinite(duracion) || duracion <= 0) return 0;
  const f = Math.min(1, Math.max(0, Number.isFinite(fraccion) ? fraccion : 0));
  const limite = Math.min(duracion, Math.max(0, maximoVisto));
  return Math.min(f * duracion, limite);
}

/** Retroceder N segundos (nunca antes de 0). */
export function posicionRetroceder(actual: number, segundos = 10): number {
  return Math.max(0, actual - segundos);
}

export type ErrorVideo = 'caducada' | 'sin_conexion' | 'presentacion_incompleta' | 'otro';

/**
 * Qué falló al reproducir/arrancar el video, para un mensaje específico.
 * `sinConexion` viene de NetInfo; `status` del 4xx del backend.
 */
export function clasificarErrorVideo(opciones: { sinConexion: boolean; status?: number; codigo?: string | null; mensaje?: string | null }): ErrorVideo {
  if (opciones.sinConexion) return 'sin_conexion';
  if (opciones.codigo === 'presentacion_incompleta') return 'presentacion_incompleta';
  if (opciones.status === 401 || opciones.status === 403 || opciones.status === 410) return 'caducada';
  if (opciones.mensaje && /403|forbidden|expired|signature|caduc/i.test(opciones.mensaje)) return 'caducada';
  return 'otro';
}

/** Último intento ya calificado por completo (A+B+C+D). */
export function ultimoIntentoCalificado(evaluacion: EvaluacionInduccion | null): IntentoInduccion | null {
  if (!evaluacion) return null;
  const calificados = evaluacion.intentos.filter((i) => !i.pendienteCalificacionRh && i.calificacionTotal !== null);
  return calificados.length > 0 ? calificados[calificados.length - 1] : null;
}

export interface ResultadoInduccion {
  puntos: string;
  porcentaje: string;
  etiqueta: string;
  tono: 'success' | 'warning';
  mensaje: string | null;
}

/**
 * "28 / 30 · 93 % · Comprensión sobresaliente". El nivel lo manda el backend
 * (`nivel`); la etiqueta es solo su texto para la persona.
 */
export function resultadoInduccion(intento: IntentoInduccion, totalPuntos = 30): ResultadoInduccion {
  const calificacion = intento.calificacionTotal ?? 0;
  const puntos = `${formatoPuntos(calificacion)} / ${totalPuntos}`;
  const porcentaje = `${Math.round((calificacion / totalPuntos) * 100)} %`;

  switch (intento.nivel) {
    case 'sobresaliente':
      return { puntos, porcentaje, etiqueta: 'Comprensión sobresaliente', tono: 'success', mensaje: null };
    case 'aprobado':
      return { puntos, porcentaje, etiqueta: 'Aprobado', tono: 'success', mensaje: null };
    default:
      return {
        puntos,
        porcentaje,
        etiqueta: intento.aprobado ? 'Aprobado' : 'Requiere reforzamiento',
        tono: intento.aprobado ? 'success' : 'warning',
        mensaje: intento.aprobado ? null : 'Recursos Humanos te apoyará a reforzar algunos temas.',
      };
  }
}

function formatoPuntos(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
}

/** Fecha "YYYY-MM-DD" → "15 de octubre de 2026" (sin desfase de zona horaria). */
export function fechaLegible(fecha: string | null): string | null {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${dia} de ${meses[mes - 1]} de ${anio}`;
}

/** Todas las secciones calificables (A, B, C y D) contestadas. E (opinión) es opcional. */
export function evaluacionCompleta(contenido: ContenidoEvaluacionInduccion, r: RespuestasInduccion): boolean {
  const a = contenido.seccionA.every((p) => typeof r.a[p.indice] === 'number');
  const b = contenido.seccionB.every((p) => typeof r.b[p.indice] === 'boolean');
  const c = contenido.seccionC.conceptos.every((p) => typeof r.c[p.indice] === 'string' && r.c[p.indice] !== '');
  const d = contenido.seccionD.every((p) => (r.d[p.clave] ?? '').trim() !== '');
  return a && b && c && d;
}

/** Cuántas preguntas calificables faltan (para el aviso antes de enviar). */
export function preguntasFaltantes(contenido: ContenidoEvaluacionInduccion, r: RespuestasInduccion): number {
  return (
    contenido.seccionA.filter((p) => typeof r.a[p.indice] !== 'number').length +
    contenido.seccionB.filter((p) => typeof r.b[p.indice] !== 'boolean').length +
    contenido.seccionC.conceptos.filter((p) => !r.c[p.indice]).length +
    contenido.seccionD.filter((p) => (r.d[p.clave] ?? '').trim() === '').length
  );
}
