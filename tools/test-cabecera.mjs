// Prueba v163: editar nombre/cliente/marca, color del proyecto y eliminar desde la ventana del proyecto
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
const k = await page.evaluate(() => { const k = Object.keys(PROJECTS).find(x => [...TEAM, ...AUDIO].some(t => (t.weeks || []).some(w => w.some(c => projectKey(c) === x)))) || Object.keys(PROJECTS)[0]; PROJECTS[k].color = "#AABBCC"; pxpOpenProject(k); return k; });
await page.waitForTimeout(700);
check("sin 'Editar ficha completa'", !(await page.$$eval("#pxp-proj button", bs => bs.some(x => /ficha completa/i.test(x.textContent)))));
check("botón Editar en la cabecera", await page.$("#pxp-proj .pj-edit") !== null);
// color
await page.click("#pxp-proj .pj-sw-b"); await page.waitForTimeout(300);
check("abre la paleta del color del proyecto", await page.$(".cp-pop .cp-g .cp-c") !== null);
await page.screenshot({ path: shots + "/t-color.png", clip: { x: 0, y: 0, width: 1440, height: 520 } });
await page.click(".cp-pop .cp-g .cp-c >> nth=2"); await page.waitForTimeout(400);
check("guarda colorHex y no toca 'color' (colorista)", await page.evaluate(k => /^#[0-9a-f]{6}$/i.test(PROJECTS[k].colorHex || "") && !document.querySelector(".cp-pop"), k));
// editar + renombrar
await page.click("#pxp-proj .pj-edit"); await page.waitForTimeout(400);
check("modo edición con valores", (await page.$eval("#pj-new-name", i => i.value)).length > 0 && await page.$("#pxp-proj .pj-new.edit") !== null);
await page.locator("#pxp-proj .pm-box").screenshot({ path: shots + "/t-editar.png" });
await page.fill("#pj-new-name", "Proyecto Renombrado Test"); await page.fill("#pj-new-marca", "Marca X");
await page.click("#pxp-proj .pj-new-act .ficha-save"); await page.waitForTimeout(800);
const r = await page.evaluate(k => ({ viejo: k in PROJECTS, nuevo: !!PROJECTS["PROYECTO RENOMBRADO TEST"], marca: (PROJECTS["PROYECTO RENOMBRADO TEST"] || {}).marca, tags: [...TEAM, ...AUDIO].some(t => (t.weeks || []).some(w => w.some(c => projectKey(c) === k))), tagsN: [...TEAM, ...AUDIO].some(t => (t.weeks || []).some(w => w.some(c => projectKey(c) === "PROYECTO RENOMBRADO TEST"))), titulo: (document.querySelector("#pxp-proj.open #pj-title") || {}).textContent }), k);
check("renombra la clave", !r.viejo && r.nuevo && r.titulo === "PROYECTO RENOMBRADO TEST");
check("guarda la marca", r.marca === "Marca X");
check("mueve el tráfico semanal al nombre nuevo", !r.tags && r.tagsN);
// cancelar no cambia
await page.click("#pxp-proj .pj-edit"); await page.fill("#pj-new-name", "Otro nombre"); await page.click("#pxp-proj .pj-new-act .btn-ghost"); await page.waitForTimeout(300);
check("cancelar deja todo igual", await page.evaluate(() => !!PROJECTS["PROYECTO RENOMBRADO TEST"] && !PROJECTS["OTRO NOMBRE"]));
// nombre repetido
const otro = await page.evaluate(() => Object.keys(PROJECTS).find(x => x !== "PROYECTO RENOMBRADO TEST"));
await page.click("#pxp-proj .pj-edit"); await page.fill("#pj-new-name", otro); await page.click("#pxp-proj .pj-new-act .ficha-save"); await page.waitForTimeout(300);
check("avisa nombre repetido", /Ya existe/.test(await page.$eval("#pj-cab-err", e => e.textContent)));
await page.click("#pxp-proj .pj-new-act .btn-ghost"); await page.waitForTimeout(300);
// eliminar con confirmación
await page.click("#pxp-proj .pj-del"); await page.waitForTimeout(300);
check("primer toque solo arma", await page.evaluate(() => !!PROJECTS["PROYECTO RENOMBRADO TEST"]) && await page.$("#pxp-proj .pj-del.armed") !== null);
await page.click("#pxp-proj .pj-del"); await page.waitForTimeout(500);
check("segundo toque elimina y cierra", await page.evaluate(() => !PROJECTS["PROYECTO RENOMBRADO TEST"] && !document.querySelector("#pxp-proj.open") && ![...TEAM, ...AUDIO].some(t => (t.weeks || []).some(w => w.some(c => projectKey(c) === "PROYECTO RENOMBRADO TEST")))));
// creativo: sin controles
await page.evaluate(() => { enterApp({ name: "David Daza" }, "preview"); }); await page.waitForTimeout(1200);
await page.evaluate(() => { for (let i = 0; i < 4; i++) try { pxpLogroCerrar(); } catch (e) { } pxpOpenProject(Object.keys(PROJECTS)[0]); }); await page.waitForTimeout(600);
check("creativo no ve lápiz, color ni eliminar", await page.$$eval("#pxp-proj .pj-edit, #pxp-proj .pj-sw-b, #pxp-proj .pj-del", x => x.length) === 0);
console.log(JSON.stringify({ ok: ok.length, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
