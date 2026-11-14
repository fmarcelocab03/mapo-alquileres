# MAPO · Edificio Marcelo

Portal de huéspedes y administración de alquileres en Huancayo. La entrega completa incluye las pantallas hasta la 13, favoritos, reservas con detalle y saldo propio, perfil editable, galería del edificio y tablero administrativo. **Para actualizar tu proyecto existente y usarlo desde la laptop, comienza por [GUIA_ENTREGA.md](GUIA_ENTREGA.md).** La migración nueva es la número 7; las seis anteriores se conservan sin cambios.

## Guía de la primera instalación

Los pasos que siguen son para una instalación desde cero en desarrollo. Si ya tienes un proyecto instalado, usa la guía de actualización y no crees otra base. El documento Word incluido conserva la guía histórica de la primera versión; este README y GUIA_ENTREGA.md describen la entrega actual.

# Base de datos de MAPO en Supabase

Guía de instalación para el **Edificio Marcelo, Huancayo**. Incluye el portal con registro y acceso integrado, solicitudes por días o meses, galería administrable y operaciones de alquiler.

## 1 Preparar la carpeta en Windows

**1. Extrae el ZIP.** Haz clic derecho → **Extraer todo**. Abre la carpeta que contiene `package.json`, `README.md`, `web` y `supabase`. Puedes llamarla `mapo-alquileres`. No copies archivos nuevos encima de tu web actual: primero prueba este proyecto por separado.

**2. Abre esa carpeta en Visual Studio Code.** Usa **Archivo → Abrir carpeta** y **Terminal → Nuevo terminal**. Los comandos de esta guía son para PowerShell. Necesitas Git, Node.js LTS moderno (22 o superior) con npm y acceso a Supabase y GitHub. Para el servidor de prueba puedes usar Python o la alternativa de la página 4.

```powershell
node --version
npm.cmd --version
git --version
npm.cmd ci
npx.cmd supabase --version
```

El último comando debe mostrar **3.0.0**. El paquete fija esa versión de la CLI para que los comandos coincidan con la guía. No ejecutes `supabase init`: ya se incluye su configuración.

| Qué abrir | Para qué sirve |
|---|---|
| supabase/migrations | Siete archivos SQL en orden: modelo, operaciones, caja, permisos, ajustes, perfil/solicitudes y portal/galería. |
| web/index.html y web/config.js | Registro, acceso, búsqueda y panel de administración desde un navegador. |
| operacion | Verificar la instalación y asignar el primer administrador. |
| pruebas y docs | Pruebas SQL reversibles, diccionario del modelo y lista de comprobaciones reales. |

**Qué irá a cada lugar.** Supabase alojará cuentas, reservas, cobros y fotos. GitHub guardará el código y las migraciones que permiten reproducir la estructura. Subir el repositorio no crea la base ni copia sus datos.

<!-- page -->
## 2 Crear el proyecto y habilitar el registro

