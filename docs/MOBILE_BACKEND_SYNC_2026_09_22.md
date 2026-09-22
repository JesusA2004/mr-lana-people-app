# Sincronización móvil ↔ backend — 22/09/2026 (ciclo laboral completo)

> **Fuente de verdad vigente.** Este documento SUPERA a `BACKEND_GAPS_FINAL.md`,
> `BACKEND_SYNC_2026_09_15.md`, `BACKEND_REQUIREMENTS_V4.md` y cualquier otro
> documento móvil anterior en todo lo que contradiga. Auditado contra el código
> real de `capacitaciones` (`routes/api.php`, `Api\V1\*`, FormRequests
> `CicloLaboral\*`, Services, Policies, `RolesYPermisosSeeder`) en el commit `5bf290f`.

## 1. Matriz de módulos

| Módulo | Endpoint real | Usuario | Cliente API | Hook | Pantalla | Estado |
|---|---|---|---|---|---|---|
| Alta propia | `GET colaborador/alta` | Colaborador | `cicloLaboralApi.alta` | `useMiAlta` | Inicio (stepper) | Completo |
| Estado documental | `GET colaborador/expediente` | Colaborador | `cicloLaboralApi.expediente` | `useMiExpediente` | Tab Expediente | Completo |
| Pendientes por cargar/firmar | `GET colaborador/documentos-pendientes` | Colaborador | `cicloLaboralApi.documentosPendientes` | `useDocumentosPendientes` | Inicio | Completo |
| Documentos laborales | `GET colaborador/documentos-laborales`, `…/{id}/descargar`, `POST …/{id}/firmar` | Colaborador | `documentosLaboralesApi` | `useLaborDocumentsInfinite`, `useLaborDocument`, `useFirmarDocumentoLaboral` | `documentos-laborales/index`, `[id]` | Completo (reescrito: el contrato anterior era imaginario) |
| Contratos | `GET colaborador/contratos` | Colaborador | `cicloLaboralApi.contratos` | `useMisContratos` | `contratos` | Completo |
| Recibos internos | `GET colaborador/recibos[/{id}[/pdf]]` | Colaborador | `recibosApi` | `useMisRecibos`, `useMiRecibo` | `recibos/index`, `[id]` | Completo |
| Préstamos | `GET colaborador/prestamos[/{id}]` | Colaborador | `prestamosApi` | `useMisPrestamos`, `useMiPrestamo` | `prestamos/index`, `[id]` | Completo |
| Jerarquía | `GET colaborador/jerarquia` | Colaborador | `cicloLaboralApi.jerarquia` | `useMiJerarquia` | `jerarquia` | Completo |
| Mi equipo / visto bueno | `GET equipo`, `GET equipo/pendientes`, `POST equipo/solicitudes/{id}/visto-bueno` | Jefe (jerarquía real) | `equipoApi` | `useEquipo`, `useEquipoPendientes`, `useVistoBueno` | `equipo` (compartida) | Completo |
| Evaluaciones | `GET evaluaciones[/{id}]`, `POST …/capturar|autorizar|devolver` | Jefe / RH / Dirección | `evaluacionesApi` | `useEvaluaciones`, `useEvaluacion`, `useCapturar/Autorizar/DevolverEvaluacion` | `evaluaciones/index`, `[id]` (compartidas) | Completo |
| Tareas | `GET tareas`, `POST tareas/{id}/leer|resolver` | Todos | `tareasApi` | `useTareas`, `useTareasConteos`, `useLeer/ResolverTarea` | `tareas` (compartida) | Completo |
| Solicitudes / vacaciones / permisos / préstamo | `solicitudes*` (unificadas) | Colaborador | existente | existente | existentes | Completo (sin cambios; tipo `prestamo` confirmado) |
| Alta RH (checklist/activar/jerarquía/contratos) | `GET rh/colaboradores/{id}/alta|jerarquia|contratos`, `POST …/activar` | RH | `rhAltaApi` | `useRhAlta`, `useRhActivarColaborador`, … | `rh/colaboradores/[id]` (secciones lazy) | Completo |
| Alta nueva / contratar candidato | `POST rh/colaboradores`, `POST rh/candidatos/{id}/contratar` | RH | — | — | — | **No expuesto** (ver §6, G-2) |
| Documentos laborales RH | `rh/documentos-laborales*` (listado, pendientes, detalle, descargar, imprimir, firma-fisica, envio, recepcion, escaneo, archivar, cancelar) | RH | `rhDocumentosLaboralesApi` | `useRhDocumentosLaborales…`, `useRhOperarDocumentoLaboral` | `rh/documentos-laborales/index`, `[id]` | Completo |
| Generar documento laboral | `POST rh/colaboradores/{id}/documentos-laborales` | RH | — | — | — | **No expuesto** (ver §6, G-3) |
| Contratos por vencer | `GET rh/contratos/por-vencer?dias` | RH | `rhContratosApi` | `useRhContratosPorVencer` | `rh/contratos/por-vencer` | Completo |
| Cierres / finiquito | `rh/cierres*`, `POST rh/colaboradores/{id}/cierres` | RH | `rhCierresApi` | `useRhCierres`, `useRhCierre`, `useRhIniciarCierre`, `useRhOperarCierre` | `rh/cierres/index`, `[id]`, `nuevo` | Completo |
| Recibos RH | `rh/recibos*`, `POST rh/colaboradores/{id}/recibos`, `POST rh/recibos/importar` | RH | `rhRecibosApi` | `useRhRecibos`, `useRhRecibo`, `useRhCrearRecibo`, `useRhImportarRecibos`, `useRhRegenerarReciboPdf` | `rh/recibos/index`, `[id]`, `nuevo`, `importar` | Completo |
| Préstamos RH | `rh/prestamos*`, `POST rh/solicitudes/{id}/prestamo/autorizar|rechazar` | RH / Dirección | `rhPrestamosApi` | `useRhPrestamos`, `useRhPrestamo`, `useRhOperarPrestamo`, `useRhDecidirPrestamo` | `rh/prestamos/index`, `[id]`, `PrestamoDecision` en `rh/solicitudes/[id]` | Completo · autorizar bloqueado por G-4 |
| Actas | `rh/actas*`, `POST rh/colaboradores/{id}/actas` | RH | `rhActasApi` | `useRhActas`, `useRhActa`, `useRhGuardarActa`, `useRhOperarActa` | `rh/actas/index`, `[id]`, `editar` | Completo |
| Plantilla / cobertura | `GET rh/plantilla/cobertura` | RH | `rhEstructuraApi.cobertura` | `useRhCobertura` | `rh/plantilla` | Completo |
| Indicadores | `GET rh/indicadores` | RH / Dirección | `rhEstructuraApi.indicadores` | `useRhIndicadores` | `rh/indicadores` | Completo |
| Organigrama personas | `GET rh/organigrama` | RH | `rhEstructuraApi.organigrama` | `useRhOrganigramaPersonas` | `rh/organizacion` (vista Personas) | Completo |
| Organigrama puestos | `GET rh/jerarquia-puestos` | RH | existente | existente | `rh/organizacion` (vista Puestos) | Completo (misma implementación) |
| Vacantes | `GET rh/vacantes`, `GET rh/vacantes/{id}` | RH | existente + `rhEstructuraApi.vacante` | `useRhVacante` | `rh/vacantes/index`, `[id]` | Completo (solo lectura) |
| Plantillas documentales | `GET rh/plantillas-documentales` | RH / Jurídico | `rhEstructuraApi.plantillasDocumentales` | `useRhPlantillasDocumentales` | `rh/plantillas-documentales` | Consulta. Carga DOCX = Portal RH (decisión) |
| Formatos legacy | `rh/formatos*` | RH | existente | existente | existente | Sin cambios (experimental, fail-closed) |
| Cumpleaños | existente | Todos | existente | existente | existente | Intacto |

