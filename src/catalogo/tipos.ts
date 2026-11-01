export type Disponibilidad = 'disponible' | 'pocas' | 'sin-stock'

export type Variante = {
  /** Color, medida o modelo tal como se muestra: "Dorado", "16", "Corazón". */
  nombre: string
  disponibilidad: Disponibilidad
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
