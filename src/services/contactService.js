import { getSettings } from './storeService.js';
import { readJSON, writeJSON, KEYS } from './storage.js';

/** Enlace de WhatsApp con mensaje, o null si el número no está configurado. */
export function whatsappLink(message) {
  const number = String(getSettings().whatsappNumber || '').replace(/\D/g, '');
  if (number.length < 10) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Enlace mailto, o null si el correo no está configurado. */
export function mailtoLink(subject, body) {
  const email = getSettings().contactEmail;
  if (!email || !email.includes('@')) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function channelsConfigured() {
  const s = getSettings();
  return {
    whatsapp: Boolean(whatsappLink('x')),
    email: Boolean(s.contactEmail),
    endpoint: Boolean(s.contactEndpoint),
  };
}

/**
 * Envía una consulta. Orden: endpoint HTTP (si existe) → se guarda siempre una
 * copia local. Devuelve qué pasó para que la interfaz lo diga con honestidad.
 */
export async function sendInquiry(payload) {
  const entry = { ...payload, id: `C-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString() };
  const list = readJSON(KEYS.inquiries, []);
  list.unshift(entry);
  writeJSON(KEYS.inquiries, list.slice(0, 100));

  const { contactEndpoint } = getSettings();
  if (contactEndpoint) {
    try {
      const res = await fetch(contactEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(entry),
      });
      return { delivered: res.ok, via: 'endpoint', entry };
    } catch {
      return { delivered: false, via: 'endpoint', entry };
    }
  }
  return { delivered: false, via: 'local', entry };
}

export const getInquiries = () => readJSON(KEYS.inquiries, []);
