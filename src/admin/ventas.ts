import type { SupabaseClient } from '@supabase/supabase-js'
import Papa from 'papaparse'

// Ventas anotadas desde el admin. Se escriben solo con las funciones registrar_venta y
// anular_venta de la base, que descuentan y devuelven el stock en la misma operación.

export type Venta = {
  id: number
  fecha: string
  variante_id: number | null
  producto: string
  /** null si el producto no tiene tonos. */
  variante: string | null
  cantidad: number
  precio_unitario: number
  nota: string | null
  vendedor: string | null
  vendedor_nombre: string | null
}

export type Rol = 'admin' | 'vendedora' | null

function falla(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`${que}: ${error.message}`)
}

export async function miRol(sb: SupabaseClient): Promise<Rol> {
  const { data, error } = await sb.rpc('mi_rol')
  falla(error, 'No se pudo verificar el usuario')
  return data === 'admin' || data === 'vendedora' ? data : null
}

export async function registrarVenta(
  sb: SupabaseClient,
  venta: { varianteId: number; cantidad: number; precioUnitario: number; nota?: string },
): Promise<Venta> {
  const { data, error } = await sb
    .rpc('registrar_venta', {
      p_variante_id: venta.varianteId,
      p_cantidad: venta.cantidad,
      p_precio_unitario: venta.precioUnitario,
      p_nota: venta.nota ?? null,
    })
    .single()
  falla(error, 'No se pudo anotar la venta')
  return data as Venta
}

export async function anularVenta(sb: SupabaseClient, id: number): Promise<void> {
  const { error } = await sb.rpc('anular_venta', { p_venta_id: id })
  falla(error, 'No se pudo deshacer la venta')
}

/** Ventas desde una fecha (o todas), de la más nueva a la más vieja. */
export async function listarVentas(sb: SupabaseClient, desde?: Date): Promise<Venta[]> {
  let consulta = sb
    .from('ventas')
    .select(
      'id, fecha, variante_id, producto, variante, cantidad, precio_unitario, nota, vendedor, vendedor_nombre',
    )
    .order('fecha', { ascending: false })
  if (desde) consulta = consulta.gte('fecha', desde.toISOString())
  const { data, error } = await consulta
  falla(error, 'No se pudieron leer las ventas')
  return (data ?? []) as Venta[]
}

export const totalVenta = (v: Pick<Venta, 'cantidad' | 'precio_unitario'>): number =>
  v.cantidad * v.precio_unitario

export function nombreVendido(v: Pick<Venta, 'producto' | 'variante'>): string {
  return v.variante ? `${v.producto} ${v.variante}` : v.producto
}

/** Las 00:00 del día de hoy, menos `dias` días, en la hora del celular. */
export function inicioDelDia(dias = 0, hoy = new Date()): Date {
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dias)
}

export type Resumen = { ventas: number; unidades: number; total: number }

export function resumir(ventas: Venta[]): Resumen {
  return {
    ventas: ventas.length,
    unidades: ventas.reduce((t, v) => t + v.cantidad, 0),
    total: ventas.reduce((t, v) => t + totalVenta(v), 0),
  }
}

export type FilaProducto = { producto: string; unidades: number; total: number }

/** Unidades y plata por producto (sumando sus tonos), de lo que más se vende a lo que menos. */
export function porProducto(ventas: Venta[]): FilaProducto[] {
  const filas = new Map<string, FilaProducto>()
  for (const v of ventas) {
    const fila = filas.get(v.producto) ?? { producto: v.producto, unidades: 0, total: 0 }
    fila.unidades += v.cantidad
    fila.total += totalVenta(v)
    filas.set(v.producto, fila)
  }
  return [...filas.values()].sort(
    (a, b) => b.unidades - a.unidades || b.total - a.total || a.producto.localeCompare(b.producto),
  )
}

/** Agrupa por día (en la hora del celular), del más nuevo al más viejo. */
export function porDia(ventas: Venta[]): { dia: Date; ventas: Venta[] }[] {
  const dias = new Map<number, { dia: Date; ventas: Venta[] }>()
  for (const v of ventas) {
    const f = new Date(v.fecha)
    const dia = new Date(f.getFullYear(), f.getMonth(), f.getDate())
    const grupo = dias.get(dia.getTime()) ?? { dia, ventas: [] }
    grupo.ventas.push(v)
    dias.set(dia.getTime(), grupo)
  }
  return [...dias.values()]
    .sort((a, b) => b.dia.getTime() - a.dia.getTime())
    .map((g) => ({ ...g, ventas: g.ventas.sort((a, b) => b.fecha.localeCompare(a.fecha)) }))
}

/** CSV para abrir en Excel: una fila por venta. */
export function ventasACsv(ventas: Venta[]): string {
  // El BOM hace que Excel abra bien los acentos.
  return (
    '\ufeff' +
    Papa.unparse(
      ventas.map((v) => {
        const f = new Date(v.fecha)
        return {
          fecha: f.toLocaleDateString('sv-SE'),
          hora: f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
          producto: v.producto,
          variante: v.variante ?? '',
          cantidad: v.cantidad,
          precio_unitario: v.precio_unitario,
          total: totalVenta(v),
          vendio: v.vendedor_nombre ?? '',
          nota: v.nota ?? '',
        }
      }),
      { newline: '\r\n' },
    )
  )
}
