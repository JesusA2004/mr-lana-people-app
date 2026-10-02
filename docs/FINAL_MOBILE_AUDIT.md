# Auditoría final móvil — continuación 22/09/2026

Base: móvil `47a47b4` · backend `4b0315d`. Nada de esto está commiteado todavía.

## Qué se cerró

| Área | Resultado |
|---|---|
| Préstamos RH | Tipos `RhPrestamoDecision`/`RhPrestamoVistoBueno`; `plazo_solicitado` (ya no `plazo_meses`); sin `$NaN`/`NaN meses` (`!= null` + `Number.isFinite`); el "Aprobar" genérico nunca aparece en préstamos y no hay dos "Rechazar"; `puede_autorizar`/`puede_rechazar` mandan; visto bueno con jefe/comentario/fecha; autorización prellenada (plazo en meses → periodicidad mensual). |
| Confirmaciones | `confirmAction()` en solicitar cambio de documento, generar documentos de préstamo, generar/regenerar PDF de recibo, importar recibos, generar formato, aplicar/descartar datos detectados, marcar en revisión/cerrar solicitud, abrir/cerrar muro, borrar mensaje, alta. Subidas: ya tenían "Confirmar y subir"; rechazos: el modal de motivo. |
| Muro de cumpleaños | Backend + app: RH abre/cierra; todos dejan mensaje y/o foto; push `cumpleanos_muro`; banner en ambos Inicios. |
| Alta de colaborador | `GET /rh/catalogos` es suficiente (permiso + alcance + solo activos) → formulario móvil con confirmación. |
| Identidad RH | `RhIdentityBadge`; selector de experiencia nuevo; dashboard RH priorizado (resumen → pendientes importantes → 4 accesos principales → "Más herramientas" en lista). La mascota ya no aparece en Gestión RH. |
| Dev tools | `/dev/diagnostico-push` y `/dev/design-qa` solo con `SHOW_DEV_TOOLS` (`__DEV__` o `EXPO_PUBLIC_SHOW_DEV_TOOLS=true` en development/preview). En producción no se registran (`Stack.Protected`) y además redirigen. `DevPushTokenTool` eliminado (migrado a Diagnóstico). |
| Configuración | ScrollView, estado de notificaciones (Activadas / Desactivadas / Sin configurar / Entrega silenciosa) con Activar / Abrir ajustes, versión y build, experiencia con badge. |
| Responsive | `Screen` centra todo su contenido (33 pantallas) y el resto usa tope de ancho; formularios a 560 px; dashboard RH en 4 columnas desde 600 px; botones a 2 líneas; filas de acciones con wrap. |
| Visor PDF | `originWhitelist` `['file://*']`, sin `allowUniversalAccessFromFileURLs`, JS apagado. `allowFileAccess` (Android) y `allowingReadAccessToURL` (iOS) se conservan: son los que abren el archivo local. |
| CI | `.github/workflows/mobile-ci.yml` (Node 22, `npm ci`, typecheck, lint, tests, expo-doctor, export Android e iOS; sin `continue-on-error`, sin secretos, sin EAS). Scripts `typecheck` y `check`. |
| EAS | `preview` con `autoIncrement` (compatible con `appVersionSource: local`; commitear el bump de `app.json` tras cada build). `production` intacto + `EXPO_PUBLIC_SHOW_DEV_TOOLS=false`. |

## Tests nuevos

Push (14), auth (12), experiencia/cold start (4), routing y cuentas cruzadas (5),
arranque (13), préstamo (15), confirmación (4), alta (7), push `cumpleanos_muro`.
Backend: `MuroCumpleanosApiTest` (9).

## Fallas backend preexistentes (ya corregidas)

Fallaban **igual** en `4b0315d` sin cambios (comprobado en un worktree limpio).
Eran pruebas que no se actualizaron tras la migración User → Colaborador:

