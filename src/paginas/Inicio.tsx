import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { useCatalogo } from '../catalogo/CatalogoContext'
import { BotonWhatsApp } from '../componentes/BotonWhatsApp'
import { Carrusel } from '../componentes/Carrusel'
import { IconoLuma } from '../componentes/IconoLuma'
import { IconoWhatsApp } from '../componentes/IconoWhatsApp'
import { LogoLuma } from '../componentes/LogoLuma'
import { TarjetaProducto } from '../componentes/TarjetaProducto'
import { contacto, diasParaCambios, enlaces, transferencia } from '../config'
import { revelar } from '../lib/revelar'
import estilos from './Inicio.module.css'

/** Las categorías de la portada, con sus subcategorías de ejemplo. Llevan al catálogo filtrado. */
const categorias = [
  { nombre: 'Aros', detalle: ['Abridores', 'Argollas', 'Colgantes', 'Cuff'] },
  { nombre: 'Collares', detalle: ['Cadenas', 'Con dijes', 'Corbateros'] },
  { nombre: 'Pulseras', detalle: ['Esclavas', 'Simples', 'Charm'] },
  { nombre: 'Anillos', detalle: ['Finos', 'Grandes', 'Regulables'] },
]

const pasos = [
  { titulo: 'Elegís', texto: 'Mirá el catálogo y sumá a tu pedido lo que más te guste.' },
  {
    titulo: 'Nos escribís',
    texto: 'Tu pedido sale armado por WhatsApp. Te confirmamos disponibilidad y el costo del envío.',
  },
  { titulo: 'Pagás', texto: 'Por transferencia bancaria, de manera rápida y segura.' },
  {
    titulo: 'Te lo enviamos',
    texto: 'Despachamos entre 24 y 96 horas después de confirmado el pago.',
  },
]

const preguntas = [
  {
    p: '¿Cómo puedo hacer un pedido?',
    r: 'Elegí tus productos en el catálogo y mandanos el pedido por WhatsApp desde "Mi pedido". También podés consultarnos por WhatsApp o Instagram.',
  },
  {
    p: '¿Qué materiales utilizan?',
    r: 'En cada producto indicamos el material y sus características en la descripción.',
  },
  {
    p: '¿Cómo sé qué tamaño elegir?',
    r: 'Encontrás las medidas de cada producto en su descripción. Si tenés dudas, escribinos antes de comprar y te ayudamos.',
  },
  {
    p: '¿Cuánto tarda mi pedido?',
    r: 'Los pedidos se despachan entre 24 y 96 horas después de confirmado el pago. Para evitar demoras, revisá bien tus datos antes de enviarnos el pedido.',
  },
  {
    p: '¿Quién paga el envío?',
    r: 'El envío corre por cuenta de quien compra, o lo coordinamos juntas. Te pasamos el costo antes de que pagues.',
  },
  {
    p: '¿Tienen local?',
    r: 'No, por ahora vendemos solo online. Preparamos cada pedido con mucho cariño y te lo enviamos.',
  },
  {
    p: '¿Puedo cambiar un producto?',
    r: `Sí, dentro de los ${diasParaCambios} días de recibido, sin uso y con su packaging original. Mirá las condiciones en Cambios y cuidados.`,
  },
]

