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
  descripcion: string | null
  nota: string | null
  tipo_variante: 'Tono' | 'Aroma' | null
  precio: number
  destacado: boolean
  activo: boolean
  imagen_url: string | null
  /** Foto con todos los tonos y sus números. */
  muestrario_url: string | null
  variantes: VarianteAdmin[]
}

/** Nombre de la variante que usan los productos sin tonos ni aromas. */
export const UNICA = 'Único'

export function tieneVariantes(p: Pick<ProductoAdmin, 'variantes'>): boolean {
  return p.variantes.some((v) => v.nombre !== UNICA)
}
