import { IPHONES, FAMILIES, GENERATIONS } from '../data/iphones.js';
import { getStore } from './storeService.js';
import { normalize } from './format.js';

/**
 * Une las especificaciones (src/data/iphones.js) con los datos de negocio
 * (store.json): inventario, precios, fotos y productos añadidos desde el panel.
 */

const GEN_ORDER = GENERATIONS.map((g) => g.id);
const FAMILY_ORDER = ['duo', 'promax', 'pro', 'air', 'plus', 'standard', 'mini', 'e', 'se'];

function summarizeInventory(items) {
  const priced = items.filter((i) => Number(i.price) > 0);
  const inStock = items.filter((i) => i.availability === 'disponible' && Number(i.stock) > 0);
  const onOrder = items.filter((i) => i.availability === 'bajo-pedido');
  let availability = 'sin-inventario';
  if (inStock.length) availability = 'disponible';
  else if (onOrder.length) availability = 'bajo-pedido';
  else if (items.length) availability = 'agotado';
  return {
    items,
    availability,
    minPrice: priced.length ? Math.min(...priced.map((i) => Number(i.price))) : null,
    conditions: [...new Set(items.map((i) => i.condition))],
    stock: items.reduce((sum, i) => sum + (Number(i.stock) || 0), 0),
  };
}

function enrich(base, store) {
  const override = store.productOverrides?.[base.id] || {};
  const images = { ...base.images, ...(override.images || {}) };
  const inventory = summarizeInventory(store.inventory.filter((i) => i.modelId === base.id));
  return {
    ...base,
    images,
    model3d: override.model3d || base.model3d,
    hidden: Boolean(override.hidden),
    featured: Boolean(override.featured),
    custom: Boolean(base.custom),
    familyLabel: FAMILIES[base.family] || base.family,
    inventory,
  };
}

export function getAllProducts({ includeHidden = false } = {}) {
  const store = getStore();
  const custom = store.customProducts.map((p) => ({
    images: { front: null, back: null, side: null, gallery: [] },
    verification: { level: 'manual', source: '', checked: '' },
    appleStatus: 'descontinuado',
    design: { layout: 'single', front: 'island', frame: 'aluminio', ratio: 0.48 },
    cameras: { rear: '', front: '', count: 1 },
    colors: [],
    storage: [],
    features: [],
    ...p,
    custom: true,
  }));
  return [...IPHONES, ...custom]
    .map((p) => enrich(p, store))
    .filter((p) => includeHidden || !p.hidden)
    .sort(
      (a, b) =>
        GEN_ORDER.indexOf(a.generation) - GEN_ORDER.indexOf(b.generation) ||
        FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family),
    );
}

export function getProduct(id) {
  return getAllProducts({ includeHidden: true }).find((p) => p.id === id) || null;
}

/** Busca el artículo de inventario que corresponde a una configuración. */
export function findOffer(product, { storage, colorId, condition }) {
  const items = product.inventory.items.filter(
    (i) => Number(i.storage) === Number(storage) && i.condition === condition && (!i.colorId || !colorId || i.colorId === colorId),
  );
  return items.sort((a, b) => (b.colorId === colorId) - (a.colorId === colorId))[0] || null;
}

/** Filtro del catálogo. Todos los criterios son opcionales. */
export function filterProducts(products, f) {
  const q = normalize(f.q).trim();
  return products.filter((p) => {
    if (q) {
      const hay = normalize([p.name, p.familyLabel, p.chip, p.year, p.tagline, ...p.colors.map((c) => c.name)].join(' '));
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    if (f.generation?.length && !f.generation.includes(p.generation)) return false;
    if (f.family?.length && !f.family.includes(p.family)) return false;
    if (f.storage?.length && !p.storage.some((s) => f.storage.includes(String(s)))) return false;
    if (f.color && !p.colors.some((c) => normalize(c.name).includes(normalize(f.color)))) return false;
    if (f.condition?.length && !p.inventory.conditions.some((c) => f.condition.includes(c))) return false;
    if (f.availability?.length && !f.availability.includes(p.inventory.availability)) return false;
    if (f.apple?.length && !f.apple.includes(p.appleStatus)) return false;
    if (f.priceMax && !(p.inventory.minPrice && p.inventory.minPrice <= Number(f.priceMax))) return false;
    if (f.priceMin && !(p.inventory.minPrice && p.inventory.minPrice >= Number(f.priceMin))) return false;
    return true;
  });
}

/** Lista de colores únicos (por nombre) para el filtro. */
export function allColorNames(products) {
  return [...new Set(products.flatMap((p) => p.colors.map((c) => c.name)))].sort((a, b) => a.localeCompare(b, 'es'));
}
