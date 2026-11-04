# Prueba previa a la puesta en marcha
Usa primero un proyecto de desarrollo y dos sesiones separadas del navegador. No envíes correos a clientes reales para estas pruebas.

| Prueba | Acción | Resultado esperado |
|---|---|---|
| Registro y recuperación | Alta con correo controlado, confirma el enlace; luego solicita recuperar acceso | Existe un perfil propio; el enlace vuelve al portal correcto; la contraseña nueva permite ingresar |
| Roles | Cliente A y B en perfiles de navegador distintos | B no ve reservas ni favoritos de A. Un cliente no ve el panel; una llamada directa a confirmar_reserva o resumen_mensual falla por permisos |
| Fotos | Administrador sube JPG y publica la ficha. Cliente busca y abre la imagen. Despublica y vuelve a buscar | Sale la foto en la propiedad publicada; no se emiten nuevas URL al cliente después de despublicar. Un enlace anterior puede vivir hasta 300 segundos. Una subida desde el cliente se deniega |
| Estancias | Cliente solicita; admin confirma; intenta confirmar otra estadía solapada o crear mantenimiento en el mismo intervalo | La segunda operación falla. Reserva desde la primera fecha de salida: sí debe aceptarse |
| Choque simultáneo | Dos clientes solicitan antes de confirmar. Desde dos sesiones administrativas, confirma ambas para el mismo departamento y fechas | Solo una puede confirmarse. La otra sigue solicitada hasta que se cancele o atienda |
| Cobros | S/ 200 previstos, abono de S/ 75 por Yape y S/ 125 en efectivo | Saldo 125 tras el primer pago y 0 tras el segundo. Se ven dos movimientos |
| Cancelación | Cancela la reserva pagada y devuelve solo S/ 50 | La fecha se libera y quedan S/ 150 por devolver; el dinero no desaparece del historial |
| Caja | Añade gasto real de S/ 25 y garantía recibida de S/ 300. Con los cobros y devolución anteriores dentro del mismo mes | Resultado del ejemplo S/ 125; la garantía no lo incrementa |
| Alquiler mensual | Ingreso 31 de enero por 3 meses en un año de prueba | Salida 30 de abril y tres cuotas; febrero y marzo reciben sus respectivas noches |
| Inventario | Crea un borrador, luego completa alta, capacidad y tarifa y publícalo | El borrador no aparece al cliente. La tarifa nueva no modifica reservas ya solicitadas o confirmadas |
| Operación desde navegador | Registra cliente externo, canal y referencia; bloquea mantenimiento; ordena y reemplaza foto | La agenda queda actualizada sin editar JavaScript |
| Ante un error | Repite la operación de cobro reutilizando la misma clave de operación | El movimiento no se duplica; con otros parámetros y el mismo UUID se rechaza |

Pruebas automáticas incluidas: SQL en pruebas/01_flujo_y_permisos.sql y 02_calendario_y_caja.sql, completas y terminadas en ROLLBACK. Se ejecutaron las cinco migraciones y ambos archivos en un motor PostgreSQL embebido con sustitutos locales de auth y storage. Se verificó también el portal (registro, retorno, búsqueda mensual, cambio de rol y salida) con el cliente de red simulado. Falta validar entrega real de correo/SMTP, URLs firmadas a través de Storage, dos sesiones concurrentes reales y despliegue en tu proyecto. No se usó ninguna cuenta o credencial de MAPO.