1. `RhCumpleanosApiTest` › rh ve la bandeja de cumpleanos de hoy desde la app con el permiso correcto
2. `RhCumpleanosApiTest` › el detalle de una felicitacion por greeting_id funciona para abrir un push rh_cumpleanos
3. `ColaboradorCumpleanosApiTest` › la felicitacion actual funciona con bearer cuando hoy es el cumpleanos del colaborador
4. `RhColaboradorApiTest` › rh puede ver el detalle basico de un colaborador
5. `RhPendientesApiTest` › un gerente de sucursal solo ve pendientes de su propia sucursal
6. `IncorporacionApiTest` › el colaborador no ve su expediente completo… (`documento_id` ahora se expone a propósito: es el id del propio archivo y la app lo usa para el push `documento`)

`tests/Feature/Api`: 130/130.

## Gaps reales que quedan

- **G-3** Generar documento laboral desde móvil: el backend no declara variables requeridas por plantilla → sigue en Portal RH.
- **G-7** App Links HTTPS: requiere SHA-256 de EAS y Apple Team ID reales (`docs/APP_LINKS_SETUP.md`).
- ~~Contratar candidato desde móvil: falta `GET /rh/candidatos`.~~ **Cerrado 2026-10-01** — ver sección siguiente.

## Requiere teléfono físico

Push (foreground/background/cold start/cambio de cuenta), visor de PDF en
Android (el WebView de Android puede no pintar PDFs locales: si queda en
blanco hay que cambiar a otro visor), teclado sobre formularios en Android
edge-to-edge, cámara/galería del muro, tema oscuro real, 320 px y tablet.
Guías: `docs/PUSH_QA.md`, `docs/DEVICE_QA.md`.

## Reglas de negocio y UX — continuación 2 (22/09/2026)

| Tema | Regla (backend = autoridad) |
|---|---|
| Baja | Un colaborador **no** solicita bajas. `GET /solicitudes/configuracion` (autoservicio) ya no la incluye y `POST /solicitudes` / `POST /colaborador/solicitudes` responden 422 (`StoreSolicitudAutoservicioRequest`). La app además filtra cualquier tipo que pida colaborador objetivo. La baja administrativa (cierre laboral, finiquito) y el catálogo del Portal web no cambian. |
| Préstamo (colaborador) | Solo **monto + motivo** (`/prestamos/solicitar`, con confirmación). El backend descarta `plazo_meses` (`exclude`) y no inventa plazo. El seguimiento lo calcula `PrestamoSeguimientoService` (visto bueno → autorización RH → firma) y llega en `solicitud.prestamo.etapas`. |
| Préstamo (RH) | La tarjeta muestra lo que pidió el colaborador (monto, visto bueno; plazo solo en solicitudes viejas). Monto/plazo/periodicidad autorizados son una decisión aparte en la hoja "Autorizar préstamo". Variables del préstamo para documentos: `PrestamoAutorizacionService::variablesDocumento()` — el formato oficial se mapeará ahí + datos del colaborador del motor de plantillas, sin tocar el flujo. |
| Expediente | Regla única `App\Services\Expedientes\ProgresoExpediente`: denominador = obligatorios activos; numerador = obligatorios **aprobados**; `floor()`. 8/11 con 1 en revisión = 72 %, nunca 100 si falta uno. Sin obligatorios = 0 % + `sin_obligatorios`. La app solo presenta (`utils/expedienteProgress.ts`, con guarda anti-100 para backends viejos). |
| Experiencias | `capabilities.employee` = la cuenta tiene expediente de colaborador; `capabilities.rh` = permisos RH. Ambas → se elige y se cambia siempre desde **Perfil** y **Configuración** (tarjeta "Cuenta y experiencia"); solo una → entra directo, sin opción inexistente; permiso retirado → vuelve a la válida y corrige la preferencia. Nunca por nombre de rol. |
| Copy | Sin leyendas técnicas (HTTPS, cifrado, token). La seguridad real no cambió. |

## Cierre — reclutamiento, reingresos y tema (2026-10-01)

Backend (`mrlanaPeople`) ya tenía el ciclo laboral completo implementado y
probado (`docs/CICLO_LABORAL_FINAL_IMPLEMENTADO.md`, 883 pruebas backend
verdes). En la app faltaban genuinamente dos pantallas con API real lista
desde el backend, y el consumo del tema institucional. Los tres se cerraron
esta sesión:

