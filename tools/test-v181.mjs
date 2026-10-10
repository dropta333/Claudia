// Prueba v181: logros y notas de ayuda en inglés; al volver a español todo regresa
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const vista = async (v) => { await page.evaluate(v => switchView(v), v); await page.waitForTimeout(900); return page.evaluate(() => (document.querySelector(".view.active") || document.body).innerText); };
await page.evaluate(() => pxpSetLang ? pxpSetLang("en") : document.querySelector("#lang-tog button:last-child").click()); await page.waitForTimeout(1200);
let t = await vista("logros");  check("logros en inglés", /Clean close/i.test(t) && /Close 8 project stages/i.test(t) && !/Cierre limpio/i.test(t));
const card = await page.$("#view-logros .lg-c, .lg-c"); if (card) { await card.scrollIntoViewIfNeeded(); await card.hover(); await page.waitForTimeout(700); }
const tt = await page.evaluate(() => { const e = document.querySelector("#lg-tt"); return e ? e.innerText : ""; }); check("tarjeta flotante en inglés", !tt || (/What it measures/i.test(tt) && !/Qué mide/i.test(tt)));
t = await vista("horas"); check("notas de horas en inglés", /legal limit of 42 h/.test(t));
t = await vista("capacidad"); check("notas de capacidad en inglés", /Total hours ÷ 42 h/.test(t));
await page.evaluate(() => pxpSetLang ? pxpSetLang("es") : document.querySelector("#lang-tog button:first-child").click()); await page.waitForTimeout(1200);
t = await vista("logros"); check("de vuelta en español", /Cierre limpio/i.test(t) && /Cierra 8 etapas de proyecto/i.test(t) && !/Clean close/i.test(t));
console.log(JSON.stringify({ ok: ok.length, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
