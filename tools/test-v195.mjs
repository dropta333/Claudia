// Prueba v195: control de plegar/desplegar igual en todas las pestañas y funcionando (Proyectos fichas/filas, Capacidad en fichas, Horas, Reportes, Clientes) · filtros dentro de la barra de Proyectos
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); localStorage.removeItem("pxp_cap_cerr"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); switchView("projects"); pvAlcance("todos"); pvGroup("cliente"); }); await page.waitForTimeout(800);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
check("Filtrar por dentro de la barra, sin fila aparte (v196)", await page.evaluate(() => !!document.querySelector(".pvx-bar .pvx-fdd") && !document.querySelector(".pvx-bar > .pvx-f")));
check("Proyectos: control con íconos", await page.evaluate(() => document.querySelectorAll(".pvx-gl.fold > button .i").length >= 2));
const rows = () => page.evaluate(() => [...document.querySelectorAll("#proj-wrap tbody tr:not(.pv-g)")].filter(r => r.offsetParent).length + document.querySelectorAll("#proj-wrap .pvc").length);
for (const v of ["fichas", "filas"]) {
  await page.evaluate(v => pxpVistaProy(v), v); await page.waitForTimeout(600); const n0 = await rows();
  await page.click(".pvx-gl button:has-text('Plegar')"); await page.waitForTimeout(500); const n1 = await rows();
  await page.click(".pvx-gl button:has-text('Desplegar')"); await page.waitForTimeout(500); const n2 = await rows();
  check(`Proyectos ${v}: plegar (${n0}→${n1}) y desplegar (${n2})`, n0 > 0 && n1 === 0 && n2 === n0);
}
await page.evaluate(() => { pvGroup("none"); switchView("capacidad"); }); await page.waitForTimeout(900);
const cap = () => page.evaluate(() => ({ c: document.querySelectorAll("#cap-wrap .pfc-sec.closed").length, n: document.querySelectorAll("#cap-wrap .pfc-sec").length, vis: [...document.querySelectorAll("#cap-wrap .pfc")].filter(x => x.offsetParent).length }));
await page.click("#cap-wrap .grp-links.fold button >> nth=0"); await page.waitForTimeout(500); let c = await cap();
check(`Capacidad fichas: Esconder todos (${JSON.stringify(c)})`, c.n > 0 && c.c === c.n && c.vis === 0);
await page.click("#cap-wrap .grp-links.fold button >> nth=1"); await page.waitForTimeout(500); c = await cap();
check("Capacidad fichas: Mostrar todos", c.c === 0 && c.vis > 0);
await page.click("#cap-wrap .pfc-gh >> nth=0"); await page.waitForTimeout(400); c = await cap();
check("Capacidad: tocar un grupo lo pliega", c.c === 1);
const solapa = await page.evaluate(() => { const r = [...document.querySelectorAll("#cap-wrap .cap-mos > .pfc-sec")].map(s => s.getBoundingClientRect()); for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], d = r[j]; if (a.left < d.right - 1 && d.left < a.right - 1 && a.top < d.bottom - 1 && d.top < a.bottom - 1) return true; } return false; });
check("Capacidad: el mosaico se reacomoda sin montarse", !solapa);
await page.reload(); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; enterApp({ name: "Bastián Torres" }, "preview"); }); await page.waitForTimeout(1800);
await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("capacidad"); }); await page.waitForTimeout(900);
check("Capacidad: el grupo plegado se recuerda", (await cap()).c === 1);
await page.evaluate(() => { localStorage.removeItem("pxp_cap_cerr"); switchView("horas"); }); await page.waitForTimeout(900);
check("Horas: mismo control", await page.evaluate(() => document.querySelectorAll(".grp-links.fold > button .i").length >= 2));
await page.evaluate(() => switchView("reportes")); await page.waitForTimeout(900);
check("Reportes: mismo control", await page.evaluate(() => document.querySelectorAll("#rp-wrap .rp-all.fold > button .i").length === 2));
await page.click("#rp-wrap .rp-all button >> nth=1"); await page.waitForTimeout(300);
check("Reportes: Mostrar todos abre", await page.evaluate(() => [...document.querySelectorAll("#rp-wrap > .rp-cl")].every(s => s.classList.contains("open"))));
await page.click("#rp-wrap .rp-all button >> nth=0"); await page.waitForTimeout(300);
check("Reportes: Esconder todos cierra", await page.evaluate(() => [...document.querySelectorAll("#rp-wrap > .rp-cl")].every(s => !s.classList.contains("open"))));
await page.evaluate(() => switchView("clientes")); await page.waitForTimeout(800);
check("Clientes: mismo control", await page.evaluate(() => !!document.querySelector(".ct-acc.fold")));
await page.setViewportSize({ width: 390, height: 800 }); await page.evaluate(() => switchView("projects")); await page.waitForTimeout(800);
check("celular: nada se sale en Proyectos", await page.evaluate(() => ![...document.querySelectorAll(".pvx *")].some(e => e.getBoundingClientRect().right > innerWidth + 1)));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
