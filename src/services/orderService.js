import { readJSON, writeJSON, KEYS } from './storage.js';
import { getCart, clearCart } from './cartService.js';
import { storageLabel, CONDITIONS, formatCOP } from './format.js';

/**
 * Solicitudes de pedido.
 *
 * Sin backend no hay base de datos compartida: la solicitud se guarda en el
 * navegador del cliente y se ENVÍA a la tienda por los canales configurados
 * (WhatsApp, correo o un endpoint HTTP). No se cobra nada ni se simula un pago:
 * el estado inicial es siempre «pendiente de confirmación».
 */
function newId() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BNM-${date}-${rand}`;
}

export function createOrder(customer) {
  const cart = getCart();
  if (!cart.lines.length) throw new Error('El carrito está vacío.');
  const order = {
    id: newId(),
    createdAt: new Date().toISOString(),
    status: 'pendiente',
    customer,
    items: cart.lines.map((l) => ({
      modelId: l.modelId,
      name: l.product.name,
      storage: l.storage,
      color: l.color?.name || '',
      condition: l.condition,
      qty: l.qty,
      unitPrice: l.unitPrice,
      sku: l.offer?.sku || null,
    })),
    total: cart.total,
    pendingPrices: cart.pendingPrices,
    payment: { status: 'sin-pasarela' },
  };
  const orders = readJSON(KEYS.orders, []);
  orders.unshift(order);
  writeJSON(KEYS.orders, orders.slice(0, 50));
  clearCart();
  return order;
}

export const getOrders = () => readJSON(KEYS.orders, []);
export const getOrder = (id) => getOrders().find((o) => o.id === id) || null;

export function updateOrderStatus(id, status) {
  const orders = getOrders().map((o) => (o.id === id ? { ...o, status } : o));
  writeJSON(KEYS.orders, orders);
}

export const ORDER_STATUS = {
  pendiente: 'Pendiente de confirmación',
  confirmado: 'Confirmado por la tienda',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

/** Texto plano del pedido, usado en WhatsApp y en el correo. */
export function orderToText(order) {
  const lines = order.items.map(
    (i) =>
      `• ${i.qty} × ${i.name} ${storageLabel(i.storage)}${i.color ? ` · ${i.color}` : ''} · ${CONDITIONS[i.condition] || i.condition} — ${
        i.unitPrice ? formatCOP(i.unitPrice * i.qty) : 'precio a confirmar'
      }`,
  );
  return [
    `Hola BUNEMA, quiero confirmar la solicitud ${order.id}:`,
    ...lines,
    order.total ? `Total estimado: ${formatCOP(order.total)}${order.pendingPrices ? ' (más productos con precio por confirmar)' : ''}` : 'Total: por confirmar',
    '',
    `Nombre: ${order.customer.name}`,
    `Teléfono: ${order.customer.phone}`,
    order.customer.email ? `Correo: ${order.customer.email}` : '',
    `Ciudad: ${order.customer.city}`,
    order.customer.notes ? `Notas: ${order.customer.notes}` : '',
  ]
    .filter((l) => l !== '')
    .join('\n');
}
