export type Disponibilidad = 'disponible' | 'pocas' | 'sin-stock'

export type Variante = {
  /** Tono o aroma tal como se muestra: "#3", "Lavanda", "Halo". */
  nombre: string
  disponibilidad: Disponibilidad
}

export type Producto = {
  /** Identificador fijo y legible, por ejemplo "top-cristal-15-ml". */
  id: string
  nombre: string
  categoria: string
  /** Precio en pesos, sin decimales. */
  precio: number
  /** Vacío si el producto no tiene tonos ni aromas. */
  variantes: Variante[]
  /** Etiqueta del selector de variantes: "Tono" o "Aroma". */
  tipoVariante?: string
  /** Aclaración corta, por ejemplo "Tonos surtidos". */
  nota?: string
  destacado: boolean
  disponibilidad: Disponibilidad
  imagenUrl?: string
  /** Foto con todos los tonos y sus números, para elegir el tono. */
  muestrarioUrl?: string
  /** Texto largo para la página del producto (ver catalogo/descripcion.ts). */
  descripcion?: string
}

export type Catalogo = {
  productos: Producto[]
  /** Categorías en el orden en que se muestran. */
  categorias: string[]
}
