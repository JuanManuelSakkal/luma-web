import type { Disponibilidad, Producto, Variante } from './tipos'

// Opciones de un producto: una (Color, Medida o Modelo) o dos (Color + Talle). Cada combinación es
// una variante. No depende de React ni de Supabase (viene de la web de Mond, casi sin cambios).

/** Plural en castellano: color → colores, talle → talles, medida → medidas. */
export function plural(palabra: string): string {
  return /[aeiouáéíóú]$/i.test(palabra) ? `${palabra}s` : `${palabra}es`
}

/** "Dorado" + "14" → "Dorado · 14". Es el nombre de la variante con dos opciones. */
export function nombreCombinacion(valor1: string, valor2?: string): string {
  return valor2 ? `${valor1} · ${valor2}` : valor1
}

export function valor1De(v: Pick<Variante, 'nombre' | 'valor1'>): string {
  return v.valor1 || v.nombre
}

/** true si el producto tiene dos opciones para elegir (por ejemplo color y talle). */
export function tieneDosOpciones(p: Pick<Producto, 'tipoVariante2' | 'variantes'>): boolean {
  return !!p.tipoVariante2 && p.variantes.some((v) => v.valor2)
}

function unicos(lista: (string | undefined)[]): string[] {
  return [...new Set(lista.filter((x): x is string => !!x))]
}

/** Los valores de la primera opción, en orden: ["Dorado", "Plateado"]. */
export function valores1(p: Pick<Producto, 'variantes'>): string[] {
  return unicos(p.variantes.map(valor1De))
}

/** Los valores de la segunda opción, en orden: ["12", "14", "16"]. */
export function valores2(p: Pick<Producto, 'tipoVariante2' | 'variantes'>): string[] {
  return tieneDosOpciones(p) ? unicos(p.variantes.map((v) => v.valor2)) : []
}

/** La variante de esa combinación, si existe. */
export function buscarVariante(
  p: Pick<Producto, 'tipoVariante2' | 'variantes'>,
  valor1: string,
  valor2?: string,
): Variante | undefined {
  const dos = tieneDosOpciones(p)
  return p.variantes.find((v) => valor1De(v) === valor1 && (!dos || v.valor2 === valor2))
}

const sePuede = (v?: Variante) => !!v && v.disponibilidad !== 'sin-stock'

/** ¿Se puede elegir este valor de la primera opción? (alguna combinación con él se puede comprar). */
export function valor1Disponible(p: Pick<Producto, 'variantes'>, valor1: string): boolean {
  return p.variantes.some((v) => valor1De(v) === valor1 && sePuede(v))
}

/** ¿Se puede elegir este valor de la segunda opción junto con el valor1 elegido? */
export function valor2Disponible(
  p: Pick<Producto, 'tipoVariante2' | 'variantes'>,
  valor1: string,
  valor2: string,
): boolean {
  return sePuede(buscarVariante(p, valor1, valor2))
}

/** Disponibilidad de lo elegido. Con dos opciones y sin la segunda elegida, la mejor del valor1. */
export function disponibilidadElegida(
  p: Pick<Producto, 'tipoVariante2' | 'variantes' | 'disponibilidad'>,
  valor1: string,
  valor2?: string,
): Disponibilidad {
  if (p.variantes.length === 0) return p.disponibilidad
  if (tieneDosOpciones(p) && !valor2) {
    const d = p.variantes.filter((v) => valor1De(v) === valor1).map((v) => v.disponibilidad)
    if (d.includes('disponible')) return 'disponible'
    if (d.includes('pocas')) return 'pocas'
    return 'sin-stock'
  }
  return buscarVariante(p, valor1, valor2)?.disponibilidad ?? 'sin-stock'
}

/** Lo que se elige al abrir el producto: lo del link si se puede, si no el primer valor disponible. */
export function seleccionInicial(
  p: Pick<Producto, 'tipoVariante2' | 'variantes'>,
  pedido?: string,
): { valor1: string; valor2: string } {
  const dos = tieneDosOpciones(p)
  // El link puede traer el nombre de la variante ("Dorado · 14") o solo el primer valor ("Dorado").
  const exacta = pedido ? p.variantes.find((v) => v.nombre === pedido && sePuede(v)) : undefined
  if (exacta) return { valor1: valor1De(exacta), valor2: dos ? (exacta.valor2 ?? '') : '' }
  if (pedido && valor1Disponible(p, pedido)) return { valor1: pedido, valor2: '' }
  const primera = p.variantes.find(sePuede)
  // La segunda opción (un talle) no se elige sola: que la clienta la elija a propósito.
  return { valor1: primera ? valor1De(primera) : '', valor2: '' }
}

/** La foto para el valor elegido: la propia, si no la general, si no ninguna. */
export function fotoDe(
  p: Pick<Producto, 'imagenUrl' | 'fotosOpcion' | 'variantes'>,
  valor1?: string,
): string | undefined {
  return (valor1 && p.fotosOpcion?.[valor1]) || fotoPrincipal(p)
}

/** La foto de la tarjeta: la general, o la del primer valor que tenga foto. */
export function fotoPrincipal(
  p: Pick<Producto, 'imagenUrl' | 'fotosOpcion' | 'variantes'>,
): string | undefined {
  if (p.imagenUrl) return p.imagenUrl
  for (const v of valores1(p)) if (p.fotosOpcion?.[v]) return p.fotosOpcion[v]
  return undefined
}

/** Los valores de la primera opción que tienen foto, con su foto, en orden. */
export function fotosPorValor(
  p: Pick<Producto, 'fotosOpcion' | 'variantes'>,
): { valor: string; url: string }[] {
  return valores1(p)
    .filter((v) => p.fotosOpcion?.[v])
    .map((valor) => ({ valor, url: p.fotosOpcion![valor] }))
}

/** "Ver guía de talles"; sin título, "Ver el muestrario de colores". */
export function textoBotonMuestrario(p: Pick<Producto, 'muestrarioTitulo'>, plural: string): string {
  const t = p.muestrarioTitulo?.trim()
  return t ? `Ver ${t.charAt(0).toLowerCase()}${t.slice(1)}` : `Ver el muestrario de ${plural}`
}
