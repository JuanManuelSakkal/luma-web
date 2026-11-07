import { stockDisponible, type Producto } from '../catalogo/tipos'
import { formasDeEnvio } from '../config'

export type ItemPedido = {
  productoId: string
  nombre: string
  variante?: string
  precio: number
  cantidad: number
  /** Unidades que había al agregarlo (o al último chequeo con el catálogo). Sin valor = sin límite. */
  stock?: number
}

export type DatosCliente = {
  nombre: string
  /** Barrio o localidad, para calcular el envío. */
  zona: string
  /** Id de una de las formasDeEnvio de config.ts. */
  envio: string
}

export type Pedido = {
  items: ItemPedido[]
  cliente: DatosCliente
  /** Lo que se corrigió solo porque cambió el stock, para avisarle a la clienta. */
  ajustes?: string[]
}

export type Accion =
  | { tipo: 'agregar'; producto: Producto; variante?: string; cantidad?: number }
  | { tipo: 'cambiarCantidad'; clave: string; cantidad: number }
  | { tipo: 'quitar'; clave: string }
  | { tipo: 'vaciar' }
  | { tipo: 'cliente'; cliente: Partial<DatosCliente> }
  /** Con el catálogo recién cargado: baja cantidades que ya no hay y saca lo que se agotó. */
  | { tipo: 'ajustarStock'; productos: Producto[] }
  | { tipo: 'olvidarAjustes' }

export const pedidoVacio: Pedido = {
  items: [],
  cliente: { nombre: '', zona: '', envio: formasDeEnvio[0].id },
}

/** Un mismo producto en dos colores distintos son dos ítems. */
export function claveItem(item: { productoId: string; variante?: string }): string {
  return item.variante ? `${item.productoId}::${item.variante}` : item.productoId
}

export function reducirPedido(pedido: Pedido, accion: Accion): Pedido {
  switch (accion.tipo) {
    case 'agregar': {
      const { producto, variante, cantidad = 1 } = accion
      const clave = claveItem({ productoId: producto.id, variante })
      const stock = stockDisponible(producto, variante)
      const limite = conStock(stock)
      const actual = pedido.items.find((i) => claveItem(i) === clave)
      // Nunca más unidades de las que hay, sumando lo que ya estaba en el pedido.
      const nueva = Math.min((actual?.cantidad ?? 0) + cantidad, stock, MAXIMO)
      if (nueva <= 0) return pedido
      const items = actual
        ? pedido.items.map((i) => (claveItem(i) === clave ? { ...i, cantidad: nueva, stock: limite } : i))
        : [
            ...pedido.items,
            {
              productoId: producto.id,
              nombre: producto.nombre,
              variante,
              precio: producto.precio,
              cantidad: nueva,
              ...(limite === undefined ? {} : { stock: limite }),
            },
          ]
      return { ...pedido, items }
    }
    case 'cambiarCantidad':
      if (accion.cantidad <= 0) return reducirPedido(pedido, { tipo: 'quitar', clave: accion.clave })
      return {
        ...pedido,
        items: pedido.items.map((i) =>
          claveItem(i) === accion.clave
            ? { ...i, cantidad: Math.min(accion.cantidad, i.stock ?? MAXIMO, MAXIMO) }
            : i,
        ),
      }
    case 'ajustarStock':
      return ajustarStock(pedido, accion.productos)
    case 'olvidarAjustes':
      return pedido.ajustes ? { ...pedido, ajustes: undefined } : pedido
    case 'quitar':
      return { ...pedido, items: pedido.items.filter((i) => claveItem(i) !== accion.clave) }
    case 'vaciar':
      return { ...pedido, items: [] }
    case 'cliente':
      return { ...pedido, cliente: { ...pedido.cliente, ...accion.cliente } }
  }
}

/** Tope de unidades de un mismo ítem cuando no se controla el stock. */
const MAXIMO = 999

/** El stock como se guarda en el ítem: sin valor si no hay límite. */
function conStock(stock: number): number | undefined {
  return Number.isFinite(stock) ? stock : undefined
}

/**
 * Pone el pedido guardado al día con el catálogo: si de algo quedan menos unidades que las pedidas,
 * baja la cantidad; si se agotó o ya no está, lo saca. Anota cada cambio para avisarlo.
 */
function ajustarStock(pedido: Pedido, productos: Producto[]): Pedido {
  const ajustes: string[] = []
  const items: ItemPedido[] = []
  for (const item of pedido.items) {
    const producto = productos.find((p) => p.id === item.productoId)
    const nombre = item.variante ? `${item.nombre} ${item.variante}` : item.nombre
    const stock = producto ? stockDisponible(producto, item.variante) : 0
    if (stock <= 0) {
      ajustes.push(`${nombre} se agotó y lo sacamos de tu pedido.`)
      continue
    }
    const { stock: _anterior, ...resto } = item
    const limite = conStock(stock)
    const ajustado: ItemPedido = limite === undefined ? resto : { ...resto, stock: limite }
    if (item.cantidad > stock) {
      ajustado.cantidad = stock
      ajustes.push(`De ${nombre} ${stock === 1 ? 'queda 1 unidad' : `quedan ${stock} unidades`}.`)
    }
    items.push(ajustado)
  }
  const cambio = ajustes.length > 0 || items.some((i, n) => i.stock !== pedido.items[n]?.stock)
  if (!cambio) return pedido
  return { ...pedido, items, ajustes: ajustes.length ? ajustes : pedido.ajustes }
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
