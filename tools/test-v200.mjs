// Prueba v200: Clientes · "Proyectos activos / Todo el año" y la semana van en una barra encima de las gráficas; "Nuevo cliente" en la caja de clientes
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1472, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); switchView("clientes"); pxpCliModo("activos"); }); await page.waitForTimeout(1000);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const r = await page.evaluate(() => { const g = document.querySelector("#cli-wrap .pxp-grid"), kids = [...g.children], bar = g.querySelector(".cli-gbar"), tree = kids.find(p => /^Clientes, marcas/.test(((p.querySelector(".hp-title") || {}).textContent || "").trim())), rep = kids.find(p => /^Reparto/.test(((p.querySelector(".hp-title") || {}).textContent || "").trim())); return { orden: kids.indexOf(tree) < kids.indexOf(bar) && kids.indexOf(bar) < kids.indexOf(rep), modo: !!bar.querySelector(".cli-modo"), sem: !!bar.querySelector(".cli-sem .dd-btn"), vhVisible: !!document.querySelector("#view-clientes > .vh")?.offsetParent, nuevo: !!document.querySelector("#cli-wrap .ct-bar0 .btn-new.cli") }; });
check(`la barra va entre los clientes y las gráficas, con modo y semana (${JSON.stringify(r)})`, r.orden && r.modo && r.sem);
check("sin la fila de arriba y Nuevo cliente en la caja de clientes", !r.vhVisible && r.nuevo);
await page.click("#cli-wrap .cli-gbar .cli-modo button[data-v=anio]"); await page.waitForTimeout(700);
check("Todo el año desde la barra cambia las gráficas y esconde la semana", await page.evaluate(() => /2026/.test(document.querySelector("#cli-wrap .pxp-grid .home-panel .hp-extra") ? [...document.querySelectorAll("#cli-wrap .hp-extra")].map(x => x.textContent).join(" ") : "") && !document.querySelector("#cli-wrap .cli-gbar .cli-sem .dd-btn")?.offsetParent && document.querySelectorAll(".cli-gbar").length === 1));
await page.click("#cli-wrap .ct-bar0 .btn-new.cli"); await page.waitForTimeout(500);
check("Nuevo cliente abre su ventana", await page.evaluate(() => !!document.querySelector(".open #ncx-name, .open [id^=ncx], #pxp-newcli.open")));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
