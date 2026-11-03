import '../styles/catalog.css';
import { gsap, prefersReduced } from '../animations/gsap.js';
import { getAllProducts, filterProducts, allColorNames } from '../services/catalogService.js';
import { productCard } from '../components/productCard.js';
import { mountCompareTray } from '../components/compareTray.js';
import { FAMILIES, GENERATIONS } from '../data/iphones.js';
import { HISTORY } from '../data/generations.js';
import { CONDITIONS, AVAILABILITY, storageLabel, esc } from '../services/format.js';
import { replaceQuery } from '../router.js';
import { getStore } from '../services/storeService.js';

/**
 * Catálogo completo: búsqueda en tiempo real, filtros combinables
 * sincronizados con la URL (se pueden compartir) y agrupación por generación.
 */
const MULTI = {
  gen: { key: 'generation', label: 'Generación', options: GENERATIONS.map((g) => [g.id, g.label]) },
  fam: { key: 'family', label: 'Familia', options: Object.entries(FAMILIES) },
  apple: { key: 'apple', label: 'Estado en Apple', options: [['vigente', 'Vigente'], ['descontinuado', 'Descontinuado']] },
  cond: { key: 'condition', label: 'Condición en BUNEMA', options: Object.entries(CONDITIONS) },
  disp: { key: 'availability', label: 'Disponibilidad', options: Object.entries(AVAILABILITY) },
  gb: { key: 'storage', label: 'Almacenamiento', options: [32, 64, 128, 256, 512, 1024, 2048].map((g) => [String(g), storageLabel(g)]) },
};

const SORTS = {
  gen: 'Generación (más reciente)',
  'price-asc': 'Precio: menor a mayor',
  'price-desc': 'Precio: mayor a menor',
  name: 'Nombre (A–Z)',
  weight: 'Peso (más ligero)',
};

function readFilters(query) {
  const list = (k) => (query.get(k) ? query.get(k).split(',').filter(Boolean) : []);
  const f = { q: query.get('q') || '', color: query.get('color') || '', priceMin: query.get('min') || '', priceMax: query.get('max') || '', sort: query.get('orden') || 'gen' };
  Object.entries(MULTI).forEach(([param, def]) => (f[def.key] = list(param)));
  return f;
}

function writeFilters(f) {
  const q = new URLSearchParams();
  if (f.q) q.set('q', f.q);
  Object.entries(MULTI).forEach(([param, def]) => f[def.key].length && q.set(param, f[def.key].join(',')));
  if (f.color) q.set('color', f.color);
  if (f.priceMin) q.set('min', f.priceMin);
  if (f.priceMax) q.set('max', f.priceMax);
  if (f.sort !== 'gen') q.set('orden', f.sort);
  replaceQuery(q);
}

