# Discrepancias reales entre la app y `capacitaciones` (backend)

**NO se modificó `capacitaciones` desde esta sesión** (fuera de alcance
explícito). Este documento solo audita y describe, para que quien tenga
acceso al backend decida qué hacer. La app ya quedó construida para
funcionar correctamente el día que cada uno de estos puntos se resuelva —
ninguno bloquea el uso normal de lo demás hoy: cada endpoint que todavía no
existe responde 404 y la pantalla correspondiente lo maneja como un estado
claro ("módulo aún no disponible" / error normal con reintentar), nunca
como un crash.

Auditado en modo lectura contra el código fuente real de `capacitaciones`
(rutas, controladores, servicios, seeders, docs) el 2026-09-10 — sesión de
extensión "mobile documents intelligence and hr tools" — no contra un
servidor corriendo, no se ejecutó ningún request de prueba.

**G4 (cumpleaños RH) de la auditoría anterior se cerró**: el backend real
ya implementa `Rh\CumpleanosController` completo (`GET /rh/cumpleanos`,
`GET /rh/cumpleanos/{greeting}`, `GET /rh/cumpleanos/{greeting}/imagen`,
`GET /rh/cumpleanos/{colaborador}/foto`) — la app ya está conectada 1:1
contra ese contrato real (ver `src/api/rh/cumpleanos.ts`,
`src/app/(app)/rh/cumpleanos/**`).

---

## G1 — App Links / Universal Links sin archivos de verificación de dominio

Sin cambios desde la auditoría anterior — sigue sin existir
`apple-app-site-association`/`assetlinks.json` en `capacitaciones`.

**Endpoint esperado:**
```
GET https://people.mr-lana.com/.well-known/apple-app-site-association
GET https://people.mr-lana.com/.well-known/assetlinks.json
```

**Request:** ninguno (archivos estáticos servidos por HTTPS, sin auth).

**Response actual:** no confirmada — no se encontró ninguna ruta ni archivo
público para estas dos rutas en `capacitaciones` (ni en `routes/api.php` ni
en `public/`).

**Problema:** `app.json` de la app móvil ya declara `associatedDomains`
(iOS, `applinks:people.mr-lana.com`) e `intentFilters` (Android,
`autoVerify: true` sobre `/incorporacion/qr`) para que el QR que ya genera
RH (`https://people.mr-lana.com/incorporacion/qr/{token}`) abra la app
directo cuando ya está instalada, en vez de solo el navegador. Sin los dos
archivos de verificación, iOS/Android nunca confirman que el dominio
autoriza a la app a interceptar esa URL, y el sistema operativo sigue
abriendo el navegador siempre — comportamiento normal del sistema
operativo, no un bug de la app.

**Cambio mínimo requerido:**
- `apple-app-site-association` (sin extensión, `Content-Type:
  application/json`, sin redirección):
  ```json
  { "applinks": { "details": [ { "appID": "<TEAM_ID>.com.mrlana.people", "paths": ["/incorporacion/qr/*"] } ] } }
  ```
- `assetlinks.json`:
  ```json
  [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": { "namespace": "android_app", "package_name": "com.mrlana.people", "sha256_cert_fingerprints": ["<SHA256_DEL_KEYSTORE_DE_FIRMA>"] }
  }]
  ```
  El `sha256_cert_fingerprints` depende del keystore real usado para firmar
  el build de producción (EAS lo genera/gestiona) — coordinarlo con quien
  corra `eas build --profile production` la primera vez.

---

## G2 — Sin landing pública para quien escanea el QR sin tener la app instalada

Sin cambios desde la auditoría anterior.

**Endpoint esperado:** `GET https://people.mr-lana.com/incorporacion/qr/{token}` (web, HTML).

**Response actual:** capacitaciones documenta explícitamente
(`docs/API_MOVIL.md`, sección "Registro por QR temporal") que esa ruta
"todavía no existe" como página web — la liga que codifica el QR solo la
consume hoy la API pública (`/api/v1/incorporacion/invitaciones/{token}/
validar`), pensada para la app móvil.

