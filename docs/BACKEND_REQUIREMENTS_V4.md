# Requisitos de backend — MR. LANA PEOPLE Mobile V4

Este documento lista TODO lo que falta implementar en `capacitaciones`
(Laravel, `https://people.mr-lana.com/api/v1`) para que las funciones que la
app móvil ya tiene listas del lado cliente queden completamente activas.
**Nada de esto se implementó en `capacitaciones` desde esta app** — solo se
audita y documenta, tal como se pidió.

Verificado en vivo contra producción el 2026-09-09 con el usuario de prueba
`colaborador1@mrlana.test` (login → GET a los endpoints existentes → logout,
sin escribir ni subir nada): todos los endpoints ya documentados en
`docs/API_MOVIL.md` de capacitaciones responden 200 y con el shape esperado.
Los dos endpoints marcados abajo como pendientes (`/dispositivos/push-token`,
`/notificaciones/leer-todas`) responden 404, confirmando que siguen sin
existir.

---

## P0.1 — Registro de push token

**FUNCIÓN:** Alta/baja del Expo Push Token del dispositivo actual.

**ENDPOINT:** `POST /api/v1/dispositivos/push-token`

**AUTENTICACIÓN:** `auth:sanctum` (el usuario sale de `$request->user()`, la
app NUNCA manda `user_id`).

**REQUEST:**
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "android",
  "device_name": "SM-A546E",
  "app_version": "1.0.0"
}
```
Validación sugerida: `token` requerido string, `platform` requerido `in:ios,android,web`, `device_name`/`app_version` opcionales string.

**RESPONSE (200/201):**
```json
{ "message": "Token registrado." }
```

**ERRORES:**
- `401` sin token Sanctum válido.
- `422` si falta `token` o `platform` no es válido.

**MODELOS/CAMPOS NECESARIOS:**
Tabla nueva `device_push_tokens`:
```
id, user_id (FK users), token (string, unique), platform (string), device_name (string, nullable), app_version (string, nullable), last_used_at (timestamp), created_at, updated_at
```
Un mismo `token` puede re-registrarse (`updateOrCreate` por `token`, actualizando `user_id`/`last_used_at`) — un colaborador puede reinstalar la app o cambiar de cuenta en el mismo dispositivo.

**EVENTOS QUE LO DISPARAN:** Ninguno — es la app llamando directo tras el
permiso del sistema (`registerCurrentPushToken()` en
`src/services/pushNotifications.ts`).

**QUÉ ESPERA LA APP:** 200/201 con cualquier body — `src/api/dispositivos.ts`
ya está listo, solo espera que la ruta exista. Mientras no exista, la app
sigue funcionando normal (falla en silencio, sin romper login/uso).

**EJEMPLO CURL:**
```bash
curl -X POST https://people.mr-lana.com/api/v1/dispositivos/push-token \
  -H "Authorization: Bearer <TOKEN_SANCTUM>" \
  -H "Content-Type: application/json" \
  -d '{"token":"ExponentPushToken[xxxx]","platform":"android","device_name":"SM-A546E","app_version":"1.0.0"}'
```

---

## P0.2 — Revocar push token (logout)

**ENDPOINT:** `DELETE /api/v1/dispositivos/push-token`

**AUTENTICACIÓN:** `auth:sanctum`

**REQUEST:**
```json
{ "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" }
```

**RESPONSE (200):** `{ "message": "Token revocado." }` — o `204` sin body.

**ERRORES:** `401`; `422` si falta `token`. Nunca debe fallar si el token ya
no existe (idempotente: borrar 0 filas también es éxito).

**QUÉ ESPERA LA APP:** `revokeCurrentPushToken()` en
`src/services/pushNotifications.ts` la llama en cada logout (best-effort:
si falla, el logout local continúa igual — nunca deja al usuario atrapado).

**EJEMPLO CURL:**
```bash
curl -X DELETE https://people.mr-lana.com/api/v1/dispositivos/push-token \
  -H "Authorization: Bearer <TOKEN_SANCTUM>" \
  -H "Content-Type: application/json" \
  -d '{"token":"ExponentPushToken[xxxx]"}'
