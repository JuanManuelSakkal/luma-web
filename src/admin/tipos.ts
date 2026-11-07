// Filas de la base tal como las usa el portal de admin.

export type Categoria = { id: number; nombre: string; orden: number }

export type VarianteAdmin = {
  id?: number
  nombre: string
  /** null = no se controla stock (se muestra como disponible). */
  stock: number | null
  activo: boolean
  orden: number
  /** Valor de la primera opción ("Dorado"). Con una sola opción es igual al nombre. */
  valor1?: string | null
  /** Valor de la segunda opción ("14"), solo si el producto tiene dos opciones. */
  valor2?: string | null
}

export type ProductoAdmin = {
  id?: number
  slug: string
  nombre: string
  categoria_id: number | null
  subcategoria: string | null
  descripcion: string | null
  nota: string | null
  /** Nombre de la primera opción: Color, Medida, Modelo… */
  tipo_variante: string | null
  /** Nombre de la segunda opción (Talle). null = una sola opción. */
  tipo_variante2?: string | null
  /** Foto de cada valor de la primera opción: { Dorado: "https://…" }. */
  fotos_opcion?: Record<string, string>
  /** Título del muestrario ("Guía de talles"). Vacío = "Ver el muestrario de colores". */
  muestrario_titulo?: string | null
  precio: number
  destacado: boolean
  activo: boolean
  imagen_url: string | null
  /** Foto con todas las variantes juntas. */
  muestrario_url: string | null
  variantes: VarianteAdmin[]
}

export type TipoVariante = 'Color' | 'Medida' | 'Modelo'

/** Nombre de la variante que usan los productos sin colores, medidas ni modelos. */
export const UNICA = 'Único'

export function tieneVariantes(p: Pick<ProductoAdmin, 'variantes'>): boolean {
  return p.variantes.some((v) => v.nombre !== UNICA)
}
