// Prueba v213/v217 · presencia real (con confirmación para entrar y salir) de la Sala (/api/sala) con dos personas en navegadores distintos.
// Uso: python3 tools/netlify-e2e-prep.py && node tools/sala-e2e.mjs /tmp/nfmock
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path"; import fs from "node:fs"; import http from "node:http";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const dir = process.argv[2] || "/tmp/nfmock", PORT = 8895, BASE = `http://localhost:${PORT}`;
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const state = (await import(path.join(dir, "fn/state.mjs"))).default, sala = (await import(path.join(dir, "fn/sala.mjs"))).default;
const srv = http.createServer(async (rq, rs) => {
  if (rq.url.startsWith("/api/")) { const c = []; for await (const d of rq) c.push(d); const h = new Headers(); Object.entries(rq.headers).forEach(([k, v]) => h.set(k, String(v)));
    const fn = rq.url.startsWith("/api/sala") ? sala : rq.url.startsWith("/api/state") ? state : null; if (!fn) { rs.writeHead(404); rs.end(); return; }
    const r = await fn(new Request(BASE + rq.url, { method: rq.method, headers: h, body: ["GET", "HEAD"].includes(rq.method) ? undefined : Buffer.concat(c) }));
    rs.writeHead(r.status, Object.fromEntries(r.headers)); rs.end(Buffer.from(await r.arrayBuffer())); return; }
  const f = path.join(dir, "public", rq.url === "/" ? "index.html" : rq.url.slice(1).split("?")[0]); if (!fs.existsSync(f)) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" }); rs.end(fs.readFileSync(f)); });
await new Promise(r => srv.listen(PORT, r));
const aj = await sala(new Request(BASE + "/api/sala", { method: "POST", headers: { origin: "https://otro-sitio.com" }, body: "{}" })); check("rechaza pedidos desde otro sitio (403)", aj.status === 403);
const b = await pw.chromium.launch();
const seed = await (await b.newContext()).newPage(); await seed.goto("file://" + path.resolve("dist/preview.html")); await seed.waitForTimeout(800);
const st = await seed.evaluate(() => ({ TEAM, RODAJES, FREELANCE, PENDIENTES, CAPACIDAD_HISTORICO, AUDIO, PROJECTS, META }));
await fetch(BASE + "/api/state", { method: "PUT", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify({ baseVersion: 0, state: st }) });
const errs = [];
const abrir = async (n) => { const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage(); p.on("pageerror", e => errs.push(n + ": " + e.message));
  await p.goto(BASE + "/"); await p.waitForTimeout(800); await p.evaluate(n => { try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: n }, "x"); }, n); await p.waitForTimeout(3500);
  await p.evaluate(() => { setInterval(() => { for (let i = 0; i < 8; i++) try { pxpLogroCerrar(); } catch (e) { } }, 300); switchView("sala"); }); return p; };
const A = await abrir("Bastián Torres"), B = await abrir("Juliana Canal");
await A.waitForTimeout(1500);
check("al abrir la Sala nadie entra sin confirmar", await A.evaluate(() => !PXP_SALA.inside() && !!document.getElementById("sl-lobby")) && await B.evaluate(() => !PXP_SALA.inside()));
await A.click("#sl-lobby .sl-lb-si"); await B.waitForTimeout(7000);
check("Juliana, sin entrar, ve que Bastián está adentro (en la invitación)", await B.evaluate(() => /basti/i.test(document.getElementById("sl-lobby").textContent)));
check("Bastián no ve a Juliana mientras ella no entra", await A.evaluate(() => PXP_SALA.state().people.length === 1));
await B.click("#sl-lobby .sl-lb-si"); await A.waitForTimeout(8000);
const vio = async (p, n) => p.evaluate(n => PXP_SALA.state().people.some(x => x.name.toLowerCase().includes(n)), n);
check("solo personas reales en la sala (sin demostración)", await A.evaluate(() => !document.querySelector(".sl-demo") && PXP_SALA.state().people.length === 2));
check("Bastián ve a Juliana en la sala", await vio(A, "juliana"));
check("Juliana ve a Bastián en la sala", await vio(B, "bastián") || await vio(B, "bastian"));
await A.evaluate(() => PXP_SALA.say("¿Arrancamos la revisión?")); await B.waitForTimeout(4500);
check("el mensaje de Bastián le llega a Juliana como burbuja", await B.evaluate(() => [...document.querySelectorAll(".sl-bub")].some(x => /Arrancamos la revisión/.test(x.textContent)) || /Arrancamos la revisión/.test(document.getElementById("sl-log").textContent)));
const sx = await B.evaluate(() => { const used = new Set(PXP_SALA.state().people.map(p => p.seat)); return [0, 1, 2, 3].find(i => !used.has(i)); });
await B.evaluate(i => { const r = document.getElementById("sl-stage").getBoundingClientRect(); }, sx);
await B.evaluate(() => document.getElementById("sl-stage").scrollIntoView({ block: "center" })); await B.waitForTimeout(200);
const r = await B.evaluate(() => document.getElementById("sl-stage").getBoundingClientRect().toJSON());
await B.mouse.click(r.x + r.width * [100, 140, 180, 220][sx] / 320, r.y + r.height * 86 / 200); await B.waitForTimeout(11000);
check("Juliana se sienta y Bastián la ve sentada en el mismo puesto", await A.evaluate(i => { const j = PXP_SALA.state().people.find(x => /juliana/i.test(x.name)); return j && j.seat === i; }, sx));
await A.click("#sl-projb"); await A.waitForTimeout(300); await A.fill(".sl-pj-q", "dra"); await A.waitForTimeout(200); await A.keyboard.press("Enter"); await B.waitForTimeout(4500);
check("lo que Bastián proyecta aparece en el TV de Juliana", await B.evaluate(() => /DRACULA/i.test(document.getElementById("sl-tv").textContent)));
await B.click("#sl-exit"); await B.waitForTimeout(300); await B.click(".sl-ask .sl-lb-si"); await A.waitForTimeout(4500);
check("Juliana sale con confirmación y desaparece de la sala de Bastián", !(await vio(A, "juliana")) && await B.evaluate(() => !PXP_SALA.inside()));
await B.click("#sl-lobby .sl-lb-si"); await A.waitForTimeout(8000); check("vuelve a entrar", await vio(A, "juliana"));
await B.close(); await A.waitForTimeout(4500);
check("si cierra la página, también sale", !(await vio(A, "juliana")));
check("sin errores: " + errs.slice(0, 2).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); srv.close(); process.exit(fail.length ? 1 : 0);
