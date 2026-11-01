-- La descripción de cada producto pasa a verse en la web, en la página de cada producto.
-- La columna ya existía (se carga desde el admin); solo faltaba en la vista pública.
--
-- Es seguro correrla con la web publicada: no toca tablas ni datos, solo vuelve a crear la
-- vista igual que en 20261022000000_ventas.sql con una columna más al final (una vista solo
-- puede sumar columnas al final). La web actual pide todas las columnas e ignora la nueva.

create or replace view catalogo_publico as
select
  p.slug                          as id,
  p.nombre,
  c.nombre                        as categoria,
  c.orden                         as categoria_orden,
  p.precio,
  p.nota,
  p.tipo_variante,
  p.destacado,
  p.imagen_url,
  coalesce(
    jsonb_agg(
      jsonb_build_object('nombre', v.nombre, 'disponibilidad', 'disponible')
      order by v.orden, v.nombre
    ) filter (where v.nombre <> 'Único'),
    '[]'::jsonb
  )                               as variantes,
  case when count(v.id) = 0 then 'sin-stock' else 'disponible' end as disponibilidad,
  p.muestrario_url,
  p.descripcion
from productos p
join categorias c on c.id = p.categoria_id
left join variantes v on v.producto_id = p.id and v.activo
where p.activo
group by p.id, c.id;

grant select on catalogo_publico to anon, authenticated;
