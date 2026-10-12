// Tráfico Post — presencia de la Sala de juntas (v213): quién está, dónde está, qué dijo y qué se proyecta.
// Cada persona escribe solo su propia ficha ("p/<id>"), así dos personas nunca se pisan. Sin audio ni video:
// eso llega con el servicio de llamadas aprobado por TI.
// POST /api/sala  body { id, name, x, y, seat, mic, cam, say?: [{ts,text}], proj?: {k,ts}|null, bye?: true }
//                 → { now, people: [ {id,name,x,y,seat,mic,cam,t,say:[…],proj} ] }  (sin la propia)
// GET  /api/sala  → lo mismo, solo lectura
import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const ajeno = (req, url) => { if (req.method === "GET") return false; const o = req.headers.get("origin"); if (o) { try { return new URL(o).host !== url.host; } catch { return true; } } return req.headers.get("sec-fetch-site") === "cross-site"; };
const VIVO = 20000;            // sin latido en 20 s = salió de la sala
const MSG_VIDA = 15 * 60000;   // los mensajes se quedan 15 min
const limpio = (s, n) => String(s == null ? "" : s).slice(0, n);
const num = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v || 0)));

export default async (req) => {
  const url = new URL(req.url);
  if (ajeno(req, url)) return new Response("Origen no permitido", { status: 403 });
  const store = getStore({ name: "trafico-sala", consistency: "strong" });
  const now = Date.now();
  let yo = null;
  if (req.method === "POST") {
    const raw = await req.text(); if (raw.length > 8000) return json({ error: "Demasiado grande" }, 413);
    let b; try { b = JSON.parse(raw); } catch { return json({ error: "JSON inválido" }, 400); }
    const id = limpio(b.id, 80).replace(/[^\w .@-]/g, ""); if (!id) return json({ error: "Falta id" }, 400);
    yo = id; const key = "p/" + encodeURIComponent(id);
    if (b.bye) { await store.delete(key); }
    else {
      const prev = (await store.get(key, { type: "json" })) || {};
      const say = (prev.say || []).filter(m => now - m.ts < MSG_VIDA);
      (Array.isArray(b.say) ? b.say : []).slice(0, 5).forEach(m => { const t = limpio(m && m.text, 140).trim(); if (t) say.push({ ts: now, text: t }); });
      const proj = b.proj === undefined ? prev.proj || null : (b.proj && b.proj.k ? { k: limpio(b.proj.k, 120), ts: now } : null);
      const rx = b.rx && typeof b.rx.e === "string" && b.rx.e.length <= 8 ? { e: b.rx.e, ts: now } : (prev.rx && now - prev.rx.ts < 20000 ? prev.rx : null);
      await store.setJSON(key, { id, name: limpio(b.name, 80), x: num(b.x, 0, 320), y: num(b.y, 0, 200), seat: num(b.seat, -1, 40), mic: !!b.mic, cam: !!b.cam, cup: b.cup === "cafe" || b.cup === "agua" ? b.cup : "", hand: !!b.hand, rx, t: now, say: say.slice(-12), proj });
    }
  } else if (req.method !== "GET") return json({ error: "Método no permitido" }, 405);
  const { blobs } = await store.list({ prefix: "p/" });
  const all = (await Promise.all(blobs.map(x => store.get(x.key, { type: "json" })))).filter(Boolean);
  const viejos = all.filter(p => now - p.t > VIVO * 3); await Promise.all(viejos.map(p => store.delete("p/" + encodeURIComponent(p.id)).catch(() => { })));
  return json({ now, people: all.filter(p => now - p.t <= VIVO && p.id !== yo) });
};

export const config = { path: "/api/sala" };
