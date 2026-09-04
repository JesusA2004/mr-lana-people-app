# Mascota oficial — MR. LANA PEOPLE

Arte oficial de la mascota (oveja con traje, sombrero, monóculo, bastón y
moño verde), ya activo en la app:

```
assets/images/mascot/mascot-left.png   (827×1100, orientada hacia la izquierda)
assets/images/mascot/mascot-right.png  (827×1100, orientada hacia la derecha)
```

Consumido por `src/components/mascot/MascotAvatar.tsx` vía `require(...)`,
con `contentFit="contain"` y el ancho derivado de la relación de aspecto
real del PNG (827/1100) para nunca deformarla. No recortar, redimensionar
con distorsión ni cambiar colores de estos archivos.
