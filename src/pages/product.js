import '../styles/product.css';
import { gsap, prefersReduced } from '../animations/gsap.js';
import { createReveals } from '../animations/reveal.js';
import { getProduct, getAllProducts, findOffer } from '../services/catalogService.js';
import { productVisual, phoneSVG } from '../components/phoneArt.js';
import { productCard, lifecycleBadge } from '../components/productCard.js';
import { mountCompareTray } from '../components/compareTray.js';
import { addToCart } from '../services/cartService.js';
import { whatsappLink } from '../services/contactService.js';
import { toast } from '../components/toast.js';
import { track } from '../services/statsService.js';
import { esc, formatCOP, storageLabel, CONDITIONS, AVAILABILITY, formatNumber } from '../services/format.js';
import { GENERATIONS } from '../data/iphones.js';

/**
 * Ficha individual + configurador 3D.
 * Toda la información sale del modelo seleccionado; el precio y la
 * disponibilidad se calculan con el inventario para la combinación exacta
 * de almacenamiento, color y condición.
 */
export async function render({ root, params, query }) {
  const product = getProduct(params[0]);
  if (!product) {
    const nf = await import('./notFound.js');
    return nf.render({ root });
  }
  track('views', product.id);

  const conditionsAvailable = product.inventory.conditions.length ? product.inventory.conditions : Object.keys(CONDITIONS);
  const state = {
    colorId: query.get('color') && product.colors.some((c) => c.id === query.get('color')) ? query.get('color') : product.colors[0]?.id,
    storage: product.storage[0],
    condition: conditionsAvailable.includes('nuevo') ? 'nuevo' : conditionsAvailable[0],
    qty: 1,
    view: 'back',
  };
  const gen = GENERATIONS.find((g) => g.id === product.generation);
  const related = getAllProducts().filter((p) => p.generation === product.generation && p.id !== product.id).slice(0, 4);
  const d = product.dimensions || {};

  const specRows = [
    ['Pantalla', product.display],
    ['Procesador', product.chip],
    ['Cámaras traseras', product.cameras?.rear],
    ['Cámara frontal', product.cameras?.front],
    ['Batería', product.battery],
    ['Conectividad', product.connectivity],
    ['Dimensiones', d.h ? `${formatNumber(d.h)} × ${formatNumber(d.w)} × ${formatNumber(d.d)} mm (alto × ancho × grosor)${d.note ? `. ${d.note}` : ''}` : null],
    ['Peso', product.weight ? `${product.weight} g` : null],
    ['Materiales', product.materials],
    ['Resistencia al agua', product.water],
    ['Almacenamiento', product.storage.map(storageLabel).join(' · ')],
    ['Colores', product.colors.map((c) => c.name).join(' · ')],
    ['Características especiales', product.features?.join(' · ')],
  ].filter(([, v]) => v);

  root.innerHTML = `<div class="page product" data-product-page>
    <nav class="breadcrumb" aria-label="Ruta"><a href="#/catalogo">Catálogo</a><span aria-hidden="true">›</span><a href="#/catalogo?gen=${product.generation}">${esc(gen?.label || product.generation)}</a><span aria-hidden="true">›</span><span aria-current="page">${esc(product.name)}</span></nav>

    <div class="product__top">
      <section class="configurator" aria-label="Configurador 3D">
        <div class="configurator__stage viewer" data-viewer data-interactive>
          <div class="configurator__fallback" data-fallback hidden></div>
          <div class="configurator__lost" role="status">Recuperando la vista 3D…</div>
        </div>
        <div class="configurator__toolbar" role="toolbar" aria-label="Controles de la vista">
          <div class="segmented segmented--views" data-views>
            ${[['front', 'Frontal'], ['back', 'Trasera'], ['side', 'Lateral'], ['camera', 'Cámaras']].map(([v, l]) => `<button type="button" data-view="${v}" aria-pressed="${v === state.view}">${l}</button>`).join('')}
          </div>
          <div class="configurator__tools" data-3d-tools>
            <button type="button" class="tool-btn" data-auto aria-pressed="false" title="Rotación automática"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/></svg><span>Girar</span></button>
            <button type="button" class="tool-btn" data-materials aria-pressed="false" title="Inspeccionar materiales"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.5"/></svg><span>Materiales</span></button>
            <button type="button" class="tool-btn" data-zoom="in" aria-label="Acercar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8v6M8 11h6"/></svg></button>
            <button type="button" class="tool-btn" data-zoom="out" aria-label="Alejar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8 11h6"/></svg></button>
          </div>
        </div>
        <div class="configurator__info" data-info aria-live="polite"></div>
        <p class="configurator__note" data-3d-note>Arrastra para girar · pellizca o usa la rueda para acercar. Modelo 3D ilustrativo generado con las medidas oficiales; no es un render de Apple.</p>
      </section>

      <aside class="buybox" aria-labelledby="product-title">
        <div class="buybox__badges">${lifecycleBadge(product)}${product.verification?.level === 'apple-specs' ? '<span class="badge badge--plain">Ficha oficial verificada</span>' : ''}</div>
        <p class="buybox__meta">${esc(product.familyLabel)} · ${product.year}</p>
        <h1 id="product-title" class="buybox__title">${esc(product.name)}</h1>
        <p class="buybox__tagline">${esc(product.tagline || '')}</p>

        <div class="buybox__group">
          <p class="buybox__label" id="color-label">Color · <strong data-color-name></strong></p>
          <div class="swatches" role="radiogroup" aria-labelledby="color-label">
            ${product.colors.map((c) => `<button type="button" class="swatch-btn" role="radio" data-color="${c.id}" aria-checked="${c.id === state.colorId}" aria-label="${esc(c.name)}"><span class="swatch" style="background:${c.hex}"></span></button>`).join('')}
          </div>
          <p class="buybox__fine">Tonos de pantalla aproximados.</p>
        </div>

        <div class="buybox__group">
          <p class="buybox__label" id="storage-label">Almacenamiento</p>
          <div class="segmented" role="radiogroup" aria-labelledby="storage-label">
            ${product.storage.map((s) => `<button type="button" role="radio" data-storage="${s}" aria-checked="${s === state.storage}">${storageLabel(s)}</button>`).join('')}
          </div>
        </div>

        <div class="buybox__group">
          <p class="buybox__label" id="cond-label">Condición</p>
          <div class="segmented" role="radiogroup" aria-labelledby="cond-label">
            ${Object.entries(CONDITIONS).map(([k, l]) => `<button type="button" role="radio" data-condition="${k}" aria-checked="${k === state.condition}">${l}</button>`).join('')}
          </div>
        </div>

        <div class="buybox__price" data-price aria-live="polite"></div>

        <div class="buybox__actions">
          <div class="qty" aria-label="Cantidad">
            <button type="button" data-qty="-1" aria-label="Quitar una unidad">−</button>
            <output data-qty-value aria-live="polite">1</output>
            <button type="button" data-qty="1" aria-label="Añadir una unidad">+</button>
          </div>
          <button type="button" class="btn btn--primary" data-add>Agregar al carrito</button>
        </div>
        <div class="buybox__secondary">
          <a class="btn btn--ghost btn--small" data-consult href="#/contacto">Consultar disponibilidad</a>
          <button type="button" class="btn btn--ghost btn--small" data-compare-toggle="${product.id}" aria-pressed="false">Comparar</button>
        </div>
        <p class="buybox__fine">Sin cobros en línea: BUNEMA confirma precio, disponibilidad y entrega antes de cualquier pago.</p>
      </aside>
    </div>

    <section class="product-section" aria-labelledby="views-title">
      <header class="section-head" data-reveal><span class="eyebrow">Galería</span><h2 id="views-title">Frontal, trasera y lateral.</h2></header>
      <div class="views-grid" data-views-grid data-reveal-stagger></div>
      <div data-photo-gallery></div>
    </section>

    <section class="product-section" aria-labelledby="specs-title">
      <header class="section-head" data-reveal><span class="eyebrow">Especificaciones</span><h2 id="specs-title">Ficha técnica.</h2></header>
      <dl class="specs" data-reveal-stagger>
        ${specRows.map(([k, v]) => `<div class="specs__row"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
      <p class="specs__source">Fuente: <a href="${esc(product.verification?.source || '')}" target="_blank" rel="noopener">${esc(product.verification?.source || 'Registro manual')}</a>${product.verification?.checked ? ` · revisado el ${product.verification.checked}` : ''}.</p>
    </section>

    ${related.length ? `<section class="product-section" aria-labelledby="rel-title"><header class="section-head"><span class="eyebrow">Misma generación</span><h2 id="rel-title">También te puede interesar.</h2></header><div class="product-grid">${related.map((p) => productCard(p)).join('')}</div></section>` : ''}
  </div>`;

  const $ = (s) => root.querySelector(s);
  const disposers = [];
  const tray = mountCompareTray(root);
  disposers.push(() => tray.dispose());

  // ── 3D ──
  const stage = $('[data-viewer]');
  let viewer = null;
  const { supportsWebGL, PhoneViewer } = await import('../three/PhoneViewer.js');
  if (supportsWebGL()) {
    viewer = new PhoneViewer(stage, { product, colorId: state.colorId, interactive: true, distance: 42 });
    viewer.setView('back');
    disposers.push(() => viewer.dispose());
  } else {
    stage.removeAttribute('data-interactive');
    $('[data-fallback]').hidden = false;
    $('[data-3d-tools]').hidden = true;
    $('[data-3d-note]').textContent = 'Tu navegador no admite WebGL: se muestran ilustraciones de cada vista.';
  }

  const renderFallback = () => {
    if (viewer) return;
    const v = state.view === 'camera' ? 'back' : state.view;
    $('[data-fallback]').innerHTML = productVisual(product, { view: v, colorId: state.colorId, className: `fallback-${state.view}` });
  };

  const info = {
    front: () => `<strong>Pantalla</strong>${esc(product.display)}`,
    back: () => `<strong>Diseño</strong>${esc(product.materials || '')}`,
    side: () => `<strong>Perfil</strong>${d.d ? `${formatNumber(d.d)} mm de grosor · ${product.weight} g` : ''}`,
    camera: () => `<strong>Cámaras</strong>${esc(product.cameras?.rear || '')}`,
  };

  const renderViews = () => {
    $('[data-views-grid]').innerHTML = ['front', 'back', 'side']
      .map((v) => {
        const isPhoto = Boolean(product.images?.[v]);
        return `<figure class="view-card"><div class="view-card__art">${productVisual(product, { view: v, colorId: state.colorId })}${isPhoto ? '' : '<span class="tag-illustration">Ilustración</span>'}</div><figcaption>${{ front: 'Vista frontal', back: 'Vista trasera', side: 'Vista lateral' }[v]}</figcaption></figure>`;
      })
      .join('');
    const gallery = product.images?.gallery || [];
    $('[data-photo-gallery]').innerHTML = gallery.length
      ? `<div class="photo-strip">${gallery.map((src, i) => `<img src="${esc(src)}" alt="${esc(product.name)}, fotografía ${i + 1}" loading="lazy" decoding="async" />`).join('')}</div>`
      : `<p class="notice notice--info">Fotografías oficiales de ${esc(product.name)} pendientes de registro. Se agregan desde el panel administrativo cuando se dispone de los archivos con permiso de uso (ver «Recursos pendientes» en la documentación).</p>`;
  };

  const updatePrice = () => {
    const offer = findOffer(product, state);
    const price = offer && Number(offer.price) > 0 ? Number(offer.price) : null;
    const avail = offer ? offer.availability : 'sin-inventario';
    const stockTxt = offer && avail === 'disponible' && Number(offer.stock) > 0 ? ` · ${offer.stock} en inventario` : '';
    $('[data-price]').innerHTML = `<p class="buybox__amount">${price ? formatCOP(price * state.qty) : 'Precio a consultar'}</p>
      <p class="buybox__avail"><span class="badge ${avail === 'disponible' ? 'badge--ok' : avail === 'bajo-pedido' ? 'badge--warn' : 'badge--muted'}">${AVAILABILITY[avail]}</span> ${storageLabel(state.storage)} · ${CONDITIONS[state.condition]}${stockTxt}</p>
      ${price && state.qty > 1 ? `<p class="buybox__fine">${formatCOP(price)} c/u</p>` : ''}`;
    const color = product.colors.find((c) => c.id === state.colorId);
    $('[data-color-name]').textContent = color?.name || '';
    const msg = `Hola BUNEMA, quiero consultar disponibilidad y precio: ${product.name} ${storageLabel(state.storage)} · ${color?.name || ''} · ${CONDITIONS[state.condition]} (cantidad: ${state.qty}).`;
    const wa = whatsappLink(msg);
    const consult = $('[data-consult]');
    if (wa) {
      consult.href = wa;
      consult.target = '_blank';
      consult.rel = 'noopener';
      consult.textContent = 'Consultar por WhatsApp';
    } else {
      consult.href = `#/contacto?modelo=${product.id}&gb=${state.storage}&color=${state.colorId}&cond=${state.condition}`;
      consult.removeAttribute('target');
      consult.textContent = 'Consultar disponibilidad';
    }
    $('[data-qty-value]').textContent = String(state.qty);
  };

  const setView = (v) => {
    state.view = v;
    root.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    root.querySelector('[data-auto]')?.setAttribute('aria-pressed', 'false');
    $('[data-info]').innerHTML = info[v]();
    if (viewer) viewer.setView(v);
    else renderFallback();
  };

  const onClick = (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.view) setView(t.dataset.view);
    else if (t.dataset.color) {
      state.colorId = t.dataset.color;
      root.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.color === state.colorId)));
      viewer?.setColor(state.colorId);
      renderFallback();
      renderViews();
      updatePrice();
      if (!prefersReduced()) gsap.fromTo('.view-card__art', { autoAlpha: 0.4 }, { autoAlpha: 1, duration: 0.5, stagger: 0.05 });
    } else if (t.dataset.storage) {
      state.storage = Number(t.dataset.storage);
      root.querySelectorAll('[data-storage]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.storage) === state.storage)));
      updatePrice();
    } else if (t.dataset.condition) {
      state.condition = t.dataset.condition;
      root.querySelectorAll('[data-condition]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.condition === state.condition)));
      updatePrice();
    } else if (t.dataset.qty) {
      state.qty = Math.max(1, Math.min(10, state.qty + Number(t.dataset.qty)));
      updatePrice();
    } else if (t.hasAttribute('data-add')) {
      addToCart({ modelId: product.id, storage: state.storage, colorId: state.colorId, condition: state.condition, qty: state.qty });
      track('cart', product.id);
      toast(`${product.name} agregado al carrito.`, { action: 'Ver carrito', href: '#/carrito' });
    } else if (t.hasAttribute('data-auto') && viewer) {
      const on = t.getAttribute('aria-pressed') !== 'true';
      t.setAttribute('aria-pressed', String(on));
      viewer.setAutoRotate(on);
    } else if (t.hasAttribute('data-materials') && viewer) {
      const on = t.getAttribute('aria-pressed') !== 'true';
      t.setAttribute('aria-pressed', String(on));
      viewer.setMaterialSweep(on);
      $('[data-info]').innerHTML = on ? `<strong>Materiales</strong>${esc(product.materials || '')}` : info[state.view]();
    } else if (t.dataset.zoom && viewer) {
      viewer.zoom(t.dataset.zoom === 'in' ? 0.82 : 1.2);
    }
  };
  root.addEventListener('click', onClick);
  disposers.push(() => root.removeEventListener('click', onClick));

  // Flechas del teclado para girar el modelo (accesibilidad del configurador).
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', `Modelo 3D de ${product.name}. Usa las flechas para girar.`);
  const onKey = (e) => {
    if (!viewer) return;
    const step = { ArrowLeft: -0.3, ArrowRight: 0.3 }[e.key];
    if (step) {
      e.preventDefault();
      gsap.to(viewer.model.group.rotation, { y: `+=${step}`, duration: 0.3, onUpdate: () => viewer.invalidate() });
    }
  };
  stage.addEventListener('keydown', onKey);

  setView(state.view);
  renderFallback();
  renderViews();
  updatePrice();
  tray.sync();
  const ctx = createReveals(root);
  disposers.push(() => ctx.revert());

  return {
    title: product.name,
    description: `${product.name}: ${product.tagline || ''} Ficha técnica, colores, almacenamiento, visor 3D y precio en COP en BUNEMA.`,
    dispose: () => disposers.forEach((fn) => fn()),
  };
}

export { phoneSVG };
