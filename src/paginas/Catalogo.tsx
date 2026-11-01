import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useCatalogo } from '../catalogo/CatalogoContext'
import { coincide } from '../catalogo/buscar'
import { TarjetaProducto } from '../componentes/TarjetaProducto'
import { preciosLanzamientoHasta } from '../config'
import estilos from './Catalogo.module.css'

export function Catalogo() {
  const catalogo = useCatalogo()
  const [parametros, setParametros] = useSearchParams()
  const categoria = parametros.get('categoria') ?? ''
  const busqueda = parametros.get('q') ?? ''

  function cambiar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(parametros)
    if (valor) nuevos.set(clave, valor)
    else nuevos.delete(clave)
    setParametros(nuevos, { replace: true })
  }

  const productos = useMemo(() => {
    if (catalogo.estado !== 'listo') return []
    return catalogo.catalogo.productos.filter(
      (p) => (!categoria || p.categoria === categoria) && coincide(p, busqueda),
    )
  }, [catalogo, categoria, busqueda])

  return (
    <div className={`contenedor ${estilos.pagina}`}>
      <header className={estilos.cabecera}>
        <h1>Catálogo</h1>
        <p className={estilos.aviso}>
          Precios de lanzamiento
          {preciosLanzamientoHasta ? `, válidos hasta el ${preciosLanzamientoHasta}` : ''}.
        </p>
      </header>

      {catalogo.estado === 'cargando' && <p>Cargando productos…</p>}
      {catalogo.estado === 'error' && <p>No pudimos cargar el catálogo. Probá de nuevo en un rato.</p>}

      {catalogo.estado === 'listo' && (
        <>
          <div className={estilos.filtros}>
            <label className={estilos.buscador}>
              <span className="solo-lectores">Buscar productos</span>
              <input
                type="search"
                placeholder="Buscar: top, kapping, #12…"
                value={busqueda}
                onChange={(e) => cambiar('q', e.target.value)}
              />
            </label>
            <div className={estilos.categorias} role="group" aria-label="Categorías">
              {['', ...catalogo.catalogo.categorias].map((c) => (
                <button
                  key={c || 'todas'}
                  type="button"
                  className={estilos.chip}
                  aria-pressed={categoria === c}
                  onClick={() => cambiar('categoria', c)}
                >
                  {c || 'Todo'}
                </button>
              ))}
            </div>
          </div>

          <p className={estilos.resultado} aria-live="polite">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
          </p>

          {productos.length === 0 ? (
            <p>No encontramos productos con esa búsqueda.</p>
          ) : (
            <div className={estilos.grilla}>
              {productos.map((p) => (
                <TarjetaProducto key={p.id} producto={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
