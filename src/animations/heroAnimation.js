import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createContactShadow } from '../scene/contactShadow.js';
import { createHeroMotion } from './heroMotion.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Presentación del Bunema X1 en el hero.
 *
 * Jerarquía de objetos:
 *   stage  → posición y escala según el tamaño de pantalla (composición)
 *   └ pivot → pose de exhibición + desplazamientos de animación
 *     └ phone.root
 *   └ sombra de contacto
 *
 * Separar "dónde está" (stage) de "cómo gira" (pivot) evita que el
 * responsive y las animaciones se pisen entre sí.
 */

// Pose de exhibición: tres cuartos trasero, ligeramente inclinado.
const POSE = { x: -0.18, y: Math.PI - 0.62, z: 0.2 };

export function createHeroPresentation({ sceneManager, phone, heroEl, reducedMotion, quality }) {
  const { scene } = sceneManager;
  const stage = new THREE.Group();
  const pivot = new THREE.Group();
  stage.name = 'hero-stage';
  pivot.add(phone.root);
  stage.add(pivot);

  const shadow = createContactShadow();
  stage.add(shadow.mesh);
  scene.add(stage);

  // Valores que animan GSAP y el scroll. `reveal` va de 0 (oculto) a 1 (en reposo).
  const motion = { reveal: reducedMotion ? 1 : 0, exit: 0 };
  const base = { x: 0, y: 0, scale: 1, travel: 0 };
  // Pose que impone la sección de ingeniería. `blend` 0 = pose del hero, 1 = pose de la historia.
  const story = { blend: 0, x: 0, y: 0, scale: 1, rx: 0, ry: 0, rz: 0 };
  const mix = (a, b) => a + (b - a) * story.blend;
  const accent = phone.materialLibrary.materials.accent;
  const accentIntensity = accent.emissiveIntensity;

  // Capa de movimiento vivo (cursor, flotación, arrastre). Se suma a la pose en apply().
  const live = createHeroMotion({
    sceneManager,
    heroEl,
    dragEl: heroEl,
    reducedMotion,
    coarsePointer: quality.coarsePointer,
    onUpdate: () => apply(false), // ya estamos dentro de un fotograma: no pedir otro
  });

  /**
   * Aplica TODO el estado (entrada + salida por scroll + movimiento vivo)
   * a los objetos 3D. Es el único lugar que escribe sus transformaciones.
   */
  function apply(request = true) {
    const hidden = 1 - motion.reveal;
    const l = live.state;
    // Durante la historia el movimiento vivo se atenúa: el despiece necesita precisión.
    const liveAmount = 1 - story.blend * 0.75;
    pivot.rotation.set(
      mix(POSE.x + motion.exit * 0.25, story.rx) + l.tiltX * liveAmount,
      mix(POSE.y - hidden * 0.9 + motion.exit * 0.7, story.ry) + (l.tiltY + l.sway) * liveAmount,
      mix(POSE.z - hidden * 0.12, story.rz),
    );
    pivot.position.y = -hidden * 2.4 + l.floatY * (1 - story.blend);
    stage.position.set(
      mix(base.x + l.shiftX, story.x),
      mix(base.y + motion.exit * base.travel, story.y),
      0,
    );
    stage.scale.setScalar(mix(base.scale * (0.92 + motion.reveal * 0.08), story.scale));
    // La sombra responde a la flotación: más arriba, más pequeña y tenue. En el despiece desaparece.
    shadow.mesh.scale.setScalar(1 - l.floatY * 0.35);
    shadow.mesh.material.opacity =
      motion.reveal * (1 - motion.exit) * (1 - l.floatY * 0.6) * (1 - story.blend);
    if (request) sceneManager.requestRender();
  }

  const slot = heroEl.querySelector('[data-stage-slot]');

  /**
   * Composición responsive: decide tamaño y posición del teléfono.
   *  - Móvil/tablet vertical: el teléfono ocupa el hueco `[data-stage-slot]`
   *    del flujo HTML y se desplaza exactamente con el contenido.
   *  - Escritorio: posición fija a la derecha con un parallax moderado.
   * Conversión clave: píxeles CSS → unidades de mundo = px / alto del viewport × alto visible.
   */
  function layout({ width, height, view }) {
    const { height: phoneH } = phone.dimensions;
    const pxToWorld = view.height / height;
    const heroHeight = heroEl.offsetHeight;
    const slotRect = slot?.getBoundingClientRect();
    const useSlot = slotRect && slotRect.height > 0;

    let targetH;
    if (useSlot) {
      // Posición del hueco relativa al hero (no depende del scroll actual).
      const top = slotRect.top - heroEl.getBoundingClientRect().top;
      const centerPx = top + slotRect.height / 2;
      targetH = slotRect.height * 0.9 * pxToWorld;
      base.x = 0;
      base.y = (height / 2 - centerPx) * pxToWorld;
      base.travel = heroHeight * pxToWorld; // acompaña al contenido 1:1
    } else {
      targetH = view.height * (width < 1200 ? 0.64 : 0.7);
      base.x = view.width * (width < 1200 ? 0.17 : 0.13);
      base.y = view.height * 0.01;
      base.travel = heroHeight * pxToWorld * 0.35; // parallax: más lento que el contenido
    }
    base.scale = targetH / phoneH;
    // La sombra se coloca bajo el teléfono, en coordenadas locales del stage.
    shadow.mesh.position.set(0, -phoneH * 0.56, -1);
    // El fondo CSS (halo, monograma, retícula) se centra donde está el teléfono.
    heroEl.style.setProperty('--stage-x', `${50 + (base.x / view.width) * 100}%`);
    heroEl.style.setProperty('--stage-y', `${50 - (base.y / view.height) * 100}%`);
    apply();
  }

  const relayout = () =>
    layout({
      width: sceneManager.canvas.clientWidth,
      height: sceneManager.canvas.clientHeight,
      view: sceneManager.viewSizeAt(),
    });

  const offResize = sceneManager.onResize(layout);
  // El hero puede cambiar de alto sin que cambie la ventana (fuentes, rotación): se recalcula.
  const heroObserver = new ResizeObserver(relayout);
  heroObserver.observe(heroEl);
  relayout();

  // Transición hacia la siguiente sección: el teléfono gira y sube mientras
  // la sección siguiente (con fondo opaco) lo cubre como un telón.
  const exitTween = reducedMotion
    ? null
    : gsap.to(motion, {
        exit: 1,
        ease: 'none',
        onUpdate: apply,
        scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: 0.6 },
      });

  // El hero es una de las regiones donde el 3D está activo.
  const offRegion = sceneManager.observeRegion(heroEl);

  let revealTimeline = null;
  if (!reducedMotion) accent.emissiveIntensity = 0;

  /**
   * Entrada del producto: sube girando desde abajo y, al asentarse,
   * la línea de luz y la Pulse Key "se encienden". Después arranca el
   * movimiento vivo. No bloquea la interacción: la página ya es navegable.
   */
  function reveal() {
    if (reducedMotion) {
      apply();
      live.start();
      return;
    }
    revealTimeline = gsap
      .timeline({ onUpdate: apply })
      .to(motion, { reveal: 1, duration: 2.1, ease: 'expo.out' }, 0)
      .to(accent, { emissiveIntensity: accentIntensity, duration: 0.9, ease: 'power2.out' }, 0.8)
      .call(live.start, null, 0.6);
  }

  /** La sección de ingeniería escribe aquí su pose; apply() la mezcla con la del hero. */
  function setStory(values, request = true) {
    Object.assign(story, values);
    apply(request);
  }

  return {
    stage,
    reveal,
    setStory,
    get baseScale() {
      return base.scale;
    },
    dispose() {
      revealTimeline?.kill();
      live.dispose();
      accent.emissiveIntensity = accentIntensity;
      exitTween?.scrollTrigger?.kill();
      exitTween?.kill();
      offRegion();
      heroObserver.disconnect();
      offResize();
      heroEl.style.removeProperty('--stage-x');
      heroEl.style.removeProperty('--stage-y');
      shadow.dispose();
      stage.removeFromParent();
    },
  };
}
