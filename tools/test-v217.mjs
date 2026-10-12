// Prueba v212–v216: Sala de juntas (entrar, caminar, sentarse, burbujas, proyectar, cámara/mic/pantalla locales, proveedor),
// perfil con foto más grande y acciones debajo, asistente que lleva a la Sala y catálogo de herramientas para la IA.
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--auto-select-desktop-capture-source=Entire screen", "--autoplay-policy=no-user-gesture-required"] });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n); const errs = [];
async function abrir(w, h, quien) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); await ctx.grantPermissions(["camera", "microphone"]).catch(() => { });
  const page = await ctx.newPage(); page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
  await page.evaluate(n => { window.pxpSaveBase = function () { }; window.saveState = async function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: n }, "preview"); }, quien || "Bastián Torres");
  await page.waitForTimeout(3600); await page.evaluate(() => { const c = () => { for (let i = 0; i < 8; i++) try { pxpLogroCerrar(); } catch (e) { } }; c(); setInterval(c, 300); }); return page;
}
const page = await abrir(1440, 950);
// perfil
await page.evaluate(() => pxpOpenPerson("CARLOS QUINTERO")); await page.waitForTimeout(900);
const ph = await page.evaluate(() => { const av = document.querySelector("#pxp-person .ph-avw .av"), a = document.querySelector("#pxp-person .ph-acts"); if (!av || !a) return null; const r = av.getBoundingClientRect(), q = a.getBoundingClientRect(); return { s: r.width, below: q.top >= r.bottom - 1 }; });
check(`Perfil: foto más grande (${ph && Math.round(ph.s)} px)`, ph && ph.s >= 110);
check("Perfil: cambiar/quitar foto debajo, sin tapar la foto", ph && ph.below);
await page.evaluate(() => { try { pxpClosePerson(); } catch (e) { } document.querySelectorAll(".pxp-modal.open .ficha-close").forEach(b => b.click()); }); await page.waitForTimeout(300);
// sala
check("Sala: pestaña en el menú", await page.evaluate(() => !!document.querySelector('#tab-nav [data-view="sala"]')));
await page.evaluate(() => switchView("sala")); await page.waitForTimeout(1500);
check("Sala v217: al abrir la pestaña pregunta antes de entrar (y no apareces)", await page.evaluate(() => !!document.querySelector("#sl-lobby .sl-lb-si") && !PXP_SALA.inside() && PXP_SALA.state().people.length === 0 && document.getElementById("sl-mic").disabled));
await page.click("#sl-lobby .sl-lb-si"); await page.waitForTimeout(800);
check("Sala: entro por la puerta con mi avatar", await page.evaluate(() => PXP_SALA.state().people.some(p => p.name === "Bastián Torres")));
check("Sala: 16 puestos (12 en la mesa, 2 por cabecera, y 4 en los sofás)", await page.evaluate(() => PXP_SALA.seats === 16));
await page.waitForTimeout(2000);
check("Sala: sin compañeros de demostración (ni la casilla): solo personas reales", await page.evaluate(() => !document.querySelector(".sl-demo, #sl-demo") && PXP_SALA.state().people.length === 1));
check("Sala: la hora es automática (el chip solo informa)", await page.evaluate(() => document.getElementById("sl-hora").tagName === "SPAN"));
await page.evaluate(() => document.getElementById("sl-stage").scrollIntoView({ block: "center" })); await page.waitForTimeout(200);
const r = await page.evaluate(() => document.getElementById("sl-stage").getBoundingClientRect().toJSON());
const libre = await page.evaluate(() => { const used = new Set(PXP_SALA.state().people.map(p => p.seat)); return [0, 1, 2, 3].find(i => !used.has(i)); });
const sx = [100, 140, 180, 220][libre];
await page.mouse.click(r.x + r.width * sx / 320, r.y + r.height * 86 / 200); await page.waitForTimeout(9000);
check("Sala: clic en una silla → camino y me siento", await page.evaluate(i => PXP_SALA.state().people.find(p => p.name === "Bastián Torres").seat === i, libre));
await page.mouse.click(r.x + r.width * 220 / 320, r.y + r.height * 184 / 200); await page.waitForTimeout(9000);
const yo = await page.evaluate(() => PXP_SALA.state().people.find(p => p.name === "Bastián Torres"));
check("Sala: clic en el piso → me levanto y camino rodeando la mesa", yo.seat === -1 && Math.abs(yo.x - 220) < 3 && Math.abs(yo.y - 184) < 3);
await page.focus("#sl-stage"); await page.keyboard.down("ArrowLeft"); await page.waitForTimeout(600); await page.keyboard.up("ArrowLeft");
check("Sala: flechas del teclado mueven mi avatar", await page.evaluate(x => PXP_SALA.state().people.find(p => p.name === "Bastián Torres").x < x - 10, yo.x));
await page.fill("#sl-in", "Arrancamos la revisión"); await page.keyboard.press("Enter"); await page.waitForTimeout(300);
check("Sala: el mensaje sale como burbuja sobre mi avatar", await page.evaluate(() => [...document.querySelectorAll(".sl-bub")].some(b => /Arrancamos la revisión/.test(b.textContent))));
check("Sala: queda en la conversación", await page.evaluate(() => /Arrancamos la revisión/.test(document.getElementById("sl-log").textContent)));
await page.click("#sl-projb"); await page.waitForTimeout(300);
check("Proyectar: selector con pestañas Proyectos, Clientes, Personas, Gráficas y Vistas", await page.evaluate(() => document.querySelectorAll(".sl-pj-tabs [data-t]").length === 5 && document.querySelectorAll(".sl-pj-g .sl-tl").length > 5));
await page.fill(".sl-pj-q", "dra"); await page.waitForTimeout(200); await page.click(".sl-pj-g .sl-tl"); await page.waitForTimeout(600);
check("Proyectar: vista previa 16:9 con la ventana real del proyecto", await page.evaluate(() => { const p = document.querySelector(".sl-pj-prev"), r = p.getBoundingClientRect(); return !!p.querySelector(".sl-frame .pm-box .pj-head") && Math.abs(r.width / r.height - 16 / 9) < .04; }));
await page.click(".sl-pj-tabs [data-t=per]"); await page.waitForTimeout(200); await page.click(".sl-pj-g .sl-tl"); await page.waitForTimeout(600);
check("Proyectar: también la ventana de una persona", await page.evaluate(() => !!document.querySelector(".sl-pj-prev .sl-frame .pm-box .pm-head")));
await page.click(".sl-pj-tabs [data-t=chart]"); await page.waitForTimeout(200); await page.click(".sl-pj-g .sl-tl"); await page.waitForTimeout(600);
check("Proyectar: y la gráfica de disponibilidad del equipo", await page.evaluate(() => !!document.querySelector(".sl-pj-prev .sl-frame .lb-panel")));
await page.click(".sl-pj-tabs [data-t=cli]"); await page.waitForTimeout(200); await page.click(".sl-pj-g .sl-tl"); await page.waitForTimeout(600);
check("Proyectar: y la ventana de un cliente", await page.evaluate(() => !!document.querySelector(".sl-pj-prev .sl-frame .pm-box")));
await page.click(".sl-pj-tabs [data-t=view]"); await page.waitForTimeout(200);
check("Proyectar: pestaña Vistas con las pestañas de la plataforma", await page.evaluate(() => document.querySelectorAll(".sl-pj-g .sl-tl.vw").length >= 8));
await page.click('.sl-tl[data-r="view:traffic"]'); await page.waitForTimeout(900);
check("Proyectar: una vista completa (Tráfico) se ve en la vista previa sin salir de la Sala", await page.evaluate(() => document.querySelector(".view.active").id === "view-sala" && document.querySelector(".sl-pj-prev .sl-frame").textContent.length > 2000));
await page.hover(".sl-pj-prev"); await page.mouse.wheel(0, 600); await page.waitForTimeout(400);
const yPrev = await page.evaluate(() => Math.round(document.querySelector(".sl-pj-prev .sl-frame").scrollTop));
check(`Proyectar: la vista previa se desplaza (${yPrev}px)`, yPrev > 100);
await page.click(".sl-pj-go"); await page.waitForTimeout(900);
check("Proyectar: el TV queda en el mismo punto del desplazamiento", await page.evaluate(y => { const f = document.querySelector("#sl-tv .sl-frame"); return /#y=\d+/.test(PXP_SALA.state().proj) && f && Math.abs(f.scrollTop - y) < 30; }, yPrev));
await page.click("#sl-projb"); await page.waitForTimeout(300);
await page.click(".sl-pj-tabs [data-t=proj]"); await page.waitForTimeout(200); await page.fill(".sl-pj-q", "dra"); await page.waitForTimeout(200); await page.keyboard.press("Enter"); await page.waitForTimeout(700);
check("Proyectar: Enter proyecta y el TV muestra la ventana llenando el 16:9", await page.evaluate(() => { const tv = document.getElementById("sl-tv"), f = tv.querySelector(".sl-frame"); if (!f || !/DRACULA/i.test(f.textContent)) return false; const a = tv.getBoundingClientRect(), b = f.getBoundingClientRect(); return Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2; }));
check("Proyectar: ninguna ventana quedó abierta por detrás", await page.evaluate(() => !document.querySelector(".pxp-modal.open") && !document.documentElement.classList.contains("sl-cap")));
await page.click("#sl-tv"); await page.waitForTimeout(400);
check("Sala: clic en el TV abre la ventana en grande", await page.evaluate(() => !!document.querySelector(".sl-big .sl-frame .pm-box")));
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
check("Sala: TV en formato 16:9", await page.evaluate(() => { const r = document.getElementById("sl-tv").getBoundingClientRect(); return Math.abs(r.width / r.height - 16 / 9) < .03; }));
check("Tablero: notas para ir a Proyectos, Clientes, Team, Licencias y más (solo las pestañas visibles)", await page.evaluate(() => { const v = [...document.querySelectorAll(".sl-mn")].map(b => b.dataset.v); return v.length >= 6 && ["projects", "clientes", "team", "licencias"].every(x => v.includes(x)) && v.every(x => document.querySelector(`#tab-nav [data-view="${x}"]`)); }));
await page.hover(".sl-mn[data-v='projects']"); await page.waitForTimeout(250);
check("Tablero: al pasar, la nota dice a dónde lleva y cuántos hay", await page.evaluate(() => { const b = document.querySelector(".sl-mn[data-v='projects']"); return !!b && /proyectos activos/.test(b.dataset.slTip) && /\d/.test(b.textContent) && getComputedStyle(b, "::after").opacity === "1"; }));
await page.click(".sl-mn[data-v='clientes']"); await page.waitForTimeout(300);
check("Tablero: la nota Clientes abre el mapa con las fichas de Clientes", await page.evaluate(() => document.querySelectorAll(".sl-mp .sl-cv details.cnode").length > 2 && !!document.querySelector(".sl-mp .cnode .pchip") && getComputedStyle(document.querySelector(".sl-mp .cn-h")).display !== "list-item"));
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
await page.click(".sl-mn[data-v='team']"); await page.waitForTimeout(1200);
check("Tablero v217: la nota Team abre una vista previa en ventana, sin sacarte de la sala", await page.evaluate(() => !!document.querySelector(".sl-np .sl-np-prev .sl-frame") && document.querySelector(".sl-np .sl-frame").textContent.length > 500 && document.querySelector(".view.active").id === "view-sala" && PXP_SALA.inside()));
check("Tablero v217: la vista previa trae Proyectar en el TV y Abrir la pestaña", await page.evaluate(() => !!document.querySelector(".sl-np .sl-np-pj") && !!document.querySelector(".sl-np .sl-mp-go")));
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
await page.click("#sl-vw"); await page.waitForTimeout(600);
check("Vista ampliada v217: la sala ocupa la pantalla y la escena crece", await page.evaluate(() => { const w = document.querySelector(".sl-wrap.sl-full"), s = document.getElementById("sl-stage").getBoundingClientRect(); return !!w && s.width > innerWidth * .6 && Math.abs(s.width / s.height - 1.6) < .03; }));
await page.keyboard.press("Escape"); await page.waitForTimeout(400);
check("Vista ampliada v217: Escape vuelve a la vista normal", await page.evaluate(() => !document.querySelector(".sl-full") && document.getElementById("view-sala").contains(document.getElementById("sl-stage"))));
await page.click("#sl-mic"); await page.waitForTimeout(800);
check("Sala: micrófono local (indicador encendido)", await page.evaluate(() => PXP_SALA.state().people.find(p => p.name === "Bastián Torres").mic && document.getElementById("sl-mic").classList.contains("on")));
await page.click("#sl-camb"); await page.waitForTimeout(1200);
check("Sala: la cámara reemplaza la cara del avatar", await page.evaluate(() => { const v = document.querySelector(".sl-e.me.cam .sl-cam video"); return !!v && v.srcObject && v.srcObject.getVideoTracks().length > 0; }));
await page.click("#sl-camb"); await page.click("#sl-mic"); await page.waitForTimeout(300);
check("Sala: apagar cámara y micrófono libera los dispositivos", await page.evaluate(() => !document.querySelector(".sl-e.me .sl-cam video") && !document.getElementById("sl-mic").classList.contains("on")));
// proveedor: los mensajes salen por el adaptador cuando exista
const prov = await page.evaluate(async () => { const out = []; await PXP_SALA.setProvider({ connect: async () => true, send: m => out.push(m.t) }); PXP_SALA.say("hola proveedor"); return out; });
check("Sala: con proveedor conectado, el chat viaja por el adaptador", prov.includes("say"));
// asistente → sala
check("Asistente: «ve a la sala» navega", await page.evaluate(() => { switchView("home"); const r = PXA_AGENT.ask("ve a la sala"); return /Sala/.test(r.text) && document.getElementById("view-sala").classList.contains("active"); }));
check("Asistente: catálogo de 12 herramientas listo para la IA", await page.evaluate(() => PXA_AGENT.tools().length === 12 && PXA_AGENT.tools().every(t => t.type === "function" && t.function.parameters)));
check("Asistente: sin IA configurada en la vista previa", await page.evaluate(() => PXA_AGENT.ai() === false));
// celular
const m = await abrir(390, 844);
await m.evaluate(() => switchView("sala")); await m.waitForTimeout(1500);
check("Sala: la conversación ocupa el alto de la sala", await page.evaluate(() => { switchView("sala"); return document.getElementById("sl-log").getBoundingClientRect().height > 250; }));
check("Celular: la sala cabe sin desbordar", await m.evaluate(() => { const s = document.getElementById("sl-stage").getBoundingClientRect(); return s.width > 300 && s.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }));
for (const w of [1181, 1200, 1280, 1366]) { const h = await abrir(w, 900, "CARLOS QUINTERO"); await h.evaluate(() => { try { pxpHomeModo("personal"); } catch (e) { } switchView("home"); }); await h.waitForTimeout(1200);
  check(`Home ${w}px: las cifras de la tarjeta caben sin apretarse`, await h.evaluate(() => { const m = document.getElementById("mi-resumen"), st = [...m.querySelectorAll(".mr-stats > div")], r = m.getBoundingClientRect(); return st.length === 4 && st.every(d => d.getBoundingClientRect().width >= 150 && d.getBoundingClientRect().right <= r.right + 1); })); await h.context().close(); }
for (const n of ["Juliana Canal", "Andres Brinez"]) { await m.evaluate(n => { document.querySelectorAll(".pxp-modal.open").forEach(x => x.classList.remove("open")); pxpOpenPerson(n); }, n); await m.waitForTimeout(1200);
  check(`Celular v217: la ventana de ${n} no se sale de la pantalla (red de proyectos vertical)`, await m.evaluate(() => { const b = document.querySelector("#pxp-person .pm-box"), s = b.querySelector(".pxn-sec svg"); return b.scrollWidth <= b.clientWidth + 1 && (!s || s.classList.contains("port")) && [...b.querySelectorAll(".pm-proj")].every(p => p.getBoundingClientRect().right <= b.getBoundingClientRect().right + 1); })); }
{ const g = await abrir(1800, 1000); await g.evaluate(() => { switchView("home"); const s = document.querySelector(".hm-more"); if (s && !s.classList.contains("open")) s.querySelector(".hm-more-b").click(); }); await g.waitForTimeout(800);
  check("Home global v217: «Más gráficas» usa las tres columnas (ninguna queda vacía)", await g.evaluate(() => { const c = [...document.querySelectorAll(".hm-more .ht-col")]; return c.length === 3 && c.every(x => x.children.length > 0); })); }
// v217 · asistente por rol, grupos plegables y frases
check("Asistente v217: Administración ve ayudas para planear, asignar, seguir y cerrar", await page.evaluate(() => PXA_AGENT.help().chips.map(c => c.label).join("|") === "Planear la semana|Asignar y crear|Seguimiento|Reportes y cierre"));
check("Asistente v217: resumen del equipo, vencidas, sobrecarga, entregas y standby responden con datos", await page.evaluate(() => ["resumen del equipo", "etapas vencidas", "quién está sobrecargado", "entregas de esta semana", "proyectos en standby"].every(q => { const r = PXA_AGENT.ask(q); return r && r.text && !/guion/.test(r.text); })));
{ const cr = await abrir(1440, 900, "Jostyn Ruiz");
  check("Asistente v217: el equipo creativo ve ayudas de su día (Mi día, Registrar, Organizarme, Buscar)", await cr.evaluate(() => !pxpPuedeEditar() && PXA_AGENT.help().chips.map(c => c.label).join("|") === "Mi día|Registrar|Organizarme|Buscar y pedir"));
  check("Asistente v217: mi semana, mis horas y mis tareas responden", await cr.evaluate(() => ["mi semana", "cuántas horas llevo", "mis tareas"].every(q => { const r = PXA_AGENT.ask(q); return r && r.text && !/guion/.test(r.text); }))); }
check("Tráfico v218: la sección de Audio ya no dice «cabezas» y, por cargo, Audio entra al mismo mosaico", await page.evaluate(() => { switchView("traffic"); pxpTrfSort("cargo"); const ok = !/cabezas/i.test(document.getElementById("main-grid").textContent) && [...document.querySelectorAll("#main-grid > .trf-grp .gh-n")].some(x => x.textContent === "Audio") && [...document.querySelectorAll("#main-grid > .section-label")].filter(x => getComputedStyle(x).display !== "none").length === 1; pxpTrfSort("original"); return ok; }));
check("Tráfico v218: en tabla, cada grupo trae su barra con avatares", await page.evaluate(() => { switchView("traffic"); pxpTrfSort("cargo"); pxpVistaTrf("tabla"); const n = document.querySelectorAll("#trf-table tr.pv-g .gh-av").length; pxpVistaTrf("fichas"); pxpTrfSort("original"); return n > 5; }));
check("Sala v218: rincón del café con cafetera y jarra que se pueden tocar", await page.evaluate(() => !!document.getElementById("sl-cafe") && !!document.getElementById("sl-agua")));
check("Sala v218: al pedir un café, el avatar camina al rincón y queda con la taza en la mano", await page.evaluate(async () => { switchView("sala"); if (!PXP_SALA.inside()) PXP_SALA.join(); PXP_SALA.servir("cafe"); for (let i = 0; i < 30 && PXP_SALA.taza() !== "cafe"; i++) await new Promise(r => setTimeout(r, 500)); const ok = PXP_SALA.taza() === "cafe"; if (!ok) console.error("DBG", JSON.stringify(PXP_SALA.state().people), document.querySelector(".view.active").id); PXP_SALA.servir("cafe"); return ok && PXP_SALA.taza() === ""; }));
check("Frases v217: sin la frase de las horas que «no se registran solas»", await page.evaluate(() => !/no se registran solas/.test(document.getElementById("pxa-integ").textContent)));
await page.evaluate(() => switchView("dashboard")); await page.waitForTimeout(700);
check("Dashboard v218: la caja «Carga por persona» completa se pliega (los grupos se ven como antes) y se recuerda", await page.evaluate(() => { const box = document.querySelector("#dash-wrap .pl-box"); if (!box || document.querySelector("#dash-wrap .lg .pl-ch")) return false; box.querySelector(".hp-title .pl-ch").click(); const cerrada = getComputedStyle(box.querySelector(".load-groups")).display === "none"; renderDashboard(); const sigue = document.querySelector("#dash-wrap .pl-box").classList.contains("pl-closed"); document.querySelector("#dash-wrap .pl-box > .hp-title").click(); return cerrada && sigue && !document.querySelector("#dash-wrap .pl-box.pl-closed"); }));
await page.evaluate(() => { switchView("traffic"); pxpTrfSort("cargo"); }); await page.waitForTimeout(700);
check("Tráfico v217: agrupado por cargo, cada grupo se pliega y se recuerda al repintar", await page.evaluate(() => { const g = document.querySelector("#main-grid > .trf-grp"); g.querySelector(".pl-ch").click(); render(currentWeek); const g2 = document.querySelector("#main-grid > .trf-grp.pl-closed"); const ok = !!g2 && getComputedStyle(g2.nextElementSibling).display === "none"; document.querySelector('#trf-sort .pl-fold [data-pl="open"]').click(); pxpTrfSort("original"); return ok; }));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
