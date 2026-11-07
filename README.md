# Luma · web

Tienda online de **Luma**, accesorios y joyería para mujer: aros, collares, pulseras y anillos.
Venta minorista online, con envíos por moto en CABA y por Correo Argentino a todo el país (a cargo de quien
compra o a convenir) y pago por transferencia.

Hecha con React + TypeScript + Vite, a partir de la web de Mond (misma base: catálogo, pedido por WhatsApp
y portal de admin con stock y ventas).

## Para arrancar

Hace falta Node 20 o más nuevo.

```bash
npm install
npm run dev        # abre la web en http://localhost:5173
```

Otros comandos:

| Comando           | Qué hace                                                     |
| ----------------- | ------------------------------------------------------------ |
| `npm test`        | Corre las pruebas (importador del CSV y pedido por WhatsApp) |
| `npm run build`   | Genera la web lista para publicar en `dist/`                 |
| `npm run preview` | Muestra la versión de `dist/`                                |
| `npm run lint`    | Revisa el código                                             |
| `npm run formato` | Ordena el formato del código                                 |

## Cómo está armada

```
src/
  config.ts             ← WhatsApp, Instagram, mail, alias, formas de envío, días para cambios
  datos/catalogo.csv    ← catálogo de EJEMPLO mientras no esté Supabase (reemplazar por los productos reales)
  catalogo/             ← lectura del catálogo (CSV o Supabase) e importador con tests
  pedido/               ← el pedido, guardado en el celular, y el mensaje de WhatsApp
  componentes/          ← encabezado, pie, tarjeta de producto, panel del pedido, logo
  paginas/              ← Inicio, Catálogo, Producto y Cambios y cuidados
  estilos/marca.css     ← colores, fuentes y botones de Luma
supabase/migrations/    ← tablas y reglas de seguridad de la base
```

### Páginas

- **Inicio**: portada con el logo, categorías, destacados, "Hola, somos Agus y Mary", cómo comprar, envíos y
  pagos, Instagram y preguntas frecuentes.
- **Catálogo** (`/catalogo`): buscador, categorías (Aros, Collares, Pulseras, Anillos) y subcategorías
  (Argollas, Cadenas, Esclavas…).
- **Producto** (`/catalogo/<id>`): fotos, color/medida/modelo, cantidad, descripción y productos parecidos.
- **Cambios y cuidados** (`/cambios-y-cuidados`): cambios, devoluciones y cuidado de las joyas.
- **Mi pedido**: se arma en el celular y se manda por WhatsApp con nombre, barrio y forma de envío.

### Cambiar productos (sin Supabase)

Editar `src/datos/catalogo.csv` en Excel y volver a publicar. Una fila por variante:
`categoria,subcategoria,producto,variante,tipo,precio,stock,activo,destacado,nota,descripcion`.
`tipo` es `Color`, `Medida` o `Modelo`. Antes de publicar, `npm test` avisa si hay precios mal escritos o
productos repetidos.

Con Supabase conectado, todo esto se hace desde el portal de admin (ver abajo).

### Colores, logo y fuentes

- Imperial Purple `#542C5D` (Pantone 19-3528) y Aqua Frost `#A2D5CF` (Pantone 13-5320), sobre un fondo crema.
  Están en `src/estilos/marca.css`.
- El aqua nunca va como texto sobre fondo claro porque no se lee: se usa para fondos, detalles y sobre violeta.
- El logo (`LogoLuma`, con o sin el lema "LO QUE ELEGIS") y el ícono de la "U" con el collar (`IconoLuma`)
  están trazados del PDF de marca, así que se ven nítidos en cualquier tamaño y toman el color del texto.
- Textos en TeX Gyre Pagella, la versión libre de Palatino (licencia GUST, en `src/assets/fuentes`).
  Si la computadora tiene Palatino Linotype, se usa esa. Lamoric Rowen queda solo en el logo.

## Supabase (base de datos)

La web funciona sin Supabase, leyendo el CSV. Para conectarla:

1. Crear un proyecto en https://supabase.com (región São Paulo).
2. En **SQL Editor**, correr en orden (por fecha) los archivos de `supabase/migrations/`.
   Si la base ya estaba armada, alcanza con correr los que todavía no se corrieron.
3. Copiar `.env.example` como `.env.local` y completar la **Project URL** y la clave **publishable** (o `anon`).
   Nunca usar la clave `secret` / `service_role` en la web.
4. Crear tu usuario en **Authentication > Users > Add user** (mail y contraseña) y sumarlo como admin:
   `insert into admins (user_id, nombre) values ('<id del usuario>', 'Tu nombre');`
5. En **Authentication > Sign In / Providers**, apagar "Allow new users to sign up": los admins se crean a mano.

Qué protege la base:

- El público solo lee la vista `catalogo_publico`: productos activos, con cuántas unidades hay de cada
  variante (para limitar el pedido). Precios de costo y ventas no se ven.
