import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/admin.css';

import { loadStore, getStore, getPublishedStore, saveDraft, discardDraft, hasDraft } from '../services/storeService.js';
import { getAllProducts, getProduct } from '../services/catalogService.js';
import { getOrders, updateOrderStatus, ORDER_STATUS } from '../services/orderService.js';
import { getInquiries } from '../services/contactService.js';
import { getStats } from '../services/statsService.js';
import { SUPPORTED_PROVIDERS } from '../services/payment/paymentGateway.js';
import { FAMILIES, GENERATIONS } from '../data/iphones.js';
import { esc, formatCOP, formatDate, storageLabel, CONDITIONS, AVAILABILITY } from '../services/format.js';
import { toast } from '../components/toast.js';
import { phoneSVG } from '../components/phoneArt.js';

/**
 * Panel administrativo (sitio estático).
 *
 * LÍMITES — se muestran también en la interfaz:
 *  - El PIN se comprueba en el navegador. Evita accesos casuales, NO es
 *    autenticación segura: cualquiera con conocimientos puede leer el código.
 *  - Los cambios se guardan como borrador en ESTE navegador. Para publicarlos a
 *    todos los visitantes se exporta `store.json` y se sustituye en
 *    `public/data/store.json` del repositorio (el despliegue es automático).
 *  - Los pedidos y consultas visibles son los creados en este navegador. Para
 *    ver los de todos los clientes hace falta el backend de docs/ARQUITECTURA.md.
 */
const app = document.getElementById('admin');
const SESSION = 'bunema.admin.session.v1';
let store;
let tab = 'resumen';
let invFilter = '';
let imgModel = '';

