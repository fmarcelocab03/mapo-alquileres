-- Solo el propietario, en SQL Editor. Primero crear y CONFIRMAR la cuenta desde el portal.
-- Copiar UID de Authentication > Users y escribir también su correo. No versionar la copia rellenada.
do $$
declare v_uid uuid:='00000000-0000-0000-0000-000000000000'; v_correo text:='REEMPLAZAR@ejemplo.invalid';
begin
 if not exists(select from auth.users where id=v_uid and lower(email)=lower(v_correo) and email_confirmed_at is not null) then
 raise exception 'El UID y el correo deben identificar la misma cuenta confirmada';end if;
 insert into mapo_privado.administradores(usuario_id) values(v_uid) on conflict do nothing;
end $$;
-- Revocar: ejecuta como propietario solo si queda otra cuenta administrativa verificada.
-- delete from mapo_privado.administradores where usuario_id = 'UID_VERIFICADO';
