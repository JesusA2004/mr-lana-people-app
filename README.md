# MR. LANA PEOPLE — App móvil

Aplicación móvil empresarial única (Expo + React Native + TypeScript) para
**MR. LANA**: la misma cuenta sirve tanto para la experiencia de colaborador
("Mi espacio" — perfil, expediente, vacaciones, solicitudes, notificaciones,
cumpleaños) como, si tiene capacidad real, para Gestión RH (dashboard,
bandeja unificada de pendientes, solicitudes/vacaciones/documentos/
incorporaciones, expedientes, directorio de colaboradores). Es **solo un
cliente** de la API del backend Laravel del proyecto
[`capacitaciones`](https://github.com/JesusA2004/capacitaciones): no
implementa lógica de Recursos Humanos, no calcula saldos ni decide permisos
ni acciones por su cuenta — todo dato y toda regla de negocio vienen de la
API (ver AGENTS.md, sección "Regla de oro").

Documentación adicional: **`docs/MOBILE_BACKEND_SYNC_2026_09_22.md`** (ciclo laboral
completo: endpoints, permisos, feature flags, push y gaps reales — **la fuente de verdad vigente**),
`docs/BACKEND_SYNC_2026_09_15.md` (histórico, marcado como superado donde contradiga),
`docs/PRUEBAS_FISICAS_2026_09_15.md` (checklist en dispositivo) y
`docs/BUILD_AND_TEST_FINAL.md` (build y plan de pruebas). `docs/BACKEND_GAPS_FINAL.md`
y `docs/BACKEND_REQUIREMENTS_V4.md` quedaron **superados**: describen
contratos que ya no corresponden al backend actual.

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

## Calidad (lo mismo que corre CI: `.github/workflows/mobile-ci.yml`)

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # jest
npm run check       # los tres
npx expo-doctor
npx expo export --platform android
```

## Builds (EAS)

- `preview`: APK interno, `autoIncrement` de build (cada APK es distinguible
  en Configuración → versión/build) y herramientas QA
  (`EXPO_PUBLIC_SHOW_DEV_TOOLS=true`: Diagnóstico Push, Design QA).
- `production`: `autoIncrement`, herramientas QA apagadas (las rutas `/dev/*`
  ni siquiera se registran).
- Con `appVersionSource: local`, EAS sube `android.versionCode`/`ios.buildNumber`
  en `app.json` al compilar: **commitea ese cambio** después de cada build.

Guías: `docs/PUSH_QA.md`, `docs/DEVICE_QA.md`, `docs/UI_UX_SYSTEM.md`,
`docs/APP_LINKS_SETUP.md`, `docs/FINAL_MOBILE_AUDIT.md`.

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

| Rol                  | Correo                       | Contraseña           |
| -------------------- | ----------------------------- | -------------------- |
| Colaborador          | `colaborador1@mrlana.test`    | `Capacitacion2026!`  |
| Colaborador          | `colaborador2@mrlana.test`    | `Capacitacion2026!`  |
| RH (web + app móvil) | `rh.admin@mrlana.test`        | `Capacitacion2026!`  |

Cualquier cuenta con capacidad RH real (permiso `rh.pendientes.ver` en el
backend) puede iniciar sesión en la misma app y elegir la experiencia
Gestión RH desde el selector que aparece la primera vez, o cambiar después
desde Configuración → "Cambiar a Gestión RH".

## Endpoints consumidos

Todos bajo `EXPO_PUBLIC_API_URL` (que ya incluye `/api/v1`). Contrato
completo y verificado contra el código fuente real del backend en
`docs/API_MOVIL.md`, `docs/RH_MOBILE_API.md`, `docs/BACKEND_MOBILE_V5.md` y
`docs/PUSH_NOTIFICATIONS.md` de `capacitaciones`.

- **Auth:** `POST /login`, `POST /logout`, `GET /me`
- **Bootstrap/config:** `GET /mobile/bootstrap`, `GET /app/config`,
  `GET /app/releases/latest`, `GET /app/releases`
- **Dispositivos (push):** `POST /dispositivos/push-token`,
  `DELETE /dispositivos/push-token`
- **Colaborador:** `GET /colaborador/perfil`, `GET /colaborador/foto`,
  `GET /colaborador/dashboard`, `GET /colaborador/vacaciones`,
  `GET /colaborador/solicitudes`, `POST /colaborador/solicitudes`,
  `GET /colaborador/notificaciones`, `GET /colaborador/incorporacion`,
  `POST /colaborador/incorporacion/documentos/{tipo}/subir`,
  `POST /colaborador/incorporacion/documentos/{documento}/solicitar-cambio`,
  `GET /colaborador/cumpleanos/felicitacion-actual[/imagen]`
- **Vacaciones:** `GET /vacaciones/saldo` — y **nada más**. El resto del
  namespace `/vacaciones/*` es legacy (tabla `solicitudes_vacaciones`): toda
  vacación nueva se crea como solicitud unificada `tipo: "vacaciones"`. Ver
  `docs/BACKEND_SYNC_2026_09_15.md`, sección C.
- **Solicitudes (unificadas — el centro de la app):** `GET /solicitudes`,
  `POST /solicitudes`, `GET /solicitudes/{solicitud}`,
  `GET /solicitudes/configuracion`, `POST /solicitudes/{solicitud}/adjuntos`,
  `POST /solicitudes/{solicitud}/cancelar`
- **Ciclo laboral (autoservicio, 22/09):** `GET /colaborador/alta|expediente|documentos-pendientes|contratos|jerarquia`,
  `GET /colaborador/documentos-laborales[/{id}/descargar]`, `POST /colaborador/documentos-laborales/{id}/firmar`,
  `GET /colaborador/recibos[/{id}[/pdf]]`, `GET /colaborador/prestamos[/{id}]`
- **Jefe / evaluaciones / tareas:** `GET /equipo`, `GET /equipo/pendientes`, `POST /equipo/solicitudes/{id}/visto-bueno`,
  `GET|POST /evaluaciones[/{id}[/capturar|autorizar|devolver]]`, `GET /tareas`, `POST /tareas/{id}/leer|resolver`
- **RH ciclo laboral:** `/rh/colaboradores/{id}/alta|activar|jerarquia|contratos|cierres|recibos|actas`,
  `/rh/documentos-laborales*`, `/rh/contratos/por-vencer`, `/rh/cierres*`, `/rh/recibos*`, `/rh/prestamos*`,
  `/rh/solicitudes/{id}/prestamo/autorizar|rechazar`, `/rh/actas*`, `/rh/plantilla/cobertura`, `/rh/indicadores`,
  `/rh/organigrama`, `/rh/vacantes/{id}`, `GET /rh/plantillas-documentales` (detalle en el doc del 22/09)
- **Notificaciones:** `GET /notificaciones`,
  `POST /notificaciones/{notificacion}/leer`,
  `POST /notificaciones/leer-todas`
- **Incorporación por QR (público, sin sesión):**
  `GET /incorporacion/invitaciones/{token}/validar`,
  `GET /incorporacion/invitaciones/{token}/fases`,
  `POST /incorporacion/invitaciones/{token}/registrar`
- **Gestión RH** (todos bajo `/rh`, requieren capacidad real):
  `GET dashboard`, `GET pendientes`,
  `GET|POST solicitudes[/{id}/aprobar|rechazar|correccion]`,
  `PATCH solicitudes/{id}/estado`,
  `GET vacantes` (solo lectura),
  `GET|POST vacaciones[/{id}/aprobar|rechazar]` *(legacy, fuera de la navegación nueva)*,
  `GET|POST documentos[/{id}/ver|aprobar|rechazar]`,
  `GET|POST incorporaciones[/{id}/aprobar|rechazar]`,
  `GET colaboradores[/{id}]`,
  `GET expedientes[/{colaborador}]`,
  `GET expedientes/{colaborador}/documentos/{documento}/ver`,
  `POST expedientes/{colaborador}/documentos/{documento}/{aprobar|rechazar|autorizar-cambio}`,
  `POST expedientes/{colaborador}/{aprobar|rechazar}-incorporacion`

"Mis vacaciones" ya **no** es un módulo aparte: es `/solicitudes` filtrado por
`tipo=vacaciones`, más el saldo leído del endpoint legacy. Los endpoints bajo
`/colaborador/*` para esos mismos dominios siguen implementados en
`src/api/colaborador.ts` (usados por el Dashboard).

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
├── app/                       # Rutas (Expo Router)
│   ├── _layout.tsx            # Root layout: splash, sesión, app/config, actualización obligatoria
│   ├── incorporacion/qr/[token].tsx   # Pantalla pública de registro por QR
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── escanear-qr.tsx    # Scanner QR real (expo-camera)
│   └── (app)/                 # Protegido: solo con sesión iniciada
│       ├── _layout.tsx        # Decide Mi espacio vs. Gestión RH (Stack.Protected)
│       ├── cumpleanos.tsx
│       ├── (tabs)/            # Mi espacio: Inicio/Expediente/Solicitudes/Vacaciones/Perfil
│       ├── rh/                # Gestión RH (segmento real, no grupo — rutas bajo /rh)
│       │   ├── (tabs)/        # Inicio/Pendientes/Colaboradores/Notificaciones/Perfil
│       │   ├── solicitudes/[id].tsx
│       │   ├── vacantes/index.tsx     # Solo lectura (gestión = Portal RH web)
│       │   ├── vacaciones/[id].tsx    # LEGACY: sin enlace en la navegación nueva
│       │   ├── documentos/[id].tsx
│       │   ├── incorporaciones/[colaborador].tsx
│       │   ├── colaboradores/[id].tsx
│       │   └── expedientes/[colaborador]/documentos/[documento].tsx
│       ├── solicitud/{nueva,[id]}.tsx
│       ├── notificaciones.tsx
│       └── configuracion.tsx  # Cambiar de experiencia, cerrar sesión
│
├── api/                        # Un archivo por dominio + client.ts central; api/rh/* para Gestión RH
├── components/                 # Button, Card, WorkflowTimeline, SecureDocumentViewer, etc.
├── constants/                  # colors.ts (sistema de diseño), config.ts
├── hooks/queries/               # React Query por dominio (useRh*, useBirthday, useAppRelease...)
├── store/                       # authStore, experienceStore (Mi espacio/Gestión RH), etc.
├── types/                       # Tipos TypeScript por dominio
└── utils/                       # dates.ts, formatters.ts, errors.ts, parseIncorporacionQr.ts...
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

## Scheme y deep links

Scheme definitivo de la app: **`mrlanapeopleapp`** (`app.json` →
`expo.scheme`). El QR de incorporación que genera RH codifica la liga web
universal `https://people.mr-lana.com/incorporacion/qr/{token}` — la app la
acepta directo (`src/utils/parseIncorporacionQr.ts`), junto con
`mrlanapeopleapp://incorporacion/qr/{token}` y, por compatibilidad
temporal, el scheme legado `mrlanapeople://...`. Para que la liga `https://`
abra la app directo (App Links/Universal Links) en vez de solo el
navegador, falta que el backend publique los archivos de verificación de
dominio con credenciales reales — pasos exactos en `docs/APP_LINKS_SETUP.md`.

## Notas / pendientes conocidos con el backend

> **Actualizado 22/09/2026:** los gaps vigentes del ciclo laboral (G-1 a G-8: acceso de Dirección/Jurídico a Gestión RH, catálogos para el alta, monto del préstamo en el detalle RH, detalle de documento del colaborador, App Links…) están en `docs/MOBILE_BACKEND_SYNC_2026_09_22.md`, sección 6. **D-8 quedó resuelto**: la API de documentos laborales ya existe y el módulo está habilitado.

Ver **`docs/BACKEND_SYNC_2026_09_15.md`, sección D** para el detalle completo
y accionable. Resumen de los gaps vigentes:

- **D-1** — `SolicitudInternaResource` no serializa adjuntos ni historial, aunque `show()` los cargue.
- **D-2** — `tiposConFormulario()` no emite `fecha_efectiva` ni `tipo_baja`, que el FormRequest sí exige.
- **D-3** — Sin endpoint que exponga el catálogo `TipoBaja`.
- **D-4** — El saldo de vacaciones vive fuera del módulo unificado.
- **D-5** — `acciones_permitidas` no cubre `marcar_en_revision`/`cerrar`, y no existe para el colaborador.
- **D-6** — Sin campos de hora para los permisos por horas.
- **D-7** — `features` no incluye los módulos nuevos (formatos, vacantes, organigrama, OCR).
- **D-8** — No existe API de documentos laborales (módulo oculto fail-closed).

Ninguno bloquea el uso normal de lo demás: cada uno se rodea con manejo
explícito (permiso ausente, módulo oculto, campo suplido y documentado),
nunca un botón roto ni una pantalla que responda 404.
