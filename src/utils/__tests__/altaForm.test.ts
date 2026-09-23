import { buildAltaPayload, EMPTY_ALTA_FORM, erroresDelPaso, jefesPara, pasoDeCampo, puestosPara, requiereFechaFin, sucursalesPara, validarAlta, type AltaFormState } from '../altaForm';

/** Forma real de `GET /rh/catalogos` (Rh\CatalogoController). */
const CATALOGOS = {
  tipos_contratacion: [
    { value: 'indeterminado', label: 'Indeterminado', requiere_fecha_fin: false },
    { value: 'periodo_prueba', label: 'Periodo de prueba', requiere_fecha_fin: true },
  ],
  puestos: [
    { id: 1, nombre: 'Vendedor', departamento_id: 10 },
    { id: 2, nombre: 'Contador', departamento_id: 20 },
    { id: 3, nombre: 'Auxiliar general', departamento_id: null },
  ],
  jefes: [
    { id: 50, nombre: 'Ana', puesto: 'Gerente', sucursal_id: 1 },
    { id: 51, nombre: 'Luis', puesto: 'Gerente', sucursal_id: 2 },
  ],
};

const VALIDO: AltaFormState = {
  ...EMPTY_ALTA_FORM,
  name: 'María',
  apellidos: 'Pérez',
  email: 'maria@example.com',
  curp: 'pepm900101mdfrrr09',
  sucursalId: '1',
  puestoId: '1',
  sueldo: 12000,
  fechaIngreso: new Date(2026, 8, 1),
  tipoContratacion: 'indeterminado',
};

describe('alta de colaborador', () => {
  it('un formulario completo no tiene errores', () => {
    expect(validarAlta(VALIDO, CATALOGOS)).toEqual({});
  });

  it('exige los obligatorios del backend', () => {
    const errores = validarAlta({ ...EMPTY_ALTA_FORM, crearAcceso: false }, CATALOGOS);
    expect(Object.keys(errores).sort()).toEqual(['fecha_ingreso', 'name', 'puesto_id', 'sucursal_principal_id', 'sueldo_mensual', 'tipo_contratacion']);
  });

  it('fecha fin solo cuando el tipo del backend la requiere', () => {
    expect(requiereFechaFin(CATALOGOS, 'periodo_prueba')).toBe(true);
    expect(requiereFechaFin(CATALOGOS, 'indeterminado')).toBe(false);
    expect(validarAlta({ ...VALIDO, tipoContratacion: 'periodo_prueba' }, CATALOGOS).fecha_fin_contrato).toBeTruthy();
    expect(validarAlta({ ...VALIDO, tipoContratacion: 'periodo_prueba', fechaFinContrato: new Date(2026, 7, 1) }, CATALOGOS).fecha_fin_contrato).toMatch(/posterior/);
  });

  it('crear acceso exige correo', () => {
    expect(validarAlta({ ...VALIDO, email: '' }, CATALOGOS).email).toMatch(/correo/);
    expect(validarAlta({ ...VALIDO, email: '', crearAcceso: false }, CATALOGOS).email).toBeUndefined();
  });

  it('valida formato de CURP/RFC/NSS sin exigirlos', () => {
    const errores = validarAlta({ ...VALIDO, curp: 'ABC', rfc: 'X', nss: '12' }, CATALOGOS);
    expect(errores.curp).toBeTruthy();
    expect(errores.rfc).toBeTruthy();
    expect(errores.nss).toBeTruthy();
  });

  it('filtra puestos por departamento (y conserva los generales) y jefes por sucursal', () => {
    expect(puestosPara(CATALOGOS, '10').map((p) => p.id)).toEqual([1, 3]);
    expect(puestosPara(CATALOGOS, '').length).toBe(3);
    expect(jefesPara(CATALOGOS, '2').map((j) => j.id)).toEqual([51]);
  });

  it('arma el payload del backend: IDs numéricos, fechas ISO, CURP en mayúsculas, sin fecha fin si no aplica', () => {
    const payload = buildAltaPayload({ ...VALIDO, fechaFinContrato: new Date(2026, 11, 1) }, CATALOGOS);
    expect(payload).toMatchObject({
      name: 'María',
      sucursal_principal_id: 1,
      puesto_id: 1,
      departamento_id: null,
      jefe_id: null,
      sueldo_mensual: 12000,
      fecha_ingreso: '2026-09-01',
      curp: 'PEPM900101MDFRRR09',
      fecha_fin_contrato: null,
      crear_acceso: true,
    });
  });
});

describe('alta por pasos', () => {
  it('cada paso solo valida sus campos', () => {
    const errores = validarAlta({ ...EMPTY_ALTA_FORM, crearAcceso: false }, CATALOGOS);
    expect(Object.keys(erroresDelPaso(errores, 0))).toEqual(['name']);
    expect(Object.keys(erroresDelPaso(errores, 1)).sort()).toEqual(['puesto_id', 'sucursal_principal_id']);
    expect(Object.keys(erroresDelPaso(errores, 2)).sort()).toEqual(['fecha_ingreso', 'sueldo_mensual', 'tipo_contratacion']);
  });

  it('un error del backend regresa al paso de su campo', () => {
    expect(pasoDeCampo('email')).toBe(0);
    expect(pasoDeCampo('jefe_id')).toBe(1);
    expect(pasoDeCampo('numero_empleado')).toBe(2);
  });

  it('empresa filtra sucursales', () => {
    const cat = { sucursales: [{ id: 1, nombre: 'A', empresa_id: 7 }, { id: 2, nombre: 'B', empresa_id: 8 }] };
    expect(sucursalesPara(cat, '7').map((s) => s.id)).toEqual([1]);
    expect(sucursalesPara(cat, '').length).toBe(2);
  });
});
