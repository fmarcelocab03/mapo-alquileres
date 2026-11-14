-- Solo en desarrollo. Ejecutar completo en SQL Editor con rol postgres.
begin;
insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values
 ('81000000-0000-4000-b000-000000000001','mapo-perfil-a@example.invalid','{"nombre":"Huésped A"}',now()),
 ('81000000-0000-4000-b000-000000000002','mapo-perfil-b@example.invalid','{"nombre":"Huésped B"}',now());
insert into public.departamentos(id,edificio_id,codigo,nombre,capacidad,tarifa_dia,tarifa_mes,alta,publicado)
 select '82000000-0000-4000-b000-000000000001',id,'prueba-perfil-rollback','Ficha de prueba',2,100,1800,current_date-2,true
 from public.edificios where nombre='Edificio Marcelo';
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-b000-000000000001',true);
do $$
declare dep uuid:='82000000-0000-4000-b000-000000000001'; op uuid:=gen_random_uuid(); k uuid; h date:=current_date+14;
begin
 perform public.guardar_mi_ficha('Huésped A','+51 912 345 678','01234567','Huancayo');
 if not exists(select from public.clientes where usuario_id=auth.uid() and dni='01234567' and telefono='+51912345678') then raise exception 'No se guardó el perfil'; end if;
 begin perform public.guardar_mi_ficha('Huésped A','912345678','12','Lima');raise exception 'DNI inválido aceptado';exception when check_violation then null;end;
 k:=public.solicitar_estancia_web(op,dep,'dias',h,h+2,null,2,'Huésped A','912345678','Llegada por la tarde');
 if k<>public.solicitar_estancia_web(op,dep,'dias',h,h+2,null,2,'Huésped A','912345678','Llegada por la tarde') then raise exception 'Se duplicó la solicitud';end if;
 if not exists(select from public.reservas where id=k and estado='solicitada' and mensaje_huesped='Llegada por la tarde' and contacto_celular='912345678') then raise exception 'Reserva incompleta';end if;
 k:=public.solicitar_estancia_web(gen_random_uuid(),dep,'mensual',h,null,3,1,'Huésped A','912345678',null);
 if not exists(select from public.reservas where id=k and salida=(h+interval '3 months')::date) then raise exception 'Cálculo mensual incorrecto';end if;
 begin perform public.cambiar_rol_mapo(auth.uid(),true);raise exception 'Escalada de rol';exception when insufficient_privilege then null;end;
 begin perform public.equipo_mapo();raise exception 'Directorio administrativo expuesto';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','81000000-0000-4000-b000-000000000002',true);
do $$begin
 if exists(select from public.clientes where dni='01234567') or exists(select from public.reservas) then raise exception 'Se filtraron datos entre huéspedes';end if;
end $$;
reset role;
do $$begin
 if not exists(select from storage.buckets where id='mapo-avatares' and not public) then raise exception 'Bucket de avatares no privado';end if;
end $$;
rollback;

