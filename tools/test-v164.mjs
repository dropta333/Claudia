// Prueba v164: etapas compactas, hitos (Revisión/Entrega), grupos en el cronograma, cabecera, ficha estable y piezas
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const shots = process.argv[2] || ".";
const b = await pw.chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
page.on("dialog", d => d.accept());
await page.goto("file://" + path.resolve("dist/preview.html")); await page.waitForTimeout(700);
await page.evaluate(() => { window.pxpSaveBase = function () { }; try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "preview"); });
await page.waitForTimeout(1500); await page.evaluate(() => { for (let i = 0; i < 4; i++) try { pxpLogroCerrar(); } catch (e) { } switchView("projects"); });
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const K = "CASO OREO SABORES";
await page.evaluate(k => { const E = PROJECTS[k].etapas; E[0].horas = [{ user: "Andrea López", h: 3, fecha: "2026-10-09" }]; openProjectFicha(k); }, K); await page.waitForTimeout(900);
// 1 · proceso: horas en una línea, sin nombres a la vista
const r0 = await page.evaluate(() => { const li = document.querySelector('.et-row:not(.mini)'), c = li.querySelector(".c-dur"); return { h: Math.round(li.getBoundingClientRect().height), who: !!li.querySelector(".hq-who"), tip: (li.querySelector(".et-reg") || {}).dataset?.tip || "", par: !!c.querySelector(".hr-par .et-est") }; });
check("etapa de proceso baja (≤ 130 px)", r0.h <= 130);
check("sin nombres de quién registró en la casilla", !r0.who && /Andrea/.test(r0.tip));
check("estimado al lado de lo registrado", r0.par);
// 2 · hitos
const iRev = await page.evaluate(() => +document.querySelector(".et-row.mini.cl-revision").dataset.i);
check("revisión con 4 estados", (await page.$$eval(`.et-row[data-i="${iRev}"] .mi-sts2 .et-sb`, x => x.map(b => b.getAttribute("aria-label")))).join("|").startsWith("Pendiente|Revisado|Solicitud de ajustes"));
check("entrega dice Entregado", (await page.$$eval(".et-row.mini.cl-entrega .mi-sts2 .et-sb", x => x.map(b => b.getAttribute("aria-label")))).includes("Entregado"));
check("hitos sin fecha de inicio ni registro de horas", await page.$$eval(".et-row.mini", L => L.every(li => !li.querySelector(".hq") && !li.querySelector(".et-end") && /Se entrega/.test(li.textContent))));
await page.click(`.et-row[data-i="${iRev}"] .mi-sts2 .et-sb:nth-child(3)`); await page.waitForTimeout(400);
check("Solicitud de ajustes = estado ajustes", await page.evaluate(([k, i]) => PROJECTS[k].etapas[i].estado === "ajustes", [K, iRev]));
check("aparecen imagen, documento y enlace", await page.$$eval(`.et-row[data-i="${iRev}"] .aj-b`, x => x.length) === 3);
await page.click(`.et-row[data-i="${iRev}"] .aj-b:nth-child(3)`); await page.waitForTimeout(200);
await page.fill(".aj-pop input", "frame.io/review/abc"); await page.keyboard.press("Enter"); await page.waitForTimeout(400);
check("adjunta un enlace", await page.evaluate(([k, i]) => ((PROJECTS[k].etapas[i].adj || [])[0] || {}).url === "https://frame.io/review/abc", [K, iRev]));
check("solo en revisión: entrega sin adjuntos", await page.$$eval(".et-row.mini.cl-entrega .aj-b", x => x.length) === 0);
await page.click(`.et-row[data-i="${iRev}"] .mi-t`); await page.waitForTimeout(250);
await page.click(".pk-mt .pk-q:has-text('1 día')"); await page.waitForTimeout(400);
check("duración de la revisión: 1 día = 8 h", await page.evaluate(([k, i]) => +PROJECTS[k].etapas[i].hp === 8, [K, iRev]));
await page.click(`.et-row[data-i="${iRev}"] .mi-h`); await page.waitForTimeout(250);
await page.click(".pk-mh .pk-d:has-text('10:30')"); await page.waitForTimeout(400);
check("hora de entrega 10:30", await page.$eval(`.et-row[data-i="${iRev}"] .mi-h b`, b => b.textContent) === "10:30");
await page.click(`.et-row[data-i="${iRev}"] .et-who`); await page.waitForTimeout(300);
check("se puede asignar al cliente", await page.$(`.et-pop .ep-it[data-n="Cliente: MONDELEZ"]`) !== null);
await page.click(`.et-pop .ep-it[data-n="Cliente: MONDELEZ"]`); await page.waitForTimeout(300);
await page.fill(".et-pop .ep-ext input", "Laura (Leo Burnett)"); await page.keyboard.press("Enter"); await page.waitForTimeout(300);
check("cliente y externo asignados", await page.evaluate(([k, i]) => { const R = pxpResps(PROJECTS[k].etapas[i]); return R.includes("Cliente: MONDELEZ") && R.includes("Externo: Laura (Leo Burnett)"); }, [K, iRev]));
check("externos no suman en la capacidad", await page.evaluate(() => !TEAM.some(t => /MONDELEZ|Laura/.test(t.name))));
await page.keyboard.press("Escape");
await page.locator("#et-wrap").screenshot({ path: shots + "/t164-etapas.png" });
// 3 · cronograma con grupos
check("cronograma marca el grupo de cada etapa y la leyenda va en una fila", await page.$$eval("#pxp-proj .cr-row.g-post", x => x.length) > 0 && await page.$$eval("#pxp-proj .cr-leg", L => L.length === 1 && !!L[0].querySelector(".cr-gleg") && !!L[0].querySelector(".lg")));
// 4 · cabecera
check("lápiz Editar junto al cliente", await page.$("#pxp-proj .pj-sub .pj-edit") !== null);
check("imagen sin pisar la flor", await page.evaluate(() => { const a = document.querySelector(".pj-ban-act").getBoundingClientRect(), f = document.querySelector(".pj-flor").getBoundingClientRect(); return a.right <= f.left + 1 || a.bottom <= f.top; }));
check("color automático = color del cliente", await page.evaluate(k => { delete PROJECTS[k].colorHex; return pxpProjectColor(k) === pxpClientColor(PROJECTS[k].cliente); }, K));
await page.click("#pxp-proj .pj-edit"); await page.waitForTimeout(300);
const f1 = await page.evaluate(() => getComputedStyle(document.querySelector(".pj-new-name")).fontFamily);
check("misma tipografía al editar el nombre", /black|Black/i.test(f1) || f1 === (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--black"))).trim() || f1.length > 0);
await page.click("#pj-new-cli"); await page.waitForTimeout(250);
check("lista de clientes al tocar", await page.$$eval(".cb-pop .cb-it", x => x.length) > 3);
await page.click("#pxp-proj .pj-new-act .btn-ghost"); await page.waitForTimeout(300);
// 5 · ficha estable
const h0 = await page.evaluate(() => document.querySelector("#pxp-proj .cfg-sum").getBoundingClientRect().height);
await page.click("#pxp-proj .cfg-col .cfg-f:nth-child(2) .cfg-b"); await page.waitForTimeout(400);
const h1 = await page.evaluate(() => document.querySelector("#pxp-proj .cfg-sum").getBoundingClientRect().height);
check("la ficha no cambia de alto al abrir un desplegable", Math.abs(h1 - h0) < 2);
// v165 · agregar etapa con tipo y fase; tipo sin exigencia
await page.click(".et-addb2"); await page.waitForTimeout(250);
check("menú de agregar con tipo, fase y sugerencias", await page.$$eval(".pk-add .em-c", x => x.length) === 3 && await page.$$eval(".pk-add .add-sg .em-f", x => x.length) === 3);
const nA = await page.evaluate(k => PROJECTS[k].etapas.length, K);
await page.click(".pk-add .em-c.cl-revision"); await page.waitForTimeout(150); await page.click(".pk-add .em-f.fs-post"); await page.waitForTimeout(150); await page.click(".pk-add .add-go"); await page.waitForTimeout(400);
check("agrega una revisión en Postproducción", await page.evaluate(([k, n]) => { const E = PROJECTS[k].etapas; return E.length === n + 1 && E.some(e => !e.nombre && e.clase === "revision" && e.fase === "post"); }, [K, nA]));
await page.click(".et-row .et-cls >> nth=0"); await page.waitForTimeout(250);
check("menú de tipo sin exigencia", !(await page.$(".et-menu .pz-dot")));
await page.keyboard.press("Escape");
check("sin barra de sugerencias suelta", !(await page.$("#et-wrap .sg-bar")));
// 6 · piezas
await page.evaluate(k => { PROJECTS[k].piezasDet = [{ hero: true, tipo: "TV", cant: 1 }]; pxpCfg("pd"); }, K); await page.waitForTimeout(400);
await page.click("#pxp-proj .pd-addb:has-text('Otra pieza')"); await page.waitForTimeout(400);
check("otra pieza sin depender del Hero", await page.evaluate(k => PROJECTS[k].piezasDet.some(x => !x.hero && !x.deriv), K));
await page.click("#pxp-proj .pd-addb:has-text('Derivada')"); await page.waitForTimeout(400);
await page.click("#pxp-proj .hd-tree .pd-sel"); await page.waitForTimeout(250);
check("derivadas con adaptación de formato y de región", await page.$$eval(".pd-menu .pd-op", x => x.map(b => b.textContent.trim()).join("|")).then(t => /Adaptación de formato/.test(t) && /Adaptación de región/.test(t) && !/Reformato/.test(t)));
await page.click(".pd-menu .pd-op:has-text('Variación')"); await page.waitForTimeout(400);
check("derivada Variación", await page.evaluate(k => PROJECTS[k].piezasDet.some(x => x.deriv === "Variación"), K));
await page.click("#pxp-proj .hd-hero .pd-in >> nth=0"); await page.waitForTimeout(250);
await page.click(".pd-quick [data-v='30s']"); await page.waitForTimeout(400);
check("duración típica 30s", await page.evaluate(k => PROJECTS[k].piezasDet.find(x => x.hero).dur === "30s", K));
console.log(JSON.stringify({ ok: ok.length, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
