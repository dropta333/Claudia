// Prueba v190: clientes unidos sin importar mayúsculas, nuevo diseño de Reparto/Tipos y desplegables por cliente
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); localStorage.removeItem("pxp_ct_alc"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
// un proyecto con "Mars" y otro con "MARS"
await page.evaluate(() => { const ks = Object.keys(PROJECTS); PROJECTS[ks[0]].cliente = "Mars"; PROJECTS[ks[1]].cliente = "MARS"; PROJECTS[ks[2]].cliente = " mars "; pxpCliModo("anio"); switchView("clientes"); });
await page.waitForTimeout(1200);
const mars = await page.evaluate(() => pxpAnioPorCliente().entries.filter(e => /^mars$/i.test(e.label)));
check(`Mars aparece una sola vez (${JSON.stringify(mars)})`, mars.length === 1 && mars[0].count >= 3);
check("ranking de clientes con barras", (await page.$$("#cli-wrap .rc-l li")).length > 0);
check("donut grande", await page.$eval("#cli-wrap .rcx .rc-d svg", s => s.getBoundingClientRect().width >= 170));
check("tipos en lista con barras", (await page.$$("#cli-wrap .tp-l li")).length >= 5);
const alt = await page.evaluate(() => { const ps = [...document.querySelectorAll("#cli-wrap .pxp-grid > .home-panel")].filter(p => /^(Reparto por cliente|Tipos de proyecto)/.test(p.querySelector(".hp-title").textContent.trim())).map(p => p.getBoundingClientRect()); return ps.map(r => Math.round(r.height)); });
check(`las dos cajas con la misma altura (${alt})`, Math.abs(alt[0] - alt[1]) < 2);
await page.screenshot({ path: "dist/shots/v190-clientes.png", clip: await page.$eval("#cli-wrap .pxp-grid", g => { const r = g.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: 640 }; }), fullPage: true });
// desplegables
const tree = () => page.evaluate(() => ({ n: document.querySelectorAll("#cli-wrap .ctree details.cnode").length, open: document.querySelectorAll("#cli-wrap .ctree details.cnode[open]").length, done: document.querySelectorAll("#cli-wrap .ctree .pchip.done").length, alc: (document.querySelector(".ct-seg button.on") || {}).textContent }));
let t = await tree();
check(`por defecto: activos y abiertos como antes (${JSON.stringify(t)})`, /Activos/.test(t.alc) && t.n > 0 && t.open === t.n);
await page.evaluate(() => pxpCtTodos(false)); await page.click("#cli-wrap .ctree details.cnode summary", { position: { x: 200, y: 50 } }); await page.waitForTimeout(300); t = await tree();
check("tocar un cliente lo despliega", t.open === 1);
check("sin entregados en Activos", (await page.$$eval("#cli-wrap .ctree details[open] .pchip.done", x => x.length)) === 0);
await page.evaluate(() => pxpCtTodos(true)); await page.waitForTimeout(200);
await page.screenshot({ path: "dist/shots/v190-desplegables.png", clip: await page.$eval("#cli-wrap .ctree", g => { const r = g.getBoundingClientRect(); return { x: r.x - 16, y: r.y + scrollY - 70, width: r.width + 32, height: 760 }; }), fullPage: true });
await page.evaluate(() => pxpCtTodos(false));
await page.click(".ct-seg button:nth-child(2)"); await page.waitForTimeout(800); t = await tree();
check(`Todos: más clientes y aparecen entregados (${JSON.stringify(t)})`, /Todos/.test(t.alc));
await page.evaluate(() => pxpCtTodos(true)); await page.waitForTimeout(200); t = await tree(); check("en Todos se ven entregados", t.done > 0);
await page.evaluate(() => { pxpCtAlc("activos"); pxpCtTodos(false); }); await page.waitForTimeout(600);
await page.evaluate(() => document.querySelector("#cli-wrap .ctree summary b").click()); await page.waitForTimeout(600);
check("tocar el nombre abre la ficha del cliente", await page.evaluate(() => !!document.querySelector(".open #cl-name, #cl-name")?.closest(".open")));
await page.evaluate(() => { try { pxpCloseClient(true); } catch (e) { } });
await page.setViewportSize({ width: 390, height: 900 }); await page.waitForTimeout(800);
check("celular: nada se sale", await page.evaluate(() => ![...document.querySelectorAll("#cli-wrap .rc *, #cli-wrap .tp-l *, #cli-wrap .ctree summary")].some(e => e.getBoundingClientRect().right > innerWidth + 1)));
await page.screenshot({ path: "dist/shots/v190-movil.png", fullPage: false });
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
