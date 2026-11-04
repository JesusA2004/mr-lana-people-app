import type { CartaCompromiso } from './cartaCompromiso';
import type { DocumentoIncorporacion } from './document';
import type { IncorporacionProgreso } from './incorporation';
import type { ResumenSolicitudRegistro } from './solicitudEmpleo';

/**
 * Contrato de `GET /api/v1/colaborador/registro` (y respuesta de
 * `POST registro/datos` y `POST registro/finalizar`) — espejo de
 * `App\Services\Incorporacion\RegistroAppService::estado()` en capacitaciones.
 */
export interface CampoRegistro {
  campo: string;
  etiqueta: string;
  /** text | date | tel | email | number | opciones (los dibuja la app). */
  tipo: string;
  opciones?: { value: string; label: string }[];
  /** Valor vigente en el expediente (null = vacío). En datos médicos solo indica «registrado». */
  actual: string | null;
  actual_legible: string | null;
  /** Lo exige el contrato: el registro no termina sin él. */
  obligatorio: boolean;
  /** Ya lo registró RH: no se cambia aquí (se pide corrección después). */
  bloqueado: boolean;
}

/**
 * Bloque `foto` de `RegistroAppService::estado()` (docs/FOTO_EXPEDIENTE.md
 * en capacitaciones): la «Fotografía para expediente» ES la foto de perfil.
 * Backends anteriores no lo mandan (entonces la app no exige el paso).
 */
export interface FotoRegistro {
  /** El registro no termina sin foto (`finalizar` responde 422 `errors.foto`). */
  obligatoria: boolean;
  /** Ya hay foto oficial. */
  completo: boolean;
  /** `GET /colaborador/foto?v=…` (se abre con el Bearer; `v` cambia con cada foto). */
  url: string | null;
  pendiente_revision: boolean;
  /** Con el registro abierto la foto se reemplaza directo (sin revisión de RH). */
  puede_reemplazar: boolean;
  /** Documento requerido que la foto cubre en digital («2 fotografías tamaño infantil…»). */
  cubre_documento: { id: number; nombre: string } | null;
}

export interface EstadoRegistro {
  aplica: boolean;
  registro_completo: boolean;
  datos: {
    completo: boolean;
    faltan: { campo: string; etiqueta: string }[];
    campos: CampoRegistro[];
  };
  datos_medicos: { capturados: boolean };
  documentos: {
    completo: boolean;
    progreso: IncorporacionProgreso;
    lista: DocumentoIncorporacion[];
  };
  /** Fotografía para expediente (ausente en backends anteriores). */
  foto?: FotoRegistro | null;
  puede_finalizar: boolean;
  /**
   * Solicitud de empleo + Estudio socioeconómico (avance por sección). Con la
   * cabecera X-People-Solicitud-Empleo el backend la incluye en
   * `puede_finalizar`. Ausente/null en backends anteriores (no se exige).
   */
  solicitud_empleo?: ResumenSolicitudRegistro | null;
  /**
   * Máximo de documentos «No tengo» que cubre una carta compromiso. Con más
   * marcados se puede terminar, pero sin carta y con la app limitada a subir
   * documentos. Backends anteriores no lo mandan (usar 2).
   */
  max_documentos_carta?: number;
  /** Texto humano de lo que falta («datos: CURP, RFC», «documentos: INE»). */
  pendientes: string[];
  /**
   * Solo en la respuesta de `POST registro/finalizar`: carta compromiso
   * generada por los documentos marcados «No tengo este documento» (null o
   * ausente = no se generó; también null si marcó más de
   * `max_documentos_carta`).
   */
  carta_compromiso?: CartaCompromiso | null;
}
