// Prueba v206: cabecera del perfil (cargo destacado, acciones con ícono sobre la foto) · leyenda de la red en una sola línea
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); pxpOpenPerson("NICOLAS BELTRA"); }); await page.waitForTimeout(1500);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const h = await page.evaluate(() => { const h = document.querySelector("#pxp-person .pm-head"); return { rol: (h.querySelector(".ph-role-t") || {}).textContent, grp: !!h.querySelector(".ph-grp"), pen: !!h.querySelector(".ph-pen"), cam: !!h.querySelector(".ph-avw .ph-act"), links: [...h.querySelectorAll(".pm-links .linkbtn")].length, fs: parseFloat(getComputedStyle(h.querySelector(".ph-role-t")).fontSize) }; });
check(`perfil: cargo destacado con grupo y lápiz (${JSON.stringify(h)})`, h.rol && h.grp && h.pen && h.fs >= 16);
check("perfil: cambiar foto como ícono sobre la foto (sin enlaces sueltos)", h.cam && h.links === 0);
await page.click("#pxp-person .ph-pen"); await page.waitForTimeout(200);
check("el lápiz abre la edición del cargo", await page.evaluate(() => !document.querySelector("#pxp-person .pm-role-ed").hidden));
const l = await page.evaluate(() => { const l = document.querySelector("#pxp-person .nx-leg"); return l ? { h: Math.round(l.getBoundingClientRect().height), info: !!l.querySelector(".nx-info[data-tip]"), nota: !!document.querySelector("#pxp-person .pxn-sec p.note") } : null; });
check(`red: leyenda en una línea con ? (${JSON.stringify(l)})`, l && l.h < 50 && l.info && !l.nota);
check("admin: ve el tipo de integrante", await page.evaluate(() => !!document.querySelector("#pxp-person .pm-tm")));
await page.evaluate(() => { document.querySelectorAll(".open").forEach(e => e.classList.remove("open")); enterApp({ name: "Lady Silva" }, "preview"); }); await page.waitForTimeout(1500);
await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpOpenPerson("NICOLAS BELTRA"); }); await page.waitForTimeout(1200);
check("usuario sin permisos: no ve el tipo de integrante", await page.evaluate(() => !!document.querySelector("#pxp-person.open") && !document.querySelector("#pxp-person .pm-tm") && !/Tipo de integrante/.test(document.getElementById("pxp-person").textContent)));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
