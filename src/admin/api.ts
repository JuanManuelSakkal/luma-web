import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanImportacion } from './cambios'
import { UNICA, type Categoria, type ProductoAdmin, type VarianteAdmin } from './tipos'

// Todas las lecturas y escrituras del portal de admin. La seguridad la pone la base:
// si el usuario no está en la tabla admins, estas llamadas no devuelven ni cambian nada.

const BUCKET = 'productos'

function falla(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

export async function listarCategorias(sb: SupabaseClient): Promise<Categoria[]> {
  const { data, error } = await sb
    .from('categorias')
    .select('id, nombre, orden')
    .order('orden')
    .order('nombre')
  falla(error, 'No se pudieron leer las categorías')
  return data ?? []
}

export async function listarProductos(sb: SupabaseClient): Promise<ProductoAdmin[]> {
  const { data, error } = await sb
    .from('productos')
    .select(
      'id, slug, nombre, categoria_id, subcategoria, descripcion, nota, tipo_variante, precio, destacado, activo, imagen_url, muestrario_url, tipo_variante2, fotos_opcion, muestrario_titulo, variantes (id, nombre, stock, activo, orden, valor1, valor2)',
    )
    .order('nombre')
  falla(error, 'No se pudieron leer los productos')
  return ((data ?? []) as ProductoAdmin[]).map((p) => ({
    ...p,
    variantes: [...p.variantes].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)),
  }))
}

export async function crearCategoria(sb: SupabaseClient, nombre: string, orden: number): Promise<Categoria> {
  const { data, error } = await sb.from('categorias').insert({ nombre, orden }).select().single()
  falla(error, `No se pudo crear la categoría ${nombre}`)
  return data as Categoria
}

/** Crea o actualiza un producto con sus variantes. Las variantes que no vienen se borran. */
export async function guardarProducto(
  sb: SupabaseClient,
  p: ProductoAdmin,
  { borrarVariantesQueFaltan = true } = {},
): Promise<number> {
  const fila = {
    slug: p.slug,
    nombre: p.nombre.trim(),
    categoria_id: p.categoria_id,
    subcategoria: p.subcategoria?.trim() || null,
    descripcion: p.descripcion?.trim() || null,
    nota: p.nota?.trim() || null,
    tipo_variante: p.tipo_variante,
    precio: p.precio,
    destacado: p.destacado,
    activo: p.activo,
    imagen_url: p.imagen_url,
    muestrario_url: p.muestrario_url,
    tipo_variante2: p.tipo_variante2 ?? null,
    fotos_opcion: p.fotos_opcion ?? {},
    muestrario_titulo: p.muestrario_titulo?.trim() || null,
  }
  const { data, error } = p.id
    ? await sb.from('productos').update(fila).eq('id', p.id).select('id').single()
    : await sb.from('productos').insert(fila).select('id').single()
  falla(error, `No se pudo guardar ${p.nombre}`)
  const id = (data as { id: number }).id

  const variantes = p.variantes.map((v: VarianteAdmin, orden) => ({
    producto_id: id,
    nombre: v.nombre.trim(),
    stock: v.stock,
    activo: v.activo,
    orden: v.orden ?? orden,
    // Siempre van en todas las filas: al guardar varias juntas, lo que falta en una queda en null.
    valor1: v.nombre === UNICA ? null : (v.valor1 ?? v.nombre.trim()),
    valor2: p.tipo_variante2 ? (v.valor2 ?? null) : null,
  }))
  if (borrarVariantesQueFaltan && p.id) {
    const nombres = variantes.map((v) => v.nombre)
    const { data: existentes, error: e1 } = await sb
      .from('variantes')
      .select('id, nombre')
      .eq('producto_id', id)
    falla(e1, 'No se pudieron leer las variantes')
    const sobran = (existentes ?? []).filter((v) => !nombres.includes(v.nombre)).map((v) => v.id)
    if (sobran.length) {
      const { error: e2 } = await sb.from('variantes').delete().in('id', sobran)
      falla(e2, 'No se pudieron borrar las variantes quitadas')
    }
  }
  if (variantes.length) {
    const { error: e3 } = await sb.from('variantes').upsert(variantes, { onConflict: 'producto_id,nombre' })
    falla(e3, `No se pudieron guardar las variantes de ${p.nombre}`)
  }
  return id
}

export async function cambiarStock(
  sb: SupabaseClient,
  varianteId: number,
  stock: number | null,
): Promise<void> {
  const { error } = await sb.from('variantes').update({ stock }).eq('id', varianteId)
  falla(error, 'No se pudo cambiar el stock')
}

export async function borrarProducto(sb: SupabaseClient, id: number): Promise<void> {
  const { error } = await sb.from('productos').delete().eq('id', id)
  falla(error, 'No se pudo borrar el producto')
}

/**
 * Achica la foto en el navegador (WebP) y la sube. Devuelve la URL pública.
 * El muestrario va más grande para que se vean bien todas las variantes.
 */
export async function subirFoto(
  sb: SupabaseClient,
  archivo: File,
  slug: string,
  ladoMayor = 1000,
): Promise<string> {
  const imagen = await achicar(archivo, ladoMayor)
  const ruta = `${slug}-${Date.now()}.webp`
  const { error } = await sb.storage.from(BUCKET).upload(ruta, imagen, { contentType: 'image/webp' })
  falla(error, 'No se pudo subir la foto')
  return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
}

async function achicar(archivo: File, ladoMayor: number): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, ladoMayor / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((ok, mal) =>
    canvas.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo procesar la foto'))), 'image/webp', 0.85),
  )
}

/** Aplica un CSV ya revisado. Avanza producto por producto e informa el progreso. */
export async function aplicarImportacion(
  sb: SupabaseClient,
  plan: PlanImportacion,
  {
    ocultarFaltantes,
    alAvanzar,
  }: { ocultarFaltantes: boolean; alAvanzar?: (hechos: number, total: number) => void },
): Promise<void> {
  const categorias = await listarCategorias(sb)
  for (const nombre of plan.categoriasNuevas) {
    if (!categorias.some((c) => c.nombre === nombre)) {
      categorias.push(await crearCategoria(sb, nombre, categorias.length + 1))
    }
  }
  const idCategoria = (nombre: string) => categorias.find((c) => c.nombre === nombre)!.id

  // Solo se escriben los productos que cambian.
  const tocar = new Set([...plan.nuevos, ...plan.modificados].map((p) => p.slug))
  const productos = plan.productos.filter((p) => tocar.has(p.slug))
  let hechos = 0
  for (const p of productos) {
    await guardarProducto(
      sb,
      { ...p, categoria_id: idCategoria(p.categoria) },
      { borrarVariantesQueFaltan: false },
    )
    alAvanzar?.(++hechos, productos.length)
  }

  if (ocultarFaltantes && plan.faltantes.length) {
    const { error } = await sb
      .from('productos')
      .update({ activo: false })
      .in(
        'slug',
        plan.faltantes.map((f) => f.slug),
      )
    falla(error, 'No se pudieron ocultar los productos que faltan')
  }
}
