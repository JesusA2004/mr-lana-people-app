import appConfig from '../../app.json';
import { isSelfServiceModuleEnabled } from '@/utils/modules';
import { resolveTaskRoute } from '@/utils/taskRoutes';
import { existeRuta, rutasDeLaApp } from '@/testing/navegacionInventario';
import { normalizeActa, normalizeActaCatalogos } from '@/api/normalizers/rhCiclo';
import { normalizeLaborDocument } from '@/api/normalizers/laborDocument';
import { availableRhDocumentOperations } from '@/utils/laborDocuments';
import { availableCierreOperations } from '@/utils/cierre';
import { resolveDocumentCapabilities } from '@/utils/capabilities';
import type { LaborDocument } from '@/types/laborDocument';
import type { CierreLaboral } from '@/types/rhCiclo';

/** Documento laboral del flujo físico nuevo (impresión + firma autógrafa). */
function docFisico(estado: string, overrides: Partial<LaborDocument> = {}): LaborDocument {
  return {
    ...normalizeLaborDocument({ id: 1, titulo: 'Contrato', estado, categoria: 'contratos' }),
    requiere_impresion: true,
    requiere_firma_fisica: true,
    ...overrides,
  };
}

/** Cierre con finiquito listo para firma física (sin archivo). */
function cierreConFiniquito(overrides: Partial<CierreLaboral> = {}): CierreLaboral {
  return {
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
    finiquito: { id: 5, estado: 'revisado', total_percepciones: 100, total_deducciones: 0, neto: 100, pagado_en: null, documento_id: 7 },
    ...overrides,
  };
}

/** Operaciones legacy que el flujo físico nuevo NO debe reintroducir nunca. */
const OPERACIONES_RETIRADAS = ['enviar', 'envio', 'enviar_corporativo', 'recepcionar', 'recepcion', 'recibir_corporativo', 'escanear', 'escaneo', 'archivar', 'subir_escaneo', 'subir_firmado', 'subir_escaneo_firmado'];

/**
 * Paridad móvil 1.2.0: inducción, directorio, pendientes nuevos de RH/
 * gerente, recibos impresos y configuración de build.
 */
describe('configuración de la app', () => {
  it('versionCode 13, versión 1.2.0 y el paquete Android intacto', () => {
    expect(appConfig.expo.android.versionCode).toBe(13);
    expect(appConfig.expo.version).toBe('1.2.0');
    expect(appConfig.expo.android.package).toBe('com.mrlana.people');
    expect(appConfig.expo.android.googleServicesFile).toBe('./google-services.json');
  });

  it('solo tema claro (sin modo oscuro)', () => {
    expect(appConfig.expo.userInterfaceStyle).toBe('light');
  });
});

describe('pantallas nuevas registradas', () => {
  const rutas = rutasDeLaApp();

  it.each(['/induccion', '/induccion/capitulos', '/induccion/evaluacion', '/induccion/presentacion', '/directorio', '/descriptivo-puesto'])('%s existe', (ruta) => {
    expect(existeRuta(ruta, rutas)).toBe(true);
  });
});

describe('recibos de nómina: se entregan impresos', () => {
  it('el backend manda features.recibos = false y la app oculta "Mis recibos"', () => {
    expect(isSelfServiceModuleEnabled({ recibos: false } as never, 'recibos')).toBe(false);
  });
});

