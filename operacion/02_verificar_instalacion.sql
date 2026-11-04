-- Lectura sin cambios. Ejecutar como propietario en SQL Editor.
select nombre,ciudad from public.edificios;
select codigo,nombre,publicado,alta from public.departamentos order by codigo;
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='mapo-fotos';
select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in('clientes','reservas','departamentos','edificios','cuotas','movimientos','garantias','gastos','favoritos','fotos','servicios','departamento_servicios') order by 1;
select conname from pg_constraint where conrelid='public.reservas'::regclass and contype='x';
-- Esperado: 2 fichas en borrador al instalar; bucket privado de 5 MiB; 12 tablas con RLS; mapo_sin_cruces.
