/** Avisos breves y accesibles (región aria-live en index.html). */
export function toast(message, { action, href, timeout = 4200 } = {}) {
  const region = document.querySelector('[data-toasts]');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span></span>${action ? `<a class="toast__action" href="${href}">${action}</a>` : ''}`;
  el.querySelector('span').textContent = message;
  region.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 400);
  }, timeout);
}
