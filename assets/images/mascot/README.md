# Mascota oficial — MR. LANA PEOPLE

Esta carpeta debe contener las dos imágenes PNG oficiales de la mascota (oveja
elegante con traje, sombrero, monóculo, bastón y moño verde), tal cual se
describen en AGENTS.md sección 4:

```
assets/images/mascot/mascot-left.png   (mascota orientada hacia la izquierda)
assets/images/mascot/mascot-right.png  (mascota orientada hacia la derecha)
```

**Estado actual:** estos archivos todavía no fueron recibidos en este
repositorio (los dos PNG mencionados en el encargo no llegaron adjuntos a la
tarea que generó esta carpeta). Por eso `src/components/mascot/MascotAvatar.tsx`
usa temporalmente una insignia con emoji (🐑) en los colores de marca — **no**
es un rediseño de la mascota oficial, es un placeholder neutro para no romper
el build (Metro falla si se hace `require()` de un archivo que no existe).

## Cómo activar el arte oficial

1. Copia aquí `mascot-left.png` y `mascot-right.png` (tal cual, sin recortar,
   redimensionar con distorsión ni cambiar colores).
2. En `src/components/mascot/MascotAvatar.tsx`, cambia `MASCOT_ART_READY` a
   `true` y descomenta los `require(...)` señalados con `TODO(mascot-art)`.
3. Verifica en iOS/Android que la imagen se vea completa (contentFit="contain")
   en los tamaños `sm`/`md`/`lg` usados por `<MascotAssistant />`.
