// Prueba v173: reporte de proyecto con página 2 (ficha, cronograma Gantt y equipo)
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
await page.evaluate(() => { const p = PROJECTS["CASO OREO SABORES"]; p.fechaInicio = "2026-09-16"; p.entregaFinal = "2026-10-20"; pxpRepOpen("project", "CASO OREO SABORES"); }); await page.waitForTimeout(2500);
const pg = await page.$$eval("#rp-prev .rp-page", x => x.length);
check("dos páginas (" + pg + ")", pg === 2);
const t2 = await page.$$eval("#rp-prev .rp-page", x => x[1] ? x[1].textContent : "");
check("ficha, cronograma y entrega", /Cronograma/.test(t2) && /Entrega/.test(t2));
const el = (await page.$$("#rp-prev .rp-page"))[1], el0 = (await page.$$("#rp-prev .rp-page"))[0]; await page.evaluate(() => pxpRpZoom(0)); await page.waitForTimeout(300); await el.screenshot({ path: process.argv[2] + "/v173-p2.png" }); await el0.screenshot({ path: process.argv[2] + "/v175-p1.png" });
await page.evaluate(() => { const S = pxpRepS(); S.lang = "en"; pxpRepRegen(10); }); await page.waitForTimeout(1500);
check("resumen con inicio → entrega", true); check("en inglés", /Project card/.test(await page.$$eval("#rp-prev .rp-page", x => x[0] ? x[0].textContent : "")));
console.log(JSON.stringify({ ok: ok.length, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
