// Servidor local que imita el sitio de Netlify: public/ + funciones reales (state, files, migrate) con Blobs simulado.
// Uso: node tools/nf-server.mjs <carpeta preparada con tools/netlify-e2e-prep.py> <puerto>
import path from "node:path"; import fs from "node:fs"; import http from "node:http";
const dir = process.argv[2], PORT = +process.argv[3] || 8899, BASE = `http://localhost:${PORT}`;
const fn = {}; for (const n of ["state", "files", "migrate"]) { const f = path.join(dir, "fn", n + ".mjs"); if (fs.existsSync(f)) fn[n] = (await import(f)).default; }
http.createServer(async (rq, rs) => {
  try {
    if (rq.url.startsWith("/api/")) {
      const body = await new Promise(r => { const c = []; rq.on("data", d => c.push(d)); rq.on("end", () => r(Buffer.concat(c))); });
      const h = new Headers(); Object.entries(rq.headers).forEach(([k, v]) => h.set(k, String(v)));
      const name = rq.url.startsWith("/api/state") ? "state" : rq.url.startsWith("/api/migrate") ? "migrate" : "files";
      const r = await fn[name](new Request(BASE + rq.url, { method: rq.method, headers: h, body: ["GET", "HEAD"].includes(rq.method) ? undefined : body }));
      rs.writeHead(r.status, Object.fromEntries(r.headers)); rs.end(Buffer.from(await r.arrayBuffer())); return;
    }
    const f = path.join(dir, "public", rq.url === "/" ? "index.html" : rq.url.slice(1).split("?")[0]);
    if (!fs.existsSync(f)) { rs.writeHead(404); rs.end(); return; }
    rs.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" }); rs.end(fs.readFileSync(f));
  } catch (e) { console.error(e); rs.writeHead(500); rs.end(String(e)); }
}).listen(PORT, () => console.log("listo " + BASE));
