# Arquitectura de la tienda BUNEMA

> La tienda de iPhone es la página principal del sitio (`index.html`). El concepto Bunema X1 vive en `bunema-x1.html`; su arquitectura está en el README.

## 1. Situación actual (sitio estático en GitHub Pages)

| Capa | Implementación | Límite honesto |
| --- | --- | --- |
| Interfaz | Vite + JavaScript modular, sin framework. Página `index.html` con enrutador por hash (`#/ruta`) porque Pages no admite reescrituras de URL. | Las rutas internas no se indexan como páginas separadas. |
| 3D | Three.js (`src/three/`). Un visor reutilizable con controles táctiles, renderizado bajo demanda y recuperación de contexto WebGL. | Modelo paramétrico ilustrativo hasta tener `.glb` con licencia. |
| Animación | GSAP + ScrollTrigger (`src/animations/`), contexto por página que se revierte al salir. | — |
| Especificaciones | `src/data/iphones.js`, fuente única verificada con Apple Colombia. | Se actualiza con un cambio de código (o «Agregar iPhone» en el panel). |
| Datos de negocio | `public/data/store.json` (precios, inventario, canales, fotos, productos añadidos). | Lo publica quien tenga acceso al repositorio. |
| Panel | `admin.html`. Borrador en `localStorage`, exportación/importación de `store.json`. | PIN solo en el navegador: **no es autenticación segura**. Un solo editor a la vez. |
| Carrito / pedidos / consultas | `localStorage` del cliente; envío por WhatsApp, correo o endpoint HTTP configurable. | La tienda no ve los pedidos de otros navegadores salvo que lleguen por un canal. |
| Pagos | `src/services/payment/paymentGateway.js`: contrato preparado, `isConfigured() === false`. | No hay cobros ni pagos simulados. |

Flujo de publicación de datos: panel → «Descargar store.json» → reemplazar `public/data/store.json` en `main` → GitHub Actions despliega.

## 2. Arquitectura propuesta para operación real

```
Navegador (este frontend)
   │  HTTPS (JSON)
   ▼
API (Node.js + Fastify/Express, o funciones serverless)
   ├─ Auth: correo + contraseña o enlace mágico, sesiones httpOnly, roles (admin, ventas)
   ├─ /products, /inventory   (CRUD protegido; lectura pública)
   ├─ /orders                 (crear público; gestionar protegido)
   ├─ /inquiries
   ├─ /uploads                (firma de subida a almacenamiento de objetos)
   └─ /payments/webhook       (confirmación del proveedor de pago)
   │
   ├─ PostgreSQL (productos, variantes, inventario, pedidos, clientes, auditoría)
   └─ Almacenamiento de objetos (S3, Cloudflare R2 o Supabase Storage) para fotos y .glb
```

Opción rápida y económica: **Supabase** (PostgreSQL + Auth + Storage + Row Level Security) con funciones Edge para el webhook de pago. El frontend sigue en GitHub Pages; solo cambian los servicios:

- `services/storeService.js` → `GET /api/store` en lugar de `store.json`.
- `services/orderService.js` → `POST /api/orders` y estado real.
- `services/contactService.js` → `POST /api/inquiries` (ya existe el campo `contactEndpoint`).
- `admin/main.js` → iniciar sesión con la API y guardar en lugar de exportar.

### Modelo de datos mínimo

- `products(id, name, generation, family, year, apple_status, specs jsonb, source_url)`
- `variants(sku, product_id, storage_gb, color_id, condition, price_cop, stock, availability, notes)`
- `orders(id, created_at, status, customer jsonb, total_cop, payment_status)` · `order_items(order_id, sku, qty, unit_price_cop)`
- `inquiries(id, created_at, name, phone, email, model_id, message)`
- `media(id, product_id, kind, url, license_note)`

## 3. Pasarela de pago colombiana

Proveedores contemplados en `SUPPORTED_PROVIDERS`: **Wompi** (Bancolombia), **ePayco**, **Mercado Pago Colombia**. Todos requieren una clave privada o una firma de integridad que **no puede estar en un sitio estático**.

Flujo previsto:
1. El cliente confirma el pedido → `POST /api/orders` (precios recalculados en el servidor, nunca los del navegador).
2. La API crea la transacción con la clave privada y devuelve la URL de pago (`createCheckout(order) → { redirectUrl }`).
3. El proveedor notifica por webhook → la API verifica la firma y marca el pedido como pagado.
4. El frontend muestra el estado consultando la API.

Requisitos adicionales: cuenta empresarial en el proveedor, términos y condiciones, política de tratamiento de datos (Ley 1581 de 2012) y facturación electrónica ante la DIAN si aplica.
