-- Proyecto dedicado. Cambiamos únicamente los GRANT de los objetos MAPO, no los de otras apps.
do $$declare t text;begin foreach t in array array['clientes','edificios','departamentos','servicios','departamento_servicios','fotos','favoritos','reservas','cuotas','movimientos','gastos','garantias'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on table public.%I from public,anon,authenticated',t); end loop;end $$;
grant usage on schema public to anon,authenticated;
grant select on public.edificios,public.departamentos,public.servicios,public.departamento_servicios,public.fotos to anon,authenticated;
grant insert,update on public.edificios,public.departamentos to authenticated;
grant insert,update,delete on public.servicios,public.departamento_servicios,public.fotos to authenticated;
do $$declare t text;begin foreach t in array array['edificios','departamentos','servicios','departamento_servicios','fotos'] loop
 execute format('create policy catalogo_admin on public.%I for all to authenticated using ((select mapo_privado.es_admin())) with check ((select mapo_privado.es_admin()))',t);end loop;end $$;
create policy unidades_publicadas on public.departamentos for select to anon,authenticated using(publicado and (baja is null or baja>(now() at time zone 'America/Lima')::date));
create policy edificios_visibles on public.edificios for select to anon,authenticated using(exists(select from public.departamentos d where d.edificio_id=edificios.id));
create policy servicios_lectura on public.servicios for select to anon,authenticated using(true);
create policy servicios_visibles on public.departamento_servicios for select to anon,authenticated using(exists(select from public.departamentos d where d.id=departamento_servicios.departamento_id));
create policy fotos_visibles on public.fotos for select to anon,authenticated using(exists(select from public.departamentos d where d.id=fotos.departamento_id));
grant select on public.clientes,public.reservas,public.cuotas,public.movimientos,public.gastos,public.garantias to authenticated;
create policy clientes_lectura on public.clientes for select to authenticated using(usuario_id=(select auth.uid()) or (select mapo_privado.es_admin()));
create policy reservas_lectura on public.reservas for select to authenticated using((select mapo_privado.es_admin()) or exists(select from public.clientes c where c.id=reservas.cliente_id and c.usuario_id=(select auth.uid())));
do $$declare t text;begin foreach t in array array['cuotas','movimientos','gastos','garantias'] loop
 execute format('create policy caja_admin on public.%I for select to authenticated using ((select mapo_privado.es_admin()))',t);end loop;end $$;
revoke all on public.saldos_cuotas from public,anon,authenticated;grant select on public.saldos_cuotas to authenticated;
grant select,insert,delete on public.favoritos to authenticated;
create policy fav_leer on public.favoritos for select to authenticated using(usuario_id=(select auth.uid()));
create policy fav_agregar on public.favoritos for insert to authenticated with check(usuario_id=(select auth.uid()) and exists(select from public.departamentos d where d.id=departamento_id and d.publicado));
create policy fav_quitar on public.favoritos for delete to authenticated using(usuario_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('mapo-fotos','mapo-fotos',false,5242880,array['image/jpeg','image/png','image/webp']);
-- SELECT en Storage solo para las fotos visibles en el catálogo; el administrador también puede ver borradores/archivos huérfanos.
create policy mapo_foto_lectura on storage.objects for select to anon,authenticated using(bucket_id='mapo-fotos' and exists(select from public.fotos f where f.ruta=objects.name));
create policy mapo_foto_admin_leer on storage.objects for select to authenticated using(bucket_id='mapo-fotos' and (select mapo_privado.es_admin()));
create policy mapo_foto_admin_alta on storage.objects for insert to authenticated with check(bucket_id='mapo-fotos' and (select mapo_privado.es_admin()) and
 name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]+[.](jpg|jpeg|png|webp)$' and exists(select from public.departamentos d where d.id::text=split_part(objects.name,'/',1)));
create policy mapo_foto_admin_baja on storage.objects for delete to authenticated using(bucket_id='mapo-fotos' and (select mapo_privado.es_admin()));
create function public.historial_registro(p_id uuid) returns table(fecha timestamptz,actor uuid,tabla text,accion text,antes jsonb,despues jsonb) language plpgsql stable security definer set search_path='' as $$
begin perform mapo_privado.exigir_admin();return query select b.fecha,b.actor,b.tabla,b.accion,b.antes,b.despues from mapo_privado.bitacora b where b.registro=p_id::text order by b.id desc limit 250;end $$;
-- Revoca las concesiones implícitas de EXECUTE antes de conceder la lista de funciones permitidas.
revoke all on all functions in schema mapo_privado from public,anon,authenticated;
grant execute on function mapo_privado.es_admin() to authenticated;
do $$declare r record;begin for r in select p.oid::regprocedure as firma,p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array[
'soy_admin','actualizar_mi_perfil','cliente_externo','disponibles','solicitar_reserva','confirmar_reserva','reserva_externa','bloquear','cancelar','registrar_paso','agregar_cuota','registrar_movimiento','registrar_gasto','anular_gasto','registrar_garantia','estado_departamentos','resumen_mensual','historial_registro']) loop
 execute format('revoke all on function %s from public,anon,authenticated',r.firma);
 execute format('grant execute on function %s to authenticated',r.firma);
 if r.proname='disponibles' then execute format('grant execute on function %s to anon',r.firma); end if;end loop;end $$;
insert into public.edificios(nombre,ciudad) values('Edificio Marcelo','Huancayo');
insert into public.departamentos(edificio_id,codigo,nombre) select e.id,v.c,v.n from public.edificios e cross join(values('gris','Departamento gris'),('verde','Departamento verde')) v(c,n) where e.nombre='Edificio Marcelo';
insert into public.servicios(nombre) values('Wi-Fi'),('Cocina'),('Estacionamiento'),('Lavandería'),('Ascensor');
notify pgrst,'reload schema';
