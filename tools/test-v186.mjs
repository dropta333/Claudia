// Prueba v186: Tráfico en fichas como mosaico (sin encimarse ni dejar huecos) al buscar, ordenar, agregar proyectos y en pantallas angostas
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const revisar = () => page.evaluate(() => {
  const lab = [...document.querySelectorAll("#main-grid > :not(.tcard)")].filter(e => e.offsetHeight > 0).map(e => e.getBoundingClientRect());
  const cs = [...document.querySelectorAll("#main-grid > .card.tcard")].filter(e => getComputedStyle(e).display !== "none").map(e => e.getBoundingClientRect());
  let encima = 0, hueco = 0;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) { const a = cs[i], b = cs[j]; if (a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) encima++; }
  // dentro de una misma columna, la distancia entre una ficha y la siguiente no pasa de 30 px
  const cols = {}; cs.forEach(r => (cols[Math.round(r.left)] = cols[Math.round(r.left)] || []).push(r));
  Object.values(cols).forEach(l => { l.sort((a, b) => a.top - b.top); for (let k = 1; k < l.length; k++) { const d = l[k].top - l[k - 1].bottom; if (d > 30 && d < 200 && !lab.some(t => t.top >= l[k - 1].bottom - 2 && t.bottom <= l[k].top + 2)) { hueco++; (window.__h = window.__h || []).push(Math.round(d)); } } });
  return { n: cs.length, encima, hueco, cols: Object.keys(cols).length, ds: window.__h };
});
await page.evaluate(() => switchView("traffic")); await page.waitForTimeout(1200);
let r = await revisar(); console.log(JSON.stringify(r)); check(`inicial: ${r.n} fichas en ${r.cols} columnas, sin encimarse ni huecos`, r.encima === 0 && r.hueco === 0 && r.cols === 3);
await page.fill(".trf-q input", "an"); await page.waitForTimeout(700); r = await revisar(); check(`buscando: ${r.n} fichas sin encimarse ni huecos`, r.encima === 0 && r.hueco === 0 && r.n > 0);
await page.fill(".trf-q input", ""); await page.waitForTimeout(500);
const b2 = await page.$$(".trf-sort button"); const mas = []; for (const x of b2) if (/cargados/i.test(await x.innerText())) mas.push(x); if (mas[0]) { await mas[0].click(); await page.waitForTimeout(800); }
r = await revisar(); check("ordenado por carga: sin encimarse ni huecos", r.encima === 0 && r.hueco === 0);
await page.evaluate(() => { const p = TEAM.find(t => (t.weeks[currentWeek] || []).length === 0) || TEAM[0]; p.weeks[currentWeek] = (p.weeks[currentWeek] || []).concat(["DORIA", "PULPIQUIN", "SURA MX"]); render(currentWeek); }); await page.waitForTimeout(900);
r = await revisar(); check("después de agregar proyectos: sin encimarse ni huecos", r.encima === 0 && r.hueco === 0);
await page.setViewportSize({ width: 900, height: 1000 }); await page.waitForTimeout(900); r = await revisar(); check(`pantalla mediana (${r.cols} columnas)`, r.encima === 0 && r.hueco === 0);
await page.setViewportSize({ width: 600, height: 1000 }); await page.waitForTimeout(900); r = await revisar(); check(`celular (${r.cols} columna)`, r.encima === 0 && r.cols === 1);
await page.setViewportSize({ width: 1440, height: 1000 }); await page.waitForTimeout(900);
const tb = await page.$$(".trf-sort button"); for (const x of tb) if (/^Tabla$/i.test((await x.innerText()).trim())) { await x.click(); break; } await page.waitForTimeout(900);
await page.screenshot({ path: process.argv[2] + "/tr-tabla.png" });
const t = await page.evaluate(() => { const tb = document.querySelector("#main-grid table"); if (!tb) return null; const r = tb.getBoundingClientRect(), v = [...document.querySelectorAll("#main-grid > .card.tcard")].filter(e => getComputedStyle(e).display !== "none").length; return { w: r.width, h: r.height, v }; });
check("vista tabla: la tabla se ve completa y las fichas no", !!t && t.w > 1000 && t.h > 200 && t.v === 0);
check("vista tabla: N.º es la primera columna", await page.evaluate(() => /N\.º/.test(document.querySelector("#trf-table th").textContent) && /^\d+$/.test(document.querySelector("#trf-table tbody tr:not(.pv-g) td").textContent.trim())));
console.log(JSON.stringify({ ok, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
