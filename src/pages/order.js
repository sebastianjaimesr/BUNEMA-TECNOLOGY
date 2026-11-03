import '../styles/store.css';
import { getOrder, getOrders, orderToText, ORDER_STATUS } from '../services/orderService.js';
import { whatsappLink, mailtoLink, sendInquiry, channelsConfigured } from '../services/contactService.js';
import { esc, formatCOP, formatDate, storageLabel, CONDITIONS } from '../services/format.js';

/** Detalle de una solicitud de pedido y canales para enviarla a BUNEMA. */
export async function render({ root, params }) {
  const order = getOrder(params[0]);
  if (!order) {
    root.innerHTML = `<div class="page page--narrow"><div class="empty-state" style="margin-top:40px"><h1>No encontramos esta solicitud</h1><p>Las solicitudes se guardan en el navegador donde se crearon. Si la hiciste en otro dispositivo, ábrela allí o escríbenos con su número.</p><a class="btn btn--primary" href="#/contacto">Contactar a BUNEMA</a></div></div>`;
    return { title: 'Solicitud no encontrada' };
  }
  const text = orderToText(order);
  const wa = whatsappLink(text);
  const mail = mailtoLink(`Solicitud de pedido ${order.id}`, text);
  const channels = channelsConfigured();
  const others = getOrders().filter((o) => o.id !== order.id);

  root.innerHTML = `<div class="page order">
    <header class="order__head">
      <span class="eyebrow">Solicitud de pedido</span>
      <h1>${esc(order.id)}</h1>
      <p class="lead">${formatDate(order.createdAt)} · <span class="badge badge--warn">${ORDER_STATUS[order.status] || order.status}</span></p>
    </header>

    <div class="store__layout">
      <section class="panel" aria-labelledby="items-title">
        <h2 id="items-title" class="order__h2">Productos</h2>
        <ul class="order__items">
          ${order.items
            .map(
              (i) => `<li><div><strong>${i.qty} × ${esc(i.name)}</strong><span>${storageLabel(i.storage)} · ${esc(i.color)} · ${CONDITIONS[i.condition] || esc(i.condition)}</span></div><span>${i.unitPrice ? formatCOP(i.unitPrice * i.qty) : 'Por confirmar'}</span></li>`,
            )
            .join('')}
        </ul>
        <dl class="summary__rows">
          <div class="summary__total"><dt>Total estimado</dt><dd>${order.total ? formatCOP(order.total) : 'Por confirmar'}</dd></div>
        </dl>
        ${order.pendingPrices ? `<p class="notice">${order.pendingPrices} producto(s) con precio por confirmar.</p>` : ''}
        <h2 class="order__h2">Datos de contacto</h2>
        <dl class="order__customer">
          <div><dt>Nombre</dt><dd>${esc(order.customer.name)}</dd></div>
          <div><dt>Celular</dt><dd>${esc(order.customer.phone)}</dd></div>
          ${order.customer.email ? `<div><dt>Correo</dt><dd>${esc(order.customer.email)}</dd></div>` : ''}
          <div><dt>Ciudad</dt><dd>${esc(order.customer.city)}</dd></div>
          ${order.customer.notes ? `<div><dt>Notas</dt><dd>${esc(order.customer.notes)}</dd></div>` : ''}
        </dl>
      </section>

      <aside class="panel order__send" aria-labelledby="send-title">
        <h2 id="send-title">Envía tu solicitud</h2>
        <p class="order__steps">1. Envía la solicitud por un canal. 2. BUNEMA confirma disponibilidad, precio final y entrega. 3. Acuerdan el pago. <strong>Este sitio no ha cobrado nada.</strong></p>
        <div class="order__actions">
          ${wa ? `<a class="btn btn--primary btn--block" href="${wa}" target="_blank" rel="noopener">Enviar por WhatsApp</a>` : ''}
          ${mail ? `<a class="btn btn--ghost btn--block" href="${mail}">Enviar por correo</a>` : ''}
          ${channels.endpoint ? `<button type="button" class="btn btn--ghost btn--block" data-send-endpoint>Enviar desde el sitio</button>` : ''}
          <button type="button" class="btn btn--ghost btn--block" data-copy>Copiar resumen</button>
          <button type="button" class="btn btn--ghost btn--block" data-print>Imprimir o guardar en PDF</button>
        </div>
        <p class="order__status" data-status aria-live="polite"></p>
        ${
          !wa && !mail && !channels.endpoint
            ? `<p class="notice">BUNEMA todavía no ha configurado WhatsApp, correo ni un formulario conectado. Tu solicitud quedó guardada en este navegador; copia el resumen o usa la <a href="#/contacto">página de contacto</a>.</p>`
            : ''
        }
      </aside>
    </div>

    ${
      others.length
        ? `<section class="order__history" aria-labelledby="hist-title"><h2 id="hist-title" class="order__h2">Otras solicitudes en este navegador</h2><ul>${others
            .map((o) => `<li><a href="#/pedido/${o.id}">${o.id}</a> · ${formatDate(o.createdAt)} · ${o.items.length} producto(s)</li>`)
            .join('')}</ul></section>`
        : ''
    }
  </div>`;

  const status = root.querySelector('[data-status]');
  const onClick = async (e) => {
    if (e.target.closest('[data-copy]')) {
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Resumen copiado. Pégalo en el canal que prefieras.';
      } catch {
        status.textContent = 'No se pudo copiar automáticamente. Selecciona y copia el detalle de esta página.';
      }
    }
    if (e.target.closest('[data-print]')) window.print();
    if (e.target.closest('[data-send-endpoint]')) {
      status.textContent = 'Enviando…';
      const res = await sendInquiry({ type: 'pedido', orderId: order.id, message: text, name: order.customer.name, phone: order.customer.phone, email: order.customer.email });
      status.textContent = res.delivered ? 'Solicitud enviada. BUNEMA te contactará pronto.' : 'No se pudo enviar ahora. Intenta de nuevo o usa otro canal.';
    }
  };
  root.addEventListener('click', onClick);

  return {
    title: `Solicitud ${order.id}`,
    dispose: () => root.removeEventListener('click', onClick),
  };
}
