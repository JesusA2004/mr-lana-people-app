import { ESTADOS_REPUBLICA } from '@/constants/estadosRepublica';

/**
 * Domicilio estructurado (`DomicilioService` del backend): calle, número
 * exterior e interior, colonia, C.P., municipio/alcaldía y estado. El texto
 * completo `domicilio` lo compone el backend; la app solo manda los campos.
 */
export const CAMPOS_DOMICILIO = [
  'domicilio_calle',
  'domicilio_numero_exterior',
  'domicilio_numero_interior',
  'domicilio_colonia',
  'domicilio_cp',
  'domicilio_municipio',
  'domicilio_estado',
] as const;

export type CampoDomicilio = (typeof CAMPOS_DOMICILIO)[number];

export type ValoresDomicilio = Partial<Record<CampoDomicilio, string>>;

export const ETIQUETAS_DOMICILIO: Record<CampoDomicilio, string> = {
  domicilio_calle: 'Calle',
  domicilio_numero_exterior: 'Número exterior',
  domicilio_numero_interior: 'Número interior (opcional)',
  domicilio_colonia: 'Colonia',
  domicilio_cp: 'Código postal',
  domicilio_municipio: 'Municipio o alcaldía',
  domicilio_estado: 'Estado',
};

/** El número interior es el único campo que puede quedar vacío. */
const OPCIONALES: CampoDomicilio[] = ['domicilio_numero_interior'];

const MAXIMOS: Record<CampoDomicilio, number> = {
  domicilio_calle: 150,
  domicilio_numero_exterior: 20,
  domicilio_numero_interior: 20,
  domicilio_colonia: 120,
  domicilio_cp: 5,
  domicilio_municipio: 120,
  domicilio_estado: 80,
};

export function esCampoDomicilio(campo: string): campo is CampoDomicilio {
  return (CAMPOS_DOMICILIO as readonly string[]).includes(campo);
}

export function maximoDomicilio(campo: CampoDomicilio): number {
  return MAXIMOS[campo];
}

function clave(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nombre oficial del estado («MORELOS» → «Morelos»); '' si no está en la lista. */
export function estadoOficial(texto: string | null | undefined, lista: readonly string[] = ESTADOS_REPUBLICA): string {
  const buscado = clave(texto ?? '');
  if (!buscado) return '';
  return lista.find((estado) => clave(estado) === buscado) ?? '';
}

/**
 * Errores de captura antes de mandar (el backend valida de nuevo). Con
 * `completo`, todo menos el número interior es obligatorio; si no, solo se
 * valida el formato de lo capturado.
 */
export function validarDomicilio(valores: ValoresDomicilio, completo: boolean, estados: readonly string[] = ESTADOS_REPUBLICA): Partial<Record<CampoDomicilio, string>> {
  const errores: Partial<Record<CampoDomicilio, string>> = {};

  for (const campo of CAMPOS_DOMICILIO) {
    const valor = (valores[campo] ?? '').trim();
    if (!valor) {
      if (completo && !OPCIONALES.includes(campo)) {
        errores[campo] = campo === 'domicilio_estado' ? 'Elige el estado.' : `Captura ${ETIQUETAS_DOMICILIO[campo].toLowerCase()}.`;
      }
      continue;
    }
    if (valor.length > MAXIMOS[campo]) errores[campo] = `Máximo ${MAXIMOS[campo]} caracteres.`;
  }

  const cp = (valores.domicilio_cp ?? '').trim();
  if (cp && !/^\d{5}$/.test(cp)) errores.domicilio_cp = 'El código postal son 5 dígitos.';

  const estado = (valores.domicilio_estado ?? '').trim();
  if (estado && !estadoOficial(estado, estados)) errores.domicilio_estado = 'Elige un estado de la lista.';

  return errores;
}

/**
 * Solo los campos que cambian respecto a lo vigente (la solicitud de
 * actualización nunca propone un valor igual al del expediente).
 */
export function cambiosDomicilio(valores: ValoresDomicilio, actuales: ValoresDomicilio): ValoresDomicilio {
  const cambios: ValoresDomicilio = {};
  for (const campo of CAMPOS_DOMICILIO) {
    const nuevo = (valores[campo] ?? '').trim();
    if (nuevo && nuevo !== (actuales[campo] ?? '').trim()) cambios[campo] = nuevo;
  }
  return cambios;
}
