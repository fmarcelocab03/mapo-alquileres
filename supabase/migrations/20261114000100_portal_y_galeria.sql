-- MAPO · contenido del portal, galería del edificio y detalle privado de reservas.
-- Se añade a las seis migraciones anteriores. No reinicia el inventario ni las cuentas.
create table public.portal_config (
 id boolean primary key default true check (id),
 galeria_titulo text not null default 'Conoce el lugar de tu próxima historia' check (length(btrim(galeria_titulo)) between 1 and 100),
 galeria_texto text not null default 'Recorre el Edificio Marcelo, descubre sus ambientes e imagina cómo será sentirte en casa, en Huancayo.' check (length(btrim(galeria_texto)) between 1 and 500),
 sobre_texto text not null default 'En MAPO te acompañamos a encontrar tu espacio en Huancayo. En el Edificio Marcelo puedes elegir una estancia por días o un alquiler mensual, consultar los ambientes y organizar tu llegada desde un mismo lugar.' check (length(btrim(sobre_texto)) between 1 and 1800),
 whatsapp text check (whatsapp is null or whatsapp ~ '^[1-9][0-9]{7,14}$'),
 telefono text check (telefono is null or telefono ~ '^\+[1-9][0-9]{7,14}$'),
 correo text check (correo is null or (length(correo)<=254 and correo ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
 ubicacion text not null default 'Huancayo, Junín, Perú' check (length(btrim(ubicacion)) between 1 and 300),
 horario text not null default 'Coordina tu visita con MAPO.' check (length(btrim(horario)) between 1 and 200),
 condiciones_disponibilidad text not null default 'Consulta las fechas y la cantidad de huéspedes antes de enviar tu solicitud. MAPO revisará la disponibilidad y confirmará tu estancia. Una solicitud pendiente todavía no separa el departamento.' check (length(btrim(condiciones_disponibilidad)) between 1 and 2000),
 condiciones_pagos text not null default 'Revisa la tarifa, el importe total, los servicios incluidos y la garantía, cuando corresponda. Coordina con MAPO los medios y las fechas de pago. La solicitud en la web no realiza un cobro.' check (length(btrim(condiciones_pagos)) between 1 and 2000),
 condiciones_llegada text not null default 'Coordina con MAPO el horario de ingreso, la salida y la entrega de llaves antes de tu llegada. La fecha de salida es el primer día libre para una nueva estancia.' check (length(btrim(condiciones_llegada)) between 1 and 2000),
 condiciones_cambios text not null default 'Consulta con MAPO las condiciones aplicables a modificaciones, cancelaciones y devoluciones antes de confirmar. Puedes retirar una solicitud pendiente desde Mis reservas. Para una estancia confirmada, comunícate con MAPO.' check (length(btrim(condiciones_cambios)) between 1 and 2000),
 actualizado_en timestamptz not null default clock_timestamp()
);
-- Se conservan los canales que ya utilizaba el portal. El administrador puede editarlos.
insert into public.portal_config(id,whatsapp,telefono,correo)
 values(true,'51910408009','+51910408009','fmarcelocab03@gmail.com');
alter table public.portal_config enable row level security;
revoke all on public.portal_config from public,anon,authenticated;
grant select on public.portal_config to anon,authenticated;
grant update(galeria_titulo,galeria_texto,sobre_texto,whatsapp,telefono,correo,ubicacion,horario,
 condiciones_disponibilidad,condiciones_pagos,condiciones_llegada,condiciones_cambios) on public.portal_config to authenticated;
create policy portal_lectura on public.portal_config for select to anon,authenticated using(true);
create policy portal_editar on public.portal_config for update to authenticated
 using((select mapo_privado.es_admin())) with check((select mapo_privado.es_admin()));

create table public.galeria_lugar (
 id uuid primary key default gen_random_uuid(),
 ruta text not null unique check(ruta='lugar/'||id::text||'.jpg'),
 titulo text not null check(length(btrim(titulo)) between 1 and 100),
 descripcion text not null default '' check(length(descripcion)<=500),
 categoria text not null default 'edificio' check(categoria in('edificio','ambientes','entorno')),
 orden integer not null default 0 check(orden between 0 and 9999),
 publicado boolean not null default false,
 creado_en timestamptz not null default now(),
 actualizado_en timestamptz not null default clock_timestamp()
);
create index galeria_lugar_orden on public.galeria_lugar(orden,creado_en,id);
alter table public.galeria_lugar enable row level security;
revoke all on public.galeria_lugar from public,anon,authenticated;
grant select on public.galeria_lugar to anon,authenticated;
grant insert,delete on public.galeria_lugar to authenticated;
grant update(titulo,descripcion,categoria,orden,publicado) on public.galeria_lugar to authenticated;
create policy galeria_publicada on public.galeria_lugar for select to anon,authenticated using(publicado);
create policy galeria_admin on public.galeria_lugar for all to authenticated
 using((select mapo_privado.es_admin())) with check((select mapo_privado.es_admin()));

create function mapo_privado.marcar_contenido() returns trigger language plpgsql set search_path='' as $$
begin new.actualizado_en=clock_timestamp();return new;end $$;
revoke all on function mapo_privado.marcar_contenido() from public,anon,authenticated;
create trigger portal_fecha before update on public.portal_config for each row execute function mapo_privado.marcar_contenido();
create trigger galeria_fecha before update on public.galeria_lugar for each row execute function mapo_privado.marcar_contenido();
create trigger mapo_auditar after update on public.portal_config for each row execute function mapo_privado.auditar();
create trigger mapo_auditar after insert or update or delete on public.galeria_lugar for each row execute function mapo_privado.auditar();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('mapo-lugar','mapo-lugar',false,3145728,array['image/jpeg']);
create policy lugar_lectura on storage.objects for select to anon,authenticated
 using(bucket_id='mapo-lugar' and exists(select from public.galeria_lugar g where g.ruta=objects.name));
create policy lugar_admin_lectura on storage.objects for select to authenticated
 using(bucket_id='mapo-lugar' and (select mapo_privado.es_admin()));
create policy lugar_admin_alta on storage.objects for insert to authenticated
 with check(bucket_id='mapo-lugar' and (select mapo_privado.es_admin())
 and name ~ '^lugar/[0-9a-f-]{36}[.]jpg$');
create policy lugar_admin_baja on storage.objects for delete to authenticated
 using(bucket_id='mapo-lugar' and (select mapo_privado.es_admin()));
-- Los archivos usan nombres nuevos e inmutables. No se concede UPDATE de objetos.

create function public.mi_reserva_detalle(p_reserva uuid) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare r public.reservas%rowtype; dep jsonb; cuotas jsonb; garantia jsonb;
begin
 select x.* into r from public.reservas x join public.clientes c on c.id=x.cliente_id
 where x.id=p_reserva and x.clase='alquiler' and c.usuario_id=(select auth.uid());
 if not found then raise exception 'Esta reserva no está disponible para tu cuenta.' using errcode='42501';end if;
 select jsonb_build_object('nombre',d.nombre,'codigo',d.codigo,'edificio',e.nombre,'ciudad',e.ciudad,
  'publicado',d.publicado and (d.baja is null or d.baja>(now() at time zone 'America/Lima')::date)) into dep
 from public.departamentos d join public.edificios e on e.id=d.edificio_id where d.id=r.departamento_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'detalle',s.detalle,'vence',s.vence,'importe',s.importe,
  'cobrado_neto',s.cobrado_neto,'saldo',s.saldo,'por_devolver',s.por_devolver,'estado_pago',s.estado_pago,
  'vencida',s.vencida,'anulada',s.anulada) order by s.vence,s.id),'[]'::jsonb) into cuotas
 from public.saldos_cuotas s where s.reserva_id=r.id;
 select jsonb_build_object('recibida',coalesce(sum(g.importe) filter(where g.tipo='recibida'),0),
  'devuelta',coalesce(sum(g.importe) filter(where g.tipo='devuelta'),0)) into garantia
 from public.garantias g where g.reserva_id=r.id;
 return jsonb_build_object('reserva',jsonb_build_object('id',r.id,'departamento_id',r.departamento_id,
  'estado',r.estado,'modalidad',r.modalidad,'entrada',r.entrada,'salida',r.salida,'meses',r.meses,
  'huespedes',r.huespedes,'precio_unitario',r.precio_unitario,'creado_en',r.creado_en,
  'contacto_nombre',r.contacto_nombre,'contacto_celular',r.contacto_celular,'mensaje_huesped',r.mensaje_huesped,
  'motivo',r.motivo),'departamento',dep,'cuotas',cuotas,'garantia',garantia);
end $$;
revoke all on function public.mi_reserva_detalle(uuid) from public,anon,authenticated;
grant execute on function public.mi_reserva_detalle(uuid) to authenticated;
notify pgrst,'reload schema';
