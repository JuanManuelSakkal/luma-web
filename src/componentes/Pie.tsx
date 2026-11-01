import { Link } from 'react-router'
import { contacto, enlaces } from '../config'
import { IconoWhatsApp } from './IconoWhatsApp'
import { LogoLuma } from './LogoLuma'
import estilos from './Pie.module.css'

const anio = new Date().getFullYear()

export function Pie() {
  return (
    <footer className={estilos.pie}>
      <div className={`contenedor ${estilos.grilla}`}>
        <div>
          <LogoLuma className={estilos.logo} lema />
          <p className={estilos.lema}>
            Accesorios y joyería para vos. Vendemos online, con envíos en CABA y a todo el país.
          </p>
        </div>
        <nav aria-label="Enlaces del pie">
          <h2 className={estilos.titulo}>Tienda</h2>
          <ul className={estilos.lista}>
            <li>
              <Link to="/catalogo">Catálogo</Link>
            </li>
            <li>
              <Link to="/#envios">Envíos y pagos</Link>
            </li>
            <li>
              <Link to="/cambios-y-cuidados">Cambios y cuidados</Link>
            </li>
            <li>
              <Link to="/#preguntas">Preguntas frecuentes</Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className={estilos.titulo}>Contacto</h2>
          <ul className={estilos.lista}>
            <li>
              <a href={enlaces.whatsapp()} target="_blank" rel="noreferrer" className={estilos.contacto}>
                <IconoWhatsApp /> {contacto.whatsappVisible}
              </a>
            </li>
            <li>
              <a href={enlaces.instagram} target="_blank" rel="noreferrer">
                @{contacto.instagram}
              </a>
            </li>
            <li>
              <a href={enlaces.email}>{contacto.email}</a>
            </li>
          </ul>
        </div>
      </div>
      <p className={`contenedor ${estilos.legal}`}>
        © {anio} Luma{contacto.dominio ? ` · ${contacto.dominio}` : ''}
      </p>
    </footer>
  )
}
