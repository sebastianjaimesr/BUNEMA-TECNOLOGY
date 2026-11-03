import '../styles/compare.css';
import { gsap, prefersReduced } from '../animations/gsap.js';
import { getAllProducts, getProduct } from '../services/catalogService.js';
import { getCompare, setCompare, MAX_COMPARE } from '../services/compareService.js';
import { productVisual } from '../components/phoneArt.js';
import { GENERATIONS } from '../data/iphones.js';
import { esc, formatCOP, storageLabel, formatNumber } from '../services/format.js';
import { replaceQuery } from '../router.js';

/**
 * Comparador de hasta tres iPhone. Resalta las filas con diferencias y marca
 * el mejor valor en los datos numéricos (batería, peso, pantalla, capacidad).
 */
const DEFAULT = ['iphone-18-pro-max', 'iphone-18-pro', 'iphone-17-pro-max'];

const ROWS = [
  { key: 'display', label: 'Pantalla', value: (p) => p.display, num: (p) => p.displaySize, best: 'max', unit: (n) => `${formatNumber(n)}″` },
  { key: 'chip', label: 'Procesador', value: (p) => p.chip },
  { key: 'rear', label: 'Cámaras traseras', value: (p) => p.cameras?.rear, num: (p) => p.cameras?.count, best: 'max', unit: (n) => `${n} ${n === 1 ? 'cámara' : 'cámaras'}` },
  { key: 'front', label: 'Cámara frontal', value: (p) => p.cameras?.front },
  { key: 'battery', label: 'Batería', value: (p) => p.battery, num: (p) => p.batteryHours, best: 'max', unit: (n) => `${n} h de video` },
  { key: 'storage', label: 'Almacenamiento', value: (p) => p.storage.map(storageLabel).join(' · '), num: (p) => Math.max(...p.storage), best: 'max', unit: (n) => `Hasta ${storageLabel(n)}` },
  { key: 'dims', label: 'Dimensiones', value: (p) => (p.dimensions ? `${formatNumber(p.dimensions.h)} × ${formatNumber(p.dimensions.w)} × ${formatNumber(p.dimensions.d)} mm` : '—'), num: (p) => p.dimensions?.d, best: 'min', unit: (n) => `${formatNumber(n)} mm de grosor` },
  { key: 'weight', label: 'Peso', value: (p) => (p.weight ? `${p.weight} g` : '—'), num: (p) => p.weight, best: 'min', unit: (n) => `${n} g` },
  { key: 'connectivity', label: 'Conectividad', value: (p) => p.connectivity },
  { key: 'features', label: 'Características principales', value: (p) => p.features?.join(' · ') },
  { key: 'price', label: 'Precio BUNEMA', value: (p) => (p.inventory.minPrice ? `Desde ${formatCOP(p.inventory.minPrice)}` : 'Precio a consultar'), num: (p) => p.inventory.minPrice, best: 'min', unit: (n) => formatCOP(n) },
];

