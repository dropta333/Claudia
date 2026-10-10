// Prueba funcional v154: varios responsables, tipo/fase, horario, extensión, sugerencias y desplegables.
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
// 3 · horario tarde + extensión
await page.selectOption('.et-row[data-i="2"] .et-fr select', "pm"); await page.waitForTimeout(300);
const pl = await page.evaluate(k => pxpPlanEtapas(PROJECTS[k]).find(x => x.i === 2), K);
check("tarde empieza 13:30 (h=4)", pl.hi === 4);
await page.check('.et-row[data-i="2"] .et-ext input'); await page.waitForTimeout(300);
check("se extiende", await page.evaluate(k => !!PROJECTS[k].etapas[2].extiende, K));
await page.selectOption('.et-row[data-i="3"] .et-fr select', "hora"); await page.waitForTimeout(300);
await page.selectOption('.et-row[data-i="3"] .et-fr2 select', "2"); await page.waitForTimeout(300);
const p3 = await page.evaluate(k => pxpPlanEtapas(PROJECTS[k]).find(x => x.i === 3), K);
check("hora exacta 10:30 (h=2)", p3.hi === 2);
// 4 · sugerencias
await page.click(".et-sugbtn"); await page.waitForTimeout(400);
const nS = await page.$$eval(".sg-it", x => x.length); check("hay sugerencias", nS > 0);
await page.locator(".sg").screenshot({ path: shots + "/t-sug.png" });
const antes = await page.evaluate(k => PROJECTS[k].etapas.length, K);
await page.click(".sg-ft .ficha-save"); await page.waitForTimeout(500);
const despues = await page.evaluate(k => PROJECTS[k].etapas.length, K);
check("sugerencias agregadas", despues > antes);
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
