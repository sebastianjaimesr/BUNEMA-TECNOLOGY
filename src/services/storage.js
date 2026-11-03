/**
 * Acceso seguro a localStorage: en modo privado, con almacenamiento bloqueado
 * o lleno, las lecturas devuelven el valor por defecto y las escrituras
 * informan del fallo en lugar de romper la página.
 */
export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('[BUNEMA] No se pudo guardar en este navegador:', error);
    return false;
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* sin almacenamiento disponible: no hay nada que borrar */
  }
}

export const KEYS = {
  cart: 'bunema.cart.v1',
  orders: 'bunema.orders.v1',
  inquiries: 'bunema.inquiries.v1',
  compare: 'bunema.compare.v1',
  storeDraft: 'bunema.store.draft.v1',
  adminSession: 'bunema.admin.session.v1',
  stats: 'bunema.stats.v1',
};
