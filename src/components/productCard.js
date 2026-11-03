import { phoneSVG, hasPhoto, productVisual } from './phoneArt.js';
import { esc, formatCOP, storageLabel, AVAILABILITY } from '../services/format.js';
import { getCompare } from '../services/compareService.js';

export function availabilityBadge(product) {
  const a = product.inventory.availability;
  const cls = { disponible: 'badge--ok', 'bajo-pedido': 'badge--warn', agotado: 'badge--muted', 'sin-inventario': 'badge--muted' }[a];
  return `<span class="badge ${cls}">${AVAILABILITY[a]}</span>`;
}

export function lifecycleBadge(product) {
  if (product.concept) return '<span class="badge badge--warn">Modelo conceptual</span>';
  if (product.appleStatus === 'vigente')
    return `<span class="badge badge--new">${product.year >= 2026 ? 'Nuevo · ' : ''}Vigente en Apple</span>`;
  return '<span class="badge badge--muted">Descontinuado por Apple</span>';
}

export function priceBlock(product) {
  const { minPrice, conditions } = product.inventory;
  if (!minPrice) return `<p class="product-card__price">Precio a consultar<small>Sin precio publicado por BUNEMA</small></p>`;
  return `<p class="product-card__price">Desde ${formatCOP(minPrice)}<small>${conditions.map((c) => c[0].toUpperCase() + c.slice(1)).join(' · ')}</small></p>`;
}

/** Tarjeta premium del catálogo. Los botones funcionan por delegación en la página. */
export function productCard(product, { headingLevel = 3 } = {}) {
  const inCompare = getCompare().includes(product.id);
  const photo = hasPhoto(product);
  const media = photo
    ? `${productVisual(product, { view: 'back', className: 'phone-art--back' })}${productVisual(product, { view: 'front', className: 'phone-art--front' })}`
    : `${phoneSVG(product, { view: 'back', className: 'phone-art--back' })}${phoneSVG(product, { view: 'front', className: 'phone-art--front' })}<span class="tag-illustration">Ilustración · foto oficial pendiente</span>`;
  const h = `h${headingLevel}`;
  return `<article class="product-card" data-product="${product.id}">
    <div class="product-card__media" aria-hidden="true">${media}</div>
    <div class="product-card__badges">${lifecycleBadge(product)}${availabilityBadge(product)}</div>
    <div class="product-card__body">
      <p class="product-card__meta">${esc(product.familyLabel)} · ${product.year}</p>
      <${h} class="product-card__name"><a href="#/iphone/${product.id}">${esc(product.name)}</a></${h}>
      <p class="product-card__tagline">${esc(product.tagline || '')}</p>
      <ul class="swatches" aria-label="Colores: ${esc(product.colors.map((c) => c.name).join(', '))}">
        ${product.colors.map((c) => `<li class="swatch" style="background:${c.hex}" title="${esc(c.name)}"></li>`).join('')}
      </ul>
      <p class="product-card__specs">${product.storage.map((s) => `<span>${storageLabel(s)}</span>`).join('')}</p>
      ${priceBlock(product)}
      <div class="product-card__actions">
        <a class="btn btn--light btn--small" href="#/iphone/${product.id}">Ver dispositivo</a>
        <button class="btn btn--ghost btn--small" type="button" data-compare-toggle="${product.id}" aria-pressed="${inCompare}">
          ${inCompare ? 'En comparación' : 'Comparar'}
        </button>
      </div>
    </div>
  </article>`;
}
