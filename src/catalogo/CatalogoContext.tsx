import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { obtenerCatalogo } from './fuente'
import type { Catalogo } from './tipos'

type Estado =
  { estado: 'cargando' } | { estado: 'listo'; catalogo: Catalogo } | { estado: 'error'; mensaje: string }

const Contexto = createContext<Estado>({ estado: 'cargando' })

export function CatalogoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ estado: 'cargando' })

  useEffect(() => {
    let vigente = true
    obtenerCatalogo()
      .then((catalogo) => vigente && setEstado({ estado: 'listo', catalogo }))
      .catch((e: unknown) => vigente && setEstado({ estado: 'error', mensaje: String(e) }))
    return () => {
      vigente = false
    }
  }, [])

  return <Contexto.Provider value={estado}>{children}</Contexto.Provider>
}

export function useCatalogo(): Estado {
  return useContext(Contexto)
}
