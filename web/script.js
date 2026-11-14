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
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const CONFIGURAR =
    "Abre web/config.js y coloca la URL y la clave publicable de tu proyecto mapo-desarrollo.";
  const memoria = {
    get(k) {
      try {
        return localStorage.getItem("mapo." + k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        if (v === null) localStorage.removeItem("mapo." + k);
        else localStorage.setItem("mapo." + k, v);
      } catch {}
    },
  };
  const app = {
    user: null,
    admin: false,
    perfil: null,
    deps: [],
    fotos: [],
    servicios: [],
    favoritos: new Set(),
    modo: "dias",
    filtro: null,
    drafts: new Map(),
  };
  let timer,
    revision = 0,
    splash = true,
    sesionLista = false,
    recuperacion = false,
    ultimoId = "",
    busqueda = 0;
  const dialog = $("#content-dialog"),
    menu = $("#menu-dialog");
  function toast(texto) {
    clearTimeout(timer);
    $("#toast").textContent = texto;
    $("#toast").hidden = false;
    timer = setTimeout(() => ($("#toast").hidden = true), 4600);
  }
  function cerrar() {
    if (dialog.open) dialog.close();
    if (menu.open) menu.close();
  }
  [dialog, menu].forEach((d) =>
    d.addEventListener("close", () => {
      document.body.classList.toggle("modal-open", dialog.open || menu.open);
      $("#menu-toggle").setAttribute("aria-expanded", String(menu.open));
    }),
  );
  function modal(titulo, html) {
    if (menu.open) menu.close();
    $("#dialog-title").textContent = titulo;
    $("#dialog-body").innerHTML = html;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("modal-open");
  }
  function pantalla(name) {
    $$(".screen").forEach((e) => (e.hidden = e.id !== `screen-${name}`));
    document.body.className = `view-${name}` + (pausa ? " motion-paused" : "");
    document.title =
      "MAPO · " +
      {
        login: "Iniciar sesión",
        home: "Inicio",
        splash: "Bienvenido",
        extra: "Mi estancia",
      }[name];
    window.scrollTo(0, 0);
  }
  const reducido = matchMedia("(prefers-reduced-motion: reduce)");
  let pausa = memoria.get("motionPaused") === "true" || reducido.matches;
  function animacion() {
    document.body.classList.toggle("motion-paused", pausa);
    $$("[data-motion-toggle]").forEach((b) => {
      b.disabled = reducido.matches;
      b.setAttribute("aria-pressed", String(pausa));
      b.innerHTML =
        icon(pausa ? "play" : "pause") +
        `<span>${pausa ? "Activar fondo" : "Pausar fondo"}</span>`;
    });
  }
  $$("[data-motion-toggle]").forEach(
    (b) =>
      (b.onclick = () => {
        pausa = !pausa;
        memoria.set("motionPaused", String(pausa));
        animacion();
      }),
  );
  reducido.addEventListener("change", () => {
    pausa = reducido.matches || memoria.get("motionPaused") === "true";
    animacion();
  });
  animacion();
  const inicio = performance.now(),
    reloj = setInterval(
      () =>
        $(".loading-track").setAttribute(
          "aria-valuenow",
          String(Math.min(100, Math.floor((performance.now() - inicio) / 50))),
        ),
      150,
    );
  setTimeout(() => {
    clearInterval(reloj);
    splash = false;
    if (sesionLista || !db) ruta();
  }, 5000);
  const mostrarLoginError = (msg) => {
    $("#login-error").textContent = msg;
    $("#login-error").hidden = !msg;
  };
  if (memoria.get("email")) {
    $("#email").value = memoria.get("email");
    $("#remember").checked = true;
  }
  $("#password-toggle").onclick = () => {
    const ver = $("#password").type === "password";
    $("#password").type = ver ? "text" : "password";
    $("#password-toggle").setAttribute("aria-pressed", String(ver));
    $("#password-toggle").setAttribute(
      "aria-label",
      ver ? "Ocultar contraseña" : "Mostrar contraseña",
    );
    $("#password-toggle").innerHTML = icon(ver ? "eye-off" : "eye");
  };
  $("#remember").onchange = () => {
    if (!$("#remember").checked) memoria.set("email", null);
  };
  $("#login-form").onsubmit = async (ev) => {
    ev.preventDefault();
    mostrarLoginError("");
    if (!db) {
      mostrarLoginError(CONFIGURAR);
      return;
    }
    const email = $("#email").value.trim(),
      password = $("#password").value;
    if (!$("#email").validity.valid || !password) {
      mostrarLoginError("Completa tu correo y contraseña.");
      return;
    }
    const boton = $("#login-submit");
    boton.disabled = true;
    try {
      await ok(db.auth.signInWithPassword({ email, password }));
      memoria.set("email", $("#remember").checked ? email : null);
      $("#password").value = "";
    } catch (e) {
      mostrarLoginError(human(e));
    } finally {
      boton.disabled = false;
    }
  };
  function authModal(tipo) {
    if (!db) {
      mostrarLoginError(CONFIGURAR);
      return;
    }
    const alta = tipo === "registration",
      recuperar = tipo === "recovery";
    modal(
      alta
        ? "Crear cuenta"
        : recuperar
          ? "Recuperar acceso"
          : "Nueva contraseña",
      `<form id="auth-extra" class="stay-form">
      ${alta ? '<label>Nombre completo<input name="nombre" maxlength="150" autocomplete="name" required></label>' : ""}
      ${alta || recuperar ? '<label>Correo electrónico<input type="email" name="email" autocomplete="email" required></label>' : ""}
      ${recuperar ? "" : '<label>Contraseña de al menos 10 caracteres<input type="password" name="clave" minlength="10" autocomplete="new-password" required></label>'}
      <button class="button primary">${alta ? "Crear cuenta" : recuperar ? "Enviar enlace" : "Guardar contraseña"}</button><p class="feedback" role="status"></p></form>`,
    );
    $("#auth-extra").onsubmit = async (ev) => {
      ev.preventDefault();
      const f = ev.currentTarget,
        b = f.querySelector("button"),
        v = Object.fromEntries(new FormData(f));
      b.disabled = true;
      try {
        if (alta)
          await ok(
            db.auth.signUp({
              email: v.email,
              password: v.clave,
              options: {
                data: { nombre: v.nombre.trim() },
                emailRedirectTo: vuelta,
              },
            }),
          );
        else if (recuperar)
          await ok(
            db.auth.resetPasswordForEmail(v.email, { redirectTo: vuelta }),
          );
        else {
          await ok(db.auth.updateUser({ password: v.clave }));
          recuperacion = false;
        }
        cerrar();
        toast(
          alta
            ? "Revisa tu correo para confirmar el registro."
            : recuperar
              ? "Revisa tu correo para recuperar el acceso."
              : "Contraseña actualizada.",
        );
        if (!alta && !recuperar) ruta();
      } catch (e) {
        f.querySelector(".feedback").textContent = human(e);
      } finally {
        b.disabled = false;
      }
    };
  }
  const fallback = {
    gris: ["gris-sala", "gris-comedor", "bano", "gris-dormitorio"],
    verde: ["verde-sala", "verde-comedor", "bano", "verde-dormitorio"],
  };
  function galeria(d) {
    const propias = app.fotos.filter(
      (f) => f.departamento_id === d.id && f.src,
    );
    if (propias.length) return propias;
    const refs = fallback[d.codigo] || [];
    return refs.map((name, i) => ({
      src: `assets/${name}.webp`,
      descripcion:
        ["Sala", "Comedor", "Baño", "Dormitorio"][i] +
        " · imagen del prototipo",
      referencia: true,
    }));
  }
  async function cargarCuenta(usuario, version) {
    const [perfil, deps, fav, fotos, servicios] = await Promise.all([
      ok(
        db
          .from("clientes")
          .select("id,nombre,correo,telefono,dni,ciudad")
          .eq("usuario_id", usuario.id)
          .single(),
      ),
      ok(
        db
          .from("departamentos")
          .select("*,edificios(nombre,ciudad)")
          .eq("publicado", true)
          .order("nombre"),
      ),
      ok(
        db
          .from("favoritos")
          .select("departamento_id")
          .eq("usuario_id", usuario.id),
      ),
      ok(
        db
          .from("fotos")
          .select("departamento_id,ruta,descripcion,orden,id")
          .order("orden")
          .order("id"),
      ),
      ok(
        db
          .from("departamento_servicios")
          .select("departamento_id,servicios(nombre)"),
      ),
    ]);
    const visibles = deps.filter((d) => !d.baja || d.baja > hoy());
    const ids = new Set(visibles.map((d) => d.id));
    const fotosVisibles = fotos.filter((f) => ids.has(f.departamento_id));
    if (fotosVisibles.length) {
      const signed = await ok(
        db.storage.from("mapo-fotos").createSignedUrls(
          fotosVisibles.map((f) => f.ruta),
          3600,
        ),
      );
      fotosVisibles.forEach((f, i) => {
        f.src = signed[i]?.signedUrl;
      });
    }
    if (version !== revision) return false;
    Object.assign(app, {
      perfil,
      deps: visibles,
      fotos: fotosVisibles,
      servicios,
      favoritos: new Set(fav.map((x) => x.departamento_id)),
    });
    return true;
  }
  async function sesion(evento, s) {
    if (evento === "PASSWORD_RECOVERY") recuperacion = true;
    const usuario = s?.user || null;
    if (
      usuario &&
      usuario.id === ultimoId &&
      app.perfil &&
      evento !== "PASSWORD_RECOVERY"
    ) {
      app.user = usuario;
      if (evento === "USER_UPDATED" && location.hash === "#/perfil") ruta();
      return;
    }
    const n = ++revision;
    ultimoId = usuario?.id || "";
    app.user = usuario;
    cerrar();
    Object.assign(app, {
      admin: false,
      perfil: null,
      deps: [],
      fotos: [],
      servicios: [],
      favoritos: new Set(),
      filtro: null,
      drafts: new Map(),
    });
    window.Estancia?.limpiar();
    $("#property-grid").replaceChildren();
    $("#stay-main").replaceChildren();
    if (!usuario) {
      recuperacion = false;
      sesionLista = true;
      if (location.hash.startsWith("#/"))
        history.replaceState(null, "", location.pathname + location.search);
      if (!splash) ruta();
      return;
    }
    try {
      const esAdmin = await rpc("soy_admin");
      if (n !== revision) return;
      app.admin = esAdmin;
      if (
        esAdmin &&
        !recuperacion &&
        !["perfil", "portal"].includes(
          new URLSearchParams(location.search).get("vista"),
        )
      ) {
        location.replace(new URL("admin.html", vuelta).href);
        return;
      }
      if (!(await cargarCuenta(usuario, n))) return;
      if (
        new URLSearchParams(location.search).get("vista") === "perfil" &&
        !location.hash
      )
        history.replaceState(null, "", "#/perfil");
      sesionLista = true;
      if (!splash) ruta();
    } catch (e) {
      if (n !== revision) return;
      sesionLista = true;
      mostrarLoginError(human(e));
      if (!splash) pantalla("login");
    }
  }
  if (db)
    db.auth.onAuthStateChange((evt, s) => {
      setTimeout(() => sesion(evt, s), 0);
    });
  else {
    sesionLista = true;
    mostrarLoginError(CONFIGURAR);
  }
  const etiquetaModo = (m) => (m === "mensual" ? "Mensual" : "Por días");
  function cards() {
    const deps = app.deps.filter(
      (d) =>
        (app.modo === "dias" ? d.tarifa_dia : d.tarifa_mes) != null &&
        (!app.filtro || app.filtro.has(d.id)),
    );
    $("#property-grid").innerHTML =
      deps
        .map((d) => {
          const f = galeria(d)[0],
            p = app.modo === "dias" ? d.tarifa_dia : d.tarifa_mes;
          return `<article class="property-card"><div class="property-photo">${f ? `<img src="${esc(f.src)}" alt="${esc(f.descripcion)}">` : `<div class="no-photo">${icon("building")}</div>`}<span class="photo-badge">${etiquetaModo(app.modo)}</span><button type="button" class="favorite-button" data-favorite="${esc(d.id)}" aria-label="Guardar o quitar ${esc(d.nombre)} de favoritos" aria-pressed="${app.favoritos.has(d.id)}">${icon("heart")}</button></div><div class="property-info"><h3>${esc(d.nombre)}</h3><p class="property-location">${icon("pin")}${esc(d.edificios?.nombre || "Edificio Marcelo")} · Huancayo</p><div class="property-features"><span>${icon("user")}${esc(d.capacidad)} huéspedes</span></div><div class="property-bottom"><span class="rate-note">${soles(p)} / ${app.modo === "dias" ? "noche" : "mes"}</span><button class="text-button" data-property="${esc(d.id)}">Ver departamento</button></div></div></article>`;
        })
        .join("") ||
      '<p class="stay-empty">No hay departamentos publicados para esta búsqueda.</p>';
    $("#favorites-count").textContent = String(app.favoritos.size);
    return deps.length;
  }
  async function favorito(id) {
    const quitar = app.favoritos.has(id),
      uid = app.user.id;
    if (quitar)
      await ok(
        db
          .from("favoritos")
          .delete()
          .eq("usuario_id", uid)
          .eq("departamento_id", id),
      );
    else
      await ok(
        db
          .from("favoritos")
          .upsert(
            { usuario_id: uid, departamento_id: id },
            {
              onConflict: "usuario_id,departamento_id",
              ignoreDuplicates: true,
            },
          ),
      );
    if (app.user?.id !== uid) return;
    if (quitar) app.favoritos.delete(id);
    else app.favoritos.add(id);
    cards();
    $$(`[data-favorite="${CSS.escape(id)}"]`).forEach((b) =>
      b.setAttribute("aria-pressed", String(!quitar)),
    );
    if (location.hash.startsWith("#/favoritos"))
      window.Experiencia?.actualizarFavoritos();
    toast(quitar ? "Retirado de favoritos." : "Guardado en favoritos.");
  }
  function modo(m) {
    app.modo = m;
    app.filtro = null;
    busqueda++;
    $$("[data-mode]").forEach((b) => {
      const on = (b.dataset.mode === "monthly" ? "mensual" : "dias") === m;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    $("#departure-field").hidden = m === "mensual";
    $("#departure").disabled = m === "mensual";
    $("#months-field").hidden = m !== "mensual";
    $("#months").disabled = m !== "mensual";
    $("#arrival-label").textContent =
      m === "dias" ? "Entrada" : "Fecha de ingreso";
    $("#search-error").hidden = true;
    cards();
    $("#search-summary").textContent =
      "Elige fechas para consultar disponibilidad.";
  }
  $$("[data-mode]").forEach(
    (b) =>
      (b.onclick = () =>
        modo(b.dataset.mode === "monthly" ? "mensual" : "dias")),
  );
  $("#reset-search").onclick = () => {
    $("#search-form").reset();
    modo(app.modo);
  };
  $("#arrival").min = hoy();
  $("#arrival").onchange = () => {
    $("#departure").min = $("#arrival").value || hoy();
  };
  $("#search-form").onsubmit = async (ev) => {
    ev.preventDefault();
    const n = ++busqueda,
      ini = $("#arrival").value,
      fin =
        app.modo === "mensual"
          ? sumarMeses(ini, +$("#months").value)
          : $("#departure").value;
    try {
      if (!ini && !fin) {
        app.filtro = null;
      } else {
        if (ini < hoy() || !fin || fin <= ini)
          throw Error("Elige una entrada desde hoy y una salida posterior.");
        const datos = await rpc("disponibles", {
          p_entrada: ini,
          p_salida: fin,
          p_modalidad: app.modo,
          p_huespedes: 1,
        });
        if (n !== busqueda) return;
        app.filtro = new Set(datos.map((x) => x.departamento_id));
      }
      $("#search-error").hidden = true;
      $("#search-summary").textContent =
        cards() +
        " departamentos · " +
        etiquetaModo(app.modo) +
        (ini ? " · " + fecha(ini) + " al " + fecha(fin) : "");
      $("#departamentos").scrollIntoView({ block: "start" });
    } catch (e) {
      $("#search-error").hidden = false;
      $("#search-error").textContent = human(e);
    }
  };
  function ir(path) {
    cerrar();
    if (location.hash === "#/" + path) ruta();
    else location.hash = "/" + path;
  }
  function ruta() {
    window.Estancia?.limpiar();
    window.Experiencia?.limpiar();
    if (!app.user || !app.perfil) {
      pantalla("login");
      return;
    }
    if (recuperacion) {
      pantalla("home");
      authModal("password");
      return;
    }
    const [vista, id, sub] = location.hash.slice(2).split("/");
    if (!vista || vista === "inicio") {
      pantalla("home");
      cards();
      window.Experiencia?.inicio();
      return;
    }
    pantalla("extra");
    if (window.Experiencia?.vistas.includes(vista))
      window.Experiencia.pintar(vista, id, sub);
    else window.Estancia.pintar(vista, id, sub);
  }
  addEventListener("hashchange", () => {
    if (!splash && sesionLista) ruta();
  });
  $("#menu-toggle").onclick = () => {
    menu.showModal();
    document.body.classList.add("modal-open");
    $("#menu-toggle").setAttribute("aria-expanded", "true");
  };
  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    try {
      if (b.dataset.close) cerrar();
      else if (b.dataset.favorite) {
        b.disabled = true;
        try {
          await favorito(b.dataset.favorite);
        } finally {
          b.disabled = false;
        }
      } else if (b.dataset.property) ir("ficha/" + b.dataset.property);
      else if (b.dataset.dialog) {
        const k = b.dataset.dialog;
        if (k === "profile") ir("perfil");
        else if (k === "reservations") ir("reservas");
        else if (k === "favorites") ir("favoritos");
        else if ({ contact: "ayuda", about: "sobre", terms: "condiciones" }[k])
          ir({ contact: "ayuda", about: "sobre", terms: "condiciones" }[k]);
        else authModal(k);
      } else if (b.dataset.action === "home") ir("inicio");
      else if (b.dataset.action === "explore") {
        ir("inicio");
        setTimeout(() => $("#departamentos").scrollIntoView(), 20);
      } else if (b.dataset.action === "logout") {
        await ok(db.auth.signOut({ scope: "local" }));
      }
    } catch (e) {
      toast(human(e));
    }
  });
  window.Huesped = {
    app,
    ir,
    ruta,
    modal,
    cerrar,
    toast,
    galeria,
    cards,
    modo,
  };
})();