export async function render({ root, query }) {
  const all = getAllProducts();
  const fromQuery = (query.get('m') || '').split(',').filter((id) => getProduct(id));
  let ids = (fromQuery.length ? fromQuery : getCompare().length ? getCompare() : DEFAULT).slice(0, MAX_COMPARE);
  let onlyDiff = false;

  const options = (selected) =>
    `<option value="">— Elegir modelo —</option>${GENERATIONS.map((g) => {
      const items = all.filter((p) => p.generation === g.id);
      return items.length ? `<optgroup label="${esc(g.label)}">${items.map((p) => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</optgroup>` : '';
    }).join('')}`;

  root.innerHTML = `<div class="page compare">
    <header class="section-head">
      <span class="eyebrow">Comparador</span>
      <h1>Compara hasta tres iPhone.</h1>
      <p>Elige los modelos y mira lado a lado sus diferencias. Los valores destacados en azul son los mejores de la comparación.</p>
    </header>
    <div class="compare__controls">
      <label class="toggle"><input type="checkbox" data-only-diff /> <span>Mostrar solo diferencias</span></label>
      <button type="button" class="btn btn--ghost btn--small" data-share>Copiar enlace</button>
    </div>
    <div class="compare__scroll" data-table></div>
  </div>`;

  const table = root.querySelector('[data-table]');

  const draw = () => {
    const products = [0, 1, 2].map((i) => (ids[i] ? getProduct(ids[i]) : null));
    const chosen = products.filter(Boolean);
    const head = products
      .map(
        (p, i) => `<div class="cmp-col-head">
        <label class="visually-hidden" for="slot-${i}">Modelo ${i + 1}</label>
        <select id="slot-${i}" class="select" data-slot="${i}">${options(p?.id)}</select>
        ${
          p
            ? `<div class="cmp-col-head__art">${productVisual(p, { view: 'back' })}</div>
               <h2>${esc(p.name)}</h2>
               <p class="cmp-col-head__meta">${p.year} · ${p.appleStatus === 'vigente' ? 'Vigente en Apple' : 'Descontinuado por Apple'}</p>
               <div class="cmp-col-head__actions"><a class="btn btn--light btn--small" href="#/iphone/${p.id}">Ver dispositivo</a><button type="button" class="btn btn--ghost btn--small" data-remove="${i}" aria-label="Quitar ${esc(p.name)}">Quitar</button></div>`
            : `<div class="cmp-col-head__empty">Añade un modelo para compararlo.</div>`
        }
      </div>`,
      )
      .join('');

    const rows = ROWS.map((row) => {
      const values = products.map((p) => (p ? row.value(p) || '—' : ''));
      const filled = values.filter((v, i) => products[i]);
      const differs = new Set(filled).size > 1;
      if (onlyDiff && !differs && chosen.length > 1) return '';
      let bestIdx = [];
      if (row.num && chosen.length > 1) {
        const nums = products.map((p) => (p ? row.num(p) : null));
        const valid = nums.filter((n) => Number.isFinite(n) && n > 0);
        if (valid.length > 1 && new Set(valid).size > 1) {
          const target = row.best === 'max' ? Math.max(...valid) : Math.min(...valid);
          bestIdx = nums.map((n, i) => (n === target ? i : -1)).filter((i) => i >= 0);
        }
      }
      // Barra visual para batería y peso.
      const bar = (p) => {
        if (!p || !['battery', 'weight'].includes(row.key)) return '';
        const n = row.num(p);
        const max = row.key === 'battery' ? 44 : 260;
        return `<span class="cmp-bar"><span style="width:${Math.min(100, (n / max) * 100)}%"></span></span>`;
      };
      return `<div class="cmp-row ${differs ? 'is-diff' : ''}" role="row">
        <div class="cmp-label" role="rowheader">${row.label}</div>
        ${products
          .map(
            (p, i) =>
              `<div class="cmp-cell ${bestIdx.includes(i) ? 'is-best' : ''}" role="cell">${
                p ? `${row.num && Number.isFinite(row.num(p)) && row.num(p) > 0 ? `<strong class="cmp-num">${row.unit(row.num(p))}</strong>` : ''}${esc(values[i])}${bar(p)}${bestIdx.includes(i) ? '<span class="cmp-best">Mejor</span>' : ''}` : ''
              }</div>`,
          )
          .join('')}
      </div>`;
    }).join('');

    table.innerHTML = `<div class="cmp" role="table" aria-label="Comparación de modelos">
      <div class="cmp-row cmp-row--head" role="row"><div class="cmp-label" role="columnheader"><span class="visually-hidden">Característica</span></div>${head}</div>
      ${rows}
    </div>`;
    setCompare(ids.filter(Boolean));
    const q = new URLSearchParams();
    q.set('m', ids.filter(Boolean).join(','));
    replaceQuery(q);
    if (!prefersReduced()) gsap.from(table.querySelectorAll('.cmp-col-head__art'), { autoAlpha: 0, y: 20, duration: 0.6, stagger: 0.08, ease: 'power3.out', clearProps: 'all' });
  };

  const onChange = (e) => {
    if (e.target.matches('[data-slot]')) {
      const i = Number(e.target.dataset.slot);
      const next = [...ids];
      next[i] = e.target.value;
      ids = next.filter((v, idx, arr) => v && arr.indexOf(v) === idx).slice(0, MAX_COMPARE);
      draw();
    }
    if (e.target.matches('[data-only-diff]')) {
      onlyDiff = e.target.checked;
      draw();
    }
  };
  const onClick = async (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      ids = ids.filter((_, i) => i !== Number(rm.dataset.remove));
      draw();
    }
    if (e.target.closest('[data-share]')) {
      const btn = e.target.closest('[data-share]');
      try {
        await navigator.clipboard.writeText(location.href);
        btn.textContent = 'Enlace copiado';
      } catch {
        btn.textContent = 'Copia la URL de la barra';
      }
      setTimeout(() => (btn.textContent = 'Copiar enlace'), 2200);
    }
  };
  root.addEventListener('change', onChange);
  root.addEventListener('click', onClick);
  draw();

  return {
    title: 'Comparar iPhone',
    description: 'Compara hasta tres modelos de iPhone: pantalla, procesador, cámaras, batería, almacenamiento, dimensiones, peso, conectividad y precio en COP.',
    onQuery(q) {
      const next = (q.get('m') || '').split(',').filter((id) => getProduct(id));
      if (next.join() !== ids.join()) {
        ids = next.slice(0, MAX_COMPARE);
        draw();
      }
    },
    dispose() {
      root.removeEventListener('change', onChange);
      root.removeEventListener('click', onClick);
    },
  };
}
