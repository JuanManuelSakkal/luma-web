import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { aSlug } from '../catalogo/importar'
import { Descripcion } from '../componentes/Descripcion'
import {
  borrarProducto,
  crearCategoria,
  guardarProducto,
  listarCategorias,
  listarProductos,
  subirFoto,
} from './api'
import estilos from './admin.module.css'
import { pluralVariante } from '../pedido/useAgregar'
import {
  UNICA,
  tieneVariantes,
  type Categoria,
  type ProductoAdmin,
  type TipoVariante,
  type VarianteAdmin,
} from './tipos'
import { useCarga } from './useCarga'

const productoNuevo = (): ProductoAdmin => ({
  slug: '',
  nombre: '',
  categoria_id: null,
  subcategoria: null,
  descripcion: null,
  nota: null,
  tipo_variante: null,
  precio: 0,
  destacado: false,
  activo: true,
  imagen_url: null,
  muestrario_url: null,
  variantes: [{ nombre: UNICA, stock: null, activo: true, orden: 0 }],
})

export function EditarProducto({ sb }: { sb: SupabaseClient }) {
  const { slug } = useParams()
  const [carga, recargar] = useCarga(() => Promise.all([listarProductos(sb), listarCategorias(sb)]))

  if (carga.estado === 'cargando') return <p>Cargando…</p>
  if (carga.estado === 'error') return <p className={estilos.error}>{carga.mensaje}</p>

  const [productos, categorias] = carga.datos
  const existente = slug ? productos.find((p) => p.slug === slug) : undefined
  if (slug && !existente) {
    return (
      <p>
        No existe ese producto. <Link to="/admin">Volver a la lista</Link>
      </p>
    )
  }
  return (
    <Formulario
      key={existente?.id ?? 'nuevo'}
      sb={sb}
      inicial={existente ?? productoNuevo()}
      productos={productos}
      categorias={categorias}
      alGuardar={recargar}
    />
  )
}

