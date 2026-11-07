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
