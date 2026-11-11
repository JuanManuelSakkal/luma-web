// Datos de Luma que aparecen en la web. Para cambiar algo de esto no hace falta tocar
// ningún otro archivo.

export const contacto = {
  /** Vacío hasta que Luma tenga dominio propio. */
  dominio: '',
  instagram: 'lumaaccesorios_vos',
  email: 'lumaaccesorios.ba@gmail.com',
  /** Formato internacional para wa.me: 54 + 9 + característica + número, sin 0 ni 15. */
  whatsapp: '5491125357726',
  whatsappVisible: '11 2535-7726',
}

/** Datos para pagar por transferencia. Se muestran en la web y en el pedido. */
export const transferencia = {
  alias: 'ana.510.abrigo.mp',
  titular: 'Ana María Núñez',
}

/** "https://dominio" si Luma ya tiene dominio; si no, la dirección donde está publicada la web. */
export function origenSitio(): string {
  return contacto.dominio ? `https://${contacto.dominio}` : window.location.origin
}

export const enlaces = {
  instagram: `https://instagram.com/${contacto.instagram}`,
  email: `mailto:${contacto.email}`,
  whatsapp: (texto?: string) =>
    `https://wa.me/${contacto.whatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`,
}

/** Productos que aparecen en la portada (por su id), además de los marcados como destacados en el admin. */
export const destacados = [
  'aros-argolla-dorada',
  'collar-corazon',
  'pulsera-charm-estrellas',
  'anillo-fino-cubic',
  'aros-abridores-perla',
  'esclava-lisa',
]

/** Cómo se manda el pedido. El primero es el que viene elegido. */
export const formasDeEnvio = [
  { id: 'moto', nombre: 'Moto mensajería', detalle: 'CABA y zonas cercanas' },
  { id: 'correo', nombre: 'Correo Argentino', detalle: 'A domicilio o a sucursal, a todo el país' },
  { id: 'convenir', nombre: 'A convenir', detalle: 'Lo charlamos por WhatsApp' },
] as const

/** Días que se pueden pedir cambios o devoluciones desde que llega el pedido. */
export const diasParaCambios = 15
