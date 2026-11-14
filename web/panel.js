"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const plata = (v) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(Number(v) || 0);
  const pct = (v) =>
    v == null
      ? "Sin inventario"
      : new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(v) +
        " %";
  const node = (t, txt, cl) => {
    const n = document.createElement(t);
    if (txt != null) n.textContent = txt;
    if (cl) n.className = cl;
    return n;
  };
  const selects = { reservas: "reservasLista", caja: "cuotasLista" };
  let ctx = null,
    tab = "",
    equipo = [],
    equipoGen = 0,
    gestor = false,
    refrescando = null;
  $("mes-panel").replaceChildren(
    ...meses.map((s, i) => new Option(s, String(i + 1))),
  );
  $("mes-panel").value = String(new Date().getMonth() + 1);
  function mesActual() {
    return `${ctx.anio}-${$("mes-panel").value.padStart(2, "0")}`;
  }
  function barraTexto(box, label, value, frac, color) {
    const row = node("div", null, "line-stat"),
      arr = node("div", null, "line-caption");
    arr.append(node("span", label), node("b", value));
    const track = node("div", null, "mini-track"),
      fill = node("i");
    fill.style.width = `${Math.max(0, Math.min(100, frac * 100 || 0))}%`;
    if (color) fill.style.background = color;
    track.append(fill);
    row.append(arr, track);
    box.append(row);
  }
  function render() {
    if (!ctx) return;
    const key = mesActual(),
      row = ctx.meses.find((x) => x.mes.startsWith(key));
    if (!row) return;
    const cuotas = ctx.cache.cuotas.filter((q) => q.vence.startsWith(key)),
      movs = ctx.cache.movs.filter((m) => m.fecha.startsWith(key));
    const alquiler = ctx.cache.res.filter(
      (r) => r.clase === "alquiler" && r.entrada.startsWith(key),
    );
    const kpi = $("kpis");
    kpi.replaceChildren();
    const items = [
      [
        "Ocupación",
        pct(row.ocupacion_pct),
        row.noches_vendidas + " noches vendidas",
      ],
      ["Cobros", plata(row.cobros), "Recibidos en el mes"],
      [
        "Saldo pendiente",
        plata(row.pendiente_hoy_por_vencimiento),
        "Cuotas que vencen en el mes",
      ],
      [
        "Resultado de caja",
        plata(row.resultado_caja),
        "Cobros − devoluciones − gastos",
      ],
    ];
    for (const [i, [k, v, nota]] of items.entries()) {
      const card = node("div", null, "kpi tone-" + i);
      card.append(node("small", k), node("strong", v), node("span", nota));
      kpi.append(card);
    }
    const serie = $("serie-panel").value,
      esPct = serie === "ocupacion_pct",
      titulo = {
        ocupacion_pct: "Ocupación por mes",
        resultado_caja: "Resultado de caja por mes",
        cobros: "Cobros por mes",
      }[serie];
    $("chart-title").textContent = titulo;
    const graf = $("grafico-meses");
    graf.replaceChildren();
    const max = esPct
      ? 100
      : Math.max(1, ...ctx.meses.map((r) => Math.abs(Number(r[serie]))));
    for (const r of ctx.meses) {
      const i = Number(r.mes.slice(5, 7)),
        v = r[serie],
        val = esPct ? pct(v) : plata(v);
      const b = node("button", null, "bar");
      b.type = "button";
      b.title = meses[i - 1] + " · " + val;
      b.setAttribute("aria-label", b.title);
      b.setAttribute("aria-pressed", String(r.mes.startsWith(key)));
      const col = node("span", null, "bar-space"),
        fill = node("i");
      fill.style.height =
        Math.min(100, (Math.abs(Number(v) || 0) * 100) / max) + "%";
      if (Number(v) < 0) fill.className = "negative";
      col.append(fill);
      b.append(col, node("small", meses[i - 1].slice(0, 3)));
      b.onclick = () => {
        $("mes-panel").value = String(i);
        render();
      };
      graf.append(b);
    }
    $("chart-note").textContent =
      meses[+$("mes-panel").value - 1] +
      " · " +
      (esPct ? pct(row[serie]) : plata(row[serie])) +
      ". " +
      (esPct
        ? "Las estancias futuras muestran ocupación prevista."
        : "El color coral indica un resultado negativo.");
    const pagos = $("pagos-resumen");
    pagos.replaceChildren();
    const activas = cuotas.filter((q) => !q.anulada);
    for (const [k, label, col] of [
      ["pagada", "Pagadas", "#168171"],
      ["parcial", "Parciales", "#b77524"],
      ["pendiente", "Pendientes", "#869baa"],
    ]) {
      const count = activas.filter((q) => q.estado_pago === k).length;
      barraTexto(
        pagos,
        label,
        String(count),
        count / (activas.length || 1),
        col,
      );
    }
    const comp = $("canales");
    comp.replaceChildren();
    const canales = new Map(),
      porCuota = new Map(ctx.cache.cuotas.map((q) => [q.id, q.reserva_id])),
      porReserva = new Map(ctx.cache.res.map((r) => [r.id, r.canal]));
    for (const m of movs.filter((m) => m.tipo === "cobro")) {
      const c = porReserva.get(porCuota.get(m.cuota_id)) || "otro";
      canales.set(c, (canales.get(c) || 0) + Number(m.importe));
    }
    for (const [c, v] of [...canales].sort((a, b) => b[1] - a[1]))
      barraTexto(comp, c, plata(v), v / (Number(row.cobros) || 1));
    if (!canales.size)
      comp.append(node("p", "Sin cobros registrados en este mes.", "quiet"));
    const act = $("actividad-mes");
    act.replaceChildren();
    [
      [
        "Entradas previstas o atendidas",
        alquiler.filter((r) =>
          ["confirmada", "en_curso", "finalizada"].includes(r.estado),
        ).length,
      ],
      [
        "Solicitudes por confirmar",
        alquiler.filter((r) => r.estado === "solicitada").length,
      ],
      ["Canceladas", alquiler.filter((r) => r.estado === "cancelada").length],
    ].forEach(([label, n]) => {
      const el = node("div", null, "activity-row");
      el.append(node("span", label), node("b", n));
      act.append(el);
    });
  }
  function filtro(name) {
    const val = $(
      name === "reservas" ? "filtro-reservas" : "filtro-cuotas",
    ).value;
    document
      .querySelectorAll("#" + selects[name] + " tbody tr")
      .forEach((row) => {
        const estado =
          row.cells[name === "reservas" ? 3 : 5]?.textContent || "";
        const texto = $(
          name === "reservas" ? "buscar-reservas" : "buscar-cuotas",
        )
          .value.trim()
          .toLocaleLowerCase("es");
        row.hidden =
          (!!val && !estado.split(" · ").includes(val)) ||
          (!!texto && !row.textContent.toLocaleLowerCase("es").includes(texto));
      });
  }
  function pintarEquipo() {
    const buscar = $("buscar-equipo").value.trim().toLowerCase(),
      lista = $("equipo-lista");
    lista.replaceChildren();
    for (const u of equipo.filter((x) =>
      (x.nombre + " " + x.correo).toLowerCase().includes(buscar),
    )) {
      const row = node("article", null, "user-row"),
        group = node("div");
      group.append(node("b", u.nombre), node("small", u.correo));
      row.append(
        group,
        node(
          "span",
          u.gestor ? "Gestor" : u.administrador ? "Administrador" : "Huésped",
          "role-chip",
        ),
      );
      if (!u.confirmado) row.append(node("small", "Correo por confirmar"));
      if (gestor && u.confirmado && !u.gestor && u.usuario !== ctx.usuario) {
        const b = node(
          "button",
          u.administrador ? "Retirar permiso" : "Hacer administrador",
          "sec",
        );
        b.type = "button";
        b.onclick = async () => {
          if (
            !(await DialogoMAPO.confirmar(
              `${b.textContent} · ${u.correo}. ¿Confirmar el cambio de permisos?`,
            ))
          )
            return;
          b.disabled = true;
          try {
            await ctx.rpc("cambiar_rol_mapo", {
              p_usuario: u.usuario,
              p_admin: !u.administrador,
            });
            await cargarEquipo();
          } catch (e) {
            ctx.aviso(String(e.message || e), true);
          } finally {
            b.disabled = false;
          }
        };
        row.append(b);
      }
      lista.append(row);
    }
    if (!lista.childElementCount)
      lista.append(node("p", "Sin cuentas para esta búsqueda.", "quiet"));
  }
  async function cargarEquipo() {
    if (!ctx) return;
    const n = ++equipoGen;
    try {
      const [usuarios, poder] = await Promise.all([
        ctx.rpc("equipo_mapo"),
        ctx.rpc("puedo_gestionar_roles"),
      ]);
      if (n !== equipoGen) return;
      equipo = usuarios;
      gestor = poder;
      pintarEquipo();
    } catch (e) {
      if (n === equipoGen)
        $("equipo-lista").textContent =
          "No se pudo abrir el directorio. " + (e.message || e);
    }
  }
  function activar(id, guardar = true) {
    if (!document.querySelector(`[data-panel="${CSS.escape(id)}"]`))
      id = "panorama";
    tab = id;
    document.querySelectorAll("[data-panel]").forEach((d) => {
      d.hidden = d.dataset.panel !== id;
      if (!d.hidden) d.open = true;
    });
    document.querySelectorAll("[data-tab]").forEach((b) => {
      b.setAttribute("aria-current", b.dataset.tab === id ? "page" : "false");
    });
    if (guardar) {
      history.replaceState(null, "", "#" + id);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    if (id === "equipo") cargarEquipo();
    window.ContenidoAdmin?.abrir(id);
  }
  function refrescar() {
    if (!ctx || refrescando) return;
    refrescando = ctx
      .recargar()
      .catch((e) => ctx.aviso(String(e.message || e), true))
      .finally(() => {
        refrescando = null;
      });
  }
  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        activar(b.dataset.tab);
        if (["panorama", "reservas", "caja"].includes(b.dataset.tab))
          refrescar();
      }),
  );
  setInterval(() => {
    if (
      !document.hidden &&
      tab === "panorama" &&
      !document.activeElement?.closest("form")
    )
      refrescar();
  }, 60000);
  $("mes-panel").onchange = render;
  $("serie-panel").onchange = render;
  $("buscar-equipo").oninput = pintarEquipo;
  $("buscar-reservas").oninput = () => filtro("reservas");
  $("buscar-cuotas").oninput = () => filtro("caja");
  $("filtro-cuotas").onchange = () => filtro("caja");
  $("filtro-reservas").onchange = () => filtro("reservas");
  $("eliminar-ficha").onclick = async (ev) => {
    if (!ctx) return;
    const id = $("editarDep").value,
      b = ev.currentTarget;
    if (!id) {
      ctx.aviso("Selecciona una ficha existente.", true);
      return;
    }
    const d = ctx.cache.dep.find((x) => x.id === id);
    if (
      !(await DialogoMAPO.confirmar(
        `¿Eliminar la ficha sin historial de ${d?.nombre}?`,
      ))
    )
      return;
    b.disabled = true;
    try {
      await ctx.rpc("eliminar_ficha_sin_historial", { p_departamento: id });
      await ctx.recargar();
      ctx.aviso("Ficha eliminada.");
    } catch (e) {
      ctx.aviso(e.message, true);
    } finally {
      b.disabled = false;
    }
  };
  window.MAPOPanel = {
    actualizar(datos) {
      if (!ctx || ctx.dia !== datos.dia)
        $("mes-panel").value = String(Number(datos.dia.slice(5, 7)));
      ctx = datos;
      window.ContenidoAdmin?.conectar(datos);
      $("panel-date").textContent =
        "Calendario · " + datos.dia.split("-").reverse().join("/");
      render();
      filtro("caja");
      filtro("reservas");
      activar(tab || location.hash.slice(1) || "panorama", false);
    },
  };
  activar(location.hash.slice(1) || "panorama", false);
})();
