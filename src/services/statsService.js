import { readJSON, writeJSON, KEYS } from './storage.js';

/**
 * Estadísticas locales (solo de este navegador): vistas de fichas y productos
 * añadidos al carrito. Sirven para probar el panel; las estadísticas reales de
 * todos los visitantes requieren un servicio de analítica o el backend.
 */
export function track(event, id) {
  const stats = readJSON(KEYS.stats, {});
  stats[event] = stats[event] || {};
  stats[event][id] = (stats[event][id] || 0) + 1;
  writeJSON(KEYS.stats, stats);
}

export const getStats = () => readJSON(KEYS.stats, {});
