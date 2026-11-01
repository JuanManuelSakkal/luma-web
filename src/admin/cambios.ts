import Papa from 'papaparse'
import { aSlug, type LecturaCsv, type ProductoImportado } from '../catalogo/importar'
import { pesos } from '../pedido/pedido'
import { pluralVariante } from '../pedido/useAgregar'
import { UNICA, type Categoria, type ProductoAdmin, type TipoVariante, type VarianteAdmin } from './tipos'

/** Lo que va a pasar al aplicar un CSV, para mostrarlo antes de confirmar. */
export type PlanImportacion = {
  /** Cómo queda cada producto del CSV después de aplicar (con lo que ya estaba en la base). */
  productos: (ProductoAdmin & { categoria: string })[]
  nuevos: { slug: string; nombre: string; detalle: string }[]
  modificados: { slug: string; nombre: string; cambios: string[] }[]
  sinCambios: number
  /** Productos activos en la base que no están en el CSV. */
  faltantes: { slug: string; nombre: string }[]
  categoriasNuevas: string[]
}

const textoStock = (s: number | null) => (s === null ? 'sin controlar' : String(s))

function variantesImportadas(
  p: ProductoImportado,
): { nombre: string; stock: number | null; activo: boolean }[] {
  return p.variantes.length ? p.variantes : [{ nombre: UNICA, stock: p.stock, activo: p.activo }]
}

/** Combina un producto del CSV con lo que ya hay en la base. */
function combinar(
  imp: ProductoImportado,
  actual: ProductoAdmin | undefined,
  conStock: boolean,
): ProductoAdmin & { categoria: string } {
  const importadas = variantesImportadas(imp)
  const variantes: VarianteAdmin[] = importadas.map((v, orden) => {
    const previa = actual?.variantes.find((a) => a.nombre === v.nombre)
    return {
      id: previa?.id,
      nombre: v.nombre,
      // Si el CSV no trae stock, se mantiene el que había.
      stock: v.stock ?? previa?.stock ?? null,
      activo: v.activo,
      orden,
    }
  })
  // Las variantes que estaban y ya no vienen en el CSV quedan ocultos (no se borran).
  for (const previa of actual?.variantes ?? []) {
    if (!importadas.some((v) => v.nombre === previa.nombre)) variantes.push({ ...previa, activo: false })
  }

  return {
    id: actual?.id,
    // El identificador de un producto que ya existe no cambia aunque se le haya cambiado el nombre.
    slug: actual?.slug ?? imp.slug,
    nombre: imp.nombre,
    categoria: imp.categoria,
    categoria_id: actual?.categoria_id ?? null,
    subcategoria: imp.subcategoria ?? actual?.subcategoria ?? null,
    // Una celda vacía (o un CSV viejo sin la columna) no borra la descripción que había.
    descripcion: imp.descripcion ?? actual?.descripcion ?? null,
    nota: imp.nota ?? (conStock ? null : (actual?.nota ?? null)),
    tipo_variante: imp.variantes.length ? ((imp.tipoVariante as TipoVariante | undefined) ?? 'Color') : null,
    precio: imp.precio,
    // La lista de precios no trae "destacado" ni "activo": se respeta lo que había.
    destacado: conStock ? imp.destacado : (actual?.destacado ?? false),
    activo: conStock ? imp.activo : true,
    imagen_url: actual?.imagen_url ?? null,
    muestrario_url: actual?.muestrario_url ?? null,
    variantes,
  }
}

