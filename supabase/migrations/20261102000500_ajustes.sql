-- Salida anticipada: conserva lo pactado y permite decidir explícitamente cómo ajustar las cuotas.
create function public.salida_anticipada(p_reserva uuid,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
declare r public.reservas%rowtype; h date=mapo_privado.hoy();begin perform mapo_privado.exigir_admin();
 select * into strict r from public.reservas where id=p_reserva for update;
 if r.estado<>'en_curso' or not (h>r.entrada and h<r.salida) or nullif(trim(p_motivo),'') is null then raise exception 'Solo una estancia activa, tras al menos una noche y antes de la salida';end if;
 update public.reservas set salida=h,estado='finalizada',motivo=left(p_motivo,600) where id=p_reserva;
end $$;
create function public.anular_cuota(p_cuota uuid,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
begin perform mapo_privado.exigir_admin();if nullif(trim(p_motivo),'') is null then raise exception 'Indica el motivo';end if;
 update public.cuotas set anulada=true,detalle=detalle||' | Anulación: '||left(p_motivo,300) where id=p_cuota and not anulada;
 if not found then raise exception 'La cuota no existe o ya está anulada';end if;end $$;
revoke all on function public.salida_anticipada(uuid,text),public.anular_cuota(uuid,text) from public,anon,authenticated;
grant execute on function public.salida_anticipada(uuid,text),public.anular_cuota(uuid,text) to authenticated;
notify pgrst,'reload schema';
