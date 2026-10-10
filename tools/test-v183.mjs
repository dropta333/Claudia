// Prueba v183: perfil de persona reordenado, notas con "Ver más", 5 formas y 3 colores nuevos, carga próxima en el Home personal
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
// 1 · perfil de la persona
await page.evaluate(() => pxpOpenPerson("María Camila Cabrera")); await page.waitForTimeout(1200);
const lay = await page.evaluate(() => { const b = document.querySelector("#pxp-person .pm-body"), a = b.querySelector(":scope > .pp-cols:not(.pp-b)"), c = a.querySelectorAll(":scope > .ppc"), cr = b.querySelector(":scope > .pc-sec");
  return { izq: (c[0].querySelector("h3") || {}).textContent, der: (c[1].querySelector("h3") || {}).textContent, cron: !!cr && cr.getBoundingClientRect().width > b.getBoundingClientRect().width * .8, vacios: b.querySelectorAll(":scope > .pp-cols").length }; });
check("perfil: proyectos arriba a la izquierda", /Sus proyectos/.test(lay.izq)); check("perfil: etapas arriba a la derecha", /Etapas/.test(lay.der));
check("perfil: cronograma abajo a todo el ancho", lay.cron); check("perfil: sin contenedores vacíos", lay.vacios === 2);
await page.evaluate(() => document.querySelectorAll(".open").forEach(e => e.classList.remove("open")));
// 2 · notas
const K = "CASO OREO SABORES";
await page.evaluate(k => { const p = PROJECTS[k]; p.historial = (p.historial || []).concat([1, 2, 3, 4, 5].map(i => ({ ts: `2026-10-0${i}T10:00:00.000Z`, usuario: "Andrea López", texto: "Nota " + i, tipo: "nota" }))); openProjectFicha(k); }, K); await page.waitForTimeout(900);
const vis = await page.$$eval("#pxp-proj .pj-notas > .pj-notes > .pj-note", x => x.length);
check(`notas: se ven 2 (${vis})`, vis === 2);
const sum = await page.$eval("#pxp-proj .pj-nmore summary", e => e.innerText).catch(() => "");
check("notas: botón Ver más", /Ver \d+ notas más/.test(sum));
await page.click("#pxp-proj .pj-nmore summary"); await page.waitForTimeout(300);
check("notas: al abrir se ven todas", await page.$$eval("#pxp-proj .pj-nmore[open] .pj-note", x => x.length) >= 3);
await page.evaluate(() => document.querySelectorAll(".open").forEach(e => e.classList.remove("open")));
// 3 · formas y colores
const g = await page.evaluate(() => { const nombre = Object.keys((window.pxpGruposLista ? pxpGruposLista() : []).reduce((o, x) => (o[x.key || x] = 1, o), {}))[0]; return nombre; });
const fr = await page.evaluate(() => ["hepta", "kite", "para", "burst", "arch"].map(f => window.pxpShapeSvg(f, 12, 12, 8, "x", "").length > 20));
check("formas nuevas se dibujan", fr.every(Boolean));
const css = await page.evaluate(() => { const d = document.createElement("span"); d.className = "av"; d.dataset.sh = "burst"; document.body.appendChild(d); const v = getComputedStyle(d).getPropertyValue("--sh"); d.remove(); return v; });
check("formas nuevas en los avatares", /polygon/.test(css));
// 4 · Home personal
await page.evaluate(() => { pxpHomeModo("personal"); switchView("home"); }); await page.waitForTimeout(1200);
check("Home personal: tarjeta Mi carga", await page.evaluate(() => /Mi carga/.test(document.querySelector("#view-home, #home-wrap").innerText)));
console.log(JSON.stringify({ ok: ok.length, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