export function Inicio() {
  const catalogo = useCatalogo()
  const destacados = catalogo.estado === 'listo' ? catalogo.catalogo.productos.filter((p) => p.destacado) : []

  return (
    <>
      <section className={estilos.portada}>
        <div className={`contenedor ${estilos.portadaContenido}`}>
          <h1 className={estilos.titulo}>
            <LogoLuma className={estilos.logoGrande} lema />
            <span className={estilos.bajada}>
              Aros, collares, pulseras y anillos elegidos con cariño, pensando en vos.
            </span>
          </h1>
          <div className={estilos.acciones}>
            <Link to="/catalogo" className="boton boton-principal">
              Ver catálogo
            </Link>
            <a
              href={enlaces.whatsapp('¡Hola Luma! Quería hacer una consulta.')}
              className="boton boton-borde"
              target="_blank"
              rel="noreferrer"
            >
              <IconoWhatsApp /> Escribinos
            </a>
          </div>
          <p className={estilos.datosPortada}>Envíos en CABA y a todo el país</p>
        </div>
      </section>

      <section className={`contenedor ${estilos.seccion}`} aria-labelledby="titulo-categorias">
        <div ref={revelar} className={estilos.encabezadoCentrado}>
          <span className="rotulo">Colección</span>
          <h2 id="titulo-categorias">Encontrá lo que buscás</h2>
          <span className="adorno" aria-hidden="true">
            <span />
          </span>
        </div>
        <ul className={estilos.categorias}>
          {categorias.map((c, i) => (
            <li key={c.nombre} ref={revelar} style={{ '--retraso': `${i * 80}ms` } as CSSProperties}>
              <Link to={`/catalogo?categoria=${encodeURIComponent(c.nombre)}`} className={estilos.categoria}>
                <IconoLuma className={estilos.iconoCategoria} titulo="" />
                <span className={estilos.nombreCategoria}>{c.nombre}</span>
                <span className={estilos.detalleCategoria}>{c.detalle.join(' · ')}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {destacados.length > 0 && (
        <section className={estilos.fondoLila} aria-labelledby="destacados">
          <div className={`contenedor ${estilos.seccion}`}>
            <div ref={revelar} className={estilos.encabezadoSeccion}>
              <div>
                <span className="rotulo">Destacados</span>
                <h2 id="destacados">Los más elegidos</h2>
              </div>
              <Link to="/catalogo" className={estilos.verTodo}>
                Ver todo el catálogo →
              </Link>
            </div>
            <Carrusel etiqueta="Productos destacados">
              {destacados.map((p) => (
                <TarjetaProducto key={p.id} producto={p} />
              ))}
            </Carrusel>
          </div>
        </section>
      )}

      <section id="nosotras" className={`contenedor ${estilos.seccion}`} aria-labelledby="titulo-nosotras">
        <div ref={revelar} className={estilos.nosotras}>
          <IconoLuma className={estilos.iconoNosotras} titulo="" />
          <span className="rotulo">Nuestra historia</span>
          <h2 id="titulo-nosotras">Hola, somos Agus y Mary</h2>
          <p>
            Creamos Luma con mucha ilusión y cariño, pensando en todas las mujeres que disfrutan de esos
            pequeños detalles que hacen la diferencia.
          </p>
          <p>
            Elegimos cada accesorio pensando en vos, para que encuentres algo lindo, especial y que te
            represente. Gracias por acompañarnos en este comienzo y por elegir formar parte de nuestra
            historia.
          </p>
          <p className={estilos.firma}>Agus y Mary</p>
        </div>
      </section>

      <section className={estilos.fondoAqua} aria-labelledby="como-comprar">
        <div className={`contenedor ${estilos.seccion}`}>
          <div ref={revelar} className={estilos.encabezadoCentrado}>
            <span className="rotulo">Paso a paso</span>
            <h2 id="como-comprar">Cómo comprar</h2>
            <span className="adorno" aria-hidden="true">
              <span />
            </span>
          </div>
          <ol className={estilos.pasos}>
            {pasos.map((paso, i) => (
              <li
                key={paso.titulo}
                ref={revelar}
                className={estilos.paso}
                style={{ '--retraso': `${i * 80}ms` } as CSSProperties}
              >
                <span className={estilos.numero} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{paso.titulo}</h3>
                <p>{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="envios" className={`contenedor ${estilos.seccion}`} aria-labelledby="titulo-envios">
        <div ref={revelar} className={estilos.encabezadoCentrado}>
          <span className="rotulo">Envíos y pagos</span>
          <h2 id="titulo-envios">Lo recibís como te quede más cómodo</h2>
          <span className="adorno" aria-hidden="true">
            <span />
          </span>
        </div>
        <div className={estilos.envios}>
          <article ref={revelar} className={estilos.envio}>
            <h3>Moto mensajería</h3>
            <p>Para CABA y zonas cercanas.</p>
          </article>
          <article ref={revelar} className={estilos.envio}>
            <h3>Correo Argentino</h3>
            <p>A domicilio o a sucursal, a todo el país.</p>
          </article>
          <article ref={revelar} className={estilos.envio}>
            <h3>Transferencia bancaria</h3>
            <p>
              Alias <strong className={estilos.alias}>{transferencia.alias}</strong>
              <br />a nombre de {transferencia.titular}.
            </p>
          </article>
        </div>
        <p ref={revelar} className={estilos.notaEnvios}>
          El envío corre por cuenta de quien compra, o lo coordinamos juntas. Cuando tu pedido esté listo te
          pasamos toda la información. No tenemos local a la calle: vendemos solo online.
        </p>
      </section>

      <section className={estilos.bandaVioleta} aria-labelledby="instagram">
        <div ref={revelar} className={`contenedor ${estilos.seccion} ${estilos.instagram}`}>
          <div>
            <span className={`rotulo ${estilos.rotuloClaro}`}>Seguinos</span>
            <h2 id="instagram">Novedades en Instagram</h2>
            <p>Lo nuevo, las combinaciones que más nos gustan y todo lo que va llegando.</p>
          </div>
          <a href={enlaces.instagram} className="boton boton-aqua" target="_blank" rel="noreferrer">
            @{contacto.instagram}
          </a>
        </div>
      </section>

      <section id="preguntas" className={`contenedor ${estilos.seccion}`} aria-labelledby="titulo-preguntas">
        <div ref={revelar} className={estilos.encabezadoCentrado}>
          <span className="rotulo">Ayuda</span>
          <h2 id="titulo-preguntas">Preguntas frecuentes</h2>
          <span className="adorno" aria-hidden="true">
            <span />
          </span>
        </div>
        <div className={estilos.preguntas}>
          {preguntas.map(({ p, r }) => (
            <details key={p} ref={revelar}>
              <summary>{p}</summary>
              <p>{r}</p>
            </details>
          ))}
        </div>
        <p className={estilos.masInfo}>
          <Link to="/cambios-y-cuidados">Cambios, devoluciones y cuidado de tus joyas →</Link>
        </p>
      </section>

      <BotonWhatsApp />
    </>
  )
}
