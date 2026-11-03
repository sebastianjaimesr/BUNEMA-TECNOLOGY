# Fotografías de producto

Estructura: una carpeta por modelo, con el mismo `id` que usa `src/data/iphones.js`.

```
assets/images/
  iphone-18-pro-max/  front.webp  back.webp  side.webp  galeria-01.webp …
  iphone-18-pro/
  iphone-17-pro/
  …
```

- Formato WebP (o AVIF), lado mayor ≤ 1600 px, sin marcas de agua.
- Solo imágenes con permiso de uso (por ejemplo, recursos de prensa de Apple Newsroom según sus condiciones).
- Tras copiar los archivos, registra la ruta en el panel (`admin.html` → Imágenes y 3D) y publica `store.json`.

El estado de cada recurso está en `docs/RECURSOS-PENDIENTES.md`.
