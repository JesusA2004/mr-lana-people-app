> ⚠️ **SUPERADO (22/09/2026).** Este documento describe el backend anterior y contiene afirmaciones que ya no son ciertas (p. ej. "documentos laborales no existe"). La fuente vigente es [`MOBILE_BACKEND_SYNC_2026_09_22.md`](./MOBILE_BACKEND_SYNC_2026_09_22.md).

> **⚠️ DOCUMENTO SUPERADO — 2026-09-15.**
> La fuente de verdad de contratos es ahora
> [`BACKEND_SYNC_2026_09_15.md`](./BACKEND_SYNC_2026_09_15.md), auditado
> contra `capacitaciones@6e5a912`. Varios contratos descritos aquí
> (`requires_dates`, `allows_attachments`, `attachment_required`,
> `prestamo_interno`, `general`) **nunca existieron** en este backend, y el
> módulo de vacaciones ya se unificó. Se conserva solo como historia de la
> auditoría del 2026-09-10.

# Discrepancias reales entre la app y `capacitaciones` (backend)

**NO se modificó `capacitaciones` desde esta sesión** (fuera de alcance
explícito, en las tres auditorías que ha tenido este documento). Este
documento solo audita y describe, para que quien tenga acceso al backend
decida qué hacer.

Auditado en modo lectura contra el código fuente REAL de `capacitaciones`
(rutas, controladores, servicios, modelos, enums, seeders, docs) el
2026-09-10, commit **`34a8132`** — auditoría de integración real, tercera
pasada de este documento. Las dos auditorías anteriores (commits previos de
`capacitaciones`) quedaron **desactualizadas en varios puntos clave**: dos
gaps que se daban por completos ya estaban parcialmente implementados con
un contrato *distinto* al descrito (OCR, formatos), y dos gaps de la
primera auditoría ya se cerraron por completo (landing web del QR, y
cumpleaños RH). Todo lo de abajo está confirmado contra el código fuente
real, no contra suposiciones.

---

## Resumen ejecutivo

| Módulo | Estado real hoy |
|---|---|
| Cumpleaños colaborador | ✅ IMPLEMENTADO (sin cambios desde siempre) |
| Cumpleaños RH (bandeja, detalle, imágenes) | ✅ IMPLEMENTADO |
| Envío manual de felicitación desde móvil | ❌ FALTA (solo panel web) |
| Organigrama (`GET /rh/jerarquia-puestos`) | ✅ IMPLEMENTADO |
| Extracción automática de documentos (OCR) — ver, aplicar, ignorar | ✅ IMPLEMENTADO (contrato distinto al descrito en la auditoría anterior — corregido) |
| Extracción automática — reprocesar desde móvil | ❌ FALTA (solo panel web) |
| Catálogo de formatos (`GET /rh/formatos`) | ✅ IMPLEMENTADO (contrato distinto al descrito antes — corregido) |
| Descarga de formatos ya generados (DOCX/PDF) | 🟡 PARCIAL — la ruta existe, pero no hay forma de descubrir los ids desde móvil (ver G-listado abajo) |
| Generar/preparar/preview un formato nuevo desde móvil | ❌ FALTA (solo panel web) |
| Documentos laborales del colaborador | ❌ FALTA (módulo completo) |
| App Links / Universal Links (verificación de dominio) | ❌ FALTA |
| Landing web del QR de incorporación | ✅ IMPLEMENTADO (cerrado desde la auditoría anterior) |
| Adjuntos de solicitud RH (ver contenido) | ❌ FALTA |
| Listado de documentos generados por colaborador | ❌ FALTA |
| "Mi equipo" (jefe directo/subordinados) | ❌ FALTA — sin ninguna señal de que se vaya a construir, no se inventó contrato |

---

## G1 — App Links / Universal Links sin archivos de verificación de dominio

**Estado: FALTA.** Sin cambios desde las auditorías anteriores — se buscó
de nuevo en todo el repositorio (`public/`, `routes/web.php`,
`.well-known/`) y no existe `apple-app-site-association` ni
`assetlinks.json`.

