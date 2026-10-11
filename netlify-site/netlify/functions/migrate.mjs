// v184 · Migración desde otro servidor del tablero (por ejemplo, el sitio antiguo).
// POST /api/migrate { from: "https://sitio-antiguo.netlify.app" }            → devuelve los datos del sitio antiguo (el tablero los combina con los actuales)
// POST /api/migrate { from: "https://sitio-antiguo.netlify.app", file: id }  → copia ese archivo adjunto al almacenamiento de este sitio (si no está ya)
// Se hace de servidor a servidor porque el navegador no puede leer otro sitio directamente.
// Solo acepta orígenes https en *.netlify.app y solo peticiones hechas desde este mismo tablero.
import { getStore } from "@netlify/blobs";

const PARTE = 4.5 * 1024 * 1024;   // igual que el tablero al subir archivos grandes por partes
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const okId = (s) => /^[A-Za-z0-9-]{8,64}$/.test(s || "");
const okFrom = (u) => { try { const x = new URL(u); if (process.env.PXP_MIGRATE_TEST === "1" && x.hostname === "localhost") return true;   // solo en las pruebas locales
  return x.protocol === "https:" && /\.netlify\.app$/i.test(x.hostname); } catch { return false; } };
const ajeno = (req, url) => { const o = req.headers.get("origin"); if (o) { try { return new URL(o).host !== url.host; } catch { return true; } } return req.headers.get("sec-fetch-site") === "cross-site"; };

export default async (req) => {
  const url = new URL(req.url);
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (ajeno(req, url)) return json({ error: "Origen no permitido" }, 403);
  let body; try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const from = String((body && body.from) || "").trim().replace(/\/+$/, "");
  if (!okFrom(from)) return json({ error: "La dirección debe ser https://….netlify.app" }, 400);
  if (new URL(from).host === url.host) return json({ error: "Esa es la dirección de este mismo tablero." }, 400);

  if (!body.file) {   // datos del tablero antiguo (se envían tal cual; pueden pesar varios MB)
    const r = await fetch(from + "/api/state", { headers: { accept: "application/json" } }).catch(() => null);
    if (!r || !r.ok) return json({ error: `No se pudo leer el tablero antiguo (${r ? r.status : "sin conexión"}).` }, 502);
    return new Response(r.body, { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }

  const id = String(body.file);
  if (!okId(id)) return json({ error: "Archivo inválido" }, 400);
  const store = getStore({ name: "trafico-archivos", consistency: "strong" });
  const ya = await store.getWithMetadata(id, { type: "arrayBuffer" }).catch(() => null);
  if (ya) return json({ ok: true, ya: true });
  const r = await fetch(`${from}/api/files/${encodeURIComponent(id)}`).catch(() => null);
  if (!r || !r.ok) return json({ error: `No está en el tablero antiguo (${r ? r.status : "sin conexión"}).` }, r && r.status === 404 ? 404 : 502);
  const buf = await r.arrayBuffer(), type = r.headers.get("content-type") || "application/octet-stream";
  const m = (r.headers.get("content-disposition") || "").match(/filename\*=UTF-8''([^;]+)/), name = m ? decodeURIComponent(m[1]) : "archivo";
  const meta = { name, type, size: buf.byteLength, ts: new Date().toISOString(), migrado: from };
  if (buf.byteLength > PARTE) {   // mismo reparto en partes que usa el tablero, para que se pueda leer igual
    const n = Math.ceil(buf.byteLength / PARTE);
    for (let i = 0; i < n; i++) await store.set(`${id}__${i}`, buf.slice(i * PARTE, (i + 1) * PARTE), { metadata: { parte: i } });
    await store.set(id, new ArrayBuffer(0), { metadata: { ...meta, parts: n } });
  } else await store.set(id, buf, { metadata: meta });
  return json({ ok: true, size: buf.byteLength });
};

export const config = { path: "/api/migrate" };
