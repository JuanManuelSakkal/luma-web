import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { destacados } from '../config'
import { aSlug, importarCatalogo, leerPrecio, separarVariantes } from './importar'

describe('leerPrecio', () => {
  it('entiende el formato de la lista de precios', () => {
    expect(leerPrecio('$2.550')).toBe(2550)
    expect(leerPrecio('$11.050')).toBe(11050)
    expect(leerPrecio('$900')).toBe(900)
    expect(leerPrecio('3850')).toBe(3850)
  })
  it('rechaza lo que no es un precio', () => {
    expect(leerPrecio('')).toBeNull()
    expect(leerPrecio('consultar')).toBeNull()
  })
})

describe('separarVariantes', () => {
  it('separa tonos', () => {
    expect(separarVariantes('Kapping CAS (tonos #1, #2, #11)')).toEqual({
      nombre: 'Kapping CAS',
      variantes: ['#1', '#2', '#11'],
      tipo: 'Tono',
    })
  })
  it('separa aromas y los pone en mayúscula', () => {
    expect(separarVariantes('Aceite de cutícula (aromas lavanda, limón, manzana)')).toMatchObject({
      nombre: 'Aceite de cutícula',
      variantes: ['Lavanda', 'Limón', 'Manzana'],
      tipo: 'Aroma',
    })
  })
  it('mantiene lo que viene después del paréntesis', () => {
    expect(separarVariantes('Semi Navi clásico (tonos #2, #28) 10 ml').nombre).toBe('Semi Navi clásico 10 ml')
  })
  it('"tonos surtidos" es una nota, no una lista', () => {
    expect(separarVariantes('Cover Pink (tonos surtidos)')).toEqual({
      nombre: 'Cover Pink',
      variantes: [],
      nota: 'Tonos surtidos',
    })
  })
  it('deja igual un paréntesis que no es una lista', () => {
    expect(separarVariantes('Polvo Espejo (otro tono)')).toEqual({
      nombre: 'Polvo Espejo (otro tono)',
      variantes: [],
    })
  })
})

describe('aSlug', () => {
  it('saca acentos y símbolos', () => {
    expect(aSlug('Aceite de cutícula')).toBe('aceite-de-cuticula')
    expect(aSlug('Poligel 60 ml #03')).toBe('poligel-60-ml-03')
    expect(aSlug('Polvo Espejo (otro tono)')).toBe('polvo-espejo-otro-tono')
  })
})

describe('importarCatalogo con la lista de precios de lanzamiento', () => {
  const csv = readFileSync(new URL('../datos/catalogo.csv', import.meta.url), 'utf8')
  const { catalogo, errores } = importarCatalogo(csv, destacados)

  it('lee un producto por fila, sin errores', () => {
    const filas = csv.trim().split('\n').length - 1
    expect(errores).toEqual([])
    expect(catalogo.productos).toHaveLength(filas)
    expect(catalogo.categorias).toEqual(['Esmaltes', 'Decoración', 'Herramientas', 'Tips'])
  })

  it('no repite ids', () => {
    const ids = catalogo.productos.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('separa los tonos del Kapping CAS', () => {
    const kapping = catalogo.productos.find((p) => p.id === 'kapping-cas')
    expect(kapping?.precio).toBe(3850)
    expect(kapping?.variantes.map((v) => v.nombre)).toEqual(['#1', '#2', '#3', '#4', '#5', '#6', '#11'])
  })

  it('todos los destacados de la configuración existen', () => {
    const ids = catalogo.productos.map((p) => p.id)
    for (const d of destacados) expect(ids).toContain(d)
    expect(catalogo.productos.filter((p) => p.destacado)).toHaveLength(destacados.length)
  })
})

describe('importarCatalogo con el formato del admin', () => {
  const csv = [
    'categoria,producto,variante,precio,stock,activo,destacado',
    'Esmaltes,Kapping CAS,#3,3850,10,si,si',
    'Esmaltes,Kapping CAS,#4,3850,0,si,',
    'Esmaltes,Top Matte,,5200,2,si,',
    'Esmaltes,Base vieja,,4000,5,no,',
  ].join('\n')
  const { catalogo, errores } = importarCatalogo(csv)

  it('agrupa las variantes y calcula la disponibilidad sin mostrar el stock', () => {
    expect(errores).toEqual([])
    const kapping = catalogo.productos.find((p) => p.id === 'kapping-cas')!
    expect(kapping.variantes).toEqual([
      { nombre: '#3', disponibilidad: 'disponible' },
      { nombre: '#4', disponibilidad: 'sin-stock' },
    ])
    expect(kapping.destacado).toBe(true)
    expect(catalogo.productos.find((p) => p.id === 'top-matte')?.disponibilidad).toBe('pocas')
  })

  it('no incluye los productos inactivos', () => {
    expect(catalogo.productos.map((p) => p.id)).not.toContain('base-vieja')
  })
})

describe('importarCatalogo con errores', () => {
  it('avisa precios inválidos, faltantes y repetidos', () => {
    const csv = [
      'Categoría,Producto,Precio',
      'Esmaltes,Top,$abc',
      ',Base,$100',
      'Tips,Lima,$900',
      'Tips,Lima,$800',
    ].join('\n')
    const { errores } = importarCatalogo(csv)
    expect(errores).toHaveLength(3)
    expect(errores[0]).toContain('Fila 2')
  })
  it('rechaza un CSV sin las columnas necesarias', () => {
    expect(importarCatalogo('a,b\n1,2').errores[0]).toContain('columnas')
  })
})
