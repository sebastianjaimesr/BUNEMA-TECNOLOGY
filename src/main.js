import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

import { gsap } from 'gsap';
import { parseHash, match } from './router.js';
import { SITE } from './config/site.config.js';
import { loadStore, hasDraft, onStoreChange } from './services/storeService.js';
import { getCart, onCartChange } from './services/cartService.js';
import { initHeader, setActiveNav } from './components/header.js';

/**
 * Punto de entrada de la tienda: carga los datos de negocio, prepara la
 * cabecera y delega cada ruta en su página (cargada bajo demanda).
 */
const app = document.getElementById('app');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let current = null; // { dispose }
let renderId = 0;
let lastPath = null;

function updateCartBadge() {
  const { count } = getCart();
  const badge = document.querySelector('[data-cart-count]');
  const link = document.querySelector('[data-cart-link]');
  badge.textContent = String(count);
  badge.hidden = count === 0;
  link.setAttribute('aria-label', `Carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`);
}

function updateDraftBanner() {
  document.querySelector('[data-draft-banner]').hidden = !hasDraft();
}

async function render() {
  const { path, query } = parseHash();
  // Un hash sin "#/" (p. ej. el enlace para saltar al contenido) no cambia de página.
  if (location.hash && !location.hash.startsWith('#/')) return;
  // Cambios solo de consulta (?filtros) en la misma página: la página los maneja.
  if (path === lastPath && current?.onQuery) {
    current.onQuery(query);
    return;
  }
  lastPath = path;
  const id = ++renderId;
  const { route, params } = match(path);
  setActiveNav(route.name, params);
  document.documentElement.dataset.route = route.name;

  let mod;
  try {
    mod = await route.load();
  } catch (error) {
    console.error(error);
    app.innerHTML = `<section class="page page--narrow"><h1>No se pudo cargar esta sección</h1><p>Revisa tu conexión y vuelve a intentarlo.</p><a class="btn btn--primary" href="#/">Volver al inicio</a></section>`;
    return;
  }
  if (id !== renderId) return; // el usuario ya navegó a otra ruta

  current?.dispose?.();
  current = null;
  app.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'instant' });
  const page = await mod.render({ root: app, params, query });
  if (id !== renderId) {
    page?.dispose?.();
    return;
  }
  current = page || null;
  document.title = page?.title ? `${page.title} · BUNEMA` : 'BUNEMA — Tienda de iPhone en Colombia';
  const desc = document.querySelector('meta[name="description"]');
  if (page?.description) desc.setAttribute('content', page.description);
  if (!reduced) gsap.fromTo(app, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
  // Foco al contenido nuevo para lectores de pantalla (sin desplazar la vista).
  if (renderId > 1) app.focus({ preventScroll: true });
}

async function boot() {
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));
  document.querySelectorAll('[data-disclaimer]').forEach((el) => (el.textContent = SITE.disclaimer));
  document.querySelector('[data-skip]').addEventListener('click', (e) => {
    e.preventDefault();
    app.focus();
  });
  initHeader();
  await loadStore();
  updateCartBadge();
  updateDraftBanner();
  onCartChange(updateCartBadge);
  onStoreChange(() => {
    updateDraftBanner();
    updateCartBadge();
  });
  window.addEventListener('storage', () => {
    updateCartBadge();
    updateDraftBanner();
  });
  window.addEventListener('hashchange', render);
  await render();
  document.documentElement.classList.add('is-ready');
}

boot();
