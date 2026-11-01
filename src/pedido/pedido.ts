import type { Producto } from '../catalogo/tipos'
import { formasDeEnvio } from '../config'

export type ItemPedido = {
  productoId: string
  nombre: string
  variante?: string
  precio: number
  cantidad: number
}

export type DatosCliente = {
  nombre: string
  /** Barrio o localidad, para calcular el envío. */
  zona: string
  /** Id de una de las formasDeEnvio de config.ts. */
  envio: string
}

export type Pedido = { items: ItemPedido[]; cliente: DatosCliente }

export type Accion =
  | { tipo: 'agregar'; producto: Producto; variante?: string; cantidad?: number }
  | { tipo: 'cambiarCantidad'; clave: string; cantidad: number }
  | { tipo: 'quitar'; clave: string }
  | { tipo: 'vaciar' }
  | { tipo: 'cliente'; cliente: Partial<DatosCliente> }

export const pedidoVacio: Pedido = {
  items: [],
  cliente: { nombre: '', zona: '', envio: formasDeEnvio[0].id },
}

/** Un mismo producto en dos tonos distintos son dos ítems. */
export function claveItem(item: { productoId: string; variante?: string }): string {
  return item.variante ? `${item.productoId}::${item.variante}` : item.productoId
}

export function reducirPedido(pedido: Pedido, accion: Accion): Pedido {
  switch (accion.tipo) {
    case 'agregar': {
      const { producto, variante, cantidad = 1 } = accion
      const clave = claveItem({ productoId: producto.id, variante })
      const existe = pedido.items.some((i) => claveItem(i) === clave)
      const items = existe
        ? pedido.items.map((i) => (claveItem(i) === clave ? { ...i, cantidad: i.cantidad + cantidad } : i))
        : [
            ...pedido.items,
            { productoId: producto.id, nombre: producto.nombre, variante, precio: producto.precio, cantidad },
          ]
      return { ...pedido, items }
    }
    case 'cambiarCantidad':
      if (accion.cantidad <= 0) return reducirPedido(pedido, { tipo: 'quitar', clave: accion.clave })
      return {
        ...pedido,
        items: pedido.items.map((i) =>
          claveItem(i) === accion.clave ? { ...i, cantidad: Math.min(accion.cantidad, 999) } : i,
        ),
      }
    case 'quitar':
      return { ...pedido, items: pedido.items.filter((i) => claveItem(i) !== accion.clave) }
    case 'vaciar':
      return { ...pedido, items: [] }
    case 'cliente':
      return { ...pedido, cliente: { ...pedido.cliente, ...accion.cliente } }
  }
}

export function totalPedido(items: ItemPedido[]): number {
  return items.reduce((t, i) => t + i.precio * i.cantidad, 0)
}

export function cantidadTotal(items: ItemPedido[]): number {
  return items.reduce((t, i) => t + i.cantidad, 0)
}

const formatoPesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

/** 3850 → "$ 3.850" */
export function pesos(monto: number): string {
  return formatoPesos.format(monto).replace(/ /g, ' ')
}

/** El texto que se manda por WhatsApp. */
export function armarMensaje(pedido: Pedido): string {
  const lineas = pedido.items.map((i) => {
    const nombre = i.variante ? `${i.nombre} ${i.variante}` : i.nombre
    return `- ${i.cantidad} x ${nombre} (${pesos(i.precio * i.cantidad)})`
  })
  const { nombre, zona, envio } = pedido.cliente
  const formaEnvio = formasDeEnvio.find((f) => f.id === envio)?.nombre ?? 'A convenir'
  return [
    '¡Hola Luma! Quiero hacer este pedido:',
    '',
    ...lineas,
    '',
    `Total: ${pesos(totalPedido(pedido.items))} (sin envío)`,
    '',
    `Nombre: ${nombre.trim() || '-'}`,
    `Barrio o localidad: ${zona.trim() || '-'}`,
    `Envío: ${formaEnvio}`,
  ].join('\n')
}

/** Lee el pedido guardado; si está roto o es de otra versión, arranca vacío. */
export function leerPedidoGuardado(texto: string | null): Pedido {
  if (!texto) return pedidoVacio
  try {
    const p = JSON.parse(texto) as Pedido
    if (!Array.isArray(p.items) || typeof p.cliente !== 'object') return pedidoVacio
    const items = p.items.filter(
      (i) => typeof i.productoId === 'string' && typeof i.precio === 'number' && i.cantidad > 0,
    )
    return { items, cliente: { ...pedidoVacio.cliente, ...p.cliente } }
  } catch {
    return pedidoVacio
  }
}
