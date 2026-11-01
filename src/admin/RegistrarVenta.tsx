import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState, type FormEvent } from 'react'
import { aSlug } from '../catalogo/importar'
import { Muestrario } from '../componentes/Muestrario'
import { pesos } from '../pedido/pedido'
import { listarCategorias, listarProductos } from './api'
import estilos from './admin.module.css'
import { UNICA, type ProductoAdmin, type VarianteAdmin } from './tipos'
import { useCarga, type Carga } from './useCarga'
import {
  anularVenta,
  inicioDelDia,
  listarVentas,
  nombreVendido,
  registrarVenta,
  resumir,
  totalVenta,
  type Venta,
} from './ventas'

/**
 * Pantalla para anotar ventas desde el celular: buscar el producto, elegir el tono,
 * la cantidad y listo. Cada venta descuenta el stock.
 * Con `usuario` (las vendedoras) solo se pueden deshacer las ventas propias.
 */
export function RegistrarVenta({ sb, usuario }: { sb: SupabaseClient; usuario?: string }) {
  const [productos, recargarProductos] = useCarga(() => listarProductos(sb))
  const [categorias] = useCarga(() => listarCategorias(sb))
  const [categoria, setCategoria] = useState<number | ''>('')
  const [hoy, recargarHoy] = useCarga(() => listarVentas(sb, inicioDelDia()))
  const [busqueda, setBusqueda] = useState('')
  const [elegido, setElegido] = useState<ProductoAdmin | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  if (productos.estado === 'cargando') return <p>Cargando productos…</p>
  if (productos.estado === 'error') return <p className={estilos.error}>{productos.mensaje}</p>

  const palabras = aSlug(busqueda).split('-').filter(Boolean)
  const vendibles = productos.datos.filter((p) => p.variantes.some((v) => v.activo))
  // Solo las categorías que tienen algo para vender.
  const conProductos =
    categorias.estado === 'listo'
      ? categorias.datos.filter((c) => vendibles.some((p) => p.categoria_id === c.id))
      : []
  const visibles = vendibles
    .filter((p) => categoria === '' || p.categoria_id === categoria)
    .filter((p) =>
      palabras.every((w) => aSlug(`${p.nombre} ${p.variantes.map((v) => v.nombre).join(' ')}`).includes(w)),
    )
    // Primero los que se ven en la web.
    .sort((a, b) => Number(b.activo) - Number(a.activo))

  function alAnotar(venta: Venta) {
    setAviso({
      tipo: 'ok',
      texto: `Anotado: ${venta.cantidad} × ${nombreVendido(venta)} · ${pesos(totalVenta(venta))}`,
    })
    setElegido(null)
    setBusqueda('')
    recargarProductos()
    recargarHoy()
    window.scrollTo(0, 0)
  }

  async function deshacer(venta: Venta) {
    if (!window.confirm(`¿Deshacer ${venta.cantidad} × ${nombreVendido(venta)}? El stock vuelve a sumarse.`))
      return
    try {
      await anularVenta(sb, venta.id)
      setAviso({ tipo: 'ok', texto: `Deshecha: ${venta.cantidad} × ${nombreVendido(venta)}` })
      recargarProductos()
      recargarHoy()
    } catch (e) {
      setAviso({ tipo: 'error', texto: (e as Error).message })
    }
  }

  return (
    <div className={estilos.venta}>
      <h1>Anotar venta</h1>

      {aviso && (
        <p className={aviso.tipo === 'ok' ? estilos.ok : estilos.error} role="status">
          {aviso.texto}
        </p>
      )}

      {elegido ? (
        <FormularioVenta
          key={elegido.id}
          sb={sb}
          producto={elegido}
          alAnotar={alAnotar}
          alCancelar={() => setElegido(null)}
        />
      ) : (
        <>
          <input
            type="search"
            className={estilos.buscadorVenta}
            placeholder="Buscá qué vendiste"
            aria-label="Buscar producto"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setAviso(null)
            }}
          />
          {conProductos.length > 1 && (
            <div className={estilos.chips} role="group" aria-label="Categoría">
              {[{ id: '' as const, nombre: 'Todas' }, ...conProductos].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={categoria === c.id}
                  className={categoria === c.id ? estilos.chipElegido : estilos.chip}
                  onClick={() => setCategoria(c.id)}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}
          <ul className={estilos.lista}>
            {visibles.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={estilos.opcionVenta}
                  onClick={() => {
                    setElegido(p)
                    setAviso(null)
                  }}
                >
                  <Miniatura url={p.imagen_url} />
                  <strong>{p.nombre}</strong>
                  <span className={estilos.suave}>{pesos(p.precio)}</span>
                </button>
              </li>
            ))}
            {visibles.length === 0 && <li className={estilos.suave}>No hay productos con ese nombre acá.</li>}
          </ul>
        </>
      )}

      <AnotadasHoy hoy={hoy} usuario={usuario} alDeshacer={deshacer} />
    </div>
  )
}

