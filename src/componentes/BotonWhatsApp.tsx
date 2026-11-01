import { enlaces } from '../config'
import { cantidadTotal } from '../pedido/pedido'
import { usePedido } from '../pedido/PedidoContext'
import { IconoWhatsApp } from './IconoWhatsApp'
import estilos from './BotonWhatsApp.module.css'

/** Botón flotante de WhatsApp. Se corre hacia arriba cuando aparece el botón del pedido, para no taparlo. */
export function BotonWhatsApp() {
  const { pedido, abierto } = usePedido()
  if (abierto) return null
  const hayPedido = cantidadTotal(pedido.items) > 0

  return (
    <a
      href={enlaces.whatsapp('¡Hola Luma! Quería hacer una consulta.')}
      target="_blank"
      rel="noreferrer"
      className={`${estilos.flotante} ${hayPedido ? estilos.conPedido : ''}`}
      aria-label="Escribinos por WhatsApp"
      title="Escribinos por WhatsApp"
    >
      <IconoWhatsApp />
    </a>
  )
}
