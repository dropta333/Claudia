// Capturas de referencia de todas las pestañas y ventanas (claro y oscuro) para comparar antes/después
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path"; import fs from "node:fs";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const b = await pw.chromium.launch(); const errs = [];
for (const scheme of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme }); const page = await ctx.newPage();
  page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(() => { const F = 1791612000000; Date.now = () => F; const OD = Date; window.Date = class extends OD { constructor(...a) { super(...(a.length ? a : [F])); } static now() { return F; } }; Math.random = () => .42; });
  await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
  await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
  await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } });
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
  for (const v of ["home", "dashboard", "traffic", "projects", "team", "clients", "capacidad", "horas", "reportes", "licencias", "logros", "repositorio"]) {
    await page.evaluate(v => { try { switchView(v); } catch (e) { } window.scrollTo(0, 0); }, v); await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${scheme}-${v}.png`, fullPage: true });
  }
  const modal = async (name, fn) => { await page.evaluate(fn); await page.waitForTimeout(1100); await page.screenshot({ path: `${out}/${scheme}-m-${name}.png` }); await page.evaluate(() => { document.querySelectorAll(".open").forEach(e => e.classList.remove("open")); }); await page.waitForTimeout(300); };
  await modal("proyecto", () => openProjectFicha("CASO OREO SABORES"));
  await modal("cliente", () => pxpOpenClient("MONDELEZ"));
  await modal("nuevoproy", () => pxpNewProject({}));
  await modal("nuevocli", () => pxpNewClient());
  await modal("reporte", () => pxpRepOpen("project", "CASO OREO SABORES"));
  await ctx.close();
}
console.log("capturas listas", errs.slice(0, 3)); await b.close();
