// Prueba de la migración entre servidores: un tablero "antiguo" completo y uno "nuevo" al que le faltan datos.
// Uso: python3 tools/netlify-e2e-prep.py && node tools/migrate-e2e.mjs /tmp/nfmock
import { createRequire } from "node:module"; import { execSync, spawn } from "node:child_process"; import path from "node:path";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const dir = process.argv[2], OLD = "http://localhost:8901", NEW = "http://localhost:8902";
const srv = (port) => new Promise(res => { const p = spawn("node", [path.resolve("tools/nf-server.mjs"), dir, String(port)], { env: { ...process.env, PXP_MIGRATE_TEST: "1" } }); p.stdout.on("data", d => /listo/.test(d) && res(p)); p.stderr.on("data", d => process.stderr.write(d)); });
const [pOld, pNew] = await Promise.all([srv(8901), srv(8902)]);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n); const errs = [];
const put = (base, st, v = 0) => fetch(base + "/api/state", { method: "PUT", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ baseVersion: v, state: st }) });
const b = await pw.chromium.launch();
try {
  const seed = await (await b.newContext()).newPage(); await seed.goto("file://" + path.resolve("dist/preview.html")); await seed.waitForTimeout(800);
  const full = await seed.evaluate(() => JSON.parse(JSON.stringify({ TEAM, RODAJES, FREELANCE, PENDIENTES, CAPACIDAD_HISTORICO, AUDIO, PROJECTS, META })));
  // archivos en el servidor antiguo: uno chico y uno grande (por partes)
  const up = async (bytes, name) => { const PARTE = 4.5 * 1024 * 1024, n = Math.ceil(bytes.length / PARTE), id = "mig" + Math.random().toString(36).slice(2, 12);
    for (let i = 0; i < n; i++) { const h = { "content-type": "application/octet-stream", "x-file-name": name, origin: OLD }; if (n > 1) Object.assign(h, { "x-upload-id": id, "x-parts": String(n), "x-part": String(i), "x-total-size": String(bytes.length) });
      const r = await fetch(OLD + "/api/files", { method: "POST", headers: h, body: bytes.slice(i * PARTE, (i + 1) * PARTE) }); const j = await r.json(); if (n === 1) return { id: j.id, n }; } return { id, n }; };
  const chico = await up(Buffer.from("hola desde el servidor antiguo"), "nota.txt"), grande = await up(Buffer.alloc(6 * 1024 * 1024, 7), "video.mov");
  const ks = Object.keys(full.PROJECTS), K0 = ks[0];
  full.META.licencias = [{ id: "lic1", nombre: "Adobe CC" }, { id: "lic2", nombre: "Frame.io" }, { id: "lic3", nombre: "DaVinci" }];
  full.META.logros = { "x": { otorgado: 1 } };
  full.PROJECTS[K0].historial = (full.PROJECTS[K0].historial || []).concat([{ ts: "2026-09-01T10:00:00.000Z", usuario: "Andrea López", texto: "con adjuntos", tipo: "nota", adjuntos: [{ id: chico.id, url: "/api/files/" + chico.id, name: "nota.txt" }, { id: grande.id, url: "/api/files/" + grande.id, name: "video.mov", partes: grande.n }] }]);
  check("siembra del servidor antiguo", (await put(OLD, full)).ok);
  // servidor nuevo: le faltan las licencias, los logros y 5 proyectos; tiene un proyecto nuevo y un cambio reciente
  const nuevo = JSON.parse(JSON.stringify(full)); delete nuevo.META.licencias; delete nuevo.META.logros; ks.slice(1, 6).forEach(k => delete nuevo.PROJECTS[k]);
  nuevo.PROJECTS[K0].historial = nuevo.PROJECTS[K0].historial.filter(h => h.texto !== "con adjuntos"); nuevo.PROJECTS[K0].estadoGeneral = "en_revision";
  nuevo.PROJECTS["PROYECTO SOLO NUEVO"] = { nombre: "PROYECTO SOLO NUEVO", estadoGeneral: "en_produccion", cliente: "NUEVO" };
  check("siembra del servidor nuevo", (await put(NEW, nuevo)).ok);
  // migración desde el navegador del servidor nuevo
  const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(NEW + "/"); await p.waitForTimeout(800); await p.evaluate(() => { try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "x"); }); await p.waitForTimeout(2500);
  check("botón Traer datos de otro servidor", !!(await p.$(".mig-btn")));
  const r = await p.evaluate(async (from) => { const log = []; const x = await pxpMigrar(from, t => log.push(t)); return { x, log }; }, OLD);
  await p.waitForTimeout(1500);
  const fin = (await (await fetch(NEW + "/api/state")).json()).state;
  check("recupera las licencias", (fin.META.licencias || []).length === 3);
  check("recupera otros ajustes (logros)", !!(fin.META.logros && fin.META.logros.x));
  check("recupera los 5 proyectos que faltaban", ks.slice(1, 6).every(k => fin.PROJECTS[k]));
  check("conserva el proyecto que solo estaba en el nuevo", !!fin.PROJECTS["PROYECTO SOLO NUEVO"]);
  check("lo actual manda en lo que cambió", fin.PROJECTS[K0].estadoGeneral === "en_revision");
  check("recupera la nota con adjuntos", fin.PROJECTS[K0].historial.some(h => h.texto === "con adjuntos"));
  check(`copia los archivos (${r.x.ok} de ${r.x.total})`, r.x.ok === 2 && r.x.mal === 0);
  const f1 = await fetch(NEW + "/api/files/" + chico.id); check("archivo chico legible en el nuevo", f1.ok && (await f1.text()) === "hola desde el servidor antiguo");
  let tam = 0; for (let i = 0; i < grande.n; i++) { const q = await fetch(`${NEW}/api/files/${grande.id}?part=${i}`); tam += (await q.arrayBuffer()).byteLength; }
  check(`archivo grande por partes legible (${tam} bytes)`, tam === 6 * 1024 * 1024);
  const r2 = await p.evaluate(async (from) => (await pxpMigrar(from)).x || null, OLD).catch(() => null);
  const fin2 = (await (await fetch(NEW + "/api/state")).json()).state;
  check("repetir la migración no duplica nada", (fin2.META.licencias || []).length === 3 && fin2.PROJECTS[K0].historial.filter(h => h.texto === "con adjuntos").length === 1);
  const malo = await fetch(NEW + "/api/migrate", { method: "POST", headers: { "content-type": "application/json", origin: "https://otro.com" }, body: JSON.stringify({ from: OLD }) });
  check("rechaza la migración pedida desde otro sitio", malo.status === 403);
  const malo2 = await fetch(NEW + "/api/migrate", { method: "POST", headers: { "content-type": "application/json", origin: NEW }, body: JSON.stringify({ from: "https://ejemplo.com" }) });
  check("solo acepta tableros de Netlify", malo2.status === 400);
  // copia completa: incluye licencias
  const dl = await p.evaluate(() => { let out = null; const oc = URL.createObjectURL; URL.createObjectURL = (bl) => { out = bl; return "blob:x"; }; downloadBackup(); URL.createObjectURL = oc; return out ? out.text() : null; });
  const cp = JSON.parse(dl || "{}"); check("Descargar copia incluye las licencias", (cp.meta && cp.meta.licencias || []).length === 3);
  console.log(r.log.join("\n"));
} catch (e) { fail.push("excepción: " + e.message); }
console.log(JSON.stringify({ ok, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); pOld.kill(); pNew.kill(); process.exit(fail.length || errs.length ? 1 : 0);
