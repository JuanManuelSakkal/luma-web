import { destacados } from '../config'
import csvLocal from '../datos/catalogo.csv?raw'
import { importarCatalogo } from './importar'
import type { Catalogo, Disponibilidad, Producto, Variante } from './tipos'

/**
 * De dónde sale el catálogo:
 *  - Si está configurado Supabase (.env.local), de la vista pública catalogo_publico.
 *  - Si no, del CSV que viene con la web (src/datos/catalogo.csv).
 * Si Supabase falla, se usa el CSV como respaldo, así la web nunca queda vacía.
 */
export async function obtenerCatalogo(): Promise<Catalogo> {
  // Supabase se carga solo si está configurado, para no sumar peso a la web si no se usa.
  if (import.meta.env.VITE_SUPABASE_URL) {
    try {
      return await desdeSupabase()
    } catch (e) {
      console.error('No se pudo leer el catálogo de Supabase, uso el CSV local.', e)
    }
  }
  return catalogoLocal()
}

export function catalogoLocal(): Catalogo {
  const { catalogo, errores } = importarCatalogo(csvLocal, destacados)
  if (errores.length) console.warn('Errores en src/datos/catalogo.csv:', errores)
  return catalogo
}

type FilaPublica = {
  id: string
  nombre: string
  categoria: string
  categoria_orden: number
  subcategoria: string | null
  precio: number
  nota: string | null
  tipo_variante: string | null
  destacado: boolean
  imagen_url: string | null
  muestrario_url: string | null
  /** Puede faltar si todavía no se corrió la migración 20261029000000_descripcion_publica.sql. */
  descripcion?: string | null
  variantes: (Omit<Variante, 'valor1' | 'valor2'> & { valor1?: string | null; valor2?: string | null })[]
  disponibilidad: Disponibilidad
  /** Stock de un producto sin variantes. Puede faltar si no se corrió 20261107000000_stock_publico.sql. */
  stock?: number | null
  /** Pueden faltar si todavía no se corrió la migración 20261108000000_opciones_y_fotos.sql. */
  tipo_variante2?: string | null
  fotos_opcion?: Record<string, string> | null
  muestrario_titulo?: string | null
}

async function desdeSupabase(): Promise<Catalogo> {
  const { supabase } = await import('../lib/supabase')
  if (!supabase) throw new Error('Supabase no está configurado')
  const { data, error } = await supabase
    .from('catalogo_publico')
    .select('*')
    .order('categoria_orden')
    .order('nombre')
  if (error) throw error
  const filas = (data ?? []) as FilaPublica[]
  if (filas.length === 0) throw new Error('La vista catalogo_publico está vacía')

  const productos: Producto[] = filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    categoria: f.categoria,
    subcategoria: f.subcategoria?.trim() || undefined,
    precio: f.precio,
    // El JSON trae "stock": null cuando no se controla; se deja sin valor.
    variantes: f.variantes.map((v) => ({
      nombre: v.nombre,
      disponibilidad: v.disponibilidad,
      ...(v.stock == null ? {} : { stock: v.stock }),
      valor1: v.valor1 || v.nombre,
      ...(f.tipo_variante2 && v.valor2 ? { valor2: v.valor2 } : {}),
    })),
    tipoVariante: f.tipo_variante ?? undefined,
    tipoVariante2: f.tipo_variante2?.trim() || undefined,
    fotosOpcion: f.fotos_opcion ?? undefined,
    muestrarioTitulo: f.muestrario_titulo?.trim() || undefined,
    nota: f.nota ?? undefined,
    destacado: f.destacado,
    disponibilidad: f.disponibilidad,
    ...(f.stock == null ? {} : { stock: f.stock }),
    imagenUrl: f.imagen_url ?? undefined,
    muestrarioUrl: f.muestrario_url ?? undefined,
    descripcion: f.descripcion?.trim() || undefined,
  }))
  const categorias = [...new Set(productos.map((p) => p.categoria))]
  return { productos, categorias }
}
