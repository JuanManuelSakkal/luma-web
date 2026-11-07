import { useId, useState } from 'react'
import { Link } from 'react-router'
import { fotoDe, textoBotonMuestrario, valor1Disponible, valores1 } from '../catalogo/opciones'
import type { Producto } from '../catalogo/tipos'
import { pesos } from '../pedido/pedido'
import { revelar } from '../lib/revelar'
import { rutaProducto, textoDisponibilidad, useAgregar } from '../pedido/useAgregar'
import { IconoLuma } from './IconoLuma'
import { Muestrario } from './Muestrario'
import estilos from './TarjetaProducto.module.css'

export function TarjetaProducto({ producto }: { producto: Producto }) {
  const idSelector = useId()
  const {
    variante,
    valor1,
    setValor1,
    dosOpciones,
    tieneVariantes,
    disponibilidad,
    sinStock,
    stock,
    todoEnPedido,
    plural,
    agregado,
    agregar,
  } = useAgregar(producto)
  const [viendoMuestrario, setViendoMuestrario] = useState(false)
  // La foto y el nombre llevan a la página del producto, con la variante que estaba elegida.
  const ruta = rutaProducto(producto.id, tieneVariantes ? variante : undefined)
  // La foto sigue al color elegido en el desplegable, si ese color tiene foto propia.
  const foto = fotoDe(producto, valor1)

  return (
    <article ref={revelar} className={estilos.tarjeta}>
      <Link to={ruta} className={estilos.imagen} tabIndex={-1} aria-hidden="true">
        {foto ? (
          <img src={foto} alt="" loading="lazy" width={400} height={400} />
        ) : (
          <IconoLuma className={estilos.placeholder} titulo="" />
        )}
        {disponibilidad !== 'disponible' && (
          <span className={`${estilos.etiqueta} ${estilos[disponibilidad]}`}>
            {disponibilidad === 'pocas' && Number.isFinite(stock)
              ? stock === 1
                ? 'Última unidad'
                : `Últimas ${stock}`
              : textoDisponibilidad[disponibilidad]}
          </span>
        )}
      </Link>
      <div className={estilos.cuerpo}>
        <p className={estilos.categoria}>{producto.subcategoria ?? producto.categoria}</p>
        <h3 className={estilos.nombre}>
          <Link to={ruta}>{producto.nombre}</Link>
        </h3>
        {producto.nota && <p className={estilos.nota}>{producto.nota}</p>}
        <p className={estilos.precio}>{pesos(producto.precio)}</p>

        {tieneVariantes && !dosOpciones && (
          <div className={estilos.selector}>
            <div className={estilos.etiquetaSelector}>
              <label htmlFor={idSelector}>{producto.tipoVariante ?? 'Opción'}</label>
              {producto.muestrarioUrl && (
                <button type="button" className={estilos.verTonos} onClick={() => setViendoMuestrario(true)}>
                  {producto.muestrarioTitulo ? textoBotonMuestrario(producto, plural) : `Ver ${plural}`}
                </button>
              )}
            </div>
            <select id={idSelector} value={valor1} onChange={(e) => setValor1(e.target.value)}>
              {valores1(producto).map((v) => (
                <option key={v} value={v} disabled={!valor1Disponible(producto, v)}>
                  {v}
                  {valor1Disponible(producto, v) ? '' : ' (sin stock)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Con dos opciones (color y talle) se elige en la página del producto, donde entran cómodas. */}
        {dosOpciones ? (
          <Link to={ruta} className={`boton boton-principal ${estilos.agregar}`}>
            Elegir {(producto.tipoVariante2 ?? 'opción').toLowerCase()}
          </Link>
        ) : (
          <button
            type="button"
            className={`boton boton-principal ${estilos.agregar}`}
            onClick={() => agregar()}
            disabled={sinStock || todoEnPedido}
          >
            {sinStock
              ? 'Sin stock'
              : agregado
                ? 'Agregado ✓'
                : todoEnPedido
                  ? 'Ya está en tu pedido'
                  : 'Agregar'}
          </button>
        )}
        {producto.muestrarioUrl && (
          <Muestrario
            abierto={viendoMuestrario}
            alCerrar={() => setViendoMuestrario(false)}
            nombre={producto.nombre}
            tipo={plural}
            titulo={producto.muestrarioTitulo}
            url={producto.muestrarioUrl}
          />
        )}
        <span className="solo-lectores" aria-live="polite">
          {agregado ? `${producto.nombre} agregado al pedido` : ''}
        </span>
      </div>
    </article>
  )
}
