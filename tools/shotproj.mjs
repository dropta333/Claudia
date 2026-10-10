// Captura la ventana de proyecto (o un elemento). Uso: node tools/shotproj.mjs salida.png [clave] [ancho] [usuario] [js-extra] [selector]
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const [out, key, width = "1440", user = "Bastián Torres", extra = "", sel = ""] = process.argv.slice(2);
const b = await pw.chromium.launch(); const ctx = await b.newContext({ viewport: { width: +width, height: 900 } }); const page = await ctx.newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(n => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: n }, "preview"); }, user);
await page.waitForTimeout(1500);
await page.evaluate(() => { for (let i = 0; i < 4; i++) try { pxpLogroCerrar(); } catch (e) { } });
await page.waitForTimeout(500); await page.evaluate(() => { try { pxpLogroCerrar(); } catch (e) { } });
const k = key || await page.evaluate(() => Object.keys(PROJECTS).sort((a, b) => (PROJECTS[b].etapas || []).length - (PROJECTS[a].etapas || []).length)[0]);
await page.evaluate(k => { switchView("projects"); openProjectFicha(k); }, k); await page.waitForTimeout(900);
if (extra) { await page.evaluate(extra); await page.waitForTimeout(700); }
const box = sel || "#pxp-proj .pm-box";
const h = await page.evaluate(s => { const m = document.querySelector(s); return m ? Math.max(m.scrollHeight, m.getBoundingClientRect().height) : 2000; }, box);
await page.setViewportSize({ width: +width, height: Math.min(Math.ceil(h) + 200, 12000) }); await page.waitForTimeout(600);
const el = await page.$(box); if (el) await el.screenshot({ path: out }); else await page.screenshot({ path: out });
console.log("proyecto:", k, "alto:", h, "errores:", errs.length, errs.slice(0, 3).join(" | "));
await b.close();
