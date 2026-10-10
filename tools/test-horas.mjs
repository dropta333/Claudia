// Prueba v162: horas reales en la etapa (− N h + Registrar) y estimado automático editable
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const shots = process.argv[2] || ".";
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1500); await page.evaluate(() => { for (let i = 0; i < 4; i++) try { pxpLogroCerrar(); } catch (e) { } });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const K = "CASO OREO SABORES";
await page.evaluate(k => { const E = PROJECTS[k].etapas; pxpSetResps(E[0], ["Bastián Torres", "Andrea López"]); E[0].horas = [{ id: "a1", user: "ANDREA LÓPEZ", fecha: "2026-10-01", h: 5, ts: "x" }]; switchView("projects"); openProjectFicha(k); }, K);
await page.waitForTimeout(800);
const row = '.et-row[data-i="0"]';
check("tiene − N h + Registrar", await page.$(`${row} .hq .hq-go`) !== null);
await page.click(`${row} .hq button[aria-label="Más horas"]`); await page.click(`${row} .hq button[aria-label="Más horas"]`); await page.waitForTimeout(150);
check("el contador sube a 3", await page.$eval(`${row} .hq-n`, b => b.textContent.trim()) === "3");
await page.locator(`${row} .et-bot`).screenshot({ path: shots + "/t-horas-celda.png" });
await page.click(`${row} .hq-go`); await page.waitForTimeout(500);
const reg = await page.evaluate(k => PROJECTS[k].etapas[0].horas.filter(h => /BAST/i.test(h.user)).map(h => h.h), K);
check("registra 3 h a mi nombre hoy", reg.length === 1 && reg[0] === 3);
check("muestra quién registró", /Andrea/.test(await page.$eval(`${row} .hq-who`, w => w.textContent)) );
// estimado automático y editable
const idx = await page.evaluate(k => { const E = PROJECTS[k].etapas; pxpEt("add", 0, "post"); return E.findIndex(e => e.hpAuto && !e.nombre); }, K); await page.waitForTimeout(400);
await page.fill(`.et-row[data-i="${idx}"] .et-name`, "Corrección de color"); await page.dispatchEvent(`.et-row[data-i="${idx}"] .et-name`, "change"); await page.waitForTimeout(400);
check("estimado automático por nombre (color = 8 h)", await page.evaluate(([k, i]) => PROJECTS[k].etapas[i].hp === 8 && PROJECTS[k].etapas[i].hpAuto, [K, idx]));
await page.fill(`.et-row[data-i="${idx}"] .et-name`, "Offline · primer corte"); await page.dispatchEvent(`.et-row[data-i="${idx}"] .et-name`, "change"); await page.waitForTimeout(400);
check("cambia con el nombre (offline = 24 h)", await page.evaluate(([k, i]) => PROJECTS[k].etapas[i].hp === 24, [K, idx]));
await page.click(`.et-row[data-i="${idx}"] .et-est`); await page.waitForTimeout(300);
await page.screenshot({ path: shots + "/t-horas-est.png", clip: await page.evaluate(() => { const r = document.querySelector(".pk-est").getBoundingClientRect(); return { x: Math.max(0, r.left - 300), y: Math.max(0, r.top - 120), width: 760, height: r.height + 200 }; }) });
await page.click('.pk-est .hq button[aria-label="Menos horas"]'); await page.waitForTimeout(400);
check("bajar el estimado lo deja manual (20 h)", await page.evaluate(([k, i]) => PROJECTS[k].etapas[i].hp === 20 && !PROJECTS[k].etapas[i].hpAuto, [K, idx]));
await page.click(".pk-est .em-auto"); await page.waitForTimeout(400);
check("volver a automático", await page.evaluate(([k, i]) => PROJECTS[k].etapas[i].hp === 24 && PROJECTS[k].etapas[i].hpAuto, [K, idx]));
console.log("OK:", ok.length, ok.join(" · ")); console.log("FALLA:", fail.length, fail.join(" · ")); console.log("errores:", errs.length, errs.slice(0, 5).join(" | "));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