**Problema:** si alguien escanea el QR con la cámara nativa del teléfono
(no la de la app) y todavía NO tiene MR. LANA PEOPLE instalada, el
navegador intenta abrir esa URL y no encuentra nada útil — ni la app (sin
G1 resuelto) ni una página que lo guíe a instalarla.

**Cambio mínimo requerido:** una landing web mínima en esa ruta con "Instala
MR. LANA PEOPLE" + enlaces a Play Store/APK de descarga directa (ya existe
`GET /api/v1/app/releases/latest` para obtener el `download_url` real) y,
si G1 ya está resuelto, un intento de abrir el deep link antes de mostrar
la landing. Explícitamente fuera de alcance de esta sesión (repo separado).

---

## G3 — RH no puede ver el contenido de los adjuntos de una solicitud

Sin cambios desde la auditoría anterior — confirmado de nuevo contra
`routes/api.php`: `POST {solicitud}/adjuntos` (subir) existe, pero ninguna
ruta `GET .../adjuntos/{adjunto}/ver`.

**Endpoint esperado:** `GET /api/v1/rh/solicitudes/{solicitud}/adjuntos/{adjunto}/ver` (o equivalente).

**Request:** `Authorization: Bearer <token>`, permiso `rh.solicitudes.ver` o `rh.solicitudes.detalle`.

**Response actual esperada:** el detalle de una solicitud RH
(`GET /rh/solicitudes/{solicitud}`) sí incluye `adjuntos: [{id, nombre}]`
(confirmado en `docs/RH_MOBILE_API.md`), pero no existe ninguna ruta
documentada ni en `routes/api.php` para descargar/ver el contenido de esos
adjuntos — a diferencia de documentos de expediente
(`rh/documentos/{id}/ver`, `rh/expedientes/{colaborador}/documentos/
{documento}/ver`), que sí tienen streaming autenticado.

**Problema:** hoy RH ve el NOMBRE del adjunto (ej. "incapacidad.pdf") en el
detalle de la solicitud, pero no hay forma de abrirlo — la app
deliberadamente NO ofrece un botón "Ver" ahí para no prometer una acción
que no existe, ver `src/app/(app)/rh/solicitudes/[id].tsx`.

**Cambio mínimo requerido:** una ruta de streaming análoga a
`rh/documentos/{id}/ver`, reutilizando `DocumentoStorageService::respuesta`
sobre el modelo de adjunto de solicitud (`solicitud_interna_adjuntos`, ver
`docs/BACKEND_REQUIREMENTS_V4.md` P1.3 para el modelo de datos). En cuanto
exista, conectar `SecureDocumentViewer` (generalizado en esta sesión —
`path`/`allowDownload`/`watermarkLabel` opcional) solo requiere agregar
`path` a la card de adjunto.

---

## G5 — Sin API móvil de "Formatos" (contratos, cartas, constancias, recibos generados)

**Endpoints esperados:**
```
GET  /api/v1/rh/formatos
GET  /api/v1/rh/formatos/{formato}/preparar?colaborador_id=
POST /api/v1/rh/formatos/{formato}/generar
GET  /api/v1/rh/formatos/generados/{documento}/preview
GET  /api/v1/rh/formatos/generados/{documento}/descargar
```

**Response actual:** no existe — confirmado contra `routes/api.php`: no hay
ningún controlador/ruta relacionado con "formatos" en capacitaciones hoy.
`docs/PLANTILLAS_FORMATOS.md` documenta plantillas/formatos en otro
contexto (no una API móvil de generación). `docs/ROADMAP.md` solo menciona
"Plantillas y formatos precargados (DOCX)" como punto de roadmap general,
sin ruta ni controlador todavía.

