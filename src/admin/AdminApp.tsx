import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Route, Routes } from 'react-router'
import { LogoMond } from '../componentes/LogoMond'
import { supabase } from '../lib/supabase'
import { EditarProducto } from './EditarProducto'
import { Importar } from './Importar'
import { ListaProductos } from './ListaProductos'
import { RegistrarVenta } from './RegistrarVenta'
import { Ventas } from "./Ventas.tsx"
import { miRol } from './ventas'
import estilos from './admin.module.css'

type EstadoSesion =
  | { estado: 'cargando' }
  | { estado: 'afuera' }
  | { estado: 'sin-permiso'; email: string }
  | { estado: 'admin' | 'vendedora'; sesion: Session }

export default function AdminApp() {
  useEffect(() => {
    document.title = 'Admin · Mond'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.append(meta)
    return () => meta.remove()
  }, [])

  if (!supabase) {
    return (
      <Marco>
        <div className={estilos.caja}>
          <h1>Falta conectar Supabase</h1>
          <p>
            Copiá <code>.env.example</code> como <code>.env.local</code>, completá la URL y la clave pública
            del proyecto y reiniciá <code>npm run dev</code>.
          </p>
        </div>
      </Marco>
    )
  }
  return <ConSupabase sb={supabase} />
}

function ConSupabase({ sb }: { sb: SupabaseClient }) {
  const [sesion, setSesion] = useState<EstadoSesion>({ estado: 'cargando' })

  useEffect(() => {
    let vigente = true
    async function revisar(s: Session | null) {
      if (!s) return vigente && setSesion({ estado: 'afuera' })
      try {
        const rol = await miRol(sb)
        if (vigente)
          setSesion(rol ? { estado: rol, sesion: s } : { estado: 'sin-permiso', email: s.user.email ?? '' })
      } catch {
        if (vigente) setSesion({ estado: 'sin-permiso', email: s.user.email ?? '' })
      }
    }
    sb.auth.getSession().then(({ data }) => revisar(data.session))
    const { data } = sb.auth.onAuthStateChange((evento, s) => {
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') revisar(s)
    })
    return () => {
      vigente = false
      data.subscription.unsubscribe()
    }
  }, [sb])

  const salir = () => sb.auth.signOut()

  if (sesion.estado === 'cargando') return <Marco>Cargando…</Marco>
  if (sesion.estado === 'afuera') return <Marco>{<Ingreso sb={sb} />}</Marco>
  if (sesion.estado === 'sin-permiso') {
    return (
      <Marco>
        <div className={estilos.caja}>
          <h1>Sin permiso</h1>
          <p>
            {sesion.email} no tiene permiso para acceder a esta sección.
          </p>
          <button type="button" className="boton boton-principal" onClick={salir}>
            Salir
          </button>
        </div>
      </Marco>
    )
  }

  // Las vendedoras solo anotan ventas.
  if (sesion.estado === 'vendedora') {
    return (
      <Marco email={sesion.sesion.user.email} salir={salir} vendedora>
        <Routes>
          <Route path="venta" element={<RegistrarVenta sb={sb} usuario={sesion.sesion.user.id} />} />
          <Route path="*" element={<Navigate to="/admin/venta" replace />} />
        </Routes>
      </Marco>
    )
  }

  return (
    <Marco email={sesion.sesion.user.email} salir={salir}>
      <Routes>
        <Route index element={<ListaProductos sb={sb} />} />
        <Route path="ventas" element={<Ventas sb={sb} />} />
        <Route path="venta" element={<RegistrarVenta sb={sb} />} />
        <Route path="producto/nuevo" element={<EditarProducto sb={sb} />} />
        <Route path="producto/:slug" element={<EditarProducto sb={sb} />} />
        <Route path="importar" element={<Importar sb={sb} />} />
        <Route path="*" element={<p>No existe esta página del admin.</p>} />
      </Routes>
    </Marco>
  )
}

function Marco({
  children,
  email,
  salir,
  vendedora,
}: {
  children: ReactNode
  email?: string
  salir?: () => void
  vendedora?: boolean
}) {
  return (
    <div className={estilos.admin}>
      <header className={estilos.barra}>
        <div className={`contenedor ${estilos.barraFila}`}>
          <Link to="/admin" className={estilos.marca} aria-label="Admin de Mond">
            <LogoMond className={estilos.logo} />
            <span>admin</span>
          </Link>
          {salir && (
            <nav className={estilos.nav} aria-label="Admin">
              {!vendedora && (
                <>
                  <NavLink to="/admin" end>
                    Productos
                  </NavLink>
                  <NavLink to="/admin/ventas">Ventas</NavLink>
                  <NavLink to="/admin/importar">Subir / bajar CSV</NavLink>
                  <Link to="/" target="_blank">
                    Ver web
                  </Link>
                </>
              )}
              <button type="button" onClick={salir} title={email}>
                Salir
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className={`contenedor ${estilos.contenido}`}>{children}</main>
    </div>
  )
}

function Ingreso({ sb }: { sb: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: clave })
    setEnviando(false)
    if (error)
      setError(
        error.message === 'Invalid login credentials' ? 'Mail o contraseña incorrectos.' : error.message,
      )
  }

  return (
    <form className={estilos.caja} onSubmit={entrar}>
      <h1>Ingresar</h1>
      <label className={estilos.campo}>
        Mail
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className={estilos.campo}>
        Contraseña
        <input
          type="password"
          autoComplete="current-password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        />
      </label>
      {error && (
        <p className={estilos.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="boton boton-principal" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
