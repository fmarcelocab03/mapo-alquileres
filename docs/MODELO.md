# Modelo de MAPO y reglas de negocio

Unidad de venta: un departamento completo en Huancayo. No se reservan dormitorios por separado. Moneda: soles (PEN). Las fechas de entrada y salida son fechas civiles; el día de salida se puede vender otra vez. Los movimientos de caja usan fecha efectiva; el registro y la auditoría usan marcas de tiempo. La fecha de trabajo se calcula en America/Lima.

| Datos | Relación y uso |
|---|---|
| auth.users → clientes | Supabase Auth conserva las credenciales. Cada alta crea un perfil sin permisos especiales. Un cliente externo tiene usuario_id nulo. Dos personas con el mismo nombre no se fusionan. Revincular expedientes se hace verificando identidad, nunca por coincidencia automática de correo. |
| mapo_privado.administradores | Lista de UUID de cuentas autorizadas. El público no puede leerla ni editarla. El dueño del proyecto da o revoca acceso por SQL. No se confía en lo que el usuario escriba en sus metadatos. |
| edificios → departamentos | Código único, descripción, capacidad, dormitorios y tarifa diaria/mensual. Alta y baja definen la vida real del inventario. Publicado controla si se anuncia en la web. Despublicar no borra reservas ni altera tarifas pactadas. Deja alta vacía para un borrador que nunca entró en operación. |
| departamentos ↔ servicios | Relación mediante departamento_servicios. Las etiquetas iniciales son opciones del catálogo; no implican que cada propiedad las ofrezca. El administrador asigna las que correspondan. |
| departamentos → fotos | La tabla guarda ruta, descripción y orden. El archivo está en Storage, en el bucket privado mapo-fotos. El nombre de ruta comienza con el UUID del departamento. Menor orden primero; evita empates de portada. |
| usuarios ↔ favoritos | Clave compuesta por usuario y departamento. Un huésped no puede leer ni modificar la selección de otro. |
| clientes + departamentos → reservas | Una agenda única reúne solicitudes web, alquileres externos y bloqueos. Una solicitud no reserva cupo. La restricción mapo_sin_cruces protege los periodos confirmados incluso cuando llegan dos confirmaciones simultáneas. |
| reservas → cuotas → movimientos | Una cuota expresa cuánto vence y cuándo. Un movimiento es un cobro o una devolución real. Una cuota admite varios abonos y medios distintos. Los intentos repetidos con el mismo identificador de operación no duplican pagos. |
| reservas → garantias | Lo recibido y lo devuelto se lleva por separado. No cuenta como ingreso por alquiler. No se puede devolver más de lo recibido. |
| gastos | Egresos generales o vinculados a un departamento. Anular por error conserva el registro y su motivo. |
| mapo_privado.bitacora | Cambios de inventario, estadías, importes, fotos y privilegios, con fecha y actor cuando procede. Para consultar un registro desde una cuenta administrativa: RPC historial_registro(p_id). Las acciones de SQL Editor pueden tener actor nulo. |

## Estados y casos
- Una solicitud web nace como solicitada; el administrador la confirma o cancela. Se permiten hasta cinco pendientes por cliente y no se duplica la misma combinación de cliente, departamento, fechas y modalidad.
- La reserva externa se crea confirmada. Admite Airbnb, Marketplace, Facebook, WhatsApp, directo u otro. Si hay un código externo, introdúcelo: su combinación con el canal es única. No existe sincronización automática con esas plataformas.
- Confirmada → en_curso (ingreso real, dentro del periodo) → finalizada (salida programada cumplida). La salida anticipada se registra desde el día siguiente al ingreso. La reserva conserva trazabilidad; revisa el acuerdo económico antes de ajustar cuotas.
- Cancelar una petición no afecta la caja. Cancelar una reserva confirmada libera el calendario y anula sus cuotas. Los cobros anteriores no desaparecen: si corresponde devolverlos, registra el dinero efectivamente devuelto. Una penalidad acordada se registra como cargo separado. El sistema no inventa un porcentaje de penalización.
- Mantenimiento y uso del propietario bloquean los mismos intervalos que un alquiler y no generan cobros. Al cancelar un bloqueo se libera el calendario.
- En una extensión, registra una reserva consecutiva con el mismo cliente desde la salida anterior, por las noches o meses adicionales. Para un traslado, registra el nuevo departamento y ajusta el anterior sin duplicar cobros. No se ofrece aún una reprogramación de dos departamentos en un solo clic.
- Ejemplo mensual: 31 de enero por tres meses vence el 30 de abril. Las cuotas vencen el 31 de enero, el último día de febrero y el 31 de marzo. El cálculo siempre parte del ingreso original, sin acumular el ajuste de febrero.

