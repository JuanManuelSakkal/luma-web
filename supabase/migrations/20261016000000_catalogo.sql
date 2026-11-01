-- Catálogo de Mond: productos, tonos/aromas con stock, historial de precios y admins.
--
-- Seguridad:
--   * El público (rol anon) NO lee las tablas: solo la vista catalogo_publico, que muestra
--     productos activos con "disponible / pocas / sin-stock", nunca la cantidad de stock.
--   * Solo los usuarios cargados en la tabla admins pueden escribir.
--   * Los costos y márgenes NO van en esta base (quedan en la planilla).

create table categorias (
  id      bigint generated always as identity primary key,
  nombre  text not null unique,
  orden   int not null default 0
);

create table productos (
  id            bigint generated always as identity primary key,
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre        text not null,
  categoria_id  bigint not null references categorias (id),
  descripcion   text,
  nota          text,
  tipo_variante text check (tipo_variante in ('Tono', 'Aroma')),
  precio        int not null check (precio > 0),
  destacado     boolean not null default false,
  activo        boolean not null default true,
  imagen_url    text,
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);

-- Todo producto tiene al menos una variante. Los que no tienen tonos usan una sola
-- variante llamada "Único", así el stock siempre se lleva acá.
create table variantes (
  id           bigint generated always as identity primary key,
  producto_id  bigint not null references productos (id) on delete cascade,
  nombre       text not null default 'Único',
  stock        int not null default 0 check (stock >= 0),
  activo       boolean not null default true,
  orden        int not null default 0,
  unique (producto_id, nombre)
);

create table historial_precios (
  id               bigint generated always as identity primary key,
  producto_id      bigint not null references productos (id) on delete cascade,
  precio_anterior  int,
  precio_nuevo     int not null,
  fecha            timestamptz not null default now(),
  usuario          uuid default auth.uid()
);

create table admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  nombre   text
);

-- ¿El usuario actual es admin?
create function es_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from admins where user_id = auth.uid()) $$;

-- Historial de precios y fecha de actualización automáticos. Corren con permisos del
-- dueño (security definer) porque nadie, ni los admins, escribe el historial a mano.
create function registrar_cambio_producto() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.actualizado := now();
  if tg_op = 'INSERT' or new.precio is distinct from old.precio then
    insert into historial_precios (producto_id, precio_anterior, precio_nuevo)
    values (new.id, case when tg_op = 'UPDATE' then old.precio end, new.precio);
  end if;
  return new;
end $$;

create trigger productos_cambio
  before update on productos
  for each row execute function registrar_cambio_producto();

-- En el INSERT el id recién existe después de insertar.
create function registrar_precio_inicial() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into historial_precios (producto_id, precio_nuevo) values (new.id, new.precio);
  return new;
end $$;

create trigger productos_alta
  after insert on productos
  for each row execute function registrar_precio_inicial();

-- Seguridad por fila: solo admins leen y escriben las tablas.
alter table categorias        enable row level security;
alter table productos         enable row level security;
alter table variantes         enable row level security;
alter table historial_precios enable row level security;
alter table admins            enable row level security;

create policy admin_todo on categorias        for all to authenticated using (es_admin()) with check (es_admin());
create policy admin_todo on productos         for all to authenticated using (es_admin()) with check (es_admin());
create policy admin_todo on variantes         for all to authenticated using (es_admin()) with check (es_admin());
create policy admin_lee  on historial_precios for select to authenticated using (es_admin());
create policy admin_lee  on admins            for select to authenticated using (es_admin());

-- Vista pública: lo único que ve la web sin login.
create view catalogo_publico as
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
        'disponibilidad', case when v.stock <= 0 then 'sin-stock' when v.stock <= 3 then 'pocas' else 'disponible' end
      ) order by v.orden, v.nombre
    ) filter (where v.nombre <> 'Único'),
    '[]'::jsonb
  )                               as variantes,
  case
    when coalesce(max(v.stock), 0) <= 0 then 'sin-stock'
    when max(v.stock) <= 3 then 'pocas'
    else 'disponible'
  end                             as disponibilidad
from productos p
join categorias c on c.id = p.categoria_id
left join variantes v on v.producto_id = p.id and v.activo
where p.activo
group by p.id, c.id;

revoke all on categorias, productos, variantes, historial_precios, admins from anon;
grant select on catalogo_publico to anon, authenticated;

-- Fotos de productos: lectura pública, escritura solo admins.
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
  on conflict (id) do nothing;

create policy fotos_admin_escribe on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and es_admin());
create policy fotos_admin_actualiza on storage.objects for update to authenticated
  using (bucket_id = 'productos' and es_admin());
create policy fotos_admin_borra on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and es_admin());
