import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useCatalogo } from '../catalogo/CatalogoContext'
import type { Producto as TipoProducto } from '../catalogo/tipos'
import { Carrusel } from '../componentes/Carrusel'
import { Descripcion } from '../componentes/Descripcion'
import { IconoLuma } from '../componentes/IconoLuma'
import { IconoWhatsApp } from '../componentes/IconoWhatsApp'
import { Muestrario } from '../componentes/Muestrario'
import { TarjetaProducto } from '../componentes/TarjetaProducto'
import { diasParaCambios, enlaces, origenSitio } from '../config'
import { pesos } from '../pedido/pedido'
import { usePedido } from '../pedido/PedidoContext'
import { rutaProducto, textoDisponibilidad, useAgregar } from '../pedido/useAgregar'
import estilos from './Producto.module.css'

/** Con más variantes que esto, una lista desplegable es más cómoda que los botones. */
const MAX_BOTONES_TONO = 24
const MAX_RELACIONADOS = 8

export function Producto() {
  const { id } = useParams()
  const catalogo = useCatalogo()

  if (catalogo.estado === 'cargando') return <Esqueleto />
  if (catalogo.estado === 'error') {
    return (
      <div className={`contenedor ${estilos.pagina}`}>
        <p>No pudimos cargar el producto. Probá de nuevo en un rato.</p>
      </div>
    )
  }

  const { productos } = catalogo.catalogo
  const producto = productos.find((p) => p.id === id)
  if (!producto) {
    return (
      <div className={`contenedor ${estilos.pagina}`}>
        <h1>Este producto ya no está en el catálogo</h1>
        <p>Puede que haya cambiado de nombre o que ya no lo tengamos.</p>
        <Link to="/catalogo" className="boton boton-principal">
          Ver el catálogo
        </Link>
      </div>
    )
  }

  const relacionados = productos
    .filter((p) => p.categoria === producto.categoria && p.id !== producto.id)
    .slice(0, MAX_RELACIONADOS)

  // La key reinicia el tono y la cantidad al pasar de un producto a otro desde el carrusel.
  return <Ficha key={producto.id} producto={producto} relacionados={relacionados} />
}

