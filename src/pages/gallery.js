import '../styles/gallery.css';
import { gsap, ScrollTrigger, prefersReduced } from '../animations/gsap.js';
import { createReveals } from '../animations/reveal.js';
import { GENERATION_STORIES, TOPIC_LABELS, HISTORY } from '../data/generations.js';
import { getAllProducts, getProduct } from '../services/catalogService.js';
import { productVisual } from '../components/phoneArt.js';
import { esc } from '../services/format.js';

/**
 * Galería tecnológica: un capítulo visual por generación, con filtro por tema
 * (cámaras, pantallas, materiales…), parallax y la línea de modelos en
 * desplazamiento horizontal.
 */
export async function render({ root, query }) {
  const all = getAllProducts();
  let topic = query.get('tema') || 'todas';

  root.innerHTML = `<div class="gallery">
    <header class="gallery__intro">
      <span class="eyebrow">Galería tecnológica</span>
      <h1>La evolución del iPhone, capítulo a capítulo.</h1>
      <p class="lead">Cámaras, pantallas, materiales, procesadores y diseño: lo que cada generación trajo de nuevo.</p>
      <div class="chips gallery__topics" role="group" aria-label="Filtrar por tema">
        <button type="button" class="chip" data-topic="todas">Todo</button>
        ${Object.entries(TOPIC_LABELS).map(([k, l]) => `<button type="button" class="chip" data-topic="${k}">${l}</button>`).join('')}
      </div>
    </header>
    <div data-chapters></div>
    <section class="gallery__history" aria-labelledby="gh-title">
      <h2 id="gh-title">Los orígenes</h2>
      <ol class="timeline" data-reveal-stagger>${HISTORY.map((h) => `<li><span>${h.year}</span><strong>${esc(h.name)}</strong><p>${esc(h.note)}</p></li>`).join('')}</ol>
    </section>
    <p class="gallery__note">Las imágenes de esta galería son ilustraciones generadas con la forma y proporciones de cada modelo. Las fotografías oficiales se registran desde el panel cuando se dispone de ellas con permiso de uso.</p>
  </div>`;

  const chapters = root.querySelector('[data-chapters]');
  let ctx;

  const draw = () => {
    ctx?.revert();
    root.querySelectorAll('[data-topic]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.topic === topic)));
    const stories = GENERATION_STORIES.filter((g) => topic === 'todas' || g.topics[topic]);
    chapters.innerHTML = stories.length
      ? stories
          .map((g, i) => {
            const hero = getProduct(g.hero);
            const models = all.filter((p) => p.generation === g.id || (g.id === '8' && p.generation === '7'));
            const topics = Object.entries(g.topics).filter(([k]) => topic === 'todas' || k === topic);
            return `<section class="chapter ${i % 2 ? 'chapter--alt' : ''}" id="gen-${g.id}" style="--accent:${g.accent}" aria-labelledby="ch-${g.id}">
              <div class="chapter__inner">
                <div class="chapter__art" aria-hidden="true">
                  <div class="chapter__phone chapter__phone--back" data-parallax="-60">${hero ? productVisual(hero, { view: 'back' }) : ''}</div>
                  <div class="chapter__phone chapter__phone--front" data-parallax="40">${hero ? productVisual(hero, { view: 'front' }) : ''}</div>
                </div>
                <div class="chapter__copy">
                  <p class="chapter__year">${g.year}</p>
                  <h2 id="ch-${g.id}">${esc(g.title)}</h2>
                  <p class="chapter__headline">${esc(g.headline)}</p>
                  <ul class="chapter__topics" data-reveal-stagger>
                    ${topics.map(([k, text]) => `<li><span>${TOPIC_LABELS[k]}</span>${esc(text)}</li>`).join('')}
                  </ul>
                </div>
              </div>
              ${
                models.length
                  ? `<div class="chapter__models" aria-label="Modelos de ${esc(g.title)}">${models
                      .map((p) => `<a class="mini-model" href="#/iphone/${p.id}"><span class="mini-model__art" aria-hidden="true">${productVisual(p, { view: 'back' })}</span><span>${esc(p.name)}</span></a>`)
                      .join('')}</div>`
                  : ''
              }
            </section>`;
          })
          .join('')
      : '<p class="empty-state">No hay capítulos para este tema.</p>';

    ctx = gsap.context(() => {
      if (prefersReduced()) return;
      gsap.utils.toArray('[data-parallax]').forEach((el) => {
        gsap.fromTo(el, { y: -Number(el.dataset.parallax) }, { y: Number(el.dataset.parallax), ease: 'none', scrollTrigger: { trigger: el.closest('.chapter'), start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      gsap.utils.toArray('.chapter__copy').forEach((el) => {
        gsap.from(el, { autoAlpha: 0, x: 40, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
      });
    }, chapters);
    const reveals = createReveals(chapters);
    const prevRevert = ctx.revert.bind(ctx);
    ctx.revert = () => {
      reveals.revert();
      prevRevert();
    };
    ScrollTrigger.refresh();
  };

  const onClick = (e) => {
    const b = e.target.closest('[data-topic]');
    if (!b) return;
    topic = b.dataset.topic;
    draw();
  };
  root.addEventListener('click', onClick);
  draw();
  const pageReveals = createReveals(root.querySelector('.gallery__history'));

  const g = query.get('g');
  if (g) requestAnimationFrame(() => document.getElementById(`gen-${g}`)?.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth' }));

  return {
    title: 'Galería tecnológica',
    description: 'La evolución del iPhone por generaciones: cámaras, pantallas, materiales, procesadores y diseño.',
    onQuery(q) {
      const id = q.get('g');
      if (id) document.getElementById(`gen-${id}`)?.scrollIntoView({ behavior: 'smooth' });
    },
    dispose() {
      ctx?.revert();
      pageReveals.revert();
      root.removeEventListener('click', onClick);
    },
  };
}
