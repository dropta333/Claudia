// Tráfico Post — voz, cámara y pantalla de la Sala de juntas con Daily (v218).
// GET  /api/daily → { enabled, url }                         (la Sala pregunta si las llamadas están listas)
// POST /api/daily → body { id, name } → { url, token, exp }  (permiso de entrada para esa persona, dura 4 horas)
// La clave de Daily nunca llega al navegador: vive en las variables de entorno del sitio
// (Netlify → Site configuration → Environment variables):
//   DAILY_API_KEY  = la clave de API de Daily (Developers → API keys)
//   DAILY_ROOM_URL = la dirección de la sala, por ejemplo https://<equipo>.daily.co/<sala>
// Recomendado: dejar la sala de Daily como "privada", así solo entra quien recibe permiso desde el tablero.
// No se graba nada ni se guarda el contenido de las llamadas.

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const env = (k) => (typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get(k)) || process.env[k] || "";
const ajeno = (req, url) => { if (req.method === "GET") return false; const o = req.headers.get("origin"); if (o) { try { return new URL(o).host !== url.host; } catch { return true; } } return req.headers.get("sec-fetch-site") === "cross-site"; };
const HORAS = 4;

function sala() {
  const key = env("DAILY_API_KEY").trim(), raw = env("DAILY_ROOM_URL").trim();
  if (!key || !raw) return null;
  try { const u = new URL(raw); const room = u.pathname.split("/").filter(Boolean).pop(); if (!/\.daily\.co$/.test(u.hostname) || !room) return null; return { key, url: `https://${u.hostname}/${room}`, room }; }
  catch { return null; }
}
const limpio = (s, n) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

export default async (req) => {
  const url = new URL(req.url);
  if (ajeno(req, url)) return new Response("Origen no permitido", { status: 403 });
  const s = sala();
  if (req.method === "GET") return json({ enabled: !!s, url: s ? s.url : null });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!s) return json({ error: "Las llamadas todavía no están configuradas en este sitio." }, 503);
  let b = {}; try { b = JSON.parse((await req.text()).slice(0, 4096) || "{}"); } catch { return json({ error: "Pedido inválido" }, 400); }
  const name = limpio(b.name, 80), id = limpio(b.id, 80);
  if (!name || !id) return json({ error: "Falta el nombre" }, 400);
  const exp = Math.floor(Date.now() / 1000) + HORAS * 3600;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST", signal: ctl.signal, headers: { "content-type": "application/json", authorization: `Bearer ${s.key}` },
      body: JSON.stringify({ properties: { room_name: s.room, user_name: name, user_id: id, exp, eject_at_token_exp: true, start_audio_off: true, start_video_off: true, enable_screenshare: true, is_owner: false } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.token) return json({ error: "Daily no entregó el permiso. Revisa la clave y la sala en las variables del sitio." }, 502);
    return json({ url: s.url, token: j.token, exp });
  } catch (e) { return json({ error: e && e.name === "AbortError" ? "Daily tardó demasiado en responder." : "No se pudo hablar con Daily." }, 504); }
  finally { clearTimeout(t); }
};

export const config = { path: "/api/daily" };