**Endpoint esperado:**
```
GET https://people.mr-lana.com/.well-known/apple-app-site-association
GET https://people.mr-lana.com/.well-known/assetlinks.json
```

**Problema:** `app.json` de la app móvil ya declara `associatedDomains`
(iOS) e `intentFilters` (Android, `autoVerify: true`) para que el QR de
incorporación abra la app directo cuando ya está instalada. Sin los dos
archivos de verificación, el sistema operativo nunca confirma que el
dominio autoriza a la app a interceptar esa URL y sigue abriendo el
navegador siempre — comportamiento normal del SO, no un bug de la app.

**Cambio mínimo requerido:** los dos archivos estáticos, con el
`sha256_cert_fingerprints` real del keystore de producción (EAS lo
genera/gestiona) para `assetlinks.json`, y el Team ID de Apple real para
`apple-app-site-association`.

---

## G2 — Landing pública del QR de incorporación

**Estado: ✅ CERRADO.** La auditoría anterior lo daba como faltante — ya no
es así. `routes/web.php` registra `GET incorporacion/qr/{token}` →
`App\Http\Controllers\IncorporacionQrController::show()`, que renderiza
`Incorporacion/Qr` (Inertia) informando el estado de la invitación
(válida/vencida/revocada/usada/inválida, siempre `200`, nunca 404/500) e
intenta abrir la app vía deep link `mrlanapeople://incorporacion/qr/{token}`
— nota: el backend usa el scheme **legado** (`mrlanapeople`, sin "app") para
este deep link generado desde la landing, no el canónico
`mrlanapeopleapp`; la app móvil ya acepta ambos (`app.json` declara los dos
esquemas, `parseIncorporacionQr` acepta los dos), así que esto funciona sin
cambios adicionales.

Ya no hace falta ningún cambio aquí salvo que G1 se resuelva para que el
deep link se dispare automáticamente en vez de depender de que el usuario
lo confirme.

---

## G3 — RH no puede ver el contenido de los adjuntos de una solicitud

**Estado: FALTA.** Confirmado de nuevo contra `Api\V1\SolicitudController`
(web) — `POST {solicitud}/adjuntos` (subir) existe; el detalle de una
solicitud RH (`Api\V1\Rh\SolicitudController::show`) sigue devolviendo
`adjuntos: [{id, nombre}]` únicamente, sin ninguna ruta para ver el
contenido — a diferencia de documentos de expediente
(`rh/documentos/{id}/ver`), que sí tienen streaming autenticado.

**Endpoint esperado:** `GET /api/v1/rh/solicitudes/{solicitud}/adjuntos/{adjunto}/ver`.

**Cambio mínimo requerido:** una ruta de streaming análoga a
`rh/documentos/{id}/ver`, reutilizando `DocumentoStorageService::respuesta`
sobre el modelo de adjunto de la solicitud. En cuanto exista, conectar
`SecureDocumentViewer` (ya generalizado y reutilizable, con
`allowDownload`/`watermarkLabel` opcionales) solo requiere agregar `path` a
la card de adjunto.

---

## G4 — Cumpleaños RH móvil

**Estado: ✅ CERRADO** (ya se había cerrado en la auditoría anterior,
confirmado de nuevo). `Api\V1\Rh\CumpleanosController` completo:
`GET /rh/cumpleanos` (con `periodo`/`mes`/`sucursal_id`/`departamento_id`/
`q`/`page`/`per_page`), `GET /rh/cumpleanos/{greeting}`,
`GET /rh/cumpleanos/{greeting}/imagen`, `GET /rh/cumpleanos/{colaborador}/foto`.
La app está conectada 1:1 contra el shape real (`src/api/rh/cumpleanos.ts`,
`src/app/(app)/rh/cumpleanos/**`).

