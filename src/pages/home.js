import '../styles/home.css';
import { gsap, ScrollTrigger, prefersReduced } from '../animations/gsap.js';
import { createReveals } from '../animations/reveal.js';
import { getAllProducts, getProduct } from '../services/catalogService.js';
import { productCard } from '../components/productCard.js';
import { mountCompareTray } from '../components/compareTray.js';
import { phoneSVG, productVisual } from '../components/phoneArt.js';
import { GENERATION_STORIES } from '../data/generations.js';
import { channelsConfigured, whatsappLink } from '../services/contactService.js';

/**
 * Inicio: hero cinematográfico con el iPhone 18 Pro Max en 3D, línea actual,
 * cifras del 18 Pro, recorrido por generaciones y llamada a la tienda.
 */
const HERO_ID = 'iphone-18-pro-max';
const THREE_DEG = (deg) => (deg * Math.PI) / 180;

export async function render({ root }) {
  const hero = getProduct(HERO_ID);
  const current = getAllProducts().filter((p) => p.appleStatus === 'vigente');
  const wa = whatsappLink('Hola BUNEMA, quiero asesoría para elegir un iPhone.');
  const channels = channelsConfigured();

  root.innerHTML = `
  <section class="hero" data-hero aria-labelledby="hero-title">
    <div class="hero__sticky">
      <div class="hero__bg" aria-hidden="true"><span class="hero__glow hero__glow--a"></span><span class="hero__glow hero__glow--b"></span><span class="hero__grid"></span></div>
      <div class="hero__viewer viewer" data-hero-viewer>
        <div class="hero__fallback" data-hero-fallback hidden>
          ${phoneSVG(hero, { view: 'front', className: 'hero__fallback-front' })}
          ${phoneSVG(hero, { view: 'back', className: 'hero__fallback-back' })}
        </div>
      </div>
      <div class="hero__copy" data-hero-copy>
        <p class="eyebrow" data-hero-in>BUNEMA · Tienda de iPhone en Colombia</p>
        <h1 id="hero-title" class="hero__title" data-hero-in><span class="gradient-text">El futuro está en tus manos.</span></h1>
        <p class="hero__subtitle" data-hero-in>Nuevo, usado o reacondicionado. Elige tu iPhone y cómpralo en pesos colombianos.</p>
        <div class="hero__actions" data-hero-actions>
          <a class="btn btn--primary" href="#/catalogo">Comprar iPhone</a>
          <a class="btn btn--ghost" href="#/iphone/${HERO_ID}">Ver iPhone 18 Pro Max</a>
        </div>
      </div>
      <ol class="hero__callouts" aria-label="Recorrido por el iPhone 18 Pro Max">
        <li class="hero__callout hero__callout--front" data-callout="0">
          <span class="hero__callout-kicker">Frontal</span>
          <strong>Pantalla Super Retina XDR de 6,9″</strong>
          ProMotion hasta 120 Hz · 3000 nits en exteriores · Ceramic Shield 2
        </li>
        <li class="hero__callout hero__callout--side" data-callout="1">
          <span class="hero__callout-kicker">Lateral</span>
          <strong>8,75 mm de unibody de aluminio</strong>
          Control de la Cámara y botón de Acción
        </li>
        <li class="hero__callout hero__callout--back" data-callout="2">
          <span class="hero__callout-kicker">Trasera</span>
          <strong>Sistema de cámaras Pro Fusion de 48 MP</strong>
          Apertura variable ƒ/1.48–ƒ/4.0 · zoom de 8x de calidad óptica
        </li>
      </ol>
      <p class="hero__note">Modelo 3D ilustrativo generado con las medidas oficiales (163,4 × 78 × 8,75 mm). No es un render de Apple.</p>
      <a class="hero__scroll" href="#lineup" data-scroll-cue aria-label="Desplázate para explorar"><span></span></a>
    </div>
  </section>

  <section class="home-section" id="lineup" aria-labelledby="lineup-title">
    <div class="home-section__inner">
      <header class="section-head" data-reveal>
        <span class="eyebrow">Línea actual</span>
        <h2 id="lineup-title">Los iPhone que Apple vende hoy.</h2>
        <p>Del plegable iPhone Duo al iPhone 16, según el catálogo vigente de Apple Colombia. Precios y disponibilidad de BUNEMA, en pesos colombianos.</p>
      </header>
      <div class="lineup-track" data-lineup>
        ${current.map((p) => productCard(p)).join('')}
      </div>
      <div class="home-section__more" data-reveal>
        <a class="btn btn--ghost" href="#/catalogo">Ver los ${getAllProducts().length} modelos del catálogo</a>
      </div>
    </div>
  </section>

  <section class="home-section stats" aria-labelledby="stats-title">
    <div class="home-section__inner">
      <header class="section-head" data-reveal>
        <span class="eyebrow">iPhone 18 Pro y 18 Pro Max</span>
        <h2 id="stats-title">Ingeniería en cifras.</h2>
        <p>Datos de la ficha técnica oficial de Apple Colombia.</p>
      </header>
      <ul class="stats__grid" data-reveal-stagger>
        <li><span class="stats__value"><span data-count="48">48</span> MP</span><span class="stats__label">Fusion principal con apertura variable ƒ/1.48–ƒ/4.0</span></li>
        <li><span class="stats__value"><span data-count="8">8</span>x</span><span class="stats__label">Zoom de calidad óptica para acercar</span></li>
        <li><span class="stats__value"><span data-count="43">43</span> h</span><span class="stats__label">De reproducción de video en el 18 Pro Max</span></li>
        <li><span class="stats__value"><span data-count="2">2</span> TB</span><span class="stats__label">De almacenamiento máximo</span></li>
        <li><span class="stats__value"><span data-count="3000">3000</span></span><span class="stats__label">Nits de brillo máximo en exteriores</span></li>
        <li><span class="stats__value">A20 Pro</span><span class="stats__label">CPU de 6 núcleos y GPU de 7 núcleos con aceleradores neuronales</span></li>
      </ul>
      <p class="stats__cta" data-reveal><a class="link-arrow" href="#/comparar?m=iphone-18-pro-max,iphone-18-pro,iphone-17-pro-max">Comparar 18 Pro Max, 18 Pro y 17 Pro Max</a></p>
    </div>
  </section>

  <section class="generations" data-generations aria-labelledby="gen-title">
    <div class="generations__pin">
      <header class="generations__head">
        <span class="eyebrow">Una década de iPhone</span>
        <h2 id="gen-title">Cada generación, un salto.</h2>
      </header>
      <div class="generations__track" data-gen-track>
        ${GENERATION_STORIES.map((g) => {
          const p = getProduct(g.hero);
          return `<article class="gen-card" style="--accent:${g.accent}">
            <div class="gen-card__art" aria-hidden="true">${p ? productVisual(p, { view: 'back' }) : ''}</div>
            <div class="gen-card__body">
              <p class="gen-card__year">${g.year}</p>
              <h3>${g.title}</h3>
              <p>${g.headline}</p>
              <a class="link-arrow" href="#/galeria?g=${g.id}">Ver la generación</a>
            </div>
          </article>`;
        }).join('')}
      </div>
    </div>
  </section>

  <section class="home-section store-cta" aria-labelledby="store-title">
    <div class="home-section__inner store-cta__inner" data-reveal>
      <div>
        <span class="eyebrow">Tienda BUNEMA</span>
        <h2 id="store-title">Nuevo, usado o reacondicionado. Tú eliges.</h2>
        <p class="lead">Arma tu pedido con color, almacenamiento y condición. Te confirmamos disponibilidad y precio final en COP antes de cualquier pago.</p>
      </div>
      <div class="store-cta__actions">
        <a class="btn btn--light" href="#/catalogo">Ir al catálogo</a>
        ${wa ? `<a class="btn btn--ghost" href="${wa}" target="_blank" rel="noopener">Asesoría por WhatsApp</a>` : `<a class="btn btn--ghost" href="#/contacto">Consultar disponibilidad</a>`}
      </div>
      ${channels.whatsapp ? '' : '<p class="store-cta__note">La consulta se envía desde el formulario de contacto.</p>'}
    </div>
  </section>`;

  const disposers = [];
  const tray = mountCompareTray(root);
  disposers.push(() => tray.dispose());

  const ctx = createReveals(root);
  disposers.push(() => ctx.revert());

  const heroCtl = await setupHero(root, hero);
  disposers.push(() => heroCtl.dispose());
  disposers.push(setupGenerations(root));

  return {
    title: 'Tienda de iPhone en Colombia',
    description: 'BUNEMA, The iPhone Experience: iPhone 18 Pro Max en 3D, catálogo completo de iPhone, comparador y tienda en pesos colombianos.',
    dispose: () => disposers.forEach((fn) => fn()),
  };
}

