/** Cabecera: menú móvil accesible, estado activo y fondo al desplazarse. */
export function initHeader() {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.documentElement.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  window.addEventListener('hashchange', () => setOpen(false));
  window.matchMedia('(min-width: 961px)').addEventListener('change', () => setOpen(false));

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

export function setActiveNav(routeName, params = []) {
  document.querySelectorAll('[data-route-link]').forEach((a) => {
    let active = a.dataset.routeLink === routeName;
    if (routeName === 'iphone') active = a.getAttribute('href') === `#/iphone/${params[0]}` || (a.dataset.routeLink === 'catalogo' && params[0] !== 'iphone-18-pro-max');
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
