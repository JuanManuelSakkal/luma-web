export type Disponibilidad = 'disponible' | 'pocas' | 'sin-stock'

export type Variante = {
  /** Color, medida o modelo tal como se muestra: "Dorado", "16", "Corazón". */
  nombre: string
  disponibilidad: Disponibilidad
  /** Unidades que hay. Sin valor = no se controla el stock (no hay límite). */
  stock?: number
}

export type Producto = {
  /** Identificador fijo y legible, por ejemplo "aros-argolla-dorada". */
  id: string
  nombre: string
  categoria: string
  /** Por ejemplo "Argollas" dentro de "Aros". Opcional. */
  subcategoria?: string
  /** Precio en pesos, sin decimales. */
  precio: number
  /** Vacío si el producto no tiene colores, medidas ni modelos. */
  variantes: Variante[]
  /** Etiqueta del selector de variantes: "Color", "Medida" o "Modelo". */
  tipoVariante?: string
  /** Aclaración corta, por ejemplo "Colores surtidos". */
  nota?: string
  destacado: boolean
  disponibilidad: Disponibilidad
  /** Solo para productos sin variantes: unidades que hay. Sin valor = no se controla. */
  stock?: number
  imagenUrl?: string
  /** Foto con todas las variantes juntas, para elegir. */
  muestrarioUrl?: string
  /** Texto largo para la página del producto (ver catalogo/descripcion.ts). */
  descripcion?: string
}

export type Catalogo = {
  productos: Producto[]
  /** Categorías en el orden en que se muestran. */
  categorias: string[]
}

/**
 * Cuántas unidades hay de un producto (o de una de sus variantes).
 * Infinity si no se controla el stock; 0 si está sin stock o la variante ya no existe.
 */
export function stockDisponible(producto: Producto, variante?: string): number {
  if (producto.variantes.length === 0) {
    if (producto.disponibilidad === 'sin-stock') return 0
    return producto.stock ?? Infinity
  }
  const v = producto.variantes.find((x) => x.nombre === variante)
  if (!v || v.disponibilidad === 'sin-stock') return 0
  return v.stock ?? Infinity
}