function Formulario({
  sb,
  inicial,
  productos,
  categorias: categoriasIniciales,
  alGuardar,
}: {
  sb: SupabaseClient
  inicial: ProductoAdmin
  productos: ProductoAdmin[]
  categorias: Categoria[]
  alGuardar: () => void
}) {
  const navegar = useNavigate()
  const { state } = useLocation()
  const [p, setP] = useState<ProductoAdmin>(inicial)
  const [categorias, setCategorias] = useState(categoriasIniciales)
  const [conVariantes, setConVariantes] = useState(tieneVariantes(inicial))
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [variasVariantes, setVariasVariantes] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const esNuevo = !inicial.id

  // Si se llegó desde la lista, se vuelve atrás: la lista queda con sus filtros y en el mismo lugar.
  const vieneDeLaLista = (state as { desdeLista?: boolean } | null)?.desdeLista === true
  function volverALista() {
    if (vieneDeLaLista) navegar(-1)
    else navegar('/admin', { replace: true })
  }

  const cambiar = (cambios: Partial<ProductoAdmin>) => setP((actual) => ({ ...actual, ...cambios }))
  const cambiarVariante = (i: number, cambios: Partial<VarianteAdmin>) =>
    setP((actual) => ({
      ...actual,
      variantes: actual.variantes.map((v, j) => (j === i ? { ...v, ...cambios } : v)),
    }))

  function pasarAVariantes(si: boolean) {
    setConVariantes(si)
    if (si) {
      cambiar({
        tipo_variante: p.tipo_variante ?? 'Color',
        variantes: p.variantes.filter((v) => v.nombre !== UNICA),
      })
    } else {
      const stock = p.variantes.every((v) => v.stock === null)
        ? null
        : p.variantes.reduce((t, v) => t + (v.stock ?? 0), 0)
      cambiar({ tipo_variante: null, variantes: [{ nombre: UNICA, stock, activo: true, orden: 0 }] })
    }
  }

  function agregarVariantes(texto: string) {
    const nombres = texto
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !p.variantes.some((v) => v.nombre === t))
    if (!nombres.length) return
    cambiar({
      variantes: [
        ...p.variantes,
        ...nombres.map((nombre, i) => ({ nombre, stock: null, activo: true, orden: p.variantes.length + i })),
      ],
    })
    setVariasVariantes('')
  }

  async function agregarCategoria() {
    const nombre = nuevaCategoria.trim()
    if (!nombre) return
    try {
      const c = await crearCategoria(sb, nombre, categorias.length + 1)
      setCategorias([...categorias, c])
      cambiar({ categoria_id: c.id })
      setNuevaCategoria('')
    } catch (e) {
      setMensaje({ tipo: 'error', texto: (e as Error).message })
    }
  }

  async function elegirFoto(
    archivo: File | undefined,
    campo: 'imagen_url' | 'muestrario_url' = 'imagen_url',
  ) {
    if (!archivo) return
    const slug = p.slug || aSlug(p.nombre) || 'producto'
    const esMuestrario = campo === 'muestrario_url'
    setOcupado(true)
    setMensaje(null)
    try {
      // El muestrario se sube más grande para que se vean bien todas las variantes.
      const url = esMuestrario
        ? await subirFoto(sb, archivo, `${slug}-muestrario`, 2000)
        : await subirFoto(sb, archivo, slug)
      cambiar({ [campo]: url })
      setMensaje({
        tipo: 'ok',
        texto: `${esMuestrario ? 'Muestrario subido' : 'Foto subida'}. Guardá para que quede en el producto.`,
      })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: (e as Error).message })
    } finally {
      setOcupado(false)
    }
  }

  function validar(): string | null {
    if (!p.nombre.trim()) return 'Falta el nombre.'
    const slug = esNuevo ? aSlug(p.nombre) : p.slug
    if (!slug) return 'El nombre tiene que tener letras o números.'
    if (productos.some((x) => x.slug === slug && x.id !== p.id))
      return `Ya existe un producto llamado "${p.nombre}".`
    if (!p.categoria_id) return 'Elegí una categoría.'
    if (!Number.isInteger(p.precio) || p.precio <= 0)
      return 'El precio tiene que ser un número mayor a 0, sin centavos.'
    if (conVariantes && p.variantes.length === 0)
      return 'Agregá al menos una variante, o desmarcá "Tiene colores, medidas o modelos".'
    const nombres = p.variantes.map((v) => v.nombre.trim())
    if (nombres.some((n) => !n)) return 'Hay una variante sin nombre.'
    if (new Set(nombres).size !== nombres.length) return 'Hay variantes repetidas.'
    if (p.variantes.some((v) => v.stock !== null && (!Number.isInteger(v.stock) || v.stock < 0)))
      return 'El stock tiene que ser un número entero, o vacío para no controlarlo.'
    return null
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const error = validar()
    if (error) return setMensaje({ tipo: 'error', texto: error })
    setOcupado(true)
    setMensaje(null)
    try {
      const slug = esNuevo ? aSlug(p.nombre) : p.slug
      await guardarProducto(sb, { ...p, slug, variantes: p.variantes.map((v, orden) => ({ ...v, orden })) })
      setMensaje({ tipo: 'ok', texto: 'Guardado ✓' })
      alGuardar()
      volverALista()
    } catch (e) {
      setMensaje({ tipo: 'error', texto: (e as Error).message })
    } finally {
      setOcupado(false)
    }
  }

  async function borrar() {
    setConfirmandoBorrado(false)
    if (!p.id) return
    setOcupado(true)
    try {
      await borrarProducto(sb, p.id)
      volverALista()
    } catch (e) {
      setMensaje({ tipo: 'error', texto: (e as Error).message })
      setOcupado(false)
    }
  }

  const unica = p.variantes.find((v) => v.nombre === UNICA)

  return (
    <>
      <form onSubmit={guardar} className={estilos.formulario}>
        <p className={estilos.enLinea}>
          {vieneDeLaLista ? (
            <button type="button" className={estilos.enlace} onClick={() => navegar(-1)}>
              ← Productos
            </button>
          ) : (
            <Link to="/admin">← Productos</Link>
          )}
          {!esNuevo && inicial.activo && (
            <a
              href={`/catalogo/${inicial.slug}`}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: 'auto' }}
            >
              Ver en la web ↗
            </a>
          )}
        </p>
        <h1>{esNuevo ? 'Nuevo producto' : p.nombre || 'Producto'}</h1>

        <section className={estilos.bloque}>
          <label className={estilos.campo}>
            Nombre
            <input value={p.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} required />
          </label>
          {!esNuevo && <p className={estilos.suave}>Identificador: {p.slug}</p>}

          <div className={estilos.dosColumnas}>
            <label className={estilos.campo}>
              Categoría
              <select
                value={p.categoria_id ?? ''}
                onChange={(e) => cambiar({ categoria_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Elegir…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className={estilos.campo}>
              Precio (pesos)
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={p.precio || ''}
                onChange={(e) => cambiar({ precio: Math.round(Number(e.target.value)) })}
                required
              />
            </label>
          </div>
          <div className={estilos.enLinea}>
            <input
              placeholder="O crear una categoría nueva"
              aria-label="Nueva categoría"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
            />
            <button type="button" className="boton boton-borde boton-chico" onClick={agregarCategoria}>
              Crear
            </button>
          </div>

          <label className={estilos.campo}>
            Subcategoría (opcional)
            <input
              list="subcategorias-luma"
              value={p.subcategoria ?? ''}
              placeholder="Ej: Argollas, Cadenas, Esclavas"
              onChange={(e) => cambiar({ subcategoria: e.target.value })}
            />
            <datalist id="subcategorias-luma">
              {[...new Set(productos.map((x) => x.subcategoria).filter(Boolean))].map((s) => (
                <option key={s} value={s!} />
              ))}
            </datalist>
          </label>
          <label className={estilos.campo}>
            Nota corta (opcional, se ve en la tarjeta)
            <input
              value={p.nota ?? ''}
              placeholder="Ej: Acero quirúrgico"
              onChange={(e) => cambiar({ nota: e.target.value })}
            />
          </label>
          <label className={estilos.campo}>
            Descripción (opcional, se ve en la página del producto)
            <textarea
              rows={6}
              value={p.descripcion ?? ''}
              placeholder={
                'Ej: Argollas lisas, livianas y cómodas para todos los días.\n\n- Material: acero quirúrgico\n- Medida: 20 mm'
              }
              onChange={(e) => cambiar({ descripcion: e.target.value })}
            />
            <span className={estilos.suave}>
              Una línea en blanco empieza un párrafo nuevo. Las líneas que empiezan con &quot;- &quot; se ven
              como lista.
            </span>
          </label>
          {p.descripcion?.trim() && (
            <div className={estilos.vistaPrevia}>
              <span className={estilos.etiquetaVistaPrevia}>Así se ve en la web</span>
              <Descripcion texto={p.descripcion} />
            </div>
          )}
          <label className={estilos.check}>
            <input
              type="checkbox"
              checked={p.activo}
              onChange={(e) => cambiar({ activo: e.target.checked })}
            />
            Visible en la web
          </label>
          <label className={estilos.check}>
            <input
              type="checkbox"
              checked={p.destacado}
              onChange={(e) => cambiar({ destacado: e.target.checked })}
            />
            Destacado en la portada
          </label>
        </section>

        <section className={estilos.bloque}>
          <h2>Foto</h2>
          <div className={estilos.foto}>
            <span className={estilos.miniaturaGrande}>
              {p.imagen_url ? <img src={p.imagen_url} alt={`Foto de ${p.nombre}`} /> : 'Sin foto'}
            </span>
            <div>
              <label className="boton boton-borde boton-chico">
                {p.imagen_url ? 'Cambiar foto' : 'Subir foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="solo-lectores"
                  onChange={(e) => elegirFoto(e.target.files?.[0])}
                  disabled={ocupado}
                />
              </label>
              {p.imagen_url && (
                <button
                  type="button"
                  className={estilos.enlace}
                  onClick={() => cambiar({ imagen_url: null })}
                >
                  Quitar foto
                </button>
              )}
              <p className={estilos.suave}>Se achica sola. Mejor cuadrada y con fondo liso.</p>
            </div>
          </div>
        </section>

        <section className={estilos.bloque}>
          <h2>Stock</h2>
          <label className={estilos.check}>
            <input
              type="checkbox"
              checked={conVariantes}
              onChange={(e) => pasarAVariantes(e.target.checked)}
            />
            Tiene colores, medidas o modelos
          </label>

          {!conVariantes && unica && (
            <CampoStock
              valor={unica.stock}
              alCambiar={(stock) => cambiarVariante(p.variantes.indexOf(unica), { stock })}
            />
          )}

          {conVariantes && (
            <>
              <label className={estilos.campo}>
                Se llaman
                <select
                  value={p.tipo_variante ?? 'Color'}
                  onChange={(e) => cambiar({ tipo_variante: e.target.value as TipoVariante })}
                >
                  <option>Color</option>
                  <option>Medida</option>
                  <option>Modelo</option>
                </select>
              </label>
              <table className={estilos.tabla}>
                <thead>
                  <tr>
                    <th>{p.tipo_variante ?? 'Color'}</th>
                    <th>Stock</th>
                    <th>Visible</th>
                    <th>
                      <span className="solo-lectores">Quitar</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {p.variantes.map((v, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          aria-label="Nombre de la variante"
                          value={v.nombre}
                          onChange={(e) => cambiarVariante(i, { nombre: e.target.value })}
                        />
                      </td>
                      <td>
                        <CampoStock
                          valor={v.stock}
                          alCambiar={(stock) => cambiarVariante(i, { stock })}
                          compacto
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${v.nombre} visible`}
                          checked={v.activo}
                          onChange={(e) => cambiarVariante(i, { activo: e.target.checked })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={estilos.enlace}
                          aria-label={`Quitar ${v.nombre}`}
                          onClick={() => cambiar({ variantes: p.variantes.filter((_, j) => j !== i) })}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={estilos.enLinea}>
                <input
                  placeholder="Agregar: Dorado, Plateado  o  14, 16, 18"
                  aria-label="Agregar variantes separadas por coma"
                  value={variasVariantes}
                  onChange={(e) => setVariasVariantes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      agregarVariantes(variasVariantes)
                    }
                  }}
                />
                <button
                  type="button"
                  className="boton boton-borde boton-chico"
                  onClick={() => agregarVariantes(variasVariantes)}
                >
                  Agregar
                </button>
              </div>

              <h3 className={estilos.subtitulo}>Muestrario</h3>
              <div className={estilos.foto}>
                <span className={`${estilos.miniaturaGrande} ${estilos.muestrario}`}>
                  {p.muestrario_url ? (
                    <img src={p.muestrario_url} alt={`Muestrario de ${p.nombre}`} />
                  ) : (
                    'Sin muestrario'
                  )}
                </span>
                <div>
                  <label className="boton boton-borde boton-chico">
                    {p.muestrario_url ? 'Cambiar muestrario' : 'Subir muestrario'}
                    <input
                      type="file"
                      accept="image/*"
                      className="solo-lectores"
                      onChange={(e) => elegirFoto(e.target.files?.[0], 'muestrario_url')}
                      disabled={ocupado}
                    />
                  </label>
                  {p.muestrario_url && (
                    <button
                      type="button"
                      className={estilos.enlace}
                      onClick={() => cambiar({ muestrario_url: null })}
                    >
                      Quitar muestrario
                    </button>
                  )}
                  <p className={estilos.suave}>
                    Una foto con todos los {pluralVariante(p.tipo_variante ?? 'Color')} juntos. En la web
                    aparece el botón &quot;Ver {pluralVariante(p.tipo_variante ?? 'Color')}&quot; para
                    abrirla.
                  </p>
                </div>
              </div>
            </>
          )}
          <p className={estilos.suave}>
            El stock es solo para control interno: en la web todo se muestra como disponible. Baja solo con
            cada venta anotada. Vacío = no se controla.
          </p>
        </section>

        {mensaje && (
          <p
            className={mensaje.tipo === 'error' ? estilos.error : estilos.ok}
            role={mensaje.tipo === 'error' ? 'alert' : 'status'}
          >
            {mensaje.texto}
          </p>
        )}

        <div className={estilos.acciones}>
          <button type="submit" className="boton boton-principal" disabled={ocupado}>
            {ocupado ? 'Guardando…' : 'Guardar'}
          </button>
          {!esNuevo && (
            <button
              type="button"
              className={estilos.peligro}
              onClick={() => setConfirmandoBorrado(true)}
              disabled={ocupado}
            >
              Borrar producto
            </button>
          )}
        </div>
      </form>
      <Confirmar
        abierto={confirmandoBorrado}
        titulo={`¿Borrar "${p.nombre}" para siempre?`}
        textoConfirmar="Sí, borrar"
        alConfirmar={borrar}
        alCancelar={() => setConfirmandoBorrado(false)}
      >
        Si solo querés que no se vea, desmarcá &quot;Visible en la web&quot;.
      </Confirmar>
    </>
  )
}

function Confirmar({
  abierto,
  titulo,
  textoConfirmar,
  alConfirmar,
  alCancelar,
  children,
}: {
  abierto: boolean
  titulo: string
  textoConfirmar: string
  alConfirmar: () => void
  alCancelar: () => void
  children: ReactNode
}) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  return (
    <dialog
      ref={dialogo}
      className={estilos.modal}
      aria-labelledby="titulo-confirmar"
      onClose={alCancelar}
      onClick={(e) => e.target === e.currentTarget && alCancelar()}
    >
      <h2 id="titulo-confirmar">{titulo}</h2>
      <p>{children}</p>
      <div className={estilos.modalAcciones}>
        <button type="button" className="boton boton-borde boton-chico" onClick={alCancelar} autoFocus>
          Cancelar
        </button>
        <button type="button" className={`boton boton-chico ${estilos.botonPeligro}`} onClick={alConfirmar}>
          {textoConfirmar}
        </button>
      </div>
    </dialog>
  )
}

function CampoStock({
  valor,
  alCambiar,
  compacto,
}: {
  valor: number | null
  alCambiar: (v: number | null) => void
  compacto?: boolean
}) {
  return (
    <div className={estilos.stockCampo}>
      <button type="button" aria-label="Uno menos" onClick={() => alCambiar(Math.max(0, (valor ?? 0) - 1))}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        aria-label="Stock"
        placeholder={compacto ? '—' : 'Sin controlar'}
        value={valor ?? ''}
        onChange={(e) =>
          alCambiar(e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))))
        }
      />
      <button type="button" aria-label="Uno más" onClick={() => alCambiar((valor ?? 0) + 1)}>
        +
      </button>
    </div>
  )
}
