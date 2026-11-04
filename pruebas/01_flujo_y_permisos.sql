-- SOLO en desarrollo, como postgres. Corre el archivo entero; termina en ROLLBACK.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-4000-a000-000000000001','admin-mapo@example.invalid','{"nombre":"Admin de prueba"}'),
 ('10000000-0000-4000-a000-000000000002','a-mapo@example.invalid','{"nombre":"Cliente A","role":"admin"}'),
 ('10000000-0000-4000-a000-000000000003','b-mapo@example.invalid','{"nombre":"Cliente B"}');
insert into mapo_privado.administradores values('10000000-0000-4000-a000-000000000001',now());
insert into public.departamentos(id,edificio_id,codigo,nombre,capacidad,tarifa_dia,tarifa_mes,alta,publicado)
 select '20000000-0000-4000-a000-000000000001',id,'prueba-rollback','Solo para prueba',3,100,1800,'2020-01-01',true from public.edificios where nombre='Edificio Marcelo';
set local role anon;
do $$begin
 if not exists(select from public.departamentos where codigo='prueba-rollback') or exists(select from public.departamentos where not publicado) then raise exception 'Fallo de visibilidad pública';end if;
 begin perform count(*) from public.clientes;raise exception 'Anon pudo leer clientes';exception when insufficient_privilege then null;end;
end $$;
reset role;set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-a000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-a000-000000000002","role":"authenticated"}',true);
do $$declare d uuid='20000000-0000-4000-a000-000000000001';h date=(now() at time zone 'America/Lima')::date; k uuid;
begin if public.soy_admin() then raise exception 'Escalada desde metadatos'; end if;
 if (select count(*) from public.clientes)<>1 then raise exception 'Perfil ajeno visible';end if;
 begin perform public.resumen_mensual(2030);raise exception 'Reporte expuesto';exception when insufficient_privilege then null;end;
 begin insert into mapo_privado.administradores(usuario_id) values(auth.uid());raise exception 'El cliente pudo darse privilegios';exception when insufficient_privilege then null;end;
 begin perform mapo_privado.confirmar(gen_random_uuid());raise exception 'Auxiliar privado expuesto';exception when insufficient_privilege then null;end;
 begin insert into public.movimientos(id) values(gen_random_uuid());raise exception 'Inserción financiera directa';exception when insufficient_privilege then null;end;
 insert into public.favoritos values(auth.uid(),d);
 k=public.solicitar_reserva(d,'dias',h+5,h+7,null,2);perform set_config('mapotest.reserva',k::text,true);
 begin perform public.confirmar_reserva(k);raise exception 'Confirmación por cliente';exception when insufficient_privilege then null;end;
 if not exists(select from public.disponibles(h+5,h+7,'dias',1) where departamento_id=d) then raise exception 'Una solicitud bloqueó fechas';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-a000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-a000-000000000003","role":"authenticated"}',true);
do $$declare k uuid=current_setting('mapotest.reserva')::uuid;begin
 if exists(select from public.reservas where id=k) or exists(select from public.favoritos) then raise exception 'Datos de A visibles para B';end if;
 begin perform public.cancelar(k,'no es mía');raise exception 'B canceló la reserva de A';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-a000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-a000-000000000001","role":"authenticated"}',true);
do $$declare d uuid='20000000-0000-4000-a000-000000000001';h date=(now() at time zone 'America/Lima')::date;k uuid=current_setting('mapotest.reserva')::uuid;
 c uuid;q uuid;op uuid=gen_random_uuid(); a numeric; x record; base record; v_mes date=date_trunc('month',h)::date; anio int=extract(year from h); sig date=make_date(anio+1,1,31); otro uuid;begin
 select * into base from public.resumen_mensual(anio) v where v.mes=v_mes;
 perform public.confirmar_reserva(k);
 if exists(select from public.disponibles(h+5,h+7,'dias',1) where departamento_id=d) then raise exception 'Disponibilidad incorrecta';end if;
 if not exists(select from public.estado_departamentos(h+6) v where v.departamento_id=d and v.estado='reservado' and v.hasta=h+7) then raise exception 'Salida no coincide';end if;
 begin perform public.bloquear(d,h+6,h+9,'mantenimiento','Cruce');raise exception 'Aceptó un solapamiento';exception when exclusion_violation then null;end;
 perform public.bloquear(d,h+7,h+8,'mantenimiento','Mismo día de salida');
 select id into strict q from public.cuotas where reserva_id=k and importe=200;
 perform public.registrar_movimiento(op,q,'cobro',75,h,'yape','Prueba');
 perform public.registrar_movimiento(op,q,'cobro',75,h,'yape','Prueba');
 select * into strict x from public.saldos_cuotas where id=q;
 if x.saldo<>125 or x.estado_pago<>'parcial' then raise exception 'Cálculo de pago parcial o idempotencia';end if;
 begin perform public.registrar_movimiento(gen_random_uuid(),q,'cobro',130,h,'efectivo');raise exception 'Aceptó sobrecobro';exception when raise_exception then if sqlerrm='Aceptó sobrecobro' then raise;end if;end;
 perform public.registrar_movimiento(gen_random_uuid(),q,'cobro',125,h,'efectivo');
 if not exists(select from public.saldos_cuotas where id=q and estado_pago='pagada' and saldo=0) then raise exception 'Liquidación incorrecta';end if;
 perform public.registrar_garantia(gen_random_uuid(),k,'recibida',300,h);
 perform public.registrar_gasto(gen_random_uuid(),d,h,'limpieza','Prueba',25);
 perform public.cancelar(k,'Ejemplo de cancelación'); select por_devolver into strict a from public.saldos_cuotas where id=q;
 if a<>200 then raise exception 'No reconoció dinero por devolver';end if;
 perform public.registrar_movimiento(gen_random_uuid(),q,'devolucion',50,h,'yape');
 select * into strict x from public.resumen_mensual(anio) v where v.mes=v_mes;
 if x.cobros-base.cobros<>200 or x.devoluciones-base.devoluciones<>50 or x.gastos-base.gastos<>25 or x.resultado_caja-base.resultado_caja<>125 then raise exception 'Dashboard duplicó movimientos o incluyó garantías';end if;
 c=public.cliente_externo('Huésped externo',null,'000-prueba');
 otro=public.reserva_externa(d,c,'mensual',sig,null,3,2,'airbnb','TEST-ROLLBACK',1800);
 if (select count(*) from public.cuotas where reserva_id=otro)<>3 or not exists(select from public.cuotas where reserva_id=otro and vence=make_date(anio+1,3,31)) then raise exception 'Vencimientos mensuales incorrectos';end if;
 if (select noches_vendidas from public.resumen_mensual(anio+1) v where v.mes=make_date(anio+1,2,1)) < (make_date(anio+1,3,1)-make_date(anio+1,2,1)) then raise exception 'Estancia entre meses incorrecta';end if;
end $$;
reset role;
rollback;