## 2. Permisos y visibilidad (`src/utils/modules.ts`)

`mobile/bootstrap` **no** envía features para los módulos del ciclo laboral. Regla aplicada:

1. Feature explícito en bootstrap (`true`/`false`) → manda.
2. Autoservicio del colaborador (documentos, contratos, recibos, préstamos, jerarquía, tareas, equipo, evaluaciones) → visible: el backend acota todo a la sesión y no existe permiso Spatie para "lo propio".
3. Operación RH → visible solo con el permiso que exige el endpoint:

| Módulo RH | Permiso(s) |
|---|---|
| Documentos laborales | `documentos_laborales.ver` (operar: `documentos_laborales.operar_fisico`, cancelar: `documentos_laborales.cancelar`) |
| Contratos por vencer | `contratos.ver` |
| Evaluaciones | `evaluaciones.ver` / `evaluaciones.autorizar` |
| Cierres | `cierres.ver` (gestionar `cierres.gestionar`, baja `cierres.ejecutar_baja`, pago `finiquitos.confirmar_pago`, cálculo `finiquitos.calcular`, revisión `finiquitos.revisar`) |
| Recibos | `nomina.recibos.ver` (crear `nomina.recibos.crear`, importar `nomina.recibos.importar`) |
| Préstamos | `prestamos.ver` (autorizar `prestamos.autorizar`, resguardar `prestamos.resguardar`) |
| Actas | `actas.ver` (crear `actas.crear`, gestionar `actas.gestionar`) |
| Plantilla | `headcount.ver` · Indicadores `indicadores.ver` · Organigrama `organigrama.ver` · Plantillas `plantillas_documentales.ver` · Activar alta `colaboradores.activar` |

