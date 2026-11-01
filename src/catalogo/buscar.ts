import { aSlug } from './importar'
import type { Producto } from './tipos'

/** Busca en nombre, categoría y tonos, sin importar acentos ni mayúsculas. */
export function coincide(producto: Producto, busqueda: string): boolean {
  const palabras = aSlug(busqueda).split('-').filter(Boolean)
  if (palabras.length === 0) return true
  const texto = aSlug(
    [producto.nombre, producto.categoria, ...producto.variantes.map((v) => v.nombre)].join(' '),
  )
  return palabras.every((p) => texto.includes(p))
}
