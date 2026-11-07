import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'
import { useCatalogo } from '../catalogo/CatalogoContext'
import { leerPedidoGuardado, reducirPedido, type Accion, type Pedido } from './pedido'

const CLAVE = 'luma.pedido.v1'

type Valor = {
  pedido: Pedido
  despachar: Dispatch<Accion>
  abierto: boolean
  setAbierto: (abierto: boolean) => void
}

const Contexto = createContext<Valor | null>(null)

function leerGuardado(): Pedido {
  try {
    return leerPedidoGuardado(localStorage.getItem(CLAVE))
  } catch {
    return leerPedidoGuardado(null)
  }
}

export function PedidoProvider({ children }: { children: ReactNode }) {
  const [pedido, despachar] = useReducer(reducirPedido, undefined, leerGuardado)
  const [abierto, setAbierto] = useState(false)

  const catalogo = useCatalogo()

  // El pedido guardado puede ser de hace días: con el catálogo al día, se ajusta a lo que hay.
  useEffect(() => {
    if (catalogo.estado === 'listo')
      despachar({ tipo: 'ajustarStock', productos: catalogo.catalogo.productos })
  }, [catalogo])

  // Se guarda en el celular para que no se pierda si cierra la página.
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(pedido))
    } catch {
      // Navegación privada o almacenamiento lleno: el pedido sigue funcionando sin guardarse.
    }
  }, [pedido])

  return <Contexto.Provider value={{ pedido, despachar, abierto, setAbierto }}>{children}</Contexto.Provider>
}

export function usePedido(): Valor {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('usePedido tiene que usarse dentro de PedidoProvider')
  return valor
}
