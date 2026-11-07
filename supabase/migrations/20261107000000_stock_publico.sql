-- Luma maneja stock firme: la web tiene que saber cuántas unidades hay de cada variante para no
-- dejar agregar al pedido más de las que hay. (En Mond el stock era solo control interno y la web
-- mostraba todo como disponible.)
--
-- La vista pública vuelve a calcular la disponibilidad con el stock y suma la cantidad:
--   * en cada variante, "stock" (null = no se controla, sin límite);
--   * al final, "stock" del producto cuando no tiene variantes (la variante "Único").
-- Se ocultan las cantidades de los productos inactivos y de las variantes ocultas, como antes.
--
-- Es seguro correrla con la web publicada: solo vuelve a crear la vista, con una columna más al
-- final (una vista solo puede sumar columnas al final). No toca tablas ni datos.

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
      jsonb_build_object(
        'nombre', v.nombre,
        'disponibilidad', case
          when v.stock is null then 'disponible'
          when v.stock <= 0 then 'sin-stock'
          when v.stock <= 3 then 'pocas'
          else 'disponible'
        end,
        'stock', v.stock
      ) order by v.orden, v.nombre
    ) filter (where v.nombre <> 'Único'),
    '[]'::jsonb
  )                               as variantes,
  -- Sin variantes activas: sin stock. Una variante que no controla stock (null) cuenta como mucho.
  case
    when coalesce(max(coalesce(v.stock, 2147483647)), 0) <= 0 then 'sin-stock'
    when max(coalesce(v.stock, 2147483647)) <= 3 then 'pocas'
    else 'disponible'
  end                             as disponibilidad,
  p.muestrario_url,
  p.descripcion,
  p.subcategoria,
  max(v.stock) filter (where v.nombre = 'Único') as stock
from productos p
join categorias c on c.id = p.categoria_id
left join variantes v on v.producto_id = p.id and v.activo
where p.activo
group by p.id, c.id;

grant select on catalogo_publico to anon, authenticated;
