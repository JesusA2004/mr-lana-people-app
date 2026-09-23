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