**Problema:** RH no puede generar un contrato/carta/constancia/recibo
prellenado desde el celular — el flujo completo (catálogo → preparar con
datos del expediente → revisar faltantes → generar → vista previa →
descargar) está construido en la app (`src/api/rh/formatos.ts`,
`src/app/(app)/rh/formatos/**`) contra el contrato acordado, pero cada
llamada responde 404 hasta que el backend despliegue las rutas.

**Cambio mínimo requerido:** los cinco endpoints de arriba, con el shape
exacto documentado en `src/types/formato.ts` (`RhFormato`,
`FormatoPreparation`, `GeneratedDocument`) — la app queda lista en
automático en cuanto respondan.

---

## G6 — Sin API móvil de extracción automática de documentos (OCR)

**Endpoints esperados:**
```
GET  /api/v1/rh/documentos/{documento}/extraccion
POST /api/v1/rh/documentos/{documento}/extraccion/aplicar   { fields: {...} }
POST /api/v1/rh/documentos/{documento}/extraccion/ignorar   { fields?: [...] }
POST /api/v1/rh/documentos/{documento}/extraccion/reprocesar
```

**Response actual:** no existe — confirmado contra `routes/api.php`: no hay
controlador de extracción/OCR. La app NUNCA hace OCR por su cuenta ni manda
documentos a un servicio externo — solo consumiría el resultado que ya
procesó el backend.

**Problema:** la sección "Análisis automático" del detalle de documento RH
(`src/app/(app)/rh/documentos/[id].tsx`) está construida completa —
estado, comparador CURP/RFC/domicilio con nivel de confianza,
aplicar/ignorar/reprocesar selectivo por campo — pero se oculta sola (no
hay `extraction.data`) mientras el endpoint responda 404. OCR nunca
aprueba/rechaza el documento: eso lo sigue decidiendo RH con los botones
Aprobar/Rechazar existentes, sin relación con esta sección.

**Cambio mínimo requerido:** el endpoint `GET .../extraccion` con el shape
de `src/types/documentExtraction.ts` (`status`, `datos_detectados`,
`confidence`, `differences`, `acciones_permitidas`) + las tres acciones
POST. El push opcional `rh_documento` con `reason: "extraction_review"` (o
un tipo dedicado `rh_extraccion_documento`) ya está resuelto en
`src/utils/appLinks.ts` para abrir el documento directo en esta sección.

---

## G7 — Sin API móvil de "Documentos laborales" del colaborador

**Endpoints esperados:**
```
GET /api/v1/colaborador/documentos-laborales
GET /api/v1/colaborador/documentos-laborales/{documento}/ver
GET /api/v1/colaborador/documentos-laborales/{documento}/descargar
```

**Response actual:** no existe — confirmado contra `routes/api.php`: el
colaborador solo tiene `incorporacion` (expediente que ENTREGA a RH), no
existe ningún recurso para lo que la EMPRESA le entrega a él (contrato,
recibos de nómina, constancias).

**Problema:** "Mi espacio → Documentos laborales" (`src/api/
documentosLaborales.ts`, `src/app/(app)/documentos-laborales/**`) está
construido completo — lista agrupada por año, filtro por tipo, visor
seguro, descarga cuando `puede_descargar` es `true` — pero hoy no hay
ningún documento que mostrar porque el endpoint no existe.

**Cambio mínimo requerido:** los tres endpoints de arriba con el shape de
`src/types/laborDocument.ts` (`LaborDocument`). Opcional:
`POST .../{id}/visto` para marcar como visto (`docs` sección 67 del
encargo) — si no se implementa, la app simplemente no ofrece esa acción,
nunca inventa un contador local.

---

## G8 — Envío manual de felicitación de cumpleaños no existe en la API móvil

**Endpoint esperado:** `POST /api/v1/rh/cumpleanos/{greeting}/enviar`.

