/**
 * Flujo de registro por QR temporal — espejo de
 * `App\Http\Controllers\Api\V1\IncorporacionInvitacionController` y
 * `App\Http\Requests\Api\V1\RegistrarDesdeQrRequest` en capacitaciones (ver
 * docs/API_MOVIL.md, "Registro por QR temporal"). Endpoints públicos, sin
 * `auth:sanctum`: el token del QR es la única puerta de entrada.
 */
export interface InvitacionFase {
  clave: string;
  nombre: string;
  orden: number;
}

export interface InvitacionDatosPrellenados {
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  empresa?: string | null;
  sucursal?: string | null;
  departamento?: string | null;
  puesto?: string | null;
}

export interface InvitacionValida {
  valida: true;
  estado: string;
  expires_at?: string | null;
  datos_prellenados?: InvitacionDatosPrellenados;
  fases: InvitacionFase[];
}

/** `estado`: invalido | vencido | revocado | usado | correo_no_coincide. */
export interface InvitacionInvalida {
  valida: false;
  estado: string;
  message: string;
}

export type InvitacionValidarResponse = InvitacionValida | InvitacionInvalida;

export interface RegistrarQrPayload {
  name: string;
  apellidos?: string;
  email: string;
  password: string;
  password_confirmation: string;
  telefono?: string;
}

export interface RegistrarQrUsuario {
  id: number | string;
  name: string;
  apellidos?: string | null;
  email: string;
  estatus: string;
  roles: string[];
  permisos: string[];
}

export interface RegistrarQrResponse {
  token: string;
  usuario: RegistrarQrUsuario;
  siguiente_paso: string;
}
