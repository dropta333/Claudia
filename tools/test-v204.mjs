// Prueba v204: Team con grupos plegables · Capacidad con encabezados de grupo en barra · Disponibilidad con máximo 4 filas
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1704, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); localStorage.removeItem("pxp_team_cerr"); localStorage.removeItem("pxp_cap_cerr"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); switchView("team"); }); await page.waitForTimeout(1000);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const tm = () => page.evaluate(() => ({ n: document.querySelectorAll("#view-team .team-section").length, c: document.querySelectorAll("#view-team .team-section.tm-closed").length, ch: document.querySelectorAll("#view-team .team-section-title .tm-ch").length }));
let t = await tm(); check(`Team: cada grupo con su flecha (${JSON.stringify(t)})`, t.n > 3 && t.ch === t.n && t.c === 0);
await page.click("#view-team .tm-ch >> nth=0"); await page.waitForTimeout(500); t = await tm();
check("Team: la flecha pliega solo ese grupo y oculta sus personas", t.c === 1 && await page.evaluate(() => { const s = document.querySelector("#view-team .team-section.tm-closed"); return [...s.children].filter(x => !x.classList.contains("team-section-title")).every(x => !x.offsetParent); }));
check("Team: el título sigue abriendo la ventana del grupo (no se rompió)", await page.evaluate(() => !!document.querySelector("#view-team .team-section-title .tst")));
await page.click("#view-team [data-tm=close]"); await page.waitForTimeout(500); t = await tm(); check("Team: Cerrar todos", t.c === t.n);
await page.reload(); await page.waitForTimeout(700); await page.evaluate(() => { window.pxpSaveBase = function () { }; enterApp({ name: "Bastián Torres" }, "preview"); }); await page.waitForTimeout(1800);
await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("team"); }); await page.waitForTimeout(1000);
t = await tm(); check("Team: se recuerda lo plegado", t.c === t.n);
await page.click("#view-team [data-tm=open]"); await page.waitForTimeout(500); t = await tm(); check("Team: Abrir todos", t.c === 0);
check("Team: sin horas registradas en las fichas", await page.evaluate(() => !/\d+h registradas/.test(document.getElementById("view-team").textContent)));
await page.evaluate(() => switchView("capacidad")); await page.waitForTimeout(900);
const cap = await page.evaluate(() => { const h = document.querySelector("#cap-wrap .pfc-gh.gh2"); return h ? { av: h.querySelectorAll(".gh-av > *").length, txt: h.querySelector(".gh-m").textContent, alto: Math.round(h.getBoundingClientRect().height) } : null; });
check(`Capacidad: encabezado en barra con avatares y resumen (${JSON.stringify(cap)})`, cap && cap.av > 0 && /personas? · \d+ h en cola/.test(cap.txt) && cap.alto >= 44);
await page.click("#cap-wrap .grp-links button >> nth=0"); await page.waitForTimeout(600);
const cc = await page.evaluate(() => [...document.querySelectorAll("#cap-wrap .gh-n")].every(n => n.scrollWidth <= n.clientWidth + 1));
check("Capacidad cerrada: los nombres de grupo se leen completos", cc);
await page.click("#cap-wrap .grp-links button >> nth=1"); await page.waitForTimeout(300);
await page.evaluate(() => switchView("dashboard")); await page.waitForTimeout(1000);
const lb = await page.evaluate(() => [...document.querySelectorAll("#dash-wrap .lb-col")].map(c => { const l = c.querySelector(".lb-list"); const tops = new Set([...c.querySelectorAll(".lb-chip")].filter(x => x.offsetParent).map(x => Math.round(x.getBoundingClientRect().top))); return { filas: tops.size, tot: c.querySelectorAll(".lb-chip").length, btn: !!c.querySelector(".lb-more") }; }));
check(`Disponibilidad: máximo 4 filas por columna (${JSON.stringify(lb)})`, lb.every(x => x.filas <= 4));
const more = await page.$("#dash-wrap .lb-more"); if (more) { await more.click(); await page.waitForTimeout(300); check("Disponibilidad: Ver más muestra a todos", await page.evaluate(() => { const c = document.querySelector("#dash-wrap .lb-more").closest(".lb-col"); return [...c.querySelectorAll(".lb-chip")].every(x => x.offsetParent); })); }
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