**3. Crea un proyecto de desarrollo.** Entra al [panel de Supabase](https://supabase.com/dashboard), inicia sesión y elige **New project**. Selecciona tu organización, escribe **mapo-desarrollo**, genera una contraseña de base de datos, guárdala en un gestor y escoge una región disponible cercana a tus usuarios. Pulsa **Create new project** y espera a que esté listo.

**4. Anota tres valores distintos.** Copia el **Project ID / Reference ID** desde la configuración general; también aparece en la URL del panel después de `/project/`. En **Connect** o **Settings → API Keys** copia la **Project URL** y la **Publishable key**. Si el menú cambia de lugar, busca esos tres nombres.

| Valor | Dónde se utilizará |
|---|---|
| Project ID o referencia | En la terminal, para vincular la carpeta al proyecto correcto. |
| Project URL | En web/config.js. Tiene la forma https://REFERENCIA.supabase.co y se copia sin barra final. |
| Publishable key | En web/config.js. Empieza por sb_publishable_. El ejemplo rechaza claves privadas. |

**5. Habilita correo y contraseña.** En **Authentication → Sign In / Providers**, activa **Email** y permite altas nuevas (**Allow new users to sign up**). Mantén **Confirm email** activado. Configura una longitud mínima de 10 caracteres para que coincida con el portal. En la configuración de **Data API**, comprueba que esté habilitada y exponga **public**; deja **mapo_privado** fuera de los esquemas expuestos.

**6. Configura el regreso del correo.** En **Authentication → URL Configuration**, durante las pruebas establece **Site URL** en `http://127.0.0.1:5500/web/` y añade la misma dirección a **Redirect URLs**. Guarda. Usa esa dirección exacta, incluida la barra final, al abrir el portal.

**Antes de registrar a huéspedes reales:** configura un remitente y SMTP propio en la configuración de correo de Authentication. El servicio de correo predeterminado de Supabase está restringido a direcciones autorizadas del equipo. Si no llega el enlace, revisa el destinatario, la carpeta de spam y los registros de Auth antes de repetir el envío.

<!-- page -->
## 3 Instalar y verificar la base

**7. Vincula la carpeta en la terminal de VS Code.** Sustituye `TU_PROJECT_REF` por la referencia de **mapo-desarrollo**. El inicio de sesión de la CLI autoriza a tu computadora como desarrollador; es distinto del inicio de sesión de los huéspedes.

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref TU_PROJECT_REF
npx.cmd supabase db push --remote --dry-run
```

Comprueba que el destino sea tu proyecto de desarrollo y que la vista previa enumere los siete archivos que aparecen en `supabase/migrations`. Si muestra cambios inesperados, comprueba la carpeta y la referencia antes de continuar. Esta ruta utiliza el proyecto alojado: **no necesitas Docker para estos comandos**.

**8. Aplica las migraciones una sola vez.** Con la versión 3 de la CLI, **--remote** indica que el destino es el proyecto vinculado. Sin esa opción, el destino predeterminado es local.

```powershell
npx.cmd supabase db push --remote
npx.cmd supabase migration list --remote
```

Acepta la aplicación cuando la CLI muestre los archivos esperados. En la lista deben coincidir las siete versiones locales y remotas. En adelante crea migraciones nuevas; no vuelvas a pegar estos archivos manualmente en SQL Editor en el mismo proyecto.

**9. Verifica el resultado.** Abre **SQL Editor → New query**. Copia el contenido completo de `operacion/02_verificar_instalacion.sql` y pulsa **Run**. Revisa que existan **Edificio Marcelo**, las fichas **gris** y **verde** sin publicar y el bucket privado **mapo-fotos**. Las 12 tablas de la aplicación deben tener seguridad por filas activa; la restricción se llama **mapo_sin_cruces**.

**10. Comprueba las reglas sin dejar datos de ejemplo.** Solo en desarrollo, ejecuta **por separado y completos**, en SQL Editor, los cuatro archivos de `pruebas/` (01 a 04). Cada archivo comienza una transacción y termina en **ROLLBACK**. Si tiene éxito, no queda ningún huésped ni movimiento de prueba; un error detiene la prueba y muestra el motivo.

<!-- page -->
## 4 Registrar una cuenta y dar acceso al administrador

**11. Conecta el portal de prueba.** En `web/config.js`, sustituye los dos valores por los obtenidos en el paso 4. Utiliza únicamente la URL y la clave publicable. Las claves secretas, la contraseña de la base y los datos SMTP no van en el navegador.

```javascript
window.MAPO_CONFIG = {
  url: "https://TU_REFERENCIA.supabase.co",
  key: "sb_publishable_TU_VALOR"
};
```

**12. Enciende el servidor desde la raíz del proyecto.** Si tienes Python para Windows, ejecuta el primer comando. Si Windows no reconoce `py`, utiliza el segundo **en su lugar**. Deja la terminal abierta.

```powershell
py -m http.server 5500 --bind 127.0.0.1
npx.cmd --yes http-server@14.1.1 . -a 127.0.0.1 -p 5500 -c-1
```

Abre [el portal local](http://127.0.0.1:5500/web/). No abras el archivo con doble clic. Introduce nombre, correo y contraseña, elige **Crear cuenta**, abre el correo, confirma el enlace y pulsa **Iniciar sesión** si el navegador te lo solicita.

**13. Comprueba el perfil.** En **Authentication → Users** aparecerá la cuenta. En **Table Editor → clientes** debe existir un registro con el mismo valor en `usuario_id`. No crees otra tabla de contraseñas. El formulario solo registra huéspedes: nadie obtiene acceso administrativo por su correo, nombre ni por una opción del registro.

**14. Autoriza tu cuenta administrativa.** Copia el **User UID** de tu cuenta confirmada desde **Authentication → Users**. Como propietario del proyecto abre **SQL Editor** y pega `operacion/01_primer_administrador.sql`. Reemplaza el UUID de ceros y el correo de ejemplo por los de la misma cuenta; ejecuta. Sal del portal e ingresa otra vez: aparecerá **Panel de MAPO**. Para un segundo administrador, repite solo tras verificar su identidad. El formulario público nunca asigna este permiso.

**Comprueba la separación.** Abre otro perfil de navegador o una ventana privada con una cuenta de huésped distinta. Allí debe verse el buscador, sin controles administrativos. Las reglas de la base siguen aplicándose aunque alguien intente llamar directamente a la API.

<!-- page -->
## 5 Poner los departamentos en operación

**15. Completa las fichas.** En el portal administrativo abre **Departamentos, tarifas y servicios**. Selecciona **Departamento gris**. Escribe la capacidad real, fecha de alta en inventario, descripción y la tarifa por noche o mes, en soles. Si no ofreces una modalidad, deja esa tarifa vacía. Marca **Visible en catálogo** y pulsa **Guardar ficha**. Repite con el verde. Para añadir otra unidad, selecciona **Crear nuevo** y utiliza un código único.

**16. Añade servicios y fotografías.** Crea o selecciona un servicio y asígnalo al departamento correcto. En **Fotos de los departamentos**, elige la unidad, el archivo, una descripción y el orden. Pulsa **Subir foto**. Se admiten JPG, PNG y WebP de hasta 5 MiB. El menor orden es la portada; **Editar** cambia descripción u orden y **Retirar foto** la quita. Los cambios se hacen desde el navegador.

**17. Prueba una reserva por días.** Desde la cuenta del huésped elige **Por días**, entrada, salida y huéspedes. Pulsa **Buscar disponibles → Solicitar**. Desde la cuenta administrativa abre **Solicitudes, ingresos y salidas** y confirma. El departamento quedará tomado desde la entrada hasta el día anterior a la salida. En el día de salida puede comenzar otra estancia. Una solicitud pendiente no bloquea el inventario.

**18. Prueba el alquiler mensual y los canales externos.** En **Mensual**, el huésped elige 1, 3, 6 o 12 meses. La base calcula la salida y, al confirmar, crea una cuota por mes. Para Airbnb o WhatsApp, el administrador registra o elige al cliente en **Reservas externas y bloqueos**, indica canal, referencia, fechas y precio si fue negociado. También puede bloquear un periodo por mantenimiento o uso del propietario.

**19. Registra el dinero cuando ocurra.** En **Cuotas, cobros y devoluciones**, elige la cuota y registra fecha, medio, importe y referencia. Una cuota de S/ 200 con un abono de S/ 75 queda **parcial**, con S/ 125 pendientes. Tras otro cobro de S/ 125 queda **pagada**. Una cancelación libera las fechas, pero el dinero recibido se conserva en el historial hasta registrar la devolución. Registra las garantías reembolsables por separado.

**20. Lee el tablero.** En **Ocupación y caja por mes**, la fecha indica quién tiene cada departamento, hasta cuándo y cuál es su próxima entrada. El año muestra los doce meses. Compara ocupación y resultado de caja por separado. Este último equivale a cobros menos devoluciones y gastos; las garantías no son ganancias. Los meses futuros muestran ocupación prevista.

<!-- page -->
## 6 Guardar el proyecto en GitHub

**21. Crea el repositorio.** En GitHub elige **New repository**, escribe `mapo-alquileres` y elige la visibilidad. Puedes comenzar en privado. Si partes de esta carpeta, no añadas un README, licencia ni .gitignore desde GitHub: ya tienes archivos locales. Copia la dirección HTTPS del repositorio vacío.

**22. Sube el código.** En la raíz del proyecto ejecuta los comandos siguientes. Sustituye `TU_USUARIO` por tu usuario u organización. Revisa lo que prepara Git antes del commit. Si ya trabajas dentro de un repositorio existente, **omite git init** y comprueba `git remote -v` antes de agregar otro origen.

```powershell
git init -b main
git status
git add .gitignore .github README.md GUIA_ENTREGA.md ACTUALIZAR.cmd package.json package-lock.json supabase web operacion pruebas docs
git diff --cached --stat
git commit -m "Prepara reservas y administracion de MAPO"
git remote add origin https://github.com/TU_USUARIO/mapo-alquileres.git
git push -u origin main
```

Si Git pide identidad, configura `git config user.name "Tu nombre"` y `git config user.email "Tu correo de GitHub"` en esta carpeta y repite el commit. Si solicita acceso al hacer push, sigue el inicio de sesión de GitHub en el navegador.

**Qué revisar antes de subir.** Puedes versionar la clave publicable. No incluyas `sb_secret_`, `service_role`, tokens personales, credenciales SMTP, volcados de la base, fotos privadas, comprobantes ni la copia del SQL de administrador rellenada con datos reales. El proyecto incluye un .gitignore y plantillas sin credenciales.

**23. Opcional: publica solo el portal.** En GitHub abre **Settings → Pages → Source → GitHub Actions**, si tu plan y la visibilidad lo permiten. En **Actions → Publicar portal MAPO → Run workflow**, elige **main**. El flujo incluido es manual y publica solo `web/`. Un push normal no despliega nada ni toca Supabase.

Cuando Pages indique su URL, por ejemplo `https://TU_USUARIO.github.io/mapo-alquileres/`, pon esa URL como **Site URL** y añádela a **Redirect URLs** de Authentication antes de probar correos en línea. Conserva la dirección local como adicional si seguirás probando. En Pages no se añade `/web/` porque se publica el contenido de esa carpeta.

<!-- page -->
## 7 Integrar las pantallas y mantener la base

**24. Revisa el portal integrado.** El catálogo, perfil, favoritos, solicitudes y administración consultan Supabase. Se conserva la carga de cinco segundos y el destino Huancayo. En Galería del edificio publica tus fotos; en Contenido del portal revisa los textos y canales de contacto. Sigue el recorrido de pantallas de `GUIA_ENTREGA.md` y los casos de `docs/ACEPTACION.md`.

**25. Haz una prueba con dos cuentas.** Sigue `docs/ACEPTACION.md`: verifica envío de correos, aislamiento de clientes, subida y visualización de fotos, dos confirmaciones para las mismas fechas, un pago parcial y una devolución. Hazlo con cuentas y cantidades de prueba. Este material no ha creado ningún proyecto ni cuenta en Supabase o GitHub.

**26. Prepara producción por separado.** Cuando ya vayas a recibir huéspedes reales, prepara otro proyecto, revisa su nombre y referencia antes de aplicar las migraciones, configura su propio SMTP, URLs y clave publicable, y autoriza de nuevo al administrador. Antes de operar, prueba la restauración de una copia de la base y el respaldo de los archivos de Storage: las copias de la base no incluyen por sí mismas los archivos de las fotos.

**Para cambios posteriores** usa `npx.cmd supabase migration new nombre_del_cambio`, edita el nuevo SQL, pruébalo primero en desarrollo y revisa la vista previa con `db push --remote --dry-run`. No ejecutes **db reset --remote** en la base del negocio. Cambiar una foto, una tarifa o un servicio desde el portal no requiere una migración ni un nuevo commit.

### Si algo no funciona

| Lo que ves | Qué comprobar |
|---|---|
| No llega el correo | Verifica SMTP, el remitente, el correo del destinatario y Authentication → Logs. |
| Confirma el correo pero regresa mal | Compara la URL completa, puerto, ruta y barra final con Site URL y Redirect URLs. |
| No aparece el panel | Valida el UID y correo de la cuenta confirmada; cierra sesión y vuelve a entrar. |
| No salen los departamentos | Comprueba publicación, tarifa de la modalidad, capacidad, alta, baja y fechas ocupadas. |
| No se permite la subida | Confirma sesión administrativa, bucket privado mapo-fotos, formato y tamaño máximo de 5 MiB. |

**Documentación oficial:** [CLI y migraciones](https://supabase.com/docs/guides/local-development/cli-workflows) · [Registro por correo](https://supabase.com/docs/guides/auth/passwords) · [Configuración SMTP](https://supabase.com/docs/guides/auth/auth-smtp) · [Claves de la API](https://supabase.com/docs/guides/api/api-keys) · [Seguridad por filas](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Control de Storage](https://supabase.com/docs/guides/storage/security/access-control) · [Copias de seguridad](https://supabase.com/docs/guides/platform/backups) · [Subir código a GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).
