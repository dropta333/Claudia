// Prueba v180: etapas en inglés en el time table y el reporte de proyecto
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const K = "CASO OREO SABORES";
const antes = await page.evaluate(k => JSON.stringify(PROJECTS[k].etapas.map(e => e.nombre)), K);
const txt = async () => page.$$eval("#rp-prev .rp-page", x => x.map(e => e.textContent).join(" "));
await page.evaluate(k => { pxpRepOpen("tt", k); }, K); await page.waitForTimeout(2500);
await page.evaluate(() => pxpTTo_lang("en")); await page.waitForTimeout(2500);
let t = await txt(); check("time table en inglés: Client review", /Client review/.test(t) && /Delivery/.test(t) && !/Revisión del cliente/.test(t));
await page.evaluate(() => { pxpTTo("vista", "gantt"); }); await page.waitForTimeout(2500); t = await txt(); check("gantt en inglés", /Client review/.test(t) && /Offline \/ editing/.test(t));
await page.evaluate(k => { document.querySelectorAll(".open").forEach(e => e.classList.remove("open")); pxpRepOpen("project", k); }, K); await page.waitForTimeout(2500);
t = await txt(); check("reporte en español sin cambios", /Revisión del cliente/.test(t));
await page.evaluate(() => { const S = pxpRepS(); S.lang = "en"; pxpRepRegen(10); }); await page.waitForTimeout(2500);
t = await txt(); check("reporte de proyecto en inglés", /Client review/.test(t) && !/Revisión del cliente/.test(t));
check("el proyecto guardado no cambia", antes === await page.evaluate(k => JSON.stringify(PROJECTS[k].etapas.map(e => e.nombre)), K));
console.log(JSON.stringify({ ok: ok.length, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