- Solo los usuarios de la tabla `admins` pueden cambiar productos. Los de `vendedoras` solo anotan ventas.
- Las ventas se escriben solo con las funciones `registrar_venta` y `anular_venta`, que descuentan y devuelven
  el stock en la misma operación.
- Cada cambio de precio queda en `historial_precios`.
- Los costos y márgenes **no** van en esta base.

Si Supabase no responde, la web usa el CSV como respaldo.

## Stock en la web

Luma maneja stock firme: la web sabe cuántas unidades hay de cada producto (o de cada color, medida o
modelo) y no deja agregar al pedido más de esas. Con 3 o menos muestra "Últimas unidades" y en la página del
producto "Quedan N unidades". Si alguien tenía un pedido guardado y mientras tanto bajó el stock, al volver
a entrar se ajusta solo y se le avisa.

- El stock baja cuando se **anota la venta** en el admin (`/admin/venta`). Por eso, apenas se confirma un
  pedido por WhatsApp, conviene anotarlo: hasta que no se anota, la web sigue ofreciendo esas unidades.
- Stock vacío en el admin = no se controla: la web no pone límite. Para Luma conviene cargarlo siempre.
- Requiere la migración `20261107000000_stock_publico.sql` (ver Supabase, paso 2). Sin ella la web
  funciona igual, pero sin límite.

## Portal de admin (`/admin`)

Entrar a `https://<tu dominio>/admin` (o `http://localhost:5173/admin`) con el mail y la contraseña del paso 4.

- **Productos**: buscar, ver stock y fotos, crear, editar y borrar. Cada producto tiene precio, categoría, foto
  (se achica sola antes de subirse), nota, si está visible o destacado, y sus colores, medidas o modelos con stock.
  El stock en blanco quiere decir "no se controla" y en la web se muestra como disponible.
- **Subir/bajar CSV**: "Bajar CSV" descarga todo en un archivo para Excel, con una fila por tono:
  `categoria,producto,variante,tipo,precio,stock,activo,destacado,nota,descripcion`. Se edita y se vuelve a subir.
  La descripción va solo en la primera fila de cada producto; si una celda queda vacía, no se borra la que había.
  También acepta una lista de precios simple (Categoría, Producto, Precio); en ese caso el stock y las
  fotos que ya había no se tocan. Antes de guardar muestra qué productos son nuevos, qué cambia y cuáles no
  están en el archivo (se pueden ocultar, nunca se borran).

- **Ventas**: lo vendido en los últimos 7 o 30 días (o todo): total, unidades, lo que más se vende y el
  detalle por día. Se puede anular una venta (el stock vuelve) y bajar todo en CSV.
- **Anotar venta** (`/admin/venta`): buscar el producto, elegir la variante, la cantidad y listo. Descuenta el stock.
  Si el stock no alcanza, la venta se anota igual y el stock queda en 0 (quiere decir que el conteo estaba mal).

La primera vez se puede subir `src/datos/catalogo.csv` desde **Subir/bajar CSV** para probar, y después cargar los productos reales.

### Usuario para anotar ventas (vendedora)

Entra en `<tu dominio>/venta` y solo ve la pantalla de anotar ventas, con lo anotado hoy. Puede deshacer
sus ventas del último día; las más viejas las anula un admin desde **Ventas**.

1. **Authentication > Users > Add user** con su mail y una contraseña (marcar "Auto Confirm User").
2. En **SQL Editor**: `insert into vendedoras (user_id, nombre) values ('<id del usuario>', 'Mary');`
3. En su celular, abrir `<tu dominio>/venta`, entrar y "Agregar a la pantalla de inicio" para tenerlo como una app.

Conviene contar la mercadería cada uno o dos meses y corregir el stock desde **Productos**: siempre se escapa
alguna venta sin anotar.

## Publicar en Cloudflare Workers

`wrangler.jsonc` ya está listo: publica `dist/` y manda cualquier ruta (`/catalogo`, `/admin`) a `index.html`.

1. Subir el proyecto a un repositorio privado de GitHub.
2. En Cloudflare: **Workers & Pages > Create > Import a repository**, elegir el repositorio.
   Build command `npm run build`, deploy command `npx wrangler deploy`.
3. En **Settings > Build > Variables and secrets** (las de *build*, no las de runtime) cargar
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `NODE_VERSION=22`. Vite las mete en la web al compilar,
   así que si se cambian hay que volver a publicar.
4. Cuando haya dominio: agregarlo en **Settings > Domains & Routes**, ponerlo en `contacto.dominio` de
   `src/config.ts`, y en `index.html` cambiar `og:image` por la dirección completa
   (`https://<dominio>/og-luma.png`). En Supabase, **Authentication > URL Configuration**: Site URL con el dominio.

Cada push a la rama principal se publica solo.
