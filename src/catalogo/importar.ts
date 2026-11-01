import Papa from 'papaparse'
import type { Catalogo, Disponibilidad, Producto } from './tipos'

/**
 * Lee el catálogo desde un CSV. Entiende dos formatos:
 *
 * 1. Una lista de precios simple, tal como sale de Excel:
 *      Categoría,Subcategoría,Producto,Precio
 *      Aros,Argollas,"Argolla lisa (colores dorado, plateado)",$8.500
 *    Los colores, medidas o modelos van entre paréntesis en el nombre. La subcategoría es opcional.
 *
 * 2. El formato del portal de admin, una fila por variante:
 *      categoria,subcategoria,producto,variante,tipo,precio,stock,activo,destacado
 *      Aros,Argollas,Argolla lisa,Dorado,Color,8500,10,si,si
 *    Puede traer además una columna "descripcion" (alcanza con llenarla en una fila por producto).
 */

export type ResultadoImportacion = {
  catalogo: Catalogo
  errores: string[]
}

/** "$2.550" → 2550. Devuelve null si no es un precio válido. */
export function leerPrecio(texto: string): number | null {
  const limpio = texto.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null
  return Math.round(Number(limpio))
}

/** "Top Cristal 15 ml" → "top-cristal-15-ml". */
export function aSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/#/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const PALABRAS_VARIANTE: Record<string, string> = {
  colores: 'Color',
  color: 'Color',
  medidas: 'Medida',
  medida: 'Medida',
  talles: 'Medida',
  talle: 'Medida',
  modelos: 'Modelo',
  modelo: 'Modelo',
}

/** Tipos de variante que entiende la base (ver la migración de Luma). */
export const TIPOS_VARIANTE = ['Color', 'Medida', 'Modelo'] as const

/**
 * Separa los colores, medidas o modelos que vienen entre paréntesis en el nombre.
 * "Argolla lisa (colores dorado, plateado)" → { nombre: "Argolla lisa", variantes: ["Dorado", "Plateado"], tipo: "Color" }
 * "Anillo fino (modelos surtidos)" → { nombre: "Anillo fino", variantes: [], nota: "Modelos surtidos" }
 * "Collar (otro color)" queda igual, porque no es una lista.
 */
export function separarVariantes(texto: string): {
  nombre: string
  variantes: string[]
  tipo?: string
  nota?: string
} {
  const m = texto.trim().match(/^(.*?)\s*\((\w+)\s+([^)]*)\)\s*(.*)$/u)
  const tipo = m ? PALABRAS_VARIANTE[m[2].toLowerCase()] : undefined
  if (!m || !tipo) return { nombre: texto.trim(), variantes: [] }

  const nombre = [m[1], m[4]].filter(Boolean).join(' ').trim()
  const lista = m[3]
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  if (lista.length === 1 && lista[0].toLowerCase() === 'surtidos') {
    return { nombre, variantes: [], nota: `${capitalizar(m[2].toLowerCase())} surtidos` }
  }
  return { nombre, variantes: lista.map(capitalizar), tipo }
}

