"use strict";
(() => {
  const { db, ok, rpc, esc, icon, soles, fecha, hoy, human } = MAPO;
  const { app, ir, modal, cerrar, toast, galeria, modo } = Huesped;
  const contenido = ContenidoMAPO;
  const main = document.getElementById("stay-main"),
    top = document.getElementById("stay-top-action");
  const $ = (s) => document.querySelector(s);
  const vistas = [
    "favoritos",
    "reservas",
    "reserva-detalle",
    "sobre",
    "ayuda",
    "condiciones",
    "lugar",
  ];
  const estados = {
    solicitada: "Por confirmar",
    confirmada: "Confirmada",
    en_curso: "En curso",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
  };
  const nombres = {
    favoritos: "Mis favoritos",
    reservas: "Mis reservas",
    "reserva-detalle": "Tu estancia",
    sobre: "Sobre MAPO",
    ayuda: "Ayuda y contacto",
    condiciones: "Condiciones del alquiler",
    lugar: "Conoce el edificio",
  };
  let vista = "",
    version = 0,
    reservas = [],
    filtroReserva = "todos",
    filtroModo = "",
    busqueda = "",
    filtroFav = "todos",
    categoria = "todos",
    lightFotos = [],
    lightIndex = 0;
  const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  const labelModo = (m) => (m === "mensual" ? "Mensual" : "Por días");
  const encabezado = (titulo, sub, kicker = "TU ESPACIO MAPO") =>
    `<header class="page-title experience-title"><div><span class="kicker">${esc(kicker)}</span><h1 tabindex="-1">${esc(titulo)}</h1><p>${esc(sub)}</p></div><span class="title-emblem" aria-hidden="true">${icon(vista === "favoritos" ? "heart" : vista === "reservas" ? "calendar" : vista === "ayuda" ? "help" : "building")}</span></header>`;
  const vacio = (titulo, texto, ico = "building") =>
    `<div class="experience-empty"><span>${icon(ico)}</span><h2>${esc(titulo)}</h2><p>${esc(texto)}</p><button class="button secondary" data-action="explore">Explorar departamentos ${icon("arrow")}</button></div>`;
  const aviso = (texto) =>
    `<p class="soft-notice">${icon("info")}<span>${esc(texto)}</span></p>`;
  const chip = (estado) =>
    `<span class="reservation-state state-${esc(estado)}"><i></i>${esc(estados[estado] || estado)}</span>`;
  const segment = (items, actual, atributo) =>
    `<div class="experience-tabs" aria-label="Filtrar resultados">${items.map(([value, label]) => `<button type="button" data-${atributo}="${value}" aria-pressed="${value === actual}">${label}</button>`).join("")}</div>`;
  function limpiar() {
    version++;
    vista = "";
  }
  function errorCarga(error) {
    return `<div class="load-error" role="alert">${icon("info")}<p>No pudimos actualizar esta información. Revisa tu conexión e inténtalo otra vez.</p><button class="button secondary" data-retry>Reintentar</button>${app.admin ? `<small>${esc(contenido.mensajeError(error))}</small>` : ""}</div>`;
  }
  function canales(
    mensaje = "Hola, quisiera información sobre una estancia en el Edificio Marcelo.",
  ) {
    const c = contenido.config;
    return `<div class="contact-actions">${c.whatsapp ? `<a class="button primary" href="https://wa.me/${esc(c.whatsapp)}?text=${encodeURIComponent(mensaje)}" target="_blank" rel="noopener noreferrer">${icon("phone")} Escribir por WhatsApp ${icon("arrow")}</a>` : ""}<div>${c.telefono ? `<a class="button secondary" href="tel:${esc(c.telefono)}">${icon("phone")} Llamar</a>` : ""}${c.correo ? `<a class="button secondary" href="mailto:${esc(c.correo)}?subject=${encodeURIComponent("Consulta sobre el Edificio Marcelo")}&body=${encodeURIComponent(mensaje)}">${icon("mail")} Enviar correo</a>` : ""}</div>${!c.whatsapp && !c.telefono && !c.correo ? "<p>Los canales de atención se publicarán aquí.</p>" : ""}</div>`;
  }
  function fotoHTML(f, clase = "", loading = "lazy") {
    return f?.src
      ? `<img class="${clase}" src="${esc(f.src)}" alt="${esc(f.descripcion || f.titulo || "Ambiente de MAPO")}" loading="${loading}" decoding="async">`
      : `<span class="image-missing">${icon("building")}<span>Fotografía por publicar</span></span>`;
  }
  function tarjeta(d, m = "todos") {
    const foto = galeria(d)[0],
      seleccion =
        m === "todos" ? (d.tarifa_dia != null ? "dias" : "mensual") : m;
    const servicios = app.servicios
      .filter((x) => x.departamento_id === d.id)
      .map((x) => x.servicios?.nombre)
      .filter(Boolean)
      .slice(0, 3);
    const rate =
      m === "todos" && d.tarifa_dia != null && d.tarifa_mes != null
        ? `${soles(d.tarifa_dia)} / noche <small>${soles(d.tarifa_mes)} / mes</small>`
        : `${soles(seleccion === "dias" ? d.tarifa_dia : d.tarifa_mes)} <small>por ${seleccion === "dias" ? "noche" : "mes"}</small>`;
    return `<article class="saved-card"><div class="saved-photo">${fotoHTML(foto)}${foto?.referencia ? '<span class="reference-tag">Imagen referencial</span>' : ""}<button class="favorite-button" data-favorite="${d.id}" aria-label="Quitar ${esc(d.nombre)} de favoritos" aria-pressed="true">${icon("heart")}</button></div><div class="saved-content"><div class="card-eyebrow">EDIFICIO MARCELO <span>${m === "todos" && d.tarifa_dia != null && d.tarifa_mes != null ? "Por días · Mensual" : labelModo(seleccion)}</span></div><h2>${esc(d.nombre)}</h2><p class="place">${icon("pin")} Huancayo, Perú</p><div class="mini-services">${servicios.length ? servicios.map((s) => `<span>${icon(/wi.fi/i.test(s) ? "wifi" : "check")}${esc(s)}</span>`).join("") : `<span>${icon("user")}${d.capacidad} huéspedes</span>`}</div><div class="saved-bottom"><span class="card-price">${rate}</span><button class="button primary" data-open-property="${d.id}" data-modality="${seleccion}">Ver detalles ${icon("arrow")}</button></div></div></article>`;
  }
  function favoritos() {
    const todos = app.deps.filter((d) => app.favoritos.has(d.id));
    const lista = todos.filter(
      (d) =>
        filtroFav === "todos" ||
        (filtroFav === "dias" ? d.tarifa_dia : d.tarifa_mes) != null,
    );
    main.innerHTML = `<div class="experience-wrap">${encabezado("Mis favoritos", "Tus espacios guardados, en un solo lugar.", "ESPACIOS QUE TE GUSTAN")}${segment(
      [
        ["todos", "Todos"],
        ["dias", "Por días"],
        ["mensual", "Mensual"],
      ],
      filtroFav,
      "favorite-filter",
    )}<p class="result-count" role="status">${lista.length} ${lista.length === 1 ? "espacio guardado" : "espacios guardados"}</p><div class="saved-grid">${lista.map((d) => tarjeta(d, filtroFav)).join("")}</div>${lista.length ? '<div class="explore-more"><button class="button secondary" data-action="explore">Seguir explorando ' + icon("arrow") + "</button></div>" : vacio(todos.length ? "Prueba otra modalidad" : "Aquí empieza tu próxima estancia", todos.length ? "Tus favoritos pueden estar disponibles por días o por mes." : "Toca el corazón de un departamento para guardarlo y volver cuando quieras.", "heart")}</div>`;
  }
  function historial(r) {
    return ["cancelada", "finalizada"].includes(r.estado) || r.salida <= hoy();
  }
  function reservationCard(r) {
    const d = app.deps.find((x) => x.id === r.departamento_id),
      foto = d ? galeria(d)[0] : null;
    return `<article class="reservation-card"><div class="reservation-photo">${fotoHTML(foto)}${foto?.referencia ? '<span class="reference-tag">Imagen referencial</span>' : ""}${chip(r.estado)}</div><div class="reservation-content"><div class="card-eyebrow">${labelModo(r.modalidad)}<span>N.º ${esc(r.id.slice(0, 8).toUpperCase())}</span></div><h2>${esc(r.departamentos?.nombre || d?.nombre || "Departamento de tu reserva")}</h2><p class="place">${icon("pin")} Edificio Marcelo · Huancayo</p><div class="reservation-dates"><div>${icon("calendar")}<span>Llegada<strong>${fecha(r.entrada)}</strong></span></div><div>${icon("calendar")}<span>Salida<strong>${fecha(r.salida)}</strong></span></div></div><div class="reservation-bottom"><span>${r.huespedes} ${r.huespedes === 1 ? "huésped" : "huéspedes"} · ${r.modalidad === "mensual" ? r.meses + " " + (r.meses === 1 ? "mes" : "meses") : dias(r.entrada, r.salida) + " noches"}</span><button class="button ${r.estado === "solicitada" ? "secondary" : "primary"}" data-booking="${r.id}">${r.estado === "solicitada" ? "Ver solicitud" : "Ver reserva"} ${icon("arrow")}</button></div></div></article>`;
  }
  function pintarReservas() {
    const texto = busqueda.toLocaleLowerCase("es");
    const rows = reservas.filter(
      (r) =>
        (filtroReserva === "todos" ||
          (filtroReserva === "historial" ? historial(r) : !historial(r))) &&
        (!filtroModo || r.modalidad === filtroModo) &&
        (!texto ||
          ((r.departamentos?.nombre || "") + " " + r.id)
            .toLocaleLowerCase("es")
            .includes(texto)),
    );
    main.innerHTML = `<div class="experience-wrap">${encabezado("Mis reservas", "Consulta y organiza tus estancias en Huancayo.", "CADA ESTANCIA, A MANO")}<div class="reservation-toolbar">${segment(
      [
        ["todos", "Todos"],
        ["proximas", "Próximas"],
        ["historial", "Historial"],
      ],
      filtroReserva,
      "reservation-filter",
    )}<button class="button secondary compact" data-reload-reservations>${icon("calendar")} Actualizar</button></div><div class="list-tools"><label><span>Modalidad</span><select id="reservation-modality"><option value="">Todas las modalidades</option><option value="dias" ${filtroModo === "dias" ? "selected" : ""}>Por días</option><option value="mensual" ${filtroModo === "mensual" ? "selected" : ""}>Mensual</option></select></label><label><span>Buscar una estancia</span><input id="reservation-search" type="search" placeholder="Departamento o número de reserva" value="${esc(busqueda)}"></label></div><p class="result-count" role="status">${rows.length} ${rows.length === 1 ? "estancia" : "estancias"}${filtroReserva === "proximas" ? " · Incluye estancias en curso" : ""}</p><div class="reservation-grid">${rows.map(reservationCard).join("")}</div>${rows.length ? aviso("MAPO confirma la disponibilidad de las solicitudes pendientes. Puedes consultar el estado actualizado al abrir cada reserva.") : vacio("Tu próxima estancia te espera", reservas.length ? "No encontramos reservas con estos filtros." : "Cuando envíes una solicitud, podrás seguir su estado aquí.", "calendar")}<div class="explore-more"><button class="button ${rows.length ? "primary" : "secondary"}" data-action="explore">Explorar departamentos ${icon("arrow")}</button></div></div>`;
    $("#reservation-modality").onchange = (e) => {
      filtroModo = e.target.value;
      pintarReservas();
      $("#reservation-modality").focus();
    };
    $("#reservation-search").oninput = (e) => {
      busqueda = e.target.value;
      const pos = e.target.selectionStart;
      pintarReservas();
      const f = $("#reservation-search");
      f.focus();
      try {
        f.setSelectionRange(pos, pos);
      } catch {}
    };
  }
  async function cargarReservas(n) {
    const lista = await contenido.todos(() =>
      db
        .from("reservas")
        .select(
          "id,estado,entrada,salida,departamento_id,modalidad,huespedes,meses,creado_en,departamentos(nombre)",
        )
        .eq("cliente_id", app.perfil.id)
        .eq("clase", "alquiler")
        .order("creado_en", { ascending: false })
        .order("id"),
    );
    if (n === version && vista === "reservas") {
      reservas = lista;
      pintarReservas();
    }
  }
  function faq() {
    const items = [
      [
        "¿Cómo solicito una reserva?",
        "Abre un departamento, elige Por días o Mensual y selecciona tus fechas y huéspedes. Pulsa Continuar, revisa tus datos y envía la solicitud. MAPO debe confirmar la disponibilidad antes de tu llegada.",
      ],
      [
        "¿Puedo alquilar por mes?",
        "Sí. Elige Mensual en un departamento que tenga esa modalidad y selecciona la duración. Verás la fecha de salida y el importe estimado antes de enviar. Coordina con MAPO los servicios incluidos y las condiciones de tu estancia.",
      ],
      [
        "¿Dónde veo mis reservas?",
        "En Mis reservas, desde la barra inferior. Puedes filtrar las próximas estancias y el historial. Abre una reserva para consultar sus fechas, estado y cuotas registradas.",
      ],
      [
        "¿Enviar una solicitud realiza un cobro?",
        "No. La solicitud permite que MAPO revise las fechas y te confirme la estancia. Los pagos se coordinan con MAPO y aparecen en el detalle cuando son registrados.",
      ],
      [
        "¿Cómo cambio o retiro una solicitud?",
        "Si todavía está pendiente, abre su detalle y elige Retirar solicitud. Para modificar fechas o cancelar una reserva confirmada, comunícate con MAPO.",
      ],
      [
        "¿Puedo ingresar desde otra computadora?",
        "Sí. Abre el mismo enlace de MAPO e inicia sesión con tu cuenta. Tus reservas, favoritos y perfil se guardan en tu cuenta y pueden consultarse desde otro dispositivo.",
      ],
    ];
    return `<div class="faq-list">${items.map(([q, a]) => `<details><summary>${esc(q)}<span aria-hidden="true">+</span></summary><p>${esc(a)}</p></details>`).join("")}</div>`;
  }
  function ayuda() {
    const c = contenido.config;
    main.innerHTML = `<div class="experience-wrap">${encabezado("Ayuda y contacto", "Estamos cerca, incluso antes de tu llegada.", "CONVERSEMOS")}<div class="information-grid"><div><article class="contact-card"><span class="contact-symbol">${icon("help")}</span><span class="kicker">ATENCIÓN MAPO</span><h2>Hablemos de tu próxima estancia.</h2><p>Te acompañamos con la disponibilidad, las reservas y los detalles de tu llegada.</p>${canales()}<p class="contact-hours">${esc(c.horario)}</p></article><article class="location-card">${icon("pin")}<div><span class="kicker">ENCUÉNTRANOS</span><h2>${esc(c.ubicacion)}</h2><a class="text-button" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.ubicacion)}" target="_blank" rel="noopener noreferrer">Ver ubicación en el mapa</a></div></article></div><section class="faq-section"><span class="kicker">LO QUE QUIERES SABER</span><h2>Resolvemos tus dudas</h2>${faq()}<button class="text-button" data-list="condiciones">Leer condiciones del alquiler</button></section></div></div>`;
  }
  function portada() {
    const f = contenido.fotos.find((x) => x.src);
    return `<figure class="about-photo">${f ? fotoHTML(f, "", "eager") : '<img src="assets/edificio-mapo-hd.png" alt="Ilustración referencial del edificio en Huancayo"><figcaption>Imagen referencial</figcaption>'}</figure>`;
  }
  function sobre() {
    main.innerHTML = `<div class="experience-wrap">${encabezado("Sobre MAPO", "Tu próximo espacio en Huancayo.", "BIENVENIDO AL EDIFICIO MARCELO")}<article class="about-grid">${portada()}<div class="about-copy"><span class="kicker">POR UNOS DÍAS. POR UNA NUEVA ETAPA.</span><h2>Más que un espacio,<br><em>un lugar para sentirte en casa.</em></h2><p class="preserve-lines">${esc(contenido.config.sobre_texto)}</p><button class="button primary" data-list="lugar">Conoce el edificio ${icon("arrow")}</button></div></article><section class="choose-stay"><div><span class="kicker">A TU MANERA</span><h2>Una estancia que se adapta a ti</h2></div><button class="choice-card" data-explore-mode="dias">${icon("calendar")}<span><strong>Por días</strong><small>Una visita a Huancayo, con un espacio para ti.</small></span><b aria-hidden="true">›</b></button><button class="choice-card" data-explore-mode="mensual">${icon("building")}<span><strong>Alquiler mensual</strong><small>Un lugar para acompañar tu nueva etapa.</small></span><b aria-hidden="true">›</b></button></section><aside class="experience-help"><div><h2>Te ayudamos a encontrar tu espacio</h2><p>Cuéntanos cómo imaginas tu estancia.</p></div><button class="button secondary" data-list="ayuda">Contactar a MAPO ${icon("arrow")}</button></aside></div>`;
  }
  function condiciones() {
    const c = contenido.config;
    main.innerHTML = `<div class="experience-wrap">${encabezado("Condiciones del alquiler", "Los detalles que conviene conocer antes de tu estancia.", "VIAJA CON LA INFORMACIÓN A MANO")}<div class="terms-layout"><aside class="terms-aside">${portada()}<h2>Todo listo para<br><em>sentirte en casa.</em></h2><p>Revisa la información y conversa con MAPO antes de confirmar.</p><button class="button primary" data-list="ayuda">Consultar con MAPO ${icon("arrow")}</button></aside><div class="terms-cards">${[
      ["calendar", "Disponibilidad", "condiciones_disponibilidad"],
      ["file", "Tarifas y pagos", "condiciones_pagos"],
      ["home", "Ingreso y salida", "condiciones_llegada"],
      ["info", "Cambios y cancelación", "condiciones_cambios"],
    ]
      .map(
        ([i, t, k], n) =>
          `<article><div class="term-icon">${icon(i)}</div><div><span class="term-number">0${n + 1}</span><h2>${t}</h2><p class="preserve-lines">${esc(c[k])}</p></div></article>`,
      )
      .join(
        "",
      )}${aviso("Tu solicitud está sujeta a confirmación de disponibilidad por MAPO.")}${c.actualizado_en ? `<p class="updated-note">Información actualizada el ${fecha(c.actualizado_en.slice(0, 10))}.</p>` : ""}</div></div></div>`;
  }
  function placeTile(f, i) {
    return `<button class="place-tile" data-place-photo="${esc(f.id)}" aria-label="Ampliar ${esc(f.titulo)}">${fotoHTML(f)}<span class="place-gradient"></span><span class="place-caption"><small>${esc(contenido.categorias[f.categoria])}</small><strong>${esc(f.titulo)}</strong></span><span class="place-expand" aria-hidden="true">›</span></button>`;
  }
  function galeriaInicio() {
    const box = $("#home-lugar"),
      c = contenido.config,
      fs = contenido.fotos;
    box.innerHTML = `<div class="section-heading"><div><span class="eyebrow">TU PRÓXIMO LUGAR EN HUANCAYO</span><h2>${esc(c.galeria_titulo)}</h2></div>${fs.length ? '<button class="text-button" data-list="lugar">Ver galería</button>' : ""}</div><p class="section-intro">${esc(c.galeria_texto)}</p>${fs.length ? `<div class="place-mosaic">${fs.slice(0, 3).map(placeTile).join("")}</div><div class="place-foot"><span>${fs.length} ${fs.length === 1 ? "fotografía" : "fotografías"} · Edificio Marcelo</span><button class="text-button" data-list="lugar">Explora cada rincón ${icon("arrow")}</button></div>` : `<div class="place-pending"><div><span class="kicker">EDIFICIO MARCELO</span><h3>Tu vida aquí empieza con una mirada.</h3><p>Estamos preparando un recorrido por nuestros ambientes. Mientras tanto, conoce las opciones para tu estancia.</p><button class="button secondary" data-dialog="about">Conocer MAPO ${icon("arrow")}</button></div><span class="place-pending-icon" aria-hidden="true">${icon("building")}</span></div>`}`;
  }
  async function inicio() {
    const n = version;
    galeriaInicio();
    try {
      await contenido.cargar();
      if (n === version && !vista) galeriaInicio();
    } catch (e) {
      if (n === version && !vista)
        $("#home-lugar").innerHTML =
          `<div class="section-heading"><h2>${esc(contenido.config.galeria_titulo)}</h2></div>${errorCarga(e)}`;
    }
  }
  function lugar() {
    const c = contenido.config,
      fs = contenido.fotos.filter(
        (f) => categoria === "todos" || f.categoria === categoria,
      );
    main.innerHTML = `<div class="experience-wrap">${encabezado(c.galeria_titulo, c.galeria_texto, "ASÍ SE VIVE EN MAPO")}${segment([["todos", "Todo"], ...Object.entries(contenido.categorias)], categoria, "place-filter")}<p class="result-count" role="status">${fs.length} ${fs.length === 1 ? "fotografía" : "fotografías"}</p>${fs.length ? `<div class="place-grid">${fs.map(placeTile).join("")}</div>` : vacio("Un recorrido que pronto podrás descubrir", "MAPO está preparando las fotografías de estos ambientes.")}<aside class="experience-help"><div><h2>¿Ya te imaginas aquí?</h2><p>Encuentra el departamento para tu próxima estancia.</p></div><button class="button primary" data-action="explore">Ver departamentos ${icon("arrow")}</button></aside></div>`;
  }
  function lightbox(id) {
    lightFotos = contenido.fotos.filter(
      (f) =>
        f.src &&
        (vista !== "lugar" ||
          categoria === "todos" ||
          f.categoria === categoria),
    );
    lightIndex = lightFotos.findIndex((f) => f.id === id);
    if (lightIndex < 0) return;
    mostrarLightbox();
  }
  function mostrarLightbox() {
    const f = lightFotos[lightIndex];
    modal(
      f.titulo,
      `<div class="place-lightbox"><img src="${esc(f.src)}" alt="${esc(f.descripcion || f.titulo)}"><div class="lightbox-controls"><button class="icon-button" data-light-step="-1" aria-label="Fotografía anterior" ${lightFotos.length < 2 ? "disabled" : ""}>‹</button><span aria-live="polite">${lightIndex + 1} / ${lightFotos.length} · ${esc(contenido.categorias[f.categoria])}</span><button class="icon-button" data-light-step="1" aria-label="Fotografía siguiente" ${lightFotos.length < 2 ? "disabled" : ""}>›</button></div>${f.descripcion ? `<p>${esc(f.descripcion)}</p>` : ""}</div>`,
    );
    $("#content-dialog").classList.add("gallery-dialog");
  }
  $("#content-dialog").addEventListener("close", () => {
    $("#content-dialog").classList.remove("gallery-dialog");
    lightFotos = [];
  });
  document.addEventListener("keydown", (e) => {
    if (
      !$("#content-dialog").open ||
      !lightFotos.length ||
      !["ArrowLeft", "ArrowRight"].includes(e.key)
    )
      return;
    e.preventDefault();
    lightIndex =
      (lightIndex + (e.key === "ArrowLeft" ? -1 : 1) + lightFotos.length) %
      lightFotos.length;
    mostrarLightbox();
  });
  async function detalleReserva(id, n) {
    const datos = await rpc("mi_reserva_detalle", { p_reserva: id });
    if (n !== version) return;
    const r = datos.reserva,
      d = datos.departamento,
      qs = datos.cuotas,
      g = datos.garantia;
    const unidad = app.deps.find((x) => x.id === r.departamento_id),
      foto = unidad ? galeria(unidad)[0] : null;
    const total =
      Number(r.precio_unitario) *
      (r.modalidad === "mensual" ? r.meses : dias(r.entrada, r.salida));
    const saldo = qs.reduce((s, q) => s + Number(q.saldo), 0),
      neto = qs.reduce((s, q) => s + Number(q.cobrado_neto), 0),
      porDevolver = qs.reduce((s, q) => s + Number(q.por_devolver), 0);
    const steps = ["solicitada", "confirmada", "en_curso", "finalizada"],
      paso = steps.indexOf(r.estado);
    const textEstado = {
      solicitada:
        "Recibimos tu solicitud. MAPO revisará las fechas y confirmará la disponibilidad.",
      confirmada:
        "Tu estancia está confirmada. Coordina con MAPO el horario y los detalles de llegada.",
      en_curso:
        "Disfruta tu estancia. Si necesitas algo, los canales de MAPO están a un paso.",
      finalizada:
        "Gracias por elegir MAPO. Aquí puedes seguir consultando el resumen de tu estancia.",
      cancelada:
        "Esta solicitud o reserva fue cancelada. Puedes consultar con MAPO cualquier importe por devolver.",
    };
    main.innerHTML = `<div class="experience-wrap reservation-detail">${encabezado(app.ultimaSolicitud === id ? "¡Solicitud enviada!" : "El detalle de tu estancia", "N.º " + r.id.slice(0, 8).toUpperCase(), "MI RESERVA MAPO")}<div class="booking-status-banner">${chip(r.estado)}<p>${textEstado[r.estado]}</p></div>${r.estado !== "cancelada" ? `<ol class="booking-timeline">${steps.map((s, i) => `<li class="${i <= paso ? "complete" : ""}" ${i === paso ? 'aria-current="step"' : ""}><span>${i < paso ? icon("check") : i + 1}</span>${{ solicitada: "Solicitada", confirmada: "Confirmada", en_curso: "En curso", finalizada: "Finalizada" }[s]}</li>`).join("")}</ol>` : ""}<div class="detail-columns"><div><article class="detail-unit"><div class="detail-unit-photo">${fotoHTML(foto)}${foto?.referencia ? '<span class="reference-tag">Imagen referencial</span>' : ""}</div><div><span class="kicker">${esc(labelModo(r.modalidad))}</span><h2>${esc(d.nombre)}</h2><p class="place">${icon("pin")}${esc(d.edificio)} · ${esc(d.ciudad)}</p><div class="reservation-dates"><div>${icon("calendar")}<span>Llegada<strong>${fecha(r.entrada)}</strong></span></div><div>${icon("calendar")}<span>Salida<strong>${fecha(r.salida)}</strong></span></div><p>${r.huespedes} ${r.huespedes === 1 ? "huésped" : "huéspedes"} · ${r.modalidad === "mensual" ? r.meses + " " + (r.meses === 1 ? "mes" : "meses") : dias(r.entrada, r.salida) + " noches"}</p>${d.publicado && unidad ? `<button class="text-button" data-property="${r.departamento_id}">Ver departamento</button>` : ""}</div></article><section class="detail-section"><span class="kicker">DATOS DE TU SOLICITUD</span><h2>Contacto y mensaje</h2><dl class="detail-data"><div><dt>Nombre</dt><dd>${esc(r.contacto_nombre || app.perfil.nombre)}</dd></div><div><dt>Celular</dt><dd>${esc(r.contacto_celular || "Sin registrar")}</dd></div></dl>${r.mensaje_huesped ? `<p class="guest-message">${esc(r.mensaje_huesped)}</p>` : '<p class="muted">No agregaste un mensaje a esta solicitud.</p>'}${r.motivo ? aviso("Motivo registrado · " + r.motivo) : ""}</section><section class="detail-section"><span class="kicker">SEGUIMIENTO DE PAGOS</span><h2>Tus cuotas</h2>${qs.length ? qs.map((q) => `<div class="guest-charge"><div><strong>${esc(q.detalle)}</strong><small>Vence el ${fecha(q.vence)} · ${q.anulada ? "Anulada" : q.vencida ? "Vencida" : { pagada: "Pagada", parcial: "Pago parcial", pendiente: "Pendiente" }[q.estado_pago]}</small></div><div><strong>${soles(q.importe)}</strong><small>${q.anulada ? "Cuota anulada" : "Saldo " + soles(q.saldo)}</small></div></div>`).join("") : '<p class="muted">Todavía no hay cuotas registradas. MAPO las genera al confirmar la reserva.</p>'}</section></div><aside><section class="detail-section money-card"><span class="kicker">RESUMEN DE LA ESTANCIA</span><h2>Importes en soles</h2><div class="summary-row"><span>Tarifa por ${r.modalidad === "mensual" ? "mes" : "noche"}</span><strong>${soles(r.precio_unitario)}</strong></div><div class="summary-row total"><span>Alquiler ${r.estado === "solicitada" ? "estimado" : "acordado"}</span><strong>${soles(total)}</strong></div>${qs.length ? `<div class="payment-totals"><div><span>Cobrado neto</span><strong>${soles(neto)}</strong></div><div><span>Saldo de cuotas</span><strong>${soles(saldo)}</strong></div>${porDevolver ? `<div><span>Por devolver</span><strong>${soles(porDevolver)}</strong></div>` : ""}</div>` : ""}${Number(g.recibida) > 0 ? `<p class="muted">Garantía recibida ${soles(g.recibida)} · devuelta ${soles(g.devuelta)}. Se registra por separado.</p>` : ""}<p class="muted">Los adicionales y ajustes se muestran en tus cuotas. Los pagos se coordinan directamente con MAPO.</p><button class="button secondary" data-print>${icon("file")} Imprimir resumen</button></section><section class="detail-section"><h2>Estamos para ayudarte</h2>${canales("Hola, quiero consultar sobre mi reserva MAPO " + r.id.slice(0, 8).toUpperCase() + ".")}<button class="text-button" data-list="condiciones">Condiciones de la estancia</button>${r.estado === "solicitada" ? `<button class="text-button withdraw-button" data-retirar="${r.id}">Retirar solicitud</button>` : ""}</section></aside></div><p class="print-note">Resumen informativo de MAPO. No es un comprobante de pago.</p><div class="explore-more"><button class="button secondary" data-list="reservas">Volver a mis reservas</button></div></div>`;
  }
  async function pintar(nombre, id) {
    limpiar();
    vista = nombre;
    const n = version;
    top.innerHTML = `<button class="icon-button" data-list="ayuda" aria-label="Ayuda y contacto">${icon("help")}</button>`;
    document.title = "MAPO · " + nombres[nombre];
    main
      .closest("section")
      .querySelectorAll(".nav-item")
      .forEach((b) => {
        const active = ["reservas", "reserva-detalle"].includes(nombre)
          ? b.dataset.dialog === "reservations"
          : nombre === "favoritos"
            ? b.dataset.dialog === "profile"
            : b.dataset.action === "home";
        b.classList.toggle("active", active);
        if (active) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      });
    main.innerHTML =
      '<div class="screen-loading" role="status"><span></span>Preparando tu espacio…</div>';
    try {
      if (nombre === "favoritos") {
        favoritos();
        return;
      }
      if (nombre === "reservas") {
        if (["dias", "mensual"].includes(id)) filtroModo = id;
        await cargarReservas(n);
        return;
      }
      if (nombre === "reserva-detalle") {
        await contenido.cargar().catch(() => {});
        if (n !== version) return;
        await detalleReserva(id, n);
        return;
      }
      await contenido.cargar();
      if (n !== version) return;
      ({ sobre, ayuda, condiciones, lugar })[nombre]();
    } catch (e) {
      if (n === version)
        main.innerHTML =
          encabezado(nombres[nombre], "Tu información en MAPO") + errorCarga(e);
    } finally {
      if (n === version)
        main.querySelector("h1")?.focus({ preventScroll: true });
    }
  }
  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-back") && vista) {
      ir(vista === "reserva-detalle" ? "reservas" : "inicio");
      return;
    }
    if (b.dataset.favoriteFilter) {
      filtroFav = b.dataset.favoriteFilter;
      favoritos();
      return;
    }
    if (b.dataset.reservationFilter) {
      filtroReserva = b.dataset.reservationFilter;
      pintarReservas();
      return;
    }
    if (b.dataset.placeFilter) {
      categoria = b.dataset.placeFilter;
      lugar();
      return;
    }
    if (b.dataset.placePhoto) {
      lightbox(b.dataset.placePhoto);
      return;
    }
    if (b.dataset.lightStep) {
      lightIndex =
        (lightIndex + Number(b.dataset.lightStep) + lightFotos.length) %
        lightFotos.length;
      mostrarLightbox();
      return;
    }
    if (b.dataset.booking) {
      ir("reserva-detalle/" + b.dataset.booking);
      return;
    }
    if (b.dataset.openProperty) {
      modo(b.dataset.modality);
      ir("ficha/" + b.dataset.openProperty);
      return;
    }
    if (b.dataset.exploreMode) {
      modo(b.dataset.exploreMode);
      ir("inicio");
      setTimeout(
        () => $("#departamentos").scrollIntoView({ block: "start" }),
        30,
      );
      return;
    }
    if (b.hasAttribute("data-print")) {
      window.print();
      return;
    }
    if (b.hasAttribute("data-retry")) {
      contenido.invalidar();
      if (vista) Huesped.ruta();
      else inicio();
      return;
    }
    if (b.hasAttribute("data-reload-reservations")) {
      b.disabled = true;
      try {
        await cargarReservas(version);
        toast("Reservas actualizadas.");
      } catch (e) {
        toast(human(e));
      } finally {
        b.disabled = false;
      }
    }
  });
  function conexion() {
    $("#connection-banner").hidden = navigator.onLine;
  }
  addEventListener("online", () => {
    conexion();
    toast("Conexión recuperada. Ya puedes actualizar tu información.");
    contenido.invalidar();
  });
  addEventListener("offline", conexion);
  conexion();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !vista && location.hash === "#/inicio") inicio();
  });
  window.Experiencia = {
    vistas,
    pintar,
    limpiar,
    inicio,
    actualizarFavoritos: () => {
      if (vista === "favoritos") favoritos();
    },
    activa: () => !!vista,
  };
})();
