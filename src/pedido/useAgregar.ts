import { useEffect, useState } from 'react'
import type { Disponibilidad, Producto } from '../catalogo/tipos'
import { usePedido } from './PedidoContext'

export const textoDisponibilidad: Record<Disponibilidad, string> = {
  disponible: 'Disponible',
  pocas: 'Últimas unidades',
  'sin-stock': 'Sin stock',
}

/**
 * Elegir color, medida o modelo y agregar al pedido. Lo comparten la tarjeta y la página del producto,
 * así las dos se comportan igual.
 */
export function useAgregar(producto: Producto, varianteInicial?: string) {
  const { despachar } = usePedido()
  const elegible = (nombre?: string) =>
    producto.variantes.find((v) => v.nombre === nombre && v.disponibilidad !== 'sin-stock')?.nombre
  const primeraDisponible = producto.variantes.find((v) => v.disponibilidad !== 'sin-stock')
  const [variante, setVariante] = useState(elegible(varianteInicial) ?? primeraDisponible?.nombre ?? '')
  const [agregado, setAgregado] = useState(false)

  useEffect(() => {
    if (!agregado) return
    const t = setTimeout(() => setAgregado(false), 1600)
    return () => clearTimeout(t)
  }, [agregado])

  const tieneVariantes = producto.variantes.length > 0
  const disponibilidad = tieneVariantes
    ? (producto.variantes.find((v) => v.nombre === variante)?.disponibilidad ?? 'sin-stock')
    : producto.disponibilidad

  function agregar(cantidad = 1) {
    despachar({ tipo: 'agregar', producto, variante: tieneVariantes ? variante : undefined, cantidad })
    setAgregado(true)
  }

  return {
    variante,
    setVariante,
    tieneVariantes,
    disponibilidad,
    sinStock: disponibilidad === 'sin-stock',
    /** "colores", "medidas" o "modelos". */
    plural: pluralVariante(producto.tipoVariante),
    agregado,
    agregar,
  }
}

/** "Color" → "colores", "Medida" → "medidas". */
export function pluralVariante(tipo = 'Opción'): string {
  const t = tipo.toLowerCase()
  return /[aeiou]$/.test(t) ? `${t}s` : `${t}es`
}

/** Dirección de la página de un producto, con la variante elegida si hay. */
export function rutaProducto(id: string, variante?: string): string {
  return `/catalogo/${id}${variante ? `?opcion=${encodeURIComponent(variante)}` : ''}`
}
