-- Operaciones atómicas. Todo identificador de cliente web se deriva del usuario autenticado.
create function mapo_privado.exigir_admin() returns void language plpgsql stable security definer set search_path='' as $$
begin if not mapo_privado.es_admin() then raise exception 'Se requiere administrador' using errcode='42501'; end if; end $$;
create function mapo_privado.hoy() returns date language sql stable set search_path='' as $$ select (now() at time zone 'America/Lima')::date $$;
create function mapo_privado.importe_valido(x numeric) returns boolean language sql immutable set search_path='' as $$
select coalesce(x between 0.01 and 9999999999.99 and x=round(x,2),false) $$;
create function public.actualizar_mi_perfil(p_nombre text,p_telefono text) returns void language plpgsql security definer set search_path='' as $$
begin update public.clientes set nombre=btrim(p_nombre),telefono=nullif(left(btrim(p_telefono),40),'') where usuario_id=auth.uid(); if not found then raise exception 'Perfil no disponible'; end if; end $$;
create function public.cliente_externo(p_nombre text,p_correo text,p_telefono text) returns uuid language plpgsql security definer set search_path='' as $$
declare k uuid;begin perform mapo_privado.exigir_admin();
 if nullif(trim(p_correo),'') is null and nullif(trim(p_telefono),'') is null then raise exception 'Indica correo o teléfono del cliente';end if;
 insert into public.clientes(nombre,correo,telefono) values(trim(p_nombre),nullif(trim(p_correo),''),nullif(trim(p_telefono),'')) returning id into k;return k;end $$;
create function public.disponibles(p_entrada date,p_salida date,p_modalidad text,p_huespedes int default 1)
returns table(departamento_id uuid) language sql stable security definer set search_path='' as $$
 select d.id from public.departamentos d where d.publicado and p_entrada>=mapo_privado.hoy() and p_salida>p_entrada and p_salida<=p_entrada+1830
 and d.alta<=p_entrada and (d.baja is null or d.baja>=p_salida) and p_huespedes between 1 and d.capacidad
 and case p_modalidad when 'dias' then d.tarifa_dia is not null when 'mensual' then d.tarifa_mes is not null else false end
 and not exists(select from public.reservas r where r.departamento_id=d.id and r.estado in('confirmada','en_curso','finalizada','bloqueada')
 and r.entrada<p_salida and r.salida>p_entrada)
