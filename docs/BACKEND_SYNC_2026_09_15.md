# Sincronización móvil ↔ backend — 2026-09-15

Auditoría completa de `mr-lana-people-app` contra `JesusA2004/capacitaciones@main`
(commit `6e5a912`), hecha leyendo **`routes/api.php`, los controladores, los
Resources, los Services, las Policies y los Enums reales** — no la
documentación. Cuando `docs/` y el código se contradicen, **gana el código**;
varias frases de `README.md`/`docs/` del backend describen un estado anterior.

Esta nota **sustituye** a `BACKEND_GAPS_FINAL.md` y a
`BACKEND_REQUIREMENTS_V4.md` como fuente de verdad de contratos. Esos dos
quedan como historia: contienen contratos que nunca existieron en este
backend (`requires_dates`, `allows_attachments`, `attachment_required`,
`prestamo_interno`, `general`).

---

## A. Disponible y consumido desde móvil

| Módulo | Endpoint real | Estado en la app |
|---|---|---|
| Solicitudes unificadas | `GET/POST /solicitudes`, `GET /solicitudes/{id}` | ✅ Centro de la app |
| Catálogo de tipos | `GET /solicitudes/configuracion` | ✅ Wizard 100 % dinámico |
| Cancelar solicitud | `POST /solicitudes/{id}/cancelar` | ✅ **Nuevo** |
| Adjuntos | `POST /solicitudes/{id}/adjuntos` | ✅ Contrato corregido |
| Vacaciones (saldo) | `GET /vacaciones/saldo` | ⚠️ Única lectura legacy viva |
| Notificaciones | `GET /notificaciones`, `POST .../leer`, `.../leer-todas` | ✅ `emoji`/`color`/`data` |
| Bootstrap | `GET /mobile/bootstrap` | ✅ Permisos/capabilities/counts |
| RH · bandeja | `GET /rh/pendientes`, `GET /rh/dashboard` | ✅ |
| RH · solicitudes | `GET /rh/solicitudes[/{id}]`, `POST .../aprobar\|rechazar\|correccion` | ✅ |
| RH · estado unificado | `PATCH /rh/solicitudes/{id}/estado` | ✅ **Nuevo** (solo `en_revision` y `cerrada`) |
| RH · vacantes | `GET /rh/vacantes` | ✅ **Nuevo**, solo lectura |
| RH · colaboradores | `GET /rh/colaboradores[?q=]` | ✅ (+ selector de baja) |
| RH · documentos + OCR | `GET/POST /rh/documentos/...` | ✅ Ya estaba correcto |
| RH · expedientes / incorporaciones / cumpleaños / organigrama / formatos | varios | ✅ Sin cambios |
| App config / releases | `GET /app/config`, `GET /app/releases/latest` | ✅ Contrato iOS corregido |

## B. Bugs de contrato corregidos en esta sincronización

### B-1 · `GET /solicitudes/configuracion` devuelve `tipos`, no `data`

`Api\V1\SolicitudController::configuracion()` responde
`{"tipos": [...]}`. La app la pasaba por `extractData()`, que al no
encontrar `data` **devolvía el objeto completo**; el wizard terminaba con un
catálogo vacío y caía siempre al respaldo local.

Corregido en `src/utils/solicitudesConfig.ts`
(`normalizeSolicitudesConfiguracion`), que lee `tipos` y acepta `data` /
arreglo pelón solo como red de seguridad.

### B-2 · `POST /solicitudes/{id}/adjuntos` no devuelve un adjunto

Responde `201 {"message": "Adjunto agregado correctamente."}` — sin `id`, sin
nombre, sin nada. La app hacía `extractData<SolicitudAttachment>()` y se
quedaba con el objeto del mensaje creyendo que era un adjunto.

Ahora `addAttachment()` devuelve `SolicitudAdjuntoRespuesta` (`{message?}`) y
quien sube refresca el detalle. El tipo `SolicitudAttachment` desapareció.

### B-3 · Contrato de tipo inventado

