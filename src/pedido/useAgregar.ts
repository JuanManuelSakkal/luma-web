import { useEffect, useState } from 'react'
import { stockDisponible, type Disponibilidad, type Producto } from '../catalogo/tipos'
import {
  buscarVariante,
  plural,
  disponibilidadElegida,
  seleccionInicial,
  tieneDosOpciones,
  valor2Disponible,
} from '../catalogo/opciones'
import { claveItem } from './pedido'
import { usePedido } from './PedidoContext'

export const textoDisponibilidad: Record<Disponibilidad, string> = {
  disponible: 'Disponible',
  pocas: 'Últimas unidades',
  'sin-stock': 'Sin stock',
}

/**
 * Elegir color (o color y talle) y agregar al pedido. Lo comparten la tarjeta y la página del
 * producto, así las dos se comportan igual.
 *
 * `inicial` es lo que trae el link: el nombre de la variante ("Dorado · 14") o solo el primer valor.
 */
export function useAgregar(producto: Producto, inicial?: string) {
  const { pedido, despachar } = usePedido()
  const [eleccion, setEleccion] = useState(() => seleccionInicial(producto, inicial))
  const [agregado, setAgregado] = useState(false)

  useEffect(() => {
    if (!agregado) return
    const t = setTimeout(() => setAgregado(false), 1600)
    return () => clearTimeout(t)
  }, [agregado])

  const tieneVariantes = producto.variantes.length > 0
  const dosOpciones = tieneDosOpciones(producto)
  const { valor1, valor2 } = eleccion
  const elegida = tieneVariantes ? buscarVariante(producto, valor1, valor2 || undefined) : undefined
  const disponibilidad = disponibilidadElegida(producto, valor1, valor2 || undefined)
  /** Con dos opciones, falta elegir la segunda (el talle). */
  const faltaValor2 = dosOpciones && !valor2

  function setValor1(nuevo: string) {
    // Si el talle elegido no existe en el color nuevo, se borra para que lo elija de nuevo.
    setEleccion((e) => ({
      valor1: nuevo,
      valor2: e.valor2 && valor2Disponible(producto, nuevo, e.valor2) ? e.valor2 : '',
    }))
  }
  function setValor2(nuevo: string) {
    setEleccion((e) => ({ ...e, valor2: nuevo }))
  }

  const varianteElegida = elegida?.nombre
  // El stock es el de la combinación elegida. Sin talle elegido todavía no hay tope que mostrar.
  const stock = faltaValor2 ? Infinity : stockDisponible(producto, varianteElegida)
  const enPedido =
    pedido.items.find(
      (i) => claveItem(i) === claveItem({ productoId: producto.id, variante: varianteElegida }),
    )?.cantidad ?? 0
  /** Cuántas unidades más se pueden sumar al pedido. Infinity si no se controla el stock. */
  const restantes = Math.max(0, stock - enPedido)

  function agregar(cantidad = 1) {
    if (faltaValor2 || (tieneVariantes && !elegida) || restantes <= 0) return
    despachar({
      tipo: 'agregar',
      producto,
      variante: elegida?.nombre,
      cantidad: Math.min(cantidad, restantes),
    })
    setAgregado(true)
  }

  return {
    /** Nombre de la variante elegida ("Dorado", "Dorado · 14"), o el primer valor si falta el talle. */
    variante: elegida?.nombre ?? valor1,
    /** Con una sola opción, elegir el color (o la medida) por su nombre. */
    setVariante: setValor1,
    valor1,
    valor2,
    setValor1,
    setValor2,
    dosOpciones,
    faltaValor2,
    tieneVariantes,
    disponibilidad,
    sinStock: disponibilidad === 'sin-stock' || (!faltaValor2 && stock <= 0),
    /** Unidades que hay de lo elegido (Infinity si no se controla o si falta elegir el talle). */
    stock,
    enPedido,
    restantes,
    /** Ya están en el pedido todas las unidades que hay. */
    todoEnPedido: !faltaValor2 && stock > 0 && restantes <= 0,
    /** "colores", "medidas" o "modelos". */
    plural: plural((producto.tipoVariante ?? 'color').toLowerCase()),
    agregado,
    agregar,
  }
}

/** "Color" → "colores", "Medida" → "medidas". */
export function pluralVariante(tipo = 'Opción'): string {
  return plural(tipo.toLowerCase())
}

/** Dirección de la página de un producto, con la variante elegida si hay. */
export function rutaProducto(id: string, variante?: string): string {
  return `/catalogo/${id}${variante ? `?opcion=${encodeURIComponent(variante)}` : ''}`
}

/** "Queda 1 unidad", "Quedan 3 unidades". */
export function textoQuedan(stock: number): string {
  return stock === 1 ? 'Queda 1 unidad' : `Quedan ${stock} unidades`
}
