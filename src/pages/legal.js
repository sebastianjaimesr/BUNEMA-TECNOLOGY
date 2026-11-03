import { SITE } from '../config/site.config.js';
import { getAllProducts } from '../services/catalogService.js';
import { esc } from '../services/format.js';

/** Aviso legal, fuentes de las especificaciones y tratamiento de datos. */
export async function render({ root }) {
  const products = getAllProducts();
  const sources = [...new Set(products.map((p) => p.verification?.source).filter(Boolean))];
  root.innerHTML = `<article class="page page--narrow legal">
    <span class="eyebrow">Aviso legal</span>
    <h1 style="font-size:var(--fs-h1);margin-bottom:24px">Transparencia BUNEMA</h1>

    <h2>Independencia de marca</h2>
    <p>${esc(SITE.disclaimer)}</p>

    <h2>Especificaciones</h2>
    <p>Las fichas técnicas se tomaron de las páginas oficiales de Apple Colombia (revisadas el 2 de noviembre de 2026). Los nombres de colores son los oficiales; las muestras de color son tonos aproximados. Fuentes consultadas:</p>
    <ul>${sources.map((s) => `<li><a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a></li>`).join('')}</ul>

    <h2>Imágenes y modelos 3D</h2>
    <p>Mientras no haya una fotografía oficial registrada para un modelo, BUNEMA muestra una <strong>ilustración vectorial</strong> generada a partir de su forma y sus medidas, marcada siempre como «Ilustración». Los visores 3D usan un <strong>modelo ilustrativo generado por código</strong> con las dimensiones oficiales; no son fotografías ni renders de Apple.</p>

    <h2>Precios, disponibilidad y pagos</h2>
    <p>Los precios en pesos colombianos y el inventario los define BUNEMA. Si un producto no tiene precio publicado, aparece como «Precio a consultar». El sitio no procesa pagos: un pedido es una <strong>solicitud</strong> que BUNEMA confirma por los canales de contacto antes de cualquier cobro.</p>

    <h2>Datos personales</h2>
    <p>El carrito, las solicitudes de pedido y las consultas se guardan en el almacenamiento local de tu navegador. Solo se envían a BUNEMA cuando eliges un canal (WhatsApp, correo o el formulario conectado). Puedes borrarlos eliminando los datos del sitio en tu navegador.</p>
  </article>`;
  return { title: 'Aviso legal y fuentes' };
}