"Mi equipo" aparece solo si `GET /equipo` o `/equipo/pendientes` devuelven datos (jerarquía real, nunca nombre de rol).

Las guardas de estado que controlan qué botón se ofrece (`utils/laborDocuments.ts`, `utils/cierre.ts`, `utils/evaluation.ts`, `utils/loan.ts`, `utils/acta.ts`, `utils/alta.ts`) replican EXACTAMENTE las de los Services del backend solo para no mostrar botones que fallarían; el backend sigue siendo la autoridad (403/422).

## 3. Feature flags — decisión por módulo

| Flag / módulo | Antes (15/09) | Ahora |
|---|---|---|
| `documentos_laborales` | fail-closed (endpoint no existía) | Visible salvo `false` explícito |
| contratos, recibos, préstamos, jerarquía, equipo, evaluaciones, tareas | no existían | Visibles salvo `false` explícito |
| Módulos RH nuevos | no existían | Permiso real (+ `rh_*` explícito si el backend lo agrega) |
| `formatos`, `document_extraction` | fail-closed | Sin cambio (siguen sin flag y con contrato parcial) |
| `organigrama` | permiso `puestos.administrar` | Igual para puestos; personas por `organigrama.ver` |

## 4. Push routing (`src/utils/appLinks.ts`)

Tipos reales emitidos por `NotificadorRhService::notificar()` (payload `type`, `resource_id`, `related_type`, `accion`):

| `type` | Destino | Experiencia |
|---|---|---|
| `documento_firma_pendiente` | `/documentos-laborales/{id}` | Mi espacio |
| `recibo_nomina` | `/recibos/{id}` | Mi espacio |
| `prestamo_autorizado` | `/prestamos/{id}` | Mi espacio |
| `expediente_incompleto` | tab Expediente | Mi espacio |
| `alta_activada` | Inicio | Mi espacio |
| `visto_bueno_pendiente` | `/equipo` | Compartida |
| `evaluacion_pendiente`, `evaluacion_devuelta`, `evaluacion_capturada` | `/evaluaciones/{id}` | Compartida |
| `contrato_por_vencer` | `/rh/contratos/por-vencer` | Gestión RH |

Cold start soportado (mismo `PendingPushNavigationController`). Si la ruta es de Gestión RH y la cuenta ya no puede usarla, cae en `/notificaciones` (antes quedaba colgada). El centro de notificaciones y la bandeja de tareas usan el mismo mecanismo (`utils/crossNavigation.ts`) para abrir rutas del otro árbol. Invalidación por tipo: `utils/pushInvalidation.ts`.

**Notificaciones vs tareas:** la campana cuenta avisos (`counts.notifications`); la card "Pendientes por atender" y la bandeja cuentan tareas (`meta.conteos` de `/tareas`). No se suman ni se duplican.