La app usaba `requires_dates` / `allows_attachments` /
`attachment_required`. El backend **nunca** mandó esas claves: usa
`requiere_fechas`, `requiere_horario`, `requiere_dias`, `requiere_monto`,
`requiere_colaborador_objetivo`, `requiere_motivo`, `permite_adjuntos` y
`campos[]`. Con el contrato viejo, `allowsAttachments` era siempre `false`:
**el paso de adjuntos del wizard nunca aparecía.**

### B-4 · Claves de tipo equivocadas

`TipoSolicitudInterna::PrestamoInterno` vale `'prestamo'`, no
`'prestamo_interno'`; `General` vale `'solicitud_general'`, no `'general'`.
La app ofrecía ambas claves inexistentes: enviarlas era un 422 seguro, y al
listar, esas solicitudes se mostraban con el slug crudo. Además faltaban 8
tipos del enum (vacaciones, los tres por horas, la baja y los tres permisos
especiales).

### B-5 · `download_url` puede ser `null` (iOS)

`AppReleaseController::paraApi` solo llena `download_url` si el release tiene
archivo — en iOS llega `null`, y la salida real es `install_url`/`store_url`.
La app la tipaba `string`, así que en iOS `ForceUpdateScreen` podía decidir
bloquear sin tener a dónde mandar al usuario. Nuevo
`resolveReleaseUrl()` (`download_url` → `install_url` → `store_url` → `null`).

### B-6 · Un 422 de baja se leía como conflicto de concurrencia

`isConcurrencyConflict()` trata **todo** 422 como "esto ya fue atendido". Los
422 dirigidos de una baja (falta evidencia / falta finiquito) traen la
instrucción exacta y quedaban ocultos tras un mensaje genérico. Ahora
`blockedApprovalReason()` los detecta **antes** y muestra el texto del
backend tal cual.

## C. Legacy — endpoints que la app ya NO usa para crear nada

| Endpoint | Qué pasó |
|---|---|
| `POST /vacaciones/solicitudes` | ❌ Eliminado del cliente. Toda vacación nueva va por `POST /solicitudes` con `tipo: "vacaciones"`. |
| `GET /vacaciones/solicitudes` | ❌ Eliminado. "Mis vacaciones" filtra `GET /solicitudes` por `tipo`. |
| `GET /vacaciones/saldo` | ⚠️ **Se conserva**, solo lectura — ver excepción abajo. |
| `GET/POST /rh/vacaciones/*` | ⚠️ Cliente marcado `@deprecated`, **fuera de la navegación nueva**. |

### Excepción documentada: el saldo

El saldo de vacaciones **no existe todavía dentro del módulo unificado**, y
`VacacionesService::saldo()` ya suma los días de **ambos** caminos (la tabla
legacy `solicitudes_vacaciones` **y** `solicitudes_internas` con
`tipo=vacaciones`). Es decir: la cifra es correcta aunque la app cree todo
por el módulo nuevo, y es lectura pura — nunca escribe.

Por eso `src/api/vacaciones.ts` sobrevive con **un solo método**, `getSaldo()`,
y una nota `@deprecated` que lo dice explícitamente. Un test de contrato
(`Object.keys(vacacionesApi)` === `['getSaldo']`) impide que alguien vuelva a
agregarle un `createSolicitud`.

### Por qué `rh/vacaciones` no se borró

`RhPendientesService::vacaciones()` **sigue devolviendo** pendientes con
`tipo: "vacaciones"` mientras existan registros legacy sin cerrar. Si RH toca
uno de esos en la bandeja, la ruta `rh/vacaciones/[id]` tiene que existir. No
se enlaza desde ninguna pantalla nueva y `RhDashboardScreen` ya no le da un
mosaico propio: aparece como una tarjeta aparte, "N vacaciones anteriores por
cerrar", que aclara que las nuevas llegan dentro de Solicitudes.

## D. Gaps reales del backend (la app los rodea, no los inventa)

### D-1 · `SolicitudInternaResource` no serializa adjuntos ni historial

