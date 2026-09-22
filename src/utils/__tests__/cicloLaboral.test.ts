import { normalizeAlta, normalizeEstadoDocumental, normalizeJerarquia } from '@/api/normalizers/cicloLaboral';
import { normalizePrestamo, normalizeRecibo, normalizeReciboImport } from '@/api/normalizers/nomina';
import { normalizeEvaluacion, normalizeTarea } from '@/api/normalizers/trabajo';
import { altaBloqueos, altaStepIndex, canActivarAlta, isAltaEnProceso } from '../alta';
import { availableCierreOperations } from '../cierre';
import { evaluationActions } from '../evaluation';
import { canResguardarPrestamo, prestamoVigente } from '../loan';
import { normalizeCierre } from '@/api/normalizers/rhCiclo';

describe('alta', () => {
  const raw = {
    estado_alta: 'pendiente_firma',
    estructura: { sueldo_mensual: '15000.00', jefe_inmediato: null },
    expediente: { requeridos: 5, aprobados: 5, faltantes: 0, completo: true, documentos: [] },
    contrato: { id: 1, tipo: 'periodo_prueba', estado: 'vigente', fecha_inicio: '2026-09-01', dias_para_vencer: '12' },
    documentos_contractuales: [{ id: 9, clave: 'contrato_periodo_prueba', firmado: false, estado: 'pendiente_firma_colaborador' }],
    documentos_contractuales_sin_plantilla: ['contrato_confidencialidad'],
    acceso: { tiene_cuenta: true },
  };

  it('normaliza decimales y respeta el estado del backend', () => {
    const alta = normalizeAlta(raw);
    expect(alta.estructura.sueldo_mensual).toBe(15000);
    expect(alta.contrato?.dias_para_vencer).toBe(12);
    expect(alta.estado_alta).toBe('pendiente_firma');
    expect(normalizeAlta({ estado_alta: 'inventado' }).estado_alta).toBeNull();
  });

  it('stepper: índice por estado real', () => {
    expect(altaStepIndex('pendiente_documentos')).toBe(0);
    expect(altaStepIndex('pendiente_firma')).toBe(3);
    expect(altaStepIndex('activo')).toBe(5);
    expect(isAltaEnProceso('activo')).toBe(false);
    expect(isAltaEnProceso('pendiente_contrato')).toBe(true);
  });

  it('activar solo en pendiente_activacion y con permiso', () => {
    const alta = normalizeAlta(raw);
    expect(canActivarAlta(alta, ['colaboradores.activar'])).toBe(false);
    expect(canActivarAlta({ ...alta, estado_alta: 'pendiente_activacion' }, ['colaboradores.activar'])).toBe(true);
    expect(canActivarAlta({ ...alta, estado_alta: 'pendiente_activacion' }, [])).toBe(false);
  });

  it('bloqueos derivados solo de datos del checklist', () => {
    const bloqueos = altaBloqueos(normalizeAlta(raw));
    expect(bloqueos.join(' ')).toMatch(/sin plantilla/);
    expect(bloqueos.join(' ')).toMatch(/pendiente\(s\) de firma/);
  });
});

describe('expediente completo/incompleto', () => {
  it('completo viene SOLO del backend, no de archivos cargados', () => {
    const exp = normalizeEstadoDocumental({ requeridos: 3, entregados: 3, aprobados: 2, en_revision: 1, completo: false });
    expect(exp.entregados).toBe(3);
    expect(exp.completo).toBe(false);
    expect(normalizeEstadoDocumental({ completo: true }).completo).toBe(true);
  });
});

describe('jerarquía', () => {
  it('persona ausente (backend manda []) se trata como null, nunca se inventa', () => {
    const j = normalizeJerarquia({ colaborador: { id: 1, nombre: 'Ana' }, jefe_inmediato: [], gerente: null, subordinados_directos: [{ id: 2, nombre: 'Luis' }, []] });
    expect(j.jefe_inmediato).toBeNull();
    expect(j.gerente).toBeNull();
    expect(j.subordinados_directos).toHaveLength(1);
  });
});