function sortProducts(list, sort) {
  const byPrice = (dir) => (a, b) => {
    const pa = a.inventory.minPrice;
    const pb = b.inventory.minPrice;
    if (pa == null && pb == null) return 0;
    if (pa == null) return 1; // sin precio al final
    if (pb == null) return -1;
    return dir * (pa - pb);
  };
  const copy = [...list];
  if (sort === 'price-asc') return copy.sort(byPrice(1));
  if (sort === 'price-desc') return copy.sort(byPrice(-1));
  if (sort === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  if (sort === 'weight') return copy.sort((a, b) => (a.weight || 999) - (b.weight || 999));
  return copy;
}

export async function render({ root, query }) {
  const all = getAllProducts();
  const colors = allColorNames(all);
  const hasPrices = getStore().inventory.some((i) => Number(i.price) > 0);
  let filters = readFilters(query);

  const chipGroup = (param, def) => `<fieldset class="filter-group">
      <legend>${def.label}</legend>
      <div class="chips">${def.options
        .map(([value, label]) => `<button type="button" class="chip" data-filter="${param}" data-value="${esc(value)}" aria-pressed="false">${esc(label)}</button>`)
        .join('')}</div>
    </fieldset>`;

  root.innerHTML = `<div class="page catalog">
    <header class="catalog__head">
      <div>
        <span class="eyebrow">Catálogo</span>
        <h1>Todos los iPhone.</h1>
        <p class="lead">${all.length} modelos, del iPhone 7 al iPhone 18 Pro Max y el iPhone Duo. Cada ficha con especificaciones oficiales de Apple.</p>
      </div>
      <div class="catalog__search">
        <label class="visually-hidden" for="catalog-q">Buscar modelo, color o chip</label>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input id="catalog-q" class="input" type="search" placeholder="Buscar: «Pro Max», «titanio», «A17»…" autocomplete="off" value="${esc(filters.q)}" data-search />
      </div>
    </header>

    ${hasPrices ? '' : '<p class="notice notice--info catalog__notice">BUNEMA aún no ha publicado precios ni inventario: todos los modelos aparecen como «Precio a consultar». Puedes armar tu pedido y te confirmamos precio y disponibilidad.</p>'}

    <div class="catalog__layout">
      <aside class="filters" id="filters" data-filters aria-label="Filtros">
        <div class="filters__head">
          <h2>Filtros</h2>
          <button type="button" class="filters__close icon-btn" data-filters-close aria-label="Cerrar filtros"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </div>
        ${chipGroup('gen', MULTI.gen)}
        ${chipGroup('fam', MULTI.fam)}
        ${chipGroup('apple', MULTI.apple)}
        ${chipGroup('cond', MULTI.cond)}
        ${chipGroup('disp', MULTI.disp)}
        ${chipGroup('gb', MULTI.gb)}
        <fieldset class="filter-group">
          <legend>Color</legend>
          <label class="visually-hidden" for="f-color">Color</label>
          <select id="f-color" class="select" data-color>
            <option value="">Todos los colores</option>
            ${colors.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </fieldset>
        <fieldset class="filter-group">
          <legend>Precio (COP)</legend>
          <div class="filters__price">
            <label class="visually-hidden" for="f-min">Precio mínimo</label>
            <input id="f-min" class="input" type="number" inputmode="numeric" min="0" step="50000" placeholder="Mínimo" data-price="min" />
            <label class="visually-hidden" for="f-max">Precio máximo</label>
            <input id="f-max" class="input" type="number" inputmode="numeric" min="0" step="50000" placeholder="Máximo" data-price="max" />
          </div>
          <p class="filters__hint">Solo incluye modelos con precio publicado.</p>
        </fieldset>
        <div class="filters__foot">
          <button type="button" class="btn btn--ghost btn--small" data-clear>Limpiar filtros</button>
          <button type="button" class="btn btn--primary btn--small filters__apply" data-filters-close>Ver resultados</button>
        </div>
      </aside>

      <section class="catalog__results" aria-labelledby="results-count">
        <div class="catalog__toolbar">
          <button type="button" class="btn btn--ghost btn--small catalog__filters-btn" data-filters-open aria-controls="filters" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg> Filtros <span data-active-count></span>
          </button>
          <p id="results-count" class="catalog__count" aria-live="polite" data-count></p>
          <label class="catalog__sort"><span class="visually-hidden">Ordenar por</span>
            <select class="select" data-sort>${Object.entries(SORTS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          </label>
        </div>
        <div data-results></div>
      </section>
    </div>

    <section class="history" aria-labelledby="history-title">
      <header class="section-head">
        <span class="eyebrow">Archivo histórico</span>
        <h2 id="history-title">Antes del iPhone 7.</h2>
        <p>Modelos documentados como referencia histórica. No forman parte del inventario ni tienen ficha comercial.</p>
      </header>
      <ol class="history__list">
        ${HISTORY.map((h) => `<li><span class="history__year">${h.year}</span><strong>${esc(h.name)}</strong><span>${esc(h.note)}</span></li>`).join('')}
      </ol>
    </section>
  </div>`;

  const els = {
    results: root.querySelector('[data-results]'),
    count: root.querySelector('[data-count]'),
    search: root.querySelector('[data-search]'),
    sort: root.querySelector('[data-sort]'),
    color: root.querySelector('[data-color]'),
    min: root.querySelector('[data-price="min"]'),
    max: root.querySelector('[data-price="max"]'),
    panel: root.querySelector('[data-filters]'),
    openBtn: root.querySelector('[data-filters-open]'),
    activeCount: root.querySelector('[data-active-count]'),
  };

  const syncControls = () => {
    els.search.value = filters.q;
    els.sort.value = filters.sort;
    els.color.value = filters.color;
    els.min.value = filters.priceMin;
    els.max.value = filters.priceMax;
    root.querySelectorAll('[data-filter]').forEach((chip) => {
      const def = MULTI[chip.dataset.filter];
      chip.setAttribute('aria-pressed', String(filters[def.key].includes(chip.dataset.value)));
    });
    const active = Object.values(MULTI).reduce((n, d) => n + filters[d.key].length, 0) + (filters.color ? 1 : 0) + (filters.priceMin ? 1 : 0) + (filters.priceMax ? 1 : 0);
    els.activeCount.textContent = active ? `(${active})` : '';
  };

  let firstPaint = true;
  const update = ({ write = true } = {}) => {
    const list = sortProducts(filterProducts(all, filters), filters.sort);
    els.count.textContent = `${list.length} ${list.length === 1 ? 'modelo' : 'modelos'}`;
    if (!list.length) {
      els.results.innerHTML = `<div class="empty-state"><h3>Ningún iPhone coincide</h3><p>Prueba con otra búsqueda o quita algún filtro.</p><button type="button" class="btn btn--ghost" data-clear>Limpiar filtros</button></div>`;
    } else if (filters.sort === 'gen') {
      els.results.innerHTML = GENERATIONS.map((g) => {
        const items = list.filter((p) => p.generation === g.id);
        if (!items.length) return '';
        return `<section class="gen-group" aria-labelledby="g-${g.id}">
          <h2 class="gen-group__title" id="g-${g.id}">${esc(g.label)} <span>${g.year}</span></h2>
          <div class="product-grid">${items.map((p) => productCard(p)).join('')}</div>
        </section>`;
      }).join('');
    } else {
      els.results.innerHTML = `<div class="product-grid">${list.map((p) => productCard(p, { headingLevel: 2 })).join('')}</div>`;
    }
    tray.sync();
    syncControls();
    if (write) writeFilters(filters);
    if (!prefersReduced()) {
      const cards = els.results.querySelectorAll('.product-card');
      gsap.from([...cards].slice(0, 12), { autoAlpha: 0, y: firstPaint ? 30 : 14, duration: firstPaint ? 0.8 : 0.45, stagger: 0.04, ease: 'power3.out', clearProps: 'all' });
    }
    firstPaint = false;
  };

  const tray = mountCompareTray(root);

  // Eventos
  let searchTimer;
  els.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      filters.q = els.search.value;
      update();
    }, 120);
  });
  els.sort.addEventListener('change', () => ((filters.sort = els.sort.value), update()));
  els.color.addEventListener('change', () => ((filters.color = els.color.value), update()));
  [els.min, els.max].forEach((input) =>
    input.addEventListener('change', () => {
      filters.priceMin = els.min.value;
      filters.priceMax = els.max.value;
      update();
    }),
  );

  const setPanel = (open) => {
    els.panel.classList.toggle('is-open', open);
    els.openBtn.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('filters-open', open);
    if (open) els.panel.querySelector('button, select, input')?.focus();
  };

  const onClick = (e) => {
    const chip = e.target.closest('[data-filter]');
    if (chip) {
      const def = MULTI[chip.dataset.filter];
      const set = new Set(filters[def.key]);
      set.has(chip.dataset.value) ? set.delete(chip.dataset.value) : set.add(chip.dataset.value);
      filters[def.key] = [...set];
      update();
      return;
    }
    if (e.target.closest('[data-clear]')) {
      filters = readFilters(new URLSearchParams());
      update();
      return;
    }
    if (e.target.closest('[data-filters-open]')) setPanel(true);
    if (e.target.closest('[data-filters-close]')) setPanel(false);
  };
  root.addEventListener('click', onClick);
  const onKey = (e) => e.key === 'Escape' && setPanel(false);
  document.addEventListener('keydown', onKey);

  update({ write: false });
  if (query.get('buscar')) {
    els.search.focus();
    filters.q = '';
  }

  return {
    title: 'Catálogo de iPhone',
    description: 'Catálogo completo de iPhone con filtros por generación, familia, precio, almacenamiento, color, condición y disponibilidad. Precios en COP.',
    onQuery(q) {
      filters = readFilters(q);
      update({ write: false });
      if (q.get('buscar')) els.search.focus();
    },
    dispose() {
      tray.dispose();
      root.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('filters-open');
    },
  };
}
