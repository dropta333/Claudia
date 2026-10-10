// Prueba funcional de etapas (v154–v155): responsables, tipo/fase, horario, sugerencias por fase, bloqueador, cronograma, inicio y desplegables.
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const shots = process.argv[2] || ".";
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1500); await page.evaluate(() => { for (let i = 0; i < 4; i++) try { pxpLogroCerrar(); } catch (e) { } });
const K = "CASO OREO SABORES"; const ok = []; const fail = [];
const check = (n, c) => (c ? ok : fail).push(n);
await page.evaluate(k => { switchView("projects"); openProjectFicha(k); }, K); await page.waitForTimeout(800);
// 1 · varios responsables
await page.click('.et-row[data-i="0"] .et-who'); await page.waitForTimeout(300);
const names = await page.$$eval(".et-pop .ep-it[data-n]", bs => bs.slice(0, 2).map(b => b.dataset.n));
for (const n of names) { await page.click(`.et-pop .ep-it[data-n="${n}"]`); await page.waitForTimeout(250); }
await page.screenshot({ path: shots + "/t-pop.png" });
await page.click(".et-pop .ep-ft .ficha-save"); await page.waitForTimeout(300);
let e0 = await page.evaluate(k => PROJECTS[k].etapas[0], K);
check("dos responsables guardados", (e0.resps || []).length === 2 && e0.resp === e0.resps[0]);
const carga = await page.evaluate(([k, n]) => { const f = pxpFindPerson(n); return f ? pxpPuntosCarga(f.p, currentWeek) : null; }, [K, names[0]]);
check("carga calcula sin error", !!carga);
// 2 · tipo y fase
await page.click('.et-row[data-i="1"] .et-cls'); await page.waitForTimeout(250);
await page.screenshot({ path: shots + "/t-menu.png" });
await page.click('.et-menu .em-c.cl-revision'); await page.waitForTimeout(300);
await page.click('.et-row[data-i="1"] .et-cls'); await page.waitForTimeout(250);
await page.click('.et-menu .em-f:nth-child(1)'); await page.waitForTimeout(400);
const e1 = await page.evaluate(k => PROJECTS[k].etapas[1], K);
check("clase revisión", e1.clase === "revision"); check("fase pre", e1.fase === "pre");
check("grupo Preproducción visible", await page.$('.et-grp[data-f="pre"]') !== null);
// 3 · horario con el selector (estilo calendario): Tarde, Hora exacta 10:30 y se extiende hasta 19:30
await page.click('.et-row[data-i="2"] .et-pick:not(.pz)'); await page.waitForTimeout(250);
await page.screenshot({ path: shots + "/t-fr.png" });
await page.click('.pk-fr .pk-op.fr-pm'); await page.waitForTimeout(350);
const pl = await page.evaluate(k => pxpPlanEtapas(PROJECTS[k]).find(x => x.i === 2), K);
check("tarde empieza 13:30 (h=4)", pl.hi === 4);
await page.click('.et-row[data-i="3"] .et-pick:not(.pz)'); await page.waitForTimeout(250);
await page.click('.pk-fr .pk-op.fr-hora'); await page.waitForTimeout(350);
await page.click('.pk-fr .pk-hrs .pk-d:nth-child(5)'); await page.waitForTimeout(350);
await page.click('.pk-fr .pk-ext .pk-q:nth-child(5)'); await page.waitForTimeout(350);
const p3 = await page.evaluate(k => pxpPlanEtapas(PROJECTS[k]).find(x => x.i === 3), K);
check("hora exacta 10:30 (h=2)", p3.hi === 2);
check("se extiende hasta 19:30", await page.evaluate(k => PROJECTS[k].etapas[3].hasta === "19:30", K));
await page.click("#et-wrap .et-sum"); await page.waitForTimeout(200);
// exigencia con el selector
await page.click('.et-row[data-i="0"] .et-pick.pz'); await page.waitForTimeout(250);
await page.click('.pk-pz .pk-op.pz-pesada'); await page.waitForTimeout(300);
check("exigencia pesada", await page.evaluate(k => PROJECTS[k].etapas[0].peso === "pesada", K));
// tipo revisión: fila compacta, liviana y 4 h si tenía la duración sugerida
const idxR = await page.evaluate(k => { const E = PROJECTS[k].etapas; E.push({ nombre: "Etapa de prueba", estado: "pendiente", hp: 8, dias: 1, resp: "" }); pxpRenderProj(); return E.length - 1; }, K); await page.waitForTimeout(400);
await page.click(`.et-row[data-i="${idxR}"] .et-cls`); await page.waitForTimeout(250);
await page.click('.et-menu .em-c.cl-revision'); await page.waitForTimeout(400);
const eR = await page.evaluate(([k, i]) => ({ e: PROJECTS[k].etapas[i], t: pxpTipoEtapa(PROJECTS[k].etapas[i]) }), [K, idxR]);
check("revisión: 4 h y liviana", eR.e.hp === 4 && eR.t === "liviana");
check("revisión: fila compacta", await page.$(`.et-row.mini[data-i="${idxR}"]`) !== null);
// 4 · sugerir por fase (un clic) y deshacer
const antes = await page.evaluate(k => PROJECTS[k].etapas.length, K);
await page.click('.sg-c:nth-of-type(2)'); await page.waitForTimeout(500);
const despues = await page.evaluate(k => PROJECTS[k].etapas.length, K);
check("sugerir Rodaje agrega etapas", despues > antes);
const sug = await page.evaluate(k => PROJECTS[k].etapas.filter(e => e.fase === "rodaje").map(e => pxpResps(e)), K);
const porPersona = {}; sug.forEach(R => R.forEach(r => porPersona[r] = (porPersona[r] || 0) + 1));
check("una etapa por integrante", Object.values(porPersona).every(n => n === 1));
const fechas = await page.evaluate(k => pxpPlanEtapas(PROJECTS[k]).filter(x => x.e.fase === "rodaje").map(x => x.ini), K);
const hoyIso = new Date().toISOString().slice(0, 10);
check("sugeridas no empiezan en el pasado", fechas.every(f => f >= hoyIso));
check("grupo Rodaje visible", await page.$('.et-grp[data-f="rodaje"]') !== null);
await page.click('.sg-undo .linkbtn'); await page.waitForTimeout(500);
check("deshacer quita las sugeridas", await page.evaluate(k => PROJECTS[k].etapas.length, K) === antes);
await page.click('.sg-c:nth-of-type(3)'); await page.waitForTimeout(500);
await page.locator("#et-wrap").screenshot({ path: shots + "/t-et.png" });
// bloqueador sugerido en una revisión en curso
const iRev = await page.evaluate(k => PROJECTS[k].etapas.findIndex(e => pxpClaseEtapa(e) === "revision" && e.estado !== "listo"), K);
await page.evaluate(([k, i]) => pxpEt("estado", i, "en_curso"), [K, iRev]); await page.waitForTimeout(400);
await page.click(`.et-row[data-i="${iRev}"] .et-bq`); await page.waitForTimeout(400);
check("bloqueador por feedback", await page.evaluate(k => (PROJECTS[k].bloqueos || []).some(b => !b.fin && /Feedback/.test(b.desc)), K));
// cronograma: todas las etapas y vista Año
const nFilas = await page.$$eval("#et-gantt .cr-body .cr-row", r => r.length);
const nEt = await page.evaluate(k => pxpPlanEtapas(PROJECTS[k]).filter(x => x.ini && x.fin).length, K);
check("cronograma muestra todas las etapas", nFilas >= nEt);
await page.click('#et-gantt .cr-seg button:has-text("Año")'); await page.waitForTimeout(400);
check("vista Año", await page.$eval("#et-gantt .cr", c => c.dataset.m === "anio"));
await page.locator("#et-gantt").screenshot({ path: shots + "/t-anio.png" });
await page.click('#et-gantt .cr-seg button:has-text("Todo")'); await page.waitForTimeout(400);
const cen = await page.$eval("#et-gantt .cr", c => { const n = c.querySelector(".cr-now"), t = c.querySelector(".cr-bg .cr-t"); if (!n) return -1; const r = n.getBoundingClientRect(), q = t.getBoundingClientRect(); return (r.left - q.left) / q.width; });
check("hoy al centro (" + Math.round(cen * 100) + "%)", cen > 0.42 && cen < 0.58);
check("sin desplazamiento horizontal", await page.$eval("#et-gantt .cr-g", g => g.scrollWidth <= g.clientWidth + 1));
await page.locator("#et-gantt").screenshot({ path: shots + "/t-todo.png" });
// inicio del proyecto
await page.evaluate(k => pxpProjSet("inicio", "2026-09-14"), K); await page.waitForTimeout(500);
check("inicio guardado", await page.evaluate(k => PROJECTS[k].fechaInicio === "2026-09-14", K));
check("KPI de inicio primero", await page.$eval("#pxp-proj .pj-kpis > :first-child", d => d.classList.contains("pj-ini")));
// v159 · agregar etapa eligiendo la fase, botones del cronograma a la derecha y sin scroll horizontal
const nAntes = await page.evaluate(k => PROJECTS[k].etapas.length, K);
await page.click(".et-addb"); await page.waitForTimeout(250);
await page.click(".pk-add .pk-op.fs-rodaje"); await page.waitForTimeout(400);
const nueva = await page.evaluate(([k, n]) => { const E = PROJECTS[k].etapas; return E.length === n + 1 ? E.find(e => !e.nombre && e.fase === "rodaje") : null; }, [K, nAntes]);
check("agregar etapa en Rodaje", !!nueva);
await page.click('.et-grp[data-f="pre"] .et-gadd'); await page.waitForTimeout(400);
check("agregar desde el grupo Preproducción", await page.evaluate(k => PROJECTS[k].etapas.filter(e => !e.nombre && e.fase === "pre").length === 1, K));
for (const m of ["Todo", "Mes"]) {
  await page.click(`#et-gantt .cr-seg button:has-text("${m}")`); await page.waitForTimeout(300);
  const r = await page.$eval("#et-gantt .cr", c => { const s = c.querySelector(".cr-seg").getBoundingClientRect(), t = c.querySelector(".cr-top").getBoundingClientRect(), b = c.querySelector(".cr-body"); return { der: t.right - s.right, sx: b.scrollWidth - b.clientWidth, ox: getComputedStyle(b).overflowX }; });
  check(`${m}: vistas a la derecha`, r.der < 30); check(`${m}: sin scroll horizontal`, r.ox === "hidden" || r.sx <= 1);
}
// 5 · desplegables
const rl = await page.$eval(".rl-sec", s => [s.classList.contains("pj-fold"), s.classList.contains("open"), s.querySelector(".fd-sum").textContent]);
check("enlaces plegable y cerrado", rl[0] && !rl[1]);
await page.click(".rl-sec > h3 .fd-tg"); await page.waitForTimeout(200);
check("enlaces se abre", await page.$eval(".rl-sec", s => s.classList.contains("open")));
await page.click(".rl-sec > h3 .fd-tg"); await page.waitForTimeout(200);
await page.click("#pxp-proj .pj-fold[data-fold=et] > h3 .fd-tg"); await page.waitForTimeout(250);
check("etapas se cierra y muestra resumen", await page.$eval("#pxp-proj .pj-fold[data-fold=et]", s => !s.classList.contains("open") && s.querySelector(".fd-sum").offsetParent !== null));
await page.click("#pxp-proj .pj-fold[data-fold=et] > h3 .fd-tg"); await page.waitForTimeout(250);
await page.locator("#et-wrap").screenshot({ path: shots + "/t-et.png" });
console.log("OK:", ok.length, ok.join(" · ")); console.log("FALLA:", fail.length, fail.join(" · ")); console.log("errores:", errs.length, errs.slice(0, 5).join(" | "));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
