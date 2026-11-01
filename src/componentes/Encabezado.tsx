import { Link, NavLink } from 'react-router'
import { cantidadTotal } from '../pedido/pedido'
import { usePedido } from '../pedido/PedidoContext'
import { LogoLuma } from './LogoLuma'
import estilos from './Encabezado.module.css'

export function Encabezado() {
  const { pedido, setAbierto } = usePedido()
  const cantidad = cantidadTotal(pedido.items)

  return (
    <header className={estilos.encabezado}>
      <div className={`contenedor ${estilos.fila}`}>
        <Link to="/" className={estilos.marca} aria-label="Luma, ir al inicio">
          <LogoLuma className={estilos.logo} />
        </Link>
        <nav className={estilos.nav} aria-label="Principal">
          <NavLink to="/" end className={({ isActive }) => (isActive ? estilos.activo : undefined)}>
            Inicio
          </NavLink>
          <NavLink to="/catalogo" className={({ isActive }) => (isActive ? estilos.activo : undefined)}>
            Catálogo
          </NavLink>
          <Link to="/#envios" className={estilos.secundario}>
            Envíos
          </Link>
        </nav>
        <button
          type="button"
          className={`boton boton-principal boton-chico ${estilos.botonPedido}`}
          onClick={() => setAbierto(true)}
          aria-label={`Ver mi pedido, ${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}`}
        >
          Mi pedido
          <span className={estilos.contador} aria-hidden="true">
            {cantidad}
          </span>
        </button>
      </div>
    </header>
  )
}