describe('recibos', () => {
  it('tiene_pdf=false nunca habilita PDF y los montos se normalizan', () => {
    const r = normalizeRecibo({ id: 1, neto: '1234.50', tiene_pdf: false, conceptos: [{ tipo: 'deduccion', concepto: 'Préstamo', importe: '100.00' }] });
    expect(r.tiene_pdf).toBe(false);
    expect(r.neto).toBe(1234.5);
    expect(r.leyenda).toMatch(/NO FISCAL/);
    expect(r.conceptos?.[0].importe).toBe(100);
    expect(normalizeRecibo({ id: 1 }).tiene_pdf).toBe(false);
  });

  it('importación: errores por fila', () => {
    const res = normalizeReciboImport({ simulacion: true, filas_leidas: 3, errores: [{ fila: 2, numero_empleado: 'EMP-1', motivo: 'Importe inválido' }] });
    expect(res.simulacion).toBe(true);
    expect(res.errores[0]).toEqual({ fila: 2, numero_empleado: 'EMP-1', motivo: 'Importe inválido' });
  });
});

describe('préstamos', () => {
  const prestamo = normalizePrestamo({
    id: 4,
    estado: 'activo',
    monto_autorizado: '5000.00',
    saldo_informativo: '2500',
    contrato: { id: 1, estado: 'firmado_digitalmente' },
    pagare: { id: 2, estado: 'pendiente_firma_colaborador' },
  });

  it('normaliza montos y referencia de documentos', () => {
    expect(prestamo.monto_autorizado).toBe(5000);
    expect(prestamo.saldo_informativo).toBe(2500);
    expect(prestamoVigente([prestamo])?.id).toBe(4);
  });

  it('resguardo exige contrato Y pagaré firmados', () => {
    expect(canResguardarPrestamo(prestamo, ['prestamos.resguardar'])).toBe(false);
    const ambos = { ...prestamo, pagare: { id: 2, estado: 'archivado' } };
    expect(canResguardarPrestamo(ambos, ['prestamos.resguardar'])).toBe(true);
    expect(canResguardarPrestamo(ambos, [])).toBe(false);
  });
});

describe('tareas', () => {
  it('normaliza related_type/related_id/accion', () => {
    const t = normalizeTarea({ id: 1, tipo: 'firma_pendiente', related_type: 'GeneratedDocument', related_id: '9', accion: 'firmar_documento' });
    expect(t.related_id).toBe(9);
    expect(t.titulo).toBe('Pendiente');
  });
});

describe('evaluación', () => {
  const ev = normalizeEvaluacion({ id: 1, estado: 'capturada', criterios_sugeridos: ['Puntualidad', 3], recomienda_renovar: null, contrato: { id: 2, estado: 'vigente' } });

  it('criterios sugeridos solo strings y recomendación nula', () => {
    expect(ev.criterios_sugeridos).toEqual(['Puntualidad']);
    expect(ev.recomienda_renovar).toBeNull();
  });

  it('acciones por estado y permiso', () => {
    expect(evaluationActions(ev, ['evaluaciones.autorizar'], false)).toEqual({ capturar: false, autorizar: true, devolver: true });
    expect(evaluationActions(ev, [], true)).toEqual({ capturar: false, autorizar: false, devolver: false });
    expect(evaluationActions({ estado: 'pendiente' }, [], true).capturar).toBe(true);
    expect(evaluationActions({ estado: 'pendiente' }, [], false).capturar).toBe(false);
  });
});

describe('cierre laboral', () => {
  const base = { id: 1, estado: 'finiquito_en_proceso', finiquito: { id: 3, estado: 'borrador', neto: '100' } };

  it('no permite ejecutar baja sin finiquito pagado', () => {
    const ops = availableCierreOperations(normalizeCierre(base), ['cierres.ejecutar_baja', 'finiquitos.calcular', 'finiquitos.revisar']);
    expect(ops).not.toContain('ejecutar_baja');
    expect(ops).toContain('revisar');
    expect(ops).toContain('conceptos');
  });

  it('finiquito firmado es de solo lectura', () => {
    const ops = availableCierreOperations(normalizeCierre({ ...base, estado: 'finiquito_firmado', finiquito: { id: 3, estado: 'firmado' } }), [
      'finiquitos.calcular',
      'finiquitos.confirmar_pago',
    ]);
    expect(ops).not.toContain('conceptos');
    expect(ops).not.toContain('calcular');
    expect(ops).toContain('confirmar_pago');
  });

  it('cerrar expediente solo tras baja ejecutada', () => {
    const ops = availableCierreOperations(normalizeCierre({ ...base, estado: 'baja_ejecutada', finiquito: { id: 3, estado: 'pagado' } }), ['cierres.ejecutar_baja']);
    expect(ops).toEqual(['cerrar_expediente']);
  });
});
