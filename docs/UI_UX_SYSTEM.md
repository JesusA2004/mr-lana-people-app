# Sistema de UI/UX

## Tokens (`src/constants/colors.ts`)

- `Colors` se resuelve **una vez al arrancar** según el tema del sistema
  (claro/oscuro). Cambiar el tema con la app abierta se aplica al reabrirla.
  `_layout.tsx` fija además Alert/pickers/teclado al mismo esquema.
- Nunca colores literales en componentes normales. Excepciones permitidas:
  cámara (`escanear-qr`), visor de documentos (fondo negro), texto sobre
  color sólido (`Colors.white`).
- `Spacing` (4–48), `Radius` (8–24), `FontSize` (12–30), `Shadow` (3 niveles).
- `Layout.maxContentWidth` 720 · `Layout.maxFormWidth` 560 ·
  `Layout.twoColumnBreakpoint` 600 · `Layout.minTouchTarget` 44.

## Identidad

- **Mr. Lana** (marca general): logos en `assets/images/brand/`.
- **Gestión RH**: `RhIdentityBadge` (squircle `rhInk`, grupo de personas,
  nodo `rhAccent`, halo). Tamaños `xs 24 · sm 32 · md 48 · lg 64 · hero 96`.
  `animated` solo en `lg`/`hero` y se apaga con Reducir movimiento. Sin
  `accessibilityLabel` es decorativo. Nunca oveja, caras ni emoji.
- Se usa en: selector de experiencia, header del dashboard RH, Configuración.

## Componentes base

| Componente | Uso |
|---|---|
| `Screen` (ciclo) | Header + pull-to-refresh + skeleton + error + 404 amable; centra el contenido (`form` para 560 px). |
| `ResponsiveContent` | Centrar contenido en pantallas que no usan `Screen`. |
| `Button` | Mín. 52 px de alto; el texto baja a 2 líneas en vez de cortarse. Outline/ghost usan `primaryDark` (contraste). |
| `EmptyState` | Estado vacío sobrio (ícono + mensaje + acción opcional). |
| `Notice` | Avisos info/success/warning/danger. |
| `StatusBadge` | Estado con ícono + texto (nunca solo color). |
| `SkeletonBlock` | Carga con pulso; estático con Reducir movimiento. |
| `confirmAction()` | Confirmación antes de cualquier acción sobre documentos/trámites. |

## Movimiento

`src/constants/motion.ts`: press 100 ms, fast 150, base 220. Selector de
experiencia: fade + deslizamiento corto + scale al presionar. Todo respeta
Reducir movimiento (`useReducedMotion` o animaciones de layout de Reanimated).

## Reglas de pantalla

- Acción principal obvia (un botón primario por bloque).
- Nada de card dentro de card dentro de card.
- Estados vacíos y skeletons en toda lista.
- Botones de ícono con `accessibilityLabel` y 44 px de área.
- Filas de acciones con `flexWrap` para 320 px.

## Design QA

Con `SHOW_DEV_TOOLS`: Configuración → Herramientas QA → **Design QA**
(componentes en el tema actual + ambas paletas lado a lado, textos largos,
botones largos).

## Descarga de documentos (PDF y demás)

Regla: todo documento que se pueda ver en la app también se puede **descargar o abrir con otra app** cuando el backend lo autoriza (`allowDownload` / `puede_descargar`), sobre todo si la vista previa no funciona en ese teléfono.