$$;
create function mapo_privado.crear_estadia(p_dep uuid,p_cli uuid,p_modo text,p_ini date,p_fin date,p_meses int,p_hues int,p_canal text,p_ref text,p_precio numeric,p_web boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare d public.departamentos%rowtype; k uuid; fin date; precio numeric;begin
 select * into strict d from public.departamentos where id=p_dep for update;
 if d.alta is null or p_ini is null or not isfinite(p_ini) or p_ini<d.alta or (p_web and (not d.publicado or p_ini<mapo_privado.hoy())) then raise exception 'Departamento o fecha de ingreso no disponible'; end if;
 if d.capacidad is null or p_hues is null or p_hues not between 1 and d.capacidad then raise exception 'Capacidad excedida o inválida';end if;
 if p_modo='dias' then
  if p_meses is not null or p_fin is null then raise exception 'Por días: indica salida, sin meses'; end if;
  fin=p_fin;precio=coalesce(p_precio,d.tarifa_dia);
 elsif p_modo='mensual' then
  if p_fin is not null or p_meses is null or p_meses not between 1 and 60 or (p_web and p_meses not in(1,3,6,12)) then raise exception 'Mensual: indica meses, sin salida manual'; end if;
  fin=(p_ini+make_interval(months=>p_meses))::date;precio=coalesce(p_precio,d.tarifa_mes);
 else raise exception 'Modalidad no válida';end if;
 if not isfinite(fin) or fin<=p_ini or fin>p_ini+1830 or (d.baja is not null and fin>d.baja) then raise exception 'Revisa el intervalo y la baja del departamento';end if;
 if not mapo_privado.importe_valido(precio) then raise exception 'Configura una tarifa válida para la modalidad';end if;
 if exists(select from public.reservas r where r.departamento_id=p_dep and r.estado in('confirmada','en_curso','finalizada','bloqueada') and r.entrada<fin and r.salida>p_ini) then raise exception 'Departamento ocupado para esas fechas' using errcode='23P01';end if;
 insert into public.reservas(departamento_id,cliente_id,clase,estado,modalidad,canal,referencia_canal,huespedes,meses,entrada,salida,precio_unitario)
 values(p_dep,p_cli,'alquiler','solicitada',p_modo,p_canal,nullif(trim(p_ref),''),p_hues,p_meses,p_ini,fin,precio) returning id into k;
 return k;end $$;
create function public.solicitar_reserva(p_departamento uuid,p_modalidad text,p_entrada date,p_salida date,p_meses int,p_huespedes int) returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid;begin select id into strict c from public.clientes where usuario_id=auth.uid() for update;
 if (select count(*) from public.reservas where cliente_id=c and estado='solicitada')>=5 then raise exception 'Ya tienes cinco solicitudes pendientes';end if;
 return mapo_privado.crear_estadia(p_departamento,c,p_modalidad,p_entrada,p_salida,p_meses,p_huespedes,'web',null,null,true);end $$;
create function mapo_privado.confirmar(k uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.reservas%rowtype;d public.departamentos%rowtype;i int;begin
 select * into strict r from public.reservas where id=k for update;
 select * into strict d from public.departamentos where id=r.departamento_id for update;
 if d.alta is null or d.capacidad is null or r.estado<>'solicitada' or r.entrada<d.alta or (d.baja is not null and r.salida>d.baja) or r.huespedes>d.capacidad then raise exception 'Solicitud ya atendida o fuera del inventario';end if;
 update public.reservas set estado='confirmada' where id=k; -- exclusión GiST impide carreras en el mismo departamento
 if r.modalidad='dias' then
  insert into public.cuotas(reserva_id,concepto,detalle,vence,importe) values(k,'alquiler','Alquiler por noches',r.entrada,r.precio_unitario*(r.salida-r.entrada));
 else for i in 0..r.meses-1 loop
  insert into public.cuotas(reserva_id,concepto,detalle,vence,importe) values(k,'alquiler','Mes '||(i+1),(r.entrada+make_interval(months=>i))::date,r.precio_unitario);
 end loop;end if;end $$;
create function public.confirmar_reserva(p_reserva uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform mapo_privado.exigir_admin();perform mapo_privado.confirmar(p_reserva);end $$;
create function public.reserva_externa(p_departamento uuid,p_cliente uuid,p_modalidad text,p_entrada date,p_salida date,p_meses int,p_huespedes int,p_canal text,p_referencia text default null,p_precio_unitario numeric default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare k uuid;begin perform mapo_privado.exigir_admin(); if p_canal='web' then raise exception 'Usa un canal externo';end if;
 k=mapo_privado.crear_estadia(p_departamento,p_cliente,p_modalidad,p_entrada,p_salida,p_meses,p_huespedes,p_canal,p_referencia,p_precio_unitario,false);
 perform mapo_privado.confirmar(k);return k; end $$;
create function public.bloquear(p_departamento uuid,p_entrada date,p_salida date,p_clase text,p_motivo text) returns uuid language plpgsql security definer set search_path='' as $$
declare k uuid;begin perform mapo_privado.exigir_admin();
 if p_clase not in('mantenimiento','uso_propietario') or nullif(trim(p_motivo),'') is null then raise exception 'Falta tipo o motivo del bloqueo';end if;
 perform 1 from public.departamentos where id=p_departamento and alta<=p_entrada and (baja is null or baja>=p_salida) for update;
 if not found then raise exception 'Fuera de la vida del departamento';end if;
 insert into public.reservas(departamento_id,clase,estado,entrada,salida,motivo) values(p_departamento,p_clase,'bloqueada',p_entrada,p_salida,p_motivo) returning id into k;return k;end $$;
create function public.cancelar(p_reserva uuid,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
declare r public.reservas%rowtype;begin
 if nullif(trim(p_motivo),'') is null then raise exception 'Indica un motivo';end if;
 select * into r from public.reservas where id=p_reserva and (mapo_privado.es_admin() or (estado='solicitada' and cliente_id in(select id from public.clientes where usuario_id=auth.uid()))) for update;
 if not found then raise exception 'Operación no permitida' using errcode='42501'; end if;
 if r.estado not in('solicitada','confirmada','bloqueada') then raise exception 'El estado ya no permite cancelar';end if;
 update public.reservas set estado='cancelada',motivo=left(p_motivo,600) where id=p_reserva;
 update public.cuotas set anulada=true where reserva_id=p_reserva;
end $$;
create function public.registrar_paso(p_reserva uuid,p_paso text) returns void language plpgsql security definer set search_path='' as $$
declare r public.reservas%rowtype; hoy date=mapo_privado.hoy();begin perform mapo_privado.exigir_admin();select * into strict r from public.reservas where id=p_reserva for update;
 if (p_paso='ingreso' and r.estado='confirmada' and hoy>=r.entrada and hoy<r.salida) then update public.reservas set estado='en_curso' where id=p_reserva;
 elsif (p_paso='salida' and r.estado='en_curso' and hoy>=r.salida) then update public.reservas set estado='finalizada' where id=p_reserva;
 else raise exception 'Fecha o estado incompatibles con ingreso/salida';end if;end $$;
create function mapo_privado.validar_inventario() returns trigger language plpgsql security definer set search_path='' as $$
begin if exists(select from public.reservas r where r.departamento_id=new.id and r.estado in('confirmada','en_curso','finalizada','bloqueada') and
 (new.alta is null or r.entrada<new.alta or (new.baja is not null and r.salida>new.baja) or (r.estado in('confirmada','en_curso') and (new.capacidad is null or r.huespedes>new.capacidad)))) then raise exception 'El cambio contradice una estancia o un bloqueo';end if;return new;end $$;
create trigger mapo_inventario before update of alta,baja,capacidad on public.departamentos for each row execute function mapo_privado.validar_inventario();
