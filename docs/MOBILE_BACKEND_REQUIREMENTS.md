# Requerimientos de backend — MR. LANA PEOPLE Mobile v2

Este documento se generó investigando directamente el repositorio
[`JesusA2004/capacitaciones`](https://github.com/JesusA2004/capacitaciones)
(clonado en solo lectura, rama `main`) antes de tocar código de la app móvil,
tal como pide el encargo. Nada aquí se inventa: cada punto cita el archivo
real inspeccionado. El repo `capacitaciones` **no fue modificado** — esta
tarea se quedó en `mr-lana-people-app`.

## 1. Matriz de capacidades (API vs. App)

| Funcionalidad | ¿Existe en API? | ¿Existe en app? | ¿Falta backend? | Acción tomada en esta iteración |
|---|---|---|---|---|
| Login / logout / `me` (Sanctum) | Sí (`AuthController`) | Sí | No | Se corrigieron los tipos (`nombre`+`apellidos`+`correo`, no `name`/`email`) |
| Perfil (`/colaborador/perfil`) | Sí (`ColaboradorPerfilService::perfil`) | Sí | No | Tipos reescritos con los campos reales; Perfil V2 |
| Dashboard (`/colaborador/dashboard`) | Sí, pero **anidado** (`perfil`/`vacaciones`/`notificaciones`, no aplanado como asumía la app anterior) | Sí | No | Tipos y pantalla reescritos contra la forma real |
| Foto de perfil móvil | Parcial — `foto_url` apunta a una ruta protegida por **sesión web**, no por Bearer token | Sí (con fallback a iniciales) | **Sí** | Documentado abajo (P0) — la app nunca rompe, solo no puede mostrar la foto real todavía |
| Vacaciones — saldo/listar/crear | Sí (`VacacionesService`) | Sí | No | Se corrigió `dias_usados` (no `dias_utilizados`) y se agregó `dias_solicitados` **obligatorio** al payload de creación (antes causaba 422 real) |
| Solicitudes internas — listar/crear/detalle | Sí (`SolicitudesService`, `SolicitudInternaResource`) | Sí | No | Se corrigió el payload (`motivo` en vez de `comentario`, causaba 422 real) y se agregó `prestamo_interno` al catálogo (existe en `TipoSolicitudInterna` y la app no lo tenía) |
| Notificaciones in-app — listar/marcar leída | Sí (`NotificacionesService`, tabla `notifications` nativa) | Sí | Parcial | Se corrigió `leida` (no `leido`); Centro de notificaciones V2 con pestañas Todas/No leídas |
| **Eventos de notificación de solicitudes/vacaciones/documentos** | **No** — se revisó `app/Notifications/*` completo: solo existen notificaciones de capacitación (`ActividadCalificadaNotification`, `AsignacionCreadaNotification`, etc.); ninguna se dispara al aprobar/rechazar una solicitud, vacaciones o documento | No (no hay nada que consumir) | **Sí** | Documentado (P0) |
| Expediente digital (catálogo + progreso) | El cálculo **sí existe** (`App\Services\Expedientes\ExpedienteService`, `DocumentType`, `EmployeeDocument`) pero solo se usa desde `Rh\ExpedienteController` (web, para RH viendo a otros) — no hay endpoint para que el propio colaborador vea su expediente | No | **Sí** | Tab "Mi expediente" implementado como estado honesto ("en desarrollo"), sin datos inventados (ver P0) |
| Carga de documentos desde el colaborador | Existe `App\Services\Expedientes\DocumentoStorageService` (disco NAS) pero solo se invoca desde controladores de RH | No (deliberadamente no implementado — ver AGENTS.md §19) | **Sí** | `expo-image-picker`/`expo-document-picker` instalados y listos, sin UI de carga hasta que exista el endpoint |
| Push tokens por dispositivo | **No existe absolutamente nada** (sin tabla, sin controller, sin migración — se buscó `push_token`, `fcm_token`, `device_token`, `ExpoPushToken` en todo `app/` y migraciones) | Scaffolding listo (`src/hooks/usePushRegistration.ts`, `src/api/dispositivos.ts`) pero las llamadas fallarán (404) hasta que el backend las agregue | **Sí** | Documentado (P0) |
| Envío de push real | No | Flujo cliente listo, requiere Development Build (Expo Go ya no soporta push remoto desde SDK 53) | **Sí** | Documentado (P0) |
| "Mi incorporación" (progreso de alta) | Existe `AltaDigital` + `EstadoAltaDigital`, pero es un flujo **pre-colaborador** vía liga pública (`AltaPublicaController`), pensado para candidatos, no para que un colaborador ya dado de alta consulte su propio progreso desde la app | No | Sí (P1) | Documentado — no se construyó UI para evitar inventar datos |
| Aprobación multi-nivel RH → Gerente → Director Comercial (Corporativo) | **No existe** — se revisaron `AltaDigitalPolicy` (solo `revisar`/`aprobar` de un paso) y los roles (`gerente`, `gerente_sucursal`, `director_comercial` existen como roles/alcance de reportes en `AlcanceOrganizacionalService`, pero no hay ninguna máquina de estados de aprobación en cadena) | No (correctamente, no se inventó en el cliente — ver AGENTS.md §21) | Sí (P1) | Documentado, **no implementado en el cliente** |
| Deep-link de notificación a un recurso | El campo `url` de cada notificación existe, pero siempre es una **ruta web absoluta** (`route('mi-capacitacion.index')`, etc.), nunca una ruta interna de la app | Parcial (la app ignora con seguridad cualquier `url` que no empiece con `/`) | Sí (P2) | Documentado |

## 2. P0 — Obligatorio (bloquea valor real de producto)

### P0.1 — Notificar (in-app y push) los eventos de solicitudes/vacaciones/documentos

**Hallazgo:** hoy, aprobar o rechazar una solicitud interna, una solicitud de
vacaciones o un documento **no genera ninguna notificación**, ni siquiera la
in-app que ya consume la app móvil. `App\Notifications\` solo cubre eventos
de capacitación.

**Qué agregar:**
- Clases `Illuminate\Notifications\Notification` nuevas, por ejemplo
  `SolicitudInternaAprobadaNotification`, `SolicitudInternaRechazadaNotification`,
  `SolicitudVacacionesAprobadaNotification`, `SolicitudVacacionesRechazadaNotification`,
  `DocumentoAprobadoNotification`, `DocumentoRechazadoNotification`
  (mismo patrón que las existentes: `data()` con `tipo`, `titulo`, `mensaje`,
  `url`).
- Dispararlas desde los mismos Services que ya cambian el estado — por
  ejemplo donde `Rh\SolicitudController`/`SolicitudesService` marcan
  `EstadoSolicitudInterna::Aprobada`/`Rechazada`, y el equivalente en
  `Rh\VacacionesController`/`VacacionesService` — **reutilizando la lógica
  existente**, no una nueva.
- `tipo` en el payload de cada notificación debe ser uno de
  `solicitud`/`vacaciones`/`documento` para que
  `ICON_BY_TYPE` en `src/app/(app)/notificaciones.tsx` (ya implementado)
  muestre el ícono correcto.

**Razón:** sin esto, "Centro de notificaciones" y "Home dinámico"
(AGENTS.md §28-30) sencillamente no tienen datos que mostrar, sin importar
qué tan buena sea la pantalla.

### P0.2 — Push tokens por dispositivo

**Hallazgo:** no existe tabla ni endpoint. Confirmado buscando
`push_token`/`fcm_token`/`device_token`/`ExpoPushToken` en todo `app/` y
`database/migrations`.

**Endpoints propuestos** (a confirmar con el equipo backend antes de
nombrar rutas definitivas):

```
POST   /api/v1/dispositivos/push-token
DELETE /api/v1/dispositivos/push-token
```

**Payload POST** (igual al que ya arma `src/api/dispositivos.ts`):
```json
{ "token": "ExponentPushToken[...]", "platform": "android", "device_name": "Samsung SM-A125M" }
```

**Payload DELETE:** `{ "token": "ExponentPushToken[...]" }`.

**Tabla sugerida** `device_push_tokens`: `id`, `user_id` (FK), `token`
(único), `platform` (`ios`/`android`), `device_name` (nullable), timestamps.
Un mismo token debe poder reasignarse de usuario (logout de A + login de B
en el mismo dispositivo) con un `updateOrCreate` por `token`.

**Servicio de envío:** un `PushNotificationService` que use el paquete
`expo-server-sdk` (PHP: `alymosul/expo-server-sdk` o llamar directo a
`https://exp.host/--/api/v2/push/send`) y se invoque desde los mismos
puntos que P0.1, además del envío in-app.

**Permisos:** el endpoint solo debe requerir `auth:sanctum` (es "mi propio
dispositivo"), sin permiso adicional — igual que el resto de
`api/v1/colaborador/*`.

### P0.3 — Foto de perfil accesible desde la app

**Hallazgo:** `ColaboradorPerfilService::perfil()` genera `foto_url` con
`route('rh.expedientes.foto', $colaborador)`, protegida por **sesión web**
(`Rh\ExpedienteController`), no por el Bearer token de Sanctum que usa la
app móvil. Confirmado también en `docs/API_MOVIL.md` del propio backend
("Pendiente" — ya estaba anotado por el equipo backend).

**Opciones (a decidir por el equipo backend):**
1. `URL::temporarySignedRoute()` de corta duración, devuelta ya resuelta en
   `foto_url` cuando la request viene autenticada por Sanctum (mismo patrón
   que ya usa la biblioteca multimedia, según el comentario en
   `DocumentoStorageService`).
2. Servir la imagen en base64 dentro del propio JSON de `/colaborador/perfil`
   (más simple, pero encarece la respuesta si la foto es grande).

**Mientras tanto:** `Avatar.tsx` ya cae a iniciales sin romper nada — no es
necesario ningún cambio de emergencia, es una mejora de UX pendiente.

### P0.4 — Endpoint de expediente digital para el propio colaborador

**Hallazgo:** el cálculo ya existe y es reutilizable tal cual:
`App\Services\Expedientes\ExpedienteService::documentosVigentes()` y
`resumenCompletitud()`, sobre los modelos `DocumentType`/`EmployeeDocument`.
Solo falta exponerlo al colaborador autenticado (hoy solo lo usa
`Rh\ExpedienteController` para que RH vea el expediente de otros).

**Endpoint propuesto:**
```
GET /api/v1/colaborador/expediente
```
Reutilizando `ExpedienteService::resumenCompletitud($request->user())` +
`documentosVigentes()`, mapeado a un JSON con, por tipo de documento
requerido: `nombre`, `clave`, `status` (uno de los valores de
`EstadoDocumento`), `rejection_reason` cuando aplique. **No crear un
Service nuevo** — este ya está listo, solo falta el controlador/ruta de
`Api\V1`.

### P0.5 — Endpoint de carga de documentos desde el colaborador

**Hallazgo:** `DocumentoStorageService` ya es "la única puerta de entrada"
al disco NAS de expedientes (comentario explícito en el propio archivo) y
ya sabe generar nombres internos no predecibles y rutas por usuario. Falta
el controlador/ruta que lo exponga a `Api\V1` con las mismas reglas que
`Rh\SubirDocumentoRequest`.

**Endpoint propuesto:**
```
POST /api/v1/colaborador/documentos   (multipart/form-data: document_type_id, archivo)
```

**Validaciones sugeridas** (a confirmar contra `Rh\SubirDocumentoRequest`
real): mismos tipos MIME/tamaño máximo que ya usa RH — la app solo debe
permitir seleccionar lo que el backend vaya a aceptar (PDF/JPG/JPEG/PNG).

**Storage:** reutilizar `DocumentoStorageService::disco()` /
`nombreInterno()` / `rutaDocumento()` — **no crear un disco ni una tabla
paralela**. El nuevo `EmployeeDocument` queda en `EstadoDocumento::Cargado`
hasta que RH lo revise, exactamente como ya ocurre en el flujo web.

**Por qué es P0 y no se implementó ya en el cliente:** AGENTS.md §19 es
explícito — no se debe simular una carga exitosa ni guardar documentos solo
en el teléfono. `expo-image-picker` y `expo-document-picker` ya están
instalados (`package.json`) y listos para conectarse en cuanto exista este
endpoint.

## 3. P1 — Importante

### P1.1 — Regla de negocio: aprobación multi-nivel para Corporativo MR. LANA

AGENTS.md §21 pide un flujo `Colaborador → RH → Gerente → Director
Comercial` para colaboradores de "Corporativo MR. LANA". Se revisó
`AltaDigitalPolicy` (solo tiene `revisar`/`aprobar` de un paso) y
`AlcanceOrganizacionalService` (donde `gerente`, `gerente_sucursal` y
`director_comercial` existen como roles con alcance de **visibilidad de
reportes**, no como pasos de una máquina de estados de aprobación). **Esta
cadena de aprobación no existe en ningún modelo del backend.**

Antes de construir nada — ni en la app ni en el backend — se necesita una
decisión de producto: ¿esta regla aplica a `SolicitudInterna`, a
`AltaDigital`, a ambas? ¿"Corporativo" se identifica por `empresa_id`? Se
deja documentado a propósito sin implementar (AGENTS.md §53: "si detectas
una decisión de negocio que requiere backend y no está definida, no
inventes la regla, documéntala").

### P1.2 — "Mi incorporación" para colaboradores ya convertidos

`AltaDigital` tiene `user_id`/`creado_por` (ver docblock del modelo), lo que
sugiere que, tras `ConversionColaboradorService`, el registro de alta queda
enlazado al `User` final. Si ese vínculo es confiable, un endpoint
```
GET /api/v1/colaborador/incorporacion
```
podría devolver `estado` (`EstadoAltaDigital`), fechas y observaciones del
propio proceso de alta del colaborador autenticado, reutilizando el modelo
tal cual. Falta confirmar con el equipo backend si ese vínculo se mantiene
de forma consistente para altas antiguas.

### P1.3 — `url` de notificación como deep-link real

Hoy `url` siempre es una ruta web absoluta (`route(...)`), nunca algo que la
app pueda interpretar (confirmado en `app/Notifications/*`). Para que
"tocar una notificación navega al recurso" (AGENTS.md §29) funcione de
verdad, la notificación necesitaría además `tipo` + `recurso_id`
estructurados (ej. `{"tipo": "solicitud", "recurso_id": 42}`) en vez de (o
además de) `url`. La app ya tiene el código de navegación listo
(`src/app/(app)/notificaciones.tsx`) y hoy ignora con seguridad cualquier
`url` que no sea una ruta interna.

## 4. P2 — Mejora

- **Rate limiting específico de la API móvil** — ya anotado como pendiente
  en `docs/API_MOVIL.md` del propio backend.
- **Endpoints dedicados de incapacidades/permisos** — hoy se consultan
  filtrando `/solicitudes` por `tipo`, documentado como decisión consciente
  en `docs/API_MOVIL.md` ("no hacía falta duplicar la ruta"); no se propone
  cambiarlo.
- **Marcar todas las notificaciones como leídas de un golpe** — el Service
  ya tiene `marcarTodasLeidas()`, solo falta exponerlo:
  `POST /api/v1/notificaciones/leer-todas`.

## 5. Nota sobre `usesCleartextTraffic`

`expo-doctor` reporta que `android.usesCleartextTraffic` en `app.json` ya no
es reconocido por el schema de configuración de esta versión de Expo. Es
una configuración **preexistente** (no se agregó en esta iteración) y
probablemente ligada a pruebas locales contra IPs `http://` en la misma red
(ver el comentario en `src/constants/config.ts`). No se modificó sin
confirmar con el equipo si sigue siendo necesaria para el flujo de
desarrollo actual.
