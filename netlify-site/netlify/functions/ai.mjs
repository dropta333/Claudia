// Tráfico Post — puente con la IA aprobada (v212). Apagado hasta que se configuren las variables en Netlify.
// GET  /api/ai  → { enabled, provider }                      (el tablero pregunta una vez si hay IA)
// POST /api/ai  → body { messages:[…], tools:[…] }            → { message: { content, tool_calls } }
// La clave nunca llega al navegador: vive en las variables de entorno del sitio (Site configuration → Environment variables).
//
// Opción A · Azure OpenAI (lo más probable en Publicis):
//   AI_PROVIDER=azure · AZURE_OPENAI_ENDPOINT=https://<recurso>.openai.azure.com · AZURE_OPENAI_KEY=… · AZURE_OPENAI_DEPLOYMENT=<nombre del despliegue>
//   (opcional) AZURE_OPENAI_API_VERSION=2024-10-21
// Opción B · cualquier API compatible con OpenAI (gateway interno, Marcel/CoreAI si exponen ese formato):
//   AI_PROVIDER=compatible · AI_BASE_URL=https://…/v1 · AI_API_KEY=… · AI_MODEL=<modelo>
// No se guarda ni se registra el contenido de las conversaciones.

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const env = (k) => (typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get(k)) || process.env[k] || "";
const ajeno = (req, url) => { if (req.method === "GET") return false; const o = req.headers.get("origin"); if (o) { try { return new URL(o).host !== url.host; } catch { return true; } } return req.headers.get("sec-fetch-site") === "cross-site"; };
const MAX = 60 * 1024;

function destino() {
  const p = (env("AI_PROVIDER") || "").toLowerCase();
  if (p === "azure") {
    const ep = env("AZURE_OPENAI_ENDPOINT").replace(/\/+$/, ""), key = env("AZURE_OPENAI_KEY"), dep = env("AZURE_OPENAI_DEPLOYMENT"), ver = env("AZURE_OPENAI_API_VERSION") || "2024-10-21";
    if (!ep || !key || !dep) return null;
    return { provider: "azure", url: `${ep}/openai/deployments/${encodeURIComponent(dep)}/chat/completions?api-version=${encodeURIComponent(ver)}`, headers: { "api-key": key }, model: null };
  }
  if (p === "compatible") {
    const base = env("AI_BASE_URL").replace(/\/+$/, ""), key = env("AI_API_KEY"), model = env("AI_MODEL");
    if (!base || !key || !model) return null;
    return { provider: "compatible", url: `${base}/chat/completions`, headers: { authorization: `Bearer ${key}` }, model };
  }
  return null;
}

export default async (req) => {
  const url = new URL(req.url);
  if (ajeno(req, url)) return new Response("Origen no permitido", { status: 403 });
  const d = destino();
  if (req.method === "GET") return json({ enabled: !!d, provider: d ? d.provider : null });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!d) return json({ error: "La IA todavía no está configurada en este sitio." }, 503);
  const raw = await req.text();
  if (raw.length > MAX) return json({ error: "Pedido demasiado largo." }, 413);
  let body; try { body = JSON.parse(raw); } catch { return json({ error: "JSON inválido" }, 400); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : null;
  if (!messages || !messages.length) return json({ error: "Faltan los mensajes." }, 400);
  const payload = { messages, temperature: 0.2, max_tokens: 500 };
  if (Array.isArray(body.tools) && body.tools.length) { payload.tools = body.tools.slice(0, 24); payload.tool_choice = "auto"; }
  if (d.model) payload.model = d.model;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
    const r = await fetch(d.url, { method: "POST", headers: Object.assign({ "content-type": "application/json" }, d.headers), body: JSON.stringify(payload), signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return json({ error: `El servicio de IA respondió ${r.status}.` }, 502);
    const j = await r.json(); const m = j && j.choices && j.choices[0] && j.choices[0].message;
    if (!m) return json({ error: "Respuesta vacía del servicio de IA." }, 502);
    return json({ message: { content: m.content || "", tool_calls: m.tool_calls || [] } });
  } catch (e) {
    return json({ error: e && e.name === "AbortError" ? "La IA tardó demasiado." : "No se pudo hablar con la IA." }, 502);
  }
};

export const config = { path: "/api/ai" };
