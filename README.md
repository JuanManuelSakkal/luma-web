# Mond · web

Landing y catálogo de **Mond**, insumos de uñas en Montecarlo, Misiones. Se publica en https://mond.ar.

Hecha con React + TypeScript + Vite. El plan completo está en el proyecto, en `web/plan-mond-web.md`.

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
  config.ts            ← WhatsApp, Instagram, productos destacados, pueblos y días de entrega
  datos/catalogo.csv   ← catálogo mientras no esté Supabase (lista de precios de lanzamiento)
  catalogo/            ← lectura del catálogo (CSV o Supabase) e importador con tests
  pedido/              ← el pedido, guardado en el celular, y el mensaje de WhatsApp
  componentes/         ← encabezado, pie, tarjeta de producto, panel del pedido, logo
  paginas/             ← Inicio y Catálogo
  estilos/marca.css    ← colores, fuentes y botones de Mond
supabase/migrations/   ← tablas y reglas de seguridad de la base
```

### Cambiar precios o productos (por ahora)

Editar `src/datos/catalogo.csv` en Excel (mismo formato que la lista de precios de lanzamiento), guardarlo como CSV y volver a publicar. Los tonos o aromas van entre paréntesis en el nombre: `Kapping CAS (tonos #1, #2, #3)`.

Antes de publicar, `npm test` avisa si alguna fila tiene un precio mal escrito o un producto repetido.

Con Supabase conectado, todo esto se hace desde el portal de admin (ver abajo).

### Colores y logo

- Bordó `#581415`, amarillo `#FFEC65`, blanco. Están en `src/estilos/marca.css`.
- El amarillo nunca va como texto sobre blanco porque no se lee.
- El logo (`LogoMond`) y el ícono (`IconoMond`) son SVG: el french siempre blanco y el interior de la uña transparente, así toma el color del fondo. Por eso el logo va siempre sobre bordó.
- Fuente: Alice. Avatar se suma a los títulos cuando se confirme su licencia para web.

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

- El público solo lee la vista `catalogo_publico`: productos activos, siempre como disponibles. El stock es
  solo control interno y no se ve en la web.
- Solo los usuarios de la tabla `admins` pueden cambiar productos. Los de `vendedoras` solo anotan ventas.
- Las ventas se escriben solo con las funciones `registrar_venta` y `anular_venta`, que descuentan y devuelven
  el stock en la misma operación.
- Cada cambio de precio queda en `historial_precios`.
- Los costos y márgenes **no** van en esta base.

Si Supabase no responde, la web usa el CSV como respaldo.

## Portal de admin (`/admin`)

Entrar a `https://mond.ar/admin` (o `http://localhost:5173/admin`) con el mail y la contraseña del paso 4.

- **Productos**: buscar, ver stock y fotos, crear, editar y borrar. Cada producto tiene precio, categoría, foto
  (se achica sola antes de subirse), nota, si está visible o destacado, y sus tonos o aromas con stock.
  El stock en blanco quiere decir "no se controla" y en la web se muestra como disponible.
- **Subir/bajar CSV**: "Bajar CSV" descarga todo en un archivo para Excel, con una fila por tono:
  `categoria,producto,variante,tipo,precio,stock,activo,destacado,nota,descripcion`. Se edita y se vuelve a subir.
  La descripción va solo en la primera fila de cada producto; si una celda queda vacía, no se borra la que había.
  También acepta la lista de precios de lanzamiento (Categoría, Producto, Precio); en ese caso el stock y las
  fotos que ya había no se tocan. Antes de guardar muestra qué productos son nuevos, qué cambia y cuáles no
  están en el archivo (se pueden ocultar, nunca se borran).

- **Ventas**: lo vendido en los últimos 7 o 30 días (o todo): total, unidades, lo que más se vende y el
  detalle por día. Se puede anular una venta (el stock vuelve) y bajar todo en CSV.
- **Anotar venta** (`/admin/venta`): buscar el producto, elegir el tono, la cantidad y listo. Descuenta el stock.
  Si el stock no alcanza, la venta se anota igual y el stock queda en 0 (quiere decir que el conteo estaba mal).

La primera vez, lo más rápido es subir `src/datos/catalogo.csv` desde **Subir/bajar CSV**.

### Usuario para la tía (vendedora)

Entra en `https://mond.ar/venta` y solo ve la pantalla de anotar ventas, con lo anotado hoy. Puede deshacer
sus ventas del último día; las más viejas las anula un admin desde **Ventas**.

1. **Authentication > Users > Add user** con su mail y una contraseña (marcar "Auto Confirm User").
2. En **SQL Editor**: `insert into vendedoras (user_id, nombre) values ('<id del usuario>', 'Tía');`
3. En su celular, abrir `mond.ar/venta`, entrar y "Agregar a la pantalla de inicio" para tenerlo como una app.

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
4. En **Settings > Domains & Routes**, agregar `mond.ar` como Custom Domain.
   Para `mondinsumos.com.ar`, crear una regla de redirección a `https://mond.ar`.
5. En Supabase, **Authentication > URL Configuration**: Site URL `https://mond.ar`.

Cada push a la rama principal se publica solo.
