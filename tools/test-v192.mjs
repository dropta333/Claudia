// Prueba v192: Proyectos en vista personal no se llena con todo al plegar/filtrar · Tráfico sin reacomodo sin fin · Clientes con el diseño de antes + desplegable
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
// 1 · vista personal en Proyectos
await page.evaluate(() => { pxpHomeModo("personal"); pvAlcance("todos"); switchView("projects"); }); await page.waitForTimeout(1200);
const nCards = () => page.evaluate(() => document.querySelectorAll("#proj-wrap .pvc").length);
const base = await nCards(), total = await page.evaluate(() => Object.keys(PROJECTS).length);
check(`personal: solo sus proyectos (${base} de ${total})`, base > 0 && base < total);
await page.evaluate(() => { const g = document.querySelector("#proj-wrap [onclick^=\"pvToggle(\"]"); g && g.click(); }); await page.waitForTimeout(600);
await page.evaluate(() => { const g = document.querySelector("#proj-wrap [onclick^=\"pvToggle(\"]"); g && g.click(); }); await page.waitForTimeout(600);
check(`plegar y desplegar un grupo no trae todos (${await nCards()})`, (await nCards()) <= base);
await page.evaluate(() => pvSet("search", "a")); await page.waitForTimeout(600);
check(`buscar no trae todos (${await nCards()})`, (await nCards()) <= base);
await page.evaluate(() => { pvSet("search", ""); pvAll(false); }); await page.waitForTimeout(600);
check(`abrir todos los grupos no trae todos (${await nCards()})`, (await nCards()) <= base);
await page.evaluate(() => { pvAlcance("activos"); pxpHomeModo("global"); switchView("traffic"); }); await page.waitForTimeout(1200);
// 2 · Tráfico: el mosaico se queda quieto
const mov = await page.evaluate(() => new Promise(r => { let n = 0; const g = document.getElementById("main-grid"); const mo = new MutationObserver(ms => ms.forEach(m => { if (m.target.parentElement === g) n++; })); mo.observe(g, { attributes: true, subtree: true, attributeFilter: ["style"] }); setTimeout(() => { mo.disconnect(); r(n); }, 1000); }));
check(`tráfico: no se reacomoda sin parar (${mov} cambios en 1 s)`, mov === 0);
await page.evaluate(() => switchView("home")); await page.setViewportSize({ width: 1000, height: 900 }); await page.waitForTimeout(500); await page.evaluate(() => switchView("traffic")); await page.waitForTimeout(800);
const ov = await page.evaluate(() => { const r = [...document.querySelectorAll("#main-grid > .card.tcard")].filter(e => getComputedStyle(e).display !== "none").map(e => e.getBoundingClientRect()); let o = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], c = r[j]; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) o++; } return o; });
check("tráfico: tras cambiar el tamaño en otra pestaña, sin fichas montadas", ov === 0);
await page.setViewportSize({ width: 1440, height: 1000 });
// 3 · Clientes: diseño de antes
await page.evaluate(() => switchView("clientes")); await page.waitForTimeout(1000);
const cl = await page.evaluate(() => { const t = document.querySelector("#cli-wrap .ctree"); const d = [...t.querySelectorAll("details.cnode")]; const xs = new Set(d.map(x => Math.round(x.getBoundingClientRect().left))); return { cols: xs.size, open: d.every(x => x.open), logo: Math.round(t.querySelector(".cn-h .cav .av").getBoundingClientRect().width), marca: !!t.querySelector(".mnode .mn") }; });
check(`clientes: 3 columnas, abiertos, logo grande y marcas (${JSON.stringify(cl)})`, cl.cols === 3 && cl.open && cl.logo >= 60 && cl.marca);
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
