"use strict";
(() => {
  const cfg = window.MAPO_CONFIG || {};
  const valida =
    (/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url) ||
      /^http:\/\/(localhost|127\.0\.0\.1):54321$/.test(cfg.url)) &&
    /^sb_publishable_[\w-]+$/.test(cfg.key);
  const db = valida ? window.supabase.createClient(cfg.url, cfg.key) : null;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  async function ok(query) {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  const rpc = (name, params = {}) => ok(db.rpc(name, params));
  function human(error) {
    const m = String(error.message || error);
    if (error.code === "23P01") return "El departamento ya está ocupado en esas fechas. Elige otro periodo.";
    if (error.code === "23505") return "Ya hay un registro igual. Revisa tus solicitudes antes de repetir.";
    if (error.code === "42501") return "Tu cuenta no tiene permiso para esa operación.";
    if (error.code === "PGRST202" || error.code === "42703")
      return "Falta aplicar la migración de perfil y solicitudes en este proyecto.";
    if (/invalid login credentials/i.test(m)) return "El correo o la contraseña no coinciden.";
    if (/email not confirmed/i.test(m)) return "Primero confirma el correo de tu cuenta.";
    if (/rate limit/i.test(m)) return "Se alcanzó el límite de envíos de correo. Espera antes de reintentar.";
    if (/failed to fetch|networkerror/i.test(m))
      return "No se pudo contactar con Supabase. Comprueba tu conexión.";
    return m;
  }
  const soles = (value) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(value));
  const fecha = (iso) =>
    iso
      ? new Intl.DateTimeFormat("es-PE", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(iso + "T12:00:00Z"))
      : "—";
  function hoy() {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .map((p) => [p.type, p.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function sumarMeses(iso, cantidad) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const target = new Date(Date.UTC(y, m + Number(cantidad) - 1 + 1, 0));
    target.setUTCDate(Math.min(d, target.getUTCDate()));
    return target.toISOString().slice(0, 10);
  }
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join("-");
  }
  const vuelta = new URL("./", location.href).href;
  window.MAPO = { db, ok, rpc, human, esc, icon, soles, fecha, hoy, sumarMeses, vuelta, uuid };
})();
