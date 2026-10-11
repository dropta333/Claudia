// Prueba v189: barra de Proyectos simple (Activos/Todos, Filtros desplegables, vista y agrupar) y valores por defecto
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
await page.evaluate(() => { Object.keys(localStorage).filter(k => /pxp_pv_v[34]|pxp_vista_proy/.test(k)).forEach(k => localStorage.removeItem(k)); switchView("projects"); }); await page.waitForTimeout(1000);
const st = () => page.evaluate(() => ({ fichas: document.querySelectorAll("#proj-wrap .pvc").length, bloques: document.querySelectorAll("#proj-wrap .pvc-blk").length, grupo: document.querySelector(".pvx-grp select").value,
  vista: (document.querySelector(".pvx-vista button.on") || {}).textContent, alcance: (document.querySelector(".pvx-scope button.on") || {}).textContent, entregados: [...document.querySelectorAll("#proj-wrap .pvc")].filter(c => c.classList.contains("entregado")).length,
  filtrosVisibles: !!document.querySelector("#pvx-f:not([hidden])"), n: (document.querySelector(".pvx-n") || {}).textContent || "" }));
let r = await st();
check(`por defecto: fichas, activos y sin agrupar (v194) (${JSON.stringify(r)})`, /Fichas/.test(r.vista) && /Activos/.test(r.alcance) && r.grupo === "none");
check("activos: sin entregados", r.entregados === 0);
check("sin filtros no hay fila de etiquetas (v196)", !r.filtrosVisibles);
const act = r.fichas;
await page.click(".pvx-scope button:nth-child(2)"); await page.waitForTimeout(700); r = await st();
check(`todos: incluye los entregados (${r.fichas} > ${act})`, r.fichas > act && r.entregados > 0);
check("Filtrar por está en la barra principal (v196)", !!(await page.$(".pvx-bar .pvx-fdd .dd-btn")));
const op = await page.$eval(".pvx-fsel", s => [...s.options].find(o => /^tipo\|/.test(o.value)).value); await page.selectOption(".pvx-fsel", op); await page.waitForTimeout(700); r = await st();
check(`un solo selector de filtros; muestra cuántos hay (${r.n})`, r.n === "1" && (await page.$$(".pvx-fdd select")).length === 1);
check("el filtro aplicado queda como etiqueta", !!(await page.$(".pvx-tag")));
await page.click(".pvx-tag"); await page.waitForTimeout(700); r = await st(); check("la etiqueta ✕ quita el filtro", r.n === "");
await page.selectOption(".pvx-fsel", op); await page.waitForTimeout(700);
await page.click("#pv-clear"); await page.waitForTimeout(700); r = await st(); check("Limpiar filtros", r.n === "");
await page.click(".pvx-vista button:nth-child(2)"); await page.waitForTimeout(800); check("cambiar a filas", await page.evaluate(() => !document.querySelector("#proj-wrap").classList.contains("pv-cards")));
await page.click(".pvx-vista button:nth-child(1)"); await page.waitForTimeout(800);
await page.click(".pvx-scope button:nth-child(1)"); await page.waitForTimeout(500);
await page.evaluate(() => { const b = [...document.querySelectorAll(".pvx-chips .pv-chip")].find(x => /entregados/.test(x.textContent)); b.click(); }); await page.waitForTimeout(700); r = await st();
check("en Activos, tocar 'entregados' los muestra", r.entregados > 0);
check("botón Nuevo proyecto en la barra", !!(await page.$(".pvx-bar .pvx-new")));
await page.setViewportSize({ width: 390, height: 900 }); await page.waitForTimeout(700);
check("celular: nada se sale de la pantalla", await page.evaluate(() => ![...document.querySelectorAll(".pvx *")].some(e => e.getBoundingClientRect().right > innerWidth + 1)));
// ventana de persona: "Ver más" de a 5 en proyectos y etapas
await page.setViewportSize({ width: 1440, height: 1000 });
await page.evaluate(() => { document.querySelectorAll(".open").forEach(e => e.classList.remove("open")); const p = TEAM.find(t => /oscar barrera/i.test(t.name)); const ks = Object.keys(PROJECTS).filter(k => !["entregado", "aprobado"].includes(PROJECTS[k].estadoGeneral)).slice(0, 18);
  ks.forEach(k => { PROJECTS[k].directorPost = p.name; (PROJECTS[k].etapas || []).forEach(e => { if (e.estado !== "listo") e.resps = [p.name]; }); }); pxpOpenPerson(p.name); }); await page.waitForTimeout(1500);
const vis = (sel) => page.$$eval(sel, x => x.filter(e => getComputedStyle(e).display !== "none").length);
const tot = await page.$$eval(".pm-projs > *", x => x.length);
check(`proyectos: se ven 5 de ${tot}`, (await vis(".pm-projs > *")) === 5);
const btnP = () => page.$(".pm-projs + .vm-btn");
await (await btnP()).click(); await page.waitForTimeout(300); check("Ver más muestra otros 5", (await vis(".pm-projs > *")) === 10);
while (!/Ver menos/.test(await (await btnP()).innerText())) { await (await btnP()).click(); await page.waitForTimeout(200); }
check("al final se ven todos y el botón dice Ver menos", (await vis(".pm-projs > *")) === tot);
await (await btnP()).click(); await page.waitForTimeout(300); check("Ver menos vuelve a 5", (await vis(".pm-projs > *")) === 5);
const nE = await page.$$eval(".vm-list.pe-list > *", x => x.length);
check(`etapas: se ven 5 de ${nE}`, nE > 6 && (await vis(".vm-list.pe-list > *")) === 5);
await page.click(".vm-list.pe-list + .vm-btn"); await page.waitForTimeout(300); check("etapas: Ver más muestra otros 5", (await vis(".vm-list.pe-list > *")) === Math.min(10, nE));
console.log(JSON.stringify({ ok, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
