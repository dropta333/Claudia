// Prueba v172: vista previa del time table más grande y botón Centrar
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
await page.evaluate(() => pxpRepOpen("tt", "CASO OREO SABORES")); await page.waitForTimeout(2500);
const z = await page.$eval("#rp-prev .rz-v", e => e.textContent);
const w = await page.$eval("#rp-prev .rp-page", e => e.getBoundingClientRect().width);
check("100% por defecto (" + z + ", " + Math.round(w) + "px)", z === "100%");
await page.evaluate(() => pxpRpZoom(1)); await page.waitForTimeout(400);
const c = await page.evaluate(() => { const pv = document.querySelector("#rp-prev"); pv.scrollLeft = 0; pxpRpCentrar(); return Math.abs(pv.scrollLeft - (pv.scrollWidth - pv.clientWidth) / 2) < 2; });
check("botón Centrar", c && await page.$("#rp-prev .rz-c") !== null);
await page.evaluate(() => pxpRpZoom(-1)); await page.waitForTimeout(400); await page.screenshot({ path: process.argv[2] + "/v172.png" });
console.log(JSON.stringify({ ok: ok.length, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