## Permisos efectivos
| Operación | Visitante | Cliente autenticado | Administrador |
|---|---|---|---|
| Catálogo publicado y disponibilidad sin nombres de huéspedes | Sí (API) | Sí | Sí, más borradores |
| Solicitudes, perfil y favoritos | No | Solo propios | Atiende reservas; los favoritos siguen siendo personales |
| Hacerse administrador | No | No | Tampoco por el portal; solo el propietario en SQL |
| Confirmar, bloquear, cuotas, cobros, gastos y reportes | No | No | Sí, mediante operaciones autorizadas |
| Editar tarifas, servicios, fichas o subir fotos | No | No | Sí |
El portal de práctica pide acceso para buscar o solicitar. La base permite también diseñar un catálogo público en la web principal. La lectura financiera se limita al administrador; un cliente ve su reserva y estado, no el libro de cobros del negocio.

## Indicadores
- Noches de inventario: suma de días entre alta y baja de los departamentos, recortados al mes. Sin alta no entra al denominador.
- Noches disponibles para vender: inventario menos bloqueos por mantenimiento o uso propio.
- Ocupación: noches de alquiler confirmadas, en curso o finalizadas ÷ noches disponibles × 100. Sin capacidad disponible se muestra un guion. En fechas futuras representa reservas previstas, no huéspedes ya alojados.
- Resultado de caja: cobros efectivos − devoluciones efectivas − gastos registrados no anulados del mes. Excluye garantías. No es una utilidad contable ni incluye gastos aún no registrados.
- Pendiente por vencimiento: saldo actual de las cuotas agrupado por el mes en que vencen. Una cuota parcial puede estar vencida; “pendiente” y “vencida” no son sinónimos. Por devolver: lo cobrado neto que excede una cuota anulada.
- Mes fuerte: el panel permite comparar ocupación y resultado de caja por separado y muestra los empates. Compara meses cerrados con inventario y revisa si hay suficiente historial. No se precargaron temporadas ni ganancias.
- Airbnb con comisión: registra el cobro bruto y la comisión como gasto, o el cobro neto sin volver a descontar esa misma comisión. Define un criterio operativo consistente.

## Conexión con la web que ya tienes
| En el prototipo académico | En la integración |
|---|---|
| showScreen y 5 segundos de carga | Puedes conservar la animación; al terminar consulta auth.getSession() y escucha onAuthStateChange para decidir acceso o Inicio. |
| Cuenta demo local y Recordarme | signUp, signInWithPassword y signOut. Nunca compares contraseñas en el JavaScript publicado. Recordar un correo es distinto de mantener la sesión de Auth. |
| properties con el gris y verde | Lee departamentos y usa su UUID; el código gris/verde sirve para identificar los dos registros iniciales. No uses el nombre como clave. |
| changeMode y el buscador | Calcula salida exclusiva y llama a disponibles; para enviar, solicitar_reserva. En mensual envía meses y p_salida nulo. |
| toggleFavorite en localStorage | Añade o quita la pareja usuario_id/departamento_id en favoritos. Si migras favoritos antiguos, pide al usuario confirmar qué guardar en su cuenta. |
| Imágenes locales | Obtén las fotos ordenadas y pide una URL firmada de cinco minutos al bucket privado. Sustituir una foto usa otra ruta. Quitar la ficha no invalida de inmediato los enlaces ya emitidos. |
| Panel ficticio de reservas | Lee reservas con la sesión del usuario. RLS limita los resultados. Usa soy_admin() para decidir si muestras el acceso al panel; el servidor vuelve a autorizar cada acción. |

## Límites y siguientes etapas
El portal registra pagos que MAPO ya verificó por otro medio: no cobra tarjetas, no emite comprobantes tributarios ni importa automáticamente Airbnb. No guardes números de tarjeta, claves bancarias, documentos de identidad o contratos en el bucket de fotos. Si incorporas contratos o comprobantes, crea un bucket privado distinto con acceso por titular y personal autorizado. Antes de operar con huéspedes reales, define permisos de empleados, política de conservación de datos, autenticación reforzada para administradores, copias y restauración. Para un historial largo, añade paginación de interfaz y reportes por edificio; el piloto consolida MAPO.
