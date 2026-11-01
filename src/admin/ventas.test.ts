import { describe, expect, it } from 'vitest'
import { inicioDelDia, nombreVendido, porDia, porProducto, resumir, ventasACsv, type Venta } from './ventas'

const venta = (v: Partial<Venta>): Venta => ({
  id: 1,
  fecha: '2026-10-20T15:00:00Z',
  variante_id: 1,
  producto: 'Kapping',
  variante: '#3',
  cantidad: 1,
  precio_unitario: 5000,
  nota: null,
  vendedor: null,
  vendedor_nombre: 'Mary',
  ...v,
})

const ventas = [
  venta({ id: 1, cantidad: 2 }),
  venta({ id: 2, variante: '#1', fecha: '2026-10-21T13:00:00Z' }),
  venta({ id: 3, producto: 'Lima', variante: null, precio_unitario: 800, cantidad: 3 }),
  venta({ id: 4, producto: 'Top', variante: null, precio_unitario: 4000, fecha: '2026-10-21T18:00:00Z' }),
]

describe('ventas', () => {
  it('suma ventas, unidades y plata', () => {
    expect(resumir(ventas)).toEqual({ ventas: 4, unidades: 7, total: 2 * 5000 + 5000 + 3 * 800 + 4000 })
  })

  it('agrupa por producto sumando los tonos, de lo más vendido a lo menos', () => {
    expect(porProducto(ventas)).toEqual([
      { producto: 'Kapping', unidades: 3, total: 15000 },
      { producto: 'Lima', unidades: 3, total: 2400 },
      { producto: 'Top', unidades: 1, total: 4000 },
    ])
  })

  it('agrupa por día, del más nuevo al más viejo', () => {
    const dias = porDia(ventas)
    expect(dias).toHaveLength(2)
    expect(dias[0].ventas.map((v) => v.id)).toEqual([4, 2])
    expect(dias[1].ventas.map((v) => v.id).sort()).toEqual([1, 3])
  })

  it('nombra el tono solo si tiene', () => {
    expect(nombreVendido(ventas[0])).toBe('Kapping #3')
    expect(nombreVendido(ventas[2])).toBe('Lima')
  })

  it('calcula el inicio del día', () => {
    expect(inicioDelDia(6, new Date(2026, 9, 22, 23, 15))).toEqual(new Date(2026, 9, 16))
  })

  it('arma un CSV para Excel con el total de cada venta', () => {
    const csv = ventasACsv([venta({ cantidad: 2, nota: 'Debe, paga el viernes' })])
    expect(csv.startsWith('﻿')).toBe(true)
    const [encabezado, fila] = csv.slice(1).split('\r\n')
    expect(encabezado).toBe('fecha,hora,producto,variante,cantidad,precio_unitario,total,vendio,nota')
    expect(fila).toContain(',Kapping,#3,2,5000,10000,Mary,"Debe, paga el viernes"')
  })
})
