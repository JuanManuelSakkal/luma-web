import { Link } from 'react-router'
import { IconoWhatsApp } from '../componentes/IconoWhatsApp'
import { diasParaCambios, enlaces } from '../config'
import { revelar } from '../lib/revelar'
import estilos from './Informacion.module.css'

/** Cambios, devoluciones y cuidado de las joyas. Los textos son los que armó Luma. */
export function Informacion() {
  return (
    <div className={`contenedor ${estilos.pagina}`}>
      <header className={estilos.cabecera}>
        <span className="rotulo">Información</span>
        <h1>Cambios y cuidados</h1>
        <span className="adorno" aria-hidden="true">
          <span />
        </span>
        <p>
          Queremos que estés feliz con tu compra. Por eso, antes de hacer un pedido te recomendamos revisar
          bien las medidas, colores y características de cada producto.
        </p>
      </header>

      <section ref={revelar} id="cambios" className={estilos.bloque} aria-labelledby="titulo-cambios">
        <h2 id="titulo-cambios">Cambios</h2>
        <p>
          Podés pedir un cambio dentro de los {diasParaCambios} días de haber recibido tu pedido, siempre que
          el producto esté sin uso, en perfectas condiciones y con su packaging original.
        </p>
        <p>
          Los costos de envío de un cambio corren por cuenta de quien compra, salvo que el producto haya
          llegado con una falla o haya habido un error de nuestra parte.
        </p>
      </section>

      <section ref={revelar} id="devoluciones" className={estilos.bloque} aria-labelledby="titulo-dev">
        <h2 id="titulo-dev">Devoluciones</h2>
        <p>
          Si necesitás hacer una devolución, escribinos por WhatsApp o Instagram dentro de los{' '}
          {diasParaCambios} días de recibido el pedido, contándonos qué compraste y el motivo.
        </p>
        <p>Los productos tienen que estar sin uso y en las mismas condiciones en las que los recibiste.</p>
      </section>

      <section ref={revelar} className={estilos.bloque} aria-labelledby="titulo-importante">
        <h2 id="titulo-importante">Importante</h2>
        <p>
          Antes de enviar tu pedido revisamos cuidadosamente cada pieza para asegurarnos de que llegue en
          excelentes condiciones. Cuando lo recibas, te recomendamos revisarlo. Si notás algún inconveniente,
          escribinos lo antes posible y te ayudamos a resolverlo.
        </p>
      </section>

      <section ref={revelar} id="cuidados" className={estilos.destacado} aria-labelledby="titulo-cuidados">
        <h2 id="titulo-cuidados">Cuidado de tus joyas</h2>
        <p>Las piezas de joyería y accesorios necesitan algunos cuidados para conservar su apariencia.</p>
        <ul>
          <li>
            Evitá el contacto directo y prolongado con perfumes, cremas, agua, productos químicos y humedad.
          </li>
          <li>Guardalas en un lugar seco y, cuando no las uses, dentro de su packaging.</li>
        </ul>
        <p className={estilos.gracias}>
          Gracias por elegirnos. Cada pedido se prepara con mucho amor y dedicación.
        </p>
      </section>

      <div className={estilos.acciones}>
        <a
          href={enlaces.whatsapp('¡Hola Luma! Tengo una consulta sobre un cambio.')}
          className="boton boton-principal"
          target="_blank"
          rel="noreferrer"
        >
          <IconoWhatsApp /> Escribinos
        </a>
        <Link to="/catalogo" className="boton boton-borde">
          Ver catálogo
        </Link>
      </div>
    </div>
  )
}
