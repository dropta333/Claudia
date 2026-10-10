// Prueba v160: reacciones en las notas (elegir, cambiar, quitar, varias personas, quién reaccionó, mezcla a tres vías)
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const shots = process.argv[2] || ".";
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1500); await page.evaluate(() => { for (let i = 0; i < 4; i++) try { pxpLogroCerrar(); } catch (e) { } });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const K = "CASO OREO SABORES", TS = "2026-10-09T15:00:00.000Z";
await page.evaluate(([k, ts]) => { const p = PROJECTS[k]; p.historial = p.historial || []; p.historial.push({ ts, usuario: "Laura Sierra", texto: "Subí el corte V2 con los ajustes de color. ¿Lo revisan?", tipo: "nota", reac: { "JULIANA CANAL": { r: "aprobado", n: "JULIANA CANAL", ts: "2026-10-09T16:00:00Z" }, "ANDREA LOPEZ": { r: "visto", n: "ANDREA LÓPEZ", ts: "2026-10-09T16:10:00Z" } } }); switchView("projects"); openProjectFicha(k); }, [K, TS]);
await page.waitForTimeout(800);
const nota = () => page.evaluate(([k, ts]) => PROJECTS[k].historial.find(h => h.ts === ts), [K, TS]);
check("muestra las reacciones existentes", await page.$$eval(".rx-chip", c => c.length) === 2);
await page.click(".rx-add"); await page.waitForTimeout(400);
check("abre el selector con 6 reacciones", await page.$$eval(".rx-pick .rx-op", c => c.length) === 6);
await page.hover(".rx-pick .rx-op:nth-child(5)"); await page.waitForTimeout(300);
await page.screenshot({ path: shots + "/t-rx-pick.png", clip: await page.evaluate(() => { const r = document.querySelector(".rx-pick").getBoundingClientRect(); return { x: Math.max(0, r.left - 260), y: Math.max(0, r.top - 70), width: 760, height: 260 }; }) });
await page.click(".rx-pick .rx-op:nth-child(5)"); await page.waitForTimeout(400);
let n = await nota(); check("mi reacción: Me encanta", n.reac["BASTIAN TORRES"] && n.reac["BASTIAN TORRES"].r === "encanta");
check("se cierra el selector", await page.$(".rx-pick") === null);
await page.click('.rx-chip[data-r="aprobado"]'); await page.waitForTimeout(400);
n = await nota(); check("tocar otra reacción la reemplaza", n.reac["BASTIAN TORRES"].r === "aprobado" && Object.keys(n.reac).length === 3);
await page.hover('.rx-chip[data-r="aprobado"]'); await page.waitForTimeout(300);
const card = await page.$eval(".rx-card", c => c.textContent);
check("al pasar el mouse se ve quién reaccionó", /Juliana Canal/.test(card) && /Bastián Torres|BASTIÁN TORRES|Bastian/i.test(card));
await page.screenshot({ path: shots + "/t-rx-card.png", clip: await page.evaluate(() => { const r = document.querySelector(".rx-card").getBoundingClientRect(), c = document.querySelector('.rx-chip[data-r="aprobado"]').getBoundingClientRect(); const y = Math.min(r.top, c.top) - 20; return { x: Math.max(0, Math.min(r.left, c.left) - 280), y: Math.max(0, y), width: 760, height: Math.max(r.bottom, c.bottom) - y + 120 }; }) });
await page.click('.rx-chip[data-r="aprobado"]'); await page.waitForTimeout(400);
n = await nota(); check("tocar la misma la quita", !n.reac["BASTIAN TORRES"]);
// mezcla a tres vías: dos personas reaccionan a la vez
// (la mezcla solo existe con el servidor de Netlify: se carga una página aparte con ese modo)
const p2 = await (await b.newContext()).newPage(); await p2.addInitScript(() => { window.PXP_BACKEND = "netlify"; });
await p2.goto("file://" + path.resolve("dist/preview.html")); await p2.waitForTimeout(800);
const m = await p2.evaluate(() => { if (!window.pxpMerge3) return "sin mezcla"; const base = { reac: { A: { r: "ok" } } }, loc = { reac: { A: { r: "ok" }, B: { r: "visto" } } }, srv = { reac: { A: { r: "ok" }, C: { r: "gracias" } } }; return Object.keys(pxpMerge3(base, loc, srv).reac).sort().join(","); });
check("mezcla: se suman reacciones simultáneas", m === "A,B,C");
await page.locator(".pj-notes .pj-note").first().screenshot({ path: shots + "/t-rx-nota.png" });
console.log("OK:", ok.length, ok.join(" · ")); console.log("FALLA:", fail.length, fail.join(" · ")); console.log("errores:", errs.length, errs.slice(0, 5).join(" | "));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
