// Prueba v199: Clientes · "Trabajo por cliente" y "Tipo de proyecto" lado a lado, con semanas / meses / año (también las tablas)
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1472, height: 900 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1800); await page.evaluate(() => { for (let i = 0; i < 6; i++) try { pxpLogroCerrar(); } catch (e) { } pxpHomeModo("global"); switchView("clientes"); }); await page.waitForTimeout(1000);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const st = () => page.evaluate(() => { const a = document.querySelector("#cli-wrap [data-pxpcli]").getBoundingClientRect(), c = document.querySelector("#cli-wrap .cli-tps").getBoundingClientRect(); const d = document.getElementById("cli-tablas"); if (d) d.open = true; return { lado: Math.abs(a.top - c.top) < 2 && c.left > a.right - 2, segs: document.querySelectorAll("#cli-wrap .seg.cli-per").length, on: [...document.querySelectorAll("#cli-wrap .seg.cli-per button.on")].map(x => x.textContent), pts: document.querySelectorAll("#cli-wrap .cli-tps circle").length, tp1: document.querySelectorAll("#cli-wrap .tp1-r").length, cols: document.querySelector("#cli-tablas table").querySelectorAll("thead th").length, segAncho: Math.round(document.querySelector("#cli-wrap .cli-tps .seg.cli-per").getBoundingClientRect().width) }; });
let r = await st();
check(`lado a lado y con selector de periodo en las dos gráficas y las tablas (${JSON.stringify(r)})`, r.lado && r.segs === 3 && r.on.every(x => x === "Semanas") && r.segAncho < 400);
const nSem = r.cols;
await page.click("#cli-wrap .cli-tps .seg.cli-per button:nth-child(2)"); await page.waitForTimeout(600); r = await st();
check(`Meses: todo se sincroniza y hay menos columnas que semanas (${JSON.stringify(r)})`, r.on.every(x => x === "Meses") && r.cols <= nSem && r.pts > 0);
await page.click("#cli-wrap [data-pxpcli] .seg.cli-per button:nth-child(3)"); await page.waitForTimeout(600); r = await st();
check(`Año: barras por tipo y una columna por año (${JSON.stringify(r)})`, r.on.every(x => x === "Año") && r.tp1 > 0 && r.cols === 2);
const horasAnio = await page.evaluate(() => { pxpCliMetric("horas"); return document.querySelectorAll("#cli-wrap [data-pxpcli] svg rect").length; });
check("Trabajo por cliente: horas por periodo sin errores", horasAnio >= 0);
await page.evaluate(() => { pxpCliMetric("proyectos"); pxpCliPer("semana"); }); await page.waitForTimeout(500);
await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(500);
check("celular: una columna sin salirse", await page.evaluate(() => ![...document.querySelectorAll("#cli-wrap [data-pxpcli] .cli-tools *, #cli-wrap .cli-tps .seg *")].some(e => e.getBoundingClientRect().right > innerWidth + 1)));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); process.exit(fail.length ? 1 : 0);
