import { getSettings } from '../storeService.js';

/**
 * Punto de integración para una pasarela de pago colombiana.
 *
 * Hoy NO hay pasarela configurada y la tienda no cobra: `isConfigured()`
 * devuelve false y la interfaz lo dice. Para activarla hace falta un backend
 * (ver docs/ARQUITECTURA.md): la firma de integridad de Wompi, la
 * confirmación de ePayco o el webhook de Mercado Pago requieren una clave
 * privada que nunca debe estar en este sitio estático.
 *
 * Contrato que debe implementar cada proveedor:
 *   createCheckout(order) → Promise<{ redirectUrl }>   (lo llama el frontend)
 *   El backend crea la transacción con la clave privada y confirma el pago
 *   por webhook; solo entonces el pedido pasa a «pagado».
 */
const PROVIDERS = {
  wompi: { label: 'Wompi (Bancolombia)', docs: 'https://docs.wompi.co/' },
  epayco: { label: 'ePayco', docs: 'https://docs.epayco.com/' },
  mercadopago: { label: 'Mercado Pago Colombia', docs: 'https://www.mercadopago.com.co/developers' },
};

export function getPaymentProvider() {
  const { provider } = getSettings().payment || {};
  return provider && PROVIDERS[provider] ? { id: provider, ...PROVIDERS[provider] } : null;
}

export function isConfigured() {
  return false; // se activará cuando exista el backend descrito en docs/ARQUITECTURA.md
}

export async function createCheckout() {
  throw new Error('La pasarela de pago aún no está configurada. El pedido queda como solicitud.');
}

export const SUPPORTED_PROVIDERS = PROVIDERS;
