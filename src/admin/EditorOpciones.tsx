import { useState } from 'react'
import { plural } from '../catalogo/opciones'
import estilos from './admin.module.css'
import {
  agregarValores,
  asignarFotosPorNombre,
  ponerFoto,
  quitarValor,
  renombrarValor,
  valorDe,
  valoresEje,
} from './opcionesAdmin'
import type { ProductoAdmin, VarianteAdmin } from './tipos'

// Partes del editor de producto para las opciones: la grilla de color × talle, la foto de cada
// valor y "Subir varias fotos". La lógica está en opcionesAdmin.ts.

/** Sube una foto y devuelve su URL pública. */
export type Subir = (archivo: File, sufijo: string) => Promise<string>

/** Miniatura con Subir / Cambiar / Quitar, para la foto de un color. */
export function FotoValor({
  valor,
  url,
  ocupado,
  alSubir,
  alQuitar,
}: {
  valor: string
  url?: string
  ocupado: boolean
  alSubir: (archivo: File) => void
  alQuitar: () => void
}) {
  return (
    <div className={estilos.fotoValor}>
      <span className={estilos.miniatura}>
        {url ? <img src={url} alt={`Foto de ${valor}`} /> : 'Sin foto'}
      </span>
      <label className={estilos.enlace}>
        {url ? 'Cambiar' : 'Subir'}
        <input
          type="file"
          accept="image/*"
          className="solo-lectores"
          aria-label={`Foto de ${valor}`}
          disabled={ocupado}
          onChange={(e) => {
            const archivo = e.target.files?.[0]
            e.target.value = ''
            if (archivo) alSubir(archivo)
          }}
        />
      </label>
      {url && (
        <button
          type="button"
          className={estilos.enlace}
          onClick={alQuitar}
          aria-label={`Quitar foto de ${valor}`}
        >
          Quitar
        </button>
      )}
    </div>
  )
}

/**
 * Elegir varias fotos de una vez: cada una va al valor cuyo nombre aparece en el archivo
 * (dorado.jpg → Dorado). Avisa cuáles no reconoció, para subirlas a mano en su fila.
 */
export function SubirVariasFotos({
  valores,
  ocupado,
  subir,
  alTerminar,
}: {
  valores: string[]
  ocupado: boolean
  subir: (archivo: File, valor: string) => Promise<void>
  alTerminar: (texto: string, error?: boolean) => void
}) {
  async function elegir(archivos: File[]) {
    if (!archivos.length) return
    const { asignadas, sinAsignar } = asignarFotosPorNombre(
      archivos.map((a) => a.name),
      valores,
    )
    try {
      for (const { archivo, valor } of asignadas)
        await subir(
          archivos.find((a) => a.name === archivo)!,
          valor,
        )
    } catch (e) {
      return alTerminar((e as Error).message, true)
    }
    const partes = [
      asignadas.length
        ? `${asignadas.length} ${asignadas.length === 1 ? 'foto subida' : 'fotos subidas'} (${asignadas.map((a) => a.valor).join(', ')}).`
        : 'No se subió ninguna foto.',
    ]
    if (sinAsignar.length)
      partes.push(
        `No reconocí a qué color va: ${sinAsignar.join(', ')}. Subilas en su fila o renombrá el archivo.`,
      )
    partes.push('Guardá para que queden en el producto.')
    alTerminar(partes.join(' '), asignadas.length === 0)
  }

  return (
    <label className="boton boton-borde boton-chico">
      Subir varias fotos
      <input
        type="file"
        accept="image/*"
        multiple
        className="solo-lectores"
        disabled={ocupado || !valores.length}
        onChange={(e) => {
          const archivos = [...(e.target.files ?? [])]
          e.target.value = ''
          void elegir(archivos)
        }}
      />
    </label>
  )
}

/** Un valor que se puede renombrar. El cambio se aplica al salir del campo, así no choca con otro. */
function ValorEditable({
  valor,
  etiqueta,
  alCambiar,
}: {
  valor: string
  etiqueta: string
  alCambiar: (nuevo: string) => void
}) {
  const [texto, setTexto] = useState(valor)
  const aplicar = () => {
    if (texto.trim() && texto.trim() !== valor) alCambiar(texto)
    setTexto(valor)
  }
  return (
    <input
      aria-label={etiqueta}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={aplicar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          aplicar()
        }
      }}
    />
  )
}

/** Campo para agregar varios valores separados por coma. */
function AgregarValores({
  placeholder,
  etiqueta,
  alAgregar,
}: {
  placeholder: string
  etiqueta: string
  alAgregar: (t: string) => void
}) {
  const [texto, setTexto] = useState('')
  const agregar = () => {
    alAgregar(texto)
    setTexto('')
  }
  return (
    <div className={estilos.enLinea}>
      <input
        placeholder={placeholder}
        aria-label={etiqueta}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            agregar()
          }
        }}
      />
      <button type="button" className="boton boton-borde boton-chico" onClick={agregar}>
        Agregar
      </button>
    </div>
  )
}

