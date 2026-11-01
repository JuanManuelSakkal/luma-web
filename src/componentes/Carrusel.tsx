import { useEffect, useRef, useState, type ReactNode } from 'react'
import estilos from './Carrusel.module.css'

/**
 * Fila de tarjetas que se desliza de costado. En el celular se arrastra con el dedo y
 * se asoma la tarjeta siguiente; con mouse aparecen flechas. No avanza solo a propósito:
 * moverse mientras alguien lee o está por tocar "Agregar" molesta.
 */
export function Carrusel({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const pista = useRef<HTMLDivElement>(null)
  const [puede, setPuede] = useState({ atras: false, adelante: false })

  useEffect(() => {
    const el = pista.current
    if (!el) return
    const medir = () =>
      setPuede({
        atras: el.scrollLeft > 4,
        adelante: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      })
    medir()
    el.addEventListener('scroll', medir, { passive: true })
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => {
      el.removeEventListener('scroll', medir)
      observador.disconnect()
    }
  }, [])

  function mover(sentido: 1 | -1) {
    const el = pista.current
    if (!el) return
    // Avanza casi una pantalla, así la última tarjeta visible queda como primera.
    el.scrollBy({ left: sentido * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <div className={estilos.carrusel}>
      <div ref={pista} className={estilos.pista} role="region" aria-label={etiqueta} tabIndex={0}>
        {children}
      </div>
      {(puede.atras || puede.adelante) && (
        <div className={estilos.flechas}>
          <button
            type="button"
            className={estilos.flecha}
            onClick={() => mover(-1)}
            disabled={!puede.atras}
            aria-label="Ver anteriores"
          >
            ‹
          </button>
          <button
            type="button"
            className={estilos.flecha}
            onClick={() => mover(1)}
            disabled={!puede.adelante}
            aria-label="Ver más"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
