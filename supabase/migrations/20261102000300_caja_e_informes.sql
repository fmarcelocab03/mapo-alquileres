create function public.agregar_cuota(p_reserva uuid,p_concepto text,p_detalle text,p_vence date,p_importe numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare k uuid;r public.reservas%rowtype;begin perform mapo_privado.exigir_admin();
 select * into strict r from public.reservas where id=p_reserva for update;
 if not mapo_privado.importe_valido(p_importe) or nullif(trim(p_detalle),'') is null or r.clase<>'alquiler' or r.estado='solicitada' or p_concepto not in('adicional','penalidad') or (r.estado='cancelada' and p_concepto<>'penalidad') then raise exception 'Cargo no válido';end if;
 insert into public.cuotas(reserva_id,concepto,detalle,vence,importe) values(p_reserva,p_concepto,p_detalle,p_vence,p_importe) returning id into k;return k;end $$;
create function public.registrar_movimiento(p_operacion uuid,p_cuota uuid,p_tipo text,p_importe numeric,p_fecha date,p_medio text,p_referencia text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.cuotas%rowtype; m public.movimientos%rowtype; neto numeric; ultima date;begin perform mapo_privado.exigir_admin();
 if p_operacion is null or not mapo_privado.importe_valido(p_importe) or p_fecha is null or p_fecha>mapo_privado.hoy() then raise exception 'Revisa operación, importe y fecha efectiva';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_operacion::text,0));select * into m from public.movimientos where id=p_operacion;
 if found then if row(m.cuota_id,m.tipo,m.importe,m.fecha,m.medio,m.referencia) is not distinct from row(p_cuota,p_tipo,p_importe,p_fecha,p_medio,p_referencia) then return m.id;end if;raise exception 'Identificador ya usado con otros datos';end if;
 select * into strict c from public.cuotas where id=p_cuota for update;
 select coalesce(sum(case when tipo='cobro' then importe else -importe end),0),max(fecha) into neto,ultima from public.movimientos where cuota_id=c.id;
 if p_fecha<ultima then raise exception 'Registra los movimientos de una cuota en orden de fecha';end if;
 if (p_tipo='cobro' and (c.anulada or neto+p_importe>c.importe)) or (p_tipo='devolucion' and p_importe>neto) then raise exception 'El importe supera el saldo cobrable o reembolsable';end if;
 insert into public.movimientos(id,cuota_id,tipo,importe,fecha,medio,referencia,registrado_por) values(p_operacion,c.id,p_tipo,p_importe,p_fecha,p_medio,p_referencia,auth.uid());return p_operacion;end $$;
create function public.registrar_gasto(p_operacion uuid,p_departamento uuid,p_fecha date,p_categoria text,p_detalle text,p_importe numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare g public.gastos%rowtype;begin perform mapo_privado.exigir_admin();
 if not mapo_privado.importe_valido(p_importe) or p_fecha is null or p_fecha>mapo_privado.hoy() or p_operacion is null then raise exception 'Revisa importe y fecha del gasto';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_operacion::text,0));select * into g from public.gastos where id=p_operacion;
 if found then if row(g.departamento_id,g.fecha,g.categoria,g.detalle,g.importe) is not distinct from row(p_departamento,p_fecha,p_categoria,p_detalle,p_importe) then return g.id;end if;raise exception 'Identificador repetido con otros datos';end if;
 insert into public.gastos(id,departamento_id,fecha,categoria,detalle,importe,registrado_por) values(p_operacion,p_departamento,p_fecha,p_categoria,p_detalle,p_importe,auth.uid());return p_operacion;end $$;
create function public.anular_gasto(p_gasto uuid,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
begin perform mapo_privado.exigir_admin(); if nullif(trim(p_motivo),'') is null then raise exception 'Indica el motivo';end if;
 update public.gastos set anulado=true,detalle=detalle||' | Anulación: '||p_motivo where id=p_gasto and not anulado;
 if not found then raise exception 'Gasto no disponible para anular';end if;end $$;
create function public.registrar_garantia(p_operacion uuid,p_reserva uuid,p_tipo text,p_importe numeric,p_fecha date,p_referencia text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare g public.garantias%rowtype;r public.reservas%rowtype; neto numeric;ultima date;begin perform mapo_privado.exigir_admin();
 if not mapo_privado.importe_valido(p_importe) or p_fecha is null or p_fecha>mapo_privado.hoy() or p_operacion is null then raise exception 'Revisa fecha e importe de la garantía';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_operacion::text,0));select * into g from public.garantias where id=p_operacion;
 if found then if row(g.reserva_id,g.tipo,g.importe,g.fecha,g.referencia) is not distinct from row(p_reserva,p_tipo,p_importe,p_fecha,p_referencia) then return g.id;end if;raise exception 'Identificador repetido con otros datos';end if;
 select * into strict r from public.reservas where id=p_reserva for update;
 if r.clase<>'alquiler' or r.estado='solicitada' or (r.estado='cancelada' and p_tipo='recibida') then raise exception 'Esta reserva no admite la operación';end if;
 select coalesce(sum(case when tipo='recibida' then importe else -importe end),0),max(fecha) into neto,ultima from public.garantias where reserva_id=r.id;
 if p_fecha<ultima or (p_tipo='devuelta' and p_importe>neto) then raise exception 'Revisa saldo y orden de las garantías';end if;
 insert into public.garantias values(p_operacion,r.id,p_fecha,p_tipo,p_importe,p_referencia,auth.uid());return p_operacion;end $$;
