// Prueba v212: Sala de juntas (entrar, caminar, sentarse, burbujas, proyectar, cámara/mic/pantalla locales, demo, proveedor),
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
check("Sala: entro por la puerta con mi avatar", await page.evaluate(() => PXP_SALA.state().people.some(p => p.name === "Bastián Torres")));
check("Sala: 10 puestos alrededor de la mesa", await page.evaluate(() => PXP_SALA.seats === 10));
await page.waitForTimeout(8000);
const demo = await page.evaluate(() => PXP_SALA.state().people.filter(p => p.demo));
check(`Sala: compañeros de demostración entran y se sientan (${demo.length})`, demo.length >= 3 && demo.some(p => p.seat >= 0));
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
await page.click("#sl-projb"); await page.waitForTimeout(200); await page.fill(".sl-pick input", "dra"); await page.waitForTimeout(200); await page.click(".sl-pick li button"); await page.waitForTimeout(400);
check("Sala: proyectar un proyecto lo muestra en el TV", await page.evaluate(() => document.getElementById("sl-tv").dataset.mode === "proj" && /DRACULA/i.test(document.getElementById("sl-tv").textContent)));
await page.click("#sl-tv"); await page.waitForTimeout(300);
check("Sala: clic en el TV lo abre en grande", await page.evaluate(() => !!document.querySelector(".sl-big .sl-pc")));
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
check("Sala: TV en formato 16:9", await page.evaluate(() => { const r = document.getElementById("sl-tv").getBoundingClientRect(); return Math.abs(r.width / r.height - 16 / 9) < .03; }));
await page.hover(".sl-mn[data-i='0']"); await page.waitForTimeout(250);
check("Sala: las notas del mapa muestran cliente, proyectos y equipo al pasar", await page.evaluate(() => { const b = document.querySelector(".sl-mn[data-i='0']"); return !!b && /proyecto/.test(b.dataset.tip) && getComputedStyle(b, "::after").opacity === "1"; }));
await page.click(".sl-mn[data-i='0']"); await page.waitForTimeout(300);
check("Sala: clic en el mapa abre clientes con sus proyectos y su equipo", await page.evaluate(() => document.querySelectorAll(".sl-mp .sl-mp-c").length > 2 && !!document.querySelector(".sl-mp .sl-mp-c.on [data-k]") && !!document.querySelector(".sl-mp .sl-mp-p")));
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
await page.click("#sl-demo"); await page.waitForTimeout(300);
check("Sala: apagar la demostración saca a los simulados", await page.evaluate(() => !PXP_SALA.state().people.some(p => p.demo)));
// asistente → sala
check("Asistente: «ve a la sala» navega", await page.evaluate(() => { switchView("home"); const r = PXA_AGENT.ask("ve a la sala"); return /Sala/.test(r.text) && document.getElementById("view-sala").classList.contains("active"); }));
check("Asistente: catálogo de 12 herramientas listo para la IA", await page.evaluate(() => PXA_AGENT.tools().length === 12 && PXA_AGENT.tools().every(t => t.type === "function" && t.function.parameters)));
check("Asistente: sin IA configurada en la vista previa", await page.evaluate(() => PXA_AGENT.ai() === false));
// celular
const m = await abrir(390, 844);
await m.evaluate(() => switchView("sala")); await m.waitForTimeout(1500);
check("Celular: la sala cabe sin desbordar", await m.evaluate(() => { const s = document.getElementById("sl-stage").getBoundingClientRect(); return s.width > 300 && s.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
