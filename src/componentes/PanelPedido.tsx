import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { enlaces, formasDeEnvio, transferencia } from '../config'
import { armarMensaje, claveItem, pesos, totalPedido } from '../pedido/pedido'
import { usePedido } from '../pedido/PedidoContext'
import { rutaProducto } from '../pedido/useAgregar'
import { IconoWhatsApp } from './IconoWhatsApp'
import estilos from './PanelPedido.module.css'

export function PanelPedido() {
  const { pedido, despachar, abierto, setAbierto } = usePedido()
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  const vacio = pedido.items.length === 0
  const total = totalPedido(pedido.items)

  return (
    <dialog
      ref={dialogo}
      className={estilos.panel}
      aria-labelledby="titulo-pedido"
      onClose={() => setAbierto(false)}
      onClick={(e) => e.target === e.currentTarget && setAbierto(false)}
    >
      <div className={estilos.contenido}>
        <header className={estilos.cabecera}>
          <h2 id="titulo-pedido">Mi pedido</h2>
          <button
            type="button"
            className={estilos.cerrar}
            onClick={() => setAbierto(false)}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        {vacio ? (
          <div className={estilos.vacio}>
            <p>Todavía no agregaste productos.</p>
            <Link to="/catalogo" className="boton boton-principal" onClick={() => setAbierto(false)}>
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <ul className={estilos.items}>
              {pedido.items.map((item) => {
                const clave = claveItem(item)
                return (
                  <li key={clave} className={estilos.item}>
                    <div>
                      <p className={estilos.nombre}>
                        <Link
                          to={rutaProducto(item.productoId, item.variante)}
                          onClick={() => setAbierto(false)}
                        >
                          {item.nombre}
                          {item.variante && <span className={estilos.variante}> {item.variante}</span>}
                        </Link>
                      </p>
                      <p className={estilos.subtotal}>{pesos(item.precio * item.cantidad)}</p>
                    </div>
                    <div className={estilos.cantidad} role="group" aria-label={`Cantidad de ${item.nombre}`}>
                      <button
                        type="button"
                        aria-label="Uno menos"
                        onClick={() =>
                          despachar({ tipo: 'cambiarCantidad', clave, cantidad: item.cantidad - 1 })
                        }
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.cantidad}</span>
                      <button
                        type="button"
                        aria-label="Uno más"
                        onClick={() =>
                          despachar({ tipo: 'cambiarCantidad', clave, cantidad: item.cantidad + 1 })
                        }
                      >
                        +
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            <p className={estilos.total}>
              <span>
                Total <span className={estilos.sinEnvio}>(sin envío)</span>
              </span>
              <strong>{pesos(total)}</strong>
            </p>

            <div className={estilos.campos}>
              <label>
                Tu nombre
                <input
                  type="text"
                  autoComplete="name"
                  value={pedido.cliente.nombre}
                  onChange={(e) => despachar({ tipo: 'cliente', cliente: { nombre: e.target.value } })}
                />
              </label>
              <label>
                Barrio o localidad
                <input
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Ej: Palermo, Caballito, La Plata"
                  value={pedido.cliente.zona}
                  onChange={(e) => despachar({ tipo: 'cliente', cliente: { zona: e.target.value } })}
                />
              </label>
              <fieldset className={estilos.envios}>
                <legend>Envío</legend>
                {formasDeEnvio.map((f) => (
                  <label key={f.id} className={estilos.opcion}>
                    <input
                      type="radio"
                      name="envio"
                      value={f.id}
                      checked={pedido.cliente.envio === f.id}
                      onChange={() => despachar({ tipo: 'cliente', cliente: { envio: f.id } })}
                    />
                    <span>
                      {f.nombre}
                      <span className={estilos.detalleOpcion}>{f.detalle}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>

            <a
              className={`boton boton-principal ${estilos.enviar}`}
              href={enlaces.whatsapp(armarMensaje(pedido))}
              target="_blank"
              rel="noreferrer"
            >
              <IconoWhatsApp /> Enviar pedido por WhatsApp
            </a>
            <p className={estilos.aclaracion}>
              Se abre WhatsApp con el pedido escrito. Te confirmamos disponibilidad y el costo del envío, que
              corre por tu cuenta o lo coordinamos. Pagás por transferencia al alias{' '}
              <strong>{transferencia.alias}</strong> ({transferencia.titular}).
            </p>
            <button type="button" className={estilos.vaciar} onClick={() => despachar({ tipo: 'vaciar' })}>
              Vaciar pedido
            </button>
          </>
        )}
      </div>
    </dialog>
  )
}
