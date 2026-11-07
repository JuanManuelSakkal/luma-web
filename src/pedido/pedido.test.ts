import { describe, expect, it } from 'vitest'
import type { Producto } from '../catalogo/tipos'
import { armarMensaje, leerPedidoGuardado, pedidoVacio, pesos, reducirPedido, totalPedido } from './pedido'
import { enlaces } from '../config'

const producto = (id: string, nombre: string, precio: number): Producto => ({
  id,
  nombre,
  categoria: 'Aros',
  precio,
  variantes: [],
  destacado: false,
  disponibilidad: 'disponible',
})
const aros = producto('aros-argolla', 'Aros argolla', 5200)
const anillo = producto('anillo-regulable', 'Anillo regulable', 3850)

describe('reducirPedido', () => {
  it('suma cantidades del mismo producto y color, y separa colores distintos', () => {
    let p = reducirPedido(pedidoVacio, { tipo: 'agregar', producto: aros })
    p = reducirPedido(p, { tipo: 'agregar', producto: aros })
    p = reducirPedido(p, { tipo: 'agregar', producto: anillo, variante: 'Dorado' })
    p = reducirPedido(p, { tipo: 'agregar', producto: anillo, variante: 'Plateado' })
    expect(p.items.map((i) => [i.productoId, i.variante, i.cantidad])).toEqual([
      ['aros-argolla', undefined, 2],
      ['anillo-regulable', 'Dorado', 1],
      ['anillo-regulable', 'Plateado', 1],
    ])
    expect(totalPedido(p.items)).toBe(5200 * 2 + 3850 * 2)
  })

  it('cantidad 0 quita el ítem', () => {
    const p = reducirPedido(pedidoVacio, { tipo: 'agregar', producto: aros })
    expect(reducirPedido(p, { tipo: 'cambiarCantidad', clave: aros.id, cantidad: 0 }).items).toEqual([])
  })
})

describe('armarMensaje', () => {
  it('arma el texto de WhatsApp con total y datos', () => {
    let p = reducirPedido(pedidoVacio, { tipo: 'agregar', producto: aros, cantidad: 2 })
    p = reducirPedido(p, { tipo: 'agregar', producto: anillo, variante: 'Dorado' })
    p = reducirPedido(p, { tipo: 'cliente', cliente: { nombre: 'Ana', zona: 'Palermo', envio: 'moto' } })
    expect(armarMensaje(p)).toBe(
      [
        '¡Hola Luma! Quiero hacer este pedido:',
        '',
        `- 2 x Aros argolla (${pesos(10400)})`,
        `- 1 x Anillo regulable Dorado (${pesos(3850)})`,
        '',
        `Total: ${pesos(14250)} (sin envío)`,
        '',
        'Nombre: Ana',
        'Barrio o localidad: Palermo',
        'Envío: Moto mensajería',
      ].join('\n'),
    )
  })

  it('formatea pesos con punto de miles', () => {
    expect(pesos(14250)).toMatch(/^\$ ?14\.250$/)
  })

  it('el link de WhatsApp lleva el número y el texto codificado', () => {
    expect(enlaces.whatsapp('Hola #3')).toBe('https://wa.me/5491134095159?text=Hola%20%233')
  })
})

describe('leerPedidoGuardado', () => {
  it('arranca vacío si lo guardado está roto', () => {
    expect(leerPedidoGuardado('{no es json')).toEqual(pedidoVacio)
    expect(leerPedidoGuardado('{"items":5}')).toEqual(pedidoVacio)
  })
})

describe('stock', () => {
  const conStock = (stock: number): Producto => ({ ...aros, stock })
  const conColores: Producto = {
    ...anillo,
    tipoVariante: 'Color',
    variantes: [
      { nombre: 'Dorado', disponibilidad: 'pocas', stock: 2 },
      { nombre: 'Plateado', disponibilidad: 'sin-stock', stock: 0 },
    ],
  }

  it('no deja agregar más unidades de las que hay, sumando lo que ya estaba', () => {
    let p = reducirPedido(pedidoVacio, { tipo: 'agregar', producto: conStock(3), cantidad: 2 })
    p = reducirPedido(p, { tipo: 'agregar', producto: conStock(3), cantidad: 5 })
    expect(p.items[0]).toMatchObject({ cantidad: 3, stock: 3 })
    p = reducirPedido(p, { tipo: 'cambiarCantidad', clave: aros.id, cantidad: 10 })
    expect(p.items[0].cantidad).toBe(3)
  })

  it('cuenta el stock de cada variante y no agrega una agotada', () => {
    let p = reducirPedido(pedidoVacio, {
      tipo: 'agregar',
      producto: conColores,
      variante: 'Dorado',
      cantidad: 4,
    })
    p = reducirPedido(p, { tipo: 'agregar', producto: conColores, variante: 'Plateado' })
    expect(p.items.map((i) => [i.variante, i.cantidad])).toEqual([['Dorado', 2]])
  })

  it('sin stock cargado no hay límite', () => {
    const p = reducirPedido(pedidoVacio, { tipo: 'agregar', producto: aros, cantidad: 20 })
    expect(p.items[0].cantidad).toBe(20)
    expect(p.items[0].stock).toBeUndefined()
  })

  it('ajusta un pedido guardado al stock de hoy y avisa', () => {
    let p = reducirPedido(pedidoVacio, { tipo: 'agregar', producto: conStock(5), cantidad: 4 })
    p = reducirPedido(p, { tipo: 'agregar', producto: conColores, variante: 'Dorado' })
    const hoy = [
      conStock(2),
      {
        ...conColores,
        variantes: [{ ...conColores.variantes[0], stock: 0, disponibilidad: 'sin-stock' as const }],
      },
    ]
    p = reducirPedido(p, { tipo: 'ajustarStock', productos: hoy })
    expect(p.items).toEqual([expect.objectContaining({ productoId: aros.id, cantidad: 2, stock: 2 })])
    expect(p.ajustes).toEqual([
      'De Aros argolla quedan 2 unidades.',
      'Anillo regulable Dorado se agotó y lo sacamos de tu pedido.',
    ])
    expect(reducirPedido(p, { tipo: 'ajustarStock', productos: hoy })).toBe(p)
    expect(reducirPedido(p, { tipo: 'olvidarAjustes' }).ajustes).toBeUndefined()
  })
})
