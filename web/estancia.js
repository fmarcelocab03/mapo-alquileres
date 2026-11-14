"use strict";
(() => {
  const {
    db,
    ok,
    rpc,
    human,
    esc,
    icon,
    soles,
    fecha,
    hoy,
    sumarMeses,
    vuelta,
  } = MAPO;
  const { app, ir, ruta, modal, cerrar, toast, galeria } = Huesped;
  const main = document.getElementById("stay-main"),
    top = document.getElementById("stay-top-action");
  const $ = (s) => document.querySelector(s);
  let actual = "",
    unidad = null,
    version = 0,
    diap = 0,
    avatarURL = "",
    carrusel;
  const estados = {
    solicitada: "Pendiente de confirmación",
    confirmada: "Confirmada",
    en_curso: "En curso",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
  };
  const modalidades = { dias: "Por días", mensual: "Mensual" };
  const tarifa = (d, m) => (m === "dias" ? d.tarifa_dia : d.tarifa_mes);
  function limpiar() {
    version++;
    clearInterval(carrusel);
    if (avatarURL) URL.revokeObjectURL(avatarURL);
    avatarURL = "";
    main.replaceChildren();
    top.replaceChildren();
  }
  function borrador(d) {
    if (!app.drafts.has(d.id)) {
      const m =
        tarifa(d, app.modo) != null
          ? app.modo
          : d.tarifa_dia != null
            ? "dias"
            : "mensual";
      app.drafts.set(d.id, {
        modo: m,
        entrada: $("#arrival").value,
        salida: $("#departure").value,
        meses: +$("#months").value || 1,
        huespedes: 1,
        nombre: app.perfil.nombre,
        celular: app.perfil.telefono || "",
        mensaje: "",
        token: MAPO.uuid(),
      });
    }
    return app.drafts.get(d.id);
  }
  const finEstancia = (v) =>
    v.modo === "mensual" ? sumarMeses(v.entrada, v.meses) : v.salida;
  const noches = (a, b) =>
    Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  function segmento(d, v) {
    return `<div class="stay-segment" aria-label="Modalidad">${Object.entries(
      modalidades,
    )
      .map(
        ([k, label]) =>
          `<button type="button" data-stay-mode="${k}" aria-pressed="${v.modo === k}" ${tarifa(d, k) == null ? "disabled" : ""}>${icon(k === "dias" ? "calendar" : "building")}${label}</button>`,
      )
      .join("")}</div>`;
  }
  function fechasHTML(d, v) {
    const mensual = v.modo === "mensual";
    return `${segmento(d, v)}
      <div class="dates"><label>${mensual ? "Fecha de inicio" : "Llegada"}<input type="date" name="entrada" value="${esc(v.entrada)}" min="${hoy()}" required></label>
      ${mensual ? `<label>Duración<select name="meses">${[1, 3, 6, 12].map((k) => `<option value="${k}" ${k === v.meses ? "selected" : ""}>${k} ${k === 1 ? "mes" : "meses"}</option>`).join("")}</select></label>` : `<label>Salida<input type="date" name="salida" value="${esc(v.salida)}" min="${esc(v.entrada || hoy())}" required></label>`}
      <label class="wide">Huéspedes<select name="huespedes">${Array.from({ length: d.capacidad || 1 }, (_, i) => `<option value="${i + 1}" ${i + 1 === v.huespedes ? "selected" : ""}>${i + 1} ${i === 0 ? "huésped" : "huéspedes"}</option>`).join("")}</select></label></div>`;
  }
  function tomarDatos(f, v) {
    const obj = Object.fromEntries(new FormData(f));
    for (const k of ["entrada", "salida", "nombre", "celular", "mensaje"])
      if (k in obj) v[k] = obj[k];
    if (obj.meses) v.meses = +obj.meses;
    if (obj.huespedes) v.huespedes = +obj.huespedes;
  }
  function validar(d, v) {
    const fin = finEstancia(v);
    if (!v.entrada || v.entrada < hoy() || !fin || fin <= v.entrada)
      throw Error("Selecciona una llegada desde hoy y una salida posterior.");
    if (tarifa(d, v.modo) == null)
      throw Error("Esta modalidad no tiene una tarifa publicada.");
    if (v.huespedes < 1 || v.huespedes > d.capacidad)
      throw Error("Revisa la cantidad de huéspedes.");
    return fin;
  }
  function galHTML(d) {
    const fotos = galeria(d);
    if (!fotos.length)
      return `<div class="gallery no-photo">${icon("building")}<span>Sin fotografía publicada</span></div>`;
    if (diap >= fotos.length) diap = 0;
    const foto = fotos[diap];
    return `<figure class="gallery"><img id="gallery-image" src="${esc(foto.src)}" alt="${esc(foto.descripcion)}"><figcaption><span>${foto.referencia ? "Galería de referencia" : "Galería de MAPO"}</span><strong id="gallery-count">${diap + 1} / ${fotos.length}</strong></figcaption>
      ${fotos.length > 1 ? `<div class="gallery-nav"><button type="button" data-photo="-1" aria-label="Foto anterior">‹</button><button type="button" data-photo="1" aria-label="Foto siguiente">›</button></div>` : ""}</figure>`;
  }
  function cambiarFoto(paso) {
    if (actual !== "ficha" || !unidad || !$("#gallery-image")) return;
    const fotos = galeria(unidad);
    diap = (diap + paso + fotos.length) % fotos.length;
    $("#gallery-image").src = fotos[diap].src;
    $("#gallery-image").alt = fotos[diap].descripcion;
    $("#gallery-count").textContent = `${diap + 1} / ${fotos.length}`;
  }
  function detalle(d) {
    const v = borrador(d),
      lista = app.servicios
        .filter((s) => s.departamento_id === d.id && s.servicios)
        .map((s) => s.servicios.nombre);
    top.innerHTML = `<button class="icon-button stay-heart" data-favorite="${d.id}" aria-label="Guardar o quitar de favoritos" aria-pressed="${app.favoritos.has(d.id)}">${icon("heart")}</button>`;
    main.innerHTML = `<div class="stay-layout"><div class="stay-story">${galHTML(d)}<div class="stay-copy"><div class="kicker">ESTANCIAS MAPO</div><h1>${esc(d.nombre)}</h1><p class="place">${icon("pin")} ${esc(d.edificios?.nombre || "Edificio Marcelo")} · Huancayo</p><div class="mobile-modalidad">${segmento(d, v)}</div><hr><h2>Sobre este espacio</h2><p>${esc(d.descripcion || "Departamento en el Edificio Marcelo, Huancayo.")}</p>
      <div class="facts"><span>${icon("user")}${d.capacidad} huéspedes</span>${d.dormitorios != null ? `<span>${icon("bed")}${d.dormitorios} ${d.dormitorios === 1 ? "dormitorio" : "dormitorios"}</span>` : ""}</div><h2>Servicios</h2><div class="service-grid">${lista.length ? lista.map((n) => `<span>${icon(/wi.fi/i.test(n) ? "wifi" : "check")}${esc(n)}</span>`).join("") : "<p>MAPO aún no ha publicado servicios para esta ficha.</p>"}</div></div></div>
      <aside class="stay-box"><span class="kicker">TU ESTANCIA</span><h2>Consulta disponibilidad</h2><p class="muted">Elige la modalidad, las fechas y el número de huéspedes.</p><form id="estancia-form" class="stay-form">${fechasHTML(d, v)}<p class="price-line">${soles(tarifa(d, v.modo))}<small> / ${v.modo === "dias" ? "noche" : "mes"}</small></p><button class="button primary">Continuar ${icon("arrow")}</button><p class="feedback" role="status"></p></form></aside></div>`;
    if (
      galeria(d).length > 1 &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !document.body.classList.contains("motion-paused")
    ) {
      carrusel = setInterval(() => {
        if (
          !document.hidden &&
          location.hash === "#/ficha/" + d.id &&
          !main.matches(":focus-within") &&
          !main.matches(":hover")
        )
          cambiarFoto(1);
      }, 3000);
    }
  }
  function resumen(d, v) {
    const precio = tarifa(d, v.modo),
      fin = finEstancia(v),
      cantidad = v.modo === "mensual" ? v.meses : noches(v.entrada, fin);
    return `<div class="summary-row"><span>Tarifa por ${v.modo === "dias" ? "noche" : "mes"}</span><b>${soles(precio)}</b></div>
      <div class="summary-row"><span>${v.modo === "dias" ? "Noches" : "Meses"}</span><b>${Number.isFinite(cantidad) && cantidad > 0 ? cantidad : "—"}</b></div>
      ${v.modo === "mensual" ? `<div class="summary-row"><span>Salida prevista</span><b>${fecha(fin)}</b></div>` : ""}
      <div class="summary-row total"><span>Total estimado</span><b>${Number.isFinite(cantidad) && cantidad > 0 ? soles(cantidad * precio) : "Por confirmar"}</b></div>`;
  }
  function reserva(d) {
    const v = borrador(d);
    if (!v.entrada || !finEstancia(v)) {
      ir("ficha/" + d.id);
      return;
    }
    const foto = galeria(d)[0];
    main.innerHTML = `<div class="booking-wrap"><header class="page-title"><span class="kicker">SOLICITUD DE ESTANCIA</span><h1>Reserva tu espacio</h1><p>Revisa la modalidad, tus fechas y los datos de contacto.</p></header>
      <form id="estancia-form" class="booking-grid stay-form"><div class="booking-sheet"><div class="unit-mini">${foto ? `<img src="${esc(foto.src)}" alt="${esc(foto.descripcion)}">` : ""}<div><small>EDIFICIO MARCELO</small><h2>${esc(d.nombre)}</h2><p>Huancayo</p></div></div>
      <h2>Modalidad y fechas</h2>${fechasHTML(d, v)}<h2>Datos de contacto</h2><label>Nombre completo<input name="nombre" autocomplete="name" maxlength="150" value="${esc(v.nombre)}" required></label><label>Celular<input name="celular" type="tel" autocomplete="tel" maxlength="24" value="${esc(v.celular)}" placeholder="9 dígitos o código internacional" required></label><label>Mensaje opcional<textarea name="mensaje" rows="3" maxlength="600" placeholder="Algo que debamos saber sobre tu llegada">${esc(v.mensaje)}</textarea></label></div>
      <aside class="stay-box"><span class="kicker">TU SOLICITUD</span><h2>Resumen</h2><div id="resumen">${resumen(d, v)}</div><p class="muted">MAPO confirmará la disponibilidad. Enviar esta solicitud no realiza ningún cobro.</p><p class="muted">Revisa las <button type="button" class="text-button" data-dialog="terms">condiciones de tu estancia</button> antes de enviar.</p><button class="button primary">Enviar solicitud ${icon("arrow")}</button><p class="feedback" role="status"></p></aside></form></div>`;
  }
  main.addEventListener("input", (ev) => {
    if (!unidad || !ev.target.closest("#estancia-form")) return;
    const v = borrador(unidad);
    tomarDatos(ev.target.form, v);
    if (ev.target.name === "entrada" && ev.target.form.elements.salida)
      ev.target.form.elements.salida.min = v.entrada || hoy();
    if (actual === "reserva") $("#resumen").innerHTML = resumen(unidad, v);
  });
  main.addEventListener("submit", async (ev) => {
    if (ev.target.id !== "estancia-form") return;
    ev.preventDefault();
    const f = ev.target,
      b = ev.submitter,
      nota = f.querySelector(".feedback"),
      d = unidad,
      v = borrador(d),
      pant = actual,
      n = version;
    if (f.dataset.enviando) return;
    f.dataset.enviando = "1";
    b.disabled = true;
    nota.textContent = "Consultando MAPO…";
    try {
      tomarDatos(f, v);
      const fin = validar(d, v);
      if (pant === "ficha") {
        const disp = await rpc("disponibles", {
          p_entrada: v.entrada,
          p_salida: fin,
          p_modalidad: v.modo,
          p_huespedes: v.huespedes,
        });
        if (!disp.some((x) => x.departamento_id === d.id))
          throw Error(
            "Este departamento no está disponible para las fechas elegidas.",
          );
        if (n === version) ir("reserva/" + d.id);
      } else {
        const params = {
          p_departamento: d.id,
          p_modalidad: v.modo,
          p_entrada: v.entrada,
          p_salida: v.modo === "dias" ? v.salida : null,
          p_meses: v.modo === "mensual" ? v.meses : null,
          p_huespedes: v.huespedes,
          p_nombre: v.nombre.trim(),
          p_celular: v.celular.trim(),
          p_mensaje: v.mensaje.trim() || null,
        };
        const firma = JSON.stringify(params);
        if (v.firma && v.firma !== firma) v.token = MAPO.uuid();
        v.firma = firma;
        const id = await rpc("solicitar_estancia_web", {
          p_operacion: v.token,
          ...params,
        });
        app.drafts.delete(d.id);
        if (n === version) {
          app.ultimaSolicitud = id;
          ir("reserva-detalle/" + id);
          toast("Tu solicitud fue enviada. MAPO debe confirmarla.");
        }
      }
    } catch (e) {
      nota.textContent = human(e);
    } finally {
      delete f.dataset.enviando;
      b.disabled = false;
    }
  });
  function avatarMarkup() {
    const letras = (app.perfil.nombre || "M")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase();
    return `<div class="avatar">${avatarURL ? `<img src="${esc(avatarURL)}" alt="Mi foto de perfil">` : `<span>${esc(letras)}</span>`}<button class="avatar-change" type="button" data-avatar aria-label="Cambiar foto de perfil">${icon("camera")}</button></div>`;
  }
  async function obtenerAvatar(n) {
    const uid = app.user.id,
      alm = db.storage.from("mapo-avatares");
    const lista = await ok(alm.list(uid, { search: "perfil.jpg", limit: 5 }));
    const blob = lista.some((x) => x.name === "perfil.jpg")
      ? await ok(alm.download(uid + "/perfil.jpg"))
      : null;
    if (n !== version || app.user?.id !== uid || actual !== "perfil") return;
    if (avatarURL) URL.revokeObjectURL(avatarURL);
    avatarURL = blob ? URL.createObjectURL(blob) : "";
    $("#avatar-wrap").innerHTML = avatarMarkup();
  }
  function perfil(n) {
    const p = app.perfil;
    main.innerHTML = `<div class="profile-wrap"><header class="page-title"><span class="kicker">MI CUENTA</span><h1>Mi perfil</h1></header><div class="profile-grid"><aside class="identity"><div id="avatar-wrap">${avatarMarkup()}</div><h2>${esc(p.nombre)}</h2><span class="identity-role">${app.admin ? "Administrador de MAPO" : "Huésped de MAPO"}</span><button class="button primary" data-edit>Editar perfil</button>${app.admin ? '<a class="button secondary" href="admin.html">Panel de MAPO</a>' : ""}<button class="text-button logout-link" data-action="logout">Cerrar sesión</button></aside>
      <div><section class="profile-section"><h2>Datos personales</h2>${[
        ["Nombre completo", p.nombre],
        ["Correo electrónico", app.user.email],
        ["Celular", p.telefono],
        ["DNI", p.dni],
        ["Ciudad", p.ciudad],
      ]
        .map(
          ([k, v]) =>
            `<div class="profile-data"><span>${k}</span><strong>${esc(v || "Sin registrar")}</strong></div>`,
        )
        .join("")}
      <button type="button" class="text-button" data-email>Cambiar correo electrónico</button></section>
      <section class="profile-section"><h2>Mis alquileres</h2><button class="profile-link" data-list="reservas/dias">${icon("calendar")}Reservas por días <b>›</b></button><button class="profile-link" data-list="reservas/mensual">${icon("building")}Alquileres mensuales <b>›</b></button><button class="profile-link" data-list="favoritos">${icon("heart")}Mis favoritos <b>›</b></button><button class="profile-link" data-dialog="contact">${icon("help")}Ayuda y soporte <b>›</b></button></section><p id="foto-estado" role="status" class="feedback"></p></div></div></div>`;
    obtenerAvatar(n).catch((e) => {
      if (n === version && $("#foto-estado"))
        $("#foto-estado").textContent = human(e);
    });
  }
  function bindModal(fn) {
    const f = $("#profile-form");
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const b = ev.submitter,
        nota = f.querySelector(".feedback");
      if (f.dataset.busy) return;
      f.dataset.busy = "1";
      b.disabled = true;
      nota.textContent = "Guardando…";
      try {
        await fn(f, b);
      } catch (e) {
        nota.textContent = human(e);
      } finally {
        delete f.dataset.busy;
        b.disabled = false;
      }
    };
  }
  function editar() {
    const p = app.perfil;
    modal(
      "Editar mi perfil",
      `<form id="profile-form" class="stay-form"><label>Nombre completo<input name="nombre" autocomplete="name" maxlength="150" value="${esc(p.nombre)}" required></label><label>Celular<input name="tel" type="tel" autocomplete="tel" maxlength="24" value="${esc(p.telefono)}" placeholder="9 dígitos o código internacional"></label><label>DNI (opcional)<input name="dni" maxlength="8" pattern="[0-9]{8}" inputmode="numeric" value="${esc(p.dni)}" title="8 dígitos, incluidos los ceros iniciales"></label><label>Ciudad (opcional)<input name="ciudad" autocomplete="address-level2" maxlength="100" value="${esc(p.ciudad)}"></label><button class="button primary">Guardar cambios</button><p class="feedback" role="status"></p></form>`,
    );
    bindModal(async (f) => {
      const v = Object.fromEntries(new FormData(f));
      await rpc("guardar_mi_ficha", {
        p_nombre: v.nombre,
        p_celular: v.tel,
        p_dni: v.dni,
        p_ciudad: v.ciudad,
      });
      app.perfil = await ok(
        db
          .from("clientes")
          .select("id,nombre,correo,telefono,dni,ciudad")
          .eq("usuario_id", app.user.id)
          .single(),
      );
      cerrar();
      ruta();
      toast("Tus datos quedaron guardados.");
    });
  }
  function correo() {
    modal(
      "Cambiar correo electrónico",
      `<form id="profile-form" class="stay-form"><p>Actualmente ingresas con <b>${esc(app.user.email)}</b>.</p><label>Nuevo correo<input name="email" type="email" autocomplete="email" required></label><p class="muted">Recibirás un correo para confirmar el cambio. Tu perfil y tus reservas seguirán asociados a tu cuenta.</p><button class="button primary">Solicitar cambio de correo</button><p class="feedback" role="status"></p></form>`,
    );
    bindModal(async (f) => {
      const email = f.elements.email.value.trim().toLowerCase();
      if (email === app.user.email.toLowerCase())
        throw Error("Escribe una dirección diferente.");
      await ok(db.auth.updateUser({ email }, { emailRedirectTo: vuelta }));
      cerrar();
      modal(
        "Cambio de correo solicitado",
        "<p>Revisa la bandeja del correo actual y del nuevo. Completa las confirmaciones que te envíe MAPO; después podrás iniciar sesión con la nueva dirección.</p>",
      );
    });
  }
  async function jpeg(file) {
    if (
      !file ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      throw Error("Elige JPG, PNG o WebP de hasta 5 MiB.");
    const url = URL.createObjectURL(file),
      im = new Image();
    try {
      im.src = url;
      await im.decode();
      const s = Math.min(im.naturalWidth, im.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = Math.min(s, 640);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        im,
        (im.naturalWidth - s) / 2,
        (im.naturalHeight - s) / 2,
        s,
        s,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.87),
      );
      if (!blob || blob.size > 2097152)
        throw Error("No se pudo preparar la foto.");
      return blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function foto() {
    modal(
      "Foto de perfil",
      `<form id="profile-form" class="stay-form"><p>Tu foto es privada. Elige una imagen JPG, PNG o WebP de hasta 5 MiB. Se mostrará centrada en un círculo.</p><label>Imagen<input type="file" name="foto" accept="image/jpeg,image/png,image/webp"></label><button class="button primary" value="guardar">Guardar foto</button>${avatarURL ? '<button class="button secondary" value="quitar">Quitar mi foto</button>' : ""}<p class="feedback" role="status"></p></form>`,
    );
    bindModal(async (f, b) => {
      const alm = db.storage.from("mapo-avatares"),
        path = app.user.id + "/perfil.jpg";
      if (b.value === "quitar") await ok(alm.remove([path]));
      else
        await ok(
          alm.upload(path, await jpeg(f.elements.foto.files[0]), {
            contentType: "image/jpeg",
            cacheControl: "0",
            upsert: true,
          }),
        );
      cerrar();
      ruta();
      toast(
        b.value === "quitar" ? "Foto retirada." : "Foto de perfil actualizada.",
      );
    });
  }
  async function reservas(tipo, n) {
    const todas = await ok(
      db
        .from("reservas")
        .select(
          "id,estado,entrada,salida,departamento_id,modalidad,huespedes,mensaje_huesped,departamentos(nombre)",
        )
        .eq("cliente_id", app.perfil.id)
        .eq("clase", "alquiler")
        .order("creado_en", { ascending: false }),
    );
    if (n !== version) return;
    const filas = tipo ? todas.filter((x) => x.modalidad === tipo) : todas;
    main.innerHTML = `<div class="list-wrap"><header class="page-title"><span class="kicker">MI ESTANCIA</span><h1>Mis reservas</h1><p>Sigue el estado de tus solicitudes a MAPO.</p></header><div class="filter-pills">${[
      ["", "Todas"],
      ["dias", "Por días"],
      ["mensual", "Mensual"],
    ]
      .map(
        ([k, label]) =>
          `<button data-list="reservas${k ? "/" + k : ""}" aria-pressed="${k === (tipo || "")}">${label}</button>`,
      )
      .join("")}</div>
    ${filas.map((r) => `<article class="record"><span class="status-chip">${esc(estados[r.estado] || r.estado)}</span><h2>${esc(r.departamentos?.nombre || "Departamento de MAPO")}</h2><p>${fecha(r.entrada)} — ${fecha(r.salida)} · ${r.huespedes} ${r.huespedes === 1 ? "huésped" : "huéspedes"}</p><small>${esc(modalidades[r.modalidad])} · ${esc(r.id.slice(0, 8))}</small>${r.mensaje_huesped ? `<p>Tu mensaje · ${esc(r.mensaje_huesped)}</p>` : ""}${r.estado === "solicitada" ? `<button class="text-button" data-retirar="${r.id}">Retirar solicitud</button>` : ""}</article>`).join("") || '<div class="stay-empty">Todavía no tienes reservas de esta modalidad.</div>'}</div>`;
  }
  function favoritos() {
    const ds = app.deps.filter((d) => app.favoritos.has(d.id));
    main.innerHTML = `<div class="list-wrap"><header class="page-title"><span class="kicker">MI ESTANCIA</span><h1>Mis favoritos</h1></header>${ds.map((d) => `<article class="record"><h2>${esc(d.nombre)}</h2><button class="text-button" data-property="${d.id}">Ver departamento</button><button class="text-button" data-favorite="${d.id}">Quitar de favoritos</button></article>`).join("") || '<div class="stay-empty">Guarda un departamento con el corazón de su ficha.</div>'}</div>`;
  }
  function pintar(vista, id) {
    const n = ++version;
    document.title =
      "MAPO · " +
      ({
        ficha: "Tu departamento",
        reserva: "Reserva tu espacio",
        perfil: "Mi perfil",
      }[vista] || "Mi estancia");
    clearInterval(carrusel);
    actual = vista;
    unidad = null;
    top.replaceChildren();
    main.replaceChildren();
    main
      .closest("section")
      .querySelectorAll(".nav-item")
      .forEach((b) =>
        b.classList.toggle(
          "active",
          b.dataset.dialog ===
            (vista === "perfil"
              ? "profile"
              : vista === "reservas"
                ? "reservations"
                : ""),
        ),
      );
    if (vista === "ficha" || vista === "reserva") {
      unidad = app.deps.find((d) => d.id === id);
      if (!unidad) {
        main.innerHTML =
          '<p class="stay-empty">Este departamento ya no está publicado. <button data-action="home">Volver al inicio</button></p>';
        return;
      }
      if (vista === "ficha") {
        diap = 0;
        detalle(unidad);
      } else reserva(unidad);
    } else if (vista === "perfil") perfil(n);
    else if (vista === "reservas") {
      main.innerHTML =
        '<p class="stay-empty" role="status">Consultando tus reservas…</p>';
      reservas(id, n).catch((e) => {
        if (n === version) main.textContent = human(e);
      });
    } else if (vista === "favoritos") favoritos();
    else ir("inicio");
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-back") && !window.Experiencia?.activa())
      ir(actual === "reserva" && unidad ? "ficha/" + unidad.id : "inicio");
    else if (b.hasAttribute("data-edit")) editar();
    else if (b.hasAttribute("data-email")) correo();
    else if (b.hasAttribute("data-avatar")) foto();
    else if (b.dataset.list) ir(b.dataset.list);
    else if (b.dataset.photo) cambiarFoto(+b.dataset.photo);
    else if (b.dataset.stayMode && unidad) {
      const v = borrador(unidad);
      tomarDatos($("#estancia-form"), v);
      v.modo = b.dataset.stayMode;
      if (v.modo === "dias" && !v.salida && v.entrada)
        v.salida = sumarMeses(v.entrada, v.meses);
      pintar(actual, unidad.id);
    } else if (b.dataset.retirar) {
      const id = b.dataset.retirar;
      modal(
        "Retirar solicitud",
        '<form id="profile-form" class="stay-form"><label>Motivo<textarea name="motivo" maxlength="300" required></textarea></label><button class="button primary">Confirmar retiro</button><p class="feedback" role="status"></p></form>',
      );
      bindModal(async (f) => {
        await rpc("cancelar", {
          p_reserva: id,
          p_motivo: f.elements.motivo.value,
        });
        cerrar();
        ruta();
        toast("Solicitud retirada.");
      });
    }
  });
  window.Estancia = { pintar, limpiar };
})();
