"use strict";
(() => {
  const dialog = document.createElement("dialog");
  dialog.className = "admin-dialog";
  dialog.setAttribute("aria-labelledby", "admin-dialog-title");
  document.body.append(dialog);
  let resolver = null;
  function terminar(value) {
    const fn = resolver;
    resolver = null;
    dialog.close();
    fn?.(value);
  }
  function abrir(texto, valor, esConfirmacion) {
    if (resolver) return Promise.resolve(esConfirmacion ? false : null);
    return new Promise((resolve) => {
      resolver = resolve;
      dialog.innerHTML = `<h2 id="admin-dialog-title">${esConfirmacion ? "Confirmar cambio" : "Completa la información"}</h2><p>${MAPO.esc(texto)}</p><form><label ${esConfirmacion ? "hidden" : ""}>${esConfirmacion ? "" : "Tu respuesta"}<input name="respuesta" value="${MAPO.esc(valor || "")}" ${esConfirmacion ? "disabled" : ""}></label><div class="acciones"><button type="button" class="sec" data-cancelar>Volver</button><button type="submit">${esConfirmacion ? "Confirmar" : "Continuar"}</button></div></form>`;
      dialog.querySelector("[data-cancelar]").onclick = () =>
        terminar(esConfirmacion ? false : null);
      dialog.querySelector("form").onsubmit = (e) => {
        e.preventDefault();
        terminar(esConfirmacion ? true : e.target.elements.respuesta.value);
      };
      dialog.showModal();
      if (!esConfirmacion) dialog.querySelector("input").focus();
    });
  }
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    terminar(null);
  });
  window.DialogoMAPO = {
    pedir: (texto, valor = "") => abrir(texto, valor, false),
    confirmar: (texto) => abrir(texto, "", true),
  };
  const toast = document.createElement("div");
  toast.id = "admin-toast";
  toast.hidden = true;
  document.body.append(toast);
  let timer;
  new MutationObserver(() => {
    const state = document.getElementById("estado"),
      msg = state.textContent;
    if (!msg || msg.startsWith("Sesión:") || msg.startsWith("Preparando"))
      return;
    toast.textContent = msg;
    toast.classList.toggle("error", state.classList.contains("error"));
    toast.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => (toast.hidden = true), 6000);
  }).observe(document.getElementById("estado"), {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
})();
