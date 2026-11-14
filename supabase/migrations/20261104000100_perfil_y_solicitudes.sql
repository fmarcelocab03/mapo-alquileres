-- Ampliación de MAPO. Preserva las cuentas, estancias y cobros existentes.
alter table public.clientes
 add column dni text check (dni ~ '^[0-9]{8}$'),
 add column ciudad text check (length(ciudad) between 1 and 100);
alter table public.reservas
 add column mensaje_huesped text check (length(mensaje_huesped) <= 600),
 add column contacto_nombre text check (length(contacto_nombre) between 1 and 150),
 add column contacto_celular text,
 add column solicitud_token uuid;
create unique index mapo_solicitud_token on public.reservas(cliente_id, solicitud_token) where solicitud_token is not null;

create function mapo_privado.celular_perfil(p_texto text) returns text
 language plpgsql immutable set search_path='' as $$
declare v text := nullif(regexp_replace(coalesce(p_texto,''), '[ ()-]', '', 'g'),'');
begin
 if v is not null and v !~ '^(9[0-9]{8}|[+][1-9][0-9]{7,14})$' then
   raise exception 'Indica un celular peruano de 9 dígitos o usa el prefijo internacional (+).';
 end if;
 return v;
end $$;
revoke all on function mapo_privado.celular_perfil(text) from public,anon,authenticated;
create function public.guardar_mi_ficha(p_nombre text,p_celular text,p_dni text,p_ciudad text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if nullif(btrim(p_nombre),'') is null or length(btrim(p_nombre))>150 then raise exception 'Revisa tu nombre.'; end if;
 update public.clientes set nombre=btrim(p_nombre), telefono=mapo_privado.celular_perfil(p_celular),
     dni=nullif(btrim(p_dni),''), ciudad=nullif(btrim(p_ciudad),'') where usuario_id=auth.uid();
 if not found then raise exception 'Tu cuenta no tiene un perfil activo.'; end if;
end $$;

-- Un nombre estable por usuario evita archivos huérfanos al reemplazar su foto.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mapo-avatares','mapo-avatares',false,2097152,array['image/jpeg']);
create policy mapo_avatar_leer on storage.objects for select to authenticated
 using (bucket_id='mapo-avatares' and name=(select auth.uid())::text||'/perfil.jpg');
create policy mapo_avatar_crear on storage.objects for insert to authenticated
 with check (bucket_id='mapo-avatares' and name=(select auth.uid())::text||'/perfil.jpg');
create policy mapo_avatar_reemplazar on storage.objects for update to authenticated
 using (bucket_id='mapo-avatares' and name=(select auth.uid())::text||'/perfil.jpg')
 with check (bucket_id='mapo-avatares' and name=(select auth.uid())::text||'/perfil.jpg');
create policy mapo_avatar_retirar on storage.objects for delete to authenticated
 using (bucket_id='mapo-avatares' and name=(select auth.uid())::text||'/perfil.jpg');

create function public.solicitar_estancia_web(p_operacion uuid,p_departamento uuid,p_modalidad text,
 p_entrada date,p_salida date,p_meses int,p_huespedes int,p_nombre text,p_celular text,p_mensaje text)
returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid; k uuid; anterior public.reservas%rowtype; tel text:=mapo_privado.celular_perfil(p_celular);
 nom text:=nullif(btrim(p_nombre),''); mensaje text:=nullif(btrim(p_mensaje),'');
begin
 if p_operacion is null or nom is null or length(nom)>150 or tel is null or length(mensaje)>600 then
  raise exception 'Revisa el nombre, celular y mensaje de la solicitud.'; end if;
 select id into strict c from public.clientes where usuario_id=auth.uid() for update;
 select * into anterior from public.reservas where cliente_id=c and solicitud_token=p_operacion;
 if found then
   if row(anterior.departamento_id,anterior.modalidad,anterior.entrada,
          case when anterior.modalidad='dias' then anterior.salida end,anterior.meses,anterior.huespedes,
          anterior.contacto_nombre,anterior.contacto_celular,anterior.mensaje_huesped)
      is distinct from row(p_departamento,p_modalidad,p_entrada,p_salida,p_meses,p_huespedes,nom,tel,mensaje)
   then raise exception 'Esta operación ya corresponde a otra solicitud.'; end if;
   return anterior.id;
 end if;
 k:=public.solicitar_reserva(p_departamento,p_modalidad,p_entrada,p_salida,p_meses,p_huespedes);
 update public.reservas set contacto_nombre=nom,contacto_celular=tel,mensaje_huesped=mensaje,solicitud_token=p_operacion where id=k;
 return k;
end $$;

-- El propietario habilita un gestor explícitamente. Ser administrador no basta para cambiar roles.
create table mapo_privado.gestores_roles(usuario_id uuid primary key references mapo_privado.administradores(usuario_id) on delete cascade);
revoke all on mapo_privado.gestores_roles from public,anon,authenticated;
create function public.puedo_gestionar_roles() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from mapo_privado.gestores_roles where usuario_id=(select auth.uid()))
$$;
create function public.equipo_mapo() returns table(usuario uuid,nombre text,correo text,confirmado boolean,administrador boolean,gestor boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 perform mapo_privado.exigir_admin();
 return query select c.usuario_id,c.nombre,a.email::text,a.email_confirmed_at is not null,
        ad.usuario_id is not null,g.usuario_id is not null
   from public.clientes c join auth.users a on a.id=c.usuario_id
   left join mapo_privado.administradores ad on ad.usuario_id=a.id
   left join mapo_privado.gestores_roles g on g.usuario_id=a.id order by lower(c.nombre),c.usuario_id;
end $$;
create function public.cambiar_rol_mapo(p_usuario uuid,p_admin boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(69110401);
 if not public.puedo_gestionar_roles() then raise exception 'Solo un gestor autorizado puede cambiar roles.' using errcode='42501'; end if;
 if p_usuario is null or p_admin is null or p_usuario=auth.uid() or exists(select from mapo_privado.gestores_roles where usuario_id=p_usuario) then
   raise exception 'El permiso de esta cuenta se administra por el propietario del proyecto.'; end if;
 if not exists(select from auth.users where id=p_usuario and email_confirmed_at is not null) then raise exception 'Verifica que la cuenta esté confirmada.'; end if;
 if p_admin then insert into mapo_privado.administradores values(p_usuario,now()) on conflict do nothing;
 else delete from mapo_privado.administradores where usuario_id=p_usuario; end if;
end $$;
create function public.eliminar_ficha_sin_historial(p_departamento uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform mapo_privado.exigir_admin();
 perform 1 from public.departamentos where id=p_departamento for update;
 if not found then raise exception 'Departamento inexistente.'; end if;
 if exists(select from public.reservas where departamento_id=p_departamento)
   or exists(select from public.gastos where departamento_id=p_departamento)
   or exists(select from public.fotos where departamento_id=p_departamento) then
   raise exception 'Tiene historial o fotos. Retira las fotos o usa Baja en inventario para conservar el historial.'; end if;
 delete from public.departamentos where id=p_departamento;
end $$;
revoke all on function public.guardar_mi_ficha(text,text,text,text),
 public.solicitar_estancia_web(uuid,uuid,text,date,date,int,int,text,text,text),
 public.puedo_gestionar_roles(),public.equipo_mapo(),public.cambiar_rol_mapo(uuid,boolean),
 public.eliminar_ficha_sin_historial(uuid) from public,anon,authenticated;
grant execute on function public.guardar_mi_ficha(text,text,text,text),
 public.solicitar_estancia_web(uuid,uuid,text,date,date,int,int,text,text,text),
 public.puedo_gestionar_roles(),public.equipo_mapo(),public.cambiar_rol_mapo(uuid,boolean),
 public.eliminar_ficha_sin_historial(uuid) to authenticated;
notify pgrst,'reload schema';

