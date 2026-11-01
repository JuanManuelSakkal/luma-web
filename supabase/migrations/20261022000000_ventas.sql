-- Registro de ventas y stock interno.
--
--   * El stock pasa a ser solo un control interno: la web muestra todo como disponible,
--     porque lo que falta en Misiones se puede comprar en Capital y mandar.
--   * Las vendedoras (la tía, en Montecarlo) entran al admin y solo pueden anotar ventas.
--     Cada venta descuenta el stock del tono vendido.
--   * Nadie escribe la tabla ventas directo: se usa registrar_venta y anular_venta,
--     que descuentan y devuelven el stock en la misma operación.

create table vendedoras (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  nombre   text
);

alter table vendedoras enable row level security;
create policy admin_todo on vendedoras for all to authenticated using (es_admin()) with check (es_admin());
revoke all on vendedoras from anon;

-- ¿El usuario actual puede anotar ventas? Los admins también.
create function puede_vender() returns boolean
  language sql stable security definer set search_path = public
  as $$ select es_admin() or exists (select 1 from vendedoras where user_id = auth.uid()) $$;

-- 'admin', 'vendedora' o null. Lo usa el admin para saber qué pantallas mostrar.
create function mi_rol() returns text
  language sql stable security definer set search_path = public
  as $$
    select case
      when es_admin() then 'admin'
      when exists (select 1 from vendedoras where user_id = auth.uid()) then 'vendedora'
    end
  $$;

-- Las vendedoras leen productos, tonos y stock para elegir qué vendieron. No los cambian.
create policy vendedora_lee on categorias for select to authenticated using (puede_vender());
create policy vendedora_lee on productos  for select to authenticated using (puede_vender());
create policy vendedora_lee on variantes  for select to authenticated using (puede_vender());

create table ventas (
  id               bigint generated always as identity primary key,
  fecha            timestamptz not null default now(),
  variante_id      bigint references variantes (id) on delete set null,
  -- Nombre del producto y del tono al momento de la venta, por si después cambian o se borran.
  producto         text not null,
  variante         text,
  cantidad         int not null check (cantidad > 0),
  precio_unitario  int not null check (precio_unitario >= 0),
  -- Cuánto stock se descontó de verdad (0 si el tono no controla stock), para devolverlo al anular.
  descontado       int not null default 0 check (descontado >= 0),
  nota             text,
  vendedor         uuid default auth.uid(),
  vendedor_nombre  text
);

create index ventas_fecha on ventas (fecha desc);

alter table ventas enable row level security;
create policy vendedora_lee on ventas for select to authenticated using (puede_vender());
revoke all on ventas from anon;

create function registrar_venta(
  p_variante_id bigint,
  p_cantidad int,
  p_precio_unitario int default null,
  p_nota text default null
) returns ventas
  language plpgsql security definer set search_path = public as $$
declare
  v         variantes;
  p         productos;
  quita     int;
  resultado ventas;
begin
  if not puede_vender() then
    raise exception 'No tenés permiso para anotar ventas';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad tiene que ser 1 o más';
  end if;

  select * into v from variantes where id = p_variante_id for update;
  if not found then
    raise exception 'Ese producto ya no existe';
  end if;
  select * into p from productos where id = v.producto_id;

  -- Si el stock no alcanza, el conteo estaba mal: se deja en 0 y la venta se anota igual.
  quita := case when v.stock is null then 0 else least(v.stock, p_cantidad) end;
  if v.stock is not null then
    update variantes set stock = stock - quita where id = v.id;
  end if;

  insert into ventas (variante_id, producto, variante, cantidad, precio_unitario, descontado, nota, vendedor_nombre)
  values (
    v.id,
    p.nombre,
    nullif(v.nombre, 'Único'),
    p_cantidad,
    coalesce(p_precio_unitario, p.precio),
    quita,
    nullif(trim(p_nota), ''),
    coalesce(
      (select nombre from vendedoras where user_id = auth.uid()),
      (select nombre from admins where user_id = auth.uid())
    )
  )
  returning * into resultado;
  return resultado;
end $$;

-- Borra una venta y devuelve el stock. Una vendedora solo puede anular las suyas del último día.
create function anular_venta(p_venta_id bigint) returns void
  language plpgsql security definer set search_path = public as $$
declare
  vta ventas;
begin
  select * into vta from ventas where id = p_venta_id for update;
  if not found then
    raise exception 'Esa venta ya no existe';
  end if;
  if not (es_admin() or (puede_vender() and vta.vendedor = auth.uid() and vta.fecha > now() - interval '1 day')) then
    raise exception 'Solo podés deshacer tus ventas del último día. Pedile a un admin que la anule.';
  end if;

  if vta.descontado > 0 then
    update variantes set stock = stock + vta.descontado where id = vta.variante_id and stock is not null;
  end if;
  delete from ventas where id = vta.id;
end $$;

revoke execute on function registrar_venta(bigint, int, int, text), anular_venta(bigint) from public, anon;
grant execute on function registrar_venta(bigint, int, int, text), anular_venta(bigint) to authenticated;

-- Vista pública: el stock ya no se muestra. Solo queda "sin stock" un producto sin ningún
-- tono activo (por ejemplo, si se desactivaron todos a mano).
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
  p.muestrario_url
from productos p
join categorias c on c.id = p.categoria_id
left join variantes v on v.producto_id = p.id and v.activo
where p.activo
group by p.id, c.id;

grant select on catalogo_publico to anon, authenticated;