| Pieza | Uso |
|---|---|
| `DescargaDocumento` (`src/components/DescargaDocumento.tsx`) | Tarjeta (`variante="tarjeta"`) o pantalla (`"pantalla"`) con nombre, tipo, tamaño, botón grande «Descargar PDF», «Abrir con…», progreso de descarga y error legible. Recibe `path` (ruta relativa de la API) o `archivoLocal` (archivo ya descargado). |
| `BarraDescargaDocumento` | Las mismas dos acciones como `BarraAccionInferior` (safe area) debajo de un visor que sí previsualizó. |
| `useDescargaDocumento` (`src/hooks/useDescargaDocumento.ts`) | Lógica: descarga autenticada (`File.createDownloadTask` con `Authorization: Bearer`, directo a `Paths.cache`, `onProgress`), detección de tipo por firma binaria, guardar y abrir. |
| `utils/descargaDocumento.ts` | Puras y probadas: `formatearTamano`, `nombreArchivoSeguro`, `tipoLegible`, `mensajeErrorDescarga` (401/403/404/413/5xx/red). |

- **Descargar** — Android: el usuario elige la carpeta (`Directory.pickDirectoryAsync()`, Storage Access Framework, sin permisos de almacenamiento) y se escribe la copia con su MIME real. iOS: sheet nativo (`Sharing.shareAsync` con UTI) → «Guardar en Archivos».
- **Abrir con…** — Android: `IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: file.contentUri, flags: 1, type })` (permiso de lectura temporal). iOS: sheet nativo («Abrir en…»).
- Nunca una URL pública del NAS ni el token en la URL; las copias temporales se borran al cerrar el visor y, por si acaso, en el logout (`clearPrivateAssetCache`, prefijo `mrlana-doc-`).
- `SecureDocumentViewer` ya lo integra: si el PDF no se puede dibujar (pdf.js/WKWebView) o el tipo no tiene vista previa, cambia solo a `DescargaDocumento` en modo pantalla. Documentos internos de RH (`allowDownload={false}`) nunca ofrecen descarga.

```tsx
<DescargaDocumento titulo="Recibo de nómina 15/10/2026" path={recibosApi.pdfPath(id)} />
```


## Componentes base 2026-10 (`src/components/ui`)

Rediseño de Mi espacio (Inicio, Perfil, Mi expediente, Mis solicitudes,
Completa tu información, Cambiar domicilio, Notificaciones). Criterios
(Material 3 / iOS HIG): una jerarquía clara por pantalla (primero lo que
requiere acción de la persona, luego indicadores, luego accesos), áreas
táctiles ≥ 44 dp (filas ≥ 60 dp), estado = ícono + texto (nunca solo color),
estados vacíos que dicen qué pasa y qué hacer, skeletons en toda carga,
háptico ligero solo en tarjetas/accesos y en el control segmentado (las filas
de lista no vibran), `accessibilityLabel` en todo lo tocable y
`accessibilityRole="header"` en los títulos de sección. Colores SIEMPRE con
tokens (`coloresTono`), nunca hex.

Importa todo desde `@/components/ui`.

| Componente | Cuándo usarlo |
|---|---|
| `Tono` / `coloresTono(Colors, tono)` | `primario` (marca), `exito` (aprobado), `aviso` (falta algo de la persona), `peligro` (rechazado/corrección), `info` (esperando a otra persona/RH), `neutral`, `celebracion`. Devuelve `{ texto, fondo, borde }` de la paleta. |
| `IconoTono` | Ícono en squircle suave del tono (`solido` para el aviso más importante). Base visual de filas y tarjetas. |
| `Pill` | Chip de estado de solo lectura («En revisión», «Esperando jefe directo», «3 pendientes»). |
| `SeccionTitulo` | Encabezado de sección con descripción y acción opcional («Ver todas», ≥ 44 dp). |
| `GrupoLista` + `FilaLista` | Lista agrupada en una tarjeta (sin tarjeta dentro de tarjeta). La fila: ícono, título, subtítulo, y a la derecha `pill`, `badge` (contador, `99+`), `valor` y chevron si tiene `onPress`. Con `etiqueta` funciona como fila de dato («Puesto» → «Cajera»). `subtituloConTono` pinta el estado del color del tono. |
| `TarjetaAviso` | Aviso accionable de alta jerarquía: «Completa tu información», «Un documento necesita corrección», «Tus datos están en revisión». Sin `onPress` es solo informativa (no parece activa). Acepta `children` (p. ej. una línea de tiempo). |
| `TarjetaProgreso` | Hero de avance: sobretítulo, frase, porcentaje grande, barra animada y detalle. `porcentaje={null}` = sin barra. |
| `TarjetaResumen` | Indicador (stat tile): ícono, cifra grande, etiqueta, nota. Dos por fila (`flexDirection: 'row'`, cada una `flex: 1`). `destacada` para la cifra principal. |
| `AccesoRapido` + `RejillaAccesos` | Rejilla de 3 atajos con badge opcional. |
| `EncabezadoSaludo` | Encabezado de Inicio (avatar + saludo + nombre + puesto + acciones), con safe area superior. |
| `ControlSegmentado` | 2–4 filtros excluyentes («Todas | No leídas»). 44 dp, `accessibilityRole="tab"`, háptico de selección. |
| `porcentajeSeguro`, `textoConteo`, `textoBadge` | Utilidades puras (probadas en `ui/__tests__/tonos.test.ts`). |

