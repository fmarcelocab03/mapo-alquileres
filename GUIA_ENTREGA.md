# MAPO · Portal completo y administración

Entrega del 14 de noviembre de 2026. Incluye las pantallas del diseño hasta la 13, la galería del edificio, el detalle de cada reserva y el tablero administrativo. Esta entrega es código listo para instalar en tu proyecto existente: **no ha modificado tu Supabase ni publicado tu GitHub Pages**.

## 1. Actualiza tu proyecto conservando la conexión

1. Descarga `MAPO_Proyecto_Completo.zip` y extráelo en una carpeta **distinta** de tu proyecto actual.
2. En la carpeta nueva `mapo-alquileres`, abre `ACTUALIZAR.cmd`.
3. Cuando solicite la carpeta original, pega la ruta de tu proyecto. En tu PC era:

```text
C:\Users\FERNANDO\Downloads\MAPO_Supabase_para_GitHub\mapo-alquileres
```

El actualizador respalda la web anterior en tu PC, instala la web nueva, las migraciones 6 y 7, sus pruebas y esta guía. **Conserva tu `web/config.js`, la vinculación con Supabase, tu historial Git y los datos de la base.** La ventana muestra dónde quedó el respaldo. Vuelve a abrir en VS Code la carpeta **original**.

Si prefieres hacerlo a mano, copia `web` manteniendo tu `config.js`; añade las migraciones `20261104000100_perfil_y_solicitudes.sql` y `20261114000100_portal_y_galeria.sql`, las pruebas 03 y 04, la plantilla `operacion/03_habilitar_gestor_roles.sql` y la documentación. No sustituyas las migraciones antiguas por archivos renombrados. La entrega conserva sus seis SQL anteriores sin cambios.

La plantilla del ZIP no contiene tu clave. Para una instalación nueva, completa `web/config.js` con la misma Project URL y clave **publicable** de tu proyecto. Nunca coloques una clave secreta, `service_role` o contraseña de la base en la web.

## 2. Aplica las migraciones pendientes en desarrollo

Abre una terminal de PowerShell en tu carpeta original vinculada a `mapo-desarrollo`. Ejecuta una línea a la vez:

```powershell
npx.cmd supabase db push --remote --dry-run
```

Comprueba el resultado antes de aplicar:

| Tu instalación actual | Archivos pendientes esperados |
| --- | --- |
| Ya instalaste las pantallas 4–8 y tienes seis migraciones | Solo `20261114000100_portal_y_galeria.sql` |
| Te quedaste con las cinco migraciones iniciales | `20261104000100_perfil_y_solicitudes.sql` y `20261114000100_portal_y_galeria.sql` |
| Las siete ya están aplicadas | Ninguna migración pendiente |

Si coincide, ejecuta:

```powershell
npx.cmd supabase db push --remote
npx.cmd supabase migration list --remote
```

Al terminar deben coincidir **siete versiones en Local y Remote**. No uses `db reset` para actualizar. Si ves otro proyecto, versiones inesperadas o un error, conserva el mensaje y revisa la vinculación antes de continuar.

La migración 7 crea la configuración editable del portal, la tabla de fotografías del lugar, un bucket privado `mapo-lugar` y la consulta segura del detalle de la reserva propia. Mantiene las reservas, usuarios, cobros y permisos existentes. Tu administrador conserva su acceso. No debes crear manualmente un bucket público.

## 3. Abre la aplicación en tu PC

Desde la raíz del proyecto, si no hay un servidor abierto:

```powershell
py -m http.server 5500 --bind 127.0.0.1
```

Si no tienes Python, puedes usar Node:

```powershell
npx.cmd --yes http-server@14.1.1 . -a 127.0.0.1 -p 5500 -c-1
```

Abre **http://127.0.0.1:5500/web/**. Pulsa **Ctrl + F5** en la primera carga para actualizar los archivos guardados por el navegador. Ingresa con tu cuenta confirmada. Un administrador entra al tablero; desde allí **Ver portal** permite revisar Inicio y **Mi perfil** abre su perfil. Para probar un huésped simultáneamente, usa una ventana privada.

Apagar tu computadora no borra el proyecto ni la base remota. Para continuar otro día, abre la misma carpeta y vuelve a iniciar el servidor local. No repitas la creación de Supabase, las migraciones ya aplicadas ni la asignación del administrador.

## 4. Publica tus fotos del lugar

En el administrador abre **Galería del edificio**:

1. Selecciona o arrastra una fotografía JPG, PNG o WebP de hasta 10 MiB.
2. Añade título y descripción. La descripción también sirve para explicar la imagen a quienes usan lector de pantalla.
3. Elige **El edificio**, **Sus ambientes** o **El entorno**.
4. Indica el orden; los números menores aparecen primero.
5. Marca **Publicar en el portal** y guarda. Sin esa marca queda en borrador.

La imagen se ajusta a un máximo de 1800 píxeles por lado largo y se guarda como JPEG de hasta 3 MiB. Si el archivo no se puede procesar o supera ese resultado, el formulario explica el problema.

