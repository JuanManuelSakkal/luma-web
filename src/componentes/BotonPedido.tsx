import { cantidadTotal, pesos, totalPedido } from '../pedido/pedido'
import { usePedido } from '../pedido/PedidoContext'
import estilos from './BotonPedido.module.css'

/** Botón flotante con el resumen del pedido. Aparece en todas las páginas apenas hay algo agregado. */
export function BotonPedido() {
  const { pedido, abierto, setAbierto } = usePedido()
  const cantidad = cantidadTotal(pedido.items)
  if (cantidad === 0 || abierto) return null

  return (
    <button
      type="button"
      className={`boton boton-principal ${estilos.flotante}`}
      onClick={() => setAbierto(true)}
    >
      Ver pedido · {cantidad} {cantidad === 1 ? 'producto' : 'productos'} · {pesos(totalPedido(pedido.items))}
    </button>
  )
}