describe('Mis pendientes: tareas nuevas de inducción y periodo de prueba', () => {
  const base = { related_id: 9, colaborador: { id: 44, nombre: 'Ana', numero_empleado: null } } as const;

  it('presentar la evaluación de inducción abre directo la pantalla para contestarla', () => {
    expect(resolveTaskRoute({ ...base, tipo: 'induccion_evaluacion_pendiente', accion: 'presentar_evaluacion_induccion', related_type: 'EvaluacionInduccion' })).toEqual({
      route: '/induccion/evaluacion',
      experience: 'colaborador',
    });
  });

  it('leer el descriptivo de puesto (tras aprobar la inducción) abre su pantalla en Mi espacio', () => {
    expect(resolveTaskRoute({ ...base, tipo: 'descriptivo_puesto_por_acusar', accion: 'acusar_descriptivo_puesto', related_type: 'AcuseDescriptivoPuesto' })).toEqual({
      route: '/descriptivo-puesto',
      experience: 'colaborador',
    });
  });

  it('calificar casos prácticos y reforzamiento (RH) abren la ficha de onboarding', () => {
    for (const [tipo, accion, relacionado] of [
      ['induccion_casos_por_calificar', 'calificar_induccion', 'EvaluacionInduccionIntento'],
      ['induccion_reforzamiento', 'retroalimentar_induccion', 'EvaluacionInduccion'],
    ] as const) {
      expect(resolveTaskRoute({ ...base, tipo, accion, related_type: relacionado })).toEqual({ route: '/(app)/rh/onboarding/44', experience: 'rh' });
    }
  });

  it('evaluación de periodo de prueba (gerente/RH) y excepción de Dirección General', () => {
    expect(resolveTaskRoute({ ...base, tipo: 'evaluacion_pendiente', accion: 'capturar_evaluacion', related_type: 'EvaluacionPeriodoPrueba' })).toEqual({
      route: '/evaluaciones/9',
      experience: null,
    });
    expect(resolveTaskRoute({ ...base, tipo: 'excepcion_periodo_prueba_pendiente', accion: 'resolver_excepcion', related_type: 'SolicitudExcepcionPeriodoPrueba' })).toEqual({
      route: '/evaluaciones',
      experience: null,
    });
  });

  it('entrevista de candidato (gerente) abre la ficha del candidato', () => {
    expect(resolveTaskRoute({ ...base, tipo: 'candidato_entrevista', accion: 'registrar_entrevista', related_type: 'Candidato' })).toEqual({
      route: '/(app)/rh/candidatos/9',
      experience: 'rh',
    });
  });
});

describe('auditoría app ↔ backend (2026-10-15)', () => {
  it('una tarea vieja de recibo de nómina abre el inicio, nunca /recibos/{id}', () => {
    expect(
      resolveTaskRoute({ tipo: 'recibo_nomina', accion: 'ver_recibo', related_type: 'ReciboNomina', related_id: 5, colaborador: null }),
    ).toEqual({ route: '/(app)/(tabs)', experience: 'colaborador' });
  });

  it('el detalle de acta lee la circunstanciada con etiquetas del catálogo de la API', () => {
    const acta = normalizeActa(
      {
        id: 3,
        tipo: 'administrativa',
        tipo_etiqueta: 'Acta administrativa circunstanciada',
        motivo: 'Retardo',
        estado: 'borrador',
        hechos: 'Llegó tarde.',
        circunstanciada: {
          incidencia: { tipo: 'retardo', fecha_hechos: '6 de octubre de 2026' },
          responsable: { caracter: 'gerente', nombre: 'Luis' },
          jefe: { participa: false },
          testigos_hechos: [{ colaborador_id: 9, nombre: 'Ana', relacion: 'presencio_directamente', declaro: true, manifestacion: 'Lo vi.' }],
          testigos_asistencia: [],
          trabajador: { manifesto: false },
          entrega: { estado: 'entregada', por: 'Luis' },
        },
        anexos: [{ id: 1, nombre: 'foto.jpg', relacion_hechos: 'Evidencia' }],
      },
      normalizeActaCatalogos({ incidencias: [{ value: 'retardo', label: 'Retardo (API)' }] }),
    );
    expect(acta.circunstanciada?.incidencia.tipo_etiqueta).toBe('Retardo (API)');
    expect(acta.circunstanciada?.responsable.caracter_etiqueta).toBe('Gerente');
    expect(acta.circunstanciada?.testigos_hechos[0]).toMatchObject({ colaborador_id: 9, relacion_etiqueta: 'Presenció directamente los hechos' });
    expect(acta.circunstanciada?.trabajador.manifesto).toBe(false);
    expect(acta.circunstanciada?.entrega.estado).toBe('entregada');
    expect(acta.anexos?.[0].relacion_hechos).toBe('Evidencia');
  });

  it('la app ya no tiene pantalla para crear/editar actas', () => {
    expect(rutasDeLaApp().some((ruta) => ruta.join('/').includes('actas/editar'))).toBe(false);
  });
});

