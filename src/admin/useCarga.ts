import { useCallback, useEffect, useRef, useState } from 'react'

export type Carga<T> =
  { estado: 'cargando' } | { estado: 'listo'; datos: T } | { estado: 'error'; mensaje: string }

/** Carga datos al montar y devuelve una función para volver a cargarlos. */
export function useCarga<T>(cargar: () => Promise<T>): [Carga<T>, () => void] {
  const [carga, setCarga] = useState<Carga<T>>({ estado: 'cargando' })
  const [vuelta, setVuelta] = useState(0)
  // La función se guarda en una ref: solo se vuelve a cargar al pedirlo, no en cada render.
  const funcion = useRef(cargar)

  useEffect(() => {
    let vigente = true
    funcion
      .current()
      .then((datos) => vigente && setCarga({ estado: 'listo', datos }))
      .catch(
        (e: unknown) =>
          vigente && setCarga({ estado: 'error', mensaje: e instanceof Error ? e.message : String(e) }),
      )
    return () => {
      vigente = false
    }
  }, [vuelta])

  return [carga, useCallback(() => setVuelta((v) => v + 1), [])]
}