**Response actual:** no existe — confirmado contra `routes/api.php`: el
único envío manual real está en el panel WEB
(`/rh/cumpleanos/{colaborador}/felicitacion`, permiso
`rh.cumpleanos.notificaciones.gestionar`, ver `docs/CUMPLEANOS.md` sección
"Envío manual desde el panel RH"), no en `Api\V1\Rh\CumpleanosController`.
Tampoco `acciones_permitidas` viene en el detalle
(`GET /rh/cumpleanos/{greeting}`) — el backend real ni siquiera anticipa
esta acción desde móvil todavía.

**Problema:** ninguno hoy — el botón "Enviar felicitación" en
`src/app/(app)/rh/cumpleanos/[id].tsx` solo aparece si el backend algún día
manda `acciones_permitidas` con `"enviar"`, así que hoy simplemente no se
muestra. `src/api/rh/cumpleanos.ts#enviar()` queda implementado y listo.

**Cambio mínimo requerido:** decidir si esta acción se quiere exponer desde
móvil (hoy solo existe en el panel web) y, si sí, agregar la ruta +
`acciones_permitidas` al detalle.

---

## G9 — "Mi equipo" (jefe directo / subordinados del colaborador) — no construido, sin endpoint

**Endpoint esperado (nunca confirmado):** `GET /api/v1/colaborador/mi-equipo`.

**Response actual:** no existe — no hay ninguna ruta ni mención de este
recurso en `capacitaciones` (ni en `routes/api.php` ni en los docs).

**Decisión de esta sesión:** a diferencia de G5/G6/G7 (donde el encargo dio
un contrato explícito a implementar por adelantado), este endpoint era
condicional ("si backend ofrece jefe directo/subordinados") y no hay
ninguna señal de que vaya a existir — así que NO se construyó cliente ni
pantalla para "Mi equipo" esta sesión, para no inventar un contrato sin
ninguna base real. Si se decide construir el módulo, `GET
/rh/jerarquia-puestos` (organigrama de puestos, ya conectado en
`src/api/rh/organizacion.ts`) es un punto de partida razonable para
derivar subordinados de un puesto, pero no reemplaza un endpoint dedicado
a "quién le reporta a quién" a nivel de personas.

---

## Formas de contrato no confirmadas (no son errores, quedaron defensivas)

Estos campos se tipificaron como **opcionales** porque la documentación no
muestra un JSON de ejemplo completo para ellos — la app los renderiza solo
si vienen, nunca asume su ausencia como error:

- `RhVacacion.workflow` / `RhVacacion.historial` — el doc de vacaciones
  solo confirma `saldo_disponible`; no se confirmó si el detalle también
  trae `workflow`/`historial` como el de solicitudes.
- `RhDocumento.workflow` — mismo caso.
- `RhExpediente.acciones_permitidas` / `RhExpedienteDocumento.acciones_permitidas`
  — el doc de expedientes no muestra este campo. La app usa en su lugar los
  permisos reales de Spatie (`user.permissions` de `mobile/bootstrap`, ver
  `hasPermission()` en `src/utils/capabilities.ts`).
- `RhBirthdayItem.mes` — el backend real (`Rh\CumpleanosController::index`)
  solo manda `dia` en cada entrada de la bandeja, no `mes` — se tipificó
  opcional y la UI nunca fabrica un mes que no vino.
- `MobileBootstrapFeatures.{cumpleanos,formatos,documentos_laborales,
  document_extraction,organigrama}` y `MobileBootstrapCounts.
  {labor_documents_new,rh_document_extractions_pending}` — el backend real
  (`MobileBootstrapService`) todavía no los manda; `isFeatureEnabled()` los
  trata como habilitados por defecto (fail-open) hasta que el backend los
  agregue explícitamente.

Si al conectar contra un backend real alguno de estos campos llega con
otro nombre o forma, son los únicos puntos que requerirían ajuste — el
resto del contrato (bootstrap, dashboard, pendientes, solicitudes,
documentos, incorporaciones, colaboradores, cumpleaños colaborador y RH,
organigrama, releases, config) se confirmó 1:1 contra el código fuente
real.
