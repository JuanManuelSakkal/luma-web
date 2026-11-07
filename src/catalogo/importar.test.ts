import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { destacados } from '../config'
import { aSlug, importarCatalogo, leerPrecio, separarVariantes } from './importar'
import { valor1Disponible, valor2Disponible } from './opciones'
import { stockDisponible } from './tipos'

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
  it('separa colores y los pone en mayúscula', () => {
    expect(separarVariantes('Argolla lisa (colores dorado, plateado)')).toEqual({
      nombre: 'Argolla lisa',
      variantes: ['Dorado', 'Plateado'],
      tipo: 'Color',
    })
  })
  it('separa medidas', () => {
    expect(separarVariantes('Anillo fino (medidas 14, 16, 18)')).toMatchObject({
      nombre: 'Anillo fino',
      variantes: ['14', '16', '18'],
      tipo: 'Medida',
    })
  })
  it('mantiene lo que viene después del paréntesis', () => {
    expect(separarVariantes('Collar (modelos luna, sol) 45 cm').nombre).toBe('Collar 45 cm')
  })
  it('"modelos surtidos" es una nota, no una lista', () => {
    expect(separarVariantes('Anillo regulable (modelos surtidos)')).toEqual({
      nombre: 'Anillo regulable',
      variantes: [],
      nota: 'Modelos surtidos',
    })
  })
  it('deja igual un paréntesis que no es una lista', () => {
    expect(separarVariantes('Collar (otro color)')).toEqual({
      nombre: 'Collar (otro color)',
      variantes: [],
    })
  })
})

describe('aSlug', () => {
  it('saca acentos y símbolos', () => {
    expect(aSlug('Collar corazón')).toBe('collar-corazon')
    expect(aSlug('Cadena 45 cm #2')).toBe('cadena-45-cm-2')
    expect(aSlug('Collar (otro color)')).toBe('collar-otro-color')
  })
})

describe('importarCatalogo con el catálogo de ejemplo', () => {
  const csv = readFileSync(new URL('../datos/catalogo.csv', import.meta.url), 'utf8')
  const { catalogo, errores } = importarCatalogo(csv, destacados)

  it('lee el catálogo sin errores, con las categorías de Luma', () => {
    expect(errores).toEqual([])
    expect(catalogo.categorias).toEqual(['Aros', 'Collares', 'Pulseras', 'Anillos'])
  })

  it('no repite ids', () => {
    const ids = catalogo.productos.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('agrupa las medidas del anillo y guarda subcategoría y descripción', () => {
    const anillo = catalogo.productos.find((p) => p.id === 'anillo-fino-cubic')
    expect(anillo?.precio).toBe(8900)
    expect(anillo?.subcategoria).toBe('Anillos finos')
    expect(anillo?.tipoVariante).toBe('Medida')
    expect(anillo?.variantes.map((v) => v.nombre)).toEqual(['14', '16', '18'])
    expect(anillo?.descripcion).toContain('piedra cubic')
  })

  it('todos los destacados de la configuración existen', () => {
    const ids = catalogo.productos.map((p) => p.id)
    for (const d of destacados) expect(ids).toContain(d)
  })
})

describe('importarCatalogo con el formato del admin', () => {
  const csv = [
    'categoria,producto,variante,precio,stock,activo,destacado',
    'Aros,Argolla lisa,Dorado,8500,10,si,si',
    'Aros,Argolla lisa,Plateado,8500,0,si,',
    'Aros,Cuff trenzado,,7500,2,si,',
    'Aros,Aro viejo,,4000,5,no,',
  ].join('\n')
  const { catalogo, errores } = importarCatalogo(csv)

  it('agrupa las variantes y calcula la disponibilidad y el stock', () => {
    expect(errores).toEqual([])
    const argolla = catalogo.productos.find((p) => p.id === 'argolla-lisa')!
    expect(argolla.variantes).toEqual([
      { nombre: 'Dorado', disponibilidad: 'disponible', stock: 10 },
      { nombre: 'Plateado', disponibilidad: 'sin-stock', stock: 0 },
    ])
    expect(argolla.destacado).toBe(true)
    expect(argolla.tipoVariante).toBe('Color')
    expect(catalogo.productos.find((p) => p.id === 'cuff-trenzado')?.disponibilidad).toBe('pocas')
  })

  it('no incluye los productos inactivos', () => {
    expect(catalogo.productos.map((p) => p.id)).not.toContain('aro-viejo')
  })
})

describe('importarCatalogo con errores', () => {
  it('avisa precios inválidos, faltantes y repetidos', () => {
    const csv = [
      'Categoría,Producto,Precio',
      'Aros,Argolla,$abc',
      ',Cuff,$100',
      'Anillos,Anillo fino,$900',
      'Anillos,Anillo fino,$800',
    ].join('\n')
    const { errores } = importarCatalogo(csv)
    expect(errores).toHaveLength(3)
    expect(errores[0]).toContain('Fila 2')
  })
  it('rechaza un CSV sin las columnas necesarias', () => {
    expect(importarCatalogo('a,b\n1,2').errores[0]).toContain('columnas')
  })
})

describe('dos opciones en la lista de precios', () => {
  it('separa color y talle con punto y coma', () => {
    expect(separarVariantes('Anillo Luna (colores dorado, plateado; talles 12, 14)')).toEqual({
      nombre: 'Anillo Luna',
      variantes: ['Dorado', 'Plateado'],
      tipo: 'Color',
      tipo2: 'Talle',
      variantes2: ['12', '14'],
    })
  })
  it('arma todas las combinaciones para la web', () => {
    const { catalogo } = importarCatalogo(
      [
        'Categoría,Producto,Precio',
        'Anillos,"Anillo Luna (colores dorado, plateado; talles 12, 14)",$9.000',
      ].join('\n'),
    )
    const p = catalogo.productos[0]
    expect(p.tipoVariante2).toBe('Talle')
    expect(p.variantes.map((v) => v.nombre)).toEqual([
      'Dorado · 12',
      'Dorado · 14',
      'Plateado · 12',
      'Plateado · 14',
    ])
    expect(p.variantes[3]).toMatchObject({ valor1: 'Plateado', valor2: '14' })
  })
})

describe('dos opciones con stock (Luma)', () => {
  const csv = [
    'categoria,producto,variante,tipo,tipo 2,valor 2,precio,stock,activo',
    'Anillos,Anillo luna,Dorado,Color,Talle,14,9000,2,si',
    'Anillos,Anillo luna,Dorado,Color,Talle,16,9000,1,si',
    'Anillos,Anillo luna,Dorado,Color,Talle,18,9000,5,si',
    'Anillos,Anillo luna,Plateado,Color,Talle,14,9000,3,si',
    'Anillos,Anillo luna,Plateado,Color,Talle,16,9000,0,si',
    'Anillos,Anillo luna,Plateado,Color,Talle,18,9000,4,si',
  ].join('\n')

  it('cada combinación tiene su stock: Plateado · 16 queda sin stock', () => {
    const p = importarCatalogo(csv).catalogo.productos[0]
    expect(p.tipoVariante).toBe('Color')
    expect(p.tipoVariante2).toBe('Talle')
    expect(valor2Disponible(p, 'Plateado', '16')).toBe(false)
    expect(valor2Disponible(p, 'Dorado', '16')).toBe(true)
    expect(valor1Disponible(p, 'Plateado')).toBe(true)
    expect(stockDisponible(p, 'Dorado · 16')).toBe(1)
    expect(stockDisponible(p, 'Plateado · 16')).toBe(0)
  })
})
