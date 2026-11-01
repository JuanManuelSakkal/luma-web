import { Link } from 'react-router'
import { contacto, enlaces } from '../config'
import { IconoWhatsApp } from './IconoWhatsApp'
import { LogoMond } from './LogoMond'
import estilos from './Pie.module.css'

const anio = new Date().getFullYear()

export function Pie() {
  return (
    <footer className={estilos.pie}>
      <div className={`contenedor ${estilos.grilla}`}>
        <div>
          <LogoMond className={estilos.logo} />
          <p className={estilos.lema}>Insumos de uñas en Montecarlo y la ruta.</p>
        </div>
        <nav aria-label="Enlaces del pie">
          <ul className={estilos.lista}>
            <li>
              <Link to="/catalogo">Catálogo</Link>
            </li>
            <li>
              <Link to="/#zonas">Zonas de entrega</Link>
            </li>
            <li>
              <Link to="/#preguntas">Preguntas frecuentes</Link>
            </li>
          </ul>
        </nav>
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
        </ul>
      </div>
      <p className={`contenedor ${estilos.legal}`}>
        © {anio} Mond · {contacto.dominio}
      </p>
    </footer>
  )
}
