/* Aparición al scrollear: los elementos entran desde abajo con un fade.
   Uso: <div ref={revelar}>. Un solo IntersectionObserver para toda la página;
   los que entran juntos en pantalla salen escalonados. Los estilos están en
   marca.css (.revelar / .revelado) y respetan prefers-reduced-motion. */

const pasoRetraso = 80
const maxRetraso = 400

let observador: IntersectionObserver | undefined

function obtenerObservador() {
  observador ??= new IntersectionObserver(
    (entradas, obs) => {
      let orden = 0
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue
        const el = entrada.target as HTMLElement
        el.style.setProperty('--retraso', `${Math.min(orden++ * pasoRetraso, maxRetraso)}ms`)
        el.classList.add('revelado')
        obs.unobserve(el)
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  )
  return observador
}

export function revelar(el: HTMLElement | null) {
  // Sin IntersectionObserver (tests en jsdom) el elemento queda visible tal cual.
  if (!el || typeof IntersectionObserver === 'undefined') return
  el.classList.add('revelar')
  const obs = obtenerObservador()
  obs.observe(el)
  return () => obs.unobserve(el)
}