```

---

## P0.3 — Envío real de push (Service + eventos de negocio)

**FUNCIÓN:** Cuando ocurre un evento de negocio relevante, encolar un push a
todos los `device_push_tokens` del colaborador dueño del recurso, vía la
[Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/#formats).

**PAYLOAD que la app espera recibir** (esto es lo que Laravel debe mandar a
`https://exp.host/--/api/v2/push/send`, un objeto por token):
```json
{
  "to": "ExponentPushToken[xxxx]",
  "title": "Tu solicitud fue aprobada",
  "body": "RH aprobó tu permiso con goce de sueldo.",
  "sound": "default",
  "data": {
    "type": "solicitud",
    "resource_id": 123
  }
}
```
`data.type`/`data.resource_id` son el contrato exacto que ya resuelve
`src/utils/appLinks.ts` (`resolveResourceRoute`) para navegar al tocar el
push. Valores de `type` soportados hoy: `solicitud`, `documento`,
`vacaciones`, `incorporacion`, `perfil`. `resource_id` es el id que la app
ya usa en su propia ruta (`solicitud_interna.id`, `document_type.id`, no el
id interno de `employee_documents`).

**EVENTOS QUE DEBEN DISPARAR PUSH** (además de la notificación in-app que
ya existe hoy vía `notifications` de Laravel — el push es un aviso extra,
NO reemplaza `GET /notificaciones`, ver P1.2 abajo):

| Recurso | Evento | `type` | `resource_id` |
|---|---|---|---|
| Solicitud interna | creada/recibida | `solicitud` | `solicitud_interna.id` |
| Solicitud interna | en revisión | `solicitud` | `solicitud_interna.id` |
| Solicitud interna | aprobada | `solicitud` | `solicitud_interna.id` |
| Solicitud interna | rechazada | `solicitud` | `solicitud_interna.id` |
| Solicitud interna | requiere corrección | `solicitud` | `solicitud_interna.id` |
| Solicitud interna | cancelada | `solicitud` | `solicitud_interna.id` |
| Vacaciones | solicitud recibida | `vacaciones` | — |
| Vacaciones | aprobada | `vacaciones` | — |
| Vacaciones | rechazada | `vacaciones` | — |
| Documento (`employee_documents`) | recibido/en revisión | `documento` | `document_type.id` |
| Documento | aprobado | `documento` | `document_type.id` |
| Documento | rechazado/requiere corrección | `documento` | `document_type.id` |
| Incorporación | expediente completado | `incorporacion` | — |
| Incorporación | aprobada por RH | `incorporacion` | — |
| Incorporación | rechazada por RH | `incorporacion` | — |

Estos son exactamente los mismos puntos donde hoy ya se crea una
`DatabaseNotification` (`App\Notifications\*`, confirmado en
`NotificacionesService`) — el push debería dispararse desde el mismo sitio,
como canal adicional de la misma notificación (`via(): ['database',
'expo-push']` si se implementa como un canal de notificación de Laravel, o
un listener del mismo evento).

**MODELOS/CAMPOS NECESARIOS:** la tabla `device_push_tokens` de P0.1.

**QUEUES:** Enviar el push debe ir en un Job encolado (`ShouldQueue`), nunca
síncrono dentro del request que aprueba/rechaza — un fallo de red hacia Expo
no debe tumbar la acción de RH.

