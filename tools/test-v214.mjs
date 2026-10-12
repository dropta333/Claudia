// Prueba v212–v214: Sala de juntas (entrar, caminar, sentarse, burbujas, proyectar, cámara/mic/pantalla locales, demo, proveedor),
// perfil con foto más grande y acciones debajo, asistente que lleva a la Sala y catálogo de herramientas para la IA.
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--auto-select-desktop-capture-source=Entire screen", "--autoplay-policy=no-user-gesture-required"] });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n); const errs = [];
async function abrir(w, h, quien) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); await ctx.grantPermissions(["camera", "microphone"]).catch(() => { });
  const page = await ctx.newPage(); page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
  await page.evaluate(n => { window.pxpSaveBase = function () { }; window.saveState = async function () { }; try { localStorage.setItem("pxp_lg_off", "1"); localStorage.setItem("pxp_sala_demo", "1"); } catch (e) { } enterApp({ name: n }, "preview"); }, quien || "Bastián Torres");
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
check("Sala: entro por la puerta con mi avatar", await page.evaluate(() => PXP_SALA.state().people.some(p => p.name === "Bastián Torres")));
check("Sala: 16 puestos (12 en la mesa, 2 por cabecera, y 4 en los sofás)", await page.evaluate(() => PXP_SALA.seats === 16));
await page.waitForTimeout(8000);
const demo = await page.evaluate(() => PXP_SALA.state().people.filter(p => p.demo));
check(`Sala: compañeros de demostración entran y se sientan (${demo.length})`, demo.length >= 3 && demo.some(p => p.seat >= 0));
await page.click("#sl-demo"); await page.waitForTimeout(300);
check("Sala: apagar la demostración saca a los simulados", await page.evaluate(() => !PXP_SALA.state().people.some(p => p.demo)));
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
check("Proyectar: selector con pestañas Proyectos, Clientes, Personas y Gráficas", await page.evaluate(() => document.querySelectorAll(".sl-pj-tabs [data-t]").length === 4 && document.querySelectorAll(".sl-pj-g .sl-tl").length > 5));
await page.fill(".sl-pj-q", "dra"); await page.waitForTimeout(200); await page.click(".sl-pj-g .sl-tl"); await page.waitForTimeout(600);
check("Proyectar: vista previa 16:9 con la ventana real del proyecto", await page.evaluate(() => { const p = document.querySelector(".sl-pj-prev"), r = p.getBoundingClientRect(); return !!p.querySelector(".sl-frame .pm-box .pj-head") && Math.abs(r.width / r.height - 16 / 9) < .04; }));
await page.click(".sl-pj-tabs [data-t=per]"); await page.waitForTimeout(200); await page.click(".sl-pj-g .sl-tl"); await page.waitForTimeout(600);
check("Proyectar: también la ventana de una persona", await page.evaluate(() => !!document.querySelector(".sl-pj-prev .sl-frame .pm-box .pm-head")));
await page.click(".sl-pj-tabs [data-t=chart]"); await page.waitForTimeout(200); await page.click(".sl-pj-g .sl-tl"); await page.waitForTimeout(600);
check("Proyectar: y la gráfica de disponibilidad del equipo", await page.evaluate(() => !!document.querySelector(".sl-pj-prev .sl-frame .lb-panel")));
await page.click(".sl-pj-tabs [data-t=cli]"); await page.waitForTimeout(200); await page.click(".sl-pj-g .sl-tl"); await page.waitForTimeout(600);
check("Proyectar: y la ventana de un cliente", await page.evaluate(() => !!document.querySelector(".sl-pj-prev .sl-frame .pm-box")));
await page.click(".sl-pj-tabs [data-t=proj]"); await page.waitForTimeout(200); await page.fill(".sl-pj-q", "dra"); await page.waitForTimeout(200); await page.keyboard.press("Enter"); await page.waitForTimeout(700);
check("Proyectar: Enter proyecta y el TV muestra la ventana llenando el 16:9", await page.evaluate(() => { const tv = document.getElementById("sl-tv"), f = tv.querySelector(".sl-frame"); if (!f || !/DRACULA/i.test(f.textContent)) return false; const a = tv.getBoundingClientRect(), b = f.getBoundingClientRect(); return Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2; }));
check("Proyectar: ninguna ventana quedó abierta por detrás", await page.evaluate(() => !document.querySelector(".pxp-modal.open") && !document.documentElement.classList.contains("sl-cap")));
await page.click("#sl-tv"); await page.waitForTimeout(400);
check("Sala: clic en el TV abre la ventana en grande", await page.evaluate(() => !!document.querySelector(".sl-big .sl-frame .pm-box")));
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
check("Sala: TV en formato 16:9", await page.evaluate(() => { const r = document.getElementById("sl-tv").getBoundingClientRect(); return Math.abs(r.width / r.height - 16 / 9) < .03; }));
await page.hover(".sl-mn[data-i='0']"); await page.waitForTimeout(250);
check("Sala: las notas del mapa muestran cliente, proyectos y equipo al pasar", await page.evaluate(() => { const b = document.querySelector(".sl-mn[data-i='0']"); return !!b && /proyecto/.test(b.dataset.slTip) && getComputedStyle(b, "::after").opacity === "1"; }));
await page.click(".sl-mn[data-i='0']"); await page.waitForTimeout(300);
check("Sala: clic en el mapa abre las mismas fichas de Clientes (con el cliente elegido resaltado)", await page.evaluate(() => document.querySelectorAll(".sl-mp .sl-cv details.cnode").length > 2 && !!document.querySelector(".sl-mp .cnode.sl-focus .pchip") && getComputedStyle(document.querySelector(".sl-mp .cn-h")).display !== "list-item"));
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
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
// otra persona: sin compañeros de demostración ni la casilla
const j = await abrir(1440, 950, "JULIANA CANAL"); await j.evaluate(() => switchView("sala")); await j.waitForTimeout(6000);
check("Otra persona: no ve la casilla de demostración ni compañeros simulados", await j.evaluate(() => document.querySelector(".sl-demo").hidden && !PXP_SALA.state().people.some(p => p.demo)));
// celular
const m = await abrir(390, 844);
await m.evaluate(() => switchView("sala")); await m.waitForTimeout(1500);
check("Sala: la conversación ocupa el alto de la sala", await page.evaluate(() => { switchView("sala"); return document.getElementById("sl-log").getBoundingClientRect().height > 250; }));
check("Celular: la sala cabe sin desbordar", await m.evaluate(() => { const s = document.getElementById("sl-stage").getBoundingClientRect(); return s.width > 300 && s.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
