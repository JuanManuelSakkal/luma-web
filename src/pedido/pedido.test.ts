import { describe, expect, it } from 'vitest'
import type { Producto } from '../catalogo/tipos'
import { armarMensaje, leerPedidoGuardado, pedidoVacio, pesos, reducirPedido, totalPedido } from './pedido'
import { enlaces } from '../config'

const producto = (id: string, nombre: string, precio: number): Producto => ({
  id,
  nombre,
  categoria: 'Esmaltes',
  precio,
  variantes: [],
  destacado: false,
  disponibilidad: 'disponible',
})
const top = producto('top-cristal-15-ml', 'Top Cristal 15 ml', 5200)
const kapping = producto('kapping-cas', 'Kapping CAS', 3850)

describe('reducirPedido', () => {
  it('suma cantidades del mismo producto y tono, y separa tonos distintos', () => {
    let p = reducirPedido(pedidoVacio, { tipo: 'agregar', producto: top })
    p = reducirPedido(p, { tipo: 'agregar', producto: top })
    p = reducirPedido(p, { tipo: 'agregar', producto: kapping, variante: '#3' })
    p = reducirPedido(p, { tipo: 'agregar', producto: kapping, variante: '#4' })
    expect(p.items.map((i) => [i.productoId, i.variante, i.cantidad])).toEqual([
      ['top-cristal-15-ml', undefined, 2],
      ['kapping-cas', '#3', 1],
      ['kapping-cas', '#4', 1],
    ])
    expect(totalPedido(p.items)).toBe(5200 * 2 + 3850 * 2)
  })

  it('cantidad 0 quita el ítem', () => {
    const p = reducirPedido(pedidoVacio, { tipo: 'agregar', producto: top })
    expect(reducirPedido(p, { tipo: 'cambiarCantidad', clave: top.id, cantidad: 0 }).items).toEqual([])
  })
})

describe('armarMensaje', () => {
  it('arma el texto de WhatsApp con total y datos', () => {
    let p = reducirPedido(pedidoVacio, { tipo: 'agregar', producto: top, cantidad: 2 })
    p = reducirPedido(p, { tipo: 'agregar', producto: kapping, variante: '#3' })
    p = reducirPedido(p, { tipo: 'cliente', cliente: { nombre: 'Ana', pueblo: 'Eldorado' } })
    expect(armarMensaje(p)).toBe(
      [
        '¡Hola Mond! Quiero hacer este pedido:',
        '',
        `- 2 x Top Cristal 15 ml (${pesos(10400)})`,
        `- 1 x Kapping CAS #3 (${pesos(3850)})`,
        '',
        `Total: ${pesos(14250)}`,
        '',
        'Nombre: Ana',
        'Localidad: Eldorado',
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