/**
 * Producto con dos opciones: una fila por valor de la primera (con su foto) y una columna por
 * valor de la segunda. En cada cuadro, el stock y si esa combinación se ofrece.
 */
export function GrillaOpciones({
  p,
  setP,
  ocupado,
  subirFotoValor,
}: {
  p: ProductoAdmin
  setP: (f: (p: ProductoAdmin) => ProductoAdmin) => void
  ocupado: boolean
  subirFotoValor: (archivo: File, valor: string) => void
}) {
  const tipo1 = p.tipo_variante || 'Color'
  const tipo2 = p.tipo_variante2 || 'Talle'
  const lista1 = valoresEje(p, 1)
  const lista2 = valoresEje(p, 2)
  const celda = (v1: string, v2: string) =>
    p.variantes.find((v) => valorDe(v, 1) === v1 && valorDe(v, 2) === v2)
  const cambiarCelda = (v: VarianteAdmin, cambios: Partial<VarianteAdmin>) =>
    setP((a) => ({
      ...a,
      variantes: a.variantes.map((x) =>
        valorDe(x, 1) === valorDe(v, 1) && valorDe(x, 2) === valorDe(v, 2) ? { ...x, ...cambios } : x,
      ),
    }))

  return (
    <>
      <div className={estilos.dosColumnas}>
        <div>
          <p className={estilos.suave}>{plural(tipo1)}</p>
          <AgregarValores
            placeholder="Agregar: Dorado, Plateado"
            etiqueta={`Agregar ${plural(tipo1.toLowerCase())} separados por coma`}
            alAgregar={(t) => setP((a) => agregarValores(a, 1, t))}
          />
        </div>
        <div>
          <p className={estilos.suave}>{plural(tipo2)}</p>
          <AgregarValores
            placeholder="Agregar: 12, 14, 16"
            etiqueta={`Agregar ${plural(tipo2.toLowerCase())} separados por coma`}
            alAgregar={(t) => setP((a) => agregarValores(a, 2, t))}
          />
        </div>
      </div>

      {lista1.length > 0 && (
        <div className={estilos.grillaScroll}>
          <table className={`${estilos.tabla} ${estilos.grilla}`}>
            <thead>
              <tr>
                <th>{tipo1}</th>
                <th>Foto</th>
                {lista2.map((v2) => (
                  <th key={v2}>
                    <ValorEditable
                      valor={v2}
                      etiqueta={`Nombre del ${tipo2.toLowerCase()} ${v2}`}
                      alCambiar={(n) => setP((a) => renombrarValor(a, 2, v2, n))}
                    />
                    <button
                      type="button"
                      className={estilos.enlace}
                      aria-label={`Quitar ${tipo2.toLowerCase()} ${v2}`}
                      onClick={() => setP((a) => quitarValor(a, 2, v2))}
                    >
                      Quitar
                    </button>
                  </th>
                ))}
                <th>
                  <span className="solo-lectores">Quitar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista1.map((v1) => (
                <tr key={v1}>
                  <td>
                    <ValorEditable
                      valor={v1}
                      etiqueta={`Nombre del ${tipo1.toLowerCase()} ${v1}`}
                      alCambiar={(n) => setP((a) => renombrarValor(a, 1, v1, n))}
                    />
                  </td>
                  <td>
                    <FotoValor
                      valor={v1}
                      url={p.fotos_opcion?.[v1]}
                      ocupado={ocupado}
                      alSubir={(f) => subirFotoValor(f, v1)}
                      alQuitar={() => setP((a) => ponerFoto(a, v1, null))}
                    />
                  </td>
                  {lista2.map((v2) => {
                    const v = celda(v1, v2)
                    if (!v) return <td key={v2} />
                    return (
                      <td key={v2} className={v.activo ? undefined : estilos.celdaApagada}>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          className={estilos.stockChico}
                          aria-label={`Stock ${v1} ${v2}`}
                          placeholder="—"
                          value={v.stock ?? ''}
                          onChange={(e) =>
                            cambiarCelda(v, {
                              stock:
                                e.target.value === ''
                                  ? null
                                  : Math.max(0, Math.round(Number(e.target.value))),
                            })
                          }
                        />
                        <label className={estilos.checkChico}>
                          <input
                            type="checkbox"
                            checked={v.activo}
                            onChange={(e) => cambiarCelda(v, { activo: e.target.checked })}
                          />
                          Hay
                        </label>
                      </td>
                    )
                  })}
                  <td>
                    <button
                      type="button"
                      className={estilos.enlace}
                      aria-label={`Quitar ${v1}`}
                      onClick={() => setP((a) => quitarValor(a, 1, v1))}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lista1.length > 0 && lista2.length === 0 && (
        <p className={estilos.aviso}>
          Agregá al menos un {tipo2.toLowerCase()} para armar las combinaciones.
        </p>
      )}
      <p className={estilos.suave}>
        Cada cuadro es una combinación ({lista1[0] ?? 'Dorado'} {tipo2.toLowerCase()} {lista2[0] ?? '14'}): el
        número es el stock (vacío = no se controla) y si destildás &quot;Hay&quot;, esa combinación no se
        ofrece en la web.
      </p>
    </>
  )
}
