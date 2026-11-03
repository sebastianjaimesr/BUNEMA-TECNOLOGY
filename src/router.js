/**
 * Enrutador por hash (#/ruta). Es la opción robusta para GitHub Pages, que
 * no permite reescrituras de URL: cualquier enlace profundo funciona al
 * recargar o compartir. Cada página se carga con import() dinámico, así el
 * código de la ficha, el comparador o el 3D solo se descarga cuando se usa.
 */
const ROUTES = [
  { name: 'home', pattern: /^\/?$/, load: () => import('./pages/home.js') },
  { name: 'catalogo', pattern: /^\/catalogo\/?$/, load: () => import('./pages/catalog.js') },
  { name: 'iphone', pattern: /^\/iphone\/([\w-]+)\/?$/, load: () => import('./pages/product.js') },
  { name: 'comparar', pattern: /^\/comparar\/?$/, load: () => import('./pages/compare.js') },
  { name: 'galeria', pattern: /^\/galeria\/?$/, load: () => import('./pages/gallery.js') },
  { name: 'carrito', pattern: /^\/carrito\/?$/, load: () => import('./pages/cart.js') },
  { name: 'pedido', pattern: /^\/pedido\/([\w-]+)\/?$/, load: () => import('./pages/order.js') },
  { name: 'contacto', pattern: /^\/contacto\/?$/, load: () => import('./pages/contact.js') },
  { name: 'aviso-legal', pattern: /^\/aviso-legal\/?$/, load: () => import('./pages/legal.js') },
];

export function parseHash(hash = location.hash) {
  const raw = hash.startsWith('#/') ? hash.slice(1) : '/';
  const [path, query = ''] = raw.split('?');
  return { path, query: new URLSearchParams(query) };
}

export function match(path) {
  for (const route of ROUTES) {
    const m = path.match(route.pattern);
    if (m) return { route, params: m.slice(1) };
  }
  return { route: { name: '404', load: () => import('./pages/notFound.js') }, params: [] };
}

export function navigate(path) {
  location.hash = path.startsWith('#') ? path : `#${path}`;
}

/** Actualiza la consulta (?a=b) sin volver a renderizar la página. */
export function replaceQuery(params) {
  const { path } = parseHash();
  const q = params.toString();
  history.replaceState(null, '', `#${path}${q ? `?${q}` : ''}`);
}
