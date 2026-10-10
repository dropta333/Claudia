// Prueba del estado automático del proyecto (v157)
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const shots = process.argv[2] || ".";
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1500); await page.evaluate(() => { for (let i = 0; i < 4; i++) try { pxpLogroCerrar(); } catch (e) { } });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const K = "PRUEBA ESTADO";
await page.evaluate(k => { PROJECTS[k] = Object.assign(blankProject(k), { nombre: k, estadoGeneral: "en_produccion", fechaInicio: "2026-10-01", etapas: [
  { nombre: "Kickoff", fase: "pre", clase: "proceso", hp: 2, estado: "listo" },
  { nombre: "Rodaje", fase: "rodaje", clase: "proceso", hp: 8, estado: "pendiente" },
  { nombre: "Offline", fase: "post", clase: "proceso", hp: 16, estado: "pendiente" },
  { nombre: "Feedback del cliente", fase: "post", clase: "revision", hp: 4, estado: "pendiente" },
  { nombre: "Entrega final", fase: "post", clase: "entrega", hp: 1, estado: "pendiente" }] }); switchView("projects"); openProjectFicha(k); }, K);
await page.waitForTimeout(700);
const est = () => page.evaluate(k => PROJECTS[k].estadoGeneral, K);
const et = async (i, v) => { await page.evaluate(([i, v]) => pxpEt("estado", i, v), [i, v]); await page.waitForTimeout(250); };
await et(1, "en_curso"); check("rodaje en curso → En rodaje", await est() === "rodaje");
await et(1, "listo"); await et(2, "en_curso"); check("offline en curso → En postproducción", await est() === "en_produccion");
await et(2, "listo"); await et(3, "en_curso"); check("feedback en curso → En revisión", await est() === "revision");
await et(3, "listo"); await et(4, "listo"); check("entrega final lista → Entregado (automático)", await est() === "entregado");
check("aviso para confirmar Aprobado", await page.$("#pxp-proj .ent-conf") !== null);
await page.locator("#pxp-proj .ent-conf").screenshot({ path: shots + "/t-aprobado.png" });
await page.click("#pxp-proj .ent-conf .btn-ghost"); await page.waitForTimeout(300);
check("Todavía no oculta el aviso hoy", await page.$("#pxp-proj .ent-conf") === null);
await et(4, "pendiente"); check("entrega reabierta → sale de Entregado", await est() !== "entregado");
await et(4, "listo"); await page.evaluate(k => { Object.keys(localStorage).filter(x => x.startsWith("pxp_aprobconf_")).forEach(x => localStorage.removeItem(x)); pxpRenderProj(); }, K); await page.waitForTimeout(300);
await page.click("#pxp-proj .ent-conf .ficha-save"); await page.waitForTimeout(500);
check("confirmar → Aprobado (Repositorio)", await est() === "aprobado" && await page.evaluate(k => !!PROJECTS[k].archivadoEn, K));
await et(2, "en_curso"); check("Aprobado no cambia solo", await est() === "aprobado");
await page.evaluate(k => { setEstadoGeneral(k, "en_produccion"); if (!document.querySelector("#pxp-proj.open")) openProjectFicha(k); }, K); await page.waitForTimeout(400); await et(2, "listo"); await et(4, "pendiente");
// a mano: queda fijado y no se mueve; volver a automático
await page.evaluate(k => setEstadoGeneral(k, "rodaje"), K); await page.waitForTimeout(250);
check("cambio a mano distinto → fijado", await page.evaluate(k => !!PROJECTS[k].estadoFijo, K));
await et(3, "en_curso"); check("fijado no cambia", await est() === "rodaje");
await page.evaluate(k => pxpProjSet("estadoAuto", "1"), K); await page.waitForTimeout(300);
check("volver a automático → En revisión", await est() === "revision" && await page.evaluate(k => !PROJECTS[k].estadoFijo, K));
// estados manuales
await page.evaluate(k => setEstadoGeneral(k, "standby"), K); await page.waitForTimeout(250);
await et(2, "en_curso"); check("Standby no cambia solo", await est() === "standby");
await page.evaluate(k => { PROJECTS[k].estadoGeneral = "cotizado"; pxpRenderProj(); }, K); await page.waitForTimeout(300);
await page.click("#pxp-proj button.cfg-b[onclick*=\"'est'\"]"); await page.waitForTimeout(300);
check("Cotizado muestra sugerencia", await page.$("#pxp-proj .est-sug") !== null);
await page.locator("#pxp-proj .cfg").screenshot({ path: shots + "/t-estado.png" });
await page.click("#pxp-proj .est-sug .btn-ghost"); await page.waitForTimeout(400);
check("sugerencia aplicada sin fijar", await est() !== "cotizado" && await page.evaluate(k => !PROJECTS[k].estadoFijo, K));
check("historial registra automático", await page.evaluate(k => PROJECTS[k].historial.some(h => /automático/.test(h.texto)), K));
console.log("OK:", ok.length, ok.join(" · ")); console.log("FALLA:", fail.length, fail.join(" · ")); console.log("errores:", errs.length, errs.slice(0, 5).join(" | "));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
