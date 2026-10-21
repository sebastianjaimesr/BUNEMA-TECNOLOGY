import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createContactShadow } from '../scene/contactShadow.js';

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

export function createHeroPresentation({ sceneManager, phone, heroEl, reducedMotion }) {
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

  /** Aplica el estado actual a los objetos 3D y pide un único fotograma. */
  function apply() {
    const hidden = 1 - motion.reveal;
    pivot.rotation.set(
      POSE.x + motion.exit * 0.25,
      POSE.y - hidden * 0.9 + motion.exit * 0.7,
      POSE.z - hidden * 0.12,
    );
    pivot.position.y = -hidden * 2.4;
    stage.position.set(base.x, base.y + motion.exit * base.travel, 0);
    stage.scale.setScalar(base.scale * (0.92 + motion.reveal * 0.08));
    shadow.mesh.material.opacity = motion.reveal * (1 - motion.exit);
    sceneManager.requestRender();
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

  // Cuando el hero sale por completo de pantalla, el 3D deja de dibujar.
  const visibility = new IntersectionObserver(([entry]) => sceneManager.setActive(entry.isIntersecting), {
    threshold: 0,
  });
  visibility.observe(heroEl);

  let revealTween = null;

  /** Entrada del producto. No bloquea la interacción: la página ya es navegable. */
  function reveal() {
    if (reducedMotion) {
      apply();
      return;
    }
    revealTween = gsap.to(motion, { reveal: 1, duration: 2.1, ease: 'expo.out', onUpdate: apply });
  }

  return {
    stage,
    reveal,
    dispose() {
      revealTween?.kill();
      exitTween?.scrollTrigger?.kill();
      exitTween?.kill();
      visibility.disconnect();
      heroObserver.disconnect();
      offResize();
      heroEl.style.removeProperty('--stage-x');
      heroEl.style.removeProperty('--stage-y');
      shadow.dispose();
      stage.removeFromParent();
    },
  };
}
