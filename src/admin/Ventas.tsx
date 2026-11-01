import type { SupabaseClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { Link } from 'react-router'
import { pesos } from '../pedido/pedido'
import estilos from './admin.module.css'
import { useCarga } from './useCarga'
import {
  anularVenta,
  inicioDelDia,
  listarVentas,
  nombreVendido,
  porDia,
  porProducto,
  resumir,
  totalVenta,
  ventasACsv,
  type Venta,
} from './ventas'

const periodos = [
  { nombre: 'Últimos 7 días', dias: 6 },
  { nombre: 'Últimos 30 días', dias: 29 },
  { nombre: 'Todo', dias: null },
] as const

/** Ventas anotadas: totales, lo que más se vende y el detalle por día. */
export function Ventas({ sb }: { sb: SupabaseClient }) {
  // Se traen todas y se filtra acá: son pocas y así cambiar de período es instantáneo.
  const [carga, recargar] = useCarga(() => listarVentas(sb))
  const [periodo, setPeriodo] = useState(0)
  const [error, setError] = useState('')

  if (carga.estado === 'cargando') return <p>Cargando ventas…</p>
  if (carga.estado === 'error') return <p className={estilos.error}>{carga.mensaje}</p>

  const dias = periodos[periodo].dias
  const desde = dias === null ? null : inicioDelDia(dias).toISOString()
  const ventas = desde ? carga.datos.filter((v) => v.fecha >= desde) : carga.datos
  const { unidades, total } = resumir(ventas)

  function bajar() {
    const url = URL.createObjectURL(new Blob([ventasACsv(ventas)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `ventas-luma-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function anular(v: Venta) {
    if (!window.confirm(`¿Anular ${v.cantidad} × ${nombreVendido(v)}? El stock vuelve a sumarse.`)) return
    setError('')
    try {
      await anularVenta(sb, v.id)
      recargar()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <div className={estilos.titulo}>
        <h1>Ventas</h1>
        <Link to="/admin/venta" className="boton boton-principal">
          + Anotar venta
        </Link>
      </div>

      <div className={estilos.enLinea}>
        <select aria-label="Período" value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))}>
          {periodos.map((p, i) => (
            <option key={p.nombre} value={i}>
              {p.nombre}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="boton boton-borde boton-chico"
          onClick={bajar}
          disabled={!ventas.length}
        >
          Bajar CSV
        </button>
      </div>

      <ul className={estilos.resumen}>
        <li>{pesos(total)}</li>
        <li>
          {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
        </li>
        <li>
          {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}
        </li>
      </ul>

      {error && (
        <p className={estilos.error} role="alert">
          {error}
        </p>
      )}

      {ventas.length === 0 ? (
        <p className={estilos.suave}>No hay ventas anotadas en este período.</p>
      ) : (
        <>
          <h2 className={estilos.subtitulo}>Lo que más se vendió</h2>
          <table className={estilos.tabla}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidades</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {porProducto(ventas).map((f) => (
                <tr key={f.producto}>
                  <td>{f.producto}</td>
                  <td>{f.unidades}</td>
                  <td>{pesos(f.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className={estilos.subtitulo}>Detalle</h2>
          {porDia(ventas).map(({ dia, ventas: delDia }) => (
            <section key={dia.getTime()}>
              <h3 className={estilos.dia}>
                {dia.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                <span className={estilos.suave}> · {pesos(resumir(delDia).total)}</span>
              </h3>
              <ul className={estilos.lista}>
                {delDia.map((v) => (
                  <li key={v.id} className={estilos.filaVenta}>
                    <span>
                      {v.cantidad} × {nombreVendido(v)}
                      <span className={estilos.suave}>
                        {' '}
                        ·{' '}
                        {new Date(v.fecha).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {v.vendedor_nombre && ` · ${v.vendedor_nombre}`}
                        {v.precio_unitario !== 0 && v.cantidad > 1 && ` · ${pesos(v.precio_unitario)} c/u`}
                        {v.nota && ` · ${v.nota}`}
                      </span>
                    </span>
                    <strong>{pesos(totalVenta(v))}</strong>
                    <button type="button" className={estilos.enlace} onClick={() => anular(v)}>
                      Anular
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  )
}
