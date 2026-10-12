/* ═════ v211 · Agente del avatar sin modelo: entiende pedidos en español con los datos de la plataforma ═════
   Lee: proyectos, etapas, equipo y carga. Escribe solo con confirmación: horas (con el formulario oficial), tareas,
   etapas, estado de etapa y estado de proyecto. Todo queda en el historial del proyecto y se puede deshacer.
   Cuando llegue el modelo aprobado, este mismo catálogo de acciones se le entrega como herramientas. */
(function () {
  const N = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  const tit = t => String(t || "").toLowerCase().replace(/(^|[\s(«"'-])\S/g, m => m.toUpperCase());
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const hoy = () => iso(new Date());
  const dias = f => Math.round((new Date(f + "T00:00:00") - new Date(hoy() + "T00:00:00")) / 864e5);
  const fD = f => { try { return new Date(f + "T00:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" }); } catch (e) { return f; } };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const me = () => (typeof currentUser !== "undefined" ? currentUser : "");
  const isMe = n => N(n) === N(me());
  const P = () => (typeof PROJECTS !== "undefined" ? PROJECTS : {});
  const people = () => [].concat(typeof TEAM !== "undefined" ? TEAM : [], typeof AUDIO !== "undefined" ? AUDIO : []);
  const findP = n => { try { const f = window.pxpFindPerson && pxpFindPerson(n); return f && f.p; } catch (e) { return null; } };
  const admin = () => { try { return window.pxpPuedeEditar ? !!pxpPuedeEditar() : false; } catch (e) { return false; } };
  const activos = () => Object.keys(P()).filter(k => { const p = P()[k]; return p && !p.archivadoEn; });
  const pName = k => String((P()[k] || {}).nombre || k);
  const resps = e => [].concat(e.resp || []).map(N);
  const save = () => { try { window.saveState && saveState(); } catch (e) { } ["renderHome", "renderProjects", "renderMisHoras"].forEach(f => { try { window[f] && window[f](); } catch (e) { } }); try { if (typeof render === "function" && typeof currentWeek !== "undefined") render(currentWeek); } catch (e) { } };
  const hist = (k, texto) => { const p = P()[k]; if (!p) return; (p.historial = p.historial || []).push({ ts: new Date().toISOString(), usuario: me(), texto: texto + " · con el asistente" }); };
  const EST = { pendiente: "Pendiente", en_curso: "En curso", revision: "En revisión", listo: "Lista" };
  const ESTP = { cotizado: "Cotizado", preproduccion: "Preproducción", rodaje: "Rodaje", en_produccion: "Postproducción", postproduccion: "Postproducción", revision: "Revisión", entregado: "Entregado", aprobado: "Aprobado", standby: "Standby" };
  const VIEWS = [[/\bsala\b/, "sala", "la Sala de juntas"], [/\b(home|inicio)\b/, "home", "Home"], [/\bdashboard|tablero\b/, "dashboard", "Dashboard"], [/\btrafico\b/, "traffic", "Tráfico"], [/\bproyectos\b/, "projects", "Proyectos"], [/\b(team|equipo)\b/, "team", "Team"],
    [/\bclientes?\b/, "clientes", "Clientes"], [/\bcapacidad\b/, "capacidad", "Capacidad"], [/\bmis horas\b/, "mishoras", "Mis horas"], [/\bhoras\b/, "horas", "Horas"], [/\breportes?\b/, "reportes", "Reportes"], [/\blicencias?\b/, "licencias", "Licencias"], [/\blogros?\b/, "logros", "Logros"], [/\brepositorio\b/, "repositorio", "Repositorio"]];
  const go = v => { try { window.PXA_AGENT._close(); switchView(v); window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { } };
  const openP = k => { try { window.PXA_AGENT._close(); pxpOpenProject(k); } catch (e) { } };
  const openPer = n => { try { window.PXA_AGENT._close(); pxpOpenPerson(n); } catch (e) { } };

  /* ---------- menciones ---------- */
  function mentions(type, q) {
    const nq = N(q);
    if (type === "@") return people().filter(p => !nq || N(p.name).includes(nq) || N(window.pxpHandleDe ? pxpHandleDe(p.name) : "").includes(nq))
      .slice(0, 6).map(p => ({ id: p.name, label: tit(p.name), sub: p.alias || p.role || "", insert: "@" + tit(p.name) }));
    return activos().filter(k => !nq || N(P()[k].nombre || k).includes(nq) || N(P()[k].cliente).includes(nq))
      .sort((a, b) => (P()[a].estadoGeneral === "aprobado") - (P()[b].estadoGeneral === "aprobado")).slice(0, 6)
      .map(k => ({ id: k, label: pName(k), sub: tit(P()[k].cliente || ""), insert: "#" + pName(k) }));
  }
  /* ---------- extracción ---------- */
  function findPeople(text) {
    const t = N(text), out = [];
    people().forEach(p => { const n = N(p.name), h = N(window.pxpHandleDe ? pxpHandleDe(p.name) : ""); if (t.includes("@" + n) || (h && t.includes("@" + h))) out.push(p); });
    if (!out.length) people().forEach(p => { const first = N(p.name).split(" ")[0]; if (first.length > 3 && new RegExp("@" + first + "\\b").test(t)) out.push(p); });
    return out;
  }
  function findProject(text) {
    const t = N(text);
    let best = null, bl = 0;
    activos().forEach(k => { const n = N(P()[k].nombre || k); if (n.length < 3) return;
      if ((t.includes("#" + n) || t.includes(n)) && n.length > bl) { best = k; bl = n.length; } });
    if (best) return best;
    const tw = words(text); if (tw.length) { let sc = {}, top = 0; activos().forEach(k => { const n = words(P()[k].nombre || k); const s = n.filter(w => tw.includes(w)).length; if (s) { sc[k] = s; top = Math.max(top, s); } });
      const c = Object.keys(sc).filter(k => sc[k] === top); if (c.length === 1) return c[0]; }
    const m = t.match(/#([^\s#@]+(?:\s[^\s#@]+){0,3})/); if (m) { const q = m[1]; const c = activos().find(k => N(P()[k].nombre || k).startsWith(q)); if (c) return c; }
    return null;
  }
  function parseDate(text) {
    const t = N(text), d = new Date();
    if (/\bpasado manana\b/.test(t)) { d.setDate(d.getDate() + 2); return iso(d); }
    if (/\bmanana\b/.test(t)) { d.setDate(d.getDate() + 1); return iso(d); }
    if (/\bayer\b/.test(t)) { d.setDate(d.getDate() - 1); return iso(d); }
    if (/\bhoy\b/.test(t)) return iso(d);
    const W = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const wm = t.match(/\b(el |este |proximo )?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/);
    if (wm) { const target = W.indexOf(wm[2]); let add = (target - d.getDay() + 7) % 7; if (add === 0) add = 7; d.setDate(d.getDate() + add); return iso(d); }
    const M = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const dm = t.match(/\b(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/);
    if (dm) { const x = new Date(d.getFullYear(), M.indexOf(dm[2]), +dm[1]); if (x < new Date(d.getFullYear(), d.getMonth(), d.getDate() - 60)) x.setFullYear(x.getFullYear() + 1); return iso(x); }
    const sm = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (sm) { const y = sm[3] ? (+sm[3] < 100 ? 2000 + +sm[3] : +sm[3]) : d.getFullYear(); return iso(new Date(y, +sm[2] - 1, +sm[1])); }
    const im = t.match(/\b(\d{4}-\d{2}-\d{2})\b/); if (im) return im[1];
    return null;
  }
  function parseHours(text) {
    const t = N(text).replace(",", ".");
    if (/\bmedia hora\b/.test(t)) return .5;
    const m = t.match(/(\d+(?:\.\d+)?)\s*(?:h\b|hrs?\b|horas?\b)/) || t.match(/\b(?:registra|anota|carga|mete|suma)\s+(\d+(?:\.\d+)?)\b/);
    if (!m) return null; let h = parseFloat(m[1]); if (/y media/.test(t)) h += .5; return Math.round(h * 2) / 2;
  }
  const stageState = t => /revisi/.test(t) ? "revision" : /(lista|listo|terminad|hecha|hecho|finaliz|complet)/.test(t) ? "listo" : /(en curso|curso|empec|arranc|trabajando)/.test(t) ? "en_curso" : /pendiente/.test(t) ? "pendiente" : null;
  function myStages(name) {
    const out = []; const n = N(name || me());
    activos().forEach(k => (P()[k].etapas || []).forEach((e, i) => { if (resps(e).includes(n) && e.estado !== "listo") out.push({ k, i, e }); }));
    return out.sort((a, b) => (a.e.fecha || "9").localeCompare(b.e.fecha || "9"));
  }
  const words = t => N(t).split(/[^a-z0-9\u00f1]+/).filter(w => w.length >= 4 && !STOP.has(w));
  const STOP = new Set("horas hora etapa etapas tarea tareas proyecto proyectos revision lista listo pasa pasar marca crea crear como esta este semana manana para pendiente curso estado registra registrar cambia mueve pone ponla ponlo quien libre busca buscar abre abrir dime cuenta sobre tengo hice ayer viernes lunes martes miercoles jueves sabado domingo".split(" "));
  function findStage(text, k) {
    const t = N(text), tw = words(text), pool = [];
    (k ? [k] : activos()).forEach(kk => (P()[kk].etapas || []).forEach((e, i) => pool.push({ k: kk, i, e })));
    const mine = x => resps(x.e).includes(N(me())), open = x => x.e.estado !== "listo";
    const tok = x => words(x.e.nombre).some(w => tw.includes(w));
    const exact = pool.filter(x => { const n = N(x.e.nombre); return n.length >= 3 && t.includes(n); });
    const mx = exact.filter(mine); if (mx.length) return mx;
    const mt = pool.filter(x => mine(x) && open(x) && tok(x)); if (mt.length) return mt;
    if (exact.length) { const L = Math.max(...exact.map(x => N(x.e.nombre).length)); return exact.filter(x => N(x.e.nombre).length === L); }
    if (k) { const kt = pool.filter(x => open(x) && tok(x)); if (kt.length) return kt; return pool.filter(x => open(x) && (admin() || mine(x))); }
    return pool.filter(x => mine(x) && open(x));
  }
  const stageChip = (x, extra) => ({ label: `«${x.e.nombre || "Etapa"}» · ${pName(x.k)}`, sub: x.e.fecha ? (EST[x.e.estado] || x.e.estado) + " · vence " + fD(x.e.fecha) : (EST[x.e.estado] || ""), hot: x.e.fecha && dias(x.e.fecha) <= 0 && x.e.estado !== "listo", onClick: extra || (() => openP(x.k)) });

  /* ---------- acciones con confirmación ---------- */
  function confirmHours(x, h, fecha, nota) {
    if (window.pxpPuedeRegistrar && !pxpPuedeRegistrar(x.e)) return { text: "En esa etapa no puedes registrar horas. Solo su responsable o Administración." };
    if (fecha > hoy()) return { text: "No puedo registrar horas en días que no han llegado. Dime una fecha de hoy hacia atrás." };
    return { text: "¿Lo registro?", confirm: { title: `Registrar ${String(h).replace(".", ",")} h`, lines: [`Etapa: «${x.e.nombre}»`, `Proyecto: ${pName(x.k)}`, `Fecha: ${fD(fecha)}`].concat(nota ? [`Nota: ${nota}`] : []), yes: "Sí, registrar",
      onYes: async () => {
        try {
          pxpHorasOpen(x.k, x.i); await new Promise(r => setTimeout(r, 60));
          const set = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); } };
          set("hr-h", h); set("hr-fecha", fecha); if (nota) set("hr-nota", nota);
          const before = (x.e.horas || []).length; await pxpHorasGuardar(); try { if (window.pxpHorasClose) pxpHorasClose(); } catch (e) { }
          const added = (x.e.horas || []).length > before ? x.e.horas[x.e.horas.length - 1] : null;
          if (!added) return { text: "No alcancé a guardarlas. Revisa el formulario de horas." };
          return { text: `Listo: ${String(h).replace(".", ",")} h en «${x.e.nombre}». Toma aprobada.`, chips: [{ label: "Deshacer", ghost: true, onClick: () => { const j = x.e.horas.indexOf(added); if (j >= 0) x.e.horas.splice(j, 1); save(); window.PXA_AGENT._say("Deshecho. Esas horas ya no están."); } }, { label: "Ver mis horas", onClick: () => go("mishoras") }] };
        } catch (e) { return { text: "Algo falló al registrar. Inténtalo desde el formulario de horas." }; }
      } } };
  }
  function confirmStageState(x, v) {
    if (!admin() && !resps(x.e).includes(N(me()))) return { text: "Esa etapa no es tuya. Solo su responsable o Administración puede cambiarle el estado." };
    if (x.e.estado === v) return { text: `«${x.e.nombre}» ya está ${String(EST[v]).toLowerCase()}.`, chips: [stageChip(x)] };
    return { text: "¿Le cambio el estado?", confirm: { title: `«${x.e.nombre}» → ${EST[v]}`, lines: [`Proyecto: ${pName(x.k)}`, `Antes: ${EST[x.e.estado] || x.e.estado}`], yes: "Sí, cambiar",
      onYes: () => { const prev = x.e.estado; x.e.estado = v; hist(x.k, `Etapa «${x.e.nombre}» → ${EST[v]}`); save();
        return { text: `Hecho: «${x.e.nombre}» quedó ${String(EST[v]).toLowerCase()}.`, chips: [{ label: "Deshacer", ghost: true, onClick: () => { x.e.estado = prev; hist(x.k, `Etapa «${x.e.nombre}» → ${EST[prev] || prev} (deshecho)`); save(); window.PXA_AGENT._say("Deshecho. Volvió a como estaba."); } }, { label: "Abrir proyecto", onClick: () => openP(x.k) }] }; } } };
  }

  /* ---------- intérprete ---------- */
  const HELP = { text: "Puedo buscar proyectos, contarte qué vence, decirte quién está libre, registrar horas, crear tareas y etapas, y cambiar estados. Prueba así:",
    chips: [["Mis pendientes", "mis pendientes"], ["¿Quién está libre?", "quién está libre esta semana"], ["Registrar horas", "registra 2 horas hoy"], ["Nueva tarea", "crea una tarea revisar color mañana"], ["Ir a Reportes", "ve a reportes"]]
      .map(([l, q]) => ({ label: l, ghost: true, onClick: () => window.PXA_AGENT._ask(q) })) };

  function ask(raw, noAI) {
    const text = String(raw || "").trim(), t = N(text);
    if (!t) return HELP;
    const k = findProject(text), ppl = findPeople(text), fecha = parseDate(text), h = parseHours(text);

    if (/^(hola|buenas|hey|que mas|q mas)\b/.test(t) && t.length < 18) return { text: `¡Hola, ${tit(me()).split(" ")[0]}! ¿Qué sacamos hoy?`, chips: HELP.chips };
    if (/(ayuda|que puedes|como funcionas|que sabes hacer|comandos)/.test(t)) return HELP;
    if (/(gracias|genial|perfecto|buenisimo|de una)\b/.test(t) && t.length < 24) return { text: "Con gusto. Aquí sigo, en el set." };

    /* registrar horas */
    if (h != null && /(registr|anota|carga|mete|suma|trabaje|hice|dedique|horas? (en|a|al)|h (en|a|al))/.test(t)) {
      const d = fecha || hoy(), nota = (text.match(/nota[:\s]+(.+)$/i) || [])[1] || "";
      const st = findStage(text, k).filter(x => !window.pxpPuedeRegistrar || pxpPuedeRegistrar(x.e));
      if (st.length === 1) return confirmHours(st[0], h, d, nota);
      if (!st.length) return { text: k ? `No encuentro etapas tuyas en ${pName(k)} donde registrar.` : "No tienes etapas activas donde registrar horas. Si es otra, ábrela desde el proyecto." };
      return { text: `¿En cuál etapa registro ${String(h).replace(".", ",")} h?`, chips: st.slice(0, 5).map(x => stageChip(x, () => window.PXA_AGENT._show(confirmHours(x, h, d, nota)))) };
    }
    /* crear tarea */
    if (/(crea|crear|agrega|anade|nueva|apunta|anota|recuerdame)\b.*\b(tarea|recordatorio|to ?do)\b|^recuerdame\b/.test(t)) {
      const target = ppl[0] ? ppl[0] : findP(me());
      if (!target) return { text: "No encuentro tu ficha para guardar la tarea." };
      if (!isMe(target.name) && !admin()) return { text: "Solo Administración puede crearle tareas a otras personas. ¿La creo para ti?" };
      let txt = text.replace(/^.*?\b(tarea|recordatorio|to ?do)\b\s*(de|para|:)?\s*/i, "").replace(/^recu[eé]rdame\s*(que)?\s*/i, "")
        .replace(/@[^\s@#]+(\s[A-ZÁÉÍÓÚÑ][^\s@#]*){0,2}/g, "").replace(/#[^\s@#]+(\s[A-ZÁÉÍÓÚÑ0-9][^\s@#]*){0,3}/g, "")
        .replace(/(^|\s)(pasado mañana|hoy|mañana|manana|ayer)(?=\s|$)/gi, " ").replace(/\s{2,}/g, " ").trim().replace(/(\s+(para|en|el|del|de|a|al|con))+$/i, "").trim();
      if (k) txt = txt.replace(new RegExp(N(P()[k].nombre), "i"), "").trim();
      if (!txt) return { text: "¿Qué dice la tarea? Por ejemplo: «crea una tarea revisar color de #Proyecto mañana»." };
      txt = txt.charAt(0).toUpperCase() + txt.slice(1);
      return { text: "¿La creo?", confirm: { title: "Nueva tarea", lines: [`«${txt}»`, `Para: ${tit(target.name)}`].concat(k ? [`Proyecto: ${pName(k)}`] : []).concat(fecha ? [`Fecha: ${fD(fecha)}`] : []), yes: "Sí, crear",
        onYes: () => { const tk = { id: "t" + uid(), texto: txt, fecha: fecha || "", proyecto: k ? (P()[k].nombre || k) : "", hecho: false, creada: new Date().toISOString(), por: me() };
          (target.tareas = target.tareas || []).push(tk); save();
          return { text: "Tarea creada. Ya está en la lista.", chips: [{ label: "Deshacer", ghost: true, onClick: () => { const j = target.tareas.indexOf(tk); if (j >= 0) target.tareas.splice(j, 1); save(); window.PXA_AGENT._say("Deshecho. La tarea se fue."); } }] }; } } };
    }
    /* crear etapa */
    if (/(crea|crear|agrega|anade|nueva|abre)\b.*\betapa\b/.test(t)) {
      if (!admin()) return { text: "Crear etapas es cosa de Administración. Puedo avisarte de las tuyas o registrar horas." };
      if (!k) return { text: "¿En qué proyecto? Usa # para elegirlo, por ejemplo «crea una etapa Color en #Proyecto el viernes para @Persona»." };
      let nombre = (text.match(/etapa\s+(?:de\s+)?["«]?([^"»@#]+?)["»]?(?=\s+(?:en|para|el|del|hasta|#|@)\b|$)/i) || [])[1] || "";
      nombre = nombre.replace(new RegExp(N(P()[k].nombre), "i"), "").trim();
      if (!nombre) return { text: "¿Cómo se llama la etapa? Ejemplo: «crea una etapa Online final en #Proyecto el viernes»." };
      const resp = ppl[0] ? ppl[0].name : me().toUpperCase(), fin = fecha || (() => { const d = new Date(); d.setDate(d.getDate() + 3); return iso(d); })();
      const nm = nombre.charAt(0).toUpperCase() + nombre.slice(1);
      return { text: "¿La agrego al cronograma?", confirm: { title: `Nueva etapa · ${nm}`, lines: [`Proyecto: ${pName(k)}`, `Responsable: ${tit(resp)}`, `Vence: ${fD(fin)}${fecha ? "" : " (estimado, la puedes mover)"}`], yes: "Sí, crear",
        onYes: () => { const e = { nombre: nm, inicio: hoy(), fecha: fin, estado: "pendiente", resp: String(resp).toUpperCase(), nota: "" }; const arr = (P()[k].etapas = P()[k].etapas || []); arr.push(e);
          hist(k, `Etapa nueva «${nm}» para ${tit(resp)}`); save();
          return { text: `Etapa «${nm}» creada en ${pName(k)}.`, chips: [{ label: "Deshacer", ghost: true, onClick: () => { const j = arr.indexOf(e); if (j >= 0) arr.splice(j, 1); hist(k, `Etapa «${nm}» eliminada (deshecho)`); save(); window.PXA_AGENT._say("Deshecho. La etapa ya no está."); } }, { label: "Abrir proyecto", onClick: () => openP(k) }] }; } } };
    }
    /* estado de proyecto (manual) */
    const pst = /(standby|en pausa|pausa|pausar)/.test(t) ? "standby" : /\baprobad/.test(t) ? "aprobado" : /\bcotizad/.test(t) ? "cotizado" : null;
    if (k && pst && /(pon|pasa|marca|cambia|deja|mueve|pausa|aprueba|cotiza)/.test(t) && !/etapa/.test(t)) {
      if (!admin()) return { text: "Solo Administración cambia el estado de un proyecto." };
      const pr = P()[k];
      if (pr.estadoGeneral === pst) return { text: `${pName(k)} ya está en ${ESTP[pst]}.` };
      return { text: "¿Lo cambio?", confirm: { title: `${pName(k)} → ${ESTP[pst]}`, lines: [`Antes: ${ESTP[pr.estadoGeneral] || pr.estadoGeneral || "—"}`, pst === "aprobado" ? "Se marca como aprobado por el cliente." : pst === "standby" ? "Queda en pausa hasta que lo reactives." : "Vuelve a cotización."], yes: "Sí, cambiar",
        onYes: () => { const prev = pr.estadoGeneral, prevF = pr.estadoFijo; pr.estadoGeneral = pst; try { pxpMarcarEstadoManual(k, pst); } catch (e) { } hist(k, `Estado → ${ESTP[pst]}`); save();
          return { text: `${pName(k)} quedó en ${ESTP[pst]}.`, chips: [{ label: "Deshacer", ghost: true, onClick: () => { pr.estadoGeneral = prev; if (prevF) pr.estadoFijo = prevF; else delete pr.estadoFijo; hist(k, `Estado → ${ESTP[prev] || prev} (deshecho)`); save(); window.PXA_AGENT._say("Deshecho."); } }, { label: "Abrir proyecto", onClick: () => openP(k) }] }; } } };
    }
    /* estado de etapa */
    const sst = stageState(t);
    if (sst && /(pasa|pon|marca|cambia|mueve|actualiza|deja|termine|acabe|empece|arranque|lista|listo)/.test(t)) {
      const st = findStage(text, k);
      if (st.length === 1) return confirmStageState(st[0], sst);
      if (!st.length) return { text: "No encuentro esa etapa. Escribe su nombre o elige el proyecto con #." };
      return { text: `¿Cuál etapa paso a ${String(EST[sst]).toLowerCase()}?`, chips: st.slice(0, 5).map(x => stageChip(x, () => window.PXA_AGENT._show(confirmStageState(x, sst)))) };
    }
    /* crear proyecto */
    if (/(crea|crear|nuevo|abre un|arma un|monta un)\b.*\bproyecto\b/.test(t)) {
      if (!admin()) return { text: "Solo Administración crea proyectos. Puedo ayudarte a buscar uno." };
      const nombre = (text.match(/proyecto\s+(?:llamado\s+|de nombre\s+)?["«]?([^"»]+?)["»]?(?=\s+(?:para|de|del cliente|cliente)\b|$)/i) || [])[1] || "";
      const cliente = (text.match(/(?:para|cliente|del cliente)\s+["«]?([^"»,]+?)["»]?\s*$/i) || [])[1] || "";
      setTimeout(() => { try { window.PXA_AGENT._close(); pxpNewProject({ nombre, cliente }); } catch (e) { } }, 900);
      return { text: nombre ? `Te abrí la ficha de proyecto nuevo con «${tit(nombre)}»${cliente ? ` para ${tit(cliente)}` : ""}. Completa y dale crear.` : "Te abrí la ficha de proyecto nuevo. Llena nombre y cliente, y le damos." };
    }
    /* reportes */
    if (/(reporte|informe|pdf|time ?table|cronograma en pdf)/.test(t)) {
      go("reportes");
      return { text: k ? `Abrí Reportes. Busca ${pName(k)} y exporta el que necesites.` : "Abrí Reportes: proyecto, cliente, cargas o time table.", chips: k ? [{ label: "Abrir " + pName(k), onClick: () => openP(k) }] : [] };
    }
    /* quién está libre */
    if (/(quien|quienes|alguien)\b.*\b(libre|disponible|desocupad)|disponibilidad|casting/.test(t)) {
      const w = typeof currentWeek !== "undefined" ? currentWeek : 0;
      const lib = people().filter(p => !isMe(p.name) && p.tipoMiembro !== "externo").filter(p => { try { return pxpCargaAuto(p, w) === "libre" && !(window.getAusencia && getAusencia(p, w)); } catch (e) { return false; } });
      if (!lib.length) return { text: "Esta semana no veo a nadie libre. Mira Capacidad para ver quién tiene cupo.", chips: [{ label: "Ver Capacidad", onClick: () => go("capacidad") }] };
      return { text: `${lib.length === 1 ? "Hay una persona libre" : `Hay ${lib.length} personas libres`} esta semana:`, chips: lib.slice(0, 6).map(p => ({ label: tit(p.name), sub: p.alias || p.role || "", onClick: () => openPer(p.name) })).concat(lib.length > 6 ? [{ label: `Ver los ${lib.length} en Capacidad`, ghost: true, onClick: () => go("capacidad") }] : []) };
    }
    /* mis pendientes */
    if (/(mis etapas|mis pendientes|pendientes|que vence|que tengo|mis entregas|que me toca|mi semana|que hay para hoy)/.test(t)) {
      const st = myStages();
      if (!st.length) return { text: "No tienes etapas activas. Agenda libre: buen momento para pedir trabajo." };
      const venc = st.filter(x => x.e.fecha && dias(x.e.fecha) < 0).length;
      return { text: `Tienes ${st.length} etapa${st.length > 1 ? "s" : ""} activa${st.length > 1 ? "s" : ""}${venc ? `, ${venc} vencida${venc > 1 ? "s" : ""}` : ""}:`, chips: st.slice(0, 5).map(x => stageChip(x)) };
    }
    /* navegar */
    if (/(ve a|ir a|vamos a|llevame a|abre|abrir|muestrame|mostrar|ensename)\b/.test(t)) {
      const v = VIEWS.find(([re]) => re.test(t));
      if (v && !(k && /proyecto/.test(t) === false && v[1] === "projects" && k)) { go(v[1]); return { text: `Listo, estás en ${v[2]}.` }; }
    }
    /* persona */
    if (ppl.length) {
      const p = ppl[0], w = typeof currentWeek !== "undefined" ? currentWeek : 0; let est = ""; try { est = { libre: "libre", cargado: "ocupada", saturado: "en sobrecarga" }[pxpCargaAuto(p, w)] || ""; } catch (e) { }
      const st = myStages(p.name);
      return { text: `${tit(p.name)} · ${p.alias || p.role || ""}. ${est ? `Esta semana está ${est}` : ""}${st.length ? `, con ${st.length} etapa${st.length > 1 ? "s" : ""} activa${st.length > 1 ? "s" : ""}.` : "."}`,
        chips: [{ label: "Abrir su ficha", onClick: () => openPer(p.name) }, { label: "Ver sus proyectos", onClick: () => { try { window.PXA_AGENT._close(); filterProjectsByPerson(p.name); } catch (e) { } } }] };
    }
    /* proyecto */
    if (k) {
      const pr = P()[k], et = (pr.etapas || []).filter(e => e.estado !== "listo").sort((a, b) => (a.fecha || "9").localeCompare(b.fecha || "9")), nx = et[0];
      let fin = ""; try { fin = window.pxpEntregaFinal ? pxpEntregaFinal(pr) : ""; } catch (e) { }
      return { text: `${pName(k)} (${tit(pr.cliente || "")}) está en ${ESTP[pr.estadoGeneral] || pr.estadoGeneral || "—"}.${nx ? ` Sigue «${nx.nombre}»${nx.fecha ? ", vence " + fD(nx.fecha) : ""}.` : ""}${fin ? ` Entrega final: ${fD(fin)}.` : ""}`,
        chips: [{ label: "Abrir proyecto", onClick: () => openP(k) }].concat(nx ? [stageChip({ k, i: (pr.etapas || []).indexOf(nx), e: nx })] : []) };
    }
    /* búsqueda libre */
    const q = t.replace(/^(busca|buscar|encuentra|donde esta|abre|abrir|muestrame|ver)\s+(el |la |los |un )?(proyecto |proyectos )?/, "");
    if (q && q !== t || /^(busca|encuentra|donde)/.test(t)) {
      const hits = activos().filter(kk => N(P()[kk].nombre || kk).includes(q) || N(P()[kk].cliente).includes(q) || N(P()[kk].marca).includes(q)).slice(0, 6);
      if (hits.length) return { text: hits.length === 1 ? "Lo encontré:" : `Encontré ${hits.length}:`, chips: hits.map(kk => ({ label: pName(kk), sub: tit(P()[kk].cliente || "") + " · " + (ESTP[P()[kk].estadoGeneral] || ""), onClick: () => openP(kk) })) };
      return { text: `No encuentro «${q}». Prueba con # para elegir de la lista.` };
    }
    if (AI.on && !noAI) return aiAsk(text);
    const tw = words(text);
    if (tw.length) { const hits = activos().filter(kk => words((P()[kk].nombre || "") + " " + (P()[kk].cliente || "")).some(w => tw.includes(w))).slice(0, 6);
      if (hits.length) return { text: hits.length === 1 ? "¿Hablas de este?" : "¿Cuál de estos?", chips: hits.map(kk => ({ label: pName(kk), sub: tit(P()[kk].cliente || "") + " · " + (ESTP[P()[kk].estadoGeneral] || ""), onClick: () => window.PXA_AGENT._ask("#" + pName(kk)) })) }; }
    return { text: "Esa no la tengo en el guion todavía. Mira lo que sí sé hacer:", chips: HELP.chips };
  }

  /* ---------- IA aprobada (se activa sola cuando /api/ai responde enabled) ----------
     El modelo no toca datos: elige una herramienta y esta se traduce a una frase que el intérprete de arriba ya entiende,
     así las confirmaciones, permisos y Deshacer son exactamente los mismos con o sin IA. */
  const TOOLS = [
    ["buscar_proyecto", "Busca un proyecto por nombre, cliente o marca y resume su estado.", { consulta: "texto a buscar" }, ["consulta"], a => `#${a.consulta}`],
    ["mis_pendientes", "Lista las etapas activas de la persona que pregunta.", {}, [], () => "mis pendientes"],
    ["quien_esta_libre", "Dice quién del equipo está libre esta semana.", {}, [], () => "quién está libre"],
    ["resumen_persona", "Resume rol, carga y etapas de una persona del equipo.", { persona: "nombre de la persona" }, ["persona"], a => `@${a.persona}`],
    ["abrir_vista", "Abre una vista del tablero.", { vista: "home | dashboard | trafico | proyectos | team | sala | clientes | capacidad | horas | mis horas | reportes | licencias | logros | repositorio" }, ["vista"], a => `ve a ${a.vista}`],
    ["registrar_horas", "Registra horas trabajadas en una etapa (pide confirmación).", { horas: "número de horas", proyecto: "nombre del proyecto (opcional)", etapa: "nombre de la etapa (opcional)", fecha: "AAAA-MM-DD (opcional, hoy por defecto)", nota: "nota (opcional)" }, ["horas"], a => `registra ${a.horas} horas${a.etapa ? ` en ${a.etapa}` : ""}${a.proyecto ? ` #${a.proyecto}` : ""} ${a.fecha || "hoy"}${a.nota ? ` nota: ${a.nota}` : ""}`],
    ["crear_tarea", "Crea una tarea (pide confirmación).", { texto: "qué hay que hacer", persona: "para quién (opcional)", proyecto: "proyecto (opcional)", fecha: "AAAA-MM-DD (opcional)" }, ["texto"], a => `crea una tarea ${a.texto}${a.persona ? ` para @${a.persona}` : ""}${a.proyecto ? ` #${a.proyecto}` : ""}${a.fecha ? ` ${a.fecha}` : ""}`],
    ["crear_etapa", "Agrega una etapa al cronograma de un proyecto (solo Administración; pide confirmación).", { proyecto: "proyecto", nombre: "nombre de la etapa", responsable: "persona (opcional)", fecha: "AAAA-MM-DD (opcional)" }, ["proyecto", "nombre"], a => `crea una etapa ${a.nombre} en #${a.proyecto}${a.fecha ? ` ${a.fecha}` : ""}${a.responsable ? ` para @${a.responsable}` : ""}`],
    ["cambiar_estado_etapa", "Cambia el estado de una etapa (pide confirmación).", { etapa: "nombre de la etapa", proyecto: "proyecto (opcional)", estado: "pendiente | en curso | revisión | lista" }, ["etapa", "estado"], a => `pasa ${a.etapa}${a.proyecto ? ` #${a.proyecto}` : ""} a ${a.estado}`],
    ["cambiar_estado_proyecto", "Pone un proyecto en standby, aprobado o cotizado (solo Administración; pide confirmación).", { proyecto: "proyecto", estado: "standby | aprobado | cotizado" }, ["proyecto", "estado"], a => `pon #${a.proyecto} en ${a.estado}`],
    ["nuevo_proyecto", "Abre la ficha de proyecto nuevo (solo Administración).", { nombre: "nombre", cliente: "cliente (opcional)" }, ["nombre"], a => `crea un proyecto ${a.nombre}${a.cliente ? ` para ${a.cliente}` : ""}`],
    ["reportes", "Abre la vista de reportes.", {}, [], () => "reportes"],
  ];
  const toolSchemas = () => TOOLS.map(([name, description, props, req]) => ({ type: "function", function: { name, description, parameters: { type: "object", properties: Object.fromEntries(Object.entries(props).map(([k, d]) => [k, { type: k === "horas" ? "number" : "string", description: d }])), required: req } } }));
  function runTool(name, args) { const t = TOOLS.find(x => x[0] === name); if (!t) return { text: "Esa acción no la tengo." }; let phrase = ""; try { phrase = t[4](args || {}); } catch (e) { } return phrase ? ask(phrase, true) : HELP; }
  const AI = { on: false, url: "/api/ai", hist: [] };
  function ctx() {
    const st = myStages().slice(0, 8).map(x => `${x.e.nombre} (${pName(x.k)}, ${EST[x.e.estado] || x.e.estado}${x.e.fecha ? ", vence " + x.e.fecha : ""})`);
    return `Hoy es ${hoy()}. Hablas con ${tit(me())}${admin() ? " (Administración)" : ""}. Proyectos activos: ${activos().slice(0, 60).map(pName).join(", ")}. Sus etapas: ${st.join("; ") || "ninguna"}.`;
  }
  async function aiAsk(text) {
    const sys = "Eres el asistente del tablero Tráfico Post de Publicis Production (postproducción). Responde en español, en una o dos frases cortas, con un toque de jerga de post. Para consultar o cambiar algo usa SIEMPRE una herramienta; nunca inventes datos, nombres ni fechas. Si falta un dato, pregúntalo. " + ctx();
    AI.hist.push({ role: "user", content: text }); AI.hist = AI.hist.slice(-8);
    try {
      const r = await fetch(AI.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [{ role: "system", content: sys }].concat(AI.hist), tools: toolSchemas() }) });
      const j = await r.json(); if (!r.ok || !j.message) throw new Error(j && j.error || "IA");
      const m = j.message, call = (m.tool_calls || [])[0];
      if (call && call.function) { let args = {}; try { args = JSON.parse(call.function.arguments || "{}"); } catch (e) { } AI.hist.push({ role: "assistant", content: `(usé ${call.function.name})` }); return runTool(call.function.name, args); }
      AI.hist.push({ role: "assistant", content: m.content || "" });
      return { text: m.content || "Listo." };
    } catch (e) { return { text: "La IA no me respondió. Mientras tanto, esto sí lo sé hacer:", chips: HELP.chips }; }
  }
  try { if (/^https?:/.test(location.protocol)) fetch(AI.url, { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => { AI.on = !!(j && j.enabled); }).catch(() => { }); } catch (e) { }

  window.PXA_AGENT = { ask, mentions, tools: () => toolSchemas(), runTool, ai: () => AI.on, _show: () => { }, _say: () => { }, _ask: () => { }, _close: () => { } };
})();