function describirCambios(antes: ProductoAdmin, despues: ProductoAdmin, categorias: Categoria[]): string[] {
  const c: string[] = []
  if (antes.nombre !== despues.nombre) c.push(`Nombre: ${antes.nombre} → ${despues.nombre}`)
  if (antes.precio !== despues.precio) c.push(`Precio: ${pesos(antes.precio)} → ${pesos(despues.precio)}`)
  const catAntes = categorias.find((x) => x.id === antes.categoria_id)?.nombre
  const catDespues = (despues as ProductoAdmin & { categoria: string }).categoria
  if (catAntes !== catDespues) c.push(`Categoría: ${catAntes ?? '-'} → ${catDespues}`)
  if ((antes.subcategoria ?? '') !== (despues.subcategoria ?? ''))
    c.push(`Subcategoría: ${antes.subcategoria || '-'} → ${despues.subcategoria || '-'}`)
  if (antes.activo !== despues.activo) c.push(despues.activo ? 'Se vuelve a mostrar' : 'Se oculta')
  if (antes.destacado !== despues.destacado)
    c.push(despues.destacado ? 'Pasa a destacado' : 'Deja de ser destacado')
  if ((antes.nota ?? '') !== (despues.nota ?? '')) c.push(`Nota: ${despues.nota ?? '(sin nota)'}`)
  if ((antes.descripcion ?? '') !== (despues.descripcion ?? ''))
    c.push(antes.descripcion?.trim() ? 'Descripción cambiada' : 'Descripción nueva')

  for (const v of despues.variantes) {
    const previa = antes.variantes.find((a) => a.nombre === v.nombre)
    const etiqueta = v.nombre === UNICA ? 'Stock' : `Stock ${v.nombre}`
    if (!previa) {
      c.push(v.nombre === UNICA ? `Stock: ${textoStock(v.stock)}` : `Variante nueva: ${v.nombre}`)
    } else {
      if (previa.activo && !v.activo) c.push(`Se oculta ${v.nombre}`)
      if (!previa.activo && v.activo) c.push(`Se vuelve a mostrar ${v.nombre}`)
      if (previa.stock !== v.stock)
        c.push(`${etiqueta}: ${textoStock(previa.stock)} → ${textoStock(v.stock)}`)
    }
  }
  return c
}

export function planificarImportacion(
  lectura: LecturaCsv,
  actuales: ProductoAdmin[],
  categorias: Categoria[],
): PlanImportacion {
  const porSlug = new Map(actuales.map((p) => [p.slug, p]))
  // El identificador se arma con el nombre al crear el producto y no cambia después. Si el nombre
  // se corrigió en el admin ("Base 10 ml" → "Base 10ml"), el producto se reconoce por su nombre actual.
  const porNombre = new Map(actuales.map((p) => [aSlug(p.nombre), p]))
  const encontrados = new Set<string>()
  const plan: PlanImportacion = {
    productos: [],
    nuevos: [],
    modificados: [],
    sinCambios: 0,
    faltantes: [],
    categoriasNuevas: lectura.categorias.filter((c) => !categorias.some((x) => x.nombre === c)),
  }

  for (const imp of lectura.productos) {
    const actual = porSlug.get(imp.slug) ?? porNombre.get(imp.slug)
    if (actual) encontrados.add(actual.slug)
    const final = combinar(imp, actual, lectura.conStock)
    plan.productos.push(final)
    if (!actual) {
      const variantes = imp.variantes.length
        ? ` · ${imp.variantes.length} ${pluralVariante(final.tipo_variante ?? undefined)}`
        : ''
      plan.nuevos.push({ slug: imp.slug, nombre: imp.nombre, detalle: `${pesos(imp.precio)}${variantes}` })
      continue
    }
    const cambios = describirCambios(actual, final, categorias)
    if (cambios.length) plan.modificados.push({ slug: actual.slug, nombre: imp.nombre, cambios })
    else plan.sinCambios++
  }

  plan.faltantes = actuales
    .filter((p) => p.activo && !encontrados.has(p.slug))
    .map((p) => ({ slug: p.slug, nombre: p.nombre }))
  return plan
}

/** El catálogo completo en el formato del admin, para abrir en Excel y volver a subir. */
export function exportarCsv(productos: ProductoAdmin[], categorias: Categoria[]): string {
  const filas = productos.flatMap((p) => {
    const categoria = categorias.find((c) => c.id === p.categoria_id)?.nombre ?? ''
    // La variante "Único" oculta de un producto que después pasó a tener variantes no se exporta.
    const variantes = p.variantes.filter((v) => !(v.nombre === UNICA && !v.activo && p.variantes.length > 1))
    return variantes.map((v, i) => ({
      categoria,
      subcategoria: p.subcategoria ?? '',
      producto: p.nombre,
      variante: v.nombre === UNICA ? '' : v.nombre,
      tipo: v.nombre === UNICA ? '' : (p.tipo_variante ?? 'Color'),
      precio: p.precio,
      stock: v.stock ?? '',
      activo: p.activo && v.activo ? 'si' : 'no',
      destacado: p.destacado ? 'si' : '',
      nota: p.nota ?? '',
      // Solo en la primera fila de cada producto, para no repetir el texto en cada variante.
      descripcion: i === 0 ? (p.descripcion ?? '') : '',
    }))
  })
  // El BOM hace que Excel abra bien los acentos.
  return '﻿' + Papa.unparse(filas, { newline: '\r\n' })
}
