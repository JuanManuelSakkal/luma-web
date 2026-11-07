import { describe, expect, it } from 'vitest'
import {
  buscarVariante,
  disponibilidadElegida,
  fotoDe,
  fotoPrincipal,
  fotosPorValor,
  nombreCombinacion,
  seleccionInicial,
  textoBotonMuestrario,
  tieneDosOpciones,
  valor2Disponible,
  valores1,
  valores2,
} from './opciones'
import type { Producto, Variante } from './tipos'

const base: Producto = {
  id: 'x',
  nombre: 'X',
  categoria: 'C',
  precio: 100,
  variantes: [],
  destacado: false,
  disponibilidad: 'disponible',
}

const v = (
  valor1: string,
  valor2?: string,
  disponibilidad: Variante['disponibilidad'] = 'disponible',
): Variante => ({
  nombre: nombreCombinacion(valor1, valor2),
  valor1,
  valor2,
  disponibilidad,
})

const semi: Producto = {
  ...base,
  tipoVariante: 'Tono',
  imagenUrl: 'general.webp',
  fotosOpcion: { Dorado: 'dorado.webp', Cobre: 'cobre.webp' },
  variantes: [v('Dorado'), v('Plateado'), v('Cobre')],
}

const anillo: Producto = {
  ...base,
  tipoVariante: 'Color',
  tipoVariante2: 'Talle',
  fotosOpcion: { Plateado: 'plateado.webp', Dorado: 'dorado.webp' },
  variantes: [
    v('Dorado', '12'),
    v('Dorado', '14', 'sin-stock'),
    v('Plateado', '12'),
    v('Plateado', '14'),
    v('Plateado', '16'),
  ],
}

describe('opciones', () => {
  it('distingue una y dos opciones', () => {
    expect(tieneDosOpciones(semi)).toBe(false)
    expect(tieneDosOpciones(anillo)).toBe(true)
    // Un producto viejo (sin valor1) usa el nombre.
    expect(valores1({ variantes: [{ nombre: '#3', disponibilidad: 'disponible' }] })).toEqual(['#3'])
  })

  it('lista los valores de cada opción en orden', () => {
    expect(valores1(anillo)).toEqual(['Dorado', 'Plateado'])
    expect(valores2(anillo)).toEqual(['12', '14', '16'])
    expect(valores2(semi)).toEqual([])
  })

  it('encuentra la combinación y sabe cuáles se pueden elegir', () => {
    expect(buscarVariante(anillo, 'Plateado', '16')?.nombre).toBe('Plateado · 16')
    expect(buscarVariante(anillo, 'Dorado', '16')).toBeUndefined()
    expect(valor2Disponible(anillo, 'Dorado', '14')).toBe(false)
    expect(valor2Disponible(anillo, 'Dorado', '16')).toBe(false)
    expect(valor2Disponible(anillo, 'Plateado', '16')).toBe(true)
    expect(buscarVariante(semi, 'Cobre')?.nombre).toBe('Cobre')
  })

  it('calcula la disponibilidad de lo elegido', () => {
    expect(disponibilidadElegida(anillo, 'Dorado')).toBe('disponible')
    expect(disponibilidadElegida(anillo, 'Dorado', '14')).toBe('sin-stock')
    expect(disponibilidadElegida(semi, 'Plateado')).toBe('disponible')
  })

  it('arranca con lo del link, y nunca elige el talle sola', () => {
    expect(seleccionInicial(semi, 'Cobre')).toEqual({ valor1: 'Cobre', valor2: '' })
    expect(seleccionInicial(semi)).toEqual({ valor1: 'Dorado', valor2: '' })
    expect(seleccionInicial(anillo)).toEqual({ valor1: 'Dorado', valor2: '' })
    expect(seleccionInicial(anillo, 'Plateado · 14')).toEqual({ valor1: 'Plateado', valor2: '14' })
    expect(seleccionInicial(anillo, 'Plateado')).toEqual({ valor1: 'Plateado', valor2: '' })
    // Sin stock en el link: no se elige.
    expect(seleccionInicial(anillo, 'Dorado · 14')).toEqual({ valor1: 'Dorado', valor2: '' })
  })

  it('elige la foto del valor, o la general', () => {
    expect(fotoDe(semi, 'Dorado')).toBe('dorado.webp')
    expect(fotoDe(semi, 'Plateado')).toBe('general.webp')
    // Sin foto general, la tarjeta usa la del primer valor que tenga.
    expect(fotoPrincipal(anillo)).toBe('dorado.webp')
    expect(fotoDe({ ...base }, 'Algo')).toBeUndefined()
    expect(fotosPorValor(semi)).toEqual([
      { valor: 'Dorado', url: 'dorado.webp' },
      { valor: 'Cobre', url: 'cobre.webp' },
    ])
  })

  it('arma el texto del botón del muestrario', () => {
    expect(textoBotonMuestrario({}, 'tonos')).toBe('Ver el muestrario de tonos')
    expect(textoBotonMuestrario({ muestrarioTitulo: 'Guía de talles' }, 'tonos')).toBe('Ver guía de talles')
  })
})
