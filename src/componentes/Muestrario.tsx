import { useEffect, useRef, type ReactNode } from 'react'
import estilos from './Muestrario.module.css'

/** Ventana con la foto del muestrario de un producto (todos los tonos con sus números). */
export function Muestrario({
  abierto,
  alCerrar,
  nombre,
  tipo,
  url,
  ayuda = 'Elegí el número en el selector de la tarjeta.',
}: {
  abierto: boolean
  alCerrar: () => void
  nombre: string
  /** "tonos" o "aromas". */
  tipo: string
  url: string
  /** Texto debajo de la foto. */
  ayuda?: ReactNode
}) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  return (
    <dialog
      ref={dialogo}
      className={estilos.ventana}
      aria-label={`${tipo} de ${nombre}`}
      onClose={alCerrar}
      onClick={(e) => e.target === e.currentTarget && alCerrar()}
    >
      <div className={estilos.encabezado}>
        <h2>
          {tipo[0].toUpperCase() + tipo.slice(1)} de {nombre}
        </h2>
        <button type="button" className={estilos.cerrar} onClick={alCerrar} aria-label="Cerrar">
          ×
        </button>
      </div>
      {abierto && <img src={url} alt={`Muestrario con los ${tipo} de ${nombre} y sus números`} />}
      <p className={estilos.ayuda}>
        {ayuda}{' '}
        <a href={url} target="_blank" rel="noreferrer">
          Ver en grande
        </a>
      </p>
    </dialog>
  )
}
