-- Opcional. Solo el propietario en SQL Editor, después de verificar la identidad del administrador.
do $$
declare v_uid uuid:='00000000-0000-0000-0000-000000000000'; v_correo text:='REEMPLAZAR@ejemplo.invalid';
begin
 if not exists(select from auth.users u join mapo_privado.administradores a on a.usuario_id=u.id
   where u.id=v_uid and lower(u.email)=lower(v_correo) and u.email_confirmed_at is not null)
 then raise exception 'El UID y correo deben pertenecer al mismo administrador confirmado.';end if;
 insert into mapo_privado.gestores_roles values(v_uid) on conflict do nothing;
end $$;

