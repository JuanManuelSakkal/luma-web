import { useId, useState } from 'react'
import { Link } from 'react-router'
import type { Producto } from '../catalogo/tipos'
import { pesos } from '../pedido/pedido'
import { revelar } from '../lib/revelar'
import { rutaProducto, textoDisponibilidad, useAgregar } from '../pedido/useAgregar'
import { IconoLuma } from './IconoLuma'
import { Muestrario } from './Muestrario'
import estilos from './TarjetaProducto.module.css'

export function TarjetaProducto({ producto }: { producto: Producto }) {
  const idSelector = useId()
  const { variante, setVariante, tieneVariantes, disponibilidad, sinStock, plural, agregado, agregar } =
    useAgregar(producto)
  const [viendoMuestrario, setViendoMuestrario] = useState(false)
  // La foto y el nombre llevan a la página del producto, con el tono que estaba elegido.
  const ruta = rutaProducto(producto.id, tieneVariantes ? variante : undefined)

  return (
    <article ref={revelar} className={estilos.tarjeta}>
      <Link to={ruta} className={estilos.imagen} tabIndex={-1} aria-hidden="true">
        {producto.imagenUrl ? (
          <img src={producto.imagenUrl} alt="" loading="lazy" width={400} height={400} />
        ) : (
          <IconoLuma className={estilos.placeholder} titulo="" />
        )}
        {disponibilidad !== 'disponible' && (
          <span className={`${estilos.etiqueta} ${estilos[disponibilidad]}`}>
            {textoDisponibilidad[disponibilidad]}
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

        {tieneVariantes && (
          <div className={estilos.selector}>
            <div className={estilos.etiquetaSelector}>
              <label htmlFor={idSelector}>{producto.tipoVariante ?? 'Opción'}</label>
              {producto.muestrarioUrl && (
                <button type="button" className={estilos.verTonos} onClick={() => setViendoMuestrario(true)}>
                  Ver {plural}
                </button>
              )}
            </div>
            <select id={idSelector} value={variante} onChange={(e) => setVariante(e.target.value)}>
              {producto.variantes.map((v) => (
                <option key={v.nombre} value={v.nombre} disabled={v.disponibilidad === 'sin-stock'}>
                  {v.nombre}
                  {v.disponibilidad === 'sin-stock' ? ' (sin stock)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          className={`boton boton-principal ${estilos.agregar}`}
          onClick={() => agregar()}
          disabled={sinStock}
        >
          {sinStock ? 'Sin stock' : agregado ? 'Agregado ✓' : 'Agregar'}
        </button>
        {producto.muestrarioUrl && (
          <Muestrario
            abierto={viendoMuestrario}
            alCerrar={() => setViendoMuestrario(false)}
            nombre={producto.nombre}
            tipo={plural}
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
