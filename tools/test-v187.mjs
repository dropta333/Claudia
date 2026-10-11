// Prueba v187: Proyectos en fichas agrupadas como bloques lado a lado (sin huecos)
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
await page.evaluate(() => { switchView("projects"); pvAlcance("todos"); }); await page.waitForTimeout(1000);
const agrupar = async (t) => { const v = { cliente: "cliente", agencia: "agencia", estado: "estado", tipo: "tipo", "sin agrupar": "none" }[t.toLowerCase()]; await page.selectOption(".pvx-grp select", v); await page.waitForTimeout(900); };
const revisar = () => page.evaluate(() => {
  const g = document.querySelector("#proj-wrap .pvc-grid.pvc-blocks"); if (!g) return null;
  const cols = getComputedStyle(g).gridTemplateColumns.split(" ").length, bs = [...g.querySelectorAll(":scope > .pvc-blk")];
  const rs = bs.map(b => b.getBoundingClientRect()); let encima = 0;
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], c = rs[j]; if (a.left < c.right - 2 && c.left < a.right - 2 && a.top < c.bottom - 2 && c.top < a.bottom - 2) encima++; }
  const ancho = bs.every(b => { const n = +b.dataset.n || 1, sp = +(b.style.gridColumn.match(/span (\d+)/) || [0, 0])[1]; return sp === Math.min(cols, n); });
  const filas = new Set(rs.map(r => Math.round(r.top))).size;
  return { n: bs.length, cols, encima, ancho, filas, fichas: g.querySelectorAll(".pvc").length };
});
for (const t of ["Cliente", "Agencia", "Estado", "Tipo"]) { await agrupar(t); const r = await revisar(); check(`agrupado por ${t}: ${r && r.n} bloques en ${r && r.filas} filas, sin encimarse`, r && r.encima === 0 && r.ancho && r.filas <= r.n); }
await agrupar("Cliente");
const antes = (await revisar()).fichas; await page.click("#proj-wrap .pvc-blk .pvc-g"); await page.waitForTimeout(800);
const r2 = await revisar(); check("plegar un grupo esconde sus fichas y se reacomoda", r2 && r2.fichas < antes && r2.encima === 0);
await agrupar("Sin agrupar"); check("sin agrupar: rejilla normal", await page.evaluate(() => !!document.querySelector("#proj-wrap .pvc-grid:not(.pvc-blocks) .pvc")));
await page.setViewportSize({ width: 700, height: 1000 }); await agrupar("Cliente"); const r3 = await revisar(); check("pantalla angosta: una columna", r3 && r3.cols === 1 && r3.encima === 0);
// grupo Audio: cambiar la forma desde su ventana se ve en sus integrantes, en las casas de audio y en el título
await page.setViewportSize({ width: 1440, height: 1000 });
await page.evaluate(() => { const k = Object.keys(PROJECTS)[0]; PROJECTS[k].casaAudio = "Estudio Prueba"; switchView("team"); }); await page.waitForTimeout(900);
await page.click('#view-team .team-section-title[data-g="Audio"] .tst'); await page.waitForTimeout(700);
const bs = await page.$$(".gm-forma button"); let burst = null; for (const x of bs) if ((await x.getAttribute("aria-label")) === "burst") burst = x; await burst.click(); await page.waitForTimeout(900);
const au = await page.evaluate(() => { document.querySelectorAll(".open").forEach(e => e.classList.remove("open")); switchView("team"); const h = document.createElement("div"); h.innerHTML = pxpAvatar("person", AUDIO[0].name, 30);
  const casas = [...document.querySelectorAll("#team-casas .casa-av")].map(e => e.dataset.sh); return { meta: (META.grupoForma || {}).Audio, avatar: h.firstElementChild.dataset.sh, casas }; });
check(`Audio cambia de forma (${JSON.stringify(au)})`, au.meta === "burst" && au.avatar === "burst" && au.casas.every(x => x === "burst"));
console.log(JSON.stringify({ ok, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
