import { describe, expect, it } from 'vitest'
import { leerCsv } from '../catalogo/importar'
import { exportarCsv, planificarImportacion } from './cambios'
import type { Categoria, ProductoAdmin } from './tipos'

const categorias: Categoria[] = [{ id: 1, nombre: 'Esmaltes', orden: 1 }]

const base = (p: Partial<ProductoAdmin> & Pick<ProductoAdmin, 'slug' | 'nombre'>): ProductoAdmin => ({
  id: 1,
  categoria_id: 1,
  subcategoria: null,
  descripcion: null,
  nota: null,
  tipo_variante: null,
  precio: 1000,
  destacado: false,
  activo: true,
  imagen_url: null,
  muestrario_url: null,
  variantes: [{ id: 1, nombre: 'Único', stock: null, activo: true, orden: 0 }],
  ...p,
})

const kapping = base({
  id: 10,
  slug: 'kapping-cas',
  nombre: 'Kapping CAS',
  precio: 3850,
  tipo_variante: 'Color',
  destacado: true,
  imagen_url: 'https://x/foto.webp',
  variantes: [
    { id: 11, nombre: '#1', stock: 5, activo: true, orden: 0 },
    { id: 12, nombre: '#2', stock: 2, activo: true, orden: 1 },
  ],
})
const topMatte = base({ id: 20, slug: 'top-matte', nombre: 'Top Matte', precio: 5200 })

describe('planificarImportacion con la lista de precios (sin stock)', () => {
  const csv = [
    'Categoría,Producto,Precio de lanzamiento',
    'Esmaltes,"Kapping CAS (colores #1, #3)",$4.000',
    'Tips,Tips x500,$10.950',
  ].join('\n')
  const plan = planificarImportacion(leerCsv(csv), [kapping, topMatte], categorias)

  it('detecta nuevos, cambios, faltantes y categorías nuevas', () => {
    expect(plan.nuevos.map((n) => n.slug)).toEqual(['tips-x500'])
    expect(plan.faltantes.map((f) => f.slug)).toEqual(['top-matte'])
    expect(plan.categoriasNuevas).toEqual(['Tips'])
    expect(plan.modificados[0].cambios).toEqual([
      'Precio: $ 3.850 → $ 4.000',
      'Variante nueva: #3',
      'Se oculta #2',
    ])
  })

  it('mantiene el stock, la foto y el destacado que ya había', () => {
    const k = plan.productos.find((p) => p.slug === 'kapping-cas')!
    expect(k.imagen_url).toBe('https://x/foto.webp')
    expect(k.destacado).toBe(true)
    expect(k.variantes).toEqual([
      { id: 11, nombre: '#1', stock: 5, activo: true, orden: 0 },
      { id: undefined, nombre: '#3', stock: null, activo: true, orden: 1 },
      { id: 12, nombre: '#2', stock: 2, activo: false, orden: 1 },
    ])
  })
})

