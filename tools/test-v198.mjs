// Prueba v198: Disponibilidad completa y sin leyenda en Dashboard · conteo de logros grande · Reparto y Tipos de Clientes en dos columnas y más bajos · Logros: últimas medallas al lado del progreso
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); pxpCliModo("anio"); switchView("clientes"); }); await page.waitForTimeout(1000);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const c = await page.evaluate(() => { const cols = (sel) => new Set([...document.querySelectorAll(sel)].map(e => Math.round(e.getBoundingClientRect().left))).size; const ps = [...document.querySelectorAll("#cli-wrap .pxp-grid > .home-panel")].filter(p => /^(Reparto|Tipos)/.test(p.querySelector(".hp-title").textContent.trim())); return { rc: cols("#cli-wrap .rc-l li"), tp: cols("#cli-wrap .tp-l li"), h: ps.map(p => Math.round(p.getBoundingClientRect().height)) }; });
check(`Clientes: listas en dos columnas y cajas más bajas (${JSON.stringify(c)})`, c.rc === 2 && c.tp === 2 && c.h.every(h => h < 480));
await page.evaluate(() => { pxpCliModo("activos"); switchView("logros"); }); await page.waitForTimeout(900);
const l = await page.evaluate(() => { const pr = document.querySelector("#lg-wrap .lg-h2 .lg-prog"), la = document.querySelector("#lg-wrap .lg-h2 .lg-last"); if (!pr || !la) return null; const a = pr.getBoundingClientRect(), d = la.getBoundingClientRect(); return { misma: Math.abs((a.top + a.bottom) / 2 - (d.top + d.bottom) / 2) < 30, derecha: d.left > a.right - 1, tip: !!document.querySelector("#lg-wrap .lg-r[data-tip]") }; });
check(`Logros: últimos al lado del progreso, con nombre al pasar el mouse (${JSON.stringify(l)})`, l && l.misma && l.derecha && l.tip);
await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(500);
check("Logros celular: la caja no queda con hueco", await page.evaluate(() => document.querySelector("#lg-wrap .lg-head").getBoundingClientRect().height < 420));
await page.setViewportSize({ width: 1600, height: 900 });
await page.evaluate(() => switchView("dashboard")); await page.waitForTimeout(1000);
const falt = await page.evaluate(() => { const names = [...document.querySelectorAll("#dash-wrap .lb-panel .lb-chip b")].map(b => b.textContent.trim()); return rosterThisWeek().filter(r => ["libre", "cargado", "saturado"].includes(r.status) && esRolOperativoDePost(r.role)).map(r => r.name).filter(n => !names.includes(n)); });
check(`Dashboard: Disponibilidad muestra a todo el equipo interno (faltan: ${falt.join(", ") || "nadie"})`, falt.length === 0);
check("Dashboard: sin la leyenda de colores", await page.evaluate(() => !document.querySelector(".legend-d") || !document.querySelector(".legend-d").offsetParent));
check("Logros: conteo por nivel grande", await page.evaluate(() => { switchView("logros"); return true; }) && await page.evaluate(() => new Promise(r => setTimeout(() => { const t = document.querySelectorAll("#lg-wrap .lg-tier"); r(t.length === 4 && parseFloat(getComputedStyle(t[0].querySelector("b")).fontSize) >= 20); }, 800))));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