Las primeras tres fotos publicadas aparecen en Inicio; **Ver galería** abre todas, con filtros y ampliación. Puedes editar su información, cambiar el orden, ocultarlas o eliminarlas desde el panel. Para reemplazar la imagen, agrega una foto nueva y retira la anterior. **Fotos de departamentos** sigue siendo la sección separada para las imágenes de cada alojamiento.

La galería del edificio empieza vacía: carga tus fotos reales. Las ilustraciones y fotos del prototipo que sirven de respaldo en otras pantallas se identifican como referenciales. No se cargan huéspedes, reservas, cobros ni fotografías de prueba en tu base.

## 5. Edita los textos sin tocar código

En **Contenido del portal** puedes cambiar:

- El título y texto de la sección **Conoce el lugar de tu próxima historia**.
- La presentación de **Sobre MAPO**.
- WhatsApp, teléfono, correo, ubicación y horario de atención.
- Disponibilidad, tarifas y pagos, ingreso y salida, y cambios y cancelación.

WhatsApp se escribe con código de país y solo dígitos; por ejemplo, un número peruano comienza por `51`. Los valores iniciales de contacto conservan los de tu portal anterior: revísalos antes de compartir la web. Un canal vacío deja de mostrarse. Las condiciones iniciales invitan a coordinar con MAPO; completa aquí tus condiciones reales, sin inventar plazos ni penalidades.

Pulsa **Guardar contenido**. En otra sesión recarga el portal para ver el cambio inmediato; las lecturas normales conservan una caché de hasta un minuto. Si dos administradores editan a la vez, el formulario detecta que cambió la versión y pide recargar antes de sobrescribirla.

## 6. Recorre las pantallas para tu presentación

| Pantalla | Funcionalidad para demostrar |
| --- | --- |
| Inicio y acceso existentes | Registro, ingreso, recuperación, catálogo por días/mensual y nueva sección del lugar. |
| 4 y 5 · Detalle de departamento | Galería, servicios, favoritos, fechas, huéspedes y disponibilidad. Usa la ficha del gris o verde; las fotos reales tienen prioridad. |
| 6 y 7 · Solicitud de reserva | Por días o por meses; valida fechas, capacidad y contacto. El importe mostrado antes de confirmar es estimado. Enviar abre el detalle de la solicitud. |
| 8 · Mi perfil | Foto, nombre, celular, DNI y ciudad; cambio de correo con confirmación. DNI y ciudad son opcionales. |
| 9 · Mis favoritos | Tarjetas con foto y tarifa, filtros Todos/Por días/Mensual, quitar favorito y abrir detalles. |
| 10 · Mis reservas | Todos/Próximas/Historial, filtro de modalidad, buscador, actualización y estado de cada estancia. |
| 11 · Sobre MAPO | Presentación, opciones de estancia y contacto. Utiliza una foto del lugar cuando hay fotos publicadas. |
| 12 · Ayuda y contacto | WhatsApp, llamada, correo, ubicación y preguntas desplegables. Abrir un enlace de contacto no envía un mensaje automáticamente. |
| 13 · Condiciones del alquiler | Cuatro bloques editables desde el administrador y acceso a contacto. |
| Adicional · Conoce el edificio | Galería por categorías, ampliación, navegación con flechas y cierre con Escape. |
| Adicional · Detalle de mi reserva | Fechas, contacto, seguimiento, cuotas, pagos netos, saldo, garantías y resumen imprimible. Solo el titular accede a su información. |

El huésped puede retirar una solicitud pendiente. Los cambios de una reserva confirmada se coordinan con MAPO. Confirmar una reserva genera las cuotas; la solicitud sola no realiza un cobro ni bloquea definitivamente el departamento. El resumen imprimible es informativo, no un comprobante tributario.

**Prueba de extremo a extremo para clase:** con una cuenta huésped envía una solicitud para fechas libres. Desde administración, en **Reservas**, lee los datos y confirma. Registra un abono en **Cobros y cuotas**. Vuelve al huésped, pulsa **Actualizar** y abre **Ver reserva**: comprueba el estado y el saldo. Usa datos de prueba.

**Perfil y correo.** Las fotos del perfil se guardan en el bucket privado `mapo-avatares`. Admiten hasta 5 MiB de entrada y se convierten a imagen cuadrada. El cambio de correo conserva UID, reservas, DNI y favoritos; completa las confirmaciones que solicite Supabase. Configura Site URL, Redirect URLs y el remitente SMTP para los correos que necesites enviar a usuarios reales.

## 7. Usa el tablero administrativo

En **Resumen**, selecciona fecha del calendario, año, mes e indicador del gráfico. El panel obtiene los datos de la base y se actualiza aproximadamente cada minuto mientras está visible. También puedes pulsar **Actualizar panel**.

