import { readJSON, writeJSON, KEYS } from './storage.js';
import { getProduct, findOffer } from './catalogService.js';

/**
 * Carrito persistido en este navegador. Cada línea guarda la configuración
 * elegida; el precio se recalcula siempre con el inventario actual para que
 * un cambio de precio en el panel se refleje sin dejar valores viejos.
 */
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(getCart()));

export const onCartChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

const lineKey = (l) => [l.modelId, l.storage, l.colorId, l.condition].join('|');

function readLines() {
  return readJSON(KEYS.cart, []).filter((l) => l && l.modelId && l.qty > 0);
}

export function addToCart({ modelId, storage, colorId, condition, qty = 1 }) {
  const lines = readLines();
  const key = lineKey({ modelId, storage, colorId, condition });
  const found = lines.find((l) => lineKey(l) === key);
  if (found) found.qty = Math.min(found.qty + qty, 10);
  else lines.push({ modelId, storage: Number(storage), colorId, condition, qty: Math.min(qty, 10) });
  writeJSON(KEYS.cart, lines);
  emit();
}

export function setQty(key, qty) {
  let lines = readLines();
  lines = lines
    .map((l) => (lineKey(l) === key ? { ...l, qty: Math.max(0, Math.min(10, qty)) } : l))
    .filter((l) => l.qty > 0);
  writeJSON(KEYS.cart, lines);
  emit();
}

export const removeLine = (key) => setQty(key, 0);

export function clearCart() {
  writeJSON(KEYS.cart, []);
  emit();
}

/** Carrito con datos resueltos: producto, color, precio unitario y subtotal. */
export function getCart() {
  const lines = readLines()
    .map((l) => {
      const product = getProduct(l.modelId);
      if (!product) return null;
      const color = product.colors.find((c) => c.id === l.colorId) || null;
      const offer = findOffer(product, l);
      const unitPrice = offer && Number(offer.price) > 0 ? Number(offer.price) : null;
      return {
        ...l,
        key: lineKey(l),
        product,
        color,
        offer,
        unitPrice,
        subtotal: unitPrice ? unitPrice * l.qty : null,
      };
    })
    .filter(Boolean);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const known = lines.filter((l) => l.subtotal != null);
  return {
    lines,
    count,
    total: known.reduce((s, l) => s + l.subtotal, 0),
    pendingPrices: lines.length - known.length,
  };
}
