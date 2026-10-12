// Prueba v218 · llamadas de la Sala con Daily (simulado): función /api/daily y conexión de micrófono, cámara y pantalla.
// Uso: python3 tools/netlify-e2e-prep.py && node tools/daily-e2e.mjs /tmp/nfmock
import { createRequire } from "node:module"; import { execSync } from "node:child_process"; import path from "node:path"; import fs from "node:fs"; import http from "node:http";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const dir = process.argv[2] || "/tmp/nfmock", PORT = 8896, BASE = `http://localhost:${PORT}`;
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n);
// 1) la función, con la API de Daily simulada
const fnPath = path.resolve("netlify-site/netlify/functions/daily.mjs");
const daily = (await import(fnPath)).default;
const realFetch = globalThis.fetch; let pedido = null;
delete process.env.DAILY_API_KEY; delete process.env.DAILY_ROOM_URL;
let r = await daily(new Request(BASE + "/api/daily")); check("sin variables: responde que no está configurada", (await r.json()).enabled === false);
process.env.DAILY_API_KEY = "clave-de-prueba"; process.env.DAILY_ROOM_URL = "https://equipo.daily.co/salapxp";
globalThis.fetch = async (u, o) => { if (String(u).startsWith("https://api.daily.co/")) { pedido = { u: String(u), o }; return new Response(JSON.stringify({ token: "tok-123" }), { status: 200 }); } return realFetch(u, o); };
r = await daily(new Request(BASE + "/api/daily")); const g = await r.json(); check("con variables: activa y entrega la dirección de la sala (sin la clave)", g.enabled === true && g.url === "https://equipo.daily.co/salapxp" && !JSON.stringify(g).includes("clave"));
r = await daily(new Request(BASE + "/api/daily", { method: "POST", headers: { origin: BASE }, body: JSON.stringify({ id: "JULIANA CANAL", name: "Juliana Canal" }) })); const p = await r.json();
const body = pedido && JSON.parse(pedido.o.body);
check("pide a Daily un permiso para esa persona y esa sala, con la clave en el servidor", p.token === "tok-123" && pedido.u.endsWith("/v1/meeting-tokens") && pedido.o.headers.authorization === "Bearer clave-de-prueba" && body.properties.room_name === "salapxp" && body.properties.user_name === "Juliana Canal" && body.properties.exp > Date.now() / 1000);
r = await daily(new Request(BASE + "/api/daily", { method: "POST", headers: { origin: "https://otro-sitio.com" }, body: "{}" })); check("rechaza pedidos desde otro sitio (403)", r.status === 403);
globalThis.fetch = realFetch;
// 2) la Sala con un Daily simulado
const state = (await import(path.join(dir, "fn/state.mjs"))).default, sala = (await import(path.join(dir, "fn/sala.mjs"))).default;
const fakeDaily = async (rq) => rq.method === "GET" ? new Response(JSON.stringify({ enabled: true, url: "https://equipo.daily.co/salapxp" })) : new Response(JSON.stringify({ url: "https://equipo.daily.co/salapxp", token: "tok-" + JSON.parse(await rq.text()).id }));
const srv = http.createServer(async (rq, rs) => {
  if (rq.url.startsWith("/api/")) { const c = []; for await (const d of rq) c.push(d); const h = new Headers(); Object.entries(rq.headers).forEach(([k, v]) => h.set(k, String(v)));
    const fn = rq.url.startsWith("/api/sala") ? sala : rq.url.startsWith("/api/state") ? state : rq.url.startsWith("/api/daily") ? fakeDaily : null; if (!fn) { rs.writeHead(404); rs.end(); return; }
    const rr = await fn(new Request(BASE + rq.url, { method: rq.method, headers: h, body: ["GET", "HEAD"].includes(rq.method) ? undefined : Buffer.concat(c) }));
    rs.writeHead(rr.status, Object.fromEntries(rr.headers)); rs.end(Buffer.from(await rr.arrayBuffer())); return; }
  const f = path.join(dir, "public", rq.url === "/" ? "index.html" : rq.url.slice(1).split("?")[0]); if (!fs.existsSync(f)) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" }); rs.end(fs.readFileSync(f)); });
await new Promise(r => srv.listen(PORT, r));
const b = await pw.chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const seed = await (await b.newContext()).newPage(); await seed.goto("file://" + path.resolve("dist/preview.html")); await seed.waitForTimeout(800);
const st = await seed.evaluate(() => ({ TEAM, RODAJES, FREELANCE, PENDIENTES, CAPACIDAD_HISTORICO, AUDIO, PROJECTS, META }));
await realFetch(BASE + "/api/state", { method: "PUT", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify({ baseVersion: 0, state: st }) });
const errs = [];
/* Daily falso: guarda lo que la Sala le pide y deja simular a otra persona con cámara, micrófono y pantalla */
const FAKE = () => { window.__dl = { log: [], h: {}, ps: {} };
  const mk = () => { const cv = document.createElement("canvas"); cv.width = 64; cv.height = 64; const x = cv.getContext("2d"); setInterval(() => { x.fillStyle = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"); x.fillRect(0, 0, 64, 64); }, 100); return cv.captureStream(10).getVideoTracks()[0]; };
  const au = () => { const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream.getAudioTracks()[0]; };
  window.__dl.remoto = (uid, name, opt) => { const t = (s, tr) => ({ state: s ? "playable" : "off", persistentTrack: s ? tr : null }); const p = window.__dl.ps.r1 || { session_id: "r1", user_id: uid, user_name: name, local: false, tracks: {} };
    p.audio = !!opt.mic; p.tracks.audio = t(opt.mic, p._a || (p._a = au())); p.tracks.video = t(opt.cam, p._v || (p._v = mk())); p.tracks.screenVideo = t(opt.scr, p._s || (p._s = mk())); window.__dl.ps.r1 = p; (window.__dl.h["participant-updated"] || []).forEach(f => f({ participant: p })); };
  window.Daily = { createCallObject: (o) => { window.__dl.log.push(["create", o]); return {
    on: (ev, f) => { (window.__dl.h[ev] = window.__dl.h[ev] || []).push(f); },
    join: async (o) => { window.__dl.log.push(["join", o.url, o.token, o.userName]); return {}; },
    participants: () => Object.assign({ local: { local: true, session_id: "me" } }, window.__dl.ps),
    setInputDevicesAsync: async (o) => { window.__dl.log.push(["dev", o.audioSource ? "audio:" + o.audioSource.kind : o.videoSource ? "video:" + o.videoSource.kind : "?"]); },
    setLocalAudio: (v) => window.__dl.log.push(["audio", v]), setLocalVideo: (v) => window.__dl.log.push(["video", v]),
    startScreenShare: (o) => window.__dl.log.push(["screen", !!(o && o.mediaStream)]), stopScreenShare: () => window.__dl.log.push(["screen", false]),
    leave: async () => { window.__dl.log.push(["leave"]); }, destroy: () => window.__dl.log.push(["destroy"]) }; } }; };
const abrir = async (n) => { const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } }); await ctx.addInitScript(FAKE); const pg = await ctx.newPage(); pg.on("pageerror", e => errs.push(n + ": " + e.message));
  await pg.goto(BASE + "/"); await pg.waitForTimeout(800); await pg.evaluate(n => { try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: n }, "x"); }, n); await pg.waitForTimeout(3500);
  await pg.evaluate(() => { setInterval(() => { for (let i = 0; i < 8; i++) try { pxpLogroCerrar(); } catch (e) { } }, 300); switchView("sala"); }); return pg; };