-- Solo administrativos: visible en la API, pero sin acceso a las tablas subyacentes para otros roles.
create view public.saldos_cuotas with (security_invoker=true) as
 with m as (select cuota_id,sum(case when tipo='cobro' then importe else -importe end) as neto from public.movimientos group by cuota_id),
 b as (select c.*,coalesce(m.neto,0) cobrado_neto,case when c.anulada then 0 else c.importe end previsto from public.cuotas c left join m on m.cuota_id=c.id)
 select b.*,greatest(previsto-cobrado_neto,0) saldo, greatest(cobrado_neto-previsto,0) por_devolver,
 case when anulada then 'anulada' when cobrado_neto=0 then 'pendiente' when cobrado_neto<previsto then 'parcial' else 'pagada' end estado_pago,
 vence<(now() at time zone 'America/Lima')::date and previsto>cobrado_neto vencida from b;
create function public.estado_departamentos(p_fecha date) returns table(departamento_id uuid,codigo text,nombre text,estado text,reserva_id uuid,cliente text,hasta date,proxima_entrada date)
language plpgsql stable security definer set search_path='' as $$
begin perform mapo_privado.exigir_admin();return query
 select d.id,d.codigo,d.nombre,case when d.alta is null or p_fecha<d.alta or p_fecha>=d.baja then 'fuera de inventario' when r.id is null then 'libre'
 when r.clase<>'alquiler' then r.clase when r.estado='confirmada' then 'reservado' else 'ocupado' end,r.id,c.nombre,r.salida,
 (select min(z.entrada) from public.reservas z where z.departamento_id=d.id and z.entrada>p_fecha and z.estado in('confirmada','en_curso','bloqueada','finalizada'))
 from public.departamentos d left join public.reservas r on r.departamento_id=d.id and r.entrada<=p_fecha and r.salida>p_fecha and r.estado in('confirmada','en_curso','finalizada','bloqueada')
 left join public.clientes c on c.id=r.cliente_id order by d.codigo;
end $$;
create function public.resumen_mensual(p_anio int) returns table(mes date,noches_inventario bigint,noches_bloqueadas bigint,noches_vendidas bigint,ocupacion_pct numeric,cobros numeric,devoluciones numeric,gastos numeric,resultado_caja numeric,pendiente_hoy_por_vencimiento numeric)
language plpgsql stable security definer set search_path='' as $$
begin perform mapo_privado.exigir_admin();if p_anio is null or p_anio not between 2000 and 2200 then raise exception 'Año no válido';end if;
 return query with meses as(select make_date(p_anio,n,1) a,(make_date(p_anio,n,1)+interval '1 month')::date b from generate_series(1,12) n)
 select t.a,inv.n,ocup.bloq,ocup.vend,round(100.0*ocup.vend/nullif(inv.n-ocup.bloq,0),2),mov.c,mov.d,g.total,mov.c-mov.d-g.total,q.pend
 from meses t
 cross join lateral(select coalesce(sum(greatest(least(t.b,coalesce(d.baja,t.b))-greatest(t.a,d.alta),0)),0)::bigint n from public.departamentos d where d.alta is not null) inv
 cross join lateral(select coalesce(sum(least(r.salida,t.b)-greatest(r.entrada,t.a)) filter(where r.clase<>'alquiler'),0)::bigint bloq,
 coalesce(sum(least(r.salida,t.b)-greatest(r.entrada,t.a)) filter(where r.clase='alquiler'),0)::bigint vend
 from public.reservas r where r.entrada<t.b and r.salida>t.a and r.estado in('confirmada','en_curso','finalizada','bloqueada')) ocup
 cross join lateral(select coalesce(sum(v.importe) filter(where v.tipo='cobro'),0) c,coalesce(sum(v.importe) filter(where v.tipo='devolucion'),0) d from public.movimientos v where v.fecha>=t.a and v.fecha<t.b) mov
 cross join lateral(select coalesce(sum(v.importe),0) total from public.gastos v where not v.anulado and v.fecha>=t.a and v.fecha<t.b) g
 cross join lateral(select coalesce(sum(v.saldo),0) pend from public.saldos_cuotas v where v.vence>=t.a and v.vence<t.b) q order by t.a;
end $$;
