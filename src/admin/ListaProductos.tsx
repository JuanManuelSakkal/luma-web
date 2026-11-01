import type { SupabaseClient } from '@supabase/supabase-js'
import { Link, useSearchParams } from 'react-router'
import { aSlug } from '../catalogo/importar'
import { pesos } from '../pedido/pedido'
import { listarCategorias, listarProductos } from './api'
import estilos from './admin.module.css'
import { UNICA, type ProductoAdmin } from './tipos'
import { useCarga } from './useCarga'

function resumenStock(p: ProductoAdmin): { texto: string; alerta: boolean } {
  const activas = p.variantes.filter((v) => v.activo)
  if (activas.length === 0) return { texto: 'Sin variantes activas', alerta: true }
  if (activas.every((v) => v.stock === null)) return { texto: 'Sin controlar', alerta: false }
  const sinStock = activas.filter((v) => v.stock === 0).length
  const total = activas.reduce((t, v) => t + (v.stock ?? 0), 0)
  if (activas.length === 1 && activas[0].nombre === UNICA) return { texto: String(total), alerta: total <= 3 }
  return {
    texto: `${total} en ${activas.length} variantes${sinStock ? ` · ${sinStock} sin stock` : ''}`,
    alerta: sinStock > 0,
  }
}

/** Avisa a EditarProducto que se llegó desde la lista, para volver a ella como estaba. */
const desdeLista = { desdeLista: true }

/** "foto y descripción", "foto", "descripción" o "" si está completo. */
function faltantes(p: ProductoAdmin): string {
  const falta = [!p.imagen_url && 'foto', !p.descripcion?.trim() && 'descripción'].filter(Boolean)
  return falta.join(' y ')
}

export function ListaProductos({ sb }: { sb: SupabaseClient }) {
  const [carga] = useCarga(() => Promise.all([listarProductos(sb), listarCategorias(sb)]))
  // Los filtros van en la dirección, así al volver de editar un producto siguen puestos.
  const [parametros, setParametros] = useSearchParams()
  const busqueda = parametros.get('q') ?? ''
  const categoria = parametros.get('categoria') ? Number(parametros.get('categoria')) : ''
  const verOcultos = parametros.get('ocultos') !== 'no'

  function cambiar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(parametros)
    if (valor) nuevos.set(clave, valor)
    else nuevos.delete(clave)
    setParametros(nuevos, { replace: true })
  }

  if (carga.estado === 'cargando') return <p>Cargando productos…</p>
  if (carga.estado === 'error') return <p className={estilos.error}>{carga.mensaje}</p>

  const [productos, categorias] = carga.datos
  const palabras = aSlug(busqueda).split('-').filter(Boolean)
  const visibles = productos.filter(
    (p) =>
      (categoria === '' || p.categoria_id === categoria) &&
      (verOcultos || p.activo) &&
      palabras.every((w) => aSlug(`${p.nombre} ${p.variantes.map((v) => v.nombre).join(' ')}`).includes(w)),
  )

  return (
    <>
      <div className={estilos.titulo}>
        <h1>Productos</h1>
        <Link to="/admin/producto/nuevo" state={desdeLista} className="boton boton-principal">
          + Nuevo producto
        </Link>
      </div>

      {productos.length === 0 ? (
        <div className={estilos.caja}>
          <p>Todavía no hay productos cargados.</p>
          <p>
            La forma más rápida de empezar es{' '}
            <Link to="/admin/importar">subir la lista de precios en CSV</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className={estilos.filtros}>
            <input
              type="search"
              placeholder="Buscar producto o variante"
              aria-label="Buscar producto o variante"
              value={busqueda}
              onChange={(e) => cambiar('q', e.target.value)}
            />
            <select
              aria-label="Categoría"
              value={categoria}
              onChange={(e) => cambiar('categoria', e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <label className={estilos.check}>
              <input
                type="checkbox"
                checked={verOcultos}
                onChange={(e) => cambiar('ocultos', e.target.checked ? '' : 'no')}
              />
              Mostrar ocultos
            </label>
          </div>

          <p className={estilos.suave}>
            {visibles.length} de {productos.length} productos
          </p>

          <ul className={estilos.lista}>
            {visibles.map((p) => {
              const stock = resumenStock(p)
              return (
                <li key={p.id}>
                  <Link to={`/admin/producto/${p.slug}`} state={desdeLista} className={estilos.filaProducto}>
                    <span className={estilos.miniatura}>
                      {p.imagen_url ? (
                        <img src={p.imagen_url} alt="" loading="lazy" />
                      ) : (
                        <span aria-hidden="true">sin foto</span>
                      )}
                    </span>
                    <span className={estilos.datosProducto}>
                      <strong>
                        {p.nombre}
                        {p.destacado && <span title="Destacado"> ★</span>}
                      </strong>
                      <span className={estilos.suave}>
                        {categorias.find((c) => c.id === p.categoria_id)?.nombre} · {pesos(p.precio)}
                      </span>
                      {faltantes(p) && <span className={estilos.falta}>Falta {faltantes(p)}</span>}
                    </span>
                    <span className={stock.alerta ? estilos.stockAlerta : estilos.stock}>{stock.texto}</span>
                    {!p.activo && <span className={estilos.oculto}>Oculto</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}