### Reclutamiento móvil (`/rh/candidatos`)

- `index.tsx`: listado con filtros por estado + búsqueda, mismo
  `CandidatoPresenter::fila()` que la web.
- `[id].tsx`: ficha completa sobre `ciclo.acciones_permitidas` (el mismo DTO
  `CicloLaboralService::obtenerEstado()` de todo el ciclo laboral — ningún
  botón se decide por rol). Cubre perfil, entrevista, psicométricas (link +
  resultados con adjuntos), socioeconómico (con evidencias), referencias,
  concluir referencias, preautorizar, autorizar RH, devolver, rechazar y
  descartar. La generación del QR de contratación (`iniciar_contratacion`)
  se deja fuera a propósito: no está en el alcance de reclutamiento móvil y
  sigue siendo un flujo del Portal RH.
- Adjuntos: reutiliza `DocumentUploadSheet` en modo "agregar a una lista
  local" (PDF/imagen); video de evidencia socioeconómica queda pendiente
  (el componente compartido no acepta `mp4/mov` todavía — el backend sí lo
  admite).

### Reingresos (`/rh/reingresos`)

- Una sola pantalla con dos secciones: "Buscar y solicitar" (busca en el
  histórico real, nunca crea una persona nueva; muestra el historial de
  salidas/contratos antes de solicitar) y "Solicitudes" (filtra por estado,
  autoriza/rechaza con los mismos `acciones_permitidas` que manda
  `ReingresoService::aArray()`). Sin pantalla de detalle por id: el backend
  no tiene `GET /rh/reingresos/{id}` (solo `index`/`buscar`/`historial`), así
  que decidir se hace desde la tarjeta de la lista.

### Tema institucional (`GET /api/v1/app/theme`)

No se consumía en absoluto. Se agregó la capa de datos completa
(`src/api/theme.ts`, `useAppTheme`, `appThemeStore`) con respaldo total a la
paleta estática si la red falla. **Limitación arquitectónica real, no un
recorte de alcance**: todas las pantallas usan `StyleSheet.create(...)`
sobre `constants/colors.ts`, que se evalúa una sola vez al cargar el bundle
— antes de que cualquier fetch de red pueda resolver — y este proyecto no
tiene almacenamiento síncrono (ni AsyncStorage ni MMKV) para leer un tema
cacheado en ese mismo instante. Repintar en vivo cada pantalla exigiría
migrar ~100 archivos de `StyleSheet.create` estático a un Context reactivo,
o agregar una dependencia nativa nueva (MMKV) + rebuild EAS — ninguna de las
dos es segura de hacer sin que el usuario lo decida explícitamente. Lo que
SÍ quedó funcionando de verdad: `expo-system-ui` repinta el fondo nativo en
cuanto llega el tema (igual que ya hacía con el color estático al arrancar),
y `useAppThemeColor(token)` está disponible para cualquier estilo en línea
nuevo que quiera leer el color institucional en tiempo real.

### Deep links / push

`appLinks.ts` no tenía NINGÚN caso para `Candidato`, `Reingreso` ni
`CierreLaboral` (los pushes de esos eventos caían al respaldo genérico de
notificaciones en vez de abrir la pantalla). Se agregó un respaldo por
`related_type` (el backend manda el evento real como `type`, p. ej.
`candidato_preautorizado`, pero `related_type` siempre es el
`class_basename` estable) y se sumaron los 8 eventos nuevos de
`config/configuracion_sistema.php → eventos` a `RH_PUSH_TYPES` para que el
push cambie de experiencia a Gestión RH correctamente. `taskRoutes.ts`
(bandeja de tareas) recibió las mismas dos rutas nuevas.

### Validación de esta sesión

`tsc --noEmit`: 0 errores · `eslint .`: 0 errores · `jest`: 42/42 suites,
428/428 pruebas (12 nuevas: respaldo por `related_type` en push, rutas de
tareas de candidato/reingreso) · `expo-doctor`: 20/21 (solo versiones patch
de Expo SDK desactualizadas, preexistente, no se tocó el stack a propósito).
