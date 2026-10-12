// Simulación en memoria de Netlify Blobs (solo para pruebas locales)
const stores = globalThis.__blobStores || (globalThis.__blobStores = new Map());
export function getStore({ name }) {
  if (!stores.has(name)) stores.set(name, new Map());
  const m = stores.get(name);
  const conv = (v, type) => v == null ? null : type === "json" ? JSON.parse(v.data) : type === "arrayBuffer" ? v.buf : v.data;
  return {
    async get(k, o = {}) { return conv(m.get(k), o.type); },
    async getWithMetadata(k, o = {}) { const v = m.get(k); return v ? { data: conv(v, o.type), metadata: v.metadata || {} } : null; },
    async set(k, val, o = {}) { m.set(k, { buf: val, data: typeof val === "string" ? val : null, metadata: o.metadata }); },
    async setJSON(k, val) { m.set(k, { data: JSON.stringify(val) }); },
    async delete(k) { m.delete(k); },
    async list(o = {}) { return { blobs: [...m.keys()].filter(k => !o.prefix || k.startsWith(o.prefix)).map(key => ({ key, etag: "" })), directories: [] }; },
  };
}
