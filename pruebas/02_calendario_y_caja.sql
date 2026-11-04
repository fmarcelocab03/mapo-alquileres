-- En desarrollo después de migrar. Datos sintéticos; no requiere usuarios previos.
begin;
insert into auth.users(id,email,raw_user_meta_data) values('11000000-0000-4000-a000-000000000001','fechas-mapo@example.invalid','{"nombre":"Operación de prueba"}');
insert into mapo_privado.administradores(usuario_id) values('11000000-0000-4000-a000-000000000001');
set local role authenticated;select set_config('request.jwt.claim.sub','11000000-0000-4000-a000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-a000-000000000001","role":"authenticated"}',true);
do $$declare h date=(now() at time zone 'America/Lima')::date; c uuid; d uuid; r uuid;q uuid;g uuid;
begin
 select id into c from public.clientes where usuario_id=auth.uid();insert into public.departamentos(edificio_id,codigo,nombre,capacidad,tarifa_dia,alta,publicado)
 select id,'test-cal','Caso de salida',2,120,h-20,true from public.edificios where nombre='Edificio Marcelo' returning id into d;
 r=public.reserva_externa(d,c,'dias',h-2,h+2,null,1,'directo'); select id into q from public.cuotas where reserva_id=r;
 perform public.registrar_paso(r,'ingreso');perform public.salida_anticipada(r,'Entrega de llaves anticipada');
 if not exists(select from public.estado_departamentos(h) e where e.departamento_id=d and e.estado='libre') then raise exception 'Salida anticipada no liberó fechas';end if;
 if not exists(select from public.saldos_cuotas where id=q and importe=480) then raise exception 'Se alteró el precio pactado';end if;
 perform public.anular_cuota(q,'Reacuerdo documentado'); q=public.agregar_cuota(r,'adicional','Ajuste acordado por dos noches',h,240);
 perform public.registrar_movimiento(gen_random_uuid(),q,'cobro',120,h,'efectivo');
 begin perform public.registrar_movimiento(gen_random_uuid(),q,'devolucion',121,h,'efectivo');raise exception 'Devolución excesiva';exception when raise_exception then if sqlerrm='Devolución excesiva' then raise;end if;end;
 g=public.registrar_gasto(gen_random_uuid(),d,h,'limpieza','Duplicado manual',32);perform public.anular_gasto(g,'Corrección');
 if not exists(select from public.gastos where id=g and anulado) then raise exception 'No anuló el gasto';end if;
 if not exists(select from public.historial_registro(r) a where a.accion='UPDATE') then raise exception 'No hay trazabilidad';end if;
 begin update public.departamentos set alta=h where id=d;raise exception 'Permitió borrar noches históricas';exception when raise_exception then if sqlerrm='Permitió borrar noches históricas' then raise;end if;end;
end $$;reset role;rollback;