- **Ocupación** relaciona las noches reservadas con el inventario disponible; las fechas futuras son ocupación prevista.
- **Cobros** muestra dinero efectivamente recibido. **Resultado de caja** descuenta devoluciones y gastos. Las garantías se llevan aparte.
- **Saldo pendiente** agrupa el saldo actual de las cuotas según el mes de vencimiento.
- **Reservas** permite buscar, filtrar, confirmar, registrar ingreso o salida y cancelar según el estado.
- **Cobros y cuotas** permite buscar y revisar pagos parciales, pendientes, vencidos o completados.
- **Departamentos**, **Fotos de departamentos**, **Canales y bloqueos**, **Gastos y garantías** y **Usuarios y roles** conservan sus operaciones.

Una ficha con historial se retira mediante la baja de inventario, no borrando sus reservas. Para delegar la gestión de permisos, el propietario del proyecto puede completar la plantilla `operacion/03_habilitar_gestor_roles.sql`. No se obtiene el rol de administrador desde el registro público ni editando el perfil.

## 8. Abre el mismo portal desde tu laptop

### Opción recomendada: la web publicada

La laptop solo necesita navegador e Internet. Cuando el portal esté en GitHub Pages, abre allí **la misma URL publicada** e ingresa con la misma cuenta. Reservas, perfil, favoritos y galería se consultan en el mismo Supabase. Tu PC puede estar apagada. No se crea otra base ni se migran datos para cada dispositivo.

Desde tu proyecto original, revisa y guarda la entrega en el repositorio existente:

```powershell
git status
git add .github .gitignore README.md GUIA_ENTREGA.md ACTUALIZAR.cmd package.json package-lock.json web supabase/migrations operacion pruebas docs
git --no-pager diff --cached --stat
```

Comprueba que no hayas añadido contraseñas, claves secretas ni SQL con datos reales. `web/config.js` debe contener únicamente la URL y clave publicable. Los avisos LF/CRLF de Git en Windows no significan que falló el guardado. Si un listado termina en `(END)`, pulsa `q`; `--no-pager` evita ese visor.

```powershell
git commit -m "Completar portal MAPO y galeria administrable"
git push
```

En GitHub:

1. Abre el repositorio que ya utilizas y entra a **Settings → Pages**.
2. En **Build and deployment → Source** selecciona **GitHub Actions** si aún no estaba configurado.
3. Ve a **Actions → Publicar portal MAPO → Run workflow** y ejecuta sobre la rama con la actualización.
4. Espera el resultado satisfactorio. Copia la dirección que muestra **Settings → Pages** o el despliegue `github-pages`. Esa es la URL que abres desde PC, laptop y celular.

El flujo incluido es manual: subir un commit no vuelve a publicar por sí solo. Publica únicamente `web/`. La disponibilidad de Pages para repositorios privados depende del plan de GitHub; si tu plan no lo permite, elige el alojamiento o plan adecuado antes de cambiar la visibilidad del repositorio.

En **Supabase → Authentication → URL Configuration** configura la URL publicada como Site URL e incluye las URLs locales y publicadas necesarias en Redirect URLs. Prueba registro, recuperación y cambio de correo desde esa URL. La dirección de tu repositorio no es la misma que la del portal publicado.

### Si por ahora solo lo quieres probar localmente en la laptop

Copia la carpeta del proyecto ya configurado a tu laptop, o clona tu repositorio real con Git y abre esa carpeta en VS Code. Conserva la misma `web/config.js`. Inicia el servidor local del paso 3 en la laptop y abre su `http://127.0.0.1:5500/web/`. Esa dirección siempre apunta al equipo donde estás navegando: no abre el servidor de tu PC.

No necesitas aplicar migraciones otra vez para visualizar el portal. Si vas a desarrollar desde ambos equipos, guarda y sube tus cambios antes de cambiar de equipo; actualiza la copia del otro equipo antes de editar. No subas `node_modules`, respaldos, contraseñas ni datos reales.

## 9. Alcance de las comprobaciones

Las siete migraciones y las cuatro pruebas SQL pasaron en PostgreSQL embebido con sustitutos de los servicios Auth y Storage. Se comprobaron permisos entre usuarios, separación de administrador, galería publicada/borrador y consulta del saldo propio. En navegador se probaron pantallas, filtros, galería, publicación y ocultación de fotos, edición de contenido y vista móvil con un cliente de datos controlado.

Quedan por verificar **en tu proyecto real**, tras instalar: correos/SMTP, subida y descarga mediante Storage remoto, sesiones reales simultáneas y publicación en GitHub Pages. No se utilizaron tus credenciales ni se ejecutaron cambios contra tu base remota. `docs/VERIFICACION.md` y `docs/ACEPTACION.md` detallan las pruebas y el recorrido de aceptación.

## Referencias oficiales

- [Publicar con GitHub Actions en Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Permisos de archivos en Supabase Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Buckets públicos y privados](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Redirecciones de Authentication](https://supabase.com/docs/guides/auth/redirect-urls)
- [Autenticación por correo](https://supabase.com/docs/guides/auth/passwords)
