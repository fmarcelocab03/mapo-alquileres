"use strict";
(() => {
  const $ = (id) => document.getElementById(id),
    { esc, icon } = MAPO,
    contenido = ContenidoMAPO;
  const form = $("foto-lugar-form"),
    settings = $("contenido-form");
  let ctx = null,
    fotos = [],
    edicion = null,
    config = null,
    cargando = false,
    tab = "",
    preview = "",
    ocupado = false;
  const campos = [
    "galeria_titulo",
    "galeria_texto",
    "sobre_texto",
    "whatsapp",
    "telefono",
    "correo",
    "ubicacion",
    "horario",
    "condiciones_disponibilidad",
    "condiciones_pagos",
    "condiciones_llegada",
    "condiciones_cambios",
  ];
  function aviso(id, text, error = false) {
    $(id).textContent = text;
    $(id).classList.toggle("error", error);
  }
  function checkSesion() {
    if (!ctx) throw Error("Espera a que se abra la sesión de administración.");
  }
  function resetFoto() {
    edicion = null;
    form.reset();
    form.dataset.dirty = "";
    $("editor-foto-titulo").textContent = "Añadir una fotografía";
    $("guardar-foto-lugar").textContent = "Guardar fotografía";
    $("cancelar-foto-lugar").hidden = true;
    $("place-file-field").hidden = false;
    if (preview) URL.revokeObjectURL(preview);
    preview = "";
    $("place-upload-preview").hidden = true;
    $("place-upload-preview").removeAttribute("src");
    aviso("lugar-estado", "");
    form.elements.orden.value = String(
      Math.min(
        9999,
        fotos.length ? Math.max(...fotos.map((f) => f.orden)) + 1 : 0,
      ),
    );
  }
  function dibujar() {
    const publicadas = fotos.filter((f) => f.publicado).length;
    $("lugar-metricas").innerHTML = [
      [fotos.length, "Fotografías"],
      [publicadas, "Publicadas"],
      [fotos.length - publicadas, "En borrador"],
    ]
      .map(([n, t]) => `<div><strong>${n}</strong><span>${t}</span></div>`)
      .join("");
    const filtro = $("filtro-lugar").value,
      lista = fotos.filter(
        (f) => filtro === "todos" || f.publicado === (filtro === "publicadas"),
      );
    $("lugar-lista").innerHTML =
      lista
        .map(
          (f) =>
            `<article class="admin-photo-card"><div class="admin-photo-image">${f.src ? `<img src="${esc(f.src)}" alt="${esc(f.descripcion || f.titulo)}" loading="lazy">` : `<span>Vista previa no disponible</span>`}<span class="photo-publish-state ${f.publicado ? "published" : ""}">${f.publicado ? "Publicada" : "Borrador"}</span></div><div class="admin-photo-copy"><span>${esc(contenido.categorias[f.categoria])} · Orden ${f.orden}</span><h4>${esc(f.titulo)}</h4>${f.descripcion ? `<p>${esc(f.descripcion)}</p>` : ""}<div class="photo-actions"><button type="button" class="sec" data-edit-place="${f.id}">Editar</button><button type="button" class="sec" data-publish-place="${f.id}">${f.publicado ? "Ocultar" : "Publicar"}</button><button type="button" class="danger-link" data-delete-place="${f.id}" aria-label="Eliminar ${esc(f.titulo)}">Eliminar</button></div></div></article>`,
        )
        .join("") ||
      '<div class="editor-empty"><span>＋</span><h4>Tu recorrido comienza aquí</h4><p>Añade fotografías del edificio, sus ambientes y el entorno para que los huéspedes puedan conocerlo.</p></div>';
  }
  async function cargarFotos() {
    checkSesion();
    const filas = await contenido.todos(() =>
      ctx.db
        .from("galeria_lugar")
        .select("*")
        .order("orden")
        .order("creado_en")
        .order("id"),
    );
    fotos = await contenido.firmar(filas, ctx.db);
    dibujar();
    if (!edicion && !form.dataset.dirty)
      form.elements.orden.value = String(
        Math.min(
          9999,
          fotos.length ? Math.max(...fotos.map((f) => f.orden)) + 1 : 0,
        ),
      );
  }
  async function cargarConfig() {
    checkSesion();
    config = await ctx.ok(
      ctx.db.from("portal_config").select("*").eq("id", true).single(),
    );
    campos.forEach((k) => (settings.elements[k].value = config[k] || ""));
    settings.dataset.dirty = "";
    $("contenido-dirty").textContent = "Todos los cambios guardados";
    $("contenido-fecha").textContent =
      "Última actualización · " +
      new Date(config.actualizado_en).toLocaleString("es-PE", {
        timeZone: "America/Lima",
      });
    $("guardar-contenido").disabled = false;
  }
  async function abrir(id) {
    if (!ctx || !["lugar", "contenido"].includes(id)) {
      tab = id;
      return;
    }
    if (cargando || (tab === id && (id === "lugar" ? fotos.length : config)))
      return;
    if (id === "contenido" && settings.dataset.dirty) {
      tab = id;
      return;
    }
    cargando = true;
    tab = id;
    try {
      if (id === "lugar") await cargarFotos();
      else await cargarConfig();
    } catch (e) {
      aviso(
        id === "lugar" ? "lugar-estado" : "contenido-estado",
        contenido.mensajeError(e),
        true,
      );
    } finally {
      cargando = false;
    }
  }
  form.addEventListener("input", () => {
    form.dataset.dirty = "1";
  });
  settings.addEventListener("input", () => {
    settings.dataset.dirty = "1";
    $("contenido-dirty").textContent = "Tienes cambios por guardar";
  });
  addEventListener("beforeunload", (e) => {
    if (form.dataset.dirty || settings.dataset.dirty || ocupado) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  function seleccionar(file) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10485760
    ) {
      form.elements.archivo.value = "";
      aviso("lugar-estado", "Elige JPG, PNG o WebP de hasta 10 MiB.", true);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    preview = URL.createObjectURL(file);
    $("place-upload-preview").src = preview;
    $("place-upload-preview").hidden = false;
    form.dataset.dirty = "1";
    aviso(
      "lugar-estado",
      "Vista previa lista. Completa el título y elige si quieres publicarla.",
    );
  }
  form.elements.archivo.onchange = (e) => seleccionar(e.target.files[0]);
  const drop = $("place-drop");
  drop.ondragover = (e) => {
    e.preventDefault();
    drop.classList.add("dragging");
  };
  drop.ondragleave = () => drop.classList.remove("dragging");
  drop.ondrop = (e) => {
    e.preventDefault();
    drop.classList.remove("dragging");
    if (ocupado || edicion) return;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    form.elements.archivo.files = transfer.files;
    seleccionar(file);
  };
  $("cancelar-foto-lugar").onclick = resetFoto;
  $("filtro-lugar").onchange = dibujar;
  $("refrescar-lugar").onclick = async (e) => {
    e.currentTarget.disabled = true;
    try {
      await cargarFotos();
      aviso("lugar-estado", "Galería actualizada.");
    } catch (error) {
      aviso("lugar-estado", contenido.mensajeError(error), true);
    } finally {
      $("refrescar-lugar").disabled = false;
    }
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (ocupado) return;
    const values = Object.fromEntries(new FormData(form));
    const data = {
      titulo: values.titulo.trim(),
      descripcion: values.descripcion.trim(),
      categoria: values.categoria,
      orden: Number(values.orden),
      publicado: form.elements.publicado.checked,
    };
    const file = form.elements.archivo.files[0],
      editable = edicion;
    if (!data.titulo) {
      aviso("lugar-estado", "Escribe un título para la foto.", true);
      return;
    }
    ocupado = true;
    form
      .querySelectorAll("button,input,textarea,select")
      .forEach((el) => (el.disabled = true));
    aviso(
      "lugar-estado",
      editable ? "Guardando información…" : "Preparando y subiendo fotografía…",
    );
    try {
      checkSesion();
      if (editable) {
        const updated = await ctx.ok(
          ctx.db
            .from("galeria_lugar")
            .update(data)
            .eq("id", editable.id)
            .eq("actualizado_en", editable.actualizado_en)
            .select("id"),
        );
        if (!updated.length)
          throw Error(
            "Esta foto cambió desde que la abriste. Actualiza la galería y vuelve a editarla.",
          );
      } else {
        const blob = await contenido.prepararFoto(file),
          id = MAPO.uuid(),
          ruta = "lugar/" + id + ".jpg",
          alm = ctx.db.storage.from("mapo-lugar");
        await ctx.ok(
          alm.upload(ruta, blob, {
            contentType: "image/jpeg",
            cacheControl: "600",
            upsert: false,
          }),
        );
        try {
          await ctx.ok(
            ctx.db.from("galeria_lugar").insert({ id, ruta, ...data }),
          );
        } catch (err) {
          // Una respuesta perdida puede ocultar un INSERT que sí se completó.
          // Solo borrar el objeto si una segunda consulta confirma que no se registró.
          const verificacion = await ctx.db
            .from("galeria_lugar")
            .select("id")
            .eq("id", id)
            .maybeSingle();
          if (verificacion.error)
            throw Error(
              "No se pudo confirmar el guardado. Actualiza la galería antes de volver a subir esta fotografía.",
            );
          if (!verificacion.data) {
            await alm.remove([ruta]);
            throw err;
          }
        }
      }
      contenido.invalidar();
      resetFoto();
      await cargarFotos();
      aviso(
        "lugar-estado",
        data.publicado
          ? "Fotografía publicada. Ya puedes verla en el portal."
          : "Fotografía guardada como borrador.",
      );
    } catch (err) {
      aviso("lugar-estado", contenido.mensajeError(err), true);
    } finally {
      ocupado = false;
      form
        .querySelectorAll("button,input,textarea,select")
        .forEach((el) => (el.disabled = false));
    }
  };
  $("lugar-lista").addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b || ocupado) return;
    const id =
        b.dataset.editPlace || b.dataset.publishPlace || b.dataset.deletePlace,
      f = fotos.find((x) => x.id === id);
    if (!f) return;
    if (b.dataset.editPlace) {
      if (
        form.dataset.dirty &&
        !(await DialogoMAPO.confirmar(
          "Hay cambios sin guardar en la fotografía. ¿Abrir otra foto y descartarlos?",
        ))
      )
        return;
      resetFoto();
      edicion = { ...f };
      ["titulo", "descripcion", "categoria", "orden"].forEach(
        (k) => (form.elements[k].value = f[k]),
      );
      form.elements.publicado.checked = f.publicado;
      $("editor-foto-titulo").textContent = "Editar información";
      $("guardar-foto-lugar").textContent = "Guardar cambios";
      $("cancelar-foto-lugar").hidden = false;
      $("place-file-field").hidden = true;
      if (f.src) {
        $("place-upload-preview").src = f.src;
        $("place-upload-preview").hidden = false;
      }
      form.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      form.elements.titulo.focus({ preventScroll: true });
      return;
    }
    if (
      b.dataset.deletePlace &&
      !(await DialogoMAPO.confirmar(
        `¿Eliminar «${f.titulo}» de la galería y retirar su archivo?`,
      ))
    )
      return;
    b.disabled = true;
    ocupado = true;
    try {
      if (b.dataset.publishPlace) {
        const r = await ctx.ok(
          ctx.db
            .from("galeria_lugar")
            .update({ publicado: !f.publicado })
            .eq("id", id)
            .eq("actualizado_en", f.actualizado_en)
            .select("id"),
        );
        if (!r.length)
          throw Error(
            "La foto cambió. Actualiza la galería antes de continuar.",
          );
        aviso(
          "lugar-estado",
          f.publicado
            ? "Foto oculta del portal."
            : "Foto publicada en el portal.",
        );
      } else {
        // Ocultar primero evita mostrar un registro cuyo archivo ya fue eliminado.
        const r = await ctx.ok(
          ctx.db
            .from("galeria_lugar")
            .update({ publicado: false })
            .eq("id", id)
            .eq("actualizado_en", f.actualizado_en)
            .select("actualizado_en"),
        );
        if (!r.length)
          throw Error(
            "La foto cambió. Actualiza la galería antes de eliminarla.",
          );
        await ctx.ok(ctx.db.storage.from("mapo-lugar").remove([f.ruta]));
        await ctx.ok(
          ctx.db
            .from("galeria_lugar")
            .delete()
            .eq("id", id)
            .eq("actualizado_en", r[0].actualizado_en),
        );
        if (edicion?.id === id) resetFoto();
        aviso("lugar-estado", "Fotografía eliminada.");
      }
      contenido.invalidar();
      await cargarFotos();
    } catch (err) {
      aviso("lugar-estado", contenido.mensajeError(err), true);
      try {
        await cargarFotos();
      } catch {}
    } finally {
      ocupado = false;
      b.disabled = false;
    }
  });
  settings.onsubmit = async (e) => {
    e.preventDefault();
    if (ocupado) return;
    if (!config) {
      aviso(
        "contenido-estado",
        "Primero debe cargar la configuración del portal.",
        true,
      );
      return;
    }
    const data = Object.fromEntries(
      campos.map((k) => [k, settings.elements[k].value.trim()]),
    );
    ["whatsapp", "telefono", "correo"].forEach((k) => {
      data[k] = data[k] || null;
    });
    ocupado = true;
    settings
      .querySelectorAll("input,textarea,button")
      .forEach((el) => (el.disabled = true));
    aviso("contenido-estado", "Guardando contenido…");
    try {
      const rows = await ctx.ok(
        ctx.db
          .from("portal_config")
          .update(data)
          .eq("id", true)
          .eq("actualizado_en", config.actualizado_en)
          .select("*"),
      );
      if (!rows.length)
        throw Error(
          "Otro administrador actualizó estos textos. Copia tus cambios, vuelve a abrir esta página y aplícalos sobre la versión nueva.",
        );
      config = rows[0];
      contenido.invalidar();
      settings.dataset.dirty = "";
      $("contenido-dirty").textContent = "Todos los cambios guardados";
      $("contenido-fecha").textContent =
        "Última actualización · " +
        new Date(config.actualizado_en).toLocaleString("es-PE", {
          timeZone: "America/Lima",
        });
      aviso(
        "contenido-estado",
        "Cambios guardados. Puedes revisar el resultado con Ver portal.",
      );
    } catch (err) {
      aviso("contenido-estado", contenido.mensajeError(err), true);
    } finally {
      ocupado = false;
      settings
        .querySelectorAll("input,textarea,button")
        .forEach((el) => (el.disabled = false));
    }
  };
  // Los editores permanecen deshabilitados hasta que la sesión administrativa esté lista.
  $("guardar-contenido").disabled = true;
  $("guardar-foto-lugar").disabled = true;
  window.ContenidoAdmin = {
    abrir,
    conectar(datos) {
      ctx = datos;
      $("guardar-foto-lugar").disabled = ocupado;
    },
  };
})();
