import { Link } from 'react-router'
import fotoEntrega from '../assets/imagenes/delivery.webp'
import fotoPortada from '../assets/imagenes/hero.webp'
import { useCatalogo } from '../catalogo/CatalogoContext'
import { BotonWhatsApp } from '../componentes/BotonWhatsApp'
import { Carrusel } from '../componentes/Carrusel'
import { IconoWhatsApp } from '../componentes/IconoWhatsApp'
import { LogoMond } from '../componentes/LogoMond'
import { TarjetaProducto } from '../componentes/TarjetaProducto'
import { enlaces, zonasQuincenales, zonasSemanales, type Zona } from '../config'
import { revelar } from '../lib/revelar'
import estilos from './Inicio.module.css'

const pasos = [
  {
    titulo: 'Elegís',
    texto: 'Mirá el catálogo y armá tu pedido desde el celular, con los tonos que necesites.',
  },
  {
    titulo: 'Nos escribís',
    texto: 'El pedido sale armado por WhatsApp. Te confirmamos stock y día de entrega.',
  },
  {
    titulo: 'Te lo llevamos',
    texto: 'Pasamos por tu localidad el día de la ruta y te lo dejamos en el salón.',
  },
  { titulo: 'Pagás al recibir', texto: 'Efectivo o transferencia, cuando tenés los productos en la mano.' },
]

const preguntas = [
  {
    p: '¿Hay compra mínima?',
    r: 'No. Si necesitás reponer dos o tres cosas, también te lo llevamos.',
  },
  {
    p: '¿Cómo pago?',
    r: 'En efectivo o por transferencia, cuando recibís el pedido. Te lo confirmamos por WhatsApp.',
  },
  {
    p: '¿Llegan a mi localidad?',
    r: 'Recorremos la ruta de Montecarlo, Eldorado, Puerto Rico, Jardín América y otras localidades de la zona. Escribinos y te decimos qué día pasamos.',
  },
  {
    p: '¿Tienen precio para salones o revendedoras?',
    r: 'Sí, tenemos lista mayorista. Pedila por WhatsApp.',
  },
  {
    p: '¿Hacen factura?',
    r: 'Consultanos por WhatsApp según lo que necesites.',
  },
]

function ListaZonas({ zonas }: { zonas: Zona[] }) {
  return (
    <ul className={estilos.zonas}>
      {zonas.map((z) => (
        <li key={z.pueblo}>
          {z.pueblo}
          {z.dia && <span className={estilos.dia}> · {z.dia}</span>}
        </li>
      ))}
    </ul>
  )
}

export function Inicio() {
  const catalogo = useCatalogo()
  const destacados = catalogo.estado === 'listo' ? catalogo.catalogo.productos.filter((p) => p.destacado) : []

  return (
    <>
      <section className={estilos.portada}>
        <div className={`contenedor ${estilos.portadaContenido}`}>
          <div className={estilos.portadaTexto}>
            <h1 className={estilos.titulo}>
              <LogoMond className={estilos.logoGrande} titulo="Mond" />
              <span className={estilos.bajada}>Insumos de uñas en Misiones. Te los llevamos al salón.</span>
            </h1>
            <div className={estilos.acciones}>
              <Link to="/catalogo" className="boton boton-amarillo">
                Ver catálogo
              </Link>
              <a
                href={enlaces.whatsapp('¡Hola Mond! Quería hacer una consulta.')}
                className="boton boton-borde"
                target="_blank"
                rel="noreferrer"
              >
                <IconoWhatsApp /> Escribinos
              </a>
            </div>
          </div>
          {/* Solo en escritorio: en celular el <img> se oculta y su src es un gif vacío,
              así no se descarga la foto. */}
          <picture className={estilos.portadaFoto}>
            <source media="(min-width: 900px)" srcSet={fotoPortada} />
            <img
              src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
              alt="Chica empujando un carro con una bolsa de Mond llena de insumos de uñas"
              width={1672}
              height={941}
              fetchPriority="high"
            />
          </picture>
        </div>
      </section>

      <section className={`contenedor ${estilos.seccion}`} aria-labelledby="como-trabajamos">
        <h2 ref={revelar} id="como-trabajamos">
          Cómo trabajamos
        </h2>
        <ol className={estilos.pasos}>
          {pasos.map((paso, i) => (
            <li key={paso.titulo} ref={revelar} className={estilos.paso}>
              <span className={estilos.numero} aria-hidden="true">
                {i + 1}
              </span>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {destacados.length > 0 && (
        <section className={estilos.fondoCrema} aria-labelledby="destacados">
          <div className={`contenedor ${estilos.seccion}`}>
            <div ref={revelar} className={estilos.encabezadoSeccion}>
              <h2 id="destacados">Lo que más se repone</h2>
              <Link to="/catalogo">Ver todo el catálogo →</Link>
            </div>
            <Carrusel etiqueta="Productos destacados">
              {destacados.map((p) => (
                <TarjetaProducto key={p.id} producto={p} />
              ))}
            </Carrusel>
          </div>
        </section>
      )}

      <section
        id="zonas"
        className={`contenedor ${estilos.seccion} ${estilos.zonasConFoto}`}
        aria-labelledby="titulo-zonas"
      >
        <div>
          <h2 ref={revelar} id="titulo-zonas">
            Dónde entregamos
          </h2>
          <p ref={revelar}>
            Llevamos los pedidos en mano por la ruta. Escribinos y te confirmamos qué día pasamos por tu
            localidad.
          </p>
          <div className={estilos.gruposZonas}>
            <div ref={revelar}>
              <h3>Todas las semanas</h3>
              <ListaZonas zonas={zonasSemanales} />
            </div>
            <div ref={revelar}>
              <h3>Cada 15 a 20 días</h3>
              <ListaZonas zonas={zonasQuincenales} />
            </div>
          </div>
        </div>
        <img
          ref={revelar}
          src={fotoEntrega}
          alt="Repartidor de Mond entregando una caja a una clienta en la puerta"
          width={1536}
          height={1024}
          loading="lazy"
          className={estilos.fotoEntrega}
        />
      </section>

      <section className={estilos.bandaBordo} aria-labelledby="mayoristas">
        <div ref={revelar} className={`contenedor ${estilos.seccion} ${estilos.mayoristas}`}>
          <div>
            <h2 id="mayoristas">¿Tenés un salón o revendés?</h2>
            <p>¡Te podemos ofrecer descuentos para compras grandes! Contanos lo que necesitás y charlamos.</p>
          </div>
          <a
            href={enlaces.whatsapp('¡Hola Mond! Quiero conocer más sobre los precios mayoristas.')}
            className="boton boton-amarillo"
            target="_blank"
            rel="noreferrer"
          >
            <IconoWhatsApp /> Consultar precios mayoristas
          </a>
        </div>
      </section>

      <section id="preguntas" className={`contenedor ${estilos.seccion}`} aria-labelledby="titulo-preguntas">
        <h2 ref={revelar} id="titulo-preguntas">
          Preguntas frecuentes
        </h2>
        <div className={estilos.preguntas}>
          {preguntas.map(({ p, r }) => (
            <details key={p} ref={revelar}>
              <summary>{p}</summary>
              <p>{r}</p>
            </details>
          ))}
        </div>
      </section>

      <BotonWhatsApp />
    </>
  )
}
