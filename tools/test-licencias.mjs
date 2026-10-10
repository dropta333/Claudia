// Prueba v158: agotadas y vencidas salen de la lista a tiempo y aparecen en la columna Agotadas / Vencidas
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const shots = process.argv[2] || ".";
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1500); await page.evaluate(() => { for (let i = 0; i < 4; i++) try { pxpLogroCerrar(); } catch (e) { } });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
await page.evaluate(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const base = { plataforma: "Higgsfield", usaCreditos: true, estado: "activa", tipo: "Ultra", ciclo: "mensual", fechaCompra: d(-20), marcas: [] };
  META.licencias = [
    Object.assign({}, base, { id: "t-act", operador: "PRUEBA ACTIVA", creditosPct: 70, fechaVence: d(10) }),
    Object.assign({}, base, { id: "t-ag0", operador: "PRUEBA AGOTADA HOY", creditosPct: 0, agotadaEn: new Date().toISOString(), fechaVence: d(10) }),
    Object.assign({}, base, { id: "t-ag4", operador: "PRUEBA AGOTADA VIEJA", creditosPct: 0, agotadaEn: d(-4) + "T10:00:00Z", fechaVence: d(10) }),
    Object.assign({}, base, { id: "t-ve1", operador: "PRUEBA VENCIDA AYER", creditosPct: 40, fechaVence: d(-1) }),
    Object.assign({}, base, { id: "t-ve3", operador: "PRUEBA VENCIDA VIEJA", creditosPct: 40, fechaVence: d(-3) }),
  ];
  switchView("licencias");
});
await page.waitForTimeout(600);
const lista = await page.$$eval("#lic-wrap .lc-list .lc-row h4", h => h.map(x => x.textContent.toUpperCase()));
check("activa en la lista", lista.some(t => t.includes("ACTIVA")));
check("agotada de hoy sigue en la lista", lista.some(t => t.includes("AGOTADA HOY")));
check("agotada de hace 4 días salió", !lista.some(t => t.includes("AGOTADA VIEJA")));
check("vencidas no están en Activas", !lista.some(t => t.includes("VENCIDA")));
const out = await page.$$eval("#lic-wrap .lc-lane.out .lc-bc b", h => h.map(x => x.textContent.toUpperCase()));
check("columna Agotadas / Vencidas existe", await page.$("#lic-wrap .lc-lane.out") !== null);
check("columna: agotada de hoy", out.some(t => t.includes("AGOTADA HOY")));
check("columna: vencida ayer", out.some(t => t.includes("VENCIDA AYER")));
check("columna: sin las archivadas", !out.some(t => t.includes("VIEJA")));
await page.locator("#lic-wrap .lc-lanes").screenshot({ path: shots + "/t-lic-tablero.png" });
await page.evaluate(() => pxpLicF("est", "historial")); await page.waitForTimeout(400);
const hist = await page.$$eval("#lic-wrap .lc-list .lc-row h4", h => h.map(x => x.textContent.toUpperCase()));
check("Historial conserva las archivadas", hist.some(t => t.includes("AGOTADA VIEJA")) && hist.some(t => t.includes("VENCIDA VIEJA")));
await page.evaluate(() => pxpLicPct("t-act", 0)); await page.waitForTimeout(300);
check("marcar 0 % guarda la fecha", await page.evaluate(() => !!META.licencias.find(l => l.id === "t-act").agotadaEn));
await page.evaluate(() => pxpLicPct("t-act", 50)); await page.waitForTimeout(300);
check("recargar borra la fecha", await page.evaluate(() => !META.licencias.find(l => l.id === "t-act").agotadaEn));
console.log("OK:", ok.length, ok.join(" · ")); console.log("FALLA:", fail.length, fail.join(" · ")); console.log("errores:", errs.length, errs.slice(0, 5).join(" | "));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
