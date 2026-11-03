import '../styles/store.css';
import { getCart, setQty, removeLine, onCartChange } from '../services/cartService.js';
import { createOrder } from '../services/orderService.js';
import { isConfigured, getPaymentProvider } from '../services/payment/paymentGateway.js';
import { productVisual } from '../components/phoneArt.js';
import { esc, formatCOP, storageLabel, CONDITIONS, AVAILABILITY } from '../services/format.js';
import { validateForm, bindLiveValidation } from '../components/forms.js';
import { navigate } from '../router.js';

/** Carrito, resumen del pedido y envío de la solicitud. */
export async function render({ root }) {
  root.innerHTML = `<div class="page store">
    <header class="section-head"><span class="eyebrow">Tienda</span><h1>Tu carrito</h1></header>
    <div class="store__layout">
      <section aria-label="Productos" data-lines></section>
      <aside class="summary panel" aria-labelledby="summary-title" data-summary></aside>
    </div>
  </div>`;

  const linesEl = root.querySelector('[data-lines]');
  const summaryEl = root.querySelector('[data-summary]');
  const provider = getPaymentProvider();

  const draw = () => {
    const cart = getCart();
    if (!cart.lines.length) {
      linesEl.innerHTML = `<div class="empty-state"><h2>Tu carrito está vacío</h2><p>Explora el catálogo y elige color, almacenamiento y condición.</p><a class="btn btn--primary" href="#/catalogo">Ir al catálogo</a></div>`;
      summaryEl.hidden = true;
      return;
    }
    summaryEl.hidden = false;
    linesEl.innerHTML = `<ul class="cart-lines">${cart.lines
      .map(
        (l) => `<li class="cart-line">
        <a class="cart-line__art" href="#/iphone/${l.modelId}" aria-hidden="true" tabindex="-1">${productVisual(l.product, { view: 'back', colorId: l.colorId })}</a>
        <div class="cart-line__info">
          <h2><a href="#/iphone/${l.modelId}">${esc(l.product.name)}</a></h2>
          <p>${storageLabel(l.storage)} · ${esc(l.color?.name || '')} · ${CONDITIONS[l.condition]}</p>
          <p class="cart-line__avail">${AVAILABILITY[l.offer?.availability || 'sin-inventario']}</p>
          <button type="button" class="cart-line__remove" data-remove="${esc(l.key)}">Eliminar</button>
        </div>
        <div class="qty" aria-label="Cantidad de ${esc(l.product.name)}">
          <button type="button" data-dec="${esc(l.key)}" aria-label="Quitar una unidad">−</button>
          <output>${l.qty}</output>
          <button type="button" data-inc="${esc(l.key)}" aria-label="Añadir una unidad" ${l.qty >= 10 ? 'disabled' : ''}>+</button>
        </div>
        <p class="cart-line__price">${l.subtotal ? formatCOP(l.subtotal) : 'Precio a confirmar'}${l.unitPrice && l.qty > 1 ? `<small>${formatCOP(l.unitPrice)} c/u</small>` : ''}</p>
      </li>`,
      )
      .join('')}</ul>`;

    summaryEl.innerHTML = `<h2 id="summary-title">Resumen del pedido</h2>
      <dl class="summary__rows">
        <div><dt>Productos</dt><dd>${cart.count}</dd></div>
        <div><dt>Subtotal con precio</dt><dd>${cart.total ? formatCOP(cart.total) : '—'}</dd></div>
        ${cart.pendingPrices ? `<div><dt>Con precio por confirmar</dt><dd>${cart.pendingPrices}</dd></div>` : ''}
        <div><dt>Envío</dt><dd>Se acuerda al confirmar</dd></div>
        <div class="summary__total"><dt>Total estimado</dt><dd>${cart.total ? formatCOP(cart.total) : 'Por confirmar'}</dd></div>
      </dl>
      ${cart.pendingPrices ? '<p class="notice">Algunos productos aún no tienen precio publicado. BUNEMA te confirmará el valor final antes de cualquier pago.</p>' : ''}
      <form class="checkout" novalidate data-checkout>
        <h3>Datos de contacto</h3>
        <div class="field"><label for="c-name">Nombre completo</label><input id="c-name" name="name" class="input" required autocomplete="name" minlength="3" /><p class="field__error" aria-live="polite"></p></div>
        <div class="field"><label for="c-phone">Celular</label><input id="c-phone" name="phone" class="input" required type="tel" autocomplete="tel" inputmode="tel" pattern="[0-9+ ]{10,15}" placeholder="300 000 0000" /><p class="field__error" aria-live="polite"></p></div>
        <div class="field"><label for="c-email">Correo (opcional)</label><input id="c-email" name="email" class="input" type="email" autocomplete="email" /><p class="field__error" aria-live="polite"></p></div>
        <div class="field"><label for="c-city">Ciudad</label><input id="c-city" name="city" class="input" required autocomplete="address-level2" /><p class="field__error" aria-live="polite"></p></div>
        <div class="field"><label for="c-notes">Notas (opcional)</label><textarea id="c-notes" name="notes" class="textarea" rows="3" placeholder="Horario de contacto, forma de entrega…"></textarea></div>
        <label class="check"><input type="checkbox" name="accept" required /> <span>Acepto que BUNEMA use estos datos para responder mi solicitud (<a href="#/aviso-legal">aviso legal</a>).</span></label>
        <p class="field__error" data-accept-error aria-live="polite"></p>
        <button class="btn btn--primary btn--block" type="submit">Enviar solicitud de pedido</button>
        <p class="summary__pay">${isConfigured() ? `Pago en línea con ${esc(provider?.label || '')}.` : 'Pago en línea no disponible todavía: no se realizará ningún cobro. Recibirás un número de solicitud para confirmar con BUNEMA.'}</p>
      </form>`;

    const form = summaryEl.querySelector('[data-checkout]');
    bindLiveValidation(form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(form)) return;
      const data = Object.fromEntries(new FormData(form));
      const order = createOrder({ name: data.name.trim(), phone: data.phone.trim(), email: data.email.trim(), city: data.city.trim(), notes: data.notes.trim() });
      navigate(`/pedido/${order.id}`);
    });
  };

  const onClick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const lines = getCart().lines;
    const find = (k) => lines.find((l) => l.key === k);
    if (t.dataset.remove) removeLine(t.dataset.remove);
    if (t.dataset.inc) setQty(t.dataset.inc, find(t.dataset.inc).qty + 1);
    if (t.dataset.dec) setQty(t.dataset.dec, find(t.dataset.dec).qty - 1);
  };
  linesEl.addEventListener('click', onClick);
  // Solo redibuja las líneas y el resumen sin perder lo escrito en el formulario.
  const off = onCartChange(() => {
    const form = summaryEl.querySelector('[data-checkout]');
    const saved = form ? Object.fromEntries(new FormData(form)) : null;
    draw();
    const next = summaryEl.querySelector('[data-checkout]');
    if (saved && next) Object.entries(saved).forEach(([k, v]) => next.elements[k] && (next.elements[k].type === 'checkbox' ? (next.elements[k].checked = v === 'on') : (next.elements[k].value = v)));
  });
  draw();

  return {
    title: 'Carrito',
    description: 'Carrito de compras BUNEMA: resumen del pedido y total estimado en COP.',
    dispose() {
      off();
      linesEl.removeEventListener('click', onClick);
    },
  };
}
