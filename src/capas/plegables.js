/* ═════ v217 · Grupos plegables en Dashboard (Carga por persona) y Tráfico (por cargo, secciones y tabla) ═════
   Mismo sistema que Team y Capacidad: flecha a la derecha del título, «Cerrar todos / Abrir todos», y se recuerda por persona. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const user = () => String((typeof currentUser !== "undefined" && currentUser) || "anon").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_");
  const K = () => "pxp_pleg_" + user();
  const cerr = () => { try { return new Set(JSON.parse(localStorage.getItem(K()) || "[]")); } catch (e) { return new Set(); } };
  const guardar = st => { try { localStorage.setItem(K(), JSON.stringify([...st])); } catch (e) { } };
  const txt = el => ((el && el.textContent) || "").trim();
  const FOLD = "<svg class='i' viewBox='0 0 24 24' aria-hidden='true'><path d='m7 10 5-5 5 5M7 19l5-5 5 5'/></svg>", UNFOLD = "<svg class='i' viewBox='0 0 24 24' aria-hidden='true'><path d='m7 5 5 5 5-5M7 14l5 5 5-5'/></svg>";
  const T = (es, en) => (window.pxpLang === "en" ? en : es);
  const chev = (host, k, c, name) => {
    let b = host.querySelector(":scope > .pl-ch");
    if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "pl-ch"; host.appendChild(b); }
    if (b.dataset.k !== k) b.dataset.k = k;
    const lab = (c ? T("Desplegar ", "Expand ") : T("Plegar ", "Collapse ")) + name; if (b.getAttribute("aria-label") !== lab) b.setAttribute("aria-label", lab);
    const ex = String(!c); if (b.getAttribute("aria-expanded") !== ex) b.setAttribute("aria-expanded", ex);
  };
  const foldCtl = (host, scope, cls) => {
    if (!host || host.querySelector(":scope > .pl-fold")) return;
    host.insertAdjacentHTML("beforeend", `<span class="fold pl-fold ${cls || ""}" role="group" aria-label="${T("Grupos", "Groups")}" data-scope="${scope}"><button type="button" data-pl="close">${FOLD}${T("Esconder todos", "Hide all")}</button><button type="button" data-pl="open">${UNFOLD}${T("Mostrar todos", "Show all")}</button></span>`);
  };

  /* ---------- Dashboard · Carga por persona: la caja completa se pliega (los grupos por cargo se ven como antes) ---------- */
  function dash() {
    const lg = document.querySelector("#dash-wrap .load-groups"); if (!lg) return false;
    const panel = lg.closest(".home-panel"), ht = panel && panel.querySelector(".hp-title"); if (!ht) return false;
    const k = "dashbox:carga", c = cerr().has(k);
    panel.classList.add("pl-box"); if (panel.classList.contains("pl-closed") !== c) panel.classList.toggle("pl-closed", c);
    chev(ht, k, c, T("Carga por persona", "Load by person"));
    return false;
  }

  /* ---------- Tráfico: secciones (Equipo, Audio…), grupos por cargo y la vista en tabla ---------- */
  const secName = el => txt(el).split("·")[0].trim();
  /* barra del grupo con el diseño de Capacidad: avatares, nombre, cuántos y cómo están, y la flecha */
  const escH = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function barra(h, cards) {
    if (h.classList.contains("tg2")) return;
    const name = txt(h.querySelector("b")), ns = cards.map(c => { const n = c.querySelector(".ch-name"); return n ? (n.dataset.pname || txt(n)) : ""; }).filter(Boolean);
    const est = { libre: 0, cargado: 0, saturado: 0 };
    ns.forEach(n => { try { const f = window.pxpFindPerson && pxpFindPerson(n); const s = f && window.pxpCargaPersona ? pxpCargaPersona(f.p, typeof currentWeek !== "undefined" ? currentWeek : 0) : ""; if (s in est) est[s]++; } catch (e) { } });
    const av = ns.slice(0, 4).map(n => { try { return window.pxpAvatar ? pxpAvatar("person", n, 26) : ""; } catch (e) { return ""; } }).join("");
    const meta = [`${ns.length} ${ns.length === 1 ? T("persona", "person") : T("personas", "people")}`].concat(est.saturado ? [`<em class="sc">${est.saturado} ${T("con sobrecarga", "overloaded")}</em>`] : [], est.cargado ? [`<em class="al">${est.cargado} ${est.cargado === 1 ? T("ocupada", "busy") : T("ocupadas", "busy")}</em>`] : [], est.libre ? [`<em class="ok">${est.libre} ${est.libre === 1 ? T("libre", "free") : T("libres", "free")}</em>`] : []).join(" · ");
    let col = "var(--brand)"; try { if (window.pxpCargoColor) col = pxpCargoColor(name) || col; } catch (e) { }
    h.classList.add("tg2"); h.style.setProperty("--gc", col); h.setAttribute("role", "button"); h.tabIndex = 0;
    h.innerHTML = `<b class="gh-n">${escH(name)}</b><span class="tg-c">${ns.length}</span><span class="gh-av">${av}</span><span class="gh-m">${meta}</span>`;
  }
  function traffic() {
    const grid = $("main-grid"); if (!grid) return false;
    const st = cerr(); let secC = false, grpC = false, any = false;
    const kids = [...grid.children];
    kids.forEach((el, i) => { if (!el.classList.contains("trf-grp")) return; const cs = []; for (let j = i + 1; j < kids.length && kids[j].classList.contains("card") && kids[j].querySelector(".ch-top"); j++) cs.push(kids[j]); barra(el, cs); });
    kids.forEach(el => {
      if (el.classList.contains("section-label")) {
        const name = secName(el), k = "trfsec:" + name; secC = st.has(k); grpC = false; any = true;
        el.classList.add("pl-h"); el.classList.toggle("pl-closed", secC); chev(el, k, secC, name); return;
      }
      if (el.classList.contains("trf-grp")) {
        const name = txt(el.querySelector("b")), k = "trfgrp:" + name; grpC = st.has(k); any = true;
        el.classList.add("pl-h"); el.classList.toggle("pl-closed", grpC); el.classList.toggle("pl-hid", secC); chev(el, k, grpC, name); return;
      }
      if (el.id === "trf-sort" || el.id === "trf-table" || el.classList.contains("rod-panel")) return;
      const isCard = el.classList.contains("card") && !!el.querySelector(".ch-top");
      const hid = secC || (isCard && grpC); if (el.classList.contains("pl-hid") !== hid) el.classList.toggle("pl-hid", hid);
    });
    /* tabla: las filas de grupo llevan la misma barra (avatares, cuántos y cómo están) y pliegan sus personas */
    const tb = $("trf-table");
    if (tb) { const trs = [...tb.querySelectorAll("tbody tr")];
      trs.forEach((tr, i) => { if (!tr.classList.contains("pv-g") || tr.classList.contains("tg2")) return; const td = tr.querySelector("td"); if (!td) return;
        const ns = []; for (let j = i + 1; j < trs.length && !trs[j].classList.contains("pv-g"); j++) { const n = trs[j].querySelector(".tt-n"); if (n) ns.push(n.dataset.pname || txt(n.querySelector("b"))); }
        const name = txt(td.querySelector("b")); const h = document.createElement("div"); h.innerHTML = "<b></b>"; h.querySelector("b").textContent = name;
        barra(h, ns.map(n => { const d = document.createElement("div"); d.innerHTML = '<span class="ch-name"></span>'; d.firstChild.dataset.pname = n; return d; }));
        tr.classList.add("tg2"); tr.style.setProperty("--gc", h.style.getPropertyValue("--gc")); td.innerHTML = `<div class="tg-row">${h.innerHTML}</div>`; });
      let c = false; trs.forEach(tr => {
      if (tr.classList.contains("pv-g")) { const name = txt(tr.querySelector(".gh-n") || tr.querySelector("b")), k = "trfgrp:" + name; c = st.has(k); tr.classList.add("pl-h"); tr.classList.toggle("pl-closed", c); const row = tr.querySelector(".tg-row") || tr.querySelector("td"); if (row) chev(row, k, c, name); return; }
      if (tr.classList.contains("pl-hid") !== c) tr.classList.toggle("pl-hid", c); }); }
    const bar = $("trf-sort"); if (bar && any) foldCtl(bar, "trf", "pl-trf");
    return true;
  }
  /* encabezado de persona: si el cargo y el grupo dicen lo mismo, en celular se muestra una sola vez */
  const planoT = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  function cargo() { const r = document.querySelector("#pxp-person .ph-role"); if (!r) return; const s = planoT(txt(r.querySelector(".ph-role-t"))) === planoT(txt(r.querySelector(".ph-grp"))); if (r.classList.contains("same") !== s) r.classList.toggle("same", s); }
  const run = () => { try { dash(); } catch (e) { console.error(e); } try { traffic(); } catch (e) { console.error(e); } try { cargo(); } catch (e) { } };

  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest(".pl-ch, .pl-fold [data-pl], #main-grid > .section-label.pl-h, #main-grid > .trf-grp.pl-h, #trf-table tr.pv-g.pl-h, #dash-wrap .pl-box > .hp-title");
    if (!b) return; if (!b.dataset.pl && !b.classList.contains("pl-ch") && e.target.closest("button, a, input, select, label, [onclick]")) return;
    e.preventDefault(); e.stopPropagation();
    const st = cerr();
    if (b.dataset.pl) {
      const keys = [...document.querySelectorAll("#main-grid .pl-ch, #trf-table .pl-ch")].map(x => x.dataset.k);
      const grp = keys.filter(k => k.startsWith("trfgrp:")), use = grp.length ? grp : keys;
      use.forEach(k => b.dataset.pl === "close" ? st.add(k) : st.delete(k));
    } else { const ch = b.classList.contains("pl-ch") ? b : b.querySelector(".pl-ch"); if (!ch) return; const k = ch.dataset.k; if (st.has(k)) st.delete(k); else st.add(k); }
    guardar(st); run(); try { if (document.getElementById("main-grid") && window.pxpTraficoMosaico) pxpTraficoMosaico(); } catch (er) { }
  }, true);
  document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".pl-h")) { e.preventDefault(); e.target.click(); } });
  /* Tráfico se decora justo antes de acomodar el mosaico (así mide las barras ya armadas y los grupos plegados) */
  const oDec = window.pxpTrfDecorar; window.pxpTrfDecorar = function () { const r = oDec ? oDec.apply(this, arguments) : undefined; try { traffic(); } catch (e) { console.error(e); } return r; };
  ["render", "renderDashboard", "pxpTrfSort", "pxpTrfQ", "pxpVistaTrf"].forEach(n => { const o = window[n]; if (typeof o === "function") window[n] = function () { const r = o.apply(this, arguments); run(); return r; }; });
  if (window.pxpOnDom) pxpOnDom(run, { childList: true, subtree: true });
  window.pxpPlegables = run;
})();
