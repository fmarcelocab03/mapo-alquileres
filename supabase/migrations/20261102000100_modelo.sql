-- MAPO | Ejecute en proyecto nuevo mediante las migraciones. Fechas locales en Lima; importes en PEN.
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions, pg_catalog;
create schema if not exists mapo_privado;
revoke all on schema mapo_privado from public, anon, authenticated;
grant usage on schema mapo_privado to authenticated;
create table mapo_privado.administradores (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 asignado_en timestamptz not null default now());
revoke all on mapo_privado.administradores from public,anon,authenticated;
create function mapo_privado.es_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from mapo_privado.administradores a where a.usuario_id=(select auth.uid()))
$$;
revoke all on function mapo_privado.es_admin() from public,anon,authenticated;
grant execute on function mapo_privado.es_admin() to authenticated;
create function public.soy_admin() returns boolean language sql stable security invoker set search_path='' as $$ select mapo_privado.es_admin() $$;
create table public.clientes(
 id uuid primary key default gen_random_uuid(), usuario_id uuid unique references auth.users(id) on delete set null,
 nombre text not null check(length(btrim(nombre)) between 1 and 150), correo text, telefono text,
 creado_en timestamptz not null default now());
create function mapo_privado.perfil_auth() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.clientes(usuario_id,nombre,correo) values(new.id,
  coalesce(nullif(left(btrim(new.raw_user_meta_data->>'nombre'),150),''),'Huésped'),new.email)
  on conflict(usuario_id) do nothing;
 else update public.clientes set correo=new.email where usuario_id=new.id; end if;
 return new;
end $$;
create trigger mapo_alta after insert on auth.users for each row execute function mapo_privado.perfil_auth();
create trigger mapo_correo after update of email on auth.users for each row when(old.email is distinct from new.email) execute function mapo_privado.perfil_auth();
insert into public.clientes(usuario_id,nombre,correo)
 select id,coalesce(nullif(left(btrim(raw_user_meta_data->>'nombre'),150),''),'Huésped'),email from auth.users on conflict(usuario_id) do nothing;
