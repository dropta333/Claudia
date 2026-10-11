(async () => {
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;z-index:2147483647;top:16px;right:16px;max-width:360px;padding:16px 18px;border-radius:14px;background:#0B0B0F;color:#fff;font:600 14px/1.4 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const say = (t) => { box.textContent = "Extractor del tablero · " + t; }; document.body.appendChild(box);
  try {
    say("leyendo los datos…");
    const r = await fetch("/api/state", { cache: "no-store" }); if (!r.ok) throw new Error("No se pudieron leer los datos (" + r.status + "). ¿Estás en el sitio del tablero?");
    const j = await r.json(), st = j.state || j; if (!st || !Array.isArray(st.TEAM)) throw new Error("Este sitio no devolvió datos del tablero.");
    const txt = JSON.stringify(st), ids = [...new Set([...txt.matchAll(/\/api\/files\/([A-Za-z0-9-]{8,64})/g)].map((m) => m[1]))], archivos = {}; let mal = 0;
    for (let i = 0; i < ids.length; i++) {
      say(`copiando archivos ${i + 1} de ${ids.length}…`);
      try {
        const f = await fetch("/api/files/" + ids[i]); if (!f.ok) { mal++; continue; }
        const b = await f.blob(), m = (f.headers.get("content-disposition") || "").match(/filename\*=UTF-8''([^;]+)/);
        const data = await new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = ko; fr.readAsDataURL(b); });
        archivos[ids[i]] = { name: m ? decodeURIComponent(m[1]) : "archivo", type: b.type, size: b.size, data };
      } catch (e) { mal++; }
    }
    say("preparando el archivo…");
    const out = { restauracionCompleta: true, de: location.origin, el: new Date().toISOString(), version: j.version || null, state: st, archivos };
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: "application/json" }));
    a.download = "restauracion-completa-" + location.hostname.split(".")[0] + "-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove();
    const nP = Object.keys(st.PROJECTS || {}).length, nL = ((st.META || {}).licencias || []).length;
    say(`listo ✓ ${nP} proyectos, ${(st.TEAM || []).length} personas, ${nL} licencias y ${Object.keys(archivos).length} archivos${mal ? ` (${mal} no se pudieron copiar)` : ""}. Revisa tu carpeta de Descargas.`);
    setTimeout(() => box.remove(), 20000);
  } catch (e) { say("error: " + e.message); box.style.background = "#B4232F"; }
})();
