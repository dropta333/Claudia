// Prueba v211: avatar pixel personal (Home, editor, Team) y asistente sin modelo (agente por reglas, @ y #, confirmación y deshacer)
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const errs = [];
async function abrir(w, h) {
  const page = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
  await page.evaluate(() => { window.pxpSaveBase = function () { }; window.saveState = async function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
  await page.waitForTimeout(3600); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("personal"); switchView("home"); }); await page.waitForTimeout(1200);
  return page;
}
const page = await abrir(1440, 950);
check("Home: sin avatar invita a crearlo", await page.evaluate(() => !!document.querySelector("#mi-resumen.has-pxa .mr-pxa .mr-pxa-new")));
check("Home: una sola píldora de estado (auto/manual)", await page.evaluate(() => document.querySelectorAll("#mi-resumen [data-pxa]").length === 1));
// editor: abrir, cambiar peinado, guardar
await page.evaluate(() => document.querySelector(".mr-pxa-new").click()); await page.waitForTimeout(500);
check("Editor: abre con 4 pestañas", await page.evaluate(() => document.querySelectorAll(".pxa-ov [role=tab], .pxa-ov .pxa-tabs button").length >= 4));
await page.evaluate(() => { const r = document.querySelector(".pxa-ov"); const btn = [...r.querySelectorAll("button")].find(x => /Guardar avatar/.test(x.textContent)); btn && btn.click(); }); await page.waitForTimeout(600);
check("Editor: guarda el avatar en la ficha de la persona", await page.evaluate(() => { const f = pxpFindPerson("Bastián Torres"); return !!(f && f.p.avatar && f.p.avatar.v === 1); }));
check("Editor: confirma «Guardado» y cierra con Esc sin preguntar", await page.evaluate(() => /Guardado/.test(document.querySelector(".pxa-save").textContent)));
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
check("Editor: cerrado tras guardar (sin aviso de cambios)", await page.evaluate(() => !document.querySelector(".pxa-ov") && !document.querySelector(".pxa-confirm")));
await page.waitForTimeout(600);
check("Home: con avatar aparece el personaje y el lápiz", await page.evaluate(() => !!document.querySelector(".mr-pxa .mr-pxa-av canvas") && !!document.querySelector(".mr-pxa-ed")));
// asistente
await page.evaluate(() => document.querySelector(".mr-pxa-av").click()); await page.waitForTimeout(500);
check("Asistente: burbuja con caja de texto, micrófono y enviar", await page.evaluate(() => !!document.querySelector(".pxa-bub .pxa-bf input") && !!document.querySelector(".pxa-bub .pxa-mic") && !!document.querySelector(".pxa-bub .pxa-send")));
await page.type(".pxa-bf input", "crea una tarea revisar color para @jos", { delay: 10 }); await page.waitForTimeout(250);
check("Asistente: @ sugiere personas", await page.evaluate(() => { const a = document.querySelector(".pxa-ac"); return a && !a.hidden && a.querySelectorAll("[role=option]").length > 0; }));
await page.keyboard.press("Enter"); await page.waitForTimeout(100); await page.click(".pxa-send"); await page.waitForTimeout(500);
check("Asistente: pide confirmación antes de crear", await page.evaluate(() => { const c = document.querySelector(".pxa-card"); return c && !c.hidden && /Nueva tarea/.test(c.textContent); }));
const antes = await page.evaluate(() => { const f = pxpFindPerson("Jostyn Ruiz"); return f ? (f.p.tareas || []).length : -1; });
await page.click(".pxa-yes"); await page.waitForTimeout(400);
check("Asistente: crea la tarea", await page.evaluate(n => (pxpFindPerson("Jostyn Ruiz").p.tareas || []).length === n + 1, antes));
await page.click('.pxa-chip.ghost:has-text("Deshacer")'); await page.waitForTimeout(300);
check("Asistente: Deshacer la quita", await page.evaluate(n => (pxpFindPerson("Jostyn Ruiz").p.tareas || []).length === n, antes));
const adm = await page.evaluate(() => !!(window.pxpPuedeEditar && pxpPuedeEditar()));
const R = q => page.evaluate(q => { const r = PXA_AGENT.ask(q); return { t: r.text || "", c: (r.chips || []).length, k: !!r.confirm }; }, q);
check("Agente: mis pendientes", /etapa|No tienes/.test((await R("mis pendientes")).t));
check("Agente: quién está libre", /libre/.test((await R("quién está libre esta semana")).t));
check("Agente: búsqueda de proyecto", (await R("busca dracula")).c >= 1);
const st = await R("pon #DORIA en standby"), et = await R("crea una etapa Color final en #DORIA el viernes para @Jostyn Ruiz");
check("Agente: estado de proyecto · confirma si es admin, si no lo explica", adm ? st.k : (!st.k && /Administraci/.test(st.t)));
check("Agente: crear etapa · confirma si es admin, si no lo explica", adm ? et.k : (!et.k && /Administraci/.test(et.t)));
check("Agente: pedido desconocido ofrece ayuda", (await R("qué onda con el clima")).c >= 3);
await page.keyboard.press("Escape"); await page.evaluate(() => switchView("team")); await page.waitForTimeout(1200);
check("Team: avatares animados en las fichas", await page.evaluate(() => document.querySelectorAll("#view-team .team-pxa canvas, #view-team .team-pxa").length > 0));
const m = await abrir(390, 844);
check("Celular: avatar en la tarjeta sin desbordar", await m.evaluate(() => { const a = document.querySelector(".mr-pxa"); return !!a && document.documentElement.scrollWidth <= innerWidth + 1; }));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