**Sub-gap real:** el envío manual de felicitación (botón "Enviar
felicitación") **no existe en la API móvil** — solo en el panel web
(`/rh/cumpleanos/{colaborador}/felicitacion`, permiso
`rh.cumpleanos.notificaciones.gestionar`). El detalle móvil tampoco manda
`acciones_permitidas`, así que el botón "Enviar" en
`rh/cumpleanos/[id].tsx` nunca se muestra hoy (correcto: aparecerá solo
si el backend algún día agrega esa acción al recurso).

---

## G5 — Extracción automática de documentos (OCR)

**Estado: ✅ IMPLEMENTADO, contrato de la auditoría anterior INCORRECTO —
corregido en esta sesión.**

El backend real (`App\Models\DocumentExtraction`, `App\Enums\EstadoExtraccion`,
`App\Services\Documentos\DocumentExtractionService`,
`Api\V1\Rh\DocumentoController`) ya implementa ver/aplicar/ignorar. La
auditoría anterior había construido un cliente completo contra un contrato
**especulativo e incorrecto** en varios puntos — todos corregidos hoy:

| Punto | Auditoría anterior (incorrecto) | Backend real |
|---|---|---|
| Respuesta de `GET .../extraccion` | `DocumentExtraction` plana | `{elegible: boolean, extraccion: DocumentExtraction \| null}` — siempre `200` |
| Body de `POST .../aplicar` | `{ fields: {...} }` | `{ valores: {curp?, rfc?, nss?, fecha_nacimiento?} }` — `fecha_nacimiento` debe ser `d/m/Y` exacto |
| Body de `POST .../ignorar` | `{ fields?: [...] }` | sin body, no valida nada |
| `differences` | arreglo `[{field, label, current_value, detected_value, confidence}]` | diccionario `{campo: {detectado, actual, coincide}}`, sin `label` (la app lo traduce) |
| `confidence` | número 0-1 por campo | string `'alta'`/`'media'` por campo |
| `acciones_permitidas` en el recurso | sí | **no existe** — la app ahora decide con los permisos reales de `mobile/bootstrap` (`rh.documentos.extraccion.aplicar`/`.ignorar`) |
| `reprocesar` desde móvil | sí (ruta especulativa) | **no existe** — confirmado también en `docs/DOCUMENT_EXTRACTION.md`: "Reprocesar solo está disponible en el panel web por ahora" |

**Nota de seguridad:** `App\Models\DocumentExtraction` NO tiene `$hidden`
sobre `extracted_text` — el JSON real incluye hasta 20,000 caracteres del
texto crudo del PDF. La app nunca lo copia a su estado normalizado ni lo
renderiza (ver `normalizeDocumentExtractionResponse`), pero si algún día se
agrega un endpoint que dependa de auditoría de ese campo, considerar
ocultarlo del lado backend (`$hidden` o un API Resource dedicado) en vez de
confiar solo en que ningún cliente lo pinte.

**Decisión de producto de esta auditoría:** aunque el backend ya funciona,
el módulo queda **oculto en el cliente** (`document_extraction` fail-closed,
ver sección de feature flags) hasta que `mobile/bootstrap` mande
`features.document_extraction: true` explícito — para no depender de
que la app adivine que está listo, sino de una señal explícita del backend.

**Cambio sugerido (no bloqueante):** agregar `features.document_extraction`
a `MobileBootstrapService::features()` cuando el equipo de backend
considere el módulo listo para producción móvil.

---

## G6 — Catálogo de formatos y descarga

**Estado: ✅ IMPLEMENTADO (catálogo + descarga), contrato de la auditoría
anterior INCORRECTO — corregido. Generar/preparar/preview: FALTA.**

`App\Services\Formatos\FormatoCatalogoService::listar()` +
`Api\V1\Rh\FormatoController` ya existen. Diferencias corregidas hoy:

| Punto | Auditoría anterior (incorrecto) | Backend real |
|---|---|---|
| `GET /rh/formatos` | paginado, con `tipo`/`q`/`page` como query params | **arreglo plano sin paginar**, `index()` no lee ningún query param |
| Campos del catálogo | `clave`, `formatos_salida`, `variables_requeridas`, `acciones_permitidas` | `id`, `nombre`, `tipo`, `tipo_etiqueta`, `descripcion`, `variables` (variables detectadas en el DOCX, informativo), `veces_generado`, `ultimo_uso` — **ninguno de los cuatro campos de la izquierda existe** |
| Descarga | `GET /rh/formatos/generados/{id}/descargar` | `GET /rh/formatos/{documento}/descargar` y `.../descargar-pdf` — `{documento}` es directo el id de un `GeneratedDocument`, sin el segmento `generados/` |
| Generar/preparar/preview | se asumían implementados | **el controlador real dice explícitamente** ("Generar un documento nuevo y la vista previa con variables faltantes se quedan solo en el panel web por ahora") |

**Bug crítico corregido:** el cliente anterior hacía
`formato.acciones_permitidas.includes(...)` sobre un campo que el backend
real nunca manda — eso hubiera reventado en runtime (`Cannot read property
'includes' of undefined`) en cuanto el catálogo real respondiera. Se agregó
`normalizeRhFormato()` con defaults seguros y se quitó cualquier
`.includes()`/`.map()` sobre esos campos inexistentes.

**Decisión de producto:** `formatos` queda fail-closed (oculto hasta que
`mobile/bootstrap` mande `features.formatos: true`) — el catálogo/descarga
SÍ funcionan hoy, pero se mantienen ocultos porque no tiene sentido mostrar
un catálogo sin ninguna acción alcanzable (ver G7 abajo) hasta que el
backend confirme que el módulo está listo para exponerse. El wizard de
generación (`rh/formatos/generar.tsx`) queda con el código completo y
compilando, pero deliberadamente inalcanzable desde ninguna navegación real
(un guard `GENERACION_MOVIL_DISPONIBLE = false` explícito) — ninguna acción
del catálogo ni del detalle de colaborador enlaza ahí.

---

## G7 — Sin endpoint para listar documentos generados por colaborador

**Estado: FALTA** (gap nuevo, descubierto en esta auditoría).

Las rutas reales `GET /rh/formatos/{documento}/descargar[-pdf]` reciben
directo el id de un `GeneratedDocument` — pero no existe **ningún**
endpoint que devuelva esos ids para un colaborador o una plantilla en
particular. `FormatoCatalogoService::listar()` solo expone
`veces_generado`/`ultimo_uso` como metadatos, nunca los ids de los
documentos generados reales.

**Endpoint sugerido:**
```
GET /api/v1/rh/colaboradores/{colaborador}/documentos-generados
```
o, si conviene reutilizar el módulo de documentos laborales del lado
colaborador (ver G8):
```
GET /api/v1/colaborador/documentos-laborales
```

**Problema práctico:** sin esto, la descarga real de formatos generados es
inalcanzable desde el celular aunque la ruta HTTP exista — el cliente no
tiene forma de saber qué IDs pedir.

---

## G8 — Documentos laborales del colaborador

**Estado: FALTA** (módulo completo, sin cambios desde la auditoría
anterior). Confirmado de nuevo contra `routes/api.php`: el colaborador solo
tiene `incorporacion` (expediente que ENTREGA a RH) — no existe ningún
recurso para lo que la EMPRESA le entrega a él (contrato, recibos de
nómina, constancias).

**Endpoints esperados:**
```
GET /api/v1/colaborador/documentos-laborales
GET /api/v1/colaborador/documentos-laborales/{documento}/ver
GET /api/v1/colaborador/documentos-laborales/{documento}/descargar
```

**Decisión de producto:** `documentos_laborales` queda fail-closed — el
código (`src/api/documentosLaborales.ts`,
`src/app/(app)/documentos-laborales/**`) queda completo y listo, oculto
hasta `features.documentos_laborales: true` explícito.

---

## G9 — "Mi equipo" (jefe directo / subordinados del colaborador)

**Estado: FALTA**, sin ninguna señal de que vaya a construirse. No hay
ninguna ruta, controlador ni mención en los docs de capacitaciones para
"jefe directo"/"subordinados" desde el punto de vista de un colaborador
individual. A diferencia de G5-G8 (donde hay un contrato acordado
explícito a implementar por adelantado), **no se construyó cliente ni
pantalla** para esto — inventar un contrato sin ninguna base real hubiera
sido peor que documentarlo como pendiente de decisión de producto.

Si se decide construir, `GET /rh/jerarquia-puestos` (ya conectado) es un
punto de partida razonable para derivar subordinados de un PUESTO, pero no
reemplaza un endpoint dedicado a relaciones persona-a-persona.

---

## Feature flags — estrategia corregida en esta auditoría

**Bug de producto corregido:** los módulos nuevos (`formatos`,
`documentos_laborales`, `document_extraction`) eran **fail-open**
(`isFeatureEnabled`) — si el backend real (que hoy no manda ninguna de
estas tres claves) simplemente no las incluye, la app los mostraba de
todos modos, incluyendo módulos que apuntan a endpoints 404 reales
(documentos laborales) o que el producto quiere mantener apagados hasta
confirmación explícita (formatos, OCR).

Estrategia final (`src/utils/featureFlags.ts`):

- **`isFeatureEnabled`** (sin cambios) — CORE/ya existente
  (`incorporacion`, `vacaciones`, `cumpleanos`, `rh_mobile`, ...):
  fail-**open**. Mantiene compatibilidad con lo que ya funcionaba.
- **`isExperimentalFeatureEnabled`** (nueva) — módulos nuevos (`formatos`,
  `documentos_laborales`, `document_extraction`): fail-**closed**. Ausente
  = oculto, siempre, sin importar si el bootstrap ya cargó o no.
- **`isOrganigramaEnabled`** (nueva, caso especial) — el organigrama SÍ
  tiene endpoint real funcionando hoy, pero `mobile/bootstrap` todavía no
  manda `features.organigrama`. Se resuelve así: si el backend manda el
  flag explícito, ese valor manda; si no, cae en el mismo permiso que
  protege el endpoint real (`puestos.administrar`, `PuestoPolicy`) — nunca
  fail-open genérico, nunca fail-closed total (eso ocultaría un módulo que
  sí funciona a quien sí tiene el permiso).

**Pedido al backend (no bloqueante):** agregar `formatos`,
`documentos_laborales`, `document_extraction` y, preferentemente,
`organigrama` a `MobileBootstrapService::features()` cuando cada módulo se
considere listo para exponerse en móvil.

---

## `mobile/bootstrap` — campos que la app NUNCA debe inventar

Confirmado contra `MobileBootstrapService::features()`/`counts()` real: no
existen hoy `features.{formatos,documentos_laborales,document_extraction,
organigrama}` ni `counts.{labor_documents_new,rh_document_extractions_pending}`.
La app los declaró **opcionales** en los tipos
(`MobileBootstrapFeatures`/`MobileBootstrapCounts`) y en cada sitio de uso
se lee con `?.` — su ausencia se traduce a "oculto"/"sin badge", nunca a un
`0` fabricado ni a un `true` asumido.

---

## Formas de contrato no confirmadas (no son errores, quedaron defensivas)

- `RhVacacion.workflow` / `RhVacacion.historial` / `RhDocumento.workflow`
  — no confirmados con un JSON de ejemplo completo, se renderizan solo si
  vienen.
- `RhExpediente.acciones_permitidas` — el doc de expedientes no lo muestra;
  la app usa los permisos reales de Spatie (`hasPermission()`) en su lugar.
- `RhBirthdayItem.mes` — el backend real (`Rh\CumpleanosController::index`)
  solo manda `dia` por entrada, nunca `mes` — tipificado opcional.

Si al conectar contra un backend real alguno de estos campos llega con
otro nombre o forma, son los únicos puntos que requerirían ajuste — el
resto del contrato (bootstrap, dashboard, pendientes, solicitudes,
documentos, incorporaciones, colaboradores, cumpleaños colaborador y RH,
organigrama, extracción OCR, catálogo de formatos, releases, config) se
confirmó 1:1 contra el código fuente real el 2026-09-10.