`SolicitudController::show()` hace `->load(['documentos', 'historial'])`, pero
el Resource solo emite 13 campos planos: ese `load` **no llega al JSON**.

*Efecto:* el colaborador no puede ver los archivos que él mismo adjuntó ni la
bitácora de su solicitud. La app **no los pinta** — mostrar "Adjunto enviado"
sin evidencia real sería inventar.

*Qué haría falta:* agregar `documentos` e `historial` al Resource (RH ya los
recibe en `Rh\SolicitudController::show()`).

### D-2 · `tiposConFormulario()` no emite `fecha_efectiva` ni `tipo_baja`

Para `baja_colaborador`, `campos[]` solo trae `colaborador_objetivo_id`, pero
`StoreSolicitudInternaRequest` exige **además** `fecha_efectiva` y `tipo_baja`
(ambos `required` vía `requiereColaboradorObjetivo()`). Construir el
formulario solo desde `campos[]` daría un 422 garantizado.

*Solución temporal:* `normalizeSolicitudesConfiguracion()` los completa, y
deja de hacerlo solo en cuanto el backend los mande (test incluido).

*Qué haría falta:* emitirlos en `tiposConFormulario()`.

### D-3 · No hay endpoint que exponga el catálogo `TipoBaja`

`tipo_baja` se valida con `Rule::in(TipoBaja::cases())`, pero ningún endpoint
publica esos 6 valores. `TIPO_BAJA_OPTIONS` los espeja **leídos del enum
fuente**, no adivinados — pero es una copia que hay que revisar en cada
sincronización, porque un valor de más aquí es un 422 en producción.

*Qué haría falta:* incluir las opciones dentro del propio campo en
`campos[]` (p. ej. `{"name":"tipo_baja","type":"select","options":[...]}`).
Eso resolvería D-2 y D-3 de una vez y serviría para cualquier `select`
futuro.

### D-4 · El saldo de vacaciones vive fuera del módulo unificado

Ver la excepción en la sección C. Mientras no exista
`GET /solicitudes/saldo-vacaciones` (o equivalente), la app tiene que tocar
un endpoint legacy para una pantalla nueva.

### D-5 · `acciones_permitidas` no cubre el flujo completo

`WorkflowService::paraSolicitud()` solo emite `ver`, `aprobar`, `rechazar` y
`solicitar_correccion`. No emite `marcar_en_revision` ni `cerrar`, aunque
`PATCH .../estado` sí acepte esos destinos, y **no emite nada para el
colaborador** (el Resource propio ni siquiera lleva el campo).

*Cómo lo rodea la app:*
- Colaborador: `canCancelSolicitud()` replica
  `EstadoSolicitudInterna::puedeCancelarse()` **y prefiere
  `acciones_permitidas` en cuanto exista** — el día que el backend lo mande,
  gana sin tocar código.
- RH: "Marcar en revisión" y "Cerrar" replican exactamente el `match`
  estado→habilidad de `Rh\SolicitudController::actualizarEstado()` más el
  permiso Spatie. Nunca es un movimiento libre de tablero.

*Qué haría falta:* agregar esas acciones a `WorkflowService` y un
`acciones_permitidas` al Resource del colaborador.

### D-6 · Sin campo de hora para los permisos por horas

`permiso_tiempo`, `salida_temprano` y `llegada_tarde` declaran
`requiere_horario: true`, pero `campos[]` solo trae `fecha_inicio`: no hay
`hora_inicio`/`hora_fin` ni el FormRequest los acepta.

*Decisión:* la app **no inventa** campos que la API rechazaría. Muestra un
aviso pidiendo el horario dentro del motivo. Si el backend agrega los campos,
el wizard los dibuja solo (son `type: "text"`/`"date"` dinámicos).

### D-7 · Sin `features` para los módulos nuevos

`MobileBootstrapService::features()` manda 8 claves y no incluye `formatos`,
`documentos_laborales`, `document_extraction`, `organigrama` ni `vacantes`.
La app resuelve así, sin inventar flags:
- `formatos` / `documentos_laborales` / `document_extraction`: **fail-closed**
  (ausente = oculto).
