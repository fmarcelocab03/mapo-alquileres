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

## Portal completo y galería administrable

| Caso | Acción | Resultado esperado |
| --- | --- | --- |
| Favoritos | Guarda gris y verde, cambia Todos/Por días/Mensual, quita uno y recarga | Persisten solo los favoritos de la cuenta y los filtros cambian el listado. |
| Reserva propia | Solicita, confirma desde admin, registra S/ 25 de S/ 200 y vuelve al detalle huésped | Estado confirmado, pago neto 25 y saldo 175. Otra cuenta no puede consultar ese detalle. |
| Histórico | Despublica un departamento con una reserva propia ya creada | El cliente conserva nombre, fechas, estado y saldo de su reserva. |
| Galería | Sube una foto como borrador y otra publicada | Solo la publicada aparece en Inicio y en Conoce el edificio. |
| Galería oculta | Oculta una publicada y recarga el portal huésped | Desaparece de las listas; no se emiten nuevas URLs. Los enlaces ya firmados pueden durar diez minutos. |
| Orden y categorías | Cambia el orden y filtra El edificio/Sus ambientes/El entorno | Orden y conjunto visibles corresponden a los registros publicados. |
| Contenido | Cambia un título o contacto desde admin y recarga el huésped | Aparece el valor nuevo. Un huésped no puede actualizarlo mediante la API. |
| Conflicto de edición | Dos administradores cargan el mismo registro y guardan cambios distintos | El segundo detecta la versión modificada y recarga antes de sobrescribir. |
| Ayuda y condiciones | Despliega preguntas y recorre los cuatro bloques de condiciones | Texto legible, acordeones operables y contactos configurados. |
| Navegación | Usa Volver, Inicio, Mis reservas y Perfil; prueba a 393 px y en laptop | Sin desbordamiento horizontal en el portal; controles accesibles y navegación fija visible. |
| Cambio de equipo | Abre la URL publicada en otro dispositivo con la misma cuenta | Mismo perfil, reservas, favoritos y fotos guardados; no hay una base por dispositivo. |

Pruebas SQL incluidas: archivos 01, 02, 03 y 04 en `pruebas/`, completos y terminados en ROLLBACK. Se ejecutaron las siete migraciones y las cuatro pruebas con un motor PostgreSQL embebido y sustitutos locales de Auth/Storage. La interfaz se comprobó con respuestas de datos controladas. El detalle de evidencia y las verificaciones remotas pendientes están en [VERIFICACION.md](VERIFICACION.md).
