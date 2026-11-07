-- Fotos por color y una segunda opción para elegir (por ejemplo color + talle). Viene de la web de
-- Mond, adaptado a Luma: la vista parte de 20261107000000_stock_publico.sql y mantiene el stock real.
--
--   * Cada valor de la primera opción (un color) puede tener su propia foto, que se ve en la web
--     al elegirlo. Si no tiene, se ve la foto general del producto.
--   * Un producto puede tener una segunda opción (tipo_variante2, por ejemplo "Talle"). Cada
--     combinación ("Dorado · 14") sigue siendo una fila de variantes, con su stock, así las
--     ventas y el stock funcionan igual que antes. La disponibilidad y el stock que ve la web son
--     los de cada combinación.
--   * El muestrario puede tener un título propio ("Guía de talles").
--
-- Es seguro correrla con la web publicada: la web actual ignora los datos nuevos.
-- Hay que correrla ANTES de publicar la web nueva, porque el admin nuevo lee estas columnas.

-- El nombre de las opciones pasa a ser texto libre (Color, Talle, Medida, Modelo…), como en Mond.
-- Reemplaza la restricción a Color / Medida / Modelo de 20261101000000_luma.sql.
alter table productos drop constraint if exists productos_tipo_variante_check;
alter table productos add column if not exists tipo_variante2 text;

-- Foto de cada valor de la primera opción: {"Dorado": "https://…", "Plateado": "https://…"}.
alter table productos add column if not exists fotos_opcion jsonb not null default '{}'::jsonb;

alter table productos add column if not exists muestrario_titulo text;

-- Valor de cada opción. nombre se mantiene ("Dorado", o "Dorado · 14" con dos opciones) porque lo
-- usan las ventas, el pedido y la regla de que no se repita dentro de un producto.
alter table variantes add column if not exists valor1 text;
alter table variantes add column if not exists valor2 text;
update variantes set valor1 = nombre where valor1 is null and nombre <> 'Único';

-- Misma vista que en 20261107000000_stock_publico.sql (stock y disponibilidad por variante), con
-- los valores dentro de cada variante y tres columnas más al final (una vista solo puede sumar
-- columnas al final).
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
        'stock', v.stock,
        'valor1', coalesce(v.valor1, v.nombre),
        'valor2', v.valor2
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
  max(v.stock) filter (where v.nombre = 'Único') as stock,
  p.tipo_variante2,
  p.fotos_opcion,
  p.muestrario_titulo
from productos p
join categorias c on c.id = p.categoria_id
left join variantes v on v.producto_id = p.id and v.activo
where p.activo
group by p.id, c.id;

grant select on catalogo_publico to anon, authenticated;
