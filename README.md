# BUNEMA TECHNOLOGY · Bunema X1

Experiencia web 3D de una marca **conceptual** de teléfonos. Proyecto de portafolio por Sebastián Jaimes.
BUNEMA y sus productos no existen comercialmente.

> Estado: **Fase 1 — Fundación y hero 3D**. La documentación completa llega en la Fase 7.

## Ejecutar en local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:host   # igual, pero accesible desde el móvil en la misma red Wi-Fi
npm run build      # genera dist/
npm run preview    # sirve dist/ en http://localhost:4173
```

## Stack

Vite · JavaScript (ES Modules) · Three.js · GSAP + ScrollTrigger · HTML5 · CSS3. Sin frameworks.
El teléfono se construye con geometrías programáticas: no hay modelos ni texturas externas.
