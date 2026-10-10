// Archivos adjuntos de las notas de los proyectos (imágenes, audios, documentos, videos…).
// Se guardan en Netlify Blobs, aparte del estado del tablero, para que el tablero siga siendo liviano.
// Cada envío al servidor admite unos 6 MB, así que los archivos grandes (hasta 15 MB) llegan en partes de 4 MB.
import { getStore } from "@netlify/blobs";

const MAX_TOTAL = 15 * 1024 * 1024;  // 15 MB por archivo
const MAX_PARTE = 5 * 1024 * 1024;   // cada envío
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const okId = (s) => /^[A-Za-z0-9-]{8,64}$/.test(s || "");

// v171 · Solo se aceptan cambios desde el propio tablero (otro sitio no puede escribir ni borrar)
const ajeno = (req, url) => { if (req.method === "GET") return false; const o = req.headers.get("origin"); if (o) { try { return new URL(o).host !== url.host; } catch { return true; } } return req.headers.get("sec-fetch-site") === "cross-site"; };
export default async (req) => {
  const store = getStore({ name: "trafico-archivos", consistency: "strong" });
  const url = new URL(req.url);
  if (ajeno(req, url)) return new Response("Origen no permitido", { status: 403 });
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[0] === "api" && parts[1] === "files" ? parts[2] : null;

  if (req.method === "POST" && !id) {
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return json({ error: "Archivo vacío" }, 400);
    if (buf.byteLength > MAX_PARTE) return json({ error: "Cada parte debe pesar menos de 5 MB" }, 413);
    const name = decodeURIComponent(req.headers.get("x-file-name") || "archivo");
    const type = req.headers.get("content-type") || "application/octet-stream";
    const upId = req.headers.get("x-upload-id"), n = parseInt(req.headers.get("x-parts") || "1", 10), i = parseInt(req.headers.get("x-part") || "0", 10);
    if (n > 1) {                                            // archivo grande: llega por partes
      const total = parseInt(req.headers.get("x-total-size") || "0", 10);
      if (!okId(upId) || !(i >= 0 && i < n) || n > 8) return json({ error: "Envío por partes inválido" }, 400);
      if (total > MAX_TOTAL) return json({ error: "El archivo supera 15 MB" }, 413);
      await store.set(`${upId}__${i}`, buf, { metadata: { parte: i } });
      if (i === n - 1) await store.set(upId, new ArrayBuffer(0), { metadata: { name, type, size: total, parts: n, ts: new Date().toISOString() } });
      return json({ id: upId, name, type, size: total, parts: n, part: i });
    }
    const newId = crypto.randomUUID();
    await store.set(newId, buf, { metadata: { name, type, size: buf.byteLength, ts: new Date().toISOString() } });
    return json({ id: newId, name, type, size: buf.byteLength });
  }

  if (req.method === "GET" && id) {
    const r = await store.getWithMetadata(id, { type: "arrayBuffer" });
    if (!r) return new Response("No encontrado", { status: 404 });
    const m = r.metadata || {};
    const headers = { "content-type": m.type || "application/octet-stream", "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(m.name || "archivo")}`, "cache-control": "private, max-age=31536000, immutable" };
    if (m.parts > 1) {
      const p = url.searchParams.get("part");
      if (p !== null) {                                     // una parte (el navegador las une)
        const pr = await store.get(`${id}__${parseInt(p, 10)}`, { type: "arrayBuffer" });
        if (!pr) return new Response("Parte no encontrada", { status: 404 });
        return new Response(pr, { headers: { "content-type": "application/octet-stream", "cache-control": "private, max-age=31536000, immutable" } });
      }
      const stream = new ReadableStream({                    // enlace directo: se envía todo seguido
        async start(ctrl) { for (let k = 0; k < m.parts; k++) { const pr = await store.get(`${id}__${k}`, { type: "arrayBuffer" }); if (pr) ctrl.enqueue(new Uint8Array(pr)); } ctrl.close(); },
      });
      return new Response(stream, { headers });
    }
    return new Response(r.data, { headers });
  }

  if (req.method === "DELETE" && id) {
    const r = await store.getWithMetadata(id, { type: "arrayBuffer" }).catch(() => null);
    const n = (r && r.metadata && r.metadata.parts) || 0;
    for (let k = 0; k < n; k++) await store.delete(`${id}__${k}`);
    await store.delete(id);
    return json({ ok: true });
  }
  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: ["/api/files", "/api/files/:id"] };

