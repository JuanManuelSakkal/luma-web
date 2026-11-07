import { useEffect, useState } from 'react'
import { stockDisponible, type Disponibilidad, type Producto } from '../catalogo/tipos'
import { claveItem } from './pedido'
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
  const { pedido, despachar } = usePedido()
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

  const varianteElegida = tieneVariantes ? variante : undefined
  const stock = stockDisponible(producto, varianteElegida)
  const enPedido =
    pedido.items.find(
      (i) => claveItem(i) === claveItem({ productoId: producto.id, variante: varianteElegida }),
    )?.cantidad ?? 0
  /** Cuántas unidades más se pueden sumar al pedido. Infinity si no se controla el stock. */
  const restantes = Math.max(0, stock - enPedido)

  function agregar(cantidad = 1) {
    if (restantes <= 0) return
    despachar({
      tipo: 'agregar',
      producto,
      variante: varianteElegida,
      cantidad: Math.min(cantidad, restantes),
    })
    setAgregado(true)
  }

  return {
    variante,
    setVariante,
    tieneVariantes,
    disponibilidad,
    sinStock: disponibilidad === 'sin-stock' || stock <= 0,
    /** Unidades que hay de lo elegido (Infinity si no se controla). */
    stock,
    enPedido,
    restantes,
    /** Ya están en el pedido todas las unidades que hay. */
    todoEnPedido: stock > 0 && restantes <= 0,
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

/** "Queda 1 unidad", "Quedan 3 unidades". */
export function textoQuedan(stock: number): string {
  return stock === 1 ? 'Queda 1 unidad' : `Quedan ${stock} unidades`
}