## 5. Otros cambios transversales

- **422 por plantilla faltante** (`errors.plantilla`) → mensaje "Este documento todavía no tiene una plantilla configurada…" + detalle real del backend (`utils/errors.ts`). Préstamos: `pendientes[]` de `generarDocumentos` se muestra igual.
- **Mutaciones sensibles** (firmar, visto bueno, autorizar, activar, pagar, baja…) con `networkMode: 'always'`: sin conexión fallan de inmediato; nunca se difieren ni simulan (`hooks/queries/queryOptions.ts`).
- **Invalidación granular** por evento (`hooks/queries/cicloInvalidate.ts`).
- **Bug corregido:** fechas `YYYY-MM-DD` se mostraban un día antes en México (UTC) — `utils/dates.ts`.
- **Visor seguro** reutilizado para todos los PDF (Bearer → HEAD → descarga a caché temporal → borrado al cerrar). Recibos con `tiene_pdf=false` no ofrecen botón.
- `OrganizationTreeNode` generalizado: una sola implementación para puestos y personas.

## 6. Gaps REALES de backend

| # | Endpoint | Problema | Archivo responsable | Cambio mínimo |
|---|---|---|---|---|
| G-1 | `GET /mobile/bootstrap` | `capabilities.rh` = `can('rh.pendientes.ver')`; los roles `direccion` y `juridico` no lo tienen, así que **no pueden entrar a Gestión RH en la app** aunque tengan `prestamos.autorizar`, `indicadores.ver`, `documentos_laborales.ver`, etc. (Sí pueden autorizar evaluaciones y usar Tareas desde Mi espacio.) Tampoco envía features ni `counts.tasks` real (`tasks => 0`). | `app/Services/Mobile/MobileBootstrapService.php` (`capabilities()`, `counts()`) | `'rh' => $usuario->can('rh.pendientes.ver') \|\| $usuario->canAny(['indicadores.ver','documentos_laborales.ver','prestamos.autorizar','evaluaciones.autorizar','cierres.ver'])` y `'tasks' => app(TareaService::class)->conteos($usuario)['abiertas']`. |
| G-2 | `POST /rh/colaboradores`, `POST /rh/candidatos/{id}/contratar` | Requieren `sucursal_principal_id`, `puesto_id`, `departamento_id`, `jefe_id`, `candidato_id`, pero la API v1 **no expone catálogos** de sucursales, puestos, departamentos ni candidatos. No se hardcodean IDs: el alta sigue en el Portal RH. | `routes/api.php` | Agregar `GET /api/v1/rh/catalogos` (sucursales/departamentos/puestos en alcance) y `GET /api/v1/rh/candidatos?estado=`. |
| G-3 | `POST /rh/colaboradores/{id}/documentos-laborales` | Requiere `clave`/`plantilla_id` y `extra` libres; sin un endpoint que diga qué claves aplican a un colaborador/contrato ni qué variables `extra` requiere cada plantilla, generar desde móvil sería adivinar. `GET plantillas-documentales/variables` lista variables globales, no por plantilla. | `PlantillaDocumentalController` | Exponer por plantilla `variables_requeridas`. Mientras tanto se genera en Portal RH (móvil muestra y opera lo generado). |
| G-4 | `GET /rh/solicitudes/{id}` | No serializa `monto_solicitado`, `plazo_solicitado` ni los vistos buenos. "Autorizar préstamo" queda **bloqueado** en móvil (no se autoriza a ciegas); "Rechazar préstamo" sí funciona. Se desbloquea solo en cuanto el backend mande `monto_solicitado`. | `app/Http/Controllers/Api/V1/Rh/SolicitudController.php::show()` | Agregar `'monto_solicitado' => $solicitud->monto_solicitado, 'plazo_solicitado' => …, 'visto_bueno' => app(AprobacionJerarquicaService::class)->decisionJefe($solicitud)?->decision`. |
| G-5 | `GET /colaborador/documentos-laborales/{id}` | No existe detalle por id para el colaborador ni su bitácora. La app busca el documento en la caché/listado (hasta 20 páginas). | `CicloLaboralColaboradorController` | `show(GeneratedDocument $documento)` con `authorize('ver')` y `aArray($d, false)`. |
| G-6 | `GET /notificaciones` | `NotificacionesService::aArray()` expone `data.type`/`resource_id` pero no `related_type`/`accion` (sí se guardan en BD). | `app/Services/Colaboradores/NotificacionesService.php` | Agregar ambos a `data`. |
| G-7 | App Links HTTPS | No existen `public/.well-known/assetlinks.json` ni `apple-app-site-association`. La app ya declara `intentFilters` (`autoVerify`) y `associatedDomains` para `https://people.mr-lana.com/incorporacion/qr/{token}`; la apertura automática por HTTPS queda bloqueada por verificación de dominio. El scheme `mrlanapeopleapp://` sigue funcionando. | backend `public/.well-known/` | Publicar ambos archivos con el SHA-256 real del keystore de EAS y el Team ID real (no se inventan aquí). |
| G-8 | `GET /rh/cierres` | No acepta `colaborador_id` (actas, préstamos y recibos sí). | `CierreLaboralService::listar()` | Añadir filtro `colaborador_id`. |

