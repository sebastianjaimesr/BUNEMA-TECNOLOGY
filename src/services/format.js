import { STORAGE_LABEL } from '../data/iphones.js';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/** "$ 5.499.000" o "Precio a consultar" cuando no hay precio configurado. */
export const formatCOP = (value) => (Number.isFinite(value) && value > 0 ? cop.format(value) : 'Precio a consultar');
export const formatNumber = (value) => num.format(value);
export const storageLabel = STORAGE_LABEL;
export const formatDate = (iso) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/** Escapa texto para insertarlo en plantillas HTML. */
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const CONDITIONS = {
  nuevo: 'Nuevo',
  usado: 'Usado',
  reacondicionado: 'Reacondicionado',
};

export const AVAILABILITY = {
  disponible: 'Disponible',
  'bajo-pedido': 'Bajo pedido',
  agotado: 'Agotado',
  'sin-inventario': 'Consultar disponibilidad',
};

/** Normaliza texto para búsquedas: minúsculas y sin tildes. */
export const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
