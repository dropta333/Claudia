// Prueba v168: semáforo en Tráfico, notas con foto integrada, filas de inicio/entrega y marcas del cronograma
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
await page.waitForTimeout(900);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
check("Tráfico sin complejidad", await page.$$eval("#main-grid .dotcol-label", x => !x.some(l => /Compl/i.test(l.textContent))));
check("carga como semáforo", await page.$$eval("#main-grid .semaf .sdot", x => x.length) >= 3 && await page.$("#main-grid .semaf .sdot.active") !== null);
const K = "CASO OREO SABORES";
await page.evaluate(k => { const p = PROJECTS[k]; p.fechaInicio = "2026-09-16"; p.entregaFinal = "2026-10-20"; p.historial = (p.historial || []).concat([{ ts: new Date().toISOString(), usuario: "Andrea López", texto: "Hola", tipo: "nota" }]); openProjectFicha(k); }, K); await page.waitForTimeout(900);
check("nota con foto grande adentro", await page.$eval("#pxp-proj .pj-note .pn-m .pn-av .av", a => Math.round(a.getBoundingClientRect().width) >= 40));
check("fila de inicio arriba", /16 sept/.test(await page.$eval("#et-wrap .et-hito.h-ini", e => e.textContent)) && await page.evaluate(() => { const h = document.querySelector("#et-wrap .et-hito.h-ini"), g = document.querySelector("#et-wrap .et-grp"); return !!(h.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING); }));
check("fila de entrega abajo", /20 oct/.test(await page.$eval("#et-wrap .et-hito.h-fin", e => e.textContent)));
check("fila de inicio se puede tocar", await page.$("#et-wrap .et-hito.h-ini button.eh-d") !== null);
const mk = await page.$$eval("#et-gantt .cr-mk .mk em", x => x.map(e => e.textContent));
check("cronograma con Inicio, Hoy y Entrega con fecha", mk.some(t => /Inicio · 16 sep/i.test(t)) && mk.some(t => /^Hoy/.test(t)) && mk.some(t => /Entrega · 20 oct/i.test(t)));
check("marcas fuera de la fila de la escala", await page.$$eval("#et-gantt .cr-h .mk", x => x.length) === 0);
console.log(JSON.stringify({ ok: ok.length, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
