import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router'
import { CatalogoProvider } from './catalogo/CatalogoContext'
import { BotonPedido } from './componentes/BotonPedido'
import { Encabezado } from './componentes/Encabezado'
import { PanelPedido } from './componentes/PanelPedido'
import { Pie } from './componentes/Pie'
import { PedidoProvider } from './pedido/PedidoContext'
import { Catalogo } from './paginas/Catalogo'
import { Inicio } from './paginas/Inicio'
import { Informacion } from './paginas/Informacion'
import { Producto } from './paginas/Producto'

// El admin se carga aparte, así no suma peso a la web pública.
const AdminApp = lazy(() => import('./admin/AdminApp'))

const titulos: Record<string, string> = {
  '/': 'Luma · Lo que elegís',
  '/catalogo': 'Catálogo · Luma',
  '/cambios-y-cuidados': 'Cambios y cuidados · Luma',
}

/** Hasta cuánto se insiste en volver a la posición, mientras la página termina de cargar. */
const ESPERA_POSICION_MS = 1500

/**
 * Al cambiar de página: título, y scroll arriba o a la sección del #ancla.
 * Al volver atrás (botón del celular o "Volver") recupera la posición en la que estaba,
 * así el catálogo o la lista del admin quedan donde se los dejó.
 */
function AlNavegar() {
  const { pathname, hash, key } = useLocation()
  const tipo = useNavigationType()
  const posiciones = useRef(new Map<string, number>())
  const claveActual = useRef(key)
  const paginaAnterior = useRef<string | null>(null)

  useLayoutEffect(() => {
    claveActual.current = key
  }, [key])

  useEffect(() => {
    // La página de cada producto pone su propio título.
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/catalogo/'))
      document.title = titulos[pathname] ?? 'Luma'
  }, [pathname])

  // Anota dónde está cada página mientras se scrollea.
  useEffect(() => {
    history.scrollRestoration = 'manual'
    const anotar = () => posiciones.current.set(claveActual.current, window.scrollY)
    window.addEventListener('scroll', anotar, { passive: true })
    return () => window.removeEventListener('scroll', anotar)
  }, [])

  useEffect(() => {
    // Los filtros del catálogo y el tono elegido cambian la dirección sin cambiar de página:
    // ahí el scroll no se toca.
    const pagina = pathname + hash
    const mismaPagina = paginaAnterior.current === pagina
    paginaAnterior.current = pagina
    if (mismaPagina && tipo !== 'POP') return

    const guardada = posiciones.current.get(key)
    if (tipo === 'POP' && guardada !== undefined) {
      // La página puede tardar en cargar (la lista del admin se vuelve a pedir):
      // se reintenta hasta llegar o hasta que pase un rato.
      const hasta = performance.now() + ESPERA_POSICION_MS
      let cuadro = 0
      const intentar = () => {
        window.scrollTo({ top: guardada, behavior: 'instant' })
        if (Math.abs(window.scrollY - guardada) > 2 && performance.now() < hasta)
          cuadro = requestAnimationFrame(intentar)
      }
      intentar()
      // Si la persona scrollea mientras tanto, se deja de insistir.
      const soltar = () => cancelAnimationFrame(cuadro)
      window.addEventListener('wheel', soltar, { once: true, passive: true })
      window.addEventListener('touchstart', soltar, { once: true, passive: true })
      return () => {
        soltar()
        window.removeEventListener('wheel', soltar)
        window.removeEventListener('touchstart', soltar)
      }
    }
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash, key, tipo])

  return null
}

function NoEncontrada() {
  return (
    <div className="contenedor" style={{ paddingBlock: '4rem' }}>
      <h1>No encontramos esta página</h1>
      <p>
        Volvé al <Link to="/">inicio</Link> o mirá el <Link to="/catalogo">catálogo</Link>.
      </p>
    </div>
  )
}

function SitioPublico() {
  return (
    <CatalogoProvider>
      <PedidoProvider>
        <div className="sitio">
          <Encabezado />
          <main>
            <Routes>
              <Route path="/" element={<Inicio />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/catalogo/:id" element={<Producto />} />
              <Route path="/cambios-y-cuidados" element={<Informacion />} />
              <Route path="*" element={<NoEncontrada />} />
            </Routes>
          </main>
          <Pie />
        </div>
        <BotonPedido />
        <PanelPedido />
      </PedidoProvider>
    </CatalogoProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AlNavegar />
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<p className="contenedor">Cargando…</p>}>
              <AdminApp />
            </Suspense>
          }
        />
        {/* Dirección corta para anotar ventas desde el celular. */}
        <Route path="/venta" element={<Navigate to="/admin/venta" replace />} />
        <Route path="*" element={<SitioPublico />} />
      </Routes>
    </BrowserRouter>
  )
}
