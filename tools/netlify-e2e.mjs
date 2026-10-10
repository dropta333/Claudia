// Prueba de punta a punta del modo Netlify: servidor local con las funciones reales del ZIP y Blobs simulado.
// Uso: node tools/netlify-e2e.mjs <carpeta-con-public-y-functions>
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path"; import fs from "node:fs"; import http from "node:http";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const dir = process.argv[2], PORT = 8899, BASE = `http://localhost:${PORT}`;
const state = (await import(path.join(dir, "fn/state.mjs"))).default, files = (await import(path.join(dir, "fn/files.mjs"))).default;
const srv = http.createServer(async (rq, rs) => {
  const url = BASE + rq.url;
  if (rq.url.startsWith("/api/")) {
    const body = await new Promise(r => { const c = []; rq.on("data", d => c.push(d)); rq.on("end", () => r(Buffer.concat(c))); });
    const h = new Headers(); Object.entries(rq.headers).forEach(([k, v]) => h.set(k, String(v)));
    const r = await (rq.url.startsWith("/api/state") ? state : files)(new Request(url, { method: rq.method, headers: h, body: ["GET", "HEAD"].includes(rq.method) ? undefined : body }));
    rs.writeHead(r.status, Object.fromEntries(r.headers)); rs.end(Buffer.from(await r.arrayBuffer())); return;
  }
  const f = path.join(dir, "public", rq.url === "/" ? "index.html" : rq.url.slice(1));
  if (!fs.existsSync(f)) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" }); rs.end(fs.readFileSync(f));
});
await new Promise(r => srv.listen(PORT, r));
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n); const errs = [];
const b = await pw.chromium.launch();
// 1 · sembrar el servidor con los datos de la vista previa
const seed = await (await b.newContext()).newPage(); await seed.goto("file://" + path.resolve("dist/preview.html")); await seed.waitForTimeout(800);
const st = await seed.evaluate(() => ({ TEAM, RODAJES, FREELANCE, PENDIENTES, CAPACIDAD_HISTORICO, AUDIO, PROJECTS, META }));
const put = await fetch(BASE + "/api/state", { method: "PUT", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify({ baseVersion: 0, state: st }) });
check("siembra del servidor", put.ok);
const ajeno = await fetch(BASE + "/api/state", { method: "PUT", headers: { "content-type": "application/json", origin: "https://otro-sitio.com" }, body: "{}" });
check("rechaza cambios desde otro sitio (403)", ajeno.status === 403);
// 2 · dos personas abren el tablero publicado
const abrir = async (nombre) => { const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage(); p.on("pageerror", e => errs.push(nombre + ": " + e.message));
  await p.goto(BASE + "/"); await p.waitForTimeout(800); await p.evaluate(n => { try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: n }, "x"); }, nombre); await p.waitForTimeout(2500); return p; };
const A = await abrir("Bastián Torres"), B2 = await abrir("Juliana Canal");
const nA = await A.evaluate(() => Object.keys(PROJECTS).length); check(`carga los datos del servidor (${nA} proyectos)`, nA > 10);
// 3 · guardan al mismo tiempo cambios distintos
const ks = await A.evaluate(() => Object.keys(PROJECTS).slice(0, 2));
const t0 = Date.now();
await Promise.all([
  A.evaluate(k => { PROJECTS[k].notasE2E = "de Bastián"; return saveState(); }, ks[0]),
  B2.evaluate(k => { PROJECTS[k].notasE2E = "de Juliana"; return saveState(); }, ks[1]),
]);
await A.waitForTimeout(3500); const dt = Date.now() - t0;
const fin = await (await fetch(BASE + "/api/state")).json();
check("los dos cambios simultáneos quedan guardados", fin.state.PROJECTS[ks[0]].notasE2E === "de Bastián" && fin.state.PROJECTS[ks[1]].notasE2E === "de Juliana");
check("no se pierde ningún proyecto", Object.keys(fin.state.PROJECTS).length === Object.keys(st.PROJECTS).length);
// 4 · una tercera persona abre y ve todo
const C = await abrir("Andrea López"); const ve = await C.evaluate(k => [PROJECTS[k[0]].notasE2E, PROJECTS[k[1]].notasE2E], ks);
check("otra persona ve los dos cambios", ve[0] === "de Bastián" && ve[1] === "de Juliana");
// 5 · tiempo de un guardado normal
const t1 = Date.now(); await C.evaluate(k => { PROJECTS[k].notasE2E2 = "rápido"; return saveState(); }, ks[0]); await C.waitForTimeout(300);
let ms = 0; for (let i = 0; i < 40; i++) { const j = await (await fetch(BASE + "/api/state")).json(); if (j.state.PROJECTS[ks[0]].notasE2E2 === "rápido") { ms = Date.now() - t1; break; } await new Promise(r => setTimeout(r, 100)); }
check(`guardado rápido (${ms} ms)`, ms > 0 && ms < 3000);
// 6 · reportes en PDF (solo Administración; en Netlify el motor de PDF se carga aparte, desde pdf.js)
await A.evaluate(k => pxpRepOpen("project", k), ks[0]); await A.waitForTimeout(4000);
check("genera la vista previa del reporte", await A.$$eval("#rp-prev .rp-page", x => x.length) >= 1);
const dl = await A.evaluate(async () => { try { const S = pxpRepS(); return !!(S && S.rec && S.rec.pages.length); } catch (e) { return false; } });
check("el reporte queda listo para descargar", dl);
await A.evaluate(() => { document.querySelectorAll(".open").forEach(e => e.classList.remove("open")); });
await C.evaluate(k => pxpRepOpen("project", k), ks[0]); await C.waitForTimeout(800);
check("quien no es Administración no puede generar reportes", !(await C.$("#rp-prev .rp-page")));
console.log(JSON.stringify({ ok, fail, errs: errs.slice(0, 5), version: fin.version }, null, 1));
await b.close(); srv.close(); process.exit(fail.length || errs.length ? 1 : 0);
