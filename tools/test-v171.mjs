// Prueba v168: semáforo en Tráfico, notas con foto integrada, filas de inicio/entrega y marcas del cronograma
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
await page.waitForTimeout(900);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const K = "CASO OREO SABORES";
const ix = await page.evaluate(k => { const p = PROJECTS[k]; p.fechaInicio = "2026-09-16"; p.entregaFinal = "2026-10-20"; p.bloqueos = []; const E = p.etapas || []; let i = E.findIndex(e => pxpClaseEtapa(e) === "entrega" && e.estado !== "listo"); if (i < 0) { E.push({ nombre: "Entrega al cliente", estado: "pendiente", fecha: "2026-10-20" }); p.etapas = E; i = E.length - 1; } else E[i].estado = "pendiente"; openProjectFicha(k); return i; }, K); await page.waitForTimeout(900);
check("botón bloquear en entrega", await page.$$eval("#et-wrap .et-bq", x => x.length) >= 1);
await page.evaluate(i => pxpEt("bloquear", i), ix); await page.waitForTimeout(500);
check("bloqueado", await page.evaluate(k => PROJECTS[k].bloqueos.filter(b => !b.fin).length === 1, K) && await page.$("#et-wrap button.et-bq.on") !== null);
await page.click("#et-wrap button.et-bq.on"); await page.waitForTimeout(500);
check("desbloqueado con un toque", await page.evaluate(k => PROJECTS[k].bloqueos.filter(b => !b.fin).length === 0 && PROJECTS[k].bloqueos.length === 1, K));
const L = await page.$$eval("#et-gantt .cr-mk .mk", x => { const m = x.find(e => /Entrega/.test(e.textContent)); return m ? parseFloat(m.style.left) : 999; });
check("línea de entrega separada del borde (" + L.toFixed(1) + "%)", L < 97);
console.log(JSON.stringify({ ok: ok.length, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
