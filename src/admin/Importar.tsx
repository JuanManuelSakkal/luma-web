import type { SupabaseClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { Link } from 'react-router'
import { leerCsv, type LecturaCsv } from '../catalogo/importar'
import { aplicarImportacion, listarCategorias, listarProductos } from './api'
import estilos from './admin.module.css'
import { exportarCsv, planificarImportacion, type PlanImportacion } from './cambios'

type Paso =
  | { paso: 'elegir' }
  | { paso: 'errores'; archivo: string; errores: string[] }
  | { paso: 'revisar'; archivo: string; lectura: LecturaCsv; plan: PlanImportacion }
  | { paso: 'aplicando'; hechos: number; total: number }
  | { paso: 'listo'; resumen: string }

export function Importar({ sb }: { sb: SupabaseClient }) {
  const [paso, setPaso] = useState<Paso>({ paso: 'elegir' })
  const [ocultarFaltantes, setOcultarFaltantes] = useState(false)
  const [error, setError] = useState('')
  const [bajando, setBajando] = useState(false)

  async function elegir(archivo: File | undefined) {
    if (!archivo) return
    setError('')
    try {
      const lectura = leerCsv(await archivo.text())
      if (lectura.errores.length)
        return setPaso({ paso: 'errores', archivo: archivo.name, errores: lectura.errores })
      if (lectura.productos.length === 0)
        return setPaso({
          paso: 'errores',
          archivo: archivo.name,
          errores: ['El archivo no tiene productos.'],
        })
      const [productos, categorias] = await Promise.all([listarProductos(sb), listarCategorias(sb)])
      setOcultarFaltantes(false)
      setPaso({
        paso: 'revisar',
        archivo: archivo.name,
        lectura,
        plan: planificarImportacion(lectura, productos, categorias),
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function aplicar(plan: PlanImportacion) {
    setError('')
    setPaso({ paso: 'aplicando', hechos: 0, total: plan.nuevos.length + plan.modificados.length })
    try {
      await aplicarImportacion(sb, plan, {
        ocultarFaltantes,
        alAvanzar: (hechos, total) => setPaso({ paso: 'aplicando', hechos, total }),
      })
      const partes = [
        plan.nuevos.length && `${plan.nuevos.length} productos nuevos`,
        plan.modificados.length && `${plan.modificados.length} actualizados`,
        ocultarFaltantes && plan.faltantes.length && `${plan.faltantes.length} ocultos`,
      ].filter(Boolean)
      setPaso({
        paso: 'listo',
        resumen: partes.length ? partes.join(', ') + '.' : 'No había nada para cambiar.',
      })
    } catch (e) {
      setError(
        `${(e as Error).message}. Lo que ya se guardó queda guardado; podés volver a subir el mismo archivo.`,
      )
      setPaso({ paso: 'elegir' })
    }
  }

  async function bajar() {
    setBajando(true)
    setError('')
    try {
      const [productos, categorias] = await Promise.all([listarProductos(sb), listarCategorias(sb)])
      const url = URL.createObjectURL(
        new Blob([exportarCsv(productos, categorias)], { type: 'text/csv;charset=utf-8' }),
      )
      const a = document.createElement('a')
      a.href = url
      a.download = `catalogo-mond-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBajando(false)
    }
  }

  return (
    <>
      <h1>Subir y bajar CSV</h1>
      {error && (
        <p className={estilos.error} role="alert">
          {error}
        </p>
      )}

      <section className={estilos.bloque}>
        <h2>Bajar el catálogo</h2>
        <p>Baja todos los productos en un CSV que se abre en Excel. Lo podés editar y volver a subir acá.</p>
        <button type="button" className="boton boton-borde" onClick={bajar} disabled={bajando}>
          {bajando ? 'Preparando…' : 'Bajar CSV'}
        </button>
      </section>

      <section className={estilos.bloque}>
        <h2>Subir un CSV</h2>
        <p className={estilos.suave}>
          Sirve el CSV que bajás de acá (una fila por tono, con stock) o la lista de precios de lanzamiento
          (Categoría, Producto, Precio). Antes de guardar vas a ver qué cambia. Una descripción vacía en el
          CSV no borra la que ya estaba cargada.
        </p>

        {(paso.paso === 'elegir' || paso.paso === 'errores' || paso.paso === 'listo') && (
          <label className="boton boton-principal">
            Elegir archivo CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="solo-lectores"
              onChange={(e) => {
                elegir(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        )}

        {paso.paso === 'errores' && (
          <div className={estilos.aviso} role="alert">
            <p>
              <strong>{paso.archivo}</strong> tiene errores. Corregilos en el archivo y volvé a subirlo; no se
              guardó nada.
            </p>
            <ul>
              {paso.errores.slice(0, 30).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            {paso.errores.length > 30 && <p>…y {paso.errores.length - 30} más.</p>}
          </div>
        )}

        {paso.paso === 'revisar' && (
          <Revision
            archivo={paso.archivo}
            lectura={paso.lectura}
            plan={paso.plan}
            ocultarFaltantes={ocultarFaltantes}
            setOcultarFaltantes={setOcultarFaltantes}
            aplicar={() => aplicar(paso.plan)}
            cancelar={() => setPaso({ paso: 'elegir' })}
          />
        )}

        {paso.paso === 'aplicando' && (
          <p role="status">
            Guardando… {paso.hechos} de {paso.total}
            <progress value={paso.hechos} max={paso.total || 1} className={estilos.progreso} />
          </p>
        )}

        {paso.paso === 'listo' && (
          <p className={estilos.ok} role="status">
            Listo: {paso.resumen} <Link to="/admin">Ver productos</Link>
          </p>
        )}
      </section>
    </>
  )
}

function Revision({
  archivo,
  lectura,
  plan,
  ocultarFaltantes,
  setOcultarFaltantes,
  aplicar,
  cancelar,
}: {
  archivo: string
  lectura: LecturaCsv
  plan: PlanImportacion
  ocultarFaltantes: boolean
  setOcultarFaltantes: (v: boolean) => void
  aplicar: () => void
  cancelar: () => void
}) {
  const hayCambios =
    plan.nuevos.length + plan.modificados.length > 0 || (ocultarFaltantes && plan.faltantes.length > 0)

  return (
    <div className={estilos.revision}>
      <p>
        <strong>{archivo}</strong>: {lectura.productos.length} productos.{' '}
        {!lectura.conStock && 'Este archivo no trae stock: se mantiene el que ya había.'}
      </p>
      <ul className={estilos.resumen}>
        <li>
          <strong>{plan.nuevos.length}</strong> nuevos
        </li>
        <li>
          <strong>{plan.modificados.length}</strong> con cambios
        </li>
        <li>
          <strong>{plan.sinCambios}</strong> sin cambios
        </li>
        <li>
          <strong>{plan.faltantes.length}</strong> que no están en el archivo
        </li>
      </ul>
      {plan.categoriasNuevas.length > 0 && <p>Categorías nuevas: {plan.categoriasNuevas.join(', ')}.</p>}

      {plan.nuevos.length > 0 && (
        <details open={plan.nuevos.length <= 15}>
          <summary>Productos nuevos ({plan.nuevos.length})</summary>
          <ul>
            {plan.nuevos.map((n) => (
              <li key={n.slug}>
                {n.nombre} <span className={estilos.suave}>· {n.detalle}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {plan.modificados.length > 0 && (
        <details open>
          <summary>Cambios ({plan.modificados.length})</summary>
          <ul>
            {plan.modificados.map((m) => (
              <li key={m.slug}>
                <strong>{m.nombre}</strong>
                <ul>
                  {m.cambios.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      )}

      {plan.faltantes.length > 0 && (
        <div className={estilos.aviso}>
          <p>Estos productos están en la web pero no en el archivo:</p>
          <ul>
            {plan.faltantes.map((f) => (
              <li key={f.slug}>{f.nombre}</li>
            ))}
          </ul>
          <label className={estilos.check}>
            <input
              type="checkbox"
              checked={ocultarFaltantes}
              onChange={(e) => setOcultarFaltantes(e.target.checked)}
            />
            Ocultarlos de la web (no se borran)
          </label>
        </div>
      )}

      <div className={estilos.acciones}>
        <button type="button" className="boton boton-principal" onClick={aplicar} disabled={!hayCambios}>
          {hayCambios ? 'Aplicar cambios' : 'No hay nada para cambiar'}
        </button>
        <button type="button" className="boton boton-borde" onClick={cancelar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
