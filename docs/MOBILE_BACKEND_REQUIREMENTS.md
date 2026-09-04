# REQUERIMIENTOS INMEDIATOS PARA ACTIVAR INTEGRACIÓN MOBILE

Este documento se generó investigando directamente el repositorio
[`JesusA2004/capacitaciones`](https://github.com/JesusA2004/capacitaciones)
(clonado en solo lectura, rama `main`, dos veces en dos iteraciones distintas
de este trabajo) antes de escribir cualquier tipo/servicio del cliente. Cada
punto cita el archivo real inspeccionado — nada aquí es inventado, y **nada
del repo `capacitaciones` fue modificado** desde `mr-lana-people-app`.

La app móvil (rama `feature/mobile-v2-employee-experience`) ya está
implementada por completo contra estos contratos: expediente, documentos,
incorporación, aprobaciones y push **no son pantallas "próximamente"** —
están construidas y solo esperan que el backend exponga las rutas. Mientras
tanto, cada pantalla afectada muestra el error real (con detalle técnico en
DEV, nunca en producción) en vez de datos falsos o un aviso de función
deshabilitada.

## Cómo leer este documento

Cada endpoint trae: **ruta**, **request**, **response**, **Service backend
a reutilizar** (ya existe, no se debe duplicar lógica), **migración** (si
aplica), **policy**, **evento/notificación** (si aplica) y **storage**. La
prioridad (P0/P1/P2) es la misma convención de siempre:

- **P0** — bloquea que la funcionalidad ya construida en la app sirva de algo.
- **P1** — importante, requiere además una decisión de producto/negocio.
- **P2** — mejora, no bloquea nada hoy.

---

## P0.1 — `GET /api/v1/colaborador/expediente`

Alimenta el tab "Mi expediente" (`src/app/(app)/(tabs)/expediente.tsx`) y el
detalle de documento (`src/app/(app)/expediente/[tipoId].tsx`).

- **Request:** ninguno (usa `auth:sanctum`, siempre "mi propio expediente").
- **Response:**
  ```json
  {
    "resumen": { "porcentaje": 82.0, "requeridos_total": 10, "requeridos_aprobados": 7, "pendientes": 2, "rechazados": 1 },
    "documentos": [
      {
        "tipo": { "id": 1, "nombre": "Identificación oficial", "clave": "ine", "requerido": true },
        "documento": {
          "id": 55, "status": "aprobado", "version": 1, "original_name": "ine.pdf",
          "mime": "application/pdf", "size": 245678,
          "comments": null, "rejection_reason": null,
          "subido_por": "Jesús Pérez", "revisado_por": "RH Uno",
          "reviewed_at": "2026-08-01", "created_at": "2026-07-20"
        }
      },
      { "tipo": { "id": 7, "nombre": "Comprobante de domicilio", "clave": "comprobante_domicilio", "requerido": true }, "documento": null }
    ]
  }
  ```
- **Service a reutilizar:** `App\Services\Expedientes\ExpedienteService::resumenCompletitud()` + `documentosVigentes()` — es exactamente lo mismo que ya arma `Rh\ExpedienteController::documentosParaVista()` (`app/Http/Controllers/Rh/ExpedienteController.php`). El nuevo controlador `Api\V1\ExpedienteController` (o un método nuevo en `ColaboradorController`) solo llama a `$this->expediente->resumenCompletitud($request->user())` y mapea `documentosVigentes()` al mismo formato que `documentosParaVista()`. **No crear lógica nueva.**
- **Migración:** ninguna.
- **Policy:** el rol base `colaborador` ya tiene el permiso `expedientes.ver` (confirmado en `database/seeders/RolesYPermisosSeeder.php`, línea ~322) — no reutilizar `AlcanceOrganizacionalService::puedeVerExpediente()` tal cual (esa policy sirve para que RH vea expedientes ajenos); para la API móvil basta con "es mi propio usuario autenticado", igual que ya hace `ColaboradorPerfilService::perfil()`.
- **Evento/notificación:** ninguno directo (ver P0.6 para eventos de documentos).
- **Storage:** ninguno nuevo — solo lectura de `document_types`/`employee_documents`.

## P0.2 — `POST /api/v1/colaborador/documentos` (subir/reemplazar documento de expediente)

Usado por `DocumentUploadSheet` desde la pantalla de detalle de documento.

- **Request:** `multipart/form-data` — `document_type_id` (int, requerido), `archivo` (file, requerido).
- **Response (201):** el mismo objeto `documento` del contrato de P0.1.
- **Service a reutilizar:** `App\Services\Expedientes\DocumentoStorageService::subirVersion($colaborador, $tipo, $archivo, $subidoPorId)` — ya existe y ya versiona automáticamente (archiva la versión anterior). Es literalmente lo que hace `Rh\EmployeeDocumentController::store()`, solo que ahí el colaborador de destino viene de la ruta (`{colaborador}`) porque lo sube RH; en la API móvil el colaborador es siempre `$request->user()`.
- **Migración:** ninguna.
- **Policy:** reutilizar `Rh\SubirDocumentoRequest::rules()` tal cual (`document_type_id` + `archivo`, mismos límites de `config('expedientes.max_upload_mb')` y `config('expedientes.extensiones_permitidas')` — hoy 20 MB, pdf/jpg/jpeg/png). El rol `colaborador` ya tiene `documentos.subir`.
- **Evento/notificación:** al quedar en `EstadoDocumento::EnRevision`, RH debería enterarse (ya deben tener esto en la web); del lado del colaborador, cuando **RH apruebe/rechace/pida corrección** (`Rh\EmployeeDocumentController::aprobar/rechazar/solicitarCorreccion`) es donde hace falta la notificación nueva — ver P0.6.
- **Storage:** el mismo disco `nas` que ya usa `DocumentoStorageService` — **no crear un disco paralelo**.

## P0.3 — `GET /api/v1/colaborador/documentos/{documento}/descargar`

Usado por el botón "Ver archivo" en el detalle de documento (`downloadAndOpenFile` en `src/utils/fileDownload.ts`, que descarga con el Bearer token y abre el visor nativo).

- **Request:** ninguno.
- **Response:** stream binario del archivo (`Content-Type`/`Content-Disposition` igual que `Rh\EmployeeDocumentController::descargar()`).
- **Service a reutilizar:** `DocumentoStorageService::respuesta($documento->path, [...])`.
- **Policy:** el documento debe pertenecer a `$request->user()->id` (a diferencia de la policy `descargar` que usa RH, que permite ver documentos de otros según alcance).
- **Storage:** mismo disco `nas`.

## P0.4 — `GET /api/v1/colaborador/foto`

Resuelve el problema real de que `foto_url` (heredado) depende de sesión web y nunca carga desde la app (confirmado en `docs/API_MOVIL.md` del propio backend, sección "Pendiente"). En vez de firmar URLs o mandar base64, la ruta más simple es autenticar con el mismo Bearer token que ya usa toda la API móvil.

- **Request:** ninguno.
- **Response:** stream binario de la foto (igual que `Rh\ExpedienteController::descargarFoto()`), 404 si `foto_path` es null.
- **Service a reutilizar:** `DocumentoStorageService::respuesta($colaborador->foto_path, [...])`.
- **Cambio adicional:** `ColaboradorPerfilService::perfil()` debe agregar `'foto_url_api' => $colaborador->foto_path !== null ? route('api.v1.colaborador.foto') : null` — la app ya lee `foto_url_api` con prioridad sobre `foto_url` (ver `src/components/ProfileAvatar.tsx`) y lo manda con el header `Authorization: Bearer <token>` (RN `Image` soporta `headers` en el `source`).
- **Policy:** solo el propio usuario (`auth:sanctum` es suficiente, sin permiso adicional).
- **Storage:** ninguno nuevo.

## P0.5 — Solicitudes: cancelar, adjuntar documento y enriquecer el detalle

Tres cambios sobre el mismo módulo, agrupados porque comparten `SolicitudesService` (`app/Services/Solicitudes/SolicitudesService.php`) — ya tiene **toda** la lógica implementada para la web, solo faltan las rutas de `Api\V1`.

### a) `POST /api/v1/solicitudes/{solicitud}/cancelar`
- **Request:** ninguno.
- **Response:** `SolicitudInternaResource` actualizado (`estado: "cancelada"`).
- **Service:** `SolicitudesService::cancelar($solicitud, $actor)` — ya existe, ya lo usa `Solicitudes\SolicitudInternaController::cancelar()` en la web.
- **Policy:** reutilizar la policy `cancelar` de `SolicitudInterna` (misma que usa la web) — internamente ya valida `EstadoSolicitudInterna::puedeCancelarse()`.

### b) `POST /api/v1/solicitudes/{solicitud}/documentos` (adjuntar)
- **Request:** `multipart/form-data` — `archivo` (file, requerido). Mismos límites que expediente (`config('expedientes.max_upload_mb')`/`extensiones_permitidas`).
- **Response (201):** `{ "id": 12, "original_name": "incapacidad.pdf", "mime": "application/pdf", "size": 123456, "created_at": "...", "subido_por": "Jesús Pérez" }`.
- **Service:** `SolicitudesService::adjuntarDocumento($solicitud, $archivo, $actor)` — ya existe, ya lo usa `Solicitudes\SolicitudInternaController::subirDocumento()` en la web.
- **Policy:** reutilizar `Rh\SubirDocumentoSolicitudRequest` (autoriza con `$user->can('view', $solicitud)`).
- **Storage:** `App\Services\Solicitudes\SolicitudDocumentoStorageService` (mismo disco `nas`, carpeta `solicitudes/{id}/`) — **no crear uno nuevo**.

### c) `GET /api/v1/solicitudes/{solicitud}/documentos/{documento}/descargar`
- Igual patrón que P0.3 pero sobre `SolicitudInternaDocumento` y `SolicitudDocumentoStorageService::respuesta()`.

### d) Enriquecer `SolicitudInternaResource`
Hoy (`app/Http/Resources/Api/V1/SolicitudInternaResource.php`) solo devuelve
campos planos. La web (`Solicitudes\SolicitudInternaController::show()`) ya
carga `documentos`, `documentosGenerados.plantilla` e `historial.usuario` —
agregar esas mismas relaciones a la respuesta de
`GET /api/v1/solicitudes/{solicitud}`:
```json
{
  "...": "... campos actuales sin cambios ...",
  "documentos": [{ "id": 12, "original_name": "incapacidad.pdf", "mime": "application/pdf", "size": 123456, "created_at": "...", "subido_por": "Jesús Pérez" }],
  "documentos_generados": [{ "id": 3, "generated_name": "constancia-laboral.pdf", "mime": "application/pdf", "size": 88210, "status": "firmado", "created_at": "..." }],
  "historial": [{ "id": 1, "accion": "enviada", "comentario": null, "actor": "Jesús Pérez", "created_at": "..." }]
}
```
Y agregar `GET /api/v1/solicitudes/{solicitud}/documentos-generados/{documento}/descargar` (mismo patrón, sobre `GeneratedDocument`/`PlantillaStorageService`) para que la app pueda mostrar constancias/formatos que RH genere para esa solicitud (`App\Models\GeneratedDocument` ya tiene `solicitud_id`).

La app ya consume `documentos`/`documentos_generados`/`historial` como
campos opcionales (`src/types/request.ts`) — si no vienen, simplemente no
se muestran esas secciones, así que este cambio se puede desplegar sin
romper nada aunque se haga después que el resto.

## P0.6 — Notificaciones de solicitudes/vacaciones/documentos (in-app y push)

**Hallazgo crítico:** se revisó `app/Notifications/*` completo — hoy
**ningún evento de solicitud, vacaciones o documento genera notificación**,
ni siquiera la in-app que ya consume la app (`GET /api/v1/notificaciones`).
Solo existen notificaciones de capacitación (`ActividadCalificadaNotification`,
etc.).

- **Qué agregar:** clases `Illuminate\Notifications\Notification` nuevas —
  `SolicitudInternaCreadaNotification`, `SolicitudInternaAprobadaNotification`,
  `SolicitudInternaRechazadaNotification`, `SolicitudInternaRequiereCorreccionNotification`,
  `SolicitudVacacionesCreadaNotification`, `SolicitudVacacionesAprobadaNotification`,
  `SolicitudVacacionesRechazadaNotification`, `DocumentoAprobadoNotification`,
  `DocumentoRechazadoNotification`, `DocumentoRequiereCorreccionNotification`,
  `ExpedienteCompletoNotification` — mismo patrón que las existentes
  (método `data()` con `tipo`, `titulo`, `mensaje`, y ahora también
  **`recurso_id`**, ver más abajo).
- **Dónde dispararlas:** en los mismos puntos donde ya cambia el estado —
  `SolicitudesService::cambiarEstado()` (aprobar/rechazar/requerirCorreccion),
  el equivalente en `VacacionesService`, y
  `Rh\EmployeeDocumentController::aprobar/rechazar/solicitarCorreccion()`.
  **No crear lógica de negocio nueva**, solo `$colaborador->notify(new ...)`.
- **Contrato de `data()` — cambio de forma respecto a las notificaciones actuales:**
  las notificaciones existentes solo mandan `url` (siempre una ruta web
  absoluta, `route('mi-capacitacion.index')`, confirmado en el código —
  inútil para navegación nativa). Las nuevas deben mandar además:
  ```json
  { "tipo": "solicitud", "recurso_id": 42, "titulo": "Solicitud aprobada", "mensaje": "Tu solicitud de permiso fue aprobada.", "url": "https://people.mr-lana.com/solicitudes/42" }
  ```
  `tipo` ∈ `solicitud | vacaciones | documento | expediente`, `recurso_id`
  es el id del recurso relacionado. La app ya sabe navegar con este
  contrato exacto (`src/hooks/useNotificationResponseRouting.ts` y el tap
  de notificaciones in-app en `src/app/(app)/notificaciones.tsx`) — `url`
  puede seguir mandándose para la web, la app simplemente la ignora.
- **Push real:** además de `$colaborador->notify(...)`, un
  `PushNotificationService` nuevo que lea los tokens del colaborador (ver
  P0.7) y llame a `https://exp.host/--/api/v2/push/send` (o el paquete
  `alymosul/expo-server-sdk` para PHP) con el mismo `title`/`body`/`data`.
  Puede ir como un Listener del mismo evento de notificación
  (`NotificationSent`) para no acoplar lógica de push dentro de cada
  Service.

## P0.7 — Push tokens por dispositivo

**Hallazgo:** no existe absolutamente nada — se buscó `push_token`,
`fcm_token`, `device_token`, `ExpoPushToken` en todo `app/` y
`database/migrations` sin resultados.

- **Rutas:**
  ```
  POST   /api/v1/dispositivos/push-token
  DELETE /api/v1/dispositivos/push-token
  ```
- **Request POST:** `{ "token": "ExponentPushToken[...]", "platform": "android", "device_name": "Samsung SM-A125M" }` (`platform` ∈ `ios | android`).
- **Request DELETE:** `{ "token": "ExponentPushToken[...]" }`.
- **Response:** `204` o `{ "estado": "ok" }` en ambos casos.
- **Migración nueva** — tabla `device_push_tokens`:
  ```php
  Schema::create('device_push_tokens', function (Blueprint $table) {
      $table->id();
      $table->foreignId('user_id')->constrained()->cascadeOnDelete();
      $table->string('token')->unique();
      $table->string('platform', 20);
      $table->string('device_name')->nullable();
      $table->timestamps();
  });
  ```
  Un mismo `token` debe poder reasignarse de usuario (logout de A + login de
  B en el mismo dispositivo): usar `updateOrCreate(['token' => ...], [...])`
  en vez de `create()`.
- **Service nuevo:** `App\Services\Dispositivos\PushTokenService` (o
  similar) con `registrar(User $user, array $datos)` y
  `revocar(string $token)`.
- **Policy:** solo `auth:sanctum` — es "mi propio dispositivo", sin permiso
  adicional (igual que el resto de `colaborador/*`).
- **Storage:** ninguno (solo base de datos).

## P1.1 — Regla de negocio: aprobación multi-nivel para Corporativo MR. LANA

**No implementado en el cliente a propósito.** La app ya está preparada
para recibir un array `approval_steps` estructurado
(`src/types/incorporation.ts`, `src/components/ApprovalTimeline.tsx`):
```json
[
  { "key": "rh", "label": "Recursos Humanos", "status": "approved" },
  { "key": "manager", "label": "Gerente", "status": "approved" },
  { "key": "commercial_director", "label": "Director Comercial", "status": "pending" }
]
```
`status` ∈ `pending | in_review | approved | rejected`. Mientras el backend
no lo calcule, la app deriva una aproximación de 3 pasos genéricos
únicamente a partir de `AltaDigital.estado`
(`src/utils/incorporation.ts`, función `deriveApprovalStepsFromEstado`) —
es una aproximación honesta, no la regla de negocio real.

**Por qué sigue pendiente:** se confirmó que **no existe ninguna cadena de
aprobación en el backend** — `AltaDigitalPolicy` solo tiene `revisar`/
`aprobar` de un solo paso, y la migración `altas_digitales` no tiene
columnas de gerente/director comercial (`revisado_por`/`aprobado_por`
únicos). `gerente`, `gerente_sucursal` y `director_comercial` existen como
roles con alcance de **visibilidad de reportes**
(`app/Services/AlcanceOrganizacionalService.php`), no como pasos de una
máquina de estados de aprobación.

**Antes de construir esto** hace falta una decisión de producto: ¿la regla
aplica sobre `SolicitudInterna`, sobre `AltaDigital`, o sobre ambas? ¿cómo
se identifica "Corporativo MR. LANA" (`empresa_id` fijo, un flag)? ¿el
Director Comercial aprueba una vez por colaborador o por cada solicitud?
Documentado a propósito sin implementar.

## P1.2 — `GET /api/v1/colaborador/incorporacion`

Alimenta `src/app/(app)/incorporacion.tsx`.

- **Request:** ninguno.
- **Response:**
  ```json
  {
    "checklist": [
      { "clave": "datos_personales", "etiqueta": "Datos personales capturados", "completado": true },
      { "clave": "documentos_aprobados", "etiqueta": "Documentos aprobados", "completado": false }
    ],
    "porcentaje": 72.7,
    "alta_digital": {
      "id": 12, "estado": "en_revision_rh", "estado_etiqueta": "En revisión de RH",
      "enviada_en": "2026-07-01T10:00:00Z", "revisado_en": null, "aprobado_en": null, "motivo_rechazo": null
    },
    "approval_steps": null
  }
  ```
  (los 11 ítems exactos de `checklist` están fijos en el código — ver más abajo, la app no debe asumir el catálogo).
- **Service a reutilizar:** `App\Services\Onboarding\OnboardingService::checklist()` + `porcentaje()` — **ya calculan exactamente esto**, hoy solo se usan dentro de `Rh\ExpedienteController::renderExpediente()` para la vista web. `alta_digital` es `AltaDigital::where('user_id', $colaborador->id)->first()`, igual que ya hace ese mismo controlador.
- **Confirmar antes de implementar:** que `AltaDigital.user_id` se mantiene consistente para todas las conversiones de candidato → colaborador (`ConversionColaboradorService`), incluidas altas antiguas — si algún colaborador activo no tiene `user_id` ligado, `alta_digital` debe regresar `null` sin error.
- **Policy:** solo `auth:sanctum`, es sobre uno mismo.
- **`approval_steps`:** depende de P1.1 — puede regresar `null` indefinidamente sin romper la app.

## P2 — Mejora

- **`POST /api/v1/notificaciones/leer-todas`** — el Service ya tiene `NotificacionesService::marcarTodasLeidas()`, solo falta exponerlo.
- **`GET /api/v1/solicitudes/tipos`** — `SolicitudesService::tiposDisponibles()` ya arma `[{value, label}]`; hoy la app usa un catálogo local (`REQUEST_TYPE_OPTIONS` en `src/app/(app)/solicitud/nueva.tsx`) verificado manualmente contra `TipoSolicitudInterna` — no es urgente, pero exponerlo evitaría tener que sincronizar manualmente si el catálogo cambia.
- **Rate limiting específico de la API móvil** — ya anotado como pendiente en `docs/API_MOVIL.md` del propio backend.

## Nota sobre `usesCleartextTraffic`

`expo-doctor` reporta que `android.usesCleartextTraffic` en `app.json` ya no
es reconocido por el schema de configuración de esta versión de Expo. Es
preexistente (no se tocó en esta iteración) y probablemente ligado a
pruebas locales contra IPs `http://` en la misma red — no se modificó sin
confirmar con el equipo si sigue siendo necesario.
