// Prueba v216 · guardado simultáneo de lo nuevo (avatares, estado, tareas del asistente, etapas) contra las funciones reales de Netlify.
// Uso: python3 tools/netlify-e2e-prep.py && node tools/guardado-e2e.mjs /tmp/nfmock
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path"; import fs from "node:fs"; import http from "node:http";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const dir = process.argv[2] || "/tmp/nfmock", PORT = 8894, BASE = `http://localhost:${PORT}`;
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
const fns = {}; for (const n of ["state", "files", "sala", "ai"]) { const f = path.join(dir, "fn", n + ".mjs"); if (fs.existsSync(f)) fns[n] = (await import(f)).default; }
const srv = http.createServer(async (rq, rs) => {
  if (rq.url.startsWith("/api/")) { const c = []; for await (const d of rq) c.push(d); const h = new Headers(); Object.entries(rq.headers).forEach(([k, v]) => h.set(k, String(v)));
    const n = rq.url.split("?")[0].split("/")[2]; const fn = fns[n]; if (!fn) { rs.writeHead(404); rs.end(); return; }
    const r = await fn(new Request(BASE + rq.url, { method: rq.method, headers: h, body: ["GET", "HEAD"].includes(rq.method) ? undefined : Buffer.concat(c) }));
    rs.writeHead(r.status, Object.fromEntries(r.headers)); rs.end(Buffer.from(await r.arrayBuffer())); return; }
  const f = path.join(dir, "public", rq.url === "/" ? "index.html" : rq.url.slice(1).split("?")[0]); if (!fs.existsSync(f)) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" }); rs.end(fs.readFileSync(f)); });
await new Promise(r => srv.listen(PORT, r));
const b = await pw.chromium.launch();
const seed = await (await b.newContext()).newPage(); await seed.goto("file://" + path.resolve("dist/preview.html")); await seed.waitForTimeout(800);
const st = await seed.evaluate(() => ({ TEAM, RODAJES, FREELANCE, PENDIENTES, CAPACIDAD_HISTORICO, AUDIO, PROJECTS, META }));
await fetch(BASE + "/api/state", { method: "PUT", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify({ baseVersion: 0, state: st }) });
const errs = [];
const abrir = async n => { const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage(); p.on("pageerror", e => errs.push(n + ": " + e.message));
  await p.goto(BASE + "/"); await p.waitForTimeout(800); await p.evaluate(n => { try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: n }, "x"); }, n); await p.waitForTimeout(3500);
  await p.evaluate(() => setInterval(() => { for (let i = 0; i < 8; i++) try { pxpLogroCerrar(); } catch (e) { } }, 300)); return p; };
const A = await abrir("Bastián Torres"), B = await abrir("Juliana Canal");
// al mismo tiempo: cada uno guarda su avatar; Bastián (admin) además le crea una tarea a Jostyn con el asistente; Juliana fija su estado
const avA = { v: 1, hair: "hipster", fit: "cuero", hc: "#151218", skin: "#e2aa80" }, avB = { v: 1, hair: "melena", fit: "blusa", hc: "#7d5440", skin: "#f0c9a6" };
await Promise.all([
  A.evaluate(async av => { const p = pxpFindPerson("Bastián Torres").p; p.avatar = av; await saveState(); }, avA),
  B.evaluate(async av => { const p = pxpFindPerson("Juliana Canal").p; p.avatar = av; p.semaforo = "libre"; p.semaforoFijo = true; await saveState(); }, avB),
]);
await A.evaluate(async () => { const r = PXA_AGENT.ask("crea una tarea revisar el conform para @Jostyn Ruiz mañana"); if (r.confirm) await r.confirm.onYes(); await new Promise(r => setTimeout(r, 1500)); });
const k = await A.evaluate(() => Object.keys(PROJECTS).find(k => (PROJECTS[k].etapas || []).length && !PROJECTS[k].archivadoEn));
await Promise.all([
  A.evaluate(async k => { const r = PXA_AGENT.ask(`crea una etapa Online final en #${PROJECTS[k].nombre} el viernes para @Juliana Canal`); if (r.confirm) await r.confirm.onYes(); await new Promise(r => setTimeout(r, 1500)); }, k),
  B.evaluate(async () => { const p = pxpFindPerson("Juliana Canal").p; (p.tareas = p.tareas || []).push({ id: "t-test", texto: "Exportar masters", fecha: "", proyecto: "", hecho: false, creada: new Date().toISOString(), por: "Juliana Canal" }); await saveState(); await new Promise(r => setTimeout(r, 1500)); }),
]);
await A.waitForTimeout(2500);
// una tercera persona abre el tablero publicado: todo debe estar ahí
const C = await abrir("Jostyn Ruiz");
const r = await C.evaluate(k => { const f = n => pxpFindPerson(n).p; return { avA: f("Bastián Torres").avatar, avB: f("Juliana Canal").avatar, sem: f("Juliana Canal").semaforo, fijo: f("Juliana Canal").semaforoFijo,
  tJ: (f("Jostyn Ruiz").tareas || []).some(t => /conform/i.test(t.texto)), tJu: (f("Juliana Canal").tareas || []).some(t => t.id === "t-test"), etapa: (PROJECTS[k].etapas || []).some(e => /online final/i.test(e.nombre)),
  hist: (PROJECTS[k].historial || []).some(h => /asistente/.test(h.texto)) }; }, k);
check("el avatar de Bastián quedó guardado", r.avA && r.avA.hair === "hipster");
check("el avatar de Juliana, guardado al mismo tiempo, también", r.avB && r.avB.hair === "melena");
check("el estado fijado a mano (Libre) se conserva", r.sem === "libre" && r.fijo === true);
check("la tarea creada con el asistente llegó a Jostyn", r.tJ);
check("la tarea que Juliana se creó al mismo tiempo también", r.tJu);
check("la etapa creada con el asistente está en el proyecto", r.etapa);
check("el historial del proyecto dice que fue con el asistente", r.hist);
// presencia de la sala no toca los datos del tablero
await A.close(); await B.close(); await C.waitForTimeout(4000);   // se mide con solo esta persona conectada (los demás ya no guardan)
const v0 = (await (await fetch(BASE + "/api/state?meta=1")).json()).version;
await C.evaluate(() => { switchView("sala"); PXP_SALA.join(); PXP_SALA.reaccionar("👍"); PXP_SALA.mano(true); }); await C.waitForTimeout(7000);
const v1 = (await (await fetch(BASE + "/api/state?meta=1")).json()).version;
check("estar en la Sala no genera guardados del tablero", v0 === v1);
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); srv.close(); process.exit(fail.length ? 1 : 0);