## 7. Módulos no expuestos y por qué

- **Alta de colaborador / contratar candidato**: G-2.
- **Generar documento laboral manual**: G-3.
- **Carga/versionado de plantillas DOCX**: administración técnica; solo consulta en móvil.
- **Edición de vacantes**: la API no la soporta.
- **Movimientos del préstamo (ledger)**: la API no expone escritura; se muestran como "Control administrativo".

## 8. Checklist de integración contra la API REAL

Preparar cuentas: colaborador en alta, colaborador activo con jefe, jefe (`jefe_directo`), `rh_admin`, `direccion`, `juridico`.

**Colaborador:** login → bootstrap · Inicio muestra stepper de alta con estado real · subir documento → estado documental cambia · documento rechazado muestra motivo · Documentos laborales: por firmar, abrir PDF, marcar "Leí y acepto", firmar → estado `firmado_digitalmente` o `pendiente_impresion` · Mis contratos (días para vencer del backend) · Mis recibos (PDF solo si existe; "NO FISCAL") · Solicitud tipo Préstamo interno → aparece en Mis solicitudes; tras autorizar aparece en Mis préstamos · Vacaciones / permiso con y sin goce por Solicitudes · Mi jerarquía · Tareas · Notificaciones y push `documento_firma_pendiente`, `recibo_nomina`, `prestamo_autorizado` (incluye app cerrada).

**Jefe:** Mi equipo lista subordinados · visto bueno / no visto bueno de un préstamo (`visto_bueno_pendiente`) · evaluación pendiente → capturar criterios → estado `capturada` · evaluación devuelta → corregir.

**RH:** Dashboard con módulos según permisos · Pendientes · colaborador → secciones lazy (Alta, Contratos, Documentos, Jerarquía) · activar solo en `pendiente_activacion` · Documentos laborales por etapa: imprimir → firma física (huella/testigos si aplica) → envío (paquetería, guía, comprobante) → recepción → escaneo → archivar · Contratos por vencer → evaluación · autorizar/devolver evaluación (renovar / no renovar → cierre) · Cierre: iniciar → aviso → calcular → conceptos → revisar → generar → firmado → pago → baja → cerrar expediente · Recibos: individual, simular importación con errores, importar, regenerar PDF · Préstamos: rechazar; generar documentos (plantilla faltante muestra aviso); resguardar tras firmas · Actas: crear borrador (3 pasos), anexo, generar formato, negativa, seguimiento, cerrar · Plantilla, Indicadores, Organigrama (personas/puestos), Vacante detalle, Plantillas documentales.

**Dirección / Jurídico:** evaluaciones y tareas desde Mi espacio; confirmar G-1 (sin acceso a Gestión RH).

**Errores:** 401 cierra sesión · 403 oculta el módulo al refrescar bootstrap · 404 "ya no disponible" · 422 por campo y por plantilla · 429 · modo avión: firmar/autorizar fallan con mensaje de red y no se ejecutan después.
