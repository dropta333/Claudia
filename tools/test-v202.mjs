// Prueba v201–v202: la ficha no repite inicio/entrega · ventana de rodajes con su estilo · nombres con mayúscula inicial y foto centrada con nombre y cargo
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1253, height: 960 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
await page.evaluate(() => openProjectFicha(Object.keys(PROJECTS)[0])); await page.waitForTimeout(1200);
const ks = await page.evaluate(() => [...document.querySelectorAll(".cfg-sum .cs-k")].map(x => x.textContent));
check(`ficha: sin Inicio ni Entrega final repetidos (${ks})`, !ks.includes("Inicio") && !ks.includes("Entrega final") && ks.includes("Duración"));
await page.evaluate(() => { document.querySelectorAll(".open").forEach(e => e.classList.remove("open")); showRodajesResumen(); }); await page.waitForTimeout(500);
const rj = await page.evaluate(() => ({ ov: document.getElementById("resumen-overlay").classList.contains("rj-ov"), cards: document.querySelectorAll(".rj-c").length, sem: document.querySelectorAll(".rj-sem").length, fecha: !!document.querySelector(".rj-d b"), tit: [...document.querySelectorAll(".rj-t h5")].map(h => h.textContent) }));
check(`rodajes: tarjetas por semana con fecha (${JSON.stringify(rj).slice(0, 160)})`, rj.ov && rj.cards > 0 && rj.sem > 0 && rj.fecha && !rj.tit.some(t => /^RODAJE /i.test(t) || /(lunes|martes|jueves|viernes)$/i.test(t)));
await page.evaluate(() => { closeResumen(); showPersonas(); }); await page.waitForTimeout(600);
const eq = await page.evaluate(() => { const c = document.querySelector(".psc"); const av = c.querySelector(".psc-av").getBoundingClientRect(), t = c.querySelector(".psc-t").getBoundingClientRect(), m = c.querySelector(".psc-m").getBoundingClientRect(); return { n: c.querySelector("h4").textContent, centro: Math.abs((av.top + av.bottom) / 2 - (t.top + t.bottom) / 2) < 6, abajo: m.top >= Math.max(av.bottom, t.bottom) - 2 }; });
check(`equipo: nombre con mayúscula inicial (${eq.n})`, /^\p{Lu}\p{Ll}/u.test(eq.n));
check("equipo: foto centrada con nombre y cargo; etiquetas debajo", eq.centro && eq.abajo);
check("pxpNombreBonito", await page.evaluate(() => pxpNombreBonito("JUAN DE LA CRUZ") === "Juan de la Cruz" && pxpNombreBonito("María López") === "María López"));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
