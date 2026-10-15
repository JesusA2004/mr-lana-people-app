/**
 * Descriptivo de puesto que RH envía al colaborador tras aprobar su
 * evaluación de inducción — contrato real de
 * `App\Services\Onboarding\AcuseDescriptivoPuestoService::aArray()` en
 * capacitaciones. El contenido es el del PDF OFICIAL (la app no inventa ni
 * completa nada).
 */
export type EstadoAcuseDescriptivo = 'enviado' | 'leido' | 'enterado' | (string & {});

export interface SeccionDescriptivo {
  clave: string;
  titulo: string;
  elementos: string[];
}

export interface DescriptivoPuestoContenido {
  id: number;
  nombrePuesto: string;
  version: number;
  area: string | null;
  objetivo: string | null;
  personalACargo: string | null;
  fecha: string | null;
  secciones: SeccionDescriptivo[];
}

export interface AcuseDescriptivoPuesto {
  id: number;
  estado: EstadoAcuseDescriptivo;
  estadoEtiqueta: string;
  enviadoPor: string | null;
  enviadoEn: string | null;
  leidoEn: string | null;
  acusadoEn: string | null;
  enterado: boolean;
  comentario: string | null;
  descriptivo: DescriptivoPuestoContenido;
}
