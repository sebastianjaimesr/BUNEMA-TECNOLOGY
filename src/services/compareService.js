import { readJSON, writeJSON, KEYS } from './storage.js';

/** Selección del comparador (máx. 3), compartida entre catálogo, ficha y comparador. */
export const MAX_COMPARE = 3;
const listeners = new Set();
export const onCompareChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export const getCompare = () => readJSON(KEYS.compare, []).slice(0, MAX_COMPARE);

export function setCompare(ids) {
  writeJSON(KEYS.compare, [...new Set(ids)].slice(0, MAX_COMPARE));
  listeners.forEach((fn) => fn(getCompare()));
}

/** Añade o quita. Devuelve false si ya hay 3 y se intenta añadir otro. */
export function toggleCompare(id) {
  const list = getCompare();
  if (list.includes(id)) {
    setCompare(list.filter((x) => x !== id));
    return true;
  }
  if (list.length >= MAX_COMPARE) return false;
  setCompare([...list, id]);
  return true;
}
