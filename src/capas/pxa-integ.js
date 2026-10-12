/* ═════ v211 · Avatares PXA · integración (tarjeta Home, ventana de persona, cabezas en lugar de siglas) ═════ */
(function () {
  if (!window.PXA) return;
  if (!document.getElementById("pxa-font")) { const l = document.createElement("link"); l.id = "pxa-font"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;600&display=swap"; document.head.appendChild(l); }
  const nn = s => (window.normName ? normName(s) : String(s || "").toLowerCase().trim());
  const me = () => (typeof currentUser !== "undefined" ? currentUser : null);
  const find = n => { try { const f = window.pxpFindPerson && pxpFindPerson(n); return f && f.p; } catch (e) { return null; } };
  const grp = p => { try { const g = pxpGrupo(p); return { name: g, color: pxpCargoColor(g), shape: pxpGrupoForma(g) }; } catch (e) { return { name: "", color: "#6c4cff", shape: "circle" }; } };
  const GROUPS = () => {
    let cats = ["Dirección de Post", "Producción Ejecutiva", "Project Manager", "Editores", "Coloristas", "Compositing / Motion", "3D / CGI", "IA / Automatización", "Mastering / Data", "Audio"];
    try { if (window.pxpGruposLista) cats = pxpGruposLista().filter(c => c !== "Otros"); } catch (e) { }
    return cats.map(c => ({ name: c, color: window.pxpCargoColor ? pxpCargoColor(c) : "#888" }));
  };
  const isMe = n => me() && nn(n) === nn(me());

  /* cabeza en lugar de siglas (solo si no hay foto) */
  const oAv = window.pxpAvatar;
  if (oAv) window.pxpAvatar = function (kind, id) {
    const html = oAv.apply(this, arguments);
    if (kind !== "person") return html;
    const p = find(id); if (!p || !p.avatar || p.foto) return html;
    const url = PXA.headURL(p.avatar, null, 88);
    return html.replace(/<span class="avi">[\s\S]*<\/span><\/span>$/, `<span class="avi pxa-avi"><img src="${url}" alt=""></span></span>`).replace(/class="av( shp)? ini"/, 'class="av$1 pxa-has"');
  };

  /* editor emergente */
  function openEditor(name) {
    const p = find(name); if (!p || !isMe(name)) return;
    const ov = document.createElement("div"); ov.className = "pxa-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Editor de avatar");
    const box = document.createElement("div"); box.className = "pxa-box"; ov.appendChild(box); document.body.appendChild(ov);
    let api = null;
    const close = () => { ov.remove(); document.removeEventListener("keydown", onKey); removeEventListener("beforeunload", onUnload); };
    const ask = () => api ? api.requestClose() : close();
    const onKey = e => { if (e.key === "Escape") ask(); };
    const onUnload = e => { if (api && api.isDirty()) { e.preventDefault(); e.returnValue = ""; } };
    document.addEventListener("keydown", onKey); addEventListener("beforeunload", onUnload);
    ov.addEventListener("mousedown", e => { if (e.target === ov) ask(); });
    api = PXA.editor(box, {
      cfg: p.avatar || { skin: PXA.DEF.skin }, group: grp(p), groups: GROUPS(), onClose: close, draftKey: nn(name),
      onSave: cfg => { p.avatar = Object.assign({}, cfg); try { window.saveState && saveState(); } catch (e) { } refresh(); },
    });
  }
  window.pxpAvatarEditor = openEditor;

  /* entrada limpia: la pantalla de carga se queda hasta que el tablero termina de armarse y aparece completo */
  (function cleanEntry() {
    /* entrada limpia: la pantalla de carga se queda hasta que hay datos, fuentes y el tablero dejó de moverse; luego todo aparece de una vez
       (sin animaciones de entrada escalonadas). Aplica a la primera visita (pantalla de ingreso), al recargar con sesión y al iniciar sesión. */
    const sp = document.getElementById("pxp-splash"), ls = document.getElementById("login-screen"); if (!sp) return;
    const root = document.documentElement, loginVisible = () => !!ls && getComputedStyle(ls).display !== "none";
    let holding = false, released = 0;
    const ready = () => { if (loginVisible()) return true;
      const st = document.getElementById("sync-status"); if (st && /^\s*Cargando/i.test(st.textContent)) return false;
      const v = document.querySelector(".view.active"); return !!(v && v.textContent.trim().length > 40); };
    const settle = max => new Promise(res => {
      const t0 = performance.now(); let last = t0;
      const mo = new MutationObserver(() => { last = performance.now(); });
      mo.observe(document.body, { childList: true, subtree: true, characterData: true });
      const tick = () => { const n = performance.now(); if ((n - last > 350 && n - t0 > 450 && ready()) || n - t0 > max) { mo.disconnect(); res(); } else setTimeout(tick, 60); };
      Promise.race([document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]).then(() => setTimeout(tick, 40));
    });
    const hold = max => { if (holding) return; holding = true; root.classList.add("no-anim"); sp.dataset.pxaHold = "1"; sp.style.transition = "none"; sp.classList.remove("hide"); void sp.offsetWidth; sp.style.transition = "";
      Promise.race([settle(max), new Promise(r => setTimeout(r, max + 400))]).then(() => { if (!holding) return; released = performance.now(); delete sp.dataset.pxaHold; root.classList.add("no-anim"); sp.classList.add("hide"); holding = false;
        setTimeout(() => root.classList.remove("no-anim"), 900); }); };
    /* la plataforma quiere ocultar su pantalla de carga: la retenemos hasta que todo esté listo (primera visita o recarga) */
    new MutationObserver(() => { if (holding && sp.dataset.pxaHold && sp.classList.contains("hide")) { sp.classList.remove("hide"); return; }
      if (sp.classList.contains("hide") && !holding && !released) hold(loginVisible() ? 2500 : 6000); })
      .observe(sp, { attributes: true, attributeFilter: ["class"] });
    /* inicio de sesión: al ocultarse el ingreso, la pantalla de carga se queda hasta que el Home esté completo */
    if (ls) new MutationObserver(() => { if (!loginVisible() && !holding && performance.now() - released > 1500) { released = 0; hold(6000); } })
      .observe(ls, { attributes: true, attributeFilter: ["style", "class"] });
  })();

  /* tarjeta del Home: columna propia; clic = asistente, lápiz = editar */
  const PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4"/><path d="M13.5 6.5l4 4"/></svg>';
  let bub = null;
  const TIPS = ["¿Le damos play?", "Corte. Toma dos: ¿qué buscamos?", "Tus horas no se registran solas", "Tengo el cronograma en caché", "¿Quién está libre? Yo sé.", "¿Armamos una etapa nueva?", "Dime un proyecto y lo saco", "Las entregas no esperan. ¿Las vemos?", "Tu reporte, exportado en un clic", "Hoy pinta para versión final", "¿Qué vence esta semana? Te cuento", "Dame una palabra y busco", "Sin prisa, pero sin pausa", "Listo para el render, ¿y tú?"];
  const esc = t => String(t).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const R = (m, n) => m + Math.random() * (n - m);
  /* recordatorios reales: etapas asignadas, por vencer o vencidas, y entregas finales cercanas */
  const isoHoy = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const dias = f => Math.round((new Date(f + "T00:00:00") - new Date(isoHoy() + "T00:00:00")) / 864e5);
  const corto = (t, n) => { t = String(t || "").trim(); return t.length > n ? t.slice(0, n - 1).trim() + "…" : t; };
  const tit = t => String(t || "").toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase());
  function alerts(name) {
    const out = [], P = typeof PROJECTS !== "undefined" ? PROJECTS : {}, me_ = nn(name);
    Object.keys(P).forEach(k => {
      const pr = P[k]; if (!pr || pr.archivadoEn || pr.estadoGeneral === "aprobado") return;
      const pn = corto(tit(pr.nombre || k), 16); let mine = false;
      (pr.etapas || []).forEach(e => {
        const rs = [].concat(e.resp || []).map(nn); if (!rs.includes(me_)) return; mine = true;
        if (e.estado === "listo" || !e.fecha) return;
        const d = dias(e.fecha), en = corto(e.nombre || "Etapa", 18);
        if (d < 0) out.push({ p: 5, k, t: `«${en}» de ${pn} está vencida` });
        else if (d === 0) out.push({ p: 4, k, t: `Hoy vence «${en}» · ${pn}` });
        else if (d === 1) out.push({ p: 3, k, t: `Mañana vence «${en}» · ${pn}` });
        else if (d <= 3) out.push({ p: 2, k, t: `«${en}» vence en ${d} días` });
        else if (e.estado === "pendiente" && e.inicio && dias(e.inicio) >= -3 && dias(e.inicio) <= 0) out.push({ p: 2, k, t: `Etapa nueva para ti: «${en}»` });
        else if (e.estado === "revision") out.push({ p: 1, k, t: `«${en}» está en revisión` });
      });
      if (mine && window.pxpEntregaFinal) { try { const f = pxpEntregaFinal(pr); const d = f ? dias(f) : null; if (d != null && d >= 0 && d <= 3) out.push({ p: d === 0 ? 4 : 3, k, t: d === 0 ? `Hoy es la entrega final de ${pn}` : `Entrega final de ${pn} en ${d} día${d > 1 ? "s" : ""}` }); } catch (e) { } }
    });
    return out.sort((a, b) => b.p - a.p);
  }
  const reduceMo = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function homeCard() {
    const mr = document.getElementById("mi-resumen"), id = mr && mr.querySelector(".mr-id"); if (!id || mr.querySelector(".mr-pxa")) return;
    const name = me(), p = find(name); if (!p) return;
    mr.classList.add("has-pxa");
    const track = document.createElement("div"); track.className = "mr-pxa" + (p.avatar ? "" : " empty");
    if (!p.avatar) {
      track.innerHTML = '<button type="button" class="mr-pxa-new" aria-label="Crear mi avatar"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="11" y="5" width="10" height="10" rx="2"/><rect x="9" y="17" width="14" height="9" rx="2"/></svg><span>Crear avatar</span></button>';
      track.querySelector("button").onclick = () => openEditor(name); id.after(track); return;
    }
    track.innerHTML = `<div class="mr-pxa-w"><button type="button" class="mr-pxa-av" aria-label="Hablar con mi avatar" aria-expanded="false"><canvas width="128" height="128"></canvas></button><button type="button" class="mr-pxa-ed" aria-label="Editar mi avatar" title="Editar avatar">${PEN}</button></div>`;
    id.after(track);
    const wk = track.querySelector(".mr-pxa-w"), c = wk.querySelector("canvas"), av = wk.querySelector(".mr-pxa-av");
    wk.style.setProperty("--gc", grp(p).color);
    let L = null; setTimeout(() => { L = PXA.live(c, () => (find(name) || {}).avatar, grp(p)); }, 0);
    av.onclick = () => {
      hideTip();
      if (bub && bub.el.isConnected) { bub.close(); return; }
      const al = alerts(name).slice(0, 3);
      bub = PXA.bubble(wk, { hello: al.length ? `¿En qué te ayudo? Tienes ${al.length === 1 ? "un pendiente" : al.length + " pendientes"}.` : "¿En qué te puedo ayudar hoy?",
        chips: al.map(a => ({ label: a.t, hot: a.p >= 4, onClick: () => { if (bub) bub.close(); if (window.pxpOpenProject) pxpOpenProject(a.k); } })).concat(window.PXA_AGENT ? [{ label: "¿Qué puedo pedirte?", ghost: true, onClick: () => PXA_AGENT._ask("ayuda") }] : []),
        onAsk: window.PXA_AGENT ? PXA_AGENT.ask : null, mentions: window.PXA_AGENT ? PXA_AGENT.mentions : null,
        reanchor: () => document.querySelector(".mr-pxa-w"),
        onClose: () => av.setAttribute("aria-expanded", "false") });
      if (window.PXA_AGENT) { const B = bub; Object.assign(PXA_AGENT, { _show: r => B.el.isConnected && B.show(r), _say: x => B.el.isConnected && B.show({ text: x }), _ask: q => B.el.isConnected && B.ask(q), _close: () => B.el.isConnected && B.close() }); }
      av.setAttribute("aria-expanded", "true");
    };
    wk.querySelector(".mr-pxa-ed").onclick = () => openEditor(name);

    /* caminata espontánea (solo laptop/escritorio): de vez en cuando cruza su espacio y vuelve */
    let x = 0, target = 0, final = 0, walking = false, last = 0, stepT = 0, step = 1;
    const lookAround = done => { if (!L) return done(); const seq = [[-1, 520], [1, 620], [0, 380]]; let i = 0;
      const nx = () => { if (i >= seq.length) return done(); L.a.dx = seq[i][0]; L.redraw(); setTimeout(nx, seq[i++][1]); }; nx(); };
    let rafOn = false; const kick = () => { if (!rafOn) { rafOn = true; last = 0; requestAnimationFrame(frame); } };
    const go = (to, pause) => { final = to; target = pause ? Math.round(x + (to - x) * R(.4, .62)) : to; walking = true; kick(); };
    const range = () => Math.max(0, track.clientWidth - wk.offsetWidth);
    const canWalk = () => innerWidth > 1180 && !reduceMo() && !document.hidden && !(bub && bub.el.isConnected) && range() > 24;
    const frame = ts => {
      if (!track.isConnected || !walking) { rafOn = false; return; }   /* solo se anima mientras camina */
      const dt = Math.min(64, ts - (last || ts)); last = ts;
      if (walking) {
        const dir = Math.sign(target - x), v = 26 * dt / 1000;
        x = Math.abs(target - x) <= v ? target : x + dir * v;
        wk.style.transform = `translateX(${x.toFixed(1)}px)`; c.style.transform = dir < 0 ? "scaleX(-1)" : "";
        stepT += dt; if (stepT > 170) { stepT = 0; step = step === 1 ? 2 : 1; if (L) { L.a.walk = step; L.redraw(); } }
        if (x === target) {
          walking = false; c.style.transform = ""; if (L) { L.a.walk = 0; L.redraw(); }
          if (target !== final) lookAround(() => { if (track.isConnected) go(final, false); });          /* pausa a mitad de camino: mira alrededor y sigue */
          else if (final !== 0) setTimeout(() => { if (track.isConnected) lookAround(() => go(0, Math.random() < .5)); }, R(600, 1200));   /* llega, mira y vuelve */
          else schedule();
        }
      }
      if (walking) requestAnimationFrame(frame); else rafOn = false;
    };
    const schedule = (first) => setTimeout(() => {
      if (!track.isConnected) return;
      if (!canWalk()) { if (innerWidth <= 1180) { x = 0; wk.style.transform = ""; } schedule(); return; }
      hideTip();
      const r = range(), to = -Math.round(R(.5, .95) * r);
      if (Math.abs(to - x) > 6) go(to, true); else schedule();
    }, first ? R(45000, 60000) : R(45000, 90000));
    schedule(true);
    if (window.__pxaResize) removeEventListener("resize", window.__pxaResize);   /* un solo oyente aunque la tarjeta se vuelva a dibujar */
    window.__pxaResize = () => { if (!track.isConnected) return; const r = range(); if (-x > r) { x = -r; wk.style.transform = `translateX(${x}px)`; } };
    addEventListener("resize", window.__pxaResize);

    /* frases cortas que aparecen y se desvanecen */
    let tip = null, tipT = 0, ti = Math.floor(Math.random() * TIPS.length), turn = 0; const shown = new Set();
    function hideTip() { if (tip) { const t = tip; tip = null; t.classList.add("out"); setTimeout(() => t.remove(), 400); } clearTimeout(tipT); }
    let hoverT = 0;
    const showTip = (hover) => {
      if (!track.isConnected) return;
      if (tip) { if (!hover) tipT = setTimeout(showTip, 6000); return; }
      if (walking || (bub && bub.el.isConnected) || document.hidden) { if (!hover) tipT = setTimeout(showTip, 6000); return; }
      const al = alerts(name).filter(a => !shown.has(a.t)), useAlert = al.length && (turn++ % 2 === 0);
      const a = useAlert ? al[0] : null; if (a) shown.add(a.t);
      tip = document.createElement("button"); tip.type = "button"; tip.className = "mr-pxa-tip pxb tr" + (a ? " alert" + (a.p >= 4 ? " hot" : "") : ""); tip.setAttribute("aria-live", "polite");
      tip.innerHTML = `<span class="pxb-o"><span class="pxb-i">${a ? `<em>${a.p >= 4 ? "Urgente" : "Recordatorio"}</em>` : ""}${esc(a ? a.t : TIPS[ti++ % TIPS.length])}</span></span>${PXA.TAIL}`; wk.appendChild(tip);
      tip.onclick = () => { if (a && window.pxpOpenProject) { hideTip(); pxpOpenProject(a.k); } else av.click(); };
      const wr = wk.getBoundingClientRect(), cr = mr.getBoundingClientRect();
      if (wr.left - tip.offsetWidth - 12 < cr.left) { tip.classList.add("right"); tip.classList.remove("tr"); }
      clearTimeout(tipT);
      tipT = setTimeout(() => { hideTip(); tipT = setTimeout(showTip, R(30000, 45000)); }, hover ? 5000 : 7000);
    };
    /* al pasar el cursor: una frase o recordatorio distinto cada vez */
    wk.addEventListener("mouseenter", () => { clearTimeout(hoverT); hoverT = setTimeout(() => showTip(true), 220); });
    wk.addEventListener("mouseleave", () => clearTimeout(hoverT));
    tipT = setTimeout(showTip, R(5000, 8000));
  }

  /* un solo estado en la tarjeta: automático según la carga, editable por la persona (se decora sin reemplazar nodos) */
  const EST = { libre: ["Libre", "var(--green)"], cargado: ["Ocupado", "var(--yellow)"], saturado: ["Sobrecarga", "var(--red)"] };
  let menu = null;
  const closeMenu = () => { if (menu) { menu.remove(); menu = null; } };
  document.addEventListener("click", e => { if (menu && !menu.contains(e.target) && !e.target.closest(".mr-sem")) closeMenu(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  function homeState() {
    const sem = document.querySelector("#mi-resumen .mr-tags .mr-sem"); if (!sem || sem.dataset.pxa) return;
    const name = me(), p = find(name); if (!p) return;
    const fijo = !!(p.semaforoFijo && p.semaforo);
    sem.dataset.pxa = fijo ? "Manual" : "Auto"; sem.classList.add("mr-state-b");
    sem.setAttribute("role", "button"); sem.tabIndex = 0; sem.setAttribute("aria-haspopup", "menu"); sem.title = "Cambiar mi estado";
    const open = e => {
      e.stopPropagation(); if (menu) { closeMenu(); return; }
      const w = typeof currentWeek !== "undefined" ? currentWeek : 0; let auto = "cargado"; try { auto = pxpCargaAuto(p, w); } catch (er) { }
      const A = EST[auto] || EST.cargado;
      const opt = (v, label, sub, c) => `<button type="button" role="menuitemradio" aria-checked="${v === "" ? !fijo : (fijo && p.semaforo === v)}" data-v="${v}"><i style="--c:${c}"></i><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span></button>`;
      menu = document.createElement("div"); menu.className = "mr-state-m"; menu.setAttribute("role", "menu"); menu.setAttribute("aria-label", "Mi estado");
      menu.innerHTML = `<p>Mi estado esta semana</p>` + opt("", "Automático", "Según tu carga: " + A[0].toLowerCase(), A[1]) + "<hr>" + Object.keys(EST).map(k => opt(k, EST[k][0], "", EST[k][1])).join("");
      document.body.appendChild(menu);
      const r = sem.getBoundingClientRect(); menu.style.left = Math.min(r.left, innerWidth - menu.offsetWidth - 12) + "px"; menu.style.top = (r.bottom + 6) + "px";
      menu.onclick = ev => { const it = ev.target.closest("[data-v]"); if (!it) return; const v = it.dataset.v;
        p.semaforo = v || null; p.semaforoFijo = !!v; try { window.saveState && saveState(); } catch (er) { } closeMenu(); refresh(); };
    };
    sem.addEventListener("click", open);
    sem.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e); } });
  }
  /* ventana de persona: vista previa grande a la derecha */
  function personHead() {
    document.querySelectorAll(".pxp-modal.open .pm-head").forEach(h => {
      if (h.querySelector(".pm-pxa")) return;
      const t = h.querySelector(".pm-id h2"); if (!t) return;
      const name = t.textContent.trim(), p = find(name); if (!p) return;
      if (!p.avatar && !isMe(name)) return;
      const w = document.createElement(isMe(name) ? "button" : "div"); w.className = "pm-pxa" + (p.avatar ? "" : " empty");
      if (isMe(name)) { w.type = "button"; w.setAttribute("aria-label", p.avatar ? "Editar mi avatar" : "Crear mi avatar"); w.onclick = () => openEditor(name); }
      if (p.avatar) { w.style.setProperty("--gc", grp(p).color); const c = document.createElement("canvas"); c.width = c.height = 128; w.appendChild(c); setTimeout(() => PXA.live(c, () => find(name).avatar, grp(p)), 0); if (isMe(name)) w.insertAdjacentHTML("beforeend", '<em>Editar</em>'); }
      else w.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="11" y="5" width="10" height="10" rx="2"/><rect x="9" y="17" width="14" height="9" rx="2"/></svg><span>Crear avatar</span>';
      const x = h.querySelector(".pm-x,.pxp-x,[aria-label='Cerrar'],button.x"); if (x && x.parentElement === h) h.insertBefore(w, x); else h.appendChild(w);
    });
  }
  /* Team: el avatar reemplaza el conteo de proyectos en cada ficha */
  function teamCards() {
    document.querySelectorAll("#view-team .team-row").forEach(row => {
      if (row.dataset.pxa) return; const nm = row.querySelector(".team-name[data-pname]"); if (!nm) return;
      const name = nm.dataset.pname, p = find(name), tot = row.querySelector(".team-total"); row.dataset.pxa = "1";
      const b = document.createElement("button"); b.type = "button"; b.className = "team-pxa" + (p && p.avatar ? "" : " none");
      b.title = (tit(name)) + (tot ? " · " + tot.textContent.replace("↗", "").trim() : ""); b.setAttribute("aria-label", "Abrir la ficha de " + tit(name));
      if (p && p.avatar) { const g = grp(p); b.style.setProperty("--gc", g.color); const c = document.createElement("canvas"); c.width = c.height = 96; b.appendChild(c);
        /* cada ficha arranca con su propio desfase, así ningún avatar se mueve al mismo tiempo que otro */
        setTimeout(() => { if (c.isConnected) PXA.live(c, () => (find(name) || {}).avatar, g); }, Math.random() * 1800); PXA.blit(c, PXA.render(p.avatar, null, g)); row.classList.add("has-tpxa"); }
      else b.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="11" y="6" width="10" height="10" rx="2"/><rect x="9" y="18" width="14" height="9" rx="2"/></svg>';
      b.onclick = e => { e.stopPropagation(); if (window.pxpOpenPerson) pxpOpenPerson(name); };
      if (tot) tot.replaceWith(b); else row.appendChild(b);
    });
  }
  function refresh() {
    document.querySelectorAll(".mr-pxa,.pm-pxa").forEach(e => e.remove());
    try { if (window.renderHome) renderHome(); } catch (e) { }
    run();
  }
  /* rendimiento: las animaciones de la tarjeta del Home se pausan cuando no está en pantalla */
  let mrObs = null, mrEl = null; const watchMr = () => { const m = document.getElementById("mi-resumen"); if (!m || m === mrEl || !window.IntersectionObserver) return; mrEl = m;
    if (!mrObs) mrObs = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle("pxa-off", !e.isIntersecting))); mrObs.disconnect(); mrObs.observe(m); };
  let q = 0; const run = () => { q = 0; homeCard(); homeState(); personHead(); teamCards(); watchMr(); };
  new MutationObserver(() => { if (!q) q = requestAnimationFrame(run); }).observe(document.body, { childList: true, subtree: true });
  run();
})();
