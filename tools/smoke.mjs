// Smoke: recorre todas las vistas como admin y como creativo, en escritorio y celular.
// Uso: node tools/smoke.mjs [dist/preview.html] [carpeta-capturas]
import { createRequire } from "node:module"; import { execSync } from "node:child_process";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const { chromium } = pw;
import path from "node:path"; import fs from "node:fs";
const file = path.resolve(process.argv[2] || "dist/preview.html");
const shots = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const USERS = [["admin", "Bastián Torres"], ["creativo", "David Daza"]];
const VPS = [["desk", { width: 1440, height: 900 }], ["movil", { width: 390, height: 844 }]];
const browser = await chromium.launch();
let total = 0;
for (const [rol, name] of USERS) for (const [vp, size] of VPS) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = [];
  page.on("pageerror", e => errs.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/net::ERR_FILE_NOT_FOUND|Failed to load resource/.test(m.text())) errs.push("console: " + m.text()); });
  await page.goto("file://" + file); await page.waitForTimeout(800);
  await page.evaluate(n => { window.pxpSaveBase = function () { }; enterApp({ name: n }, "preview"); }, name);
  await page.waitForTimeout(1200);
  // La celebración de logros tapa las capturas: se cierra (y queda marcada como vista) antes de recorrer.
  const cerrarLogros = async () => { for (let i = 0; i < 6; i++) { const open = await page.evaluate(() => { const f = document.getElementById("lg-fest"); return !!(f && !f.hidden); }); if (!open) return; await page.evaluate(() => window.pxpLogroCerrar && pxpLogroCerrar()); await page.waitForTimeout(400); } };
  await cerrarLogros();
  const views = await page.$$eval("#tab-nav .tab-btn", bs => bs.filter(b => b.offsetParent !== null).map(b => b.dataset.view));
  const overflow = [];
  for (const v of views) {
    await page.evaluate(v => switchView(v), v); await page.waitForTimeout(500);
    const ow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ow > 1) overflow.push(`${v}(+${ow}px)`);
    await cerrarLogros();
    if (shots) await page.screenshot({ path: `${shots}/${rol}-${vp}-${v}.png` });
  }
  // ventana de proyecto
  const pk = await page.evaluate(() => Object.keys(PROJECTS)[0]);
  await page.evaluate(k => { switchView("projects"); openProjectFicha(k); }, pk); await page.waitForTimeout(800);
  const owp = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (owp > 1) overflow.push(`ficha(+${owp}px)`);
  if (shots) await page.screenshot({ path: `${shots}/${rol}-${vp}-ficha.png` });
  console.log(`${rol.padEnd(8)} ${vp.padEnd(5)} vistas=${views.length} errores=${errs.length}${overflow.length ? " desborde=" + overflow.join(",") : ""}`);
  errs.slice(0, 8).forEach(e => console.log("   · " + e.slice(0, 220)));
  total += errs.length; await ctx.close();
}
await browser.close();
console.log(total ? `SMOKE: ${total} errores` : "SMOKE OK · 0 errores");
process.exit(total ? 1 : 0);
