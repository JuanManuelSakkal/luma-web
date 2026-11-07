import { aSlug } from '../catalogo/importar'
import { nombreCombinacion } from '../catalogo/opciones'
import { UNICA, type ProductoAdmin, type VarianteAdmin } from './tipos'

// Cuentas del editor de opciones del admin (una opción, o color + talle). Sin pantallas, con tests.

export type Eje = 1 | 2

export const tieneDosOpcionesAdmin = (p: Pick<ProductoAdmin, 'tipo_variante2'>) => !!p.tipo_variante2

export function valorDe(v: VarianteAdmin, eje: Eje): string {
  return eje === 1 ? v.valor1 || v.nombre : (v.valor2 ?? '')
}

function unicos(lista: string[]): string[] {
  return [...new Set(lista.filter(Boolean))]
}

/** Los valores de una opción, en el orden en que aparecen. */
export function valoresEje(p: Pick<ProductoAdmin, 'variantes'>, eje: Eje): string[] {
  return unicos(p.variantes.filter((v) => v.nombre !== UNICA).map((v) => valorDe(v, eje)))
}

/**
 * Arma todas las combinaciones de las dos listas, conservando el stock, lo visible y el id de
 * las que ya existían. Con la segunda lista vacía queda una fila por valor de la primera.
 */
export function armarCombinaciones(
  variantes: VarianteAdmin[],
  lista1: string[],
  lista2: string[],
): VarianteAdmin[] {
  const filas: VarianteAdmin[] = []
  for (const v1 of lista1) {
    for (const v2 of lista2.length ? lista2 : [null]) {
      const previa = variantes.find((v) => valorDe(v, 1) === v1 && (v.valor2 ?? null) === v2)
      filas.push({
        ...(previa ?? { stock: null, activo: true }),
        nombre: nombreCombinacion(v1, v2 ?? undefined),
        valor1: v1,
        valor2: v2,
        orden: filas.length,
      })
    }
  }
  return filas
}

function conListas(p: ProductoAdmin, lista1: string[], lista2: string[]): ProductoAdmin {
  return { ...p, variantes: armarCombinaciones(p.variantes, lista1, lista2) }
}

/** Agrega valores escritos separados por coma ("Dorado, Plateado" o "12, 14, 16"). */
export function agregarValores(p: ProductoAdmin, eje: Eje, texto: string): ProductoAdmin {
  const actuales = valoresEje(p, eje)
  const nuevos = unicos(texto.split(',').map((t) => t.trim())).filter((t) => !actuales.includes(t))
  if (!nuevos.length) return p
  const l1 = valoresEje(p, 1)
  const l2 = valoresEje(p, 2)
  return eje === 1 ? conListas(p, [...l1, ...nuevos], l2) : conListas(p, l1, [...l2, ...nuevos])
}

export function quitarValor(p: ProductoAdmin, eje: Eje, valor: string): ProductoAdmin {
  const l1 = valoresEje(p, 1).filter((v) => eje !== 1 || v !== valor)
  const l2 = valoresEje(p, 2).filter((v) => eje !== 2 || v !== valor)
  return conListas(p, l1, l2)
}

/** Cambia el nombre de un valor en todas sus combinaciones; la foto se va con él. */
export function renombrarValor(p: ProductoAdmin, eje: Eje, viejo: string, nuevo: string): ProductoAdmin {
  nuevo = nuevo.trim()
  if (!nuevo || nuevo === viejo || valoresEje(p, eje).includes(nuevo)) return p
  const variantes = p.variantes.map((v) => {
    if (valorDe(v, eje) !== viejo) return v
    const valor1 = eje === 1 ? nuevo : valorDe(v, 1)
    const valor2 = eje === 2 ? nuevo : (v.valor2 ?? null)
    return { ...v, valor1, valor2, nombre: nombreCombinacion(valor1, valor2 ?? undefined) }
  })
  let fotos = p.fotos_opcion
  if (eje === 1 && fotos?.[viejo]) {
    const { [viejo]: url, ...resto } = fotos
    fotos = { ...resto, [nuevo]: url }
  }
  return { ...p, variantes, fotos_opcion: fotos }
}

