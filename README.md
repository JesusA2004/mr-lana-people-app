# MR. LANA PEOPLE — App móvil de colaboradores

Aplicación móvil interna (Expo + React Native + TypeScript) para que los
colaboradores de **MR. LANA** consulten su perfil, vacaciones, solicitudes y
notificaciones. Es **solo un cliente** de la API del backend Laravel del
proyecto [`capacitaciones`](https://github.com/JesusA2004/capacitaciones):
no implementa lógica de Recursos Humanos, no calcula saldos ni aprueba nada
por su cuenta — todo dato viene de la API.

## Requisitos

- Node.js 20+ (probado con Node 24) y npm.
- El backend Laravel corriendo y accesible en tu red local.
- Un teléfono con [Expo Go](https://expo.dev/go) (Android/iOS) o un
  emulador/simulador.

## Instalación

```bash
npm install
```

## Configuración

La app **solo** lee la URL de la API desde `EXPO_PUBLIC_API_URL`. No hay
IPs ni dominios hardcodeados en el código: si esta variable no está
definida, la app lo detecta al iniciar y muestra un error claro en vez de
fallar en silencio.

1. Copia el archivo de ejemplo:

   ```bash
   cp .env.example .env
   ```

   En Windows, si `cp` no está disponible, simplemente crea `.env` a mano
   con el mismo contenido que `.env.example`.

2. Edita `.env` y define la URL completa de la API, **incluyendo** `/api/v1`:

   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
   ```

### `localhost` vs. IP de tu red local

Si usas Expo Go en un **teléfono físico**, `localhost`/`127.0.0.1` apunta al
propio teléfono, no a tu computadora — la API nunca será alcanzable así.
Debes usar la IP de tu computadora dentro de la red Wi-Fi/LAN a la que
también está conectado el teléfono.

**Obtener tu IP en Windows:**

```bash
ipconfig
```

Busca el adaptador Wi-Fi/Ethernet activo y usa el valor de `Dirección IPv4`
(por ejemplo `192.168.1.87`).

Si usas un **emulador Android**, `10.0.2.2` apunta al `localhost` de tu
computadora. Si usas el **simulador de iOS** (macOS), `localhost` sí
funciona directamente.

### Levantar el backend Laravel para que sea accesible en la red

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

`--host=0.0.0.0` es necesario para que otros dispositivos de la red (tu
teléfono) puedan conectarse; con el host por defecto (`127.0.0.1`) solo tu
propia computadora podría hacerlo.

## Ejecución

```bash
npx expo start
```

Escanea el código QR con la app **Expo Go** (Android) o la cámara (iOS), o
presiona `a` / `i` en la terminal para abrir un emulador/simulador.

Esta es una app **interna**: durante esta fase no se publica en Google Play
ni en App Store.

## Flujo de prueba rápido

1. Arranca Laravel con `--host=0.0.0.0`.
2. Arranca Expo con `npx expo start` y abre la app en tu teléfono/emulador.
3. Inicia sesión con un colaborador de prueba (ver abajo).
4. Verifica Dashboard, Perfil, Vacaciones y Solicitudes.
5. Crea una solicitud y confírmala en el listado y en el detalle.
6. Desde el backend web, entra como `rh.admin@mrlana.test` y cambia el
   estado de la solicitud en `/rh/solicitudes`.
7. Regresa a la app y desliza para refrescar (pull-to-refresh): el nuevo
   estado debe reflejarse.
8. Revisa notificaciones y marca alguna como leída.
9. Cierra y vuelve a abrir la app: la sesión debe persistir (token en
   SecureStore).
10. Cierra sesión desde Perfil → Configuración y confirma que el token se
    elimina y regresas al login.

## Usuarios de prueba

> Estas credenciales son solo para pruebas manuales contra el backend; no
> están hardcodeadas en ningún lugar de la app.

| Rol          | Correo                       | Contraseña          |
| ------------ | ----------------------------- | -------------------- |
| Colaborador  | `colaborador1@mrlana.test`    | `Capacitacion2026!`  |
| Colaborador  | `colaborador2@mrlana.test`    | `Capacitacion2026!`  |
| RH (solo web)| `rh.admin@mrlana.test`        | `Capacitacion2026!`  |

La app móvil está pensada **exclusivamente para colaboradores** — el rol de
RH se usa solo desde el backend web para verificar el flujo end-to-end.

## Endpoints consumidos

Todos bajo `EXPO_PUBLIC_API_URL` (que ya incluye `/api/v1`):

- **Auth:** `POST /login`, `POST /logout`, `GET /me`
- **Colaborador:** `GET /colaborador/perfil`, `GET /colaborador/dashboard`,
  `GET /colaborador/vacaciones`, `GET /colaborador/solicitudes`,
  `POST /colaborador/solicitudes`, `GET /colaborador/notificaciones`
- **Vacaciones:** `GET /vacaciones/saldo`, `GET /vacaciones/solicitudes`,
  `POST /vacaciones/solicitudes`
- **Solicitudes:** `GET /solicitudes`, `POST /solicitudes`,
  `GET /solicitudes/{solicitud}`
- **Notificaciones:** `GET /notificaciones`,
  `POST /notificaciones/{notificacion}/leer`

Las pantallas de Vacaciones y Solicitudes usan los namespaces dedicados
(`/vacaciones/*`, `/solicitudes/*`); los endpoints bajo `/colaborador/*`
para esos mismos dominios están implementados y disponibles en
`src/api/colaborador.ts` por si el backend los prioriza más adelante.

## Seguridad

- El token de sesión se guarda **únicamente** con `expo-secure-store`
  (nunca `AsyncStorage`, `localStorage` ni en memoria persistente).
- La contraseña nunca se persiste ni se registra en logs.
- Toda petición autenticada envía `Authorization: Bearer <token>` y
  `Accept: application/json` (interceptor central en `src/api/client.ts`).
- Cualquier `401` limpia el token de SecureStore, limpia el estado global y
  regresa al login automáticamente.

## Estructura del proyecto

Expo Router SDK 57 usa `src/app` como raíz de rutas automáticamente (sin
necesidad de `metro.config.js`); el resto del código vive en `src/`.

```
src/
├── app/                      # Rutas (Expo Router)
│   ├── _layout.tsx           # Root layout: splash, restauración de sesión, Stack.Protected
│   ├── +not-found.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   └── (app)/                 # Protegido: solo accesible con sesión iniciada
│       ├── _layout.tsx
│       ├── (tabs)/
│       │   ├── _layout.tsx
│       │   ├── index.tsx      # Dashboard
│       │   ├── solicitudes.tsx
│       │   ├── vacaciones.tsx
│       │   └── perfil.tsx
│       ├── solicitud/
│       │   ├── nueva.tsx
│       │   └── [id].tsx
│       ├── notificaciones.tsx
│       └── configuracion.tsx  # Cerrar sesión
│
├── api/                       # Un archivo por dominio + client.ts central
├── components/                 # Button, Card, AppHeader, StatusBadge, etc.
├── constants/                  # colors.ts (sistema de diseño), config.ts
├── store/                      # authStore.ts (Zustand)
├── types/                      # Tipos TypeScript por dominio
└── utils/                      # dates.ts, formatters.ts, errors.ts
```

## Stack técnico

Expo, React Native, TypeScript, Expo Router, Axios, Zustand,
`expo-secure-store`, React Hook Form + Zod, `@react-native-community/datetimepicker`,
`@expo/vector-icons`, `react-native-reanimated`, `react-native-safe-area-context`.
Sin Redux, sin Firebase, sin Supabase, sin backend adicional.

## Identidad visual

Los colores de marca (`src/constants/colors.ts`) y los logos
(`assets/images/brand/`) se tomaron del repositorio del backend
([`capacitaciones`](https://github.com/JesusA2004/capacitaciones),
`resources/css/app.css` y `public/images/`) para mantener consistencia
entre la web y la app móvil.

## Notas / pendientes conocidos con el backend

- **Foto de perfil:** `perfil.foto_url` puede apuntar a una ruta protegida
  por sesión web (NAS) que no acepta Bearer token. La app **no** intenta
  resolver rutas internas del NAS: usa `foto_url_api` si el backend llega a
  exponerla (idealmente una URL firmada temporal) y, si no hay foto válida
  o falla la carga, muestra un avatar con iniciales — nunca rompe Dashboard
  ni Perfil.
- **Nombres de campo:** los tipos en `src/types/` modelan los nombres de
  campo más probables (snake_case/español) como opcionales, con lectura
  defensiva vía `pickString`/`pickNumber`/`pickBoolean`
  (`src/utils/formatters.ts`). Si el backend real usa otros nombres, solo
  hay que ajustar las listas de claves en esas llamadas — no hay que tocar
  la UI.
- **Envoltura de respuesta:** se asume el patrón estándar de Laravel API
  Resources, `{ data: ... }` (`extractData` en `src/api/client.ts`). Si
  algún endpoint devuelve la forma sin envolver, `extractData` ya lo
  soporta también.

Verificar estos supuestos contra respuestas reales del backend (con Laravel
corriendo) es el primer paso recomendado antes de dar por cerrada la
integración.
