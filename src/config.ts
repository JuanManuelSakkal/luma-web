// Datos de Mond que aparecen en la web. Para cambiar algo de esto no hace falta tocar
// ningún otro archivo.

export const contacto = {
  dominio: 'mond.ar',
  instagram: 'mond_insumos',
  /** Formato internacional para wa.me: 54 + 9 + característica + número, sin 0 ni 15. */
  whatsapp: '5491134095159',
  whatsappVisible: '11 3409-5159',
}

export const enlaces = {
  instagram: `https://instagram.com/${contacto.instagram}`,
  whatsapp: (texto?: string) =>
    `https://wa.me/${contacto.whatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`,
}

/** Productos que aparecen en la portada (por su id). */
export const destacados = [
  'tips-soft-gel-almendra-x500',
  'poligel-60-ml-03',
  'top-cristal-15-ml',
  'kapping-cas',
  'gel-paint',
  'base-15-ml',
  'polvo-aurora-hada',
  'polvo-luz-de-luna',
]

/** Fecha hasta la que valen los precios de lanzamiento. Vacío para no mostrar el aviso. */
export const preciosLanzamientoHasta = ''

export type Zona = { pueblo: string; dia?: string }

// Los días de entrega se completan cuando se cierre la logística con el tío.
export const zonasSemanales: Zona[] = [
  { pueblo: 'Montecarlo' },
  { pueblo: 'Eldorado' },
  { pueblo: 'Puerto Piray' },
  { pueblo: 'Puerto Rico' },
  { pueblo: 'Capioví' },
  { pueblo: 'Garuhapé' },
  { pueblo: 'Jardín América' },
  { pueblo: 'Puerto Libertad' },
]

export const zonasQuincenales: Zona[] = [
  { pueblo: 'San Pedro' },
  { pueblo: 'San Vicente' },
  { pueblo: 'Aristóbulo del Valle' },
  { pueblo: 'Oberá' },
  { pueblo: 'Posadas' },
]