/** Pasa a tener dos opciones: los valores que había quedan como valores de la primera. */
export function pasarADosOpciones(p: ProductoAdmin, tipo2: string): ProductoAdmin {
  const variantes = p.variantes
    .filter((v) => v.nombre !== UNICA)
    .map((v) => ({ ...v, valor1: valorDe(v, 1), valor2: null }))
  return { ...p, tipo_variante2: tipo2, variantes }
}

/** Vuelve a una sola opción: una fila por valor de la primera, con el stock sumado. */
export function pasarAUnaOpcion(p: ProductoAdmin): ProductoAdmin {
  const variantes = valoresEje(p, 1).map((v1, orden): VarianteAdmin => {
    const filas = p.variantes.filter((v) => valorDe(v, 1) === v1)
    const stock = filas.every((v) => v.stock === null) ? null : filas.reduce((t, v) => t + (v.stock ?? 0), 0)
    // Se conserva la fila sin talle si había, si no la primera (así no pierde el id).
    const base = filas.find((v) => !v.valor2) ?? filas[0]
    return {
      ...base,
      nombre: v1,
      valor1: v1,
      valor2: null,
      stock,
      activo: filas.some((v) => v.activo),
      orden,
    }
  })
  return { ...p, tipo_variante2: null, variantes }
}

export function ponerFoto(p: ProductoAdmin, valor1: string, url: string | null): ProductoAdmin {
  const { [valor1]: _, ...resto } = p.fotos_opcion ?? {}
  return { ...p, fotos_opcion: url ? { ...resto, [valor1]: url } : resto }
}

/** Deja el producto listo para guardar: nombres, valores y fotos coherentes. */
export function normalizarOpciones(p: ProductoAdmin): ProductoAdmin {
  const dos = tieneDosOpcionesAdmin(p)
  const variantes = p.variantes.map((v) => {
    if (v.nombre === UNICA) return { ...v, valor1: null, valor2: null }
    if (!dos) return { ...v, valor1: v.nombre.trim(), valor2: null }
    const valor1 = valorDe(v, 1)
    const valor2 = v.valor2 || null
    return { ...v, valor1, valor2, nombre: nombreCombinacion(valor1, valor2 ?? undefined) }
  })
  const valores = new Set(variantes.map((v) => v.valor1).filter(Boolean))
  const fotos = Object.fromEntries(Object.entries(p.fotos_opcion ?? {}).filter(([k]) => valores.has(k)))
  return {
    ...p,
    tipo_variante2: dos ? p.tipo_variante2!.trim() : null,
    muestrario_titulo: p.muestrario_titulo?.trim() || null,
    variantes,
    fotos_opcion: fotos,
  }
}

/**
 * Reconoce a qué valor va cada foto por el nombre del archivo: "dorado.jpg" → Dorado,
 * "anillo-plateado.png" → Plateado. Si varios valores aparecen, gana el más largo ("rosa-viejo" antes que "rosa").
 */
export function asignarFotosPorNombre(
  archivos: string[],
  valores: string[],
): { asignadas: { archivo: string; valor: string }[]; sinAsignar: string[] } {
  const asignadas: { archivo: string; valor: string }[] = []
  const sinAsignar: string[] = []
  const porLargo = [...valores].sort((a, b) => aSlug(b).length - aSlug(a).length)
  for (const archivo of archivos) {
    const nombre = `-${aSlug(archivo.replace(/\.[^.]+$/, ''))}-`
    const valor = porLargo.find((v) => aSlug(v) && nombre.includes(`-${aSlug(v)}-`))
    if (valor) asignadas.push({ archivo, valor })
    else sinAsignar.push(archivo)
  }
  return { asignadas, sinAsignar }
}
