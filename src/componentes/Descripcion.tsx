import { partirDescripcion } from '../catalogo/descripcion'

/** Muestra la descripción de un producto con sus párrafos y listas. La usa también el admin. */
export function Descripcion({ texto, className }: { texto: string | null | undefined; className?: string }) {
  const bloques = partirDescripcion(texto)
  if (bloques.length === 0) return null
  return (
    <div className={className}>
      <h3>Detalles:</h3>
      {bloques.map((b, i) =>
        b.tipo === 'parrafo' ? (
          <p key={i}>{b.texto}</p>
        ) : (
          <ul key={i}>
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