const sha256 = async (text) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`bunema:${text}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const isLogged = () => {
  try {
    return sessionStorage.getItem(SESSION) === (store.settings.adminPinHash || 'none');
  } catch {
    return false;
  }
};

function commit(message) {
  store.updatedAt = new Date().toISOString().slice(0, 10);
  const ok = saveDraft(store);
  if (!ok) toast('No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado.');
  else if (message) toast(message);
  draw();
}

/* ─────────────── Acceso ─────────────── */
function drawLogin() {
  const first = !store.settings.adminPinHash;
  app.innerHTML = `<main class="admin-login">
    <form class="panel admin-login__card" data-login novalidate>
      <p class="brand"><span class="brand__name">BUNEMA</span></p>
      <h1>Panel administrativo</h1>
      <p class="notice">Acceso local con PIN. En GitHub Pages no existe autenticación de servidor: el PIN solo evita accesos casuales y no protege datos sensibles. Para administración multiusuario segura, ver <code>docs/ARQUITECTURA.md</code>.</p>
      ${first ? '<p class="admin-muted">Aún no hay PIN configurado. Crea uno para este panel (mínimo 6 dígitos).</p>' : ''}
      <div class="field"><label for="pin">${first ? 'Nuevo PIN' : 'PIN'}</label><input id="pin" class="input" type="password" inputmode="numeric" autocomplete="${first ? 'new-password' : 'current-password'}" minlength="6" required /><p class="field__error" data-err aria-live="polite"></p></div>
      ${first ? '<div class="field"><label for="pin2">Repite el PIN</label><input id="pin2" class="input" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" required /></div>' : ''}
      <button class="btn btn--primary btn--block" type="submit">${first ? 'Crear PIN y entrar' : 'Entrar'}</button>
      <a class="link-arrow" href="./">Volver a la tienda</a>
    </form>
  </main>`;
  const form = app.querySelector('[data-login]');
  form.pin.focus();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = form.querySelector('[data-err]');
    const pin = form.pin.value.trim();
    if (pin.length < 6) return (err.textContent = 'El PIN debe tener al menos 6 caracteres.');
    if (first) {
      if (pin !== form.pin2.value.trim()) return (err.textContent = 'Los PIN no coinciden.');
      store.settings.adminPinHash = await sha256(pin);
      saveDraft(store);
    } else if ((await sha256(pin)) !== store.settings.adminPinHash) {
      return (err.textContent = 'PIN incorrecto.');
    }
    try {
      sessionStorage.setItem(SESSION, store.settings.adminPinHash);
    } catch {
      /* sin sessionStorage: la sesión dura lo que la pestaña */
    }
    draw();
  });
}

/* ─────────────── Estructura ─────────────── */
const TABS = {
  resumen: 'Resumen',
  productos: 'Productos',
  inventario: 'Inventario y precios',
  pedidos: 'Pedidos y consultas',
  imagenes: 'Imágenes y 3D',
  ajustes: 'Ajustes',
  publicar: 'Publicar',
};

function draw() {
  if (!isLogged()) return drawLogin();
  app.innerHTML = `<header class="admin-top">
      <p class="brand"><span class="brand__name">BUNEMA</span> <span class="admin-top__tag">Admin</span></p>
      <nav class="admin-tabs" aria-label="Secciones del panel">${Object.entries(TABS)
        .map(([k, l]) => `<button type="button" data-tab="${k}" aria-current="${k === tab ? 'page' : 'false'}">${l}</button>`)
        .join('')}</nav>
      <div class="admin-top__actions"><a class="btn btn--ghost btn--small" href="./" target="_blank" rel="noopener">Ver tienda</a><button type="button" class="btn btn--ghost btn--small" data-logout>Salir</button></div>
    </header>
    ${hasDraft() ? '<p class="admin-draft">Tienes cambios en borrador (solo en este navegador). Publícalos desde «Publicar».</p>' : ''}
    <main class="admin-main" data-view></main>`;
  const view = app.querySelector('[data-view]');
  ({ resumen, productos, inventario, pedidos, imagenes, ajustes, publicar })[tab](view);
}

app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]');
  if (t) {
    tab = t.dataset.tab;
    draw();
    window.scrollTo(0, 0);
  }
  if (e.target.closest('[data-logout]')) {
    try {
      sessionStorage.removeItem(SESSION);
    } catch {
      /* nada que borrar */
    }
    draw();
  }
});

/* ─────────────── Resumen / estadísticas ─────────────── */
function resumen(view) {
  const products = getAllProducts({ includeHidden: true });
  const inv = store.inventory;
  const stats = getStats();
  const top = (obj) =>
    Object.entries(obj || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, n]) => `<li><span>${esc(getProduct(id)?.name || id)}</span><strong>${n}</strong></li>`)
      .join('') || '<li class="admin-muted">Sin datos todavía.</li>';
  const orders = getOrders();
  const value = inv.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.stock) || 0), 0);
  view.innerHTML = `<h1 class="admin-h1">Resumen</h1>
    <ul class="kpis">
      <li><span>${products.length}</span>Modelos en catálogo</li>
      <li><span>${inv.length}</span>Artículos de inventario</li>
      <li><span>${inv.reduce((s, i) => s + (Number(i.stock) || 0), 0)}</span>Unidades en stock</li>
      <li><span>${value ? formatCOP(value) : '—'}</span>Valor del inventario</li>
      <li><span>${inv.filter((i) => !(Number(i.price) > 0)).length}</span>Artículos sin precio</li>
      <li><span>${orders.length}</span>Solicitudes (este navegador)</li>
    </ul>
    <div class="admin-cols">
      <section class="panel"><h2>Fichas más vistas</h2><ol class="rank">${top(stats.views)}</ol></section>
      <section class="panel"><h2>Más agregados al carrito</h2><ol class="rank">${top(stats.cart)}</ol></section>
    </div>
    <p class="notice notice--info">Estadísticas locales: cuentan solo la actividad en este navegador. Para estadísticas de todos los visitantes conecta una herramienta de analítica o el backend propuesto.</p>`;
}

/* ─────────────── Productos ─────────────── */
function productos(view) {
  const products = getAllProducts({ includeHidden: true });
  view.innerHTML = `<div class="admin-head"><h1 class="admin-h1">Productos</h1><button type="button" class="btn btn--primary btn--small" data-new>Agregar iPhone</button></div>
    <p class="admin-muted">Las especificaciones de los modelos oficiales vienen de <code>src/data/iphones.js</code> (verificadas con Apple). Aquí puedes ocultarlos, destacarlos o agregar un modelo nuevo cuando Apple lo anuncie.</p>
    <div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>Modelo</th><th>Generación</th><th>Apple</th><th>Inventario</th><th>Visible</th><th>Destacado</th><th></th></tr></thead>
      <tbody>${products
        .map((p) => {
          const o = store.productOverrides[p.id] || {};
          return `<tr>
          <td><strong>${esc(p.name)}</strong>${p.custom ? ' <span class="badge badge--warn badge--plain">Agregado</span>' : ''}</td>
          <td>${esc(p.generation)} · ${p.year}</td>
          <td>${p.appleStatus === 'vigente' ? 'Vigente' : 'Descontinuado'}</td>
          <td>${p.inventory.items.length} art. · ${p.inventory.stock} u.</td>
          <td><input type="checkbox" aria-label="Visible ${esc(p.name)}" data-visible="${p.id}" ${o.hidden ? '' : 'checked'} /></td>
          <td><input type="checkbox" aria-label="Destacado ${esc(p.name)}" data-featured="${p.id}" ${o.featured ? 'checked' : ''} /></td>
          <td class="admin-actions">${p.custom ? `<button type="button" class="btn btn--ghost btn--small" data-edit="${p.id}">Editar</button><button type="button" class="btn btn--ghost btn--small" data-delete="${p.id}">Eliminar</button>` : `<a class="btn btn--ghost btn--small" href="./#/iphone/${p.id}" target="_blank" rel="noopener">Ver</a>`}</td>
        </tr>`;
        })
        .join('')}</tbody></table></div>
    <div data-editor></div>`;

  const setOverride = (id, patch) => {
    store.productOverrides[id] = { ...(store.productOverrides[id] || {}), ...patch };
  };
  view.addEventListener('change', (e) => {
    if (e.target.dataset.visible) {
      setOverride(e.target.dataset.visible, { hidden: !e.target.checked });
      commit('Visibilidad actualizada.');
    }
    if (e.target.dataset.featured) {
      setOverride(e.target.dataset.featured, { featured: e.target.checked });
      commit('Destacado actualizado.');
    }
  });
  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) productEditor(view.querySelector('[data-editor]'));
    const ed = e.target.closest('[data-edit]');
    if (ed) productEditor(view.querySelector('[data-editor]'), store.customProducts.find((p) => p.id === ed.dataset.edit));
    const del = e.target.closest('[data-delete]');
    if (del && confirm('¿Eliminar este producto y su inventario? Esta acción afecta al borrador local.')) {
      store.customProducts = store.customProducts.filter((p) => p.id !== del.dataset.delete);
      store.inventory = store.inventory.filter((i) => i.modelId !== del.dataset.delete);
      commit('Producto eliminado.');
    }
  });
}

function productEditor(host, p = null) {
  const v = (x) => esc(x ?? '');
  host.innerHTML = `<form class="panel admin-form" data-product-form novalidate>
    <h2>${p ? `Editar ${esc(p.name)}` : 'Agregar iPhone'}</h2>
    <p class="notice">Registra solo modelos reales con datos de una fuente oficial. Indica la fuente: se muestra en la ficha.</p>
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input class="input" name="name" required value="${v(p?.name)}" placeholder="iPhone …" /></div>
      <div class="field"><label>Año</label><input class="input" name="year" type="number" min="2007" max="2100" required value="${v(p?.year)}" /></div>
      <div class="field"><label>Generación</label><select class="select" name="generation">${GENERATIONS.map((g) => `<option value="${g.id}" ${p?.generation === g.id ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}</select></div>
      <div class="field"><label>Familia</label><select class="select" name="family">${Object.entries(FAMILIES).map(([k, l]) => `<option value="${k}" ${p?.family === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Estado en Apple</label><select class="select" name="appleStatus"><option value="vigente" ${p?.appleStatus === 'vigente' ? 'selected' : ''}>Vigente</option><option value="descontinuado" ${p?.appleStatus !== 'vigente' ? 'selected' : ''}>Descontinuado</option></select></div>
      <div class="field"><label>Almacenamientos (GB, separados por coma)</label><input class="input" name="storage" required value="${v(p?.storage?.join(', '))}" placeholder="256, 512, 1024" /></div>
      <div class="field field--full"><label>Colores (uno por línea: Nombre | #hex aproximado)</label><textarea class="textarea" name="colors" required placeholder="Negro | #26272b">${v(p?.colors?.map((c) => `${c.name} | ${c.hex}`).join('\n'))}</textarea></div>
      <div class="field field--full"><label>Frase corta</label><input class="input" name="tagline" value="${v(p?.tagline)}" /></div>
      <div class="field field--full"><label>Pantalla</label><input class="input" name="display" value="${v(p?.display)}" /></div>
      <div class="field"><label>Pulgadas</label><input class="input" name="displaySize" type="number" step="0.1" value="${v(p?.displaySize)}" /></div>
      <div class="field"><label>Procesador</label><input class="input" name="chip" value="${v(p?.chip)}" /></div>
      <div class="field field--full"><label>Cámaras traseras</label><input class="input" name="rear" value="${v(p?.cameras?.rear)}" /></div>
      <div class="field"><label>Cámara frontal</label><input class="input" name="front" value="${v(p?.cameras?.front)}" /></div>
      <div class="field"><label>Nº de cámaras traseras</label><input class="input" name="count" type="number" min="1" max="5" value="${v(p?.cameras?.count || 1)}" /></div>
      <div class="field"><label>Batería (texto)</label><input class="input" name="battery" value="${v(p?.battery)}" /></div>
      <div class="field"><label>Horas de video</label><input class="input" name="batteryHours" type="number" value="${v(p?.batteryHours)}" /></div>
      <div class="field field--full"><label>Conectividad</label><input class="input" name="connectivity" value="${v(p?.connectivity)}" /></div>
      <div class="field"><label>Alto (mm)</label><input class="input" name="h" type="number" step="0.01" value="${v(p?.dimensions?.h)}" /></div>
      <div class="field"><label>Ancho (mm)</label><input class="input" name="w" type="number" step="0.01" value="${v(p?.dimensions?.w)}" /></div>
      <div class="field"><label>Grosor (mm)</label><input class="input" name="d" type="number" step="0.01" value="${v(p?.dimensions?.d)}" /></div>
      <div class="field"><label>Peso (g)</label><input class="input" name="weight" type="number" value="${v(p?.weight)}" /></div>
      <div class="field field--full"><label>Materiales</label><input class="input" name="materials" value="${v(p?.materials)}" /></div>
      <div class="field field--full"><label>Características (separadas por coma)</label><input class="input" name="features" value="${v(p?.features?.join(', '))}" /></div>
      <div class="field"><label>Diseño de cámaras (ilustración)</label><select class="select" name="layout">${['plateau', 'triple', 'air', 'pill2v', 'diag2', 'square2v', 'x2v', 'plus2h', 'single', 'fold'].map((l) => `<option ${p?.design?.layout === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Frente</label><select class="select" name="frontType">${[['island', 'Dynamic Island'], ['notch', 'Notch'], ['home', 'Botón de inicio']].map(([k, l]) => `<option value="${k}" ${p?.design?.front === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field field--full"><label>Fuente oficial (URL)</label><input class="input" name="source" type="url" required value="${v(p?.verification?.source)}" placeholder="https://www.apple.com/co/…" /></div>
    </div>
    <p class="field__error" data-form-err aria-live="polite"></p>
    <div class="admin-form__actions"><button class="btn btn--primary" type="submit">Guardar</button><button class="btn btn--ghost" type="button" data-cancel>Cancelar</button></div>
  </form>`;
  const form = host.querySelector('form');
  form.scrollIntoView({ behavior: 'smooth' });
  form.querySelector('[data-cancel]').addEventListener('click', () => (host.innerHTML = ''));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const err = form.querySelector('[data-form-err]');
    const colors = f.colors
      .split('\n')
      .map((l) => l.split('|').map((x) => x.trim()))
      .filter(([n]) => n)
      .map(([name, hex]) => ({ id: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-'), name, hex: /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#3a3b40' }));
    const storage = f.storage.split(',').map((s) => Number(s.trim())).filter((n) => n > 0);
    if (!f.name.trim() || !colors.length || !storage.length || !f.source) return (err.textContent = 'Completa nombre, colores, almacenamientos y la fuente oficial.');
    const id = p?.id || `custom-${f.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}`;
    if (!p && getProduct(id)) return (err.textContent = 'Ya existe un producto con ese nombre.');
    const num = (x) => (x === '' ? null : Number(x));
    const record = {
      id,
      name: f.name.trim(),
      year: Number(f.year),
      generation: f.generation,
      family: f.family,
      appleStatus: f.appleStatus,
      tagline: f.tagline,
      colors,
      storage,
      display: f.display,
      displaySize: num(f.displaySize),
      chip: f.chip,
      cameras: { rear: f.rear, front: f.front, count: num(f.count) || 1 },
      battery: f.battery,
      batteryHours: num(f.batteryHours),
      connectivity: f.connectivity,
      dimensions: f.h ? { h: num(f.h), w: num(f.w), d: num(f.d) } : null,
      weight: num(f.weight),
      materials: f.materials,
      features: f.features.split(',').map((s) => s.trim()).filter(Boolean),
      design: { layout: f.layout, front: f.frontType, frame: 'aluminio', ratio: f.h && f.w ? Number(f.w) / Number(f.h) : 0.48 },
      verification: { level: 'manual', source: f.source, checked: new Date().toISOString().slice(0, 10) },
    };
    store.customProducts = [...store.customProducts.filter((x) => x.id !== id), record];
    host.innerHTML = '';
    commit(p ? 'Producto actualizado.' : 'iPhone agregado al catálogo.');
  });
}

/* ─────────────── Inventario y precios ─────────────── */
function inventario(view) {
  const products = getAllProducts({ includeHidden: true });
  const filterId = invFilter;
  const items = store.inventory.filter((i) => !filterId || i.modelId === filterId);
  view.innerHTML = `<div class="admin-head"><h1 class="admin-h1">Inventario y precios</h1><button type="button" class="btn btn--primary btn--small" data-add>Registrar artículo</button></div>
    <p class="admin-muted">Cada artículo es una combinación de modelo, almacenamiento, color y condición con su precio en COP, unidades y disponibilidad. Lo que no tenga precio se muestra como «Precio a consultar».</p>
    <label class="field admin-filter"><span>Filtrar por modelo</span><select class="select" data-filter-model><option value="">Todos</option>${products.map((p) => `<option value="${p.id}" ${filterId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    <div data-inv-form></div>
    ${
      items.length
        ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>SKU</th><th>Modelo</th><th>Config.</th><th>Condición</th><th>Precio COP</th><th>Stock</th><th>Disponibilidad</th><th></th></tr></thead><tbody>
        ${items
          .map((i) => {
            const p = getProduct(i.modelId);
            const color = p?.colors.find((c) => c.id === i.colorId);
            return `<tr data-row="${esc(i.sku)}">
              <td><code>${esc(i.sku)}</code></td><td>${esc(p?.name || i.modelId)}</td>
              <td>${storageLabel(i.storage)} · ${esc(color?.name || 'Cualquier color')}</td>
              <td>${CONDITIONS[i.condition]}</td>
              <td><input class="input input--sm" type="number" min="0" step="1000" value="${Number(i.price) || ''}" placeholder="Sin precio" data-price="${esc(i.sku)}" aria-label="Precio de ${esc(i.sku)}" /></td>
              <td><input class="input input--sm" type="number" min="0" value="${Number(i.stock) || 0}" data-stock="${esc(i.sku)}" aria-label="Stock de ${esc(i.sku)}" /></td>
              <td><select class="select input--sm" data-avail="${esc(i.sku)}" aria-label="Disponibilidad de ${esc(i.sku)}">${['disponible', 'bajo-pedido', 'agotado'].map((a) => `<option value="${a}" ${i.availability === a ? 'selected' : ''}>${AVAILABILITY[a]}</option>`).join('')}</select></td>
              <td class="admin-actions"><button type="button" class="btn btn--ghost btn--small" data-edit-item="${esc(i.sku)}">Editar</button><button type="button" class="btn btn--ghost btn--small" data-del-item="${esc(i.sku)}">Eliminar</button></td>
            </tr>`;
          })
          .join('')}</tbody></table></div>`
        : '<div class="empty-state"><h3>Sin artículos registrados</h3><p>Registra el primero para publicar precio y disponibilidad.</p></div>'
    }`;

  const find = (sku) => store.inventory.find((i) => i.sku === sku);
  view.querySelector('[data-filter-model]').addEventListener('change', (e) => {
    invFilter = e.target.value;
    draw();
  });
  view.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.price) (find(t.dataset.price).price = Number(t.value) || null), commit('Precio actualizado.');
    if (t.dataset.stock) (find(t.dataset.stock).stock = Math.max(0, Number(t.value) || 0)), commit('Stock actualizado.');
    if (t.dataset.avail) (find(t.dataset.avail).availability = t.value), commit('Disponibilidad actualizada.');
  });
  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-add]')) itemForm(view.querySelector('[data-inv-form]'), null, filterId);
    const ed = e.target.closest('[data-edit-item]');
    if (ed) itemForm(view.querySelector('[data-inv-form]'), find(ed.dataset.editItem));
    const del = e.target.closest('[data-del-item]');
    if (del && confirm('¿Eliminar este artículo del inventario?')) {
      store.inventory = store.inventory.filter((i) => i.sku !== del.dataset.delItem);
      commit('Artículo eliminado.');
    }
  });
}

function itemForm(host, item, presetModel = '') {
  const products = getAllProducts({ includeHidden: true });
  const modelId = item?.modelId || presetModel || products[0].id;
  host.innerHTML = `<form class="panel admin-form" novalidate data-item-form>
    <h2>${item ? `Editar ${esc(item.sku)}` : 'Registrar artículo'}</h2>
    <div class="form-grid">
      <div class="field field--full"><label for="i-model">Modelo</label><select id="i-model" class="select" name="modelId">${products.map((p) => `<option value="${p.id}" ${p.id === modelId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="i-storage">Almacenamiento</label><select id="i-storage" class="select" name="storage" data-storage-opts></select></div>
      <div class="field"><label for="i-color">Color</label><select id="i-color" class="select" name="colorId" data-color-opts></select></div>
      <div class="field"><label for="i-cond">Condición</label><select id="i-cond" class="select" name="condition">${Object.entries(CONDITIONS).map(([k, l]) => `<option value="${k}" ${item?.condition === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="i-avail">Disponibilidad</label><select id="i-avail" class="select" name="availability">${['disponible', 'bajo-pedido', 'agotado'].map((a) => `<option value="${a}" ${item?.availability === a ? 'selected' : ''}>${AVAILABILITY[a]}</option>`).join('')}</select></div>
      <div class="field"><label for="i-price">Precio (COP)</label><input id="i-price" class="input" name="price" type="number" min="0" step="1000" value="${Number(item?.price) || ''}" placeholder="Vacío = a consultar" /></div>
      <div class="field"><label for="i-stock">Unidades</label><input id="i-stock" class="input" name="stock" type="number" min="0" value="${Number(item?.stock) || 0}" /></div>
      <div class="field field--full"><label for="i-notes">Notas internas (p. ej. salud de batería en usados)</label><input id="i-notes" class="input" name="notes" value="${esc(item?.notes || '')}" /></div>
    </div>
    <div class="admin-form__actions"><button class="btn btn--primary" type="submit">Guardar</button><button class="btn btn--ghost" type="button" data-cancel>Cancelar</button></div>
  </form>`;
  const form = host.querySelector('form');
  const fillOpts = () => {
    const p = getProduct(form.modelId.value);
    form.querySelector('[data-storage-opts]').innerHTML = p.storage.map((s) => `<option value="${s}" ${Number(item?.storage) === s ? 'selected' : ''}>${storageLabel(s)}</option>`).join('');
    form.querySelector('[data-color-opts]').innerHTML = `<option value="">Cualquier color</option>${p.colors.map((c) => `<option value="${c.id}" ${item?.colorId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}`;
  };
  fillOpts();
  form.modelId.addEventListener('change', fillOpts);
  form.querySelector('[data-cancel]').addEventListener('click', () => (host.innerHTML = ''));
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const record = {
      sku: item?.sku || `${f.modelId}-${f.storage}-${f.colorId || 'any'}-${f.condition}`.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 64) + `-${Date.now().toString(36).slice(-3).toUpperCase()}`,
      modelId: f.modelId,
      storage: Number(f.storage),
      colorId: f.colorId || null,
      condition: f.condition,
      availability: f.availability,
      price: Number(f.price) > 0 ? Number(f.price) : null,
      stock: Math.max(0, Number(f.stock) || 0),
      notes: f.notes,
    };
    store.inventory = item ? store.inventory.map((i) => (i.sku === item.sku ? record : i)) : [...store.inventory, record];
    host.innerHTML = '';
    commit(item ? 'Artículo actualizado.' : 'Artículo registrado.');
  });
}

/* ─────────────── Pedidos ─────────────── */
function pedidos(view) {
  const orders = getOrders();
  const inquiries = getInquiries();
  view.innerHTML = `<h1 class="admin-h1">Pedidos y consultas</h1>
    <p class="notice">Sin backend, cada solicitud se guarda en el navegador del cliente y le llega a BUNEMA por WhatsApp, correo o el endpoint configurado. Aquí ves las creadas en este navegador (útil para pruebas). Para centralizar los pedidos de todos los clientes hace falta la API descrita en <code>docs/ARQUITECTURA.md</code>.</p>
    <h2 class="admin-h2">Solicitudes de pedido (${orders.length})</h2>
    ${
      orders.length
        ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th></tr></thead><tbody>${orders
            .map(
              (o) => `<tr><td><a href="./#/pedido/${o.id}" target="_blank" rel="noopener"><code>${o.id}</code></a></td><td>${formatDate(o.createdAt)}</td><td>${esc(o.customer.name)}<br><span class="admin-muted">${esc(o.customer.phone)} · ${esc(o.customer.city)}</span></td><td>${o.items.map((i) => `${i.qty} × ${esc(i.name)} ${storageLabel(i.storage)}`).join('<br>')}</td><td>${o.total ? formatCOP(o.total) : 'Por confirmar'}</td><td><select class="select input--sm" data-status="${o.id}" aria-label="Estado de ${o.id}">${Object.entries(ORDER_STATUS).map(([k, l]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`,
            )
            .join('')}</tbody></table></div>`
        : '<p class="admin-muted">No hay solicitudes en este navegador.</p>'
    }
    <h2 class="admin-h2">Consultas (${inquiries.length})</h2>
    ${
      inquiries.length
        ? `<ul class="admin-list">${inquiries.map((q) => `<li><strong>${esc(q.name || 'Sin nombre')}</strong> · ${formatDate(q.createdAt)} · ${esc(q.phone || '')} ${esc(q.email || '')}<p>${esc(q.message || '')}</p></li>`).join('')}</ul>`
        : '<p class="admin-muted">No hay consultas en este navegador.</p>'
    }`;
  view.addEventListener('change', (e) => {
    if (e.target.dataset.status) {
      updateOrderStatus(e.target.dataset.status, e.target.value);
      toast('Estado actualizado.');
    }
  });
}

/* ─────────────── Imágenes y 3D ─────────────── */
async function toWebP(file, maxSide = 1400) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/webp', 0.82);
}

function imagenes(view) {
  const products = getAllProducts({ includeHidden: true });
  const sel = imgModel || products[0].id;
  const p = getProduct(sel);
  const o = store.productOverrides[sel] || {};
  const imgs = { front: '', back: '', side: '', gallery: [], ...(o.images || {}) };
  const slot = (k, label) => `<div class="img-slot">
      <div class="img-slot__preview">${imgs[k] ? `<img src="${esc(imgs[k])}" alt="${label}" />` : phoneSVG(p, { view: k })}</div>
      <p><strong>${label}</strong> ${imgs[k] ? '<span class="badge badge--ok">Fotografía</span>' : '<span class="badge badge--muted">Ilustración</span>'}</p>
      <label class="field"><span>Ruta o URL</span><input class="input input--sm" data-url="${k}" value="${imgs[k] && !imgs[k].startsWith('data:') ? esc(imgs[k]) : ''}" placeholder="assets/images/${sel}/${k}.webp" /></label>
      <label class="btn btn--ghost btn--small admin-file">Subir archivo<input type="file" accept="image/*" data-file="${k}" hidden /></label>
      ${imgs[k] ? `<button type="button" class="btn btn--ghost btn--small" data-clear-img="${k}">Quitar</button>` : ''}
    </div>`;
  view.innerHTML = `<h1 class="admin-h1">Imágenes y modelos 3D</h1>
    <p class="notice">Usa solo fotografías con permiso de uso (por ejemplo, recursos de prensa de Apple Newsroom según sus condiciones). Lo recomendado es guardar los archivos WebP en <code>public/assets/images/&lt;modelo&gt;/</code> y escribir aquí la ruta. Subir un archivo lo convierte a WebP y lo guarda en el borrador (ocupa espacio del navegador y aumenta el tamaño de store.json).</p>
    <label class="field admin-filter"><span>Modelo</span><select class="select" data-model-sel>${products.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <div class="img-grid">${slot('front', 'Frontal')}${slot('back', 'Trasera')}${slot('side', 'Lateral')}</div>
    <section class="panel admin-form"><h2>Galería de fotografías</h2>
      <label class="field"><span>Rutas o URL (una por línea)</span><textarea class="textarea" data-gallery>${esc((imgs.gallery || []).filter((g) => !g.startsWith('data:')).join('\n'))}</textarea></label>
      <h2>Modelo 3D (.glb)</h2>
      <label class="field"><span>Ruta del archivo GLB optimizado (opcional). Si está vacío se usa el modelo generado por código.</span><input class="input" data-glb value="${esc(o.model3d || '')}" placeholder="assets/models-3d/${sel}.glb" /></label>
      <div class="admin-form__actions"><button type="button" class="btn btn--primary" data-save-media>Guardar galería y 3D</button></div>
    </section>`;

  const save = (patch, msg) => {
    store.productOverrides[sel] = { ...o, ...patch };
    commit(msg);
  };
  view.querySelector('[data-model-sel]').addEventListener('change', (e) => {
    imgModel = e.target.value;
    draw();
  });
  view.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.dataset.url !== undefined && t.dataset.url) save({ images: { ...imgs, [t.dataset.url]: t.value.trim() || null } }, 'Imagen actualizada.');
    if (t.dataset.file && t.files[0]) {
      try {
        const data = await toWebP(t.files[0]);
        save({ images: { ...imgs, [t.dataset.file]: data } }, 'Imagen convertida a WebP y guardada en el borrador.');
      } catch {
        toast('No se pudo procesar la imagen.');
      }
    }
  });
  view.addEventListener('click', (e) => {
    const c = e.target.closest('[data-clear-img]');
    if (c) save({ images: { ...imgs, [c.dataset.clearImg]: null } }, 'Imagen quitada.');
    if (e.target.closest('[data-save-media]')) {
      const gallery = view.querySelector('[data-gallery]').value.split('\n').map((s) => s.trim()).filter(Boolean);
      save({ images: { ...imgs, gallery }, model3d: view.querySelector('[data-glb]').value.trim() || null }, 'Galería y modelo 3D guardados.');
    }
  });
}

/* ─────────────── Ajustes ─────────────── */
function ajustes(view) {
  const s = store.settings;
  view.innerHTML = `<h1 class="admin-h1">Ajustes de la tienda</h1>
    <form class="panel admin-form" data-settings novalidate>
      <div class="form-grid">
        <div class="field"><label for="s-wa">WhatsApp (formato internacional, solo dígitos)</label><input id="s-wa" class="input" name="whatsappNumber" inputmode="numeric" pattern="[0-9]{11,15}" value="${esc(s.whatsappNumber)}" placeholder="57XXXXXXXXXX" /><p class="field__error"></p></div>
        <div class="field"><label for="s-mail">Correo de ventas</label><input id="s-mail" class="input" name="contactEmail" type="email" value="${esc(s.contactEmail)}" /><p class="field__error"></p></div>
        <div class="field field--full"><label for="s-end">Endpoint de formularios (POST JSON, opcional)</label><input id="s-end" class="input" name="contactEndpoint" type="url" value="${esc(s.contactEndpoint)}" placeholder="https://…" /><p class="field__error"></p></div>
        <div class="field"><label for="s-city">Ciudad de la tienda</label><input id="s-city" class="input" name="city" value="${esc(s.city)}" /></div>
        <div class="field"><label for="s-pay">Pasarela de pago (preparada)</label><select id="s-pay" class="select" name="provider"><option value="">Ninguna</option>${Object.entries(SUPPORTED_PROVIDERS).map(([k, v]) => `<option value="${k}" ${s.payment?.provider === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
      </div>
      <p class="notice notice--info">Elegir una pasarela solo deja registrada la preferencia. Los cobros reales requieren el backend descrito en docs/ARQUITECTURA.md (las claves privadas nunca deben estar en este sitio).</p>
      <div class="admin-form__actions"><button class="btn btn--primary" type="submit">Guardar ajustes</button></div>
    </form>
    <form class="panel admin-form" data-pin novalidate>
      <h2>Cambiar PIN</h2>
      <div class="form-grid"><div class="field"><label for="p-new">Nuevo PIN</label><input id="p-new" class="input" name="pin" type="password" minlength="6" autocomplete="new-password" required /><p class="field__error"></p></div></div>
      <div class="admin-form__actions"><button class="btn btn--ghost" type="submit">Actualizar PIN</button></div>
    </form>`;
  view.querySelector('[data-settings]').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    let ok = true;
    form.querySelectorAll('input').forEach((i) => {
      const err = i.closest('.field').querySelector('.field__error');
      const bad = i.value && !i.checkValidity();
      if (err) err.textContent = bad ? 'Revisa el formato.' : '';
      if (bad) ok = false;
    });
    if (!ok) return;
    const f = Object.fromEntries(new FormData(form));
    store.settings = { ...store.settings, whatsappNumber: f.whatsappNumber.replace(/\D/g, ''), contactEmail: f.contactEmail.trim(), contactEndpoint: f.contactEndpoint.trim(), city: f.city.trim(), payment: { ...store.settings.payment, provider: f.provider || null } };
    commit('Ajustes guardados.');
  });
  view.querySelector('[data-pin]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = e.target.pin.value.trim();
    if (pin.length < 6) return (e.target.querySelector('.field__error').textContent = 'Mínimo 6 caracteres.');
    store.settings.adminPinHash = await sha256(pin);
    try {
      sessionStorage.setItem(SESSION, store.settings.adminPinHash);
    } catch {
      /* sin sessionStorage */
    }
    commit('PIN actualizado. Exporta store.json para que aplique en el sitio publicado.');
  });
}

/* ─────────────── Publicar ─────────────── */
function publicar(view) {
  const published = getPublishedStore();
  const changes = {
    inventory: store.inventory.length - published.inventory.length,
    custom: store.customProducts.length - published.customProducts.length,
  };
  view.innerHTML = `<h1 class="admin-h1">Publicar cambios</h1>
    <section class="panel admin-form">
      <h2>Cómo se publican los datos</h2>
      <ol class="admin-steps">
        <li>Descarga <code>store.json</code> con el botón de abajo.</li>
        <li>Sustituye el archivo <code>public/data/store.json</code> del repositorio (en GitHub: abrir el archivo → editar o «Upload files»).</li>
        <li>Al guardar en la rama <code>main</code>, GitHub Actions vuelve a desplegar el sitio en unos minutos.</li>
      </ol>
      <p class="admin-muted">Borrador actual: ${store.inventory.length} artículos de inventario (${changes.inventory >= 0 ? '+' : ''}${changes.inventory} frente a lo publicado), ${store.customProducts.length} productos agregados. Última modificación: ${esc(store.updatedAt || '—')}.</p>
      <div class="admin-form__actions">
        <button type="button" class="btn btn--primary" data-export>Descargar store.json</button>
        <label class="btn btn--ghost admin-file">Importar store.json<input type="file" accept="application/json,.json" data-import hidden /></label>
        <button type="button" class="btn btn--ghost" data-discard ${hasDraft() ? '' : 'disabled'}>Descartar borrador</button>
      </div>
    </section>`;
  view.querySelector('[data-export]').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'store.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('store.json descargado.');
  });
  view.querySelector('[data-import]').addEventListener('change', async (e) => {
    try {
      const json = JSON.parse(await e.target.files[0].text());
      if (!Array.isArray(json.inventory) || typeof json.settings !== 'object') throw new Error('formato');
      store = { ...store, ...json };
      commit('Archivo importado al borrador.');
    } catch {
      toast('El archivo no tiene el formato de store.json.');
    }
  });
  view.querySelector('[data-discard]').addEventListener('click', () => {
    if (!confirm('¿Descartar todos los cambios del borrador y volver a lo publicado?')) return;
    discardDraft();
    store = getStore();
    toast('Borrador descartado.');
    draw();
  });
}

(async function boot() {
  await loadStore();
  store = getStore();
  draw();
})();
