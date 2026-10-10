// Tráfico Post — almacenamiento compartido del tablero.
// GET  /api/state          → { version, updatedAt, updatedBy, state }  (state = null si aún no hay datos)
// GET  /api/state?meta=1   → { version, updatedAt, updatedBy }         (liviano, para revisar cambios)
// PUT  /api/state          → body { baseVersion, state }  · 409 si alguien guardó antes
// PUT  /api/state          → body { baseVersion, patch }  · solo las partes que cambiaron (TEAM, PROJECTS, META…); se mezclan con lo guardado
// PUT  /api/state          → body { baseVersion, keys: { PROJECTS: { clave: valor | null }, META: {…} } } (v153)
//                             solo los proyectos / claves de META que cambiaron (null = borrar). Guardados de pocos KB.
// Los datos viven en Netlify Blobs (incluido en Netlify, sin base de datos externa).
import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB de datos del tablero
// Cada parte del tablero se guarda en su propio blob: un cambio en PROJECTS no reescribe las fotos del equipo ni las licencias.
const PARTS = ["TEAM", "RODAJES", "FREELANCE", "PENDIENTES", "CAPACIDAD_HISTORICO", "AUDIO", "PROJECTS", "META"];
const leerPartes = async (store) => {
  const v = await Promise.all(PARTS.map((k) => store.get("p/" + k, { type: "json" })));
  const st = {}; PARTS.forEach((k, i) => { if (v[i] != null) st[k] = v[i]; }); return st;
};
// Formato anterior (un solo blob "state"): se lee igual y se migra en el siguiente guardado.
const leerEstado = async (store, meta) => {
  if (meta && meta.parts) return leerPartes(store);
  const c = await store.get("state", { type: "json" }); return (c && c.state) || null;
};

// v171 · Solo se aceptan cambios desde el propio tablero (otro sitio no puede escribir ni borrar)
const ajeno = (req, url) => { if (req.method === "GET") return false; const o = req.headers.get("origin"); if (o) { try { return new URL(o).host !== url.host; } catch { return true; } } return req.headers.get("sec-fetch-site") === "cross-site"; };
export default async (req) => {
  const store = getStore({ name: "trafico-post", consistency: "strong" });
  const url = new URL(req.url);
  if (ajeno(req, url)) return new Response("Origen no permitido", { status: 403 });
  let meta = await store.get("state-meta", { type: "json" });
  if (!meta) { const c0 = await store.get("state", { type: "json" }); meta = c0 ? { version: c0.version || 0, updatedAt: c0.updatedAt || null, updatedBy: c0.updatedBy || null } : null; }

  if (req.method === "GET") {
    const head = { version: meta?.version || 0, updatedAt: meta?.updatedAt || null, updatedBy: meta?.updatedBy || null, ops: 1 };
    if (url.searchParams.has("meta")) return json(head);
    return json({ ...head, state: meta ? await leerEstado(store, meta) : null });
  }

  if (req.method === "PUT") {
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: "El tablero es demasiado grande para guardarse." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "JSON inválido" }, 400); }
    const patch = body && body.patch && typeof body.patch === "object" ? body.patch : null;
    const full = body && body.state && typeof body.state === "object" ? body.state : null;
    const K = body && body.keys && typeof body.keys === "object" ? body.keys : null;
    if (!patch && !K && !(full && Array.isArray(full.TEAM))) return json({ error: "Datos incompletos: falta el equipo (TEAM)." }, 400);
    if (patch && "TEAM" in patch && !Array.isArray(patch.TEAM)) return json({ error: "Datos incompletos: falta el equipo (TEAM)." }, 400);

    const curVersion = meta?.version || 0;
    if ((Number(body.baseVersion) || 0) !== curVersion) {
      // Otra persona guardó después de que esta vista cargó: se devuelve su versión.
      return json({ error: "conflict", ops: 1, version: curVersion, updatedAt: meta?.updatedAt || null, updatedBy: meta?.updatedBy || null, state: await leerEstado(store, meta) }, 409);
    }

    const cambios = {};
    PARTS.forEach((k) => { const src = patch || full; if (src[k] !== undefined) cambios[k] = src[k]; });
    let completo = null;
    if (!meta?.parts) {
      // Migración: la primera vez se escriben todas las partes
      completo = { ...((meta && (await leerEstado(store, meta))) || {}), ...cambios };
      if (!Array.isArray(completo.TEAM)) return json({ error: "Datos incompletos: falta el equipo (TEAM)." }, 400);
      Object.assign(cambios, completo);
    }
    // Cambios por clave (un proyecto, una clave de META): se aplican sobre lo guardado
    if (K) for (const part of ["PROJECTS", "META"]) {
      const ops = K[part]; if (!ops || typeof ops !== "object" || Array.isArray(ops)) continue;
      const cur = cambios[part] !== undefined ? cambios[part] : (completo ? completo[part] : await store.get("p/" + part, { type: "json" }));
      const nuevo = { ...((cur && typeof cur === "object" && !Array.isArray(cur)) ? cur : {}) };
      Object.keys(ops).forEach((k) => { if (ops[k] === null) delete nuevo[k]; else nuevo[k] = ops[k]; });
      cambios[part] = nuevo;
    }
    await Promise.all(Object.keys(cambios).map((k) => store.setJSON("p/" + k, cambios[k])));

    const now = new Date().toISOString();
    const quien = String((K && K.META && K.META.updatedBy) || (cambios.META || {}).updatedBy || "");
    const next = { version: curVersion + 1, updatedAt: now, updatedBy: quien, parts: 1, backupAt: meta?.backupAt, backupDay: meta?.backupDay };
    // Copia de seguridad diaria: como mucho una cada 15 minutos
    const dia = now.slice(0, 10), last = meta?.backupAt ? Date.parse(meta.backupAt) : 0;
    if (!last || Date.now() - last > 15 * 60 * 1000 || (meta.backupDay && meta.backupDay !== dia)) {
      const st = completo || (await leerPartes(store));
      await store.setJSON(`backup/${dia}`, { version: next.version, updatedAt: now, updatedBy: quien, state: st });
      next.backupAt = now; next.backupDay = dia;
    }
    await store.setJSON("state-meta", next);
    return json({ version: next.version, updatedAt: now, updatedBy: quien, ops: 1 });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/state" };