function Ficha({ producto, relacionados }: { producto: TipoProducto; relacionados: TipoProducto[] }) {
  const [parametros, setParametros] = useSearchParams()
  const { variante, setVariante, tieneVariantes, disponibilidad, sinStock, plural, agregado, agregar } =
    useAgregar(producto, parametros.get('opcion') ?? undefined)
  const { setAbierto } = usePedido()
  const [cantidad, setCantidad] = useState(1)
  const [fotoGrande, setFotoGrande] = useState(false)
  const [viendoMuestrario, setViendoMuestrario] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const tipo = producto.tipoVariante ?? 'Color'
  const enlace = `${origenSitio()}${rutaProducto(producto.id)}`

  useEffect(() => {
    document.title = `${producto.nombre} · Luma`
  }, [producto.nombre])

  useEffect(() => {
    if (!copiado) return
    const t = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(t)
  }, [copiado])

  function elegir(nombre: string) {
    setVariante(nombre)
    // La variante queda en la dirección, así el link compartido abre con esa variante.
    const nuevos = new URLSearchParams(parametros)
    nuevos.set('opcion', nombre)
    setParametros(nuevos, { replace: true, preventScrollReset: true })
  }

  async function compartir() {
    const url = `${origenSitio()}${rutaProducto(producto.id, tieneVariantes ? variante : undefined)}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${producto.nombre} · Luma`, url })
      } catch {
        // La persona cerró el menú de compartir.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
    } catch {
      window.prompt('Copiá el link:', url)
    }
  }

  const nombreConTono = tieneVariantes && variante ? `${producto.nombre} ${variante}` : producto.nombre
  const consulta = sinStock
    ? `¡Hola Luma! Avisame cuando vuelva a entrar ${nombreConTono}. ${enlace}`
    : `¡Hola Luma! Tengo una consulta sobre ${nombreConTono}. ${enlace}`

  return (
    <div className={`contenedor ${estilos.pagina}`}>
      <Volver />

      <div className={estilos.ficha}>
        <div className={estilos.columnaFoto}>
          {producto.imagenUrl ? (
            <button
              type="button"
              className={estilos.foto}
              onClick={() => setFotoGrande(true)}
              aria-label={`Ver la foto de ${producto.nombre} en grande`}
            >
              <img src={producto.imagenUrl} alt={producto.nombre} width={1000} height={1000} />
              <Etiqueta disponibilidad={disponibilidad} />
            </button>
          ) : (
            <div className={estilos.foto}>
              <IconoLuma className={estilos.placeholder} titulo="" />
              <Etiqueta disponibilidad={disponibilidad} />
            </div>
          )}
        </div>

        <div className={estilos.datos}>
          <p className={estilos.categoria}>
            <Link to={`/catalogo?categoria=${encodeURIComponent(producto.categoria)}`}>
              {producto.categoria}
            </Link>
            {producto.subcategoria && (
              <>
                {' · '}
                <Link
                  to={`/catalogo?categoria=${encodeURIComponent(producto.categoria)}&sub=${encodeURIComponent(producto.subcategoria)}`}
                >
                  {producto.subcategoria}
                </Link>
              </>
            )}
          </p>
          <h1 className={estilos.nombre}>{producto.nombre}</h1>
          {producto.nota && <p className={estilos.nota}>{producto.nota}</p>}
          <p className={estilos.precio}>{pesos(producto.precio)}</p>

          {tieneVariantes && (
            <fieldset className={estilos.tonos}>
              <legend>
                {tipo}
                {variante && <span className={estilos.elegido}>: {variante}</span>}
              </legend>
              {producto.variantes.length > MAX_BOTONES_TONO ? (
                <select
                  aria-label={tipo}
                  value={variante}
                  onChange={(e) => elegir(e.target.value)}
                  className={estilos.selector}
                >
                  {producto.variantes.map((v) => (
                    <option key={v.nombre} value={v.nombre} disabled={v.disponibilidad === 'sin-stock'}>
                      {v.nombre}
                      {v.disponibilidad === 'sin-stock' ? ' (sin stock)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={estilos.botonesTono}>
                  {producto.variantes.map((v) => (
                    <button
                      key={v.nombre}
                      type="button"
                      className={estilos.tono}
                      aria-pressed={v.nombre === variante}
                      disabled={v.disponibilidad === 'sin-stock'}
                      onClick={() => elegir(v.nombre)}
                    >
                      {v.nombre}
                      {v.disponibilidad === 'sin-stock' && (
                        <span className="solo-lectores"> (sin stock)</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {producto.muestrarioUrl && (
            <button type="button" className={estilos.verMuestrario} onClick={() => setViendoMuestrario(true)}>
              Ver el muestrario de {plural}
            </button>
          )}

          <div className={estilos.comprar}>
            <div className={estilos.cantidad} role="group" aria-label="Cantidad">
              <button
                type="button"
                aria-label="Uno menos"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                disabled={cantidad <= 1 || sinStock}
              >
                −
              </button>
              <span aria-live="polite">{cantidad}</span>
              <button
                type="button"
                aria-label="Uno más"
                onClick={() => setCantidad((c) => Math.min(99, c + 1))}
                disabled={sinStock}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className={`boton boton-principal ${estilos.agregar}`}
              onClick={() => agregar(cantidad)}
              disabled={sinStock}
            >
              {sinStock ? 'Sin stock' : agregado ? 'Agregado ✓' : 'Agregar al pedido'}
            </button>
          </div>
          <p className={estilos.avisoAgregado} aria-live="polite">
            {agregado && (
              <>
                {cantidad > 1 ? `${cantidad} × ` : ''}
                {nombreConTono} en tu pedido.{' '}
                <button type="button" className={estilos.enlace} onClick={() => setAbierto(true)}>
                  Ver mi pedido
                </button>
              </>
            )}
          </p>

          <div className={estilos.extras}>
            <a
              className="boton boton-borde boton-chico"
              href={enlaces.whatsapp(consulta)}
              target="_blank"
              rel="noreferrer"
            >
              <IconoWhatsApp /> {sinStock ? 'Avisame cuando llegue' : '¿Dudas? Escribinos'}
            </a>
            <button type="button" className="boton boton-borde boton-chico" onClick={compartir}>
              {copiado ? 'Link copiado ✓' : 'Compartir'}
            </button>
          </div>
          <ul className={estilos.garantias}>
            <li>Envío por moto en CABA o por Correo Argentino a todo el país</li>
            <li>Pagás por transferencia bancaria</li>
            <li>
              Cambios dentro de los {diasParaCambios} días.{' '}
              <Link to="/cambios-y-cuidados">Ver condiciones</Link>
            </li>
          </ul>
        </div>
      </div>

      <Descripcion texto={producto.descripcion} className={estilos.descripcion} />

      {relacionados.length > 0 && (
        <section className={estilos.relacionados} aria-labelledby="titulo-relacionados">
          <h2 id="titulo-relacionados">Más de {producto.categoria}</h2>
          <Carrusel etiqueta={`Más de ${producto.categoria}`}>
            {relacionados.map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
          </Carrusel>
        </section>
      )}

      {producto.muestrarioUrl && (
        <Muestrario
          abierto={viendoMuestrario}
          alCerrar={() => setViendoMuestrario(false)}
          nombre={producto.nombre}
          tipo={plural}
          url={producto.muestrarioUrl}
          ayuda="Cerrá y elegí el número en los botones."
        />
      )}
      {producto.imagenUrl && (
        <FotoGrande
          abierta={fotoGrande}
          alCerrar={() => setFotoGrande(false)}
          url={producto.imagenUrl}
          nombre={producto.nombre}
        />
      )}
    </div>
  )
}

function Etiqueta({ disponibilidad }: { disponibilidad: TipoProducto['disponibilidad'] }) {
  if (disponibilidad === 'disponible') return null
  return (
    <span className={`${estilos.etiqueta} ${estilos[disponibilidad]}`}>
      {textoDisponibilidad[disponibilidad]}
    </span>
  )
}

/** Vuelve a donde estaba (catálogo filtrado, portada) o, si entró por un link, al catálogo. */
function Volver() {
  const navegar = useNavigate()
  const { key } = useLocation()
  const vinoDeLaWeb = key !== 'default'

  return vinoDeLaWeb ? (
    <button type="button" className={estilos.volver} onClick={() => navegar(-1)}>
      ← Volver
    </button>
  ) : (
    <Link to="/catalogo" className={estilos.volver}>
      ← Ver el catálogo
    </Link>
  )
}

function FotoGrande({
  abierta,
  alCerrar,
  url,
  nombre,
}: {
  abierta: boolean
  alCerrar: () => void
  url: string
  nombre: string
}) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierta && !d.open) d.showModal()
    if (!abierta && d.open) d.close()
  }, [abierta])

  return (
    <dialog
      ref={dialogo}
      className={estilos.fotoGrande}
      aria-label={`Foto de ${nombre}`}
      onClose={alCerrar}
      onClick={alCerrar}
    >
      <button type="button" className={estilos.cerrar} onClick={alCerrar} aria-label="Cerrar">
        ×
      </button>
      {abierta && <img src={url} alt={nombre} />}
    </dialog>
  )
}

function Esqueleto() {
  return (
    <div className={`contenedor ${estilos.pagina}`} aria-busy="true">
      <span className={estilos.volver}>&nbsp;</span>
      <div className={estilos.ficha}>
        <div className={estilos.columnaFoto}>
          <div className={`${estilos.foto} ${estilos.gris}`} />
        </div>
        <div className={estilos.datos}>
          <p className={`${estilos.lineaGris} ${estilos.corta}`} />
          <p className={estilos.lineaGris} />
          <p className={`${estilos.lineaGris} ${estilos.corta}`} />
          <span className="solo-lectores">Cargando producto…</span>
        </div>
      </div>
    </div>
  )
}
