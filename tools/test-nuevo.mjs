// Prueba v161: "Nuevo proyecto" en la ventana del proyecto (borrador invisible hasta crear)
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const shots = process.argv[2] || ".";
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
page.on("dialog", d => d.accept());
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1500); await page.evaluate(() => { for (let i = 0; i < 4; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("projects"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const n0 = await page.evaluate(() => Object.keys(PROJECTS).length);
await page.click("#view-projects .btn-new.proj:visible >> nth=0"); await page.waitForTimeout(700);
check("abre la ventana del proyecto en modo creación", await page.$("#pxp-proj.open .pj-new-name") !== null);
check("estado inicial Cotizado", await page.evaluate(() => Object.getOwnPropertyDescriptor(PROJECTS, "· NUEVO PROYECTO ·").value.estadoGeneral === "cotizado"));
check("tiene características, equipo y etapas", await page.$$eval("#pxp-proj .cfg-f, #pxp-proj #et-wrap, #pxp-proj .mm-wrap, #pxp-proj .mm-grid2", x => x.length) > 3);
await page.fill("#pj-new-name", "Prueba Ventana Nueva"); await page.fill("#pj-new-cli", "NUTRESA"); await page.dispatchEvent("#pj-new-cli", "change");
await page.click("#pxp-proj .mms-l li[data-name] button >> nth=0"); await page.waitForTimeout(500);
check("se puede sumar gente al equipo del borrador", await page.evaluate(() => { const d = Object.getOwnPropertyDescriptor(PROJECTS, "· NUEVO PROYECTO ·").value; return ROLE_FIELDS.some(rf => pxpRolePeople(d, rf.key).length) || (d.pms || []).length > 0; }));
await page.evaluate(() => { pxpEt("add", 0, "post"); }); await page.waitForTimeout(400);
await page.evaluate(() => pxpProjSet("entrega", "2026-11-20")); await page.waitForTimeout(400);
check("el borrador no aparece en la lista ni en los datos", await page.evaluate(n0 => Object.keys(PROJECTS).length === n0 && !JSON.stringify(PROJECTS).includes("NUEVO PROYECTO"), n0));
check("se conservan nombre y cliente al repintar", await page.$eval("#pj-new-name", i => i.value) === "Prueba Ventana Nueva" || await page.evaluate(() => Object.getOwnPropertyDescriptor(PROJECTS, "· NUEVO PROYECTO ·").value.nombre === "PRUEBA VENTANA NUEVA"));
await page.locator("#pxp-proj .pm-box").screenshot({ path: shots + "/t-nuevo.png" });
await page.click("#pxp-proj .pj-new-foot .ficha-save"); await page.waitForTimeout(800);
const p = await page.evaluate(() => { const x = PROJECTS["PRUEBA VENTANA NUEVA"]; return x ? { en: Object.keys(PROJECTS).includes("PRUEBA VENTANA NUEVA"), cli: x.cliente, est: x.estadoGeneral, et: (x.etapas || []).length, ent: x.entregaFinal, b: !!x._borrador } : null; });
check("crea el proyecto con todo lo llenado", p && p.en && p.cli === "NUTRESA" && p.est === "cotizado" && p.et === 1 && p.ent === "2026-11-20" && !p.b);
check("queda abierto el proyecto creado", await page.$eval("#pxp-proj.open #pj-title", h => h.textContent) === "PRUEBA VENTANA NUEVA");
check("sin borrador colgando", await page.evaluate(() => !Object.getOwnPropertyDescriptor(PROJECTS, "· NUEVO PROYECTO ·")));
// nombre repetido
await page.evaluate(() => { pxpCloseProject(); pxpNewProject(); }); await page.waitForTimeout(500);
await page.fill("#pj-new-name", "Prueba Ventana Nueva"); await page.fill("#pj-new-cli", "NUTRESA");
await page.click("#pxp-proj .pj-new-foot .ficha-save"); await page.waitForTimeout(300);
check("avisa si el nombre ya existe", /Ya existe/.test(await page.$eval("#pj-new-err", e => e.textContent)));
// cancelar descarta
await page.click("#pxp-proj .pj-new-foot .btn-ghost"); await page.waitForTimeout(400);
check("cancelar descarta el borrador", await page.evaluate(() => !Object.getOwnPropertyDescriptor(PROJECTS, "· NUEVO PROYECTO ·") && !document.querySelector("#pxp-proj.open")));
// desde la ficha de un cliente: llega con el cliente puesto
await page.evaluate(() => pxpNewProject({ cliente: "Nutresa" })); await page.waitForTimeout(500);
check("desde un cliente llega con el cliente", await page.$eval("#pj-new-cli", i => i.value) === "NUTRESA");
await page.evaluate(() => { window.__pxpDescartar = true; pxpCloseProject(); window.__pxpDescartar = false; });
console.log("OK:", ok.length, ok.join(" · ")); console.log("FALLA:", fail.length, fail.join(" · ")); console.log("errores:", errs.length, errs.slice(0, 5).join(" | "));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
