import { BUNEMA_X1, MODELS, SPEC_ROWS, findColorway, formatCOP } from '../data/products.js';

/**
 * Comparador "Encuentra tu modelo" — la parte de interfaz.
 *
 * Todo se genera desde `products.js` (MODELS y SPEC_ROWS): añadir una fila
 * o cambiar un precio no toca el HTML. Igual que el configurador, no sabe
 * nada de Three.js: expone la selección ("modelo destacado") y quien quiera
 * (la vitrina 3D) se suscribe.
 *
 * La tabla es un <table> real con <th scope>: un lector de pantalla anuncia
 * "Batería, Bunema Pro: 4800 mAh" al moverse por las celdas. En móvil vive
 * dentro de una región desplazable en horizontal con la primera columna fija.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Filas de SPEC_ROWS que se muestran en la comparación. */
const KEY_ROWS = ['display', 'processor', 'camera', 'battery', 'charging', 'build'];

/** Ilustración vectorial de la trasera (alternativa sin WebGL), a partir de las mismas medidas que el 3D. */
function modelIllustration(model) {
  const { body } = model;
  const look = body.look ?? findColorway(BUNEMA_X1.defaultColorway);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `-4 -4 ${body.width + 8} ${body.height + 8}`);
  svg.setAttribute('class', 'lineup__fallback');
  svg.setAttribute('aria-hidden', 'true');
  const el = (name, attrs) => {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
    svg.append(node);
    return node;
  };
  el('rect', { width: body.width, height: body.height, rx: body.radius, fill: look.body, stroke: look.frame, 'stroke-width': 1.2 });
  // Placa con el Corte X abajo a la derecha (vista trasera), como en el modelo 3D.
  const { x, y, w, h, r, chamfer: c } = body.island;
  el('path', {
    d: `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - c}L${x + w - c} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
    fill: look.plate,
  });
  el('line', { x1: x + w - c * 0.75, y1: y + h - c * 0.05, x2: x + w - c * 0.05, y2: y + h - c * 0.75, stroke: '#2F6BFF', 'stroke-width': 0.9 });
  body.lenses.forEach((lens) => el('circle', { cx: lens.x, cy: lens.y, r: lens.r, fill: '#05070d', stroke: '#2a2d35', 'stroke-width': 0.7 }));
  el('circle', { cx: body.flash.x, cy: body.flash.y, r: body.flash.r, fill: '#e9e4d6' });
  return svg;
}

export function createComparison({ root }) {
  const modelsEl = root.querySelector('[data-lineup-models]');
  const table = root.querySelector('[data-specs]');
  const scroller = root.querySelector('[data-specs-scroll]');
  const statusEl = root.querySelector('[data-specs-status]');

  const state = { highlight: null };
  const listeners = new Set();
  const pickButtons = [];

  /* Vitrina: un hueco por modelo (el 3D se coloca encima) con su ficha corta */
  modelsEl.replaceChildren(
    ...MODELS.map((model) => {
      const slot = document.createElement('div');
      slot.className = 'lineup__slot';
      slot.dataset.lineupSlot = model.id;
      const stage = document.createElement('div');
      stage.className = 'lineup__stage';
      stage.append(modelIllustration(model));

      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'model-pick';
      pick.dataset.model = model.id;
      pick.setAttribute('aria-pressed', 'false');
      pick.innerHTML = `
        <span class="model-pick__tier"></span>
        <span class="model-pick__name"></span>
        <span class="model-pick__price"></span>
        <span class="model-pick__hint" aria-hidden="true">Destacar</span>`;
      pick.querySelector('.model-pick__tier').textContent = model.tier;
      pick.querySelector('.model-pick__name').textContent = model.name;
      pick.querySelector('.model-pick__price').textContent = formatCOP(model.price);
      pickButtons.push(pick);
      slot.append(stage, pick);
      return slot;
    }),
  );

  /* Tabla --------------------------------------------------------------- */
  const caption = document.createElement('caption');
  caption.id = 'specs-caption';
  caption.className = 'visually-hidden';
  caption.textContent = 'Diferencias clave entre Bunema X1, Bunema Pro y Bunema Lite (especificaciones conceptuales)';

  const thead = document.createElement('thead');
  const headRow = thead.insertRow();
  const corner = document.createElement('td');
  corner.className = 'specs__corner';
  headRow.append(corner);
  MODELS.forEach((model) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.dataset.model = model.id;
    th.innerHTML = '<span class="specs__model"></span><span class="specs__tier"></span>';
    th.querySelector('.specs__model').textContent = model.name;
    th.querySelector('.specs__tier').textContent = model.tier;
    headRow.append(th);
  });

  const tbody = document.createElement('tbody');
  // Solo las filas que de verdad distinguen a los modelos (la ficha completa vive en products.js)
  // y el precio conceptual al final. Menos filas: la diferencia se lee de un vistazo.
  const rows = [
    ...SPEC_ROWS.filter((row) => KEY_ROWS.includes(row.id)),
    {
      id: 'price',
      label: 'Precio conceptual',
      values: Object.fromEntries(MODELS.map((m) => [m.id, { value: formatCOP(m.price), detail: 'Precio ficticio en pesos colombianos.' }])),
    },
  ];

  rows.forEach((row) => {
    const tr = tbody.insertRow();
    tr.dataset.row = row.id;
    const values = MODELS.map((m) => row.values[m.id]);
    const metrics = values.map((v) => v.metric).filter((n) => typeof n === 'number');
    const max = metrics.length === values.length ? Math.max(...metrics) : null;

    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = row.label;
    tr.append(th);

    MODELS.forEach((model, i) => {
      const v = values[i];
      const td = tr.insertCell();
      td.dataset.model = model.id;
      const value = document.createElement('span');
      value.className = 'specs__value';
      value.textContent = v.value;
      td.append(value);
      if (max !== null) {
        // Barra proporcional al valor más alto de la fila: la diferencia se lee de un vistazo.
        const meter = document.createElement('span');
        meter.className = 'specs__meter';
        meter.setAttribute('aria-hidden', 'true');
        meter.style.setProperty('--v', (v.metric / max).toFixed(3));
        td.append(meter);
        const lead = v.metric === max && metrics.filter((n) => n === max).length === 1;
        if (lead) {
          td.classList.add('is-lead');
          const note = document.createElement('span');
          note.className = 'visually-hidden';
          note.textContent = ' (el valor más alto)';
          value.append(note);
        }
      }
    });
  });

  table.replaceChildren(caption, thead, tbody);

  /* Estado -------------------------------------------------------------- */
  function render() {
    table.classList.toggle('has-highlight', Boolean(state.highlight));
    table.querySelectorAll('[data-model]').forEach((cell) => {
      cell.classList.toggle('is-highlighted', cell.dataset.model === state.highlight);
    });
    pickButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.model === state.highlight)));
  }

  function notify() {
    listeners.forEach((listener) => listener(state));
  }

  /** En pantallas estrechas, lleva la columna destacada a la vista dentro de la tabla. */
  function revealColumn(id) {
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    const th = table.querySelector(`thead th[data-model="${id}"]`);
    const label = table.querySelector('tbody th');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({ left: th.offsetLeft - (label?.offsetWidth ?? 0), behavior: reduced ? 'auto' : 'smooth' });
  }

  function onPick(event) {
    const id = event.currentTarget.dataset.model;
    state.highlight = state.highlight === id ? null : id;
    render();
    if (state.highlight) revealColumn(state.highlight);
    const model = MODELS.find((m) => m.id === state.highlight);
    statusEl.textContent = model ? `${model.name} destacado en la tabla.` : 'Sin modelo destacado.';
    notify();
  }

  pickButtons.forEach((btn) => btn.addEventListener('click', onPick));

  // Pista "desliza" solo cuando la tabla realmente no cabe.
  const overflowObserver = new ResizeObserver(() => {
    root.classList.toggle('specs-overflow', scroller.scrollWidth > scroller.clientWidth + 1);
  });
  overflowObserver.observe(scroller);

  render();

  return {
    get state() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      pickButtons.forEach((btn) => btn.removeEventListener('click', onPick));
      overflowObserver.disconnect();
      listeners.clear();
    },
  };
}
