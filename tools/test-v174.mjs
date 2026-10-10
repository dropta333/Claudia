// Prueba v174: fusionar y eliminar clientes repetidos
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("traffic"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
await page.evaluate(() => { PROJECTS["CASO OREO SABORES"].cliente = "Mondelez Dup"; META.clientesExtra = [...(META.clientesExtra || []), "Cliente Vacío"]; pxpOpenClient("Mondelez Dup"); }); await page.waitForTimeout(700);
check("opción de fusionar", await page.$("#cl-merge-to") !== null);
await page.selectOption("#cl-merge-to", "MONDELEZ").catch(async () => { const v = await page.$$eval("#cl-merge-to option", o => o.map(x => x.value).find(v => /mondelez/i.test(v))); await page.selectOption("#cl-merge-to", v); });
await page.evaluate(() => pxpClMerge()); await page.waitForTimeout(700);
check("fusionado", await page.evaluate(() => /mondelez/i.test(PROJECTS["CASO OREO SABORES"].cliente) && PROJECTS["CASO OREO SABORES"].cliente !== "Mondelez Dup"));
await page.evaluate(() => { pxpCloseClient(true); pxpOpenClient("Cliente Vacío"); }); await page.waitForTimeout(600); await (await page.$("#pxp-client .cl-save")).screenshot({ path: process.argv[2] + "/v176-cl.png" });
await page.click("#pxp-client .clm-del"); await page.click("#pxp-client .clm-del"); await page.waitForTimeout(700);
check("eliminado", await page.evaluate(() => !(META.clientesExtra || []).includes("Cliente Vacío")));
console.log(JSON.stringify({ ok: ok.length, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