Acciones de envío (Enviar a RH, Guardar, Subir documento): SIEMPRE en
`Screen footer` o `BarraAccionInferior` (safe area inferior + sube sobre el
teclado), nunca un botón suelto al final del scroll.

### Ejemplos para la bandeja de aprobaciones, préstamos y correcciones

```tsx
import { FilaLista, GrupoLista, Pill, TarjetaAviso, TarjetaResumen, ControlSegmentado } from '@/components/ui';

// Bandeja de aprobaciones: filtro + lista. El estado lo decide el backend
// (motor de aprobaciones); la app solo lo pinta.
<ControlSegmentado
  opciones={[{ valor: 'mi_turno', etiqueta: 'Me toca (3)' }, { valor: 'en_espera', etiqueta: 'En espera' }]}
  valor={filtro}
  onChange={setFiltro}
/>
<GrupoLista titulo="Por aprobar">
  {items.map((s) => (
    <FilaLista
      key={s.id}
      icono="airplane-outline"
      titulo={`${s.tipo_etiqueta} · ${s.solicitante}`}
      subtitulo={s.puede_actuar ? 'Te toca aprobar' : s.motivo_no_puede}   // «Esperando jefe directo»
      pill={s.puede_actuar ? { texto: 'Tu turno', tono: 'aviso' } : { texto: 'En espera', tono: 'info', icono: 'time-outline' }}
      onPress={() => abrir(s.id)}
    />
  ))}
</GrupoLista>

// Paso bloqueado: aviso informativo (sin onPress = no parece accionable) y
// el botón de aprobar deshabilitado con la nota en la barra inferior.
<TarjetaAviso icono="time-outline" tono="info" titulo="Pendiente de aprobación de Alberto Carlos Bueno"
  mensaje="RH podrá aprobar cuando Alberto Carlos Bueno dé su visto bueno." />
<Screen title="Solicitud" footer={<Button title="Aprobar" disabled onPress={aprobar} />}
  footerNota="Aún no es tu turno." />

// Préstamos: antigüedad y disponibilidad.
<View style={{ flexDirection: 'row', gap: Spacing.md }}>
  <TarjetaResumen icono="time-outline" valor="5 m 12 d" etiqueta="Antigüedad actual" />
  <TarjetaResumen icono="calendar-outline" valor="08/11/2026" etiqueta="Disponible desde" tono="aviso" />
</View>

// Estado de una corrección de datos/documentos.
<FilaLista icono="create-outline" titulo="Corrección de RFC" subtitulo="Enviada el 20/10/2026"
  pill={{ texto: 'En revisión', tono: 'info', icono: 'time-outline' }} onPress={...} />
// Estados → tono: enviada/en revisión = info · requiere información = aviso ·
// aprobada = exito · rechazada = peligro.
```
