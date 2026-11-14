"use strict";
// Contenido compartido por el portal del huésped y el editor administrativo.
(() => {
  const { db, ok, human } = MAPO;
  const categorias = {
    edificio: "El edificio",
    ambientes: "Sus ambientes",
    entorno: "El entorno",
  };
  const inicial = {
    galeria_titulo: "Conoce el lugar de tu próxima historia",
    galeria_texto:
      "Recorre el Edificio Marcelo, descubre sus ambientes e imagina cómo será sentirte en casa, en Huancayo.",
    sobre_texto:
      "En MAPO te acompañamos a encontrar tu espacio en Huancayo. En el Edificio Marcelo puedes elegir una estancia por días o un alquiler mensual, consultar los ambientes y organizar tu llegada desde un mismo lugar.",
    ubicacion: "Huancayo, Junín, Perú",
    horario: "Coordina tu visita con MAPO.",
    whatsapp: "51910408009",
    telefono: "+51910408009",
    correo: "fmarcelocab03@gmail.com",
    condiciones_disponibilidad:
      "Consulta las fechas y la cantidad de huéspedes antes de enviar tu solicitud. MAPO revisará la disponibilidad y confirmará tu estancia. Una solicitud pendiente todavía no separa el departamento.",
    condiciones_pagos:
      "Revisa la tarifa, el importe total, los servicios incluidos y la garantía, cuando corresponda. Coordina con MAPO los medios y las fechas de pago. La solicitud en la web no realiza un cobro.",
    condiciones_llegada:
      "Coordina con MAPO el horario de ingreso, la salida y la entrega de llaves antes de tu llegada. La fecha de salida es el primer día libre para una nueva estancia.",
    condiciones_cambios:
      "Consulta con MAPO las condiciones aplicables a modificaciones, cancelaciones y devoluciones antes de confirmar. Puedes retirar una solicitud pendiente desde Mis reservas. Para una estancia confirmada, comunícate con MAPO.",
  };
  let config = { ...inicial },
    fotos = [],
    fecha = 0,
    pendiente = null;
  async function todos(crear) {
    const out = [];
    for (let offset = 0; ; offset += 200) {
      const rows = await ok(crear().range(offset, offset + 199));
      out.push(...rows);
      if (rows.length < 200) return out;
    }
  }
  async function firmar(filas, cliente = db) {
    if (!filas.length) return [];
    const resultado = [];
    for (let i = 0; i < filas.length; i += 100) {
      const lote = filas.slice(i, i + 100);
      const urls = await ok(
        cliente.storage.from("mapo-lugar").createSignedUrls(
          lote.map((f) => f.ruta),
          600,
        ),
      );
      resultado.push(
        ...lote.map((f, j) => ({ ...f, src: urls[j]?.signedUrl || "" })),
      );
    }
    return resultado;
  }
  async function cargar(forzar = false) {
    if (!db)
      throw Error(
        "MAPO necesita su configuración de conexión para mostrar esta información.",
      );
    if (!forzar && fecha && Date.now() - fecha < 60000)
      return { config, fotos };
    if (pendiente) return pendiente;
    pendiente = (async () => {
      const [c, fs] = await Promise.all([
        ok(db.from("portal_config").select("*").eq("id", true).single()),
        todos(() =>
          db
            .from("galeria_lugar")
            .select("*")
            .eq("publicado", true)
            .order("orden")
            .order("creado_en")
            .order("id"),
        ),
      ]);
      const lista = await firmar(fs);
      config = c;
      fotos = lista;
      fecha = Date.now();
      return { config, fotos };
    })().finally(() => {
      pendiente = null;
    });
    return pendiente;
  }
  async function prepararFoto(file) {
    if (
      !file ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    )
      throw Error("Elige una imagen JPG, PNG o WebP de hasta 10 MiB.");
    const url = URL.createObjectURL(file),
      img = new Image();
    try {
      img.src = url;
      await img.decode();
      if (!img.naturalWidth || !img.naturalHeight)
        throw Error("La imagen no se pudo abrir.");
      const ratio = Math.min(
        1,
        1800 / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * ratio));
      c.height = Math.max(1, Math.round(img.naturalHeight * ratio));
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((resolve) =>
        c.toBlob(resolve, "image/jpeg", 0.86),
      );
      if (!blob || blob.size > 3145728)
        throw Error(
          "La imagen supera el tamaño permitido después de prepararla. Elige una de menor resolución.",
        );
      return blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const mensajeError = (e) =>
    ["42P01", "PGRST205", "PGRST202", "42703"].includes(e?.code)
      ? "Falta aplicar la actualización del portal en Supabase. Revisa GUIA_ENTREGA.md, paso 2."
      : human(e);
  window.ContenidoMAPO = {
    categorias,
    inicial,
    cargar,
    firmar,
    todos,
    prepararFoto,
    mensajeError,
    get config() {
      return config;
    },
    get fotos() {
      return fotos;
    },
    invalidar() {
      fecha = 0;
    },
  };
})();
