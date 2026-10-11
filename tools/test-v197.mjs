// Prueba v197: Clientes (árbol primero, semana solo en Activos con desplegable) · Logros con cabecera compacta · Home personal: estado en dos columnas
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); pxpCliModo("activos"); switchView("clientes"); }); await page.waitForTimeout(1000);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const tit = await page.evaluate(() => [...document.querySelectorAll("#cli-wrap .pxp-grid > .home-panel")].map(p => p.querySelector(".hp-title").textContent.trim()));
check(`Clientes: el árbol va primero y las gráficas debajo (${tit.slice(0, 3).map(t => t.slice(0, 18))})`, /^Clientes, marcas/.test(tit[0]) && tit.findIndex(t => /^Reparto/.test(t)) > 0);
check("Activos: selector de semana diseñado", !!(await page.$("#view-clientes .cli-sem .dd-btn")));
await page.click("#view-clientes .cli-sem .dd-btn"); await page.waitForTimeout(250);
check("la lista de semanas se abre", (await page.$$(".dd-pop .dd-o")).length >= 1); await page.keyboard.press("Escape");
await page.evaluate(() => pxpCliModo("anio")); await page.waitForTimeout(700);
check("Todo el año: sin selector de semana (no aplica)", await page.evaluate(() => !document.querySelector("#view-clientes .cli-sem .dd-btn") || !document.querySelector("#view-clientes .cli-sem .dd-btn").offsetParent));
await page.evaluate(() => { pxpCliModo("activos"); switchView("logros"); }); await page.waitForTimeout(1000);
check("Logros: sin título grande", await page.evaluate(() => !document.querySelector("#lg-wrap h2")));
check("Logros: pestañas, progreso y botón en una caja", await page.evaluate(() => { const h = document.querySelector("#lg-wrap .lg-head"); return !!h && !!h.querySelector(".seg") && !!h.querySelector(".lg-prog") && !!h.querySelector(".lg-give"); }));
check("Logros: la explicación queda en el ícono ?", await page.evaluate(() => /Se ganan solos/.test((document.querySelector("#lg-wrap .lg-info") || {}).dataset?.tip || "")));
await page.evaluate(() => pxpLogrosSel("team")); await page.waitForTimeout(500);
check("Logros: cambiar de pestaña sigue funcionando", await page.evaluate(() => /Equipo/.test(document.querySelector("#lg-wrap .lg-head .seg button.on").textContent)));
await page.evaluate(() => { pxpLogrosSel("ind"); pxpHomeModo("personal"); switchView("home"); }); await page.waitForTimeout(1500);
const est = await page.evaluate(() => { const p = [...document.querySelectorAll(".home-panel")].find(x => /^Estado de los proyectos/.test(x.querySelector(".hp-title").textContent)); const r = [...p.querySelectorAll(".est-row")].map(e => Math.round(e.getBoundingClientRect().left)); return { cols: new Set(r).size, h: Math.round(p.getBoundingClientRect().height) }; });
check(`Home personal: estado en dos columnas y más bajo (${JSON.stringify(est)})`, est.cols === 2 && est.h < 360);
await page.evaluate(() => pxpHomeModo("global"));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
