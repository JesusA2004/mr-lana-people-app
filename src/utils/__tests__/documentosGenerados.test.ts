import { debeMostrarBloqueoDocumentos, esGeneradoPorSistema, presentacionGenerado } from '../documentosGenerados';
import { documentosPorSubir, documentosSinTener } from '../registroWizard';

import type { DocumentoIncorporacion } from '@/types/document';
import type { EstadoRegistro } from '@/types/registro';

const base = { tipo: 'x', obligatorio: true, puede_subir: true, puede_reemplazar: false, puede_solicitar_cambio: false } as const;

const solicitudEmpleo: DocumentoIncorporacion = {
  ...base,
  id: 9,
  tipo: 'solicitud_empleo',
  nombre: 'Solicitud de empleo (Formato interno)',
  estado: 'pendiente',
  puede_subir: false,
  generado_por_sistema: {
    estado: 'por_generar',
    cumplido: false,
    titulo: 'Se genera con tus datos',
    mensaje: 'Se genera con tus datos de la Solicitud de empleo. No tienes que subir ningún archivo.',
    captura: 'registro',
  },
};

function registroCon(lista: DocumentoIncorporacion[]): EstadoRegistro {
  return {
    documentos: { completo: false, progreso: { total: lista.length, aprobados: 0, pendientes: lista.length, en_revision: 0, rechazados: 0, porcentaje: 0 }, lista },
  } as unknown as EstadoRegistro;
}

describe('formatos que genera PEOPLE (Solicitud de empleo, Estudio socioeconómico)', () => {
  test('durante el registro: «Se genera con tus datos» con enlace a la Solicitud de empleo, nunca subir', () => {
    const vista = presentacionGenerado(solicitudEmpleo.generado_por_sistema!);
    expect(vista.etiqueta).toBe('Se genera con tus datos');
    expect(vista.irASolicitud).toBe(true);
    expect(vista.tono).toBe('info');
    expect(vista.mensaje).toMatch(/No tienes que subir/);
  });

  test('ya registrado: «Lo prepara Recursos Humanos», sin enlace de captura', () => {
    const vista = presentacionGenerado({ estado: 'por_generar', cumplido: false, titulo: '', mensaje: null, captura: 'rh' });
    expect(vista.etiqueta).toBe('Lo prepara Recursos Humanos');
    expect(vista.irASolicitud).toBe(false);
    expect(vista.icono).toBe('time-outline');
  });

  test('generado o escaneo previo: cumplido en verde', () => {
    expect(presentacionGenerado({ estado: 'generado', cumplido: true, captura: 'rh' })).toMatchObject({ tono: 'exito', etiqueta: 'Generado con tus datos', irASolicitud: false });
    expect(presentacionGenerado({ estado: 'escaneo', cumplido: true, captura: 'rh' })).toMatchObject({ tono: 'exito', etiqueta: 'Entregado' });
  });

  test('el registro no lo cuenta como documento por subir ni deja marcar «No tengo»', () => {
    const ine: DocumentoIncorporacion = { ...base, id: 1, nombre: 'INE', estado: 'pendiente' };
    const estado = registroCon([ine, solicitudEmpleo]);

    expect(esGeneradoPorSistema(solicitudEmpleo)).toBe(true);
    expect(esGeneradoPorSistema(ine)).toBe(false);
    expect(documentosPorSubir(estado).map((d) => d.id)).toEqual([1]);
    expect(documentosSinTener(estado, [1, 9]).map((d) => d.id)).toEqual([1]);
  });
});

describe('bloqueo por documentos: solo el autoservicio', () => {
  test('con Gestión RH elegida la operación sigue; en Mi espacio (o sin elegir) sigue bloqueado', () => {
    expect(debeMostrarBloqueoDocumentos(true, 'rh')).toBe(false);
    expect(debeMostrarBloqueoDocumentos(true, 'colaborador')).toBe(true);
    expect(debeMostrarBloqueoDocumentos(true, null)).toBe(true);
    expect(debeMostrarBloqueoDocumentos(false, 'colaborador')).toBe(false);
  });
});
