import type { CierreLaboral, EstadoFiniquito, Finiquito } from '@/types/rhCiclo';
import {
  availableCierreOperations,
  cierreBadge,
  cierreSiguientePaso,
  cierreStepIndex,
  isCierreFinal,
  type CierreOperation,
} from '../cierre';

/**
 * Cierre laboral: el finiquito se firma FÍSICAMENTE (en papel) y PEOPLE solo
 * registra quién/cuándo — nunca se sube un archivo escaneado del finiquito
 * firmado. Estas guardas espejan `CierreLaboralService`/`FiniquitoService`.
 */

function cierre(overrides: Partial<CierreLaboral> = {}, finiquito?: Partial<Finiquito>): CierreLaboral {
  const base: CierreLaboral = {
    id: 1,
    colaborador: { id: 9, nombre: 'Ana', numero_empleado: null },
    solicitud_id: null,
    evaluacion_id: null,
    tipo_baja: 'renuncia',
    tipo_baja_etiqueta: 'Renuncia voluntaria',
    motivo: 'Mejor oferta',
    fecha_efectiva: '2026-10-20',
    estado: 'finiquito_en_proceso',
    estado_etiqueta: 'Finiquito en proceso',
    aviso_registrado_en: null,
    pago_confirmado_en: null,
    referencia_pago: null,
    baja_ejecutada_en: null,
    expediente_cerrado_en: null,
    finiquito: {
      id: 5,
      estado: 'revisado',
      total_percepciones: 100,
      total_deducciones: 0,
      neto: 100,
      pagado_en: null,
      documento_id: 7,
      ...finiquito,
    },
  };
  return { ...base, ...overrides };
}

const PERMS_RH = ['cierres.gestionar', 'finiquitos.calcular', 'finiquitos.revisar', 'finiquitos.subir_firmado', 'finiquitos.confirmar_pago', 'cierres.ejecutar_baja'];

describe('availableCierreOperations: flujo nuevo concluye en firma física', () => {
  it('ofrece marcar el finiquito como firmado físicamente (sin archivo)', () => {
    expect(availableCierreOperations(cierre(), PERMS_RH)).toContain('finiquito_firmado_fisico');
  });

  it('NUNCA ofrece una operación de subir/escanear/adjuntar el finiquito firmado', () => {
    const prohibidas = ['subir_finiquito', 'subir_finiquito_firmado', 'subir_escaneo', 'escanear_finiquito', 'adjuntar_finiquito'];
    for (const estado of ['iniciado', 'aviso_registrado', 'finiquito_en_proceso', 'finiquito_firmado', 'pagado']) {
      const ops = availableCierreOperations(cierre({ estado }), PERMS_RH) as string[];
      for (const p of prohibidas) expect(ops).not.toContain(p);
    }
  });

  it('un finiquito firmado/pagado es inmutable: ya no ofrece firma física ni cálculo', () => {
    for (const estado of ['firmado', 'pagado'] as EstadoFiniquito[]) {
      const ops = availableCierreOperations(cierre({}, { estado }), PERMS_RH);
      expect(ops).not.toContain('finiquito_firmado_fisico');
      expect(ops).not.toContain('calcular');
    }
  });

  it('sin permiso no ofrece nada y un cierre final no ofrece operaciones', () => {
    expect(availableCierreOperations(cierre(), ['cierres.ver'])).toEqual([]);
    expect(availableCierreOperations(cierre({ estado: 'expediente_cerrado' }), PERMS_RH)).toEqual([]);
    expect(availableCierreOperations(cierre({ estado: 'cancelado' }), PERMS_RH)).toEqual([]);
  });

  it('solo devuelve operaciones del catálogo conocido (nada inventado)', () => {
    const conocidas: CierreOperation[] = [
      'aviso', 'generar_aviso', 'calcular', 'conceptos', 'revisar', 'generar_finiquito', 'finiquito_firmado_fisico', 'confirmar_pago', 'ejecutar_baja', 'cerrar_expediente', 'cancelar',
    ];
    const ops = availableCierreOperations(cierre(), PERMS_RH);
    for (const op of ops) expect(conocidas).toContain(op);
  });
});

describe('estado del cierre (presentación)', () => {
  it('cierreStepIndex mapea cada estado a su paso', () => {
    expect(cierreStepIndex('iniciado')).toBe(1);
    expect(cierreStepIndex('finiquito_firmado')).toBe(4);
    expect(cierreStepIndex('expediente_cerrado')).toBe(7);
    expect(cierreStepIndex(null)).toBe(1);
  });

  it('isCierreFinal detecta cerrado/cancelado', () => {
    expect(isCierreFinal('expediente_cerrado')).toBe(true);
    expect(isCierreFinal('cancelado')).toBe(true);
    expect(isCierreFinal('finiquito_en_proceso')).toBe(false);
  });

  it('cierreBadge traduce el estado a tono visual', () => {
    expect(cierreBadge('cancelado')).toBe('cancelada');
    expect(cierreBadge('expediente_cerrado')).toBe('cerrada');
    expect(cierreBadge('pagado')).toBe('aprobado');
  });

  it('cierreSiguientePaso explica la firma física antes de pagar', () => {
    expect(cierreSiguientePaso(cierre({}, { estado: 'revisado' }))).toMatch(/firma física/i);
    expect(cierreSiguientePaso(cierre({}, { estado: 'firmado', pagado_en: null }))).toMatch(/pago/i);
  });
});
