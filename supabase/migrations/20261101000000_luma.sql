-- Ajustes de Luma sobre la base que viene de Mond:
--   * Variantes de joyería: Color (dorado, plateado), Medida (16, 18…) o Modelo (corazón, estrella…).
--   * Subcategoría opcional dentro de cada categoría (Aros > Argollas, Collares > Cadenas…).
--   * La vista pública suma la subcategoría al final (una vista solo puede sumar columnas al final).
--
-- Correr después de las migraciones anteriores, en orden por fecha.

alter table productos drop constraint if exists productos_tipo_variante_check;
alter table productos add constraint productos_tipo_variante_check
  check (tipo_variante in ('Color', 'Medida', 'Modelo'));

alter table productos add column if not exists subcategoria text;

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
  p.descripcion,
  p.subcategoria
from productos p
join categorias c on c.id = p.categoria_id
left join variantes v on v.producto_id = p.id and v.activo
where p.activo
group by p.id, c.id;

grant select on catalogo_publico to anon, authenticated;

-- Las categorías de Luma, en el orden en que se muestran.
insert into categorias (nombre, orden) values
  ('Aros', 1),
  ('Collares', 2),
  ('Pulseras', 3),
  ('Anillos', 4)
on conflict (nombre) do nothing;
