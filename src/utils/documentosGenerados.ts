import type { CapturaGeneradoPorSistema, EstadoGeneradoPorSistema, GeneradoPorSistema } from '@/types/document';

/**
 * Lógica PURA de los formatos que PEOPLE GENERA con los datos de la persona
 * (Solicitud de empleo, Estudio socioeconómico — backend 2026-11-04,
 * `RequisitoDocumentoGeneradoService`). La regla la decide el backend: estos
 * documentos nunca se suben, no bloquean la app ni cuentan para la carta
 * compromiso. Aquí solo se decide cómo se pintan (sin botón de subir).
 */

interface ConGenerado {
  generado_por_sistema?: GeneradoPorSistema | null;
}

/** ¿Es un formato que genera PEOPLE (nunca «Subir documento»)? */
export function esGeneradoPorSistema(documento: ConGenerado | null | undefined): boolean {
  return Boolean(documento?.generado_por_sistema);
}

export interface PresentacionGenerado {
  icono: 'checkmark-done-outline' | 'document-text-outline' | 'time-outline';
  tono: 'exito' | 'info';
  etiqueta: string;
  mensaje: string;
  /** Mostrar «Ir a Solicitud de empleo» (solo durante el registro, si aún no se genera). */
  irASolicitud: boolean;
}

const MENSAJE_REGISTRO = 'Se genera con tus datos de la Solicitud de empleo. No tienes que subir ningún archivo.';
const MENSAJE_RH = 'Lo prepara Recursos Humanos con tus datos. No tienes que subir ningún archivo.';

/** Cómo se presenta un formato generado por PEOPLE. */
export function presentacionGenerado(generado: {
  estado: EstadoGeneradoPorSistema;
  cumplido: boolean;
  titulo?: string | null;
  mensaje?: string | null;
  captura: CapturaGeneradoPorSistema;
}): PresentacionGenerado {
  const titulo = generado.titulo?.trim();
  const mensaje = generado.mensaje?.trim();

  if (generado.cumplido) {
    return {
      icono: 'checkmark-done-outline',
      tono: 'exito',
      etiqueta: titulo || (generado.estado === 'escaneo' ? 'Entregado' : 'Generado con tus datos'),
      mensaje: mensaje || 'Ya está listo; no necesitas hacer nada más.',
      irASolicitud: false,
    };
  }

  if (generado.captura === 'registro') {
    return {
      icono: 'document-text-outline',
      tono: 'info',
      etiqueta: titulo || 'Se genera con tus datos',
      mensaje: mensaje || MENSAJE_REGISTRO,
      irASolicitud: true,
    };
  }

  return {
    icono: 'time-outline',
    tono: 'info',
    etiqueta: titulo || 'Lo prepara Recursos Humanos',
    mensaje: mensaje || MENSAJE_RH,
    irASolicitud: false,
  };
}

/**
 * ¿La puerta de `_layout.tsx` muestra solo «Documentos pendientes»? El
 * bloqueo por documentos es del AUTOSERVICIO (Mi espacio): con Gestión RH
 * elegida, la operación sigue (el backend tampoco bloquea sus rutas
 * operativas). Si la cuenta no tiene Gestión RH, `(app)/_layout.tsx`
 * corrige la experiencia a «colaborador» y el bloqueo vuelve solo.
 */
export function debeMostrarBloqueoDocumentos(bloqueoActivo: boolean, experiencia: 'colaborador' | 'rh' | null | undefined): boolean {
  return bloqueoActivo && experiencia !== 'rh';
}