**TOKENS INVÁLIDOS:** La respuesta de Expo Push API por cada ticket incluye
`{"status":"error","details":{"error":"DeviceNotRegistered"}}` cuando el
token ya no sirve (app desinstalada, etc.) — al recibir ese error, borrar
la fila de `device_push_tokens` correspondiente (revisar el [receipt
endpoint de Expo](https://docs.expo.dev/push-notifications/sending-notifications/#getting-receipts) unas horas después de enviar).

**QUÉ ESPERA LA APP:** Nada nuevo del lado HTTP — ya sabe recibir el push en
foreground (toast con acción "Ver") y en background/tap (navega vía
`resolveResourceRoute`), ver `src/hooks/useNotificationResponseRouting.ts`.

---

## P1.1 — Foto de perfil autenticable

**FUNCIÓN:** Que `colaborador/perfil.foto_url` funcione desde un cliente
100% nativo (sin cookies de sesión web).

**Confirmado en vivo (2026-09-09):** `GET /colaborador/perfil` día de hoy
NO trae ningún campo `foto_url_api` — solo `foto_url`, que sigue apuntando
a `rh.expedientes.foto` (ruta protegida por sesión web, no por Bearer
token). Esto es exactamente lo que ya documenta
`docs/API_MOVIL.md` de capacitaciones en su sección "Pendiente".

**Dos alternativas — recomendación: opción A.**

### Opción A (recomendada): endpoint dedicado con Bearer

**ENDPOINT:** `GET /api/v1/colaborador/foto`

**AUTENTICACIÓN:** `auth:sanctum`

**RESPONSE (200):** el binario de la imagen con
`Content-Type: image/jpeg` (o `image/png` según `foto_path`), streameado
igual que ya hace `Rh\ExpedienteController::descargarFoto` /
`DocumentoStorageService::respuesta()` — reutilizar esa misma lógica, solo
cambiando la policy de "puede ver expediente de X" a "es su propia foto".

**ERRORES:** `404` si `foto_path` es null.

**Por qué esta opción:** reutiliza exactamente el mismo mecanismo de
streaming que ya existe para documentos de expediente
(`DocumentoStorageService::respuesta`, nunca expone `disk`/`path` al
cliente) — cero lógica nueva de storage, solo una ruta + policy nuevas.
También evita el costo de generar/rotar URLs firmadas.

### Opción B (alterna): URL firmada de corta duración

Agregar a `colaborador/perfil` un campo `foto_url_api` con
`URL::temporarySignedRoute('colaborador.foto.firmada', now()->addMinutes(15), ['user' => $colaborador->id])`
(mismo patrón que ya usa la biblioteca multimedia, según
`docs/API_MOVIL.md`). Ventaja: no requiere mandar `Authorization` header en
el `<Image>` de React Native (algunos casos de caché de imagen nativa no
reenvían headers custom en todos los redirects). Desventaja: hay que
regenerar la URL cada vez que expira (cada `GET /colaborador/perfil`).

**QUÉ ESPERA LA APP:** `src/components/Avatar.tsx` ya sabe mandar
`Authorization: Bearer <token>` como header de imagen (`<Image source={{
uri, headers }}>`) — funciona con la opción A tal cual. Si se implementa la
opción B, `foto_url_api` no necesita headers y el componente también la
soporta (usa `foto_url_api` primero, sin headers si no hacen falta).
`src/types/collaborator.ts` ya tiene el campo `foto_url_api?: string | null`
tipado, solo espera que el backend lo mande.

---

## P1.2 — Marcar todas las notificaciones como leídas

**ENDPOINT:** `POST /api/v1/notificaciones/leer-todas`

**AUTENTICACIÓN:** `auth:sanctum`

**REQUEST:** sin body.

**RESPONSE (200):** `{ "message": "ok" }`

**ERRORES:** `401`.

**MODELOS/CAMPOS NECESARIOS:** ninguno nuevo — reutiliza
`NotificacionesService::marcarTodasLeidas()` (ya existe, confirmado en el
código: `$usuario->unreadNotifications->markAsRead()`), solo falta
exponerla en una ruta de la API v1 (el método web-only hoy no tiene
contraparte API).

**QUÉ ESPERA LA APP:** `notificacionesApi.markAllAsRead()` en
`src/api/notificaciones.ts` ya llama esta ruta; el botón "Marcar todas" en
`src/app/(app)/notificaciones.tsx` ya existe y hoy recibe 404 (confirmado
en vivo) — en cuanto la ruta exista, funciona sin tocar la app.

---

## P1.3 — Adjuntos de solicitudes internas

**FUNCIÓN:** Adjuntar un archivo (ej. incapacidad médica) a una solicitud
interna ya creada.

**ENDPOINT:** `POST /api/v1/solicitudes/{solicitud}/adjuntos`

**AUTENTICACIÓN:** `auth:sanctum` — el colaborador solo puede adjuntar a
SUS PROPIAS solicitudes (mismo criterio que ya aplica
`SolicitudInterna::show`/`index`, filtrado por `user_id`).

**REQUEST:** `multipart/form-data`, campo `archivo` (pdf/jpg/jpeg/png,
mismo límite que expedientes — `config('expedientes.max_upload_mb')`, hoy
20 MB — reutilizar la misma validación).

**RESPONSE (201):**
```json
{
  "data": {
    "id": 1,
    "nombre": "incapacidad.pdf",
    "mime": "application/pdf",
    "size": 245678
  }
}
```

**ERRORES:**
- `403` si la solicitud no pertenece al usuario autenticado.
- `404` si `{solicitud}` no existe.
- `422` si falta `archivo`, excede el tamaño o tiene un mime no permitido.

**MODELOS/CAMPOS NECESARIOS:** tabla `solicitud_interna_adjuntos` (o
reutilizar `SolicitudInternaDocumento` si ya existe en el modelo de datos —
`src/types/request.ts` tenía referencias a este modelo en una iteración
anterior, confirmar en el schema real):
```
id, solicitud_interna_id (FK), path, original_name, mime, size, subido_por (FK users), created_at
```
Guardar en el mismo disco `nas` que usa `DocumentoStorageService` — nunca
exponer `path` al cliente (igual que `EmployeeDocument`).

**PRIORIZACIÓN POR TIPO:** el caso de uso más claro es `incapacidad`
(comprobante médico). Para el resto de tipos de solicitud, depende de si
RH quiere pedir evidencia — ver P2.1 (config dinámica) para decidirlo sin
hardcodear reglas en dos lugares.

**QUÉ ESPERA LA APP:** `solicitudesApi.addAttachment()` en
`src/api/solicitudes.ts` ya está implementado y listo (multipart + progreso
de subida) — hoy nada lo llama en la UI porque el wizard de Nueva Solicitud
no tiene paso de adjuntos (no se fabricó esa pantalla sin backend real). En
cuanto este endpoint exista, agregar el paso al wizard es solo conectar
este método ya existente.

---

## P2.1 — Configuración dinámica de tipos de solicitud

**FUNCIÓN:** Evitar mantener el catálogo de tipos de solicitud (etiquetas,
si usa rango de fechas, si admite adjuntos) hardcodeado tanto en Laravel
como en la app.

**ENDPOINT:** `GET /api/v1/solicitudes/configuracion`

**AUTENTICACIÓN:** `auth:sanctum`

**RESPONSE (200):**
```json
{
  "data": [
    {
      "tipo": "incapacidad",
      "label": "Incapacidad",
      "requires_dates": true,
      "allows_attachments": true,
      "attachment_required": true
    },
    {
      "tipo": "permiso_con_goce",
      "label": "Permiso con goce",
      "requires_dates": true,
      "allows_attachments": false
    }
  ]
}
```
Debe derivarse de `App\Enums\TipoSolicitudInterna` (ya tiene
`etiqueta()`/`usaRangoFechas()`) + la config de adjuntos de P1.3 — un solo
lugar de verdad en Laravel en vez de que la app adivine.

**QUÉ ESPERA LA APP:** `solicitudesApi.getConfiguracion()` en
`src/api/solicitudes.ts` ya está listo. Mientras no exista, el wizard de
`src/app/(app)/solicitud/nueva.tsx` sigue usando su catálogo local
`REQUEST_TYPE_OPTIONS` (ya confirmado contra `TipoSolicitudInterna` real,
no inventado) — sigue siendo 100% funcional, solo no es dinámico.

---

## P2.2 — Paginación real de notificaciones

**Confirmado en vivo (2026-09-09):** `GET /notificaciones` no trae `meta` —
`NotificacionesService::listar()` tiene un límite fijo de 30
(`->limit($limite)`), sin cursor/página real. Un colaborador con más de 30
notificaciones históricas nunca puede ver las más viejas desde la app.

**Cambio sugerido:** que `GET /notificaciones` acepte `?page=` y devuelva
el mismo shape `{ data: [...], meta: { current_page, last_page, total } }`
que ya usa `GET /solicitudes` (confirmado en vivo, ver arriba) — mismo
patrón, no uno nuevo.

**QUÉ ESPERA LA APP:** hoy `src/hooks/queries/useNotificaciones.ts` pide
todo de una vez (`notificacionesApi.getAll()`); si se agrega `meta`, se
puede migrar a `useInfiniteQuery` con el mismo patrón que ya se aplicó a
solicitudes en `useSolicitudesInfinite()` (ver
`src/hooks/queries/useSolicitudes.ts`) — la migración es mecánica.

---

## Resumen de prioridades

| # | Función | Prioridad | Bloquea |
|---|---|---|---|
| P0.1 | Registrar push token | P0 | Push completo |
| P0.2 | Revocar push token | P0 | Push completo (logout limpio) |
| P0.3 | Enviar push en eventos de negocio | P0 | Push completo |
| P1.1 | Foto de perfil con Bearer | P1 | Foto real en Dashboard/Perfil/LockScreen |
| P1.2 | Marcar todas las notificaciones leídas | P1 | Botón ya visible en la app |
| P1.3 | Adjuntos de solicitudes | P1 | Adjuntar incapacidad médica, etc. |
| P2.1 | Config dinámica de tipos de solicitud | P2 | Solo evita duplicar catálogo |
| P2.2 | Paginación de notificaciones | P2 | Colaboradores con >30 notificaciones históricas |

Ninguno de estos pendientes rompe la app hoy: cada uno fue construido con
manejo de 404/error explícito (ver `src/api/dispositivos.ts`,
`src/api/notificaciones.ts`, `src/api/solicitudes.ts`) — activar cada
endpoint en Laravel activa la función correspondiente en la app sin tocar
código móvil de nuevo.
