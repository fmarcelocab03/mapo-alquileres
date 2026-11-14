# Verificación de la entrega · 14 de noviembre de 2026

## Ejecutado

| Área | Comprobación | Resultado |
| --- | --- | --- |
| Migraciones | Aplicación desde cero de los siete SQL, en orden, en PostgreSQL embebido PGlite; sustitutos mínimos de Auth y Storage | Correcta |
| Compatibilidad | Comparación de las seis migraciones anteriores con el paquete anterior | Sin cambios |
| Base funcional | Pruebas SQL 01, 02 y 03: flujo, permisos, calendario, caja, perfil y solicitudes | Correctas; rollback sin reservas de prueba persistidas |
| Galería y reserva propia | Prueba SQL 04: configuración, borradores/publicación, permisos sobre tablas y objetos, aislamiento entre usuarios, detalle de reserva y abono parcial | Correcta |
| Roles y avatares | Comprobación adicional de autorización de gestores y rutas privadas del perfil | Correcta |
| Portal en navegador | Favoritos con filtro mensual, reservas y filtro próximas, detalle con cuotas, ayuda y condiciones | Correcto con respuestas de datos controladas |
| Galería en navegador | Ampliación, siguiente foto, Escape, carga de imagen sintética mediante el formulario, publicación y ocultación | Correcto; el huésped ve los cambios tras recargar |
| Contenido en navegador | Guardar el título desde administrador y comprobarlo desde la sesión huésped | Correcto |
| Tablero | Navegación de secciones, vista de indicadores y diálogo de confirmación/cancelación | Correcto |
| Vista móvil | Portal a 393 px, favoritos y ayuda, navegación inferior y ancho del documento | Sin desbordamiento horizontal observado |
| JavaScript | Análisis de sintaxis de los archivos propios con Node | Correcto |

La prueba del navegador usa una copia aislada y un cliente de datos controlado. Las imágenes, cuentas y registros sintéticos de esa prueba **no están incluidos en la aplicación ni se insertan en la base del usuario**. Los casos SQL ejercitan políticas reales de PostgreSQL; los sustitutos de servicios no equivalen a una prueba de integración con los servidores de Supabase.

## Verificar al instalar en el proyecto de Fernando

- `migration list --remote`: siete versiones locales y remotas coincidentes.
- Acceso con cuenta huésped y cuenta administrativa reales; confirmar que cada usuario solo ve sus reservas y favoritos.
- Subida, firma y lectura de imágenes a través de Supabase Storage remoto.
- Registro, recuperación y confirmación de cambio de correo con SMTP y URLs definitivas.
- Confirmaciones concurrentes desde sesiones reales y el caso de edición simultánea de contenido.
- Publicación con el workflow existente y acceso desde la laptop usando la URL de GitHub Pages.
- `ACTUALIZAR.cmd`: revisado para conservar la configuración, detectar migraciones divergentes y respaldar la web/documentos; no se ejecutó en Windows porque la revisión se realizó en Linux.

No se usaron credenciales del usuario ni se aplicaron migraciones a su proyecto remoto. La instalación y el despliegue permanecen pendientes hasta ejecutar los pasos de `GUIA_ENTREGA.md` en su proyecto.
