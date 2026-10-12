import { normalizeColaboradorDirectorio } from '@/api/directorio';

describe('directorio: solo contacto corporativo', () => {
  it('nunca conserva datos personales aunque el backend los mandara por error', () => {
    const fila = normalizeColaboradorDirectorio({
      id: 5,
      nombre: 'Sofía Herrera',
      numero_empleado: 'EMP-10',
      puesto: 'Gerente de Sucursal',
      sucursal: 'Cuernavaca',
      departamento: 'Comercial',
      correo_corporativo: 'sofia@mrlana.com',
      telefono_corporativo: '7771112233',
      correo_personal: 'sofi@gmail.com',
      telefono: '5559998877',
      rfc: 'HEPS900101AB1',
      curp: 'HEPS900101MMSRZF09',
      nss: '12345678901',
      salario_diario: 456.78,
      domicilio: 'Calle Secreta 123',
    });

    expect(Object.keys(fila).sort()).toEqual(
      ['correoCorporativo', 'departamento', 'id', 'nombre', 'numeroEmpleado', 'puesto', 'sucursal', 'telefonoCorporativo'].sort(),
    );
    const json = JSON.stringify(fila);
    for (const sensible of ['gmail', '5559998877', 'HEPS', '12345678901', '456.78', 'Secreta']) {
      expect(json).not.toContain(sensible);
    }
  });

  it('sin correo corporativo no se inventa uno', () => {
    const fila = normalizeColaboradorDirectorio({ id: 6, nombre: 'Pedro', correo_corporativo: null, telefono_corporativo: '' });
    expect(fila.correoCorporativo).toBeNull();
    expect(fila.telefonoCorporativo).toBeNull();
  });
});