const A = await abrir("Bastián Torres"), B = await abrir("Juliana Canal");
await A.waitForTimeout(1200);
check("antes de entrar no se conecta la llamada", await A.evaluate(() => !window.__dl.log.some(x => x[0] === "join") && /Al entrar a la sala se conecta la llamada/.test(document.querySelector(".sl-note").textContent)));
await A.click("#sl-lobby .sl-lb-si"); await B.click("#sl-lobby .sl-lb-si"); await A.waitForTimeout(2500);
check("al entrar se conecta a Daily con su propio permiso", await A.evaluate(() => { const j = window.__dl.log.find(x => x[0] === "join"); return !!j && j[2] === "tok-BASTIAN TORRES" && j[3] === "Bastián Torres" && PXP_SALA.llamada().state === "on"; }));
check("la nota dice que la llamada está conectada", await A.evaluate(() => document.querySelector(".sl-note").classList.contains("on")));
await A.click("#sl-mic"); await A.waitForTimeout(800); await A.click("#sl-camb"); await A.waitForTimeout(1000);
check("micrófono y cámara salen por la llamada", await A.evaluate(() => { const L = window.__dl.log.map(x => x.join(":")); return L.includes("dev:audio:audio") && L.includes("audio:true") && L.includes("dev:video:video") && L.includes("video:true"); }));
await A.click("#sl-mic"); await A.waitForTimeout(400); check("apagar el micrófono deja de enviarlo", await A.evaluate(() => window.__dl.log.map(x => x.join(":")).includes("audio:false")));
await A.waitForTimeout(6000);
await A.evaluate(() => window.__dl.remoto("JULIANA CANAL", "Juliana Canal", { mic: true, cam: true, scr: false })); await A.waitForTimeout(800);
check("se escucha a Juliana (su audio suena en la página)", await A.evaluate(() => { const a = document.querySelector("audio[data-dl='r1']"); return !!a && a.srcObject && a.srcObject.getAudioTracks().length === 1; }));
check("la cámara de Juliana aparece en la cara de su avatar", await A.evaluate(() => { const e = [...document.querySelectorAll(".sl-e.cam")].find(x => /Juliana/.test(x.textContent)); return !!e && !!e.querySelector(".sl-cam video"); }));
await A.evaluate(() => window.__dl.remoto("JULIANA CANAL", "Juliana Canal", { mic: true, cam: true, scr: true })); await A.waitForTimeout(800);
check("cuando Juliana comparte pantalla, se ve en el TV de Bastián", await A.evaluate(() => document.getElementById("sl-tv").dataset.mode === "screen" && !!document.querySelector("#sl-tv video") && /Juliana comparte su pantalla/.test(document.getElementById("sl-projs").textContent)));
await A.evaluate(() => document.getElementById("sl-stage").scrollIntoView({ block: "center" })); await A.waitForTimeout(200);
{ const t = await A.evaluate(() => document.getElementById("sl-tv").getBoundingClientRect().toJSON()); await A.mouse.click(t.x + t.width / 2, t.y + t.height / 2); } await A.waitForTimeout(500);
check("el TV se puede ver en grande, con botón de pantalla completa", await A.evaluate(() => !!document.querySelector(".sl-big .sl-big-c video") && !!document.querySelector(".sl-big .sl-big-f")));
await A.keyboard.press("Escape");
await A.evaluate(() => window.__dl.remoto("JULIANA CANAL", "Juliana Canal", { mic: false, cam: false, scr: false })); await A.waitForTimeout(600);
check("al dejar de compartir, el TV vuelve a la normalidad y se quita su audio", await A.evaluate(() => document.getElementById("sl-tv").dataset.mode !== "screen" && !document.querySelector("audio[data-dl='r1']")));
await B.evaluate(() => document.getElementById("sl-scr").click()); await B.waitForTimeout(1500);
check("Juliana comparte su pantalla y sale por la llamada", await B.evaluate(() => window.__dl.log.map(x => x.join(":")).includes("screen:true")));
await A.click("#sl-exit"); await A.waitForTimeout(300); await A.click(".sl-ask .sl-lb-si"); await A.waitForTimeout(600);
check("al salir de la sala se cuelga la llamada", await A.evaluate(() => { const L = window.__dl.log.map(x => x[0]); return L.includes("leave") && PXP_SALA.llamada().state === "off"; }));
check("sin errores: " + errs.slice(0, 3).join(" | "), errs.length === 0);
console.log(ok.map(x => "✓ " + x).join("\n")); console.log(fail.map(x => "✗ " + x).join("\n")); await b.close(); srv.close(); process.exit(fail.length ? 1 : 0);
