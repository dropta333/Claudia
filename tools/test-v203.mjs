// Prueba v203: Tráfico sin "Carga por rol" (diseño antiguo), aunque se repinte; el bloque plegable queda como "Rodajes" y el orden de Tráfico sigue funcionando
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); switchView("traffic"); }); await page.waitForTimeout(1000);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const carga = () => page.evaluate(() => [...document.querySelectorAll("#main-grid .card")].filter(c => /Carga por rol/.test(c.textContent.slice(0, 80))).length);
check("Tráfico: sin Carga por rol", (await carga()) === 0);
check("el plegable se llama Rodajes", await page.evaluate(() => /^Rodajes\d/.test((document.querySelector("#main-grid .trf-extra summary") || {}).textContent || "")));
for (const v of ["home", "capacidad", "traffic", "dashboard", "traffic"]) { await page.evaluate(v => switchView(v), v); await page.waitForTimeout(400); }
await page.evaluate(() => { setWeek(currentWeek); render(currentWeek); }); await page.waitForTimeout(800);
check("tampoco aparece tras cambiar de pestaña y repintar", (await carga()) === 0);
check("Tráfico sigue ordenando las fichas", await page.evaluate(() => typeof pxpTrfQ === "function" && document.querySelectorAll("#main-grid > .card.tcard").length > 5));
await page.evaluate(() => pxpTrfQ("oscar")); await page.waitForTimeout(400);
check("la búsqueda de Tráfico funciona", await page.evaluate(() => [...document.querySelectorAll("#main-grid > .card.tcard")].filter(c => c.offsetParent).length >= 1 && [...document.querySelectorAll("#main-grid > .card.tcard")].filter(c => c.offsetParent).length < 10));
await page.evaluate(() => pxpTrfQ(""));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
