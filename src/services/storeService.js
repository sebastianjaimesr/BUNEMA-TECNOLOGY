import { SITE, DEFAULT_SETTINGS } from '../config/site.config.js';
import { readJSON, writeJSON, removeKey, KEYS } from './storage.js';

/**
 * Datos de negocio (precios, inventario, canales, fotos).
 *
 * Origen publicado: `public/data/store.json` (lo mismo para todos los visitantes).
 * Borrador local: el panel administrativo guarda sus cambios en este navegador.
 * Si hay borrador, la tienda abierta en ESTE navegador lo usa como vista previa
 * y lo indica con un aviso. Para publicarlo a todos, se exporta el JSON y se
 * sustituye `public/data/store.json` en el repositorio (ver README).
 */
const EMPTY = { version: 1, updatedAt: null, settings: {}, inventory: [], productOverrides: {}, customProducts: [] };

let published = null;
let loading = null;
const listeners = new Set();

function normalizeStore(raw) {
  const data = { ...EMPTY, ...(raw || {}) };
  data.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  data.settings.payment = { ...DEFAULT_SETTINGS.payment, ...(data.settings.payment || {}) };
  data.inventory = Array.isArray(data.inventory) ? data.inventory : [];
  data.customProducts = Array.isArray(data.customProducts) ? data.customProducts : [];
  data.productOverrides = data.productOverrides || {};
  return data;
}

export async function loadStore() {
  if (published) return getStore();
  if (!loading) {
    loading = fetch(SITE.storeDataUrl, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : EMPTY))
      .catch(() => EMPTY)
      .then((json) => {
        published = normalizeStore(json);
        return getStore();
      });
  }
  return loading;
}

export function getPublishedStore() {
  return published ? structuredClone(published) : normalizeStore(EMPTY);
}

export function hasDraft() {
  return readJSON(KEYS.storeDraft, null) != null;
}

/** Store efectivo: el borrador local si existe; si no, el publicado. */
export function getStore() {
  const draft = readJSON(KEYS.storeDraft, null);
  return draft ? normalizeStore(draft) : published || normalizeStore(EMPTY);
}

export function saveDraft(store) {
  const ok = writeJSON(KEYS.storeDraft, { ...store, updatedAt: new Date().toISOString().slice(0, 10) });
  listeners.forEach((fn) => fn());
  return ok;
}

export function discardDraft() {
  removeKey(KEYS.storeDraft);
  listeners.forEach((fn) => fn());
}

export function onStoreChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getSettings = () => getStore().settings;
