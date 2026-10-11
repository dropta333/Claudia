// Prueba v208: Tráfico no se desacomoda al repintar (semana, búsqueda, idioma, tema) · Home personal con "Mis gráficas" plegable
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
await page.evaluate(() => { try { localStorage.removeItem("pxp_hm_mis_" + normName(currentUser)); } catch (e) { } pxpHomeModo("personal"); switchView("home"); }); await page.waitForTimeout(1500);
const st = () => page.evaluate(() => { const m = document.querySelector("#home-wrap .hm-more[data-k]"); const t = [...document.querySelectorAll("#home-wrap .ps-tile")]; return m ? { on: m.dataset.on, enCol: !!m.closest(".ht-col"), vis: t.filter(x => x.offsetParent).length, n: t.length, tilesEnCol: t.every(x => x.closest(".ht-col")) } : null; });
let s = await st(); check(`Home personal: gráficas en el mosaico como antes, visibles (${JSON.stringify(s)})`, s && s.on === "1" && s.vis > 0 && s.tilesEnCol && s.enCol);
check("Home personal: sin hueco grande bajo la columna más corta", await page.evaluate(() => { const cs = [...document.querySelectorAll("#home-wrap .home-tiles > .ht-col")]; if (cs.length < 2) return true; const h = cs.map(c => c.offsetHeight); return Math.max(...h) - Math.min(...h) < 420; }));
await page.click("#home-wrap .hm-more[data-k] .hm-more-b"); await page.waitForTimeout(600); s = await st();
check(`Home personal: Ocultar quita las gráficas (${JSON.stringify(s)})`, s && s.on === "0" && s.n === 0 && s.enCol);
await page.evaluate(() => { pxpHomeModo("global"); pxpHomeModo("personal"); switchView("home"); }); await page.waitForTimeout(1200); s = await st();
check("Home personal: se recuerda oculto", s && s.on === "0");
await page.click("#home-wrap .hm-more[data-k] .hm-more-b"); await page.waitForTimeout(600); s = await st();
check("Home personal: Mostrar las devuelve", s && s.on === "1" && s.vis > 0);
await page.evaluate(() => { pxpHomeModo("global"); switchView("team"); }); await page.waitForTimeout(1000);
const tm = await page.evaluate(() => { const r = [...document.querySelectorAll("#view-team .team-row")].filter(x => x.offsetParent); return r.map(x => { const a = x.querySelector(".team-name .av").getBoundingClientRect(), n = x.querySelector(".team-name").getBoundingClientRect(), sk = x.querySelector(".sk-mini.tm"); return { top: Math.abs(a.top - n.top), sk: sk ? Math.abs(sk.getBoundingClientRect().left - a.left) : 0, fs: parseFloat(getComputedStyle(x.querySelector(".team-name")).fontSize) }; }); });
check(`Team: foto alineada arriba con el nombre (${tm.length} fichas)`, tm.length > 0 && tm.every(x => x.top < 8));
check("Team: habilidades a todo el ancho (alineadas con la foto)", tm.every(x => x.sk < 4));
check("Team: nombre más grande", tm.every(x => x.fs >= 22));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
