import { useEffect, useState } from 'react'
import type { Disponibilidad, Producto } from '../catalogo/tipos'
import { usePedido } from './PedidoContext'

export const textoDisponibilidad: Record<Disponibilidad, string> = {
  disponible: 'Disponible',
  pocas: 'Últimas unidades',
  'sin-stock': 'Sin stock',
}

/**
 * Elegir tono y agregar al pedido. Lo comparten la tarjeta y la página del producto,
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
    /** "tonos" o "aromas". */
    plural: `${(producto.tipoVariante ?? 'tono').toLowerCase()}s`,
    agregado,
    agregar,
  }
}

/** Dirección de la página de un producto, con el tono elegido si hay. */
export function rutaProducto(id: string, variante?: string): string {
  return `/catalogo/${id}${variante ? `?tono=${encodeURIComponent(variante)}` : ''}`
}