create table public.edificios(id uuid primary key default gen_random_uuid(), nombre text not null unique check(btrim(nombre)<>''), ciudad text not null default 'Huancayo', direccion text);
create table public.departamentos(
 id uuid primary key default gen_random_uuid(), edificio_id uuid not null references public.edificios on delete restrict,
 codigo text not null unique check(codigo ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
 nombre text not null check(length(btrim(nombre)) between 1 and 160), descripcion text not null default '',
 capacidad smallint check(capacidad between 1 and 100), dormitorios smallint check(dormitorios>=0),
 tarifa_dia numeric(12,2) check(tarifa_dia between 0.01 and 9999999999.99), tarifa_mes numeric(12,2) check(tarifa_mes between 0.01 and 9999999999.99),
 publicado boolean not null default false,
 alta date, baja date,
 check(baja is null or (alta is not null and baja>alta)), check(not publicado or (alta is not null and capacidad is not null and (tarifa_dia is not null or tarifa_mes is not null))));
create table public.servicios(id uuid primary key default gen_random_uuid(), nombre text not null unique check(btrim(nombre)<>''));
create table public.departamento_servicios(departamento_id uuid references public.departamentos on delete cascade, servicio_id uuid references public.servicios on delete restrict, primary key(departamento_id,servicio_id));
create table public.fotos(id uuid primary key default gen_random_uuid(), departamento_id uuid not null references public.departamentos on delete restrict,
 ruta text not null unique, descripcion text not null default '', orden int not null default 0 check(orden>=0),
 check(split_part(ruta,'/',1)=departamento_id::text and ruta ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]+[.](jpg|jpeg|png|webp)$'));
create index fotos_orden on public.fotos(departamento_id,orden,id);
create table public.favoritos(usuario_id uuid not null references auth.users(id) on delete cascade, departamento_id uuid not null references public.departamentos on delete cascade, primary key(usuario_id,departamento_id));
create table public.reservas(
 id uuid primary key default gen_random_uuid(), departamento_id uuid not null references public.departamentos on delete restrict,
 cliente_id uuid references public.clientes on delete restrict, clase text not null check(clase in('alquiler','mantenimiento','uso_propietario')),
 estado text not null, modalidad text, canal text, referencia_canal text, huespedes smallint, meses smallint,
 entrada date not null, salida date not null, precio_unitario numeric(12,2), motivo text, creado_en timestamptz not null default now(),
 check(salida>entrada), check(isfinite(entrada) and isfinite(salida)),
 check((clase='alquiler' and cliente_id is not null and estado in('solicitada','confirmada','en_curso','finalizada','cancelada') and modalidad is not null and modalidad in('dias','mensual')
   and canal is not null and canal in('web','airbnb','marketplace','facebook','whatsapp','directo','otro') and huespedes is not null and huespedes>0 and precio_unitario is not null and precio_unitario>0
   and ((modalidad='dias' and meses is null) or (modalidad='mensual' and meses is not null and meses between 1 and 60)))
  or (clase<>'alquiler' and estado in('bloqueada','cancelada') and cliente_id is null and modalidad is null and meses is null and huespedes is null and precio_unitario is null)),
 constraint mapo_sin_cruces exclude using gist(departamento_id with =,daterange(entrada,salida,'[)') with &&)
 where(estado in('confirmada','en_curso','finalizada','bloqueada')));
create unique index reservas_origen on public.reservas(canal,referencia_canal) where referencia_canal is not null;
create unique index solicitudes_iguales on public.reservas(cliente_id,departamento_id,entrada,salida,modalidad) where estado='solicitada';
create index reservas_cliente on public.reservas(cliente_id,creado_en desc);
create index reservas_fechas on public.reservas(departamento_id,entrada,salida);
create table public.cuotas(id uuid primary key default gen_random_uuid(), reserva_id uuid not null references public.reservas on delete restrict,
 concepto text not null check(concepto in('alquiler','adicional','penalidad')), detalle text not null, vence date not null,
 importe numeric(12,2) not null check(importe>0), anulada boolean not null default false);
create index cuotas_reserva on public.cuotas(reserva_id,vence);
create table public.movimientos(id uuid primary key, cuota_id uuid not null references public.cuotas on delete restrict,
 tipo text not null check(tipo in('cobro','devolucion')), importe numeric(12,2) not null check(importe>0),
 fecha date not null, medio text not null check(medio in('efectivo','yape','plin','transferencia','tarjeta','airbnb','otro')), referencia text,
 registrado_por uuid references auth.users on delete set null, registrado_en timestamptz not null default now());
create index movimientos_cuota on public.movimientos(cuota_id,fecha); create index movimientos_mes on public.movimientos(fecha);
create table public.gastos(id uuid primary key, departamento_id uuid references public.departamentos on delete restrict, fecha date not null,
 categoria text not null check(categoria in('limpieza','mantenimiento','servicios','comision','otros')), detalle text not null check(btrim(detalle)<>''), importe numeric(12,2) not null check(importe>0),
 anulado boolean not null default false, registrado_por uuid references auth.users on delete set null);
create index gastos_mes on public.gastos(fecha);
create table public.garantias(id uuid primary key, reserva_id uuid not null references public.reservas on delete restrict, fecha date not null,
 tipo text not null check(tipo in('recibida','devuelta')), importe numeric(12,2) not null check(importe>0), referencia text, registrado_por uuid references auth.users on delete set null);
create index garantias_reserva on public.garantias(reserva_id);
create table mapo_privado.bitacora(id bigint generated always as identity primary key, fecha timestamptz not null default now(), actor uuid, tabla text not null, accion text not null, registro text, antes jsonb, despues jsonb);
revoke all on mapo_privado.bitacora from public,anon,authenticated;
create function mapo_privado.auditar() returns trigger language plpgsql security definer set search_path='' as $$
declare a jsonb; d jsonb;
begin if tg_op<>'INSERT' then a=to_jsonb(old); end if; if tg_op<>'DELETE' then d=to_jsonb(new); end if;
 insert into mapo_privado.bitacora(actor,tabla,accion,registro,antes,despues) values(auth.uid(),tg_table_name,tg_op,coalesce(d->>'id',a->>'id',d->>'usuario_id',a->>'usuario_id',d->>'departamento_id',a->>'departamento_id'),a,d);
 return null; end $$;
do $$declare t text;begin foreach t in array array['edificios','departamentos','servicios','departamento_servicios','fotos','reservas','cuotas','movimientos','gastos','garantias'] loop
 execute format('create trigger mapo_auditar after insert or update or delete on public.%I for each row execute function mapo_privado.auditar()',t); end loop;end $$;
create trigger mapo_auditar after insert or delete on mapo_privado.administradores for each row execute function mapo_privado.auditar();
