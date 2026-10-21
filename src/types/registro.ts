import type { DocumentoIncorporacion } from './document';
import type { IncorporacionProgreso } from './incorporation';

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
  puede_finalizar: boolean;
  /** Texto humano de lo que falta («datos: CURP, RFC», «documentos: INE»). */
  pendientes: string[];
}
