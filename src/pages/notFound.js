export async function render({ root }) {
  root.innerHTML = `<section class="page page--narrow empty-state" style="margin-top:120px">
    <h1>Esta página no existe</h1>
    <p>El enlace puede estar incompleto o el modelo ya no está en el catálogo.</p>
    <a class="btn btn--primary" href="#/catalogo">Ver el catálogo</a>
  </section>`;
  return { title: 'Página no encontrada' };
}
