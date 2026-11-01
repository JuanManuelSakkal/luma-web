-- El stock pasa a ser opcional: null = no se controla stock y el producto se muestra
-- como disponible. Sirve para cargar la lista de precios antes de contar la mercadería.

alter table variantes alter column stock drop not null;
alter table variantes alter column stock drop default;

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
        'disponibilidad', case when v.stock is null then 'disponible' when v.stock <= 0 then 'sin-stock' when v.stock <= 3 then 'pocas' else 'disponible' end
      ) order by v.orden, v.nombre
    ) filter (where v.nombre <> 'Único'),
    '[]'::jsonb
  )                               as variantes,
  -- Sin variantes activas: sin stock. Una variante que no controla stock (null) cuenta como mucho.
  case
    when coalesce(max(coalesce(v.stock, 2147483647)), 0) <= 0 then 'sin-stock'
    when max(coalesce(v.stock, 2147483647)) <= 3 then 'pocas'
    else 'disponible'
  end                             as disponibilidad
from productos p
join categorias c on c.id = p.categoria_id
left join variantes v on v.producto_id = p.id and v.activo
where p.activo
group by p.id, c.id;

grant select on catalogo_publico to anon, authenticated;
