// Prueba v194: red de proyectos del cliente a todo el ancho · Proyectos sin agrupar por defecto con desplegables diseñados · logros de grupo/equipo en una fila
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); localStorage.setItem("pxp_pv_v3", JSON.stringify({ group: "cliente", sort: "cliente" })); Object.keys(localStorage).filter(k => /pxp_pv_v4/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
// 1 · ventana de cliente
await page.evaluate(() => pxpOpenClient("PEPSICO")); await page.waitForTimeout(1200);
const net = await page.evaluate(() => { const s = document.querySelector("#pxp-client .pxn-sec"), h = s.querySelector("h3").getBoundingClientRect(), w = s.querySelector(".mm-wrap").getBoundingClientRect(); return { d: getComputedStyle(s).display, tituloArriba: h.bottom <= w.top + 1, ancho: Math.round(w.width / s.getBoundingClientRect().width * 100) }; });
check(`cliente: red con el título arriba y a todo el ancho (${JSON.stringify(net)})`, net.d !== "grid" && net.tituloArriba && net.ancho > 90);
await page.evaluate(() => pxpCloseClient(true));
// 2 · Proyectos
await page.evaluate(() => switchView("projects")); await page.waitForTimeout(1000);
check("sin agrupar por defecto (aunque antes estuviera por cliente)", await page.evaluate(() => /Sin agrupar/.test(document.querySelector(".pvx-grp .dd-btn").textContent) && !document.querySelector("#proj-wrap .pvc-blk")));
await page.click(".pvx-grp .dd-btn"); await page.waitForTimeout(250);
check("Agrupar abre una lista con ✓ en la elegida", await page.evaluate(() => /Sin agrupar/.test(document.querySelector(".dd-pop .dd-o.sel").textContent)));
await page.click(".dd-pop .dd-o >> nth=0"); await page.waitForTimeout(800);
check("elegir Cliente agrupa", await page.evaluate(() => !!document.querySelector("#proj-wrap .pvc-blk")));
await page.click(".pvx-fdd .dd-btn"); await page.waitForTimeout(250);
check("Filtrar por: lista con secciones y buscador", await page.evaluate(() => document.querySelectorAll(".dd-pop .dd-g").length >= 3 && !!document.querySelector(".dd-pop .dd-q")));
await page.fill(".dd-pop .dd-q input", "revis"); await page.waitForTimeout(100);
check("el buscador filtra y esconde secciones vacías", await page.evaluate(() => [...document.querySelectorAll(".dd-pop .dd-g")].filter(g => !g.hidden).length === 1));
await page.keyboard.press("Enter"); await page.waitForTimeout(700);
check("Enter aplica el filtro como etiqueta", (await page.$$(".pvx-tag")).length === 1);
check("Ordenar por también es desplegable diseñado", !!(await page.$(".pvc-sort .dd-btn.sort")));
// 3 · logros en una fila
await page.evaluate(() => { const ps = TEAM.map(t => t.name); let best = null, n = -1; ps.forEach(p => { pxpOpenPerson(p); const c = document.querySelectorAll("#pxp-person .lg-psec .lg-pi").length; if (c > n) { n = c; best = p; } }); pxpOpenPerson(best); }); await page.waitForTimeout(1200);
const fil = await page.evaluate(() => [...document.querySelectorAll("#pxp-person .lg-pb:not(.full)")].map(b => new Set([...b.querySelectorAll(".lg-pi")].filter(x => getComputedStyle(x).display !== "none").map(x => x.offsetTop)).size));
check(`grupo y equipo en una sola fila (${fil})`, fil.length > 0 && fil.every(n => n === 1));
const mas = await page.$("#pxp-person .lg-mas"); check("botón Ver más", !!mas);
if (mas) { await mas.click(); await page.waitForTimeout(600); check("Ver más muestra el resto", await page.evaluate(() => [...document.querySelectorAll("#pxp-person .lg-pb:not(.full)")].some(b => new Set([...b.querySelectorAll(".lg-pi")].map(x => x.offsetTop)).size > 1) || !document.querySelector("#pxp-person .lg-pi.lg-x"))); }
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