async function setupHero(root, product) {
  const section = root.querySelector('[data-hero]');
  const viewerEl = root.querySelector('[data-hero-viewer]');
  const reduced = prefersReduced();
  const { supportsWebGL, PhoneViewer } = await import('../three/PhoneViewer.js');
  let viewer = null;
  const ctx = gsap.context(() => {}, section);

  if (!supportsWebGL()) {
    root.querySelector('[data-hero-fallback]').hidden = false;
    section.classList.add('is-fallback');
  } else {
    viewer = new PhoneViewer(viewerEl, { product, colorId: 'plata', interactive: false, distance: 54, fov: 26 });
  }

  if (viewer) {
    const s = viewer.stage;
    // Coloca el teléfono en el espacio libre bajo el texto, sea cual sea el tamaño de pantalla.
    const copyEl = root.querySelector('[data-hero-copy]');
    const sticky = root.querySelector('.hero__sticky');
    const place = () => {
      const vh = sticky.clientHeight || window.innerHeight;
      const top = Math.min(0.7, (copyEl.getBoundingClientRect().bottom - sticky.getBoundingClientRect().top + 18) / vh);
      const bottom = 0.94;
      const visible = (2 * viewer.camera.position.z * Math.tan(THREE_DEG(viewer.camera.fov / 2))) / (viewer.camera.zoom || 1);
      const avail = Math.max(0.24, bottom - top) * visible;
      const scale = Math.min(1, avail / viewer.model.size.H);
      s.scale.setScalar(scale);
      s.position.set(0, (0.5 - (top + bottom) / 2) * visible, 0);
      s.rotation.set(0.06, -0.55, 0);
    };
    viewer.resize();
    place();
    viewer.invalidate();

    // Parallax con el ratón: el modelo sigue el puntero con suavidad.
    const target = { x: 0, y: 0 };
    const currentRot = { x: 0, y: 0 };
    let raf = 0;
    const loop = () => {
      currentRot.x += (target.x - currentRot.x) * 0.08;
      currentRot.y += (target.y - currentRot.y) * 0.08;
      viewer.model.group.rotation.x = currentRot.x;
      viewer.model.group.rotation.y = currentRot.y;
      viewer.invalidate();
      raf = Math.abs(target.x - currentRot.x) + Math.abs(target.y - currentRot.y) > 0.0005 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e) => {
      if (reduced || e.pointerType === 'touch') return;
      target.y = (e.clientX / window.innerWidth - 0.5) * 0.5;
      target.x = (e.clientY / window.innerHeight - 0.5) * 0.25;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    section.addEventListener('pointermove', onMove);
    ctx.add(() => () => {
      section.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    });

    // Recorrido con el scroll: crece y muestra frontal → lateral → trasera.
    if (!reduced) {
      ctx.add(() => {
        const callouts = gsap.utils.toArray('[data-callout]');
        gsap.set(callouts, { autoAlpha: 0, y: 20 });
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          onUpdate: () => viewer.invalidate(),
          scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true },
        });
        tl.to('[data-hero-copy], [data-scroll-cue]', { autoAlpha: 0, y: -40, duration: 0.12 }, 0)
          .to(s.position, { y: 0, duration: 0.2 }, 0)
          .to(s.scale, { x: 1, y: 1, z: 1, duration: 0.2 }, 0)
          .to(s.rotation, { x: 0, y: 0, duration: 0.2 }, 0)
          .to(callouts[0], { autoAlpha: 1, y: 0, duration: 0.06 }, 0.16)
          .to(callouts[0], { autoAlpha: 0, y: -20, duration: 0.06 }, 0.36)
          .to(s.rotation, { y: Math.PI / 2, x: 0.05, duration: 0.18 }, 0.36)
          .to(s.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 0.18 }, 0.36)
          .to(callouts[1], { autoAlpha: 1, y: 0, duration: 0.06 }, 0.5)
          .to(callouts[1], { autoAlpha: 0, y: -20, duration: 0.06 }, 0.66)
          .to(s.rotation, { y: Math.PI, x: 0, duration: 0.18 }, 0.66)
          .to(s.scale, { x: 1.18, y: 1.18, z: 1.18, duration: 0.18 }, 0.66)
          .to(callouts[2], { autoAlpha: 1, y: 0, duration: 0.06 }, 0.82)
          .to({}, { duration: 0.12 }, 0.88);
      });
      const onResize = () => ScrollTrigger.refresh();
      window.addEventListener('resize', onResize);
      ctx.add(() => () => window.removeEventListener('resize', onResize));
    } else {
      section.classList.add('is-static');
    }
  }

  // Entrada
  ctx.add(() => {
    if (reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('[data-hero-in]', { autoAlpha: 0, y: 30, duration: 1.1, stagger: 0.12 }, 0.1).from('[data-hero-actions]', { autoAlpha: 0, y: 20, duration: 0.9 }, 0.5);
    if (viewer) {
      const s = viewer.stage;
      tl.from(s.position, { y: -16, duration: 1.8, ease: 'expo.out', onUpdate: () => viewer.invalidate() }, 0).from(
        s.rotation,
        { y: -2.6, duration: 2.2, ease: 'expo.out', onUpdate: () => viewer.invalidate() },
        0,
      );
    } else {
      tl.from('.hero__fallback svg', { autoAlpha: 0, y: 60, duration: 1.4, stagger: 0.15 }, 0);
    }
  });

  return {
    dispose() {
      ctx.revert();
      viewer?.dispose();
    },
  };
}

/** Escritorio: la fila de generaciones se desplaza en horizontal con el scroll. Móvil: deslizamiento nativo. */
function setupGenerations(root) {
  const section = root.querySelector('[data-generations]');
  const track = root.querySelector('[data-gen-track]');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('is-pinned');
    const distance = () => track.scrollWidth - window.innerWidth + 64;
    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true },
    });
    gsap.utils.toArray('.gen-card', track).forEach((card) => {
      gsap.from(card.querySelector('.gen-card__art'), { rotate: -8, y: 40, ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, scrub: true } });
    });
    return () => section.classList.remove('is-pinned');
  });
  return () => mm.revert();
}
