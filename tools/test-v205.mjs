// Prueba v205: Team sin "esta semana"/horas y botones en orden · las fotos conservan su forma al esconder/mostrar en Capacidad y Horas
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1520, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); localStorage.removeItem("pxp_team_cerr"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); switchView("team"); }); await page.waitForTimeout(1000);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
check("Team: sin 'esta semana' ni horas registradas", await page.evaluate(() => !/esta semana|registradas/.test(document.getElementById("team-wrap").textContent)));
check("Team: de derecha a izquierda Nuevo miembro, Nuevo grupo, Cerrar/Abrir todos", await page.evaluate(() => { const x = (q) => document.querySelector("#view-team .vh > " + q).getBoundingClientRect().left; return x(".btn-new.mem") > x(".tm-bar") && x(".tm-bar") > x(".tm-fold"); }));
const formas = (sel) => page.evaluate((sel) => { const a = [...document.querySelectorAll(sel)]; return { n: a.length, shp: a.filter(x => x.classList.contains("shp")).length }; }, sel);
for (const [v, w] of [["capacidad", "#cap-wrap"], ["horas", "#horas-wrap"]]) {
  await page.evaluate(v => { switchView(v); if (v === "capacidad") pxpCapVista("tabla"); }, v); await page.waitForTimeout(900);
  await page.evaluate(v => { pxpGrp(v, "all", 1); pxpGrp(v, "all", 0); pxpGrp(v, "all", 1); }, v); await page.waitForTimeout(400);
  const f = await formas(`${w} tr.pv-g .avstack .av`);
  check(`${v}: las fotos conservan la forma del grupo tras esconder/mostrar (${f.shp}/${f.n})`, f.n > 0 && f.shp === f.n);
  await page.evaluate(v => { pxpGrp(v, "all", 0); if (v === "capacidad") pxpCapVista("fichas"); }, v);
}
check("Capacidad: la barra no se sale de la pantalla", await page.evaluate(() => { switchView("capacidad"); return ![...document.querySelectorAll("#cap-wrap .grp-bar *")].some(e => e.getBoundingClientRect().right > innerWidth + 1); }));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
