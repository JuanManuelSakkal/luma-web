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
  precio: number
  nota: string | null
  tipo_variante: string | null
  destacado: boolean
  imagen_url: string | null
  muestrario_url: string | null
  /** Puede faltar si todavía no se corrió la migración 20261029000000_descripcion_publica.sql. */
  descripcion?: string | null
  variantes: Variante[]
  disponibilidad: Disponibilidad
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
    precio: f.precio,
    variantes: f.variantes,
    tipoVariante: f.tipo_variante ?? undefined,
    nota: f.nota ?? undefined,
    destacado: f.destacado,
    disponibilidad: f.disponibilidad,
    imagenUrl: f.imagen_url ?? undefined,
    muestrarioUrl: f.muestrario_url ?? undefined,
    descripcion: f.descripcion?.trim() || undefined,
  }))
  const categorias = [...new Set(productos.map((p) => p.categoria))]
  return { productos, categorias }
}
