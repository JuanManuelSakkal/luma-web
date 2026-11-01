// Filas de la base tal como las usa el portal de admin.

export type Categoria = { id: number; nombre: string; orden: number }

export type VarianteAdmin = {
  id?: number
  nombre: string
  /** null = no se controla stock (se muestra como disponible). */
  stock: number | null
  activo: boolean
  orden: number
}

export type ProductoAdmin = {
  id?: number
  slug: string
  nombre: string
  categoria_id: number | null
  subcategoria: string | null
  descripcion: string | null
  nota: string | null
  tipo_variante: TipoVariante | null
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