describe('paridad: documentos laborales conservan el flujo físico nuevo, sin operaciones legacy', () => {
  const perms = ['documentos_laborales.operar_fisico', 'documentos_laborales.cancelar'];

  it('SÍ ofrece la firma física del documento (flujo nuevo concluye en firma autógrafa)', () => {
    expect(availableRhDocumentOperations(docFisico('impreso'), perms)).toContain('firma_fisica');
    expect(availableRhDocumentOperations(docFisico('pendiente_impresion'), perms)).toContain('imprimir');
  });

  it('NO reintroduce envío a corporativo / recepción / escaneo / archivar en ningún estado', () => {
    const estados = ['generado', 'firmado_digitalmente', 'pendiente_impresion', 'impreso', 'pendiente_firma_fisica', 'firmado_fisicamente', 'enviado_corporativo', 'recibido_corporativo', 'escaneado', 'archivado'];
    for (const estado of estados) {
      const ops = availableRhDocumentOperations(docFisico(estado), perms) as string[];
      for (const retirada of OPERACIONES_RETIRADAS) {
        expect(ops).not.toContain(retirada);
      }
    }
  });

  it('un documento histórico (escaneado/enviado) es de solo lectura, nunca ofrece operar el físico', () => {
    expect(availableRhDocumentOperations(docFisico('escaneado'), perms)).not.toContain('firma_fisica');
    expect(availableRhDocumentOperations(docFisico('enviado_corporativo'), perms)).not.toContain('imprimir');
  });
});

describe('paridad: cierre/finiquito se firma físicamente (sin subir escaneo del finiquito)', () => {
  const perms = ['cierres.gestionar', 'finiquitos.calcular', 'finiquitos.revisar', 'cierres.ejecutar_baja', 'finiquitos.confirmar_pago'];

  it('SÍ soporta marcar el finiquito como firmado físicamente (sin archivo)', () => {
    expect(availableCierreOperations(cierreConFiniquito(), perms)).toContain('finiquito_firmado_fisico');
  });

  it('NO ofrece ninguna operación de subir el finiquito firmado (escaneo/adjunto)', () => {
    const estados = ['iniciado', 'aviso_registrado', 'finiquito_en_proceso', 'finiquito_firmado', 'pagado'];
    for (const estado of estados) {
      const ops = availableCierreOperations(cierreConFiniquito({ estado }), perms) as string[];
      for (const retirada of [...OPERACIONES_RETIRADAS, 'subir_finiquito', 'subir_finiquito_firmado', 'adjuntar_finiquito', 'escanear_finiquito']) {
        expect(ops).not.toContain(retirada);
      }
    }
  });
});

describe('paridad: la subida de escaneos firmados está apagada por el contrato (defensa)', () => {
  it('con subida_escaneo_firmado=false (default seguro) la app no habilita ninguna subida', () => {
    expect(resolveDocumentCapabilities({ subida_escaneo_firmado: false } as never).subidaEscaneoFirmado).toBe(false);
    // Ausente también se trata como apagado (fail-closed).
    expect(resolveDocumentCapabilities(null).subidaEscaneoFirmado).toBe(false);
  });

  it('SÍ se conserva la firma física como flujo vigente (finiquito_firma_fisica=true por default)', () => {
    expect(resolveDocumentCapabilities(null).finiquitoFirmaFisica).toBe(true);
    expect(resolveDocumentCapabilities({ document_flow: 2 } as never).documentFlow).toBe(2);
  });
});
