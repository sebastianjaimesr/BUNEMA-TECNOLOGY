import '../styles/store.css';
import { getAllProducts, getProduct } from '../services/catalogService.js';
import { sendInquiry, whatsappLink, mailtoLink, channelsConfigured } from '../services/contactService.js';
import { validateForm, bindLiveValidation } from '../components/forms.js';
import { esc, storageLabel, CONDITIONS } from '../services/format.js';
import { getSettings } from '../services/storeService.js';

/** Contacto y consulta de disponibilidad. */
export async function render({ root, query }) {
  const products = getAllProducts();
  const pre = getProduct(query.get('modelo'));
  const color = pre?.colors.find((c) => c.id === query.get('color'));
  const preText = pre
    ? `Quiero consultar disponibilidad y precio de ${pre.name}${query.get('gb') ? ` ${storageLabel(Number(query.get('gb')))}` : ''}${color ? ` en ${color.name}` : ''}${query.get('cond') ? ` (${CONDITIONS[query.get('cond')] || ''})` : ''}.`
    : '';
  const wa = whatsappLink(preText || 'Hola BUNEMA, quiero hacer una consulta.');
  const s = getSettings();
  const channels = channelsConfigured();

  root.innerHTML = `<div class="page contact">
    <div class="contact__layout">
      <header class="contact__intro">
        <span class="eyebrow">Contacto</span>
        <h1>Hablemos de tu próximo iPhone.</h1>
        <p class="lead">Consulta disponibilidad, precio en COP, condición del equipo o formas de entrega${s.city ? ` en ${esc(s.city)}` : ' en Colombia'}.</p>
        <ul class="contact__channels">
          ${wa ? `<li><a class="btn btn--primary" href="${wa}" target="_blank" rel="noopener">Escribir por WhatsApp</a></li>` : ''}
          ${s.contactEmail ? `<li><a class="link-arrow" href="${mailtoLink('Consulta BUNEMA', '')}">${esc(s.contactEmail)}</a></li>` : ''}
        </ul>
        ${!channels.whatsapp && !channels.email && !channels.endpoint ? '<p class="notice">Los canales de contacto de BUNEMA aún no están configurados. Tu consulta quedará registrada en este navegador y podrás copiarla.</p>' : ''}
      </header>

      <form class="panel contact__form" novalidate data-form>
        <div class="form-grid">
          <div class="field"><label for="k-name">Nombre</label><input id="k-name" name="name" class="input" required minlength="3" autocomplete="name" /><p class="field__error" aria-live="polite"></p></div>
          <div class="field"><label for="k-phone">Celular</label><input id="k-phone" name="phone" class="input" type="tel" inputmode="tel" pattern="[0-9+ ]{10,15}" required autocomplete="tel" /><p class="field__error" aria-live="polite"></p></div>
          <div class="field field--full"><label for="k-email">Correo</label><input id="k-email" name="email" class="input" type="email" autocomplete="email" required /><p class="field__error" aria-live="polite"></p></div>
          <div class="field field--full"><label for="k-model">Modelo de interés</label>
            <select id="k-model" name="model" class="select"><option value="">Sin preferencia</option>${products.map((p) => `<option value="${p.id}" ${pre?.id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
          </div>
          <div class="field field--full"><label for="k-msg">Mensaje</label><textarea id="k-msg" name="message" class="textarea" required minlength="10">${esc(preText)}</textarea><p class="field__error" aria-live="polite"></p></div>
          <label class="check field--full"><input type="checkbox" name="accept" required /> <span>Acepto que BUNEMA use estos datos para responder (<a href="#/aviso-legal">aviso legal</a>).</span></label>
          <p class="field__error field--full" data-accept-error aria-live="polite"></p>
        </div>
        <button class="btn btn--primary" type="submit">Enviar consulta</button>
        <div class="contact__result" data-result aria-live="polite"></div>
      </form>
    </div>
  </div>`;

  const form = root.querySelector('[data-form]');
  const result = root.querySelector('[data-result]');
  bindLiveValidation(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;
    const data = Object.fromEntries(new FormData(form));
    delete data.accept;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const res = await sendInquiry({ type: 'consulta', ...data, modelName: getProduct(data.model)?.name || '' });
    btn.disabled = false;
    const body = `${data.message}\n\n${data.name} · ${data.phone} · ${data.email}`;
    const waLink = whatsappLink(body);
    const mail = mailtoLink('Consulta BUNEMA', body);
    if (res.delivered) {
      result.innerHTML = `<p class="notice notice--info">Consulta enviada (${res.entry.id}). BUNEMA te responderá pronto.</p>`;
      form.reset();
    } else {
      result.innerHTML = `<p class="notice">Guardamos tu consulta ${res.entry.id} en este navegador${res.via === 'endpoint' ? ', pero el envío al servidor falló' : ''}. Para que llegue a BUNEMA, envíala por:</p>
        <div class="contact__fallback">
          ${waLink ? `<a class="btn btn--primary btn--small" href="${waLink}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          ${mail ? `<a class="btn btn--ghost btn--small" href="${mail}">Correo</a>` : ''}
          <button type="button" class="btn btn--ghost btn--small" data-copy>Copiar consulta</button>
        </div>`;
      result.querySelector('[data-copy]').addEventListener('click', async (ev) => {
        try {
          await navigator.clipboard.writeText(body);
          ev.target.textContent = 'Copiada';
        } catch {
          ev.target.textContent = 'No se pudo copiar';
        }
      });
    }
  });

  return { title: 'Contacto', description: 'Consulta disponibilidad y precio de iPhone en BUNEMA, Colombia.' };
}
