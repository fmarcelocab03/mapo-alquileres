-- Ejecutar completo en un proyecto de desarrollo, con rol postgres. Todo termina en rollback.
begin;
insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values
 ('83000000-0000-4000-8000-000000000001','portal-admin@example.invalid','{"nombre":"Admin de prueba"}',now()),
 ('83000000-0000-4000-8000-000000000002','portal-huesped@example.invalid','{"nombre":"Huésped de prueba"}',now()),
 ('83000000-0000-4000-8000-000000000003','portal-otro@example.invalid','{"nombre":"Otra cuenta"}',now());
insert into mapo_privado.administradores(usuario_id) values('83000000-0000-4000-8000-000000000001');
insert into public.departamentos(id,edificio_id,codigo,nombre,capacidad,tarifa_dia,tarifa_mes,alta,publicado)
 select '84000000-0000-4000-8000-000000000001',id,'portal-rollback','Estancia de prueba',3,100,1800,current_date-2,true
 from public.edificios where nombre='Edificio Marcelo';
set local role authenticated;
select set_config('request.jwt.claim.sub','83000000-0000-4000-8000-000000000001',true);
update public.portal_config set galeria_titulo='Título de prueba';
insert into public.galeria_lugar(id,ruta,titulo,publicado) values
 ('85000000-0000-4000-8000-000000000001','lugar/85000000-0000-4000-8000-000000000001.jpg','Foto visible',true),
 ('85000000-0000-4000-8000-000000000002','lugar/85000000-0000-4000-8000-000000000002.jpg','Foto en borrador',false);
insert into storage.objects(bucket_id,name) values
 ('mapo-lugar','lugar/85000000-0000-4000-8000-000000000001.jpg'),
 ('mapo-lugar','lugar/85000000-0000-4000-8000-000000000002.jpg');
do $$begin
 if (select count(*) from public.galeria_lugar where titulo in('Foto visible','Foto en borrador'))<>2 then raise exception 'El admin no ve los borradores';end if;
 begin update public.portal_config set telefono='abc';raise exception 'Teléfono inválido aceptado';exception when check_violation then null;end;
 begin update public.galeria_lugar set categoria='privado';raise exception 'Categoría inválida aceptada';exception when check_violation then null;end;
 begin update public.galeria_lugar set ruta='lugar/otra.jpg';raise exception 'Ruta mutable';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin
 if not exists(select from public.portal_config where galeria_titulo='Título de prueba') then raise exception 'El portal público no puede leer contenido';end if;
 if exists(select from public.galeria_lugar where titulo='Foto en borrador') then raise exception 'Borrador visible para visitantes';end if;
 if not exists(select from storage.objects where name='lugar/85000000-0000-4000-8000-000000000001.jpg') then raise exception 'Foto publicada no visible';end if;
 if exists(select from storage.objects where name='lugar/85000000-0000-4000-8000-000000000002.jpg') then raise exception 'Archivo borrador visible';end if;
 begin update public.portal_config set galeria_titulo='Cambio anónimo';raise exception 'Visitante puede editar';exception when insufficient_privilege then null;end;
 begin perform public.mi_reserva_detalle(gen_random_uuid());raise exception 'Visitante puede invocar el detalle';exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','83000000-0000-4000-8000-000000000002',true);
do $$declare n integer;r uuid;begin
 update public.portal_config set galeria_titulo='Cambio de huésped';get diagnostics n=ROW_COUNT;
 if n<>0 then raise exception 'Huésped edita configuración';end if;
 update public.galeria_lugar set publicado=true where titulo='Foto en borrador';get diagnostics n=ROW_COUNT;
 if n<>0 then raise exception 'Huésped publica fotos';end if;
 begin insert into storage.objects(bucket_id,name) values('mapo-lugar','lugar/85000000-0000-4000-8000-000000000003.jpg');raise exception 'Huésped sube fotos del edificio';exception when insufficient_privilege then null;end;
 r=public.solicitar_estancia_web(gen_random_uuid(),'84000000-0000-4000-8000-000000000001','dias',current_date+20,current_date+22,null,2,'Huésped de prueba','912345678','Prueba de aislamiento');
 perform set_config('mapo_test.reserva',r::text,true);
 if public.mi_reserva_detalle(r)->'reserva'->>'estado'<>'solicitada' then raise exception 'No muestra su solicitud';end if;
end $$;
select set_config('request.jwt.claim.sub','83000000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.mi_reserva_detalle(current_setting('mapo_test.reserva')::uuid);raise exception 'Detalle ajeno expuesto';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','83000000-0000-4000-8000-000000000001',true);
do $$declare r uuid=current_setting('mapo_test.reserva')::uuid;q uuid;begin
 perform public.confirmar_reserva(r);
 select id into q from public.cuotas where reserva_id=r limit 1;
 perform public.registrar_movimiento(gen_random_uuid(),q,'cobro',25,(now() at time zone 'America/Lima')::date,'efectivo',null);
 update public.departamentos set publicado=false where id='84000000-0000-4000-8000-000000000001';
 update public.galeria_lugar set publicado=false where id='85000000-0000-4000-8000-000000000001';
end $$;
select set_config('request.jwt.claim.sub','83000000-0000-4000-8000-000000000002',true);
do $$declare d jsonb;begin
 d=public.mi_reserva_detalle(current_setting('mapo_test.reserva')::uuid);
 if d->'departamento'->>'nombre'<>'Estancia de prueba' then raise exception 'Perdió el nombre de su estancia retirada del catálogo';end if;
 if d->'reserva'->>'estado'<>'confirmada' then raise exception 'Estado desactualizado';end if;
 if jsonb_array_length(d->'cuotas')<>1 or (d->'cuotas'->0->>'cobrado_neto')::numeric<>25
  or (d->'cuotas'->0->>'saldo')::numeric<>175 then raise exception 'Cuotas de la reserva incorrectas';end if;
 if exists(select from public.cuotas) then raise exception 'La tabla de caja quedó expuesta al huésped';end if;
 if exists(select from storage.objects where name='lugar/85000000-0000-4000-8000-000000000001.jpg') then raise exception 'Foto oculta sigue permitiendo nuevas lecturas';end if;
end $$;
reset role;
do $$begin
 if not exists(select from storage.buckets where id='mapo-lugar' and not public and file_size_limit=3145728 and allowed_mime_types=array['image/jpeg']) then raise exception 'Bucket incorrecto';end if;
end $$;
rollback;
