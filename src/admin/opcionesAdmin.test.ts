import { describe, expect, it } from 'vitest'
import {
  agregarValores,
  asignarFotosPorNombre,
  normalizarOpciones,
  pasarADosOpciones,
  pasarAUnaOpcion,
  ponerFoto,
  quitarValor,
  renombrarValor,
  valoresEje,
} from './opcionesAdmin'
import type { ProductoAdmin } from './tipos'

const anilloLuna: ProductoAdmin = {
  id: 1,
  slug: 'anillo-luna',
  nombre: 'Anillo luna',
  categoria_id: 1,
  subcategoria: null,
  descripcion: null,
  nota: null,
  tipo_variante: 'Color',
  precio: 1000,
  destacado: false,
  activo: true,
  imagen_url: null,
  muestrario_url: null,
  fotos_opcion: { Dorado: 'dorado.webp' },
  variantes: [
    { id: 1, nombre: 'Dorado', stock: 3, activo: true, orden: 0 },
    { id: 2, nombre: 'Plateado', stock: null, activo: true, orden: 1 },
  ],
}

describe('editor de opciones', () => {
  const anillo = agregarValores(pasarADosOpciones(anilloLuna, 'Talle'), 2, '12, 14')

  it('arma las combinaciones al pasar a dos opciones', () => {
    expect(anillo.variantes.map((v) => v.nombre)).toEqual([
      'Dorado · 12',
      'Dorado · 14',
      'Plateado · 12',
      'Plateado · 14',
    ])
    expect(valoresEje(anillo, 1)).toEqual(['Dorado', 'Plateado'])
    expect(valoresEje(anillo, 2)).toEqual(['12', '14'])
  })

  it('conserva el stock de las combinaciones al agregar y quitar valores', () => {
    const conStock = {
      ...anillo,
      variantes: anillo.variantes.map((v) => (v.nombre === 'Plateado · 14' ? { ...v, stock: 7, id: 99 } : v)),
    }
    const mas = agregarValores(conStock, 2, '16, 14')
    expect(mas.variantes).toHaveLength(6)
    expect(mas.variantes.find((v) => v.nombre === 'Plateado · 14')).toMatchObject({ stock: 7, id: 99 })
    const menos = quitarValor(mas, 1, 'Dorado')
    expect(menos.variantes.map((v) => v.nombre)).toEqual(['Plateado · 12', 'Plateado · 14', 'Plateado · 16'])
  })

  it('al renombrar un color, cambia sus combinaciones y se lleva la foto', () => {
    const r = renombrarValor(anillo, 1, 'Dorado', 'Oro')
    expect(valoresEje(r, 1)).toEqual(['Oro', 'Plateado'])
    expect(r.variantes[0].nombre).toBe('Oro · 12')
    expect(r.fotos_opcion).toEqual({ Oro: 'dorado.webp' })
    // No deja repetir un valor.
    expect(renombrarValor(anillo, 1, 'Dorado', 'Plateado')).toBe(anillo)
  })

  it('vuelve a una sola opción sumando el stock', () => {
    const conStock = {
      ...anillo,
      variantes: anillo.variantes.map((v) => ({ ...v, stock: v.valor1 === 'Dorado' ? 2 : null })),
    }
    const uno = pasarAUnaOpcion(conStock)
    expect(uno.tipo_variante2).toBeNull()
    expect(uno.variantes.map((v) => [v.nombre, v.stock])).toEqual([
      ['Dorado', 4],
      ['Plateado', null],
    ])
  })

  it('normaliza antes de guardar y descarta fotos de valores que ya no están', () => {
    const p = normalizarOpciones(ponerFoto(quitarValor(anillo, 1, 'Dorado'), 'Plateado', 'p.webp'))
    expect(p.fotos_opcion).toEqual({ Plateado: 'p.webp' })
    expect(p.variantes[0]).toMatchObject({ nombre: 'Plateado · 12', valor1: 'Plateado', valor2: '12' })
    const simple = normalizarOpciones(anilloLuna)
    expect(simple.variantes[0]).toMatchObject({ valor1: 'Dorado', valor2: null })
    expect(simple.tipo_variante2).toBeNull()
  })

  it('reconoce las fotos por el nombre del archivo', () => {
    expect(
      asignarFotosPorNombre(
        ['Dorado.JPG', 'anilloLuna-plateado.png', 'rosa-viejo.jpg', 'otra.jpg', '12.webp'],
        ['Dorado', 'Plateado', 'Rosa', 'Rosa viejo', '#12'],
      ),
    ).toEqual({
      asignadas: [
        { archivo: 'Dorado.JPG', valor: 'Dorado' },
        { archivo: 'anilloLuna-plateado.png', valor: 'Plateado' },
        { archivo: 'rosa-viejo.jpg', valor: 'Rosa viejo' },
        { archivo: '12.webp', valor: '#12' },
      ],
      sinAsignar: ['otra.jpg'],
    })
  })
})
