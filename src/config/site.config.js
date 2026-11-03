/**
 * Configuración de marca y valores por defecto de la tienda.
 *
 * Los datos de negocio que cambian (número de WhatsApp, correo, precios,
 * inventario, pasarela de pago) NO se escriben aquí: viven en
 * `public/data/store.json`, que se edita desde el panel administrativo
 * (/admin.html → Exportar) o a mano. Así nunca hay que tocar el código
 * para cambiar un precio, y nada se inventa: lo que no está configurado
 * se muestra como «por configurar» o «a consultar».
 */
export const SITE = {
  brand: 'BUNEMA',
  legalName: 'BUNEMA TECHNOLOGY',
  concept: 'The iPhone Experience',
  slogan: 'Technology Beyond Limits',
  locale: 'es-CO',
  currency: 'COP',
  market: 'Colombia',
  url: 'https://sebastianjaimesr.github.io/BUNEMA-TECNOLOGY/',
  /** Aviso de independencia: BUNEMA no es Apple ni distribuidor autorizado. */
  disclaimer:
    'BUNEMA es una tienda independiente. No es Apple Inc. ni distribuidor autorizado de Apple. iPhone es una marca registrada de Apple Inc.; los nombres de los productos se usan solo para identificarlos.',
  /** Archivo con precios, inventario y canales de contacto (ruta relativa al sitio). */
  storeDataUrl: './data/store.json',
};

/** Valores por defecto si store.json no trae alguno. Vacío = no configurado. */
export const DEFAULT_SETTINGS = {
  whatsappNumber: '', // formato internacional sin "+", p. ej. 57XXXXXXXXXX
  contactEmail: '',
  contactEndpoint: '', // URL que acepta POST JSON (p. ej. Formspree o un backend propio)
  city: '',
  payment: { provider: null, publicKey: '' }, // 'wompi' | 'epayco' | 'mercadopago' | null
  adminPinHash: '', // SHA-256 del PIN local del panel (ver README: no es seguridad real)
};
