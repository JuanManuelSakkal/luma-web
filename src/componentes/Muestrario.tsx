import { useEffect, useRef, type ReactNode } from 'react'
import estilos from './Muestrario.module.css'

/** Ventana con la foto del muestrario de un producto (todos los colores juntos, o una guía de talles). */
export function Muestrario({
  abierto,
  alCerrar,
  nombre,
  tipo,
  titulo,
  url,
  ayuda = 'Elegí el tuyo en el selector de la tarjeta.',
}: {
  abierto: boolean
  alCerrar: () => void
  nombre: string
  /** "colores", "medidas" o "modelos". */
  tipo: string
  /** Título propio ("Guía de talles"). Sin título: "Colores de …" y el texto de ayuda. */
  titulo?: string
  url: string
  /** Texto debajo de la foto. */
  ayuda?: ReactNode
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const encabezado = titulo
    ? `${titulo} · ${nombre}`
    : `${tipo[0].toUpperCase() + tipo.slice(1)} de ${nombre}`

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
      aria-label={encabezado}
      onClose={alCerrar}
      onClick={(e) => e.target === e.currentTarget && alCerrar()}
    >
      <div className={estilos.encabezado}>
        <h2>{encabezado}</h2>
        <button type="button" className={estilos.cerrar} onClick={alCerrar} aria-label="Cerrar">
          ×
        </button>
      </div>
      {abierto && <img src={url} alt={titulo ? encabezado : `Muestrario con los ${tipo} de ${nombre}`} />}
      <p className={estilos.ayuda}>
        {/* La ayuda habla de elegir en el selector: con un título propio (una guía de talles) no va. */}
        {!titulo && <>{ayuda} </>}
        <a href={url} target="_blank" rel="noreferrer">
          Ver en grande
        </a>
      </p>
    </dialog>
  )
}
