/**
 * La descripción de un producto es texto libre, escrito en el admin:
 *  - una línea en blanco separa párrafos,
 *  - las líneas que empiezan con "- " (o "• ") forman una lista.
 */
export type BloqueDescripcion = { tipo: 'parrafo'; texto: string } | { tipo: 'lista'; items: string[] }

const VINETA = /^\s*[-•*]\s+/

export function partirDescripcion(texto: string | null | undefined): BloqueDescripcion[] {
  const bloques: BloqueDescripcion[] = []
  let parrafo: string[] = []

  const cerrarParrafo = () => {
    if (parrafo.length) bloques.push({ tipo: 'parrafo', texto: parrafo.join(' ') })
    parrafo = []
  }

  for (const cruda of (texto ?? '').split(/\r?\n/)) {
    const linea = cruda.trim()
    if (!linea) {
      cerrarParrafo()
    } else if (VINETA.test(linea)) {
      cerrarParrafo()
      const item = linea.replace(VINETA, '')
      const ultimo = bloques.at(-1)
      if (ultimo?.tipo === 'lista') ultimo.items.push(item)
      else bloques.push({ tipo: 'lista', items: [item] })
    } else {
      parrafo.push(linea)
    }
  }
  cerrarParrafo()
  return bloques
}
