// Prueba v208: Tráfico no se desacomoda al repintar (semana, búsqueda, idioma, tema)
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); Object.keys(localStorage).filter(k => /pxp_hm_mis_/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); switchView("traffic"); }); await page.waitForTimeout(1000);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const ov = () => page.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => { const r = [...document.querySelectorAll("#main-grid > .card")].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()); let o = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], c = r[j]; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) o++; } res(o); }))));
for (const [n, f] of [["semana anterior", () => setWeek(currentWeek - 1)], ["semana siguiente", () => setWeek(currentWeek + 1)], ["buscar", () => pxpTrfQ("a")], ["borrar búsqueda", () => pxpTrfQ("")], ["repintar", () => render(currentWeek)], ["tema", () => toggleTheme()]]) {
  await page.evaluate(f); await page.waitForTimeout(40);
  check(`Tráfico: ${n} → sin fichas montadas ni un instante`, (await ov()) === 0);
}
await page.evaluate(() => pxpHomeModo("global"));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
