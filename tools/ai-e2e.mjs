// Prueba v212 · puente con la IA (/api/ai) sin depender de un servicio real.
// Levanta un "modelo" falso compatible con OpenAI, la función ai.mjs real y el tablero publicado (Blobs simulado).
// Uso: python3 tools/netlify-e2e-prep.py && node tools/ai-e2e.mjs /tmp/nfmock
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path"; import fs from "node:fs"; import http from "node:http";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const dir = process.argv[2] || "/tmp/nfmock", PORT = 8897, BASE = `http://localhost:${PORT}`, FAKE = 8896;
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
// 0 · sin variables: la IA queda apagada
const ai0 = (await import(path.join(dir, "fn/ai.mjs") + "?off")).default;
const g0 = await (await ai0(new Request(BASE + "/api/ai"))).json(); check("sin configurar: enabled=false", g0.enabled === false);
const p0 = await ai0(new Request(BASE + "/api/ai", { method: "POST", headers: { origin: BASE }, body: "{}" })); check("sin configurar: POST responde 503", p0.status === 503);
// 1 · modelo falso: si le piden horas, responde con la herramienta registrar_horas
let visto = null;
const fake = http.createServer(async (rq, rs) => { const c = []; for await (const d of rq) c.push(d); const j = JSON.parse(Buffer.concat(c).toString() || "{}"); visto = { auth: rq.headers.authorization, model: j.model, tools: (j.tools || []).map(t => t.function.name), sys: (j.messages || [])[0] };
  const last = (j.messages || []).slice(-1)[0]?.content || ""; const msg = /horitas/.test(last) ? { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "registrar_horas", arguments: JSON.stringify({ horas: 2, fecha: new Date().toISOString().slice(0, 10) }) } }] } : { role: "assistant", content: "Corte y queda. ¿Algo más?" };
  rs.writeHead(200, { "content-type": "application/json" }); rs.end(JSON.stringify({ choices: [{ message: msg }] })); });
await new Promise(r => fake.listen(FAKE, r));
Object.assign(process.env, { AI_PROVIDER: "compatible", AI_BASE_URL: `http://localhost:${FAKE}/v1`, AI_API_KEY: "clave-de-prueba", AI_MODEL: "modelo-x" });
const ai = (await import(path.join(dir, "fn/ai.mjs") + "?on")).default, state = (await import(path.join(dir, "fn/state.mjs"))).default;
const srv = http.createServer(async (rq, rs) => {
  if (rq.url.startsWith("/api/")) { const c = []; for await (const d of rq) c.push(d); const h = new Headers(); Object.entries(rq.headers).forEach(([k, v]) => h.set(k, String(v)));
    const r = await (rq.url.startsWith("/api/ai") ? ai : state)(new Request(BASE + rq.url, { method: rq.method, headers: h, body: ["GET", "HEAD"].includes(rq.method) ? undefined : Buffer.concat(c) }));
    rs.writeHead(r.status, Object.fromEntries(r.headers)); rs.end(Buffer.from(await r.arrayBuffer())); return; }
  const f = path.join(dir, "public", rq.url === "/" ? "index.html" : rq.url.slice(1).split("?")[0]); if (!fs.existsSync(f)) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" }); rs.end(fs.readFileSync(f)); });
await new Promise(r => srv.listen(PORT, r));
const aj = await ai(new Request(BASE + "/api/ai", { method: "POST", headers: { origin: "https://otro-sitio.com" }, body: "{}" })); check("rechaza pedidos desde otro sitio (403)", aj.status === 403);
const b = await pw.chromium.launch();
const seed = await (await b.newContext()).newPage(); await seed.goto("file://" + path.resolve("dist/preview.html")); await seed.waitForTimeout(800);
const st = await seed.evaluate(() => ({ TEAM, RODAJES, FREELANCE, PENDIENTES, CAPACIDAD_HISTORICO, AUDIO, PROJECTS, META }));
await fetch(BASE + "/api/state", { method: "PUT", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify({ baseVersion: 0, state: st }) });
const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(BASE + "/"); await p.waitForTimeout(800); await p.evaluate(() => { try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "x"); }); await p.waitForTimeout(3500);
check("el tablero detecta la IA configurada", await p.evaluate(() => PXA_AGENT.ai()));
check("catálogo de herramientas para el modelo (12)", await p.evaluate(() => PXA_AGENT.tools().length === 12));
const r1 = await p.evaluate(async () => { const r = await PXA_AGENT.ask("hola"); return r.text; }); check("lo que entienden las reglas no gasta IA", /Hola/.test(r1) && visto === null);
const r2 = await p.evaluate(async () => { const r = await PXA_AGENT.ask("oye, anota que le metí dos horitas al offline"); return { t: r.text, k: !!r.confirm, title: r.confirm && r.confirm.title }; });
check("pedido libre → el modelo elige registrar_horas → misma tarjeta de confirmación", r2.k && /Registrar 2 h/.test(r2.title || ""));
check("la clave viaja solo del servidor al modelo", visto && visto.auth === "Bearer clave-de-prueba" && visto.model === "modelo-x");
check("el modelo recibe las herramientas y el contexto del tablero", visto && visto.tools.includes("crear_etapa") && /Tráfico Post/.test(visto.sys.content) && /Proyectos activos/.test(visto.sys.content));
const r3 = await p.evaluate(async () => (await PXA_AGENT.ask("cuéntame un chiste de editores")).text); check("respuesta de texto del modelo", /Corte y queda/.test(r3));
check("sin errores: " + errs.slice(0, 2).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); srv.close(); fake.close(); process.exit(fail.length ? 1 : 0);