describe('exportar y volver a importar', () => {
  it('lo exportado se lee igual y no genera cambios', () => {
    const csv = exportarCsv([kapping, topMatte], categorias)
    expect(csv.startsWith('﻿')).toBe(true)
    const lectura = leerCsv(csv)
    expect(lectura.errores).toEqual([])
    const plan = planificarImportacion(lectura, [kapping, topMatte], categorias)
    expect(plan.nuevos).toEqual([])
    expect(plan.modificados).toEqual([])
    expect(plan.faltantes).toEqual([])
    expect(plan.sinCambios).toBe(2)
  })

  it('un cambio de stock en el CSV aparece en la revisión', () => {
    const csv = exportarCsv([kapping], categorias).replace('#2,Color,3850,2', '#2,Color,3850,0')
    const plan = planificarImportacion(leerCsv(csv), [kapping], categorias)
    expect(plan.modificados[0].cambios).toEqual(['Stock #2: 2 → 0'])
  })

  it('una fila con activo "no" oculta ese tono', () => {
    const csv = exportarCsv([kapping], categorias).replace('#1,Color,3850,5,si', '#1,Color,3850,5,no')
    const plan = planificarImportacion(leerCsv(csv), [kapping], categorias)
    expect(plan.modificados[0].cambios).toEqual(['Se oculta #1'])
  })

  it('la descripción viaja en el CSV, con varias líneas y una sola vez por producto', () => {
    const conTexto = { ...kapping, descripcion: 'Alta cobertura.\n\n- Contenido: 15 ml' }
    const csv = exportarCsv([conTexto], categorias)
    expect(csv.split('Alta cobertura').length).toBe(2)
    const plan = planificarImportacion(leerCsv(csv), [conTexto], categorias)
    expect(plan.modificados).toEqual([])
    expect(plan.productos[0].descripcion).toBe('Alta cobertura.\n\n- Contenido: 15 ml')
  })

  it('una descripción cargada en el CSV aparece en la revisión', () => {
    const csv = exportarCsv([topMatte], categorias).replace(/,\r?\n?$/, ',Top mate.')
    const plan = planificarImportacion(leerCsv(csv), [topMatte], categorias)
    expect(plan.modificados[0].cambios).toEqual(['Descripción nueva'])
    expect(plan.productos[0].descripcion).toBe('Top mate.')
  })

  it('una celda vacía o un CSV sin la columna no borran la descripción', () => {
    const conTexto = { ...topMatte, descripcion: 'Top mate.' }
    const sinColumna = ['categoria,producto,variante,precio,stock', 'Esmaltes,Top Matte,,5200,'].join('\n')
    const vacia = exportarCsv([{ ...conTexto, descripcion: null }], categorias)
    for (const csv of [sinColumna, vacia]) {
      const plan = planificarImportacion(leerCsv(csv), [conTexto], categorias)
      expect(plan.productos[0].descripcion).toBe('Top mate.')
    }
  })

  it('la variante "Único" oculta de un producto con tonos no rompe la importación', () => {
    const espejo = base({
      id: 30,
      slug: 'polvo-espejo',
      nombre: 'Polvo Espejo',
      tipo_variante: 'Color',
      variantes: [
        { id: 31, nombre: 'Único', stock: null, activo: false, orden: 0 },
        { id: 32, nombre: '#12', stock: null, activo: true, orden: 1 },
        { id: 33, nombre: '#13', stock: null, activo: true, orden: 2 },
      ],
    })
    const exportado = exportarCsv([espejo], categorias)
    expect(exportado).not.toContain('Polvo Espejo,,')
    // Un CSV bajado antes de este arreglo trae la fila sin tono, en cualquier posición.
    const viejo = [
      'categoria,producto,variante,tipo,precio,stock,activo,destacado,nota,descripcion',
      'Esmaltes,Polvo Espejo,#12,Color,1000,,si,,,',
      'Esmaltes,Polvo Espejo,,,1000,,no,,,',
      'Esmaltes,Polvo Espejo,#13,Color,1000,,si,,,',
    ].join('\n')
    const alReves = viejo.split('\n')
    ;[alReves[1], alReves[2]] = [alReves[2], alReves[1]]
    for (const csv of [exportado, viejo, alReves.join('\n')]) {
      const lectura = leerCsv(csv)
      expect(lectura.errores).toEqual([])
      expect(lectura.productos[0].variantes.map((v) => v.nombre)).toEqual(['#12', '#13'])
      const plan = planificarImportacion(lectura, [espejo], categorias)
      expect(plan.modificados).toEqual([])
    }
  })

  it('reconoce un producto al que se le cambió el nombre en el admin', () => {
    // Se creó como "Base 10 ml" (identificador base-10-ml) y después se renombró.
    const renombrado = base({ id: 40, slug: 'base-10-ml', nombre: 'Base 10ml', precio: 4100 })
    const plan = planificarImportacion(
      leerCsv(exportarCsv([renombrado], categorias)),
      [renombrado],
      categorias,
    )
    expect(plan.nuevos).toEqual([])
    expect(plan.faltantes).toEqual([])
    expect(plan.sinCambios).toBe(1)
    expect(plan.productos[0].slug).toBe('base-10-ml')
    expect(plan.productos[0].id).toBe(40)
  })
})