function FormularioVenta({
  sb,
  producto,
  alAnotar,
  alCancelar,
}: {
  sb: SupabaseClient
  producto: ProductoAdmin
  alAnotar: (v: Venta) => void
  alCancelar: () => void
}) {
  const variantes = producto.variantes.filter((v) => v.activo)
  const conTonos = variantes.some((v) => v.nombre !== UNICA)
  const [variante, setVariante] = useState<VarianteAdmin | null>(conTonos ? null : variantes[0])
  const [cantidad, setCantidad] = useState(1)
  const [precio, setPrecio] = useState(producto.precio)
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [viendoTonos, setViendoTonos] = useState(false)

  // Si venía de bajar por la lista, el formulario arranca desde arriba.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const tipo = `${(producto.tipo_variante ?? 'Tono').toLowerCase()}s`

  async function anotar(e: FormEvent) {
    e.preventDefault()
    if (!variante?.id) return setError(`Elegí el ${(producto.tipo_variante ?? 'tono').toLowerCase()}.`)
    setGuardando(true)
    setError('')
    try {
      alAnotar(await registrarVenta(sb, { varianteId: variante.id, cantidad, precioUnitario: precio, nota }))
    } catch (e) {
      setError((e as Error).message)
      setGuardando(false)
    }
  }

  return (
    <form className={estilos.bloque} onSubmit={anotar}>
      <div className={estilos.cabeceraVenta}>
        <Miniatura url={producto.imagen_url} />
        <h2>{producto.nombre}</h2>
      </div>

      {conTonos && (
        <>
          <div className={estilos.filaTono}>
            <p className={estilos.suave}>{producto.tipo_variante ?? 'Tono'}</p>
            {producto.muestrario_url && (
              <button type="button" className={estilos.enlace} onClick={() => setViendoTonos(true)}>
                Ver {tipo}
              </button>
            )}
          </div>
          {producto.muestrario_url && (
            <Muestrario
              abierto={viendoTonos}
              alCerrar={() => setViendoTonos(false)}
              nombre={producto.nombre}
              tipo={tipo}
              url={producto.muestrario_url}
              ayuda="Cerrá y tocá el número que vendiste."
            />
          )}
          <div className={estilos.tonos}>
            {variantes.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={variante?.id === v.id}
                className={variante?.id === v.id ? estilos.tonoElegido : estilos.tono}
                onClick={() => setVariante(v)}
              >
                {v.nombre}
                {v.stock !== null && <small>quedan {v.stock}</small>}
              </button>
            ))}
          </div>
        </>
      )}
      {!conTonos && variante?.stock != null && <p className={estilos.suave}>Quedan {variante.stock}</p>}

      <div className={estilos.dosColumnas}>
        <div className={estilos.campo}>
          Cantidad
          <div className={estilos.stockCampo}>
            <button
              type="button"
              aria-label="Uno menos"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              aria-label="Cantidad"
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Math.round(Number(e.target.value) || 1)))}
            />
            <button type="button" aria-label="Uno más" onClick={() => setCantidad((c) => c + 1)}>
              +
            </button>
          </div>
        </div>
        <label className={estilos.campo}>
          Precio por unidad
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={precio}
            onChange={(e) => setPrecio(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          />
        </label>
      </div>

      <label className={estilos.campo}>
        Nota (opcional)
        <input
          type="text"
          placeholder="Por ejemplo: a quién, o si quedó debiendo"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </label>

      {variante && variante.stock !== null && cantidad > variante.stock && (
        <p className={estilos.aviso}>
          Según la web quedaban {variante.stock}. Se anota igual y el stock queda en 0.
        </p>
      )}
      {error && (
        <p className={estilos.error} role="alert">
          {error}
        </p>
      )}

      <div className={estilos.acciones}>
        <button type="submit" className="boton boton-principal" disabled={guardando}>
          {guardando ? 'Anotando…' : `Anotar · ${pesos(cantidad * precio)}`}
        </button>
        <button type="button" className={estilos.enlace} onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function AnotadasHoy({
  hoy,
  usuario,
  alDeshacer,
}: {
  hoy: Carga<Venta[]>
  usuario?: string
  alDeshacer: (v: Venta) => void
}) {
  if (hoy.estado !== 'listo') return null
  const { unidades, total } = resumir(hoy.datos)
  return (
    <section>
      <h2 className={estilos.subtitulo}>Anotadas hoy</h2>
      {hoy.datos.length === 0 ? (
        <p className={estilos.suave}>Todavía nada.</p>
      ) : (
        <>
          <p className={estilos.suave}>
            {unidades} {unidades === 1 ? 'unidad' : 'unidades'} · {pesos(total)}
          </p>
          <ul className={estilos.lista}>
            {hoy.datos.map((v) => (
              <li key={v.id} className={estilos.filaVenta}>
                <span>
                  {v.cantidad} × {nombreVendido(v)}
                  <span className={estilos.suave}>
                    {' '}
                    ·{' '}
                    {new Date(v.fecha).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                    {v.nota && ` · ${v.nota}`}
                  </span>
                </span>
                <strong>{pesos(totalVenta(v))}</strong>
                {(!usuario || v.vendedor === usuario) && (
                  <button type="button" className={estilos.enlace} onClick={() => alDeshacer(v)}>
                    Deshacer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Miniatura({ url }: { url: string | null }) {
  return (
    <span className={estilos.miniatura}>
      {url ? <img src={url} alt="" loading="lazy" /> : <span aria-hidden="true">sin foto</span>}
    </span>
  )
}
