import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useCatalogo } from '../catalogo/CatalogoContext'
import { coincide } from '../catalogo/buscar'
import { TarjetaProducto } from '../componentes/TarjetaProducto'
import estilos from './Catalogo.module.css'

export function Catalogo() {
  const catalogo = useCatalogo()
  const [parametros, setParametros] = useSearchParams()
  const categoria = parametros.get('categoria') ?? ''
  const busqueda = parametros.get('q') ?? ''
  const subcategoria = parametros.get('sub') ?? ''

  function cambiar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(parametros)
    if (valor) nuevos.set(clave, valor)
    else nuevos.delete(clave)
    // Al cambiar de categoría, la subcategoría elegida ya no corresponde.
    if (clave === 'categoria') nuevos.delete('sub')
    setParametros(nuevos, { replace: true })
  }

  const subcategorias = useMemo(() => {
    if (catalogo.estado !== 'listo' || !categoria) return []
    const subs = catalogo.catalogo.productos
      .filter((p) => p.categoria === categoria && p.subcategoria)
      .map((p) => p.subcategoria!)
    return [...new Set(subs)].sort((a, b) => a.localeCompare(b))
  }, [catalogo, categoria])

  const productos = useMemo(() => {
    if (catalogo.estado !== 'listo') return []
    return catalogo.catalogo.productos.filter(
      (p) =>
        (!categoria || p.categoria === categoria) &&
        (!subcategoria || p.subcategoria === subcategoria) &&
        coincide(p, busqueda),
    )
  }, [catalogo, categoria, subcategoria, busqueda])

  return (
    <div className={`contenedor ${estilos.pagina}`}>
      <header className={estilos.cabecera}>
        <span className="rotulo">Lo que elegís</span>
        <h1>{categoria || 'Catálogo'}</h1>
        <p className={estilos.aviso}>Envíos por moto en CABA y por Correo Argentino a todo el país.</p>
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
                placeholder="Buscar: argolla, corazón, dorado…"
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
            {subcategorias.length > 1 && (
              <div className={estilos.subcategorias} role="group" aria-label={`Tipos de ${categoria}`}>
                {['', ...subcategorias].map((s) => (
                  <button
                    key={s || 'todas'}
                    type="button"
                    className={estilos.sub}
                    aria-pressed={subcategoria === s}
                    onClick={() => cambiar('sub', s)}
                  >
                    {s || 'Ver todo'}
                  </button>
                ))}
              </div>
            )}
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