/** El tipo de variante escrito en el CSV, o "Color" si no se reconoce. */
function tipoValido(texto: string | undefined): string {
  const t = PALABRAS_VARIANTE[(texto ?? '').trim().toLowerCase()]
  return t ?? 'Color'
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function normalizarEncabezado(h: string): string {
  return h.replace(/^﻿/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

function esSi(texto: string | undefined): boolean {
  return ['si', 'sí', 's', 'true', '1', 'x'].includes((texto ?? '').trim().toLowerCase())
}

/** Con stock 0 está sin stock; con 3 o menos, quedan pocas. */
export function disponibilidadSegunStock(stock: number | null): Disponibilidad {
  if (stock === null) return 'disponible'
  if (stock <= 0) return 'sin-stock'
  if (stock <= 3) return 'pocas'
  return 'disponible'
}

/** Un producto está disponible si alguna de sus variantes lo está. */
function disponibilidadDelProducto(p: Producto): Disponibilidad {
  if (p.variantes.length === 0) return p.disponibilidad
  const d = p.variantes.map((v) => v.disponibilidad)
  if (d.includes('disponible')) return 'disponible'
  if (d.includes('pocas')) return 'pocas'
  return 'sin-stock'
}

/** Un producto tal como viene del CSV, con el stock en número (lo usa el admin). */
export type ProductoImportado = {
  slug: string
  nombre: string
  categoria: string
  /** undefined = el CSV no trae subcategoría: se mantiene la que había. */
  subcategoria?: string
  precio: number
  tipoVariante?: string
  nota?: string
  /** undefined = el CSV no trae descripción para este producto: se mantiene la que había. */
  descripcion?: string
  destacado: boolean
  activo: boolean
  /** stock null = el CSV no trae stock (formato lista de precios). */
  variantes: { nombre: string; stock: number | null; activo: boolean }[]
  /** Solo para productos sin variantes. */
  stock: number | null
  fila: number
}

export type LecturaCsv = {
  productos: ProductoImportado[]
  categorias: string[]
  /** true si el CSV trae columnas de stock (formato del admin). */
  conStock: boolean
  errores: string[]
}

export function leerCsv(textoCsv: string): LecturaCsv {
  const errores: string[] = []
  const parseado = Papa.parse<Record<string, string>>(textoCsv.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normalizarEncabezado,
  })
  for (const e of parseado.errors) errores.push(`Fila ${e.row === undefined ? '?' : e.row + 2}: ${e.message}`)

  const campos = parseado.meta.fields ?? []
  const formatoAdmin = campos.includes('variante') || campos.includes('stock')
  const colPrecio = campos.find((c) => c.startsWith('precio'))
  if (!campos.includes('producto') || !campos.includes('categoria') || !colPrecio) {
    return {
      productos: [],
      categorias: [],
      conStock: false,
      errores: ['El CSV tiene que tener las columnas categoría, producto y precio.'],
    }
  }

  const porSlug = new Map<string, ProductoImportado>()
  const categorias: string[] = []
  // Productos que hasta ahora solo tienen una fila sin variante y oculta: es la variante "Único"
  // que queda en la base cuando a un producto se le agregan variantes. Si aparecen, se descarta.
  const soloUnicaOculta = new Set<string>()

  parseado.data.forEach((fila, i) => {
    const nFila = i + 2 // +1 por el encabezado, +1 porque Excel cuenta desde 1
    const categoria = (fila.categoria ?? '').trim()
    const textoProducto = (fila.producto ?? '').trim()
    const precio = leerPrecio(fila[colPrecio] ?? '')

    if (!textoProducto) return errores.push(`Fila ${nFila}: falta el nombre del producto.`)
    if (!categoria) return errores.push(`Fila ${nFila}: "${textoProducto}" no tiene categoría.`)
    if (precio === null || precio <= 0)
      return errores.push(
        `Fila ${nFila}: "${textoProducto}" tiene un precio inválido ("${fila[colPrecio]}").`,
      )

    const textoStock = formatoAdmin ? (fila.stock ?? '').trim() : ''
    const stock = textoStock ? Number(textoStock) : null
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      return errores.push(`Fila ${nFila}: "${textoProducto}" tiene un stock inválido ("${fila.stock}").`)
    }
    const activo = !formatoAdmin || !fila.activo?.trim() || esSi(fila.activo)
    const descripcion = fila.descripcion?.trim() || undefined
    const subcategoria = fila.subcategoria?.trim() || undefined

    const { nombre, variantes, tipo, nota } = formatoAdmin
      ? {
          nombre: textoProducto,
          variantes: fila.variante?.trim() ? [fila.variante.trim()] : [],
          tipo: tipoValido(fila.tipo),
          nota: fila.nota?.trim() || undefined,
        }
      : separarVariantes(textoProducto)
    const slug = aSlug(nombre)

    const existente = porSlug.get(slug)
    if (existente && formatoAdmin && variantes.length === 0 && !activo && existente.variantes.length > 0) {
      return
    }
    if (existente && soloUnicaOculta.has(slug) && variantes.length > 0) {
      soloUnicaOculta.delete(slug)
      porSlug.delete(slug)
    } else if (existente) {
      if (!formatoAdmin || variantes.length === 0 || existente.variantes.length === 0) {
        return errores.push(`Fila ${nFila}: "${nombre}" está repetido.`)
      }
      if (existente.variantes.some((v) => v.nombre === variantes[0])) {
        return errores.push(`Fila ${nFila}: "${nombre} ${variantes[0]}" está repetido.`)
      }
      if (existente.precio !== precio) {
        errores.push(`Fila ${nFila}: "${nombre}" tiene precios distintos según la variante.`)
      }
      existente.variantes.push({ nombre: variantes[0], stock, activo })
      existente.descripcion ??= descripcion
      existente.subcategoria ??= subcategoria
      if (esSi(fila.destacado)) existente.destacado = true
      if (activo) existente.activo = true
      return
    }

    if (formatoAdmin && variantes.length === 0 && !activo) soloUnicaOculta.add(slug)
    if (!categorias.includes(categoria)) categorias.push(categoria)
    porSlug.set(slug, {
      slug,
      nombre,
      categoria,
      subcategoria,
      precio,
      tipoVariante: variantes.length ? tipo : undefined,
      nota,
      descripcion,
      destacado: esSi(fila.destacado),
      activo,
      variantes: variantes.map((v) => ({ nombre: v, stock: formatoAdmin ? stock : null, activo })),
      stock: variantes.length ? null : stock,
      fila: nFila,
    })
  })

  return { productos: [...porSlug.values()], categorias, conStock: formatoAdmin, errores }
}

/** El catálogo público a partir del CSV: solo productos activos, con disponibilidad en vez de stock. */
export function importarCatalogo(textoCsv: string, destacados: string[] = []): ResultadoImportacion {
  const { productos, categorias, errores } = leerCsv(textoCsv)
  const activos = productos.filter((p) => p.activo)
  const lista: Producto[] = activos.map((p) => {
    const producto: Producto = {
      id: p.slug,
      nombre: p.nombre,
      categoria: p.categoria,
      subcategoria: p.subcategoria,
      precio: p.precio,
      descripcion: p.descripcion,
      variantes: p.variantes
        .filter((v) => v.activo)
        .map((v) => ({
          nombre: v.nombre,
          disponibilidad: disponibilidadSegunStock(v.stock),
        })),
      tipoVariante: p.tipoVariante,
      nota: p.nota,
      destacado: p.destacado || destacados.includes(p.slug),
      disponibilidad: disponibilidadSegunStock(p.stock),
    }
    return { ...producto, disponibilidad: disponibilidadDelProducto(producto) }
  })
  const categoriasActivas = categorias.filter((c) => activos.some((p) => p.categoria === c))
  return { catalogo: { productos: lista, categorias: categoriasActivas }, errores }
}