- `organigrama`: permiso `puestos.administrar`.
- `vacantes`: permiso `vacantes.ver` — el mismo que protege el endpoint.

### D-8 · No existe API de documentos laborales

No hay ninguna ruta `/colaborador/documentos-laborales` en `routes/api.php`.
El módulo sigue **oculto fail-closed**: mostrarlo sería una pantalla rota.

## E. Contratos exactos (referencia rápida)

Las fixtures vivas están en `src/test/fixtures/backend.ts` — copias literales,
cada una citando la clase PHP que la produce. Si un contrato cambia, ese
archivo es lo primero que hay que actualizar.

```jsonc
// GET /solicitudes/configuracion
{ "tipos": [ {
  "clave": "vacaciones", "nombre": "Vacaciones",
  "requiere_fechas": true, "requiere_horario": false, "requiere_dias": true,
  "requiere_monto": false, "requiere_colaborador_objetivo": false,
  "requiere_motivo": true, "permite_adjuntos": true,
  "campos": [ { "name": "fecha_inicio", "type": "date", "required": true } ]
} ] }

// GET /solicitudes/{id} — SolicitudInternaResource: estos 13 campos y nada más
{ "id", "folio", "tipo", "tipo_etiqueta", "estado", "estado_etiqueta",
  "fecha_inicio", "fecha_fin", "motivo", "observaciones", "motivo_rechazo",
  "revisado_en", "creada_en" }

// POST /solicitudes/{id}/adjuntos → 201
{ "message": "Adjunto agregado correctamente." }

// POST /solicitudes/{id}/cancelar
{ "message": "Solicitud cancelada.", "data": { /* Resource */ } }

// GET /notificaciones → data[]
{ "id", "tipo", "emoji", "color", "titulo", "mensaje", "url", "leida",
  "creada_en", "creada_en_iso", "created_at",
  "data": { "type", "resource_id" } }
```

**Tipos** (`TipoSolicitudInterna`, 17): `vacaciones`, `permiso_con_goce`,
`permiso_sin_goce`, `permiso_tiempo`, `salida_temprano`, `llegada_tarde`,
`incapacidad`, `constancia_laboral`, `actualizacion_datos`,
`actualizacion_bancaria`, `reposicion_documental`, `prestamo`,
`baja_colaborador`, `permiso_especial_cumpleanos`,
`permiso_especial_paternidad`, `permiso_especial_fallecimiento`,
`solicitud_general`.

**Estados** (`EstadoSolicitudInterna`, 8): `creada`, `enviada`, `en_revision`,
`aprobada`, `rechazada`, `requiere_correccion`, `cancelada`, `cerrada`.
Finales: `rechazada`, `cancelada`, `cerrada`. Cancelables por el colaborador:
`creada`, `enviada`, `en_revision`, `requiere_correccion`.

**Colores de notificación** (paleta cerrada): `success`, `info`, `warning`,
`danger`, `celebracion`, `neutral`. La app los traduce a sus tokens en
`src/utils/notificationStyle.ts`; el hexadecimal del backend **no** es la
autoridad visual.

## F. Qué sigue siendo web-only (y está bien así)

Finiquitos completos · Headcount editable · Edición de vacantes ·
Matriz comercial · Candidatos/reclutamiento completo · Configuración de
formatos oficiales y plantillas · Reportes · Administración de usuarios y
roles · Importaciones · Excel/PDF · Configuración organizacional y de
cumpleaños.

La app **no los trata como error ni como "próximamente"**: `openRhWeb(path?)`
abre `EXPO_PUBLIC_RH_WEB_URL` (por defecto `https://people.mr-lana.com`) en el
navegador del sistema, **sin token ni credenciales en la URL**. El usuario
inicia sesión ahí por su cuenta.

Aun siendo web-only, **RH sí recibe el aviso en la app**: toda notificación o
push llega al centro de notificaciones y navega al detalle móvil cuando
existe, o al propio centro cuando no. Nunca a una ruta rota.
