// Prueba v191: Capacidad en mosaico (sin solaparse, fichas con 3 proyectos) y caja de entregas más corta en la vista personal
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); switchView("capacidad"); }); await page.waitForTimeout(1200);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const solapa = () => page.evaluate(() => { const r = [...document.querySelectorAll("#cap-wrap .cap-mos > .pfc-sec")].map(s => s.getBoundingClientRect()); for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], c = r[j]; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) return true; } return false; });
check("mosaico activo", await page.evaluate(() => !!document.querySelector("#cap-wrap .cap-mos.on")));
check("los grupos no se montan", !(await solapa()));
check("un grupo pequeño sube a llenar un hueco", await page.evaluate(() => { const s = [...document.querySelectorAll("#cap-wrap .cap-mos > .pfc-sec")]; const t = s.map(x => Math.round(x.getBoundingClientRect().top)); return new Set(t).size < s.length; }));
const mx = await page.evaluate(() => Math.max(...[...document.querySelectorAll("#cap-wrap .pfc-proj")].map(p => [...p.querySelectorAll(".pfc-p")].filter(x => getComputedStyle(x).display !== "none").length)));
check(`máximo 3 proyectos visibles por ficha (${mx})`, mx <= 3);
const more = await page.$("#cap-wrap .pfc-more");
if (more) { await more.click(); await page.waitForTimeout(400); check("+N más los muestra", await page.evaluate(() => [...document.querySelector("#cap-wrap .pfc-proj.all").querySelectorAll(".pfc-p")].every(x => getComputedStyle(x).display !== "none"))); check("sigue sin montarse al abrir", !(await solapa())); }
for (const w of [1100, 800, 390]) { await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(600); check(`${w}px: sin montarse ni salirse`, !(await solapa()) && await page.evaluate(() => ![...document.querySelectorAll("#cap-wrap .pfc")].some(e => e.getBoundingClientRect().right > innerWidth + 1))); }
await page.setViewportSize({ width: 1440, height: 1000 });
await page.evaluate(() => { pxpHomeModo("personal"); switchView("home"); }); await page.waitForTimeout(1500);
const vis = await page.evaluate(() => { const p = [...document.querySelectorAll(".home-panel")].find(x => /^Próximas entregas/.test(x.querySelector(".hp-title").textContent)); return p ? [...p.querySelectorAll(".hito")].filter(h => !h.closest("details:not([open])")).length : -1; });
check(`personal: caja de entregas corta (${vis} visibles)`, vis > 0 && vis <= 7);
await page.evaluate(() => { pxpHomeModo("global"); switchView("home"); }); await page.waitForTimeout(1200);
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
