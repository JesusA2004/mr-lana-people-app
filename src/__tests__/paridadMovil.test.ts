import appConfig from '../../app.json';
import { isSelfServiceModuleEnabled } from '@/utils/modules';
import { resolveTaskRoute } from '@/utils/taskRoutes';
import { existeRuta, rutasDeLaApp } from '@/testing/navegacionInventario';

/**
 * Paridad móvil 1.2.0: inducción, directorio, pendientes nuevos de RH/
 * gerente, recibos impresos y configuración de build.
 */
describe('configuración de la app', () => {
  it('versionCode 9, versión 1.2.0 y el paquete Android intacto', () => {
    expect(appConfig.expo.android.versionCode).toBe(9);
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

  it.each(['/induccion', '/induccion/capitulos', '/induccion/evaluacion', '/induccion/presentacion', '/directorio'])('%s existe', (ruta) => {
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

  it('presentar la evaluación de inducción abre la inducción del colaborador', () => {
    expect(resolveTaskRoute({ ...base, tipo: 'induccion_evaluacion_pendiente', accion: 'presentar_evaluacion_induccion', related_type: 'EvaluacionInduccion' })).toEqual({
      route: '/induccion',
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
