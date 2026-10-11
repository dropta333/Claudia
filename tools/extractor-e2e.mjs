// Prueba del extractor: el botón de favoritos saca todo del sitio "antiguo" y "Restaurar copia" lo combina en el "nuevo" (con adjuntos)
import { createRequire } from "node:module"; import { execSync, spawn } from "node:child_process"; import path from "node:path"; import fs from "node:fs";
const req = createRequire(import.meta.url); let pw; try { pw = req("playwright"); } catch { pw = req(execSync("npm root -g").toString().trim() + "/playwright"); }
const dir = process.argv[2], OLD = "http://localhost:8911", NEW = "http://localhost:8912";
const srv = (port) => new Promise(res => { const p = spawn("node", [path.resolve("tools/nf-server.mjs"), dir, String(port)]); p.stdout.on("data", d => /listo/.test(d) && res(p)); p.stderr.on("data", d => process.stderr.write(d)); });
const [pOld, pNew] = await Promise.all([srv(8911), srv(8912)]);
const ok = [], fail = []; const check = (n, c) => (c ? ok : fail).push(n); const errs = [];
const put = (base, st) => fetch(base + "/api/state", { method: "PUT", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ baseVersion: 0, state: st }) });
const b = await pw.chromium.launch();
try {
  const seed = await (await b.newContext()).newPage(); await seed.goto("file://" + path.resolve("dist/preview.html")); await seed.waitForTimeout(800);
  const full = await seed.evaluate(() => JSON.parse(JSON.stringify({ TEAM, RODAJES, FREELANCE, PENDIENTES, CAPACIDAD_HISTORICO, AUDIO, PROJECTS, META })));
  const up = await (await fetch(OLD + "/api/files", { method: "POST", headers: { "content-type": "text/plain", "x-file-name": "acta.txt", origin: OLD }, body: "acta del antiguo" })).json();
  const ks = Object.keys(full.PROJECTS), K0 = ks[0];
  full.META.licencias = [{ id: "l1", nombre: "Adobe CC" }, { id: "l2", nombre: "Frame.io" }];
  full.PROJECTS[K0].historial = (full.PROJECTS[K0].historial || []).concat([{ ts: "2026-09-02T10:00:00.000Z", usuario: "Andrea López", texto: "acta adjunta", tipo: "nota", adjuntos: [{ id: up.id, url: "/api/files/" + up.id, name: "acta.txt" }] }]);
  await put(OLD, full);
  const nuevo = JSON.parse(JSON.stringify(full)); delete nuevo.META.licencias; ks.slice(1, 4).forEach(k => delete nuevo.PROJECTS[k]); nuevo.PROJECTS[K0].historial = nuevo.PROJECTS[K0].historial.filter(h => h.texto !== "acta adjunta");
  await put(NEW, nuevo);
  // 1 · extractor en el sitio antiguo
  const html = fs.readFileSync("tools/extractor/extractor.html", "utf-8"), href = html.match(/class="bm" href="([^"]+)"/)[1];
  const code = decodeURIComponent(href.replace(/^javascript:/, "")).replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const ctx = await b.newContext({ acceptDownloads: true }), po = await ctx.newPage(); await po.goto(OLD + "/"); await po.waitForTimeout(600);
  const [dl] = await Promise.all([po.waitForEvent("download", { timeout: 30000 }), po.evaluate(c => { (0, eval)(c); }, code)]);
  const file = path.join(process.argv[3] || "/tmp", "restauracion-prueba.json"); await dl.saveAs(file);
  const ex = JSON.parse(fs.readFileSync(file, "utf-8"));
  check("extractor: trae los datos", ex.state && Object.keys(ex.state.PROJECTS).length === ks.length);
  check("extractor: trae las licencias", (ex.state.META.licencias || []).length === 2);
  check("extractor: trae el adjunto dentro", !!(ex.archivos && ex.archivos[up.id] && ex.archivos[up.id].data));
  // 2 · restaurar en el nuevo
  const pn = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage(); pn.on("pageerror", e => errs.push(e.message));
  await pn.goto(NEW + "/"); await pn.waitForTimeout(800); await pn.evaluate(() => { try { localStorage.setItem("pxp_lg_off", "1"); } catch (e) { } enterApp({ name: "Bastián Torres" }, "x"); }); await pn.waitForTimeout(2500);
  await pn.setInputFiles("#restore-file-input", file); await pn.waitForTimeout(5000);
  const fin = (await (await fetch(NEW + "/api/state")).json()).state;
  check("restaurar: recupera las licencias", (fin.META.licencias || []).length === 2);
  check("restaurar: recupera los proyectos que faltaban", ks.slice(1, 4).every(k => fin.PROJECTS[k]));
  const nota = fin.PROJECTS[K0].historial.find(h => h.texto === "acta adjunta"), nid = nota && nota.adjuntos[0].id;
  check("restaurar: recupera la nota", !!nota);
  const f = nid ? await fetch(NEW + "/api/files/" + nid) : null; check("restaurar: el adjunto se abre en el sitio nuevo", !!f && f.ok && (await f.text()) === "acta del antiguo");
  console.log("estado:", await pn.$eval("#sync-status", e => e.textContent));
} catch (e) { fail.push("excepción: " + e.message); }
console.log(JSON.stringify({ ok, fail, errs: errs.slice(0, 5) }, null, 1));
await b.close(); pOld.kill(); pNew.kill(); process.exit(fail.length || errs.length ? 1 : 0);
