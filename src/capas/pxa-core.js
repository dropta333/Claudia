/* ═════ PXA · avatares pixel 32×32 · núcleo (datos, render, editor) ═════ */
(function () {
  const DATA = __DATA__;
  const D = DATA.D, P = DATA.P, O = D.order;
  const hex2 = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const mix = (a, b, t) => { const x = hex2(a), y = hex2(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const ramp = h => [h, mix(h, "#000000", .2), mix(h, "#000000", .38), mix(h, "#ffffff", .28)];
  const DEF = { v: 1, hair: "corto", hc: P.hair[3], eyes: "punto", fh: "ninguno", skin: P.skin[3], fit: "camisa", oc: P.fit[1], dc: null, gl: "ninguna", fc: P.frame[0], acc: "ninguno", ac: P.acc[2], ears: "ninguno", lc: null, sh: "#3b2a24", pin: "none", pc: null, nk: "ninguno", kc: "#e8c14a", fx: "ninguno", xc: null };
  const norm = c => Object.assign({}, DEF, c || {});

  function colors(c, g) {
    const s = c.skin, h = c.hc, o = ramp(c.oc), dcol = c.dc || (g && g.color) || "#6c4cff", d = ramp(dcol), a = ramp(c.ac);
    return { K: P.K, E: P.E, e: P.e, W: P.W, T: P.T, t: P.t, P: P.P, p: P.p, Z: P.Z, z: P.z, m: P.m, l: P.l, x: P.x, y: P.y, r: P.r,
      S: s, s: mix(s, "#000000", .14), L: mix(s, "#ffffff", .4), B: mix(s, "#e0707a", .35),
      H: h, h: mix(h, "#000000", .3), i: mix(h, "#ffffff", .25), n: mix(h, "#000000", .3) + "70",
      O: o[0], o: o[1], q: o[2], u: o[3], G: d[0], g: d[1], A: a[0], a: a[1], F: c.fc, Z: c.sh, z: mix(c.sh, "#ffffff", .32), v: c.lc ? c.lc + "4d" : null,
      X: (g && g.color) || "#6c4cff" };
  }
  /* anim: {br:0|1, blink:bool, dx:-1|0|1} · g: {color, shape} */
  /* v219 · cadenitas: en V sobre el cuello de la prenda */
  const NECK_V = [[12, 0], [13, 1], [14, 2], [15, 3], [16, 3], [17, 2], [18, 1], [19, 0]];
  function neck(x, c, oy) {
    const col = c.kc || "#e8c14a", dk = mix(col, "#000000", .32), hi = mix(col, "#ffffff", .45), px = (cc, i, j) => { x.fillStyle = cc; x.fillRect(i, j, 1, 1); };
    if (c.nk === "perlas") { NECK_V.forEach(([i, j], n) => px(n % 2 ? "#e9e4dc" : "#fbf8f2", i, oy + j)); px("#ffffff", 15, oy + 3); return; }
    NECK_V.forEach(([i, j], n) => px(n % 2 ? dk : col, i, oy + j));
    if (c.nk === "gruesa") { NECK_V.slice(1, 7).forEach(([i, j], n) => px(n % 2 ? col : dk, i, oy + j + 1)); px(hi, 13, oy + 1); px(hi, 18, oy + 1); }
    if (c.nk === "dije") { px(dk, 15, oy + 4); px(dk, 16, oy + 4); px("#7fd0ff", 15, oy + 5); px("#bfe9ff", 16, oy + 5); px("#3f8fbf", 15, oy + 6); px("#5fb0dd", 16, oy + 6); }
  }
  /* v219 · efectos animados alrededor del avatar (t en segundos). capa "back" detrás, "front" delante */
  function fx(x, cfg, ox, oy, t, g, layer) {
    const c = norm(cfg); if (!c.fx || c.fx === "ninguno") return;
    const col = c.xc || (g && g.color) || "#F3FF57", px = (cc, i, j, w, h) => { x.fillStyle = cc; x.fillRect(ox + i, oy + j, w || 1, h || 1); };
    const rgb = hex2(col), rgba = al => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${al.toFixed(3)})`;
    if (c.fx === "aura" && layer !== "front") {
      const pulse = .5 + .5 * Math.sin(t * 2.2);
      for (let j = -2; j < 30; j++) for (let i = 1; i < 31; i++) { const dx = (i - 15.5) / 13, dy = (j - 13) / 16, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1.04) { const al = d > .9 ? (.30 + .22 * pulse) * (1.04 - d) / .14 : .07 + .05 * pulse; if (al > .01) px(rgba(Math.min(.6, al)), i, j); } }
      return;
    }
    if (layer === "back") return;
    if (c.fx === "brillo") {
      [[3, 7, 0], [27, 4, 1.3], [26, 16, 2.4], [4, 17, 3.1], [16, -1, 1.9]].forEach(([i, j, ph]) => {
        const s = (t * 1.6 + ph) % 3; const st = s < .4 ? 1 : s < .9 ? 2 : s < 1.2 ? 1 : 0; if (!st) return;
        const cc = "#fffbe0"; px(cc, i, j); if (st === 2) { px(cc, i - 1, j); px(cc, i + 1, j); px(cc, i, j - 1); px(cc, i, j + 1); px(rgba(.9), i - 2, j); px(rgba(.9), i + 2, j); px(rgba(.9), i, j - 2); px(rgba(.9), i, j + 2); } });
    } else if (c.fx === "ideas") {
      [[3, 0], [26, 1.4], [15, 2.6], [9, 3.5], [21, .7]].forEach(([i, ph], n) => {
        const p = ((t * .45 + ph / 4) % 1), j = Math.round(-6 + p * 30), al = p < .15 ? p / .15 : p > .8 ? (1 - p) / .2 : 1; if (al <= 0) return;
        x.globalAlpha = al; px("#2a1a22", i - 1, j - 1, 5, 6); px("#ffe066", i, j, 3, 3); px("#fff6c2", i, j, 1, 1); px("#c9c4bc", i, j + 3, 3, 1); px("#8e8a94", i + 1, j + 4, 1, 1);
        if (n % 2 === 0 && p > .15 && p < .5) { px("#fff6c2", i - 2, j - 2); px("#fff6c2", i + 4, j - 2); } x.globalAlpha = 1; });
    } else if (c.fx === "confeti") {
      const C = ["#F3FF57", "#ff8fb8", "#7fd0ff", "#b7a8ff", "#8ff0b4", "#ffb36b", col];
      for (let n = 0; n < 11; n++) { const p = ((t * .35 + n * .137) % 1), i = Math.round((n * 7.3) % 30 + Math.sin(t * 2 + n) * 1.5), j = Math.round(-3 + p * 33); if (j > 30) continue;
        x.globalAlpha = p > .85 ? (1 - p) / .15 : 1; px(C[n % C.length], i, j, (n + Math.floor(t * 4)) % 2 ? 2 : 1, 1); x.globalAlpha = 1; }
    }
  }
  function render(cfg, anim, g, cv) {
    const c = norm(cfg), a = anim || {}, k = colors(c, g);
    cv = cv || document.createElement("canvas"); cv.width = cv.height = 32;
    const x = cv.getContext("2d"); x.clearRect(0, 0, 32, 32);
    if (a.t != null && c.fx !== "ninguno") fx(x, c, 0, 0, a.t, g, "back");
    const lay = (L, dy, dx) => { if (!L) return; dx = dx || 0; L.rows.forEach((r, j) => { const y = L.y + j + dy; for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch !== "." && k[ch]) { x.fillStyle = k[ch]; x.fillRect(i + dx, y, 1, 1); } } }); };
    const br = a.br ? 1 : 0, src = D.fit[c.fit] || D.fit.camisa;
    const t = br ? { y: 22, rows: [src.rows[0]].concat(src.rows.slice(3)) } : { y: 21, rows: [src.rows[0]].concat(src.rows.slice(2)) };
    lay(D.shadow.picado, 0); lay(a.walk ? D.walk[a.walk - 1] : D.legsShort, 0); lay(t, 0); if (c.fit === "vestido") lay(D.skirt, 0);
    const psh = c.pin === "auto" ? (g && g.shape) : (c.pin && c.pin !== "none" ? c.pin : null), pcol = c.pc || (g && g.color);
    if (g && !g.nopin && psh && D.pins[psh] && pcol) {
      const pm = D.pins[psh], oy = 22 + br + (pm.length < 4 ? 1 : 0), ox = 11, sd = mix(pcol, "#000000", .35), hl = mix(pcol, "#ffffff", .45);
      pm.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === "X") {
        const below = !pm[j + 1] || pm[j + 1][i] !== "X", right = r[i + 1] !== "X", first = j === 0 || pm[j - 1][i] !== "X";
        x.fillStyle = below ? sd : (first && i <= 1 ? hl : (right ? mix(pcol, "#000000", .18) : pcol)); x.fillRect(ox + i, oy + j, 1, 1); } });
    }
    if (c.nk && c.nk !== "ninguno") neck(x, c, 21 + br);
    const u = 1 + br;
    lay(D.base, u); lay(D.blush, 1 + u); lay(D.brows, 1 + u);
    lay(a.blink ? D.blink : (D.eyes[c.eyes] || D.eyes.punto), 1 + u, a.blink ? 0 : (a.dx || 0));
    if (c.fh !== "ninguno") lay(D.facial[c.fh], c.fh === "barba" ? u : 1 + u);
    lay(D.hair[c.hair], u);
    if (c.ears !== "ninguno") lay(D.ears[c.ears], u);
    if (c.acc !== "ninguno") lay(D.acc[c.acc], u);
    if (c.gl !== "ninguna") lay(D.glasses[c.gl], 1 + u);
    if (a.t != null && c.fx !== "ninguno") fx(x, c, 0, 0, a.t, g, "front");
    return cv;
  }
  const HEAD = [5, 0, 22, 22];
  const cache = new Map();
  function headURL(cfg, g, px) {
    px = px || 88; const key = JSON.stringify([cfg, g, px]); if (cache.has(key)) return cache.get(key);
    const src = render(cfg, null, null), out = document.createElement("canvas"); out.width = out.height = px;
    const x = out.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(src, HEAD[0], HEAD[1], HEAD[2], HEAD[3], 0, 0, px, px);
    const u = out.toDataURL("image/png"); cache.set(key, u); return u;
  }
  function fullURL(cfg, g, px) {
    px = px || 96; const key = JSON.stringify(["f", cfg, g, px]); if (cache.has(key)) return cache.get(key);
    const src = render(cfg, null, g), out = document.createElement("canvas"); out.width = out.height = px;
    const x = out.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, px, px);
    const u = out.toDataURL("image/png"); cache.set(key, u); return u;
  }
  function blit(cv, src, crop) { const [sx, sy, w, h] = crop || [0, 0, 32, 32]; const x = cv.getContext("2d"); x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(src, sx, sy, w, h, 0, 0, cv.width, cv.height); }

  /* live canvas: idle breathing (shrinks on exhale), glances, blinks */
  const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function live(cv, getCfg, g) {
    const a = { br: 0, blink: false, dx: 0 }, off = document.createElement("canvas");
    const draw = () => { if (!cv.isConnected) return false; if (document.hidden || !cv.getClientRects().length) return true; blit(cv, render(getCfg(), a, g, off)); return true; };   /* oculto: no se redibuja */
    const R = (m, n) => m + Math.random() * (n - m);
    const loop = (fn, min, max) => setTimeout(() => { if (cv.isConnected) fn(); }, R(min, max));
    const breathe = () => { if (reduce()) return; a.br = 1; draw(); setTimeout(() => { a.br = 0; if (draw()) loop(breathe, 2400, 4600); }, R(700, 1000)); };
    const glance = () => { if (reduce()) return; a.dx = Math.random() < .5 ? -1 : 1; draw(); setTimeout(() => { a.dx = 0; if (draw()) loop(glance, 5000, 11000); }, R(700, 1400)); };
    const blink = () => { a.blink = true; draw(); setTimeout(() => { a.blink = false; if (!draw()) return; if (Math.random() < .18) setTimeout(() => { a.blink = true; draw(); setTimeout(() => { a.blink = false; draw(); }, 110); }, 170); loop(blink, 2600, 5600); }, 120); };
    try { const io = new IntersectionObserver(es => { if (!cv.isConnected) return io.disconnect(); if (es.some(e => e.isIntersecting)) draw(); }); io.observe(cv); } catch (e) { }
    const fxOn = () => { const c = getCfg(); return c && c.fx && c.fx !== "ninguno" && !reduce(); };
    const fxIv = setInterval(() => { if (!cv.isConnected) { clearInterval(fxIv); return; } if (fxOn()) { a.t = performance.now() / 1000; draw(); } else if (a.t != null) { a.t = null; draw(); } }, 110);
    draw(); loop(breathe, 1200, 3000); loop(glance, 4000, 8000); loop(blink, 1500, 4000);
    return { redraw: draw, a };
  }

  /* ---------- editor ---------- */
  const NAMES = {
    eyes: { punto: "Punto", grandes: "Grandes", redondos: "Redondos", alargados: "Alargados", "pestañas": "Pestañas", brillo: "Brillo", felices: "Felices", serenos: "Serenos" },
    fh: { ninguno: "Ninguno", barba: "Barba", candado: "Candado", bigote: "Bigote", sombra: "Sombra", labial: "Labial", pecas: "Pecas", lunar: "Lunar" },
    hair: { corto: "Corto", raya: "Raya", copete: "Copete", hipster: "Hipster", mod: "Mod", mullet: "Mullet", despeinado: "Despeinado", flequillo: "Flequillo", rapado: "Rapado", calvo: "Calvo", rizado: "Rizado", afro: "Afro", pixie: "Pixie", bob: "Bob", lacio: "Lacio", melena: "Melena", ondas: "Ondas", rizos: "Rizos", "moño": "Moño", "moños": "Dos moños", coleta: "Coleta", coletas: "Coletas", trenza: "Trenza", gorro: "Gorro" },
    fit: { ejecutivo: "Traje", blazer: "Blazer", chaleco: "Chaleco", tortuga: "Tortuga", cardigan: "Cárdigan", camisa: "Camisa", cuadros: "Cuadros", polo: "Polo", cuero: "Cuero", denim: "Denim", trench: "Gabardina", bufanda: "Abrigo", blusa: "Blusa", vestido: "Vestido", bomber: "Bomber", juvenil: "Hoodie" },
    gl: { ninguna: "Ninguna", cuadradas: "Cuadradas", redondas: "Redondas", media: "Media montura", gato: "Ojo de gato", aviador: "Aviador" },
    acc: { ninguno: "Ninguno", gorra: "Gorra", boina: "Boina", "audífonos": "Audífonos", diadema: "Diadema", lazo: "Lazo", pinzas: "Pinzas", flor: "Flor" },
    ears: { ninguno: "Sin aretes", aretes: "Aretes", argollas: "Argollas" },
    nk: { ninguno: "Ninguna", cadena: "Cadena", gruesa: "Gruesa", perlas: "Perlas", dije: "Con dije" },
    fx: { ninguno: "Ninguno", brillo: "Brillo", aura: "Aura", ideas: "Lluvia de ideas", confeti: "Confeti" },
  };
  const NK = ["ninguno", "cadena", "gruesa", "perlas", "dije"], FX = ["ninguno", "brillo", "aura", "ideas", "confeti"];
  const GOLD = [["#e8c14a", "#f3d98a", "#c9a45a", "#a9adb6", "#e9e4dc", "#d98a6a", "#2a1a22", "#7fd0ff", "#e8a0b8", "#8ff0b4"]];
  const ICON = {
    cara: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0"/></svg>',
    pelo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13c3 0 6-2 8-5c2 3 5 5 8 5"/><path d="M6 13v5M18 13v5"/></svg>',
    ropa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M8 4l4 3l4-3l5 3l-2 5h-3v8H8v-8H5L3 7z"/></svg>',
    acc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 15a8 8 0 0 1 16 0"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
    shuffle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 4l3 3l-3 3"/><path d="M18 20l3 -3l-3 -3"/><path d="M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5"/><path d="M21 7h-5a4.98 4.98 0 0 0 -3 1m-4 8a4.98 4.98 0 0 1 -3 1h-3"/></svg>',
  };
  const TABS = [["cara", "Cara"], ["pelo", "Pelo"], ["ropa", "Ropa"], ["acc", "Accesorios"]];
  const CROP = { face: [9, 8, 14, 14], head: [5, 0, 22, 22], body: [8, 16, 16, 16], top: [6, 0, 20, 20], neck: [9, 16, 14, 14] };
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

  /* ---------- paletas amplias (cintas a todo el ancho) ---------- */
  const hsl = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join(""); };
  const HUES = Array.from({ length: 18 }, (_, i) => i * 20);
  const SPECTRUM = [
    ["#f3f1ee", "#c9c4bc", "#8e8a94"].concat(HUES.map(h => hsl(h, 62, 56))),
    ["#4a4652", "#2a2630", "#151218"].concat(HUES.map(h => hsl(h, 48, 30))),
  ];
  const RIB = {
    skin: [["#fff0e4", "#fbe3cf", "#f7d7bd", "#f0c9a6", "#eec09a", "#e2aa80", "#d39a6e", "#c98f66", "#b57a52", "#a9714d", "#8e5c40", "#7a4e36", "#6e4530", "#5a3828", "#4f3122", "#3e271b"]],
    hair: [["#151218", "#1c1820", "#2b2630", "#3f271b", "#5b3a29", "#7d5440", "#9a6a48", "#8a3b1f", "#b0562f", "#c98a4a", "#d4b06a", "#ecd396", "#e8e2d6", "#c9c6cc", "#a7a5ad", "#6e6b74"],
           ["#5c1420", "#a12b3b", "#e05a5a", "#f08a5d", "#e8a0b8", "#f4c2d4", "#c7a6e8", "#a58ad8", "#7a5cc4", "#4f6fb5", "#7fb2e5", "#5fc3c9", "#7cc7a8", "#3f8f6a", "#f2d46b", "#ffffff"]],
  };
  const LENS = [["#2a2630", "#5b5f6b", "#8a6a3a", "#c98a2a", "#e0b84a", "#e06a8a", "#c94a4a", "#8a6ad8", "#4f7fd1", "#5fb8d8", "#3f9f7a", "#9fd86a"]];
  const SHAPES = { hex: "12,2 21,7 21,17 12,22 3,17 3,7", square: "4,4 20,4 20,20 4,20", diamond: "12,2 22,12 12,22 2,12", tri: "12,3 22,20 2,20", trid: "2,4 22,4 12,21", penta: "12,2 22,9 18,21 6,21 2,9", octa: "8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8", star: "12,2 15,9 22,9 16.5,14 19,22 12,17.5 5,22 7.5,14 2,9 9,9" };
  const shapeSvg = (sh, c) => sh === "circle" || sh === "ring" ? `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="${sh === "ring" ? "none" : c}" stroke="${c}" stroke-width="${sh === "ring" ? 4 : 0}"/></svg>` : `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="${SHAPES[sh] || SHAPES.hex}" fill="${c}"/></svg>`;

  /* opts: {cfg, group:{name,color,shape}, groups:[{name,color}], onSave(cfg), onClose()} */
  function editor(host, opts) {
    const saved = norm(opts.cfg), dk = opts.draftKey ? "pxa-draft:" + opts.draftKey : null;
    const rd = () => { try { return dk ? JSON.parse(localStorage.getItem(dk) || "null") : null; } catch (e) { return null; } };
    const wr = v => { try { if (!dk) return; if (v) localStorage.setItem(dk, JSON.stringify(v)); else localStorage.removeItem(dk); } catch (e) { } };
    let base = JSON.stringify(saved), draft = rd(), st = draft && JSON.stringify(norm(draft)) !== base ? norm(draft) : saved, tab = "cara", tgt = {};
    const dirty = () => JSON.stringify(st) !== base;
    const g = opts.group || { name: "", color: "#6c4cff", shape: "circle" };
    host.classList.add("pxa-ed"); host.style.setProperty("--pa-gc", g.color);
    host.innerHTML = `<header class="pxa-hd"><div class="pxa-hdt"><span class="pxa-eb">Tráfico Post · Perfil</span><h2>Tu avatar</h2>
        <span class="pxa-gp">${shapeSvg(g.shape, g.color)}${esc(g.name || "Mi grupo")}</span></div>${opts.onClose ? '<button type="button" class="pxa-x" aria-label="Cerrar">✕</button>' : ""}</header>
      <div class="pxa-mb"><div class="pxa-stage"><div class="pxa-cv"><canvas width="320" height="320" aria-label="Vista previa del avatar"></canvas></div></div>
      <div class="pxa-panel"><div class="pxa-tabs" role="tablist"></div><div class="pxa-body" role="tabpanel"></div><div class="pxa-colors"></div></div></div>
      <footer class="pxa-mf"><button type="button" class="pxa-btn pxa-rnd">${ICON.shuffle}Aleatorio</button><button type="button" class="pxa-btn pri pxa-save">Guardar avatar</button></footer>`;
    const cv = host.querySelector(".pxa-cv canvas"), L = live(cv, () => st, g);
    const $ = s => host.querySelector(s);
    const mark = () => { host.classList.toggle("is-dirty", dirty()); wr(dirty() ? st : null); };
    const set = (k, v) => { st = Object.assign({}, st, { [k]: v }); L.redraw(); build(); mark(); };
    function requestClose() {
      if (!dirty()) { wr(null); if (opts.onClose) opts.onClose(); return; }
      if (host.querySelector(".pxa-confirm")) return;
      const c = document.createElement("div"); c.className = "pxa-confirm"; c.setAttribute("role", "alertdialog"); c.setAttribute("aria-label", "Cambios sin guardar");
      c.innerHTML = `<div class="pxa-cbox"><b>¿Guardamos tu avatar?</b><p>Tienes cambios sin guardar. Si sales ahora, se pierden.</p>
        <div class="pxa-cbtns"><button type="button" class="pxa-btn" data-a="keep">Seguir editando</button><button type="button" class="pxa-btn ghost" data-a="drop">Descartar</button><button type="button" class="pxa-btn pri" data-a="save">Guardar y salir</button></div></div>`;
      c.onclick = e => { const a = e.target.closest("[data-a]"); if (!a) return; const k = a.dataset.a;
        if (k === "keep") { c.remove(); return; }
        if (k === "drop") { wr(null); c.remove(); if (opts.onClose) opts.onClose(); return; }
        if (k === "save") { doSave(); c.remove(); if (opts.onClose) opts.onClose(); } };
      host.appendChild(c); c.querySelector('[data-a="save"]').focus();
    }
    if (opts.onClose) $(".pxa-x").onclick = () => requestClose();
    if (draft && JSON.stringify(st) !== base) {
      const n = document.createElement("div"); n.className = "pxa-restore";
      n.innerHTML = '<span>Retomamos los cambios que no alcanzaste a guardar.</span><button type="button">Descartarlos</button>';
      n.querySelector("button").onclick = () => { st = saved; wr(null); n.remove(); L.redraw(); build(); mark(); };
      $(".pxa-panel").prepend(n);
    }
    function thumbs(label, key, list, crop, cols) {
      const w = document.createElement("div"); w.className = "pxa-grp";
      w.innerHTML = `<p class="pxa-lbl">${label}</p>`;
      const gr = document.createElement("div"); gr.className = "pxa-th c" + cols;
      list.forEach(v => {
        const b = document.createElement("button"); b.type = "button"; b.className = "pxa-t"; b.setAttribute("aria-pressed", st[key] === v);
        const c = document.createElement("canvas"); c.width = c.height = 56; blit(c, render(Object.assign({}, st, { [key]: v }), null, { color: g.color, nopin: true }), crop);
        const s = document.createElement("span"); s.textContent = NAMES[key][v];
        b.append(c, s); b.onclick = () => set(key, v); gr.appendChild(b);
      });
      w.appendChild(gr); return w;
    }
    function segmented(label, key, list) {
      const w = document.createElement("div"); w.className = "pxa-seg-row";
      w.innerHTML = `<p class="pxa-lbl">${label}</p>`;
      const s = document.createElement("div"); s.className = "pxa-seg";
      list.forEach(v => { const b = document.createElement("button"); b.type = "button"; b.textContent = NAMES[key][v]; b.className = st[key] === v ? "on" : ""; b.setAttribute("aria-pressed", st[key] === v); b.onclick = () => set(key, v); s.appendChild(b); });
      w.appendChild(s); return w;
    }
    /* colors: targets = [[key,label,rows,{group}]] — one full-width ribbon, a small switch when there are several targets */
    function colors(targets) {
      const box = $(".pxa-colors"); box.innerHTML = "";
      if (!targets.length) { box.innerHTML = '<p class="pxa-note">Elige gafas o un accesorio para cambiar su color.</p>'; return; }
      const cur = targets.find(t => t[0] === tgt[tab]) || targets[0]; tgt[tab] = cur[0];
      const head = document.createElement("div"); head.className = "pxa-ch";
      if (targets.length > 1) {
        const s = document.createElement("div"); s.className = "pxa-seg sm";
        targets.forEach(t => { const b = document.createElement("button"); b.type = "button"; b.className = t === cur ? "on" : ""; b.setAttribute("aria-pressed", t === cur);
          const val = (t[0] === "dc" || t[0] === "pc") ? (st[t[0]] || g.color) : (st[t[0]] || "transparent"); b.innerHTML = `<i style="background:${esc(val)}"></i>${t[1]}`; b.onclick = () => { tgt[tab] = t[0]; build(); }; s.appendChild(b); });
        head.appendChild(s);
      } else head.innerHTML = `<p class="pxa-lbl">${cur[1]}</p>`;
      box.appendChild(head);
      const row = document.createElement("div"); row.className = "pxa-rib-wrap";
      const key = cur[0], val = st[key];
      if (cur[3] && cur[3].group) {
        const m = document.createElement("button"); m.type = "button"; m.className = "pxa-mine"; m.setAttribute("aria-pressed", !st[key]); m.title = "Color de mi grupo · " + (g.name || "");
        m.innerHTML = `${shapeSvg(g.shape, g.color)}<span>Mi grupo</span>`; m.onclick = () => set(key, null); row.appendChild(m);
      }
      if (cur[3] && cur[3].none) {
        const m = document.createElement("button"); m.type = "button"; m.className = "pxa-mine"; m.setAttribute("aria-pressed", !st[key]);
        m.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 18L18 6" stroke="currentColor" stroke-width="2"/></svg><span>${cur[3].none}</span>`; m.onclick = () => set(key, null); row.appendChild(m);
      }
      const rib = document.createElement("div"); rib.className = "pxa-rib"; rib.setAttribute("role", "radiogroup"); rib.setAttribute("aria-label", cur[1]);
      cur[2].forEach(r => { const rr = document.createElement("div"); rr.className = "pxa-rr";
        r.forEach(hx => { const s = document.createElement("button"); s.type = "button"; s.className = "pxa-c"; s.style.background = hx; s.title = hx; s.setAttribute("role", "radio"); s.setAttribute("aria-label", cur[1] + " " + hx);
          s.setAttribute("aria-checked", (val || "").toLowerCase() === hx.toLowerCase()); s.onclick = () => set(key, hx); rr.appendChild(s); });
        rib.appendChild(rr); });
      row.appendChild(rib); box.appendChild(row);
    }
    function pins() {
      const w = document.createElement("div"); w.className = "pxa-seg-row pxa-pins";
      w.innerHTML = '<p class="pxa-lbl">Pin</p>';
      const s = document.createElement("div"); s.className = "pxa-seg pxa-pinseg";
      const col = st.pc || g.color, cur = st.pin == null ? "none" : st.pin;
      [["none", "Sin pin"], ["auto", "Auto"]].concat(Object.keys(D.pins).map(k => [k, k])).forEach(([k, l]) => {
        const b = document.createElement("button"); b.type = "button"; const on = cur === k; b.className = (on ? "on " : "") + (k === "none" || k === "auto" ? "lbl" : "shp"); b.setAttribute("aria-pressed", on);
        b.title = k === "none" ? "Sin pin" : k === "auto" ? "Forma de mi grupo · " + (g.name || "") : "Forma: " + k; b.setAttribute("aria-label", b.title);
        b.innerHTML = k === "none" ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6.5 17.5L17.5 6.5" stroke="currentColor" stroke-width="2"/></svg><span>Sin pin</span>' : k === "auto" ? `${shapeSvg(g.shape, col)}<span>Auto</span>` : shapeSvg(k, col);
        b.onclick = () => set("pin", k); s.appendChild(b);
      });
      w.appendChild(s); return w;
    }
    function efectos() {
      const w = document.createElement("div"); w.className = "pxa-grp pxa-fxg"; w.innerHTML = '<p class="pxa-lbl">Efectos</p>';
      const gr = document.createElement("div"); gr.className = "pxa-fx";
      FX.forEach(v => { const b = document.createElement("button"); b.type = "button"; b.className = "pxa-fxb" + (st.fx === v ? " on" : ""); b.setAttribute("aria-pressed", st.fx === v);
        const c = document.createElement("canvas"); c.width = c.height = 64; const sp = document.createElement("span"); sp.textContent = NAMES.fx[v]; b.append(c, sp); b.onclick = () => set("fx", v); gr.appendChild(b);
        const paint = () => { if (!c.isConnected) return false; const src = render(Object.assign({}, st, { fx: v }), { t: performance.now() / 1000 }, { color: g.color, nopin: true }); blit(c, src, [2, -2, 28, 28]); return true; };
        paint(); if (v !== "ninguno" && !reduce()) { const iv = setInterval(() => { if (!paint()) clearInterval(iv); }, 140); } });
      w.appendChild(gr); return w;
    }
    function build() {
      const t = $(".pxa-tabs"); t.innerHTML = "";
      TABS.forEach(([k, l]) => { const b = document.createElement("button"); b.type = "button"; b.className = tab === k ? "on" : ""; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", tab === k); b.innerHTML = ICON[k] + `<span>${l}</span>`; b.onclick = () => { tab = k; build(); }; t.appendChild(b); });
      const body = $(".pxa-body"); body.innerHTML = "";
      const groupRow = [(opts.groups || []).map(x => x.color).concat(["#f3f1ee", "#2a1a22", "#c9a45a", "#a9adb6"])].concat([SPECTRUM[0].slice(3)]);
      if (tab === "cara") { body.append(thumbs("Ojos", "eyes", O.eyes, CROP.face, 8), thumbs("Detalles", "fh", O.fh, CROP.face, 8)); colors([["skin", "Piel", RIB.skin]]); }
      if (tab === "pelo") { body.append(thumbs("Estilo", "hair", O.hair, CROP.head, 8)); colors([["hc", "Cabello", RIB.hair]]); }
      if (tab === "ropa") { body.append(thumbs("Prenda", "fit", O.fit, CROP.body, 8), pins()); colors([["oc", "Prenda", SPECTRUM], ["dc", "Detalle", groupRow, { group: true }], ["pc", "Pin", groupRow, { group: true }], ["sh", "Zapatos", SPECTRUM]]); }
      if (tab === "acc") {
        body.append(thumbs("Gafas", "gl", O.gl, CROP.face, 6), thumbs("Cabeza", "acc", O.acc, CROP.top, 8), thumbs("Cuello", "nk", NK, CROP.neck, 5), segmented("Orejas", "ears", O.ears), efectos());
        const ts = []; if (st.gl !== "ninguna") { ts.push(["fc", "Montura", SPECTRUM]); ts.push(["lc", "Lentes", LENS, { none: "Sin tinte" }]); } if (st.acc !== "ninguno") ts.push(["ac", "Accesorio", SPECTRUM]);
        if (st.nk !== "ninguno" && st.nk !== "perlas") ts.push(["kc", "Cadena", GOLD]); if (st.fx !== "ninguno" && st.fx !== "ideas") ts.push(["xc", "Efecto", groupRow, { group: true }]); colors(ts);
      }
    }
    $(".pxa-rnd").onclick = () => {
      const q = a => a[Math.floor(Math.random() * a.length)];
      st = Object.assign({}, st, { hair: q(O.hair), hc: q(RIB.hair[0]), eyes: q(O.eyes), fh: Math.random() < .35 ? q(O.fh.slice(1)) : "ninguno", skin: q(RIB.skin[0]), fit: q(O.fit), oc: q(q(SPECTRUM)),
        gl: Math.random() < .4 ? q(O.gl.slice(1)) : "ninguna", fc: q(q(SPECTRUM)), acc: Math.random() < .3 ? q(O.acc.slice(1)) : "ninguno", ac: q(SPECTRUM[0]), ears: Math.random() < .25 ? q(O.ears.slice(1)) : "ninguno", nk: Math.random() < .2 ? q(NK.slice(1)) : "ninguno" });
      L.redraw(); build(); mark();
    };
    function doSave() { if (opts.onSave) opts.onSave(Object.assign({}, st)); base = JSON.stringify(st); wr(null); mark(); const r = host.querySelector(".pxa-restore"); if (r) r.remove(); }
    $(".pxa-save").onclick = () => { const b = $(".pxa-save"); doSave(); b.textContent = "Guardado"; setTimeout(() => { if (b.isConnected) b.textContent = "Guardar avatar"; }, 1300); };
    build();
    mark();
    return { get: () => Object.assign({}, st), isDirty: dirty, requestClose, save: doSave };
  }

  /* ---------- burbuja de asistente (texto por ahora; la IA se conecta después) ---------- */
  const TAIL = '<svg class="pxb-t" viewBox="0 0 4 3" aria-hidden="true" shape-rendering="crispEdges"><rect x="0" y="0" width="1" height="3" fill="#141218"/><rect x="3" y="0" width="1" height="1" fill="#141218"/><rect x="2" y="1" width="1" height="1" fill="#141218"/><rect x="1" y="2" width="1" height="1" fill="#141218"/><rect x="1" y="0" width="2" height="1" fill="#e6e4ff"/><rect x="1" y="1" width="1" height="1" fill="#e6e4ff"/></svg>';
  const REPLIES = [
    "Anotado. Esa toma sale en la próxima versión.",
    "Recibido. Estoy en preproducción, pronto lo resuelvo.",
    "Buena. Cuando me conecten, lo hago en una toma.",
  ];
  /* opts: {hello, chips:[{label,hot,onClick}], onAsk(text) -> {text, chips, confirm:{title,lines,yes,onYes}} | Promise, mentions(type, q) -> [{id,label,sub,insert}], onClose} */
  function bubble(anchor, opts) {
    opts = opts || {};
    const b = document.createElement("div"); b.className = "pxa-bub pxb"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Asistente");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    b.innerHTML = `<div class="pxb-o"><div class="pxb-i"><button type="button" class="pxa-bx" aria-label="Cerrar">✕</button><p class="pxa-you" hidden></p><p class="pxa-bt" aria-live="polite"></p><div class="pxa-chips"></div><div class="pxa-card" hidden></div>
      <div class="pxa-ac" role="listbox" hidden></div>
      <div class="pxa-bf" role="group" aria-label="Pedido"><input type="text" enterkeyhint="send" placeholder="Pídeme algo · @persona #proyecto" aria-label="Escríbele a tu avatar" autocomplete="off">
      <button type="button" class="pxa-mic" aria-label="${SR ? "Dictar" : "Dictado no disponible en este navegador"}" title="${SR ? "Dictar (es)" : "Tu navegador no permite dictado"}"${SR ? "" : " disabled"}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>
      <button type="button" class="pxa-send" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6l-6 6"/></svg></button></div></div></div>${TAIL}`;
    document.body.appendChild(b);
    const place = () => { if (!anchor.isConnected && opts.reanchor) { const a = opts.reanchor(); if (a) anchor = a; } if (innerWidth <= 760) { b.style.left = b.style.top = ""; return; }
      const r = anchor.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, room = innerWidth - r.right;
      const flip = r.left > w + 24 || room < w + 24; b.classList.toggle("flip", flip); b.classList.toggle("tr", flip);
      b.style.left = (scrollX + (flip ? r.left - w + 6 : r.right - 6)) + "px";
      b.style.top = (scrollY + Math.max(8, r.top + r.height * .3 - h)) + "px"; };
    addEventListener("resize", place);
    const $ = s => b.querySelector(s), t = $(".pxa-bt"), you = $(".pxa-you"), inp = $("input"), chips = $(".pxa-chips"), card = $(".pxa-card"), ac = $(".pxa-ac"), mic = $(".pxa-mic");
    let timer = 0;
    const say = txt => { clearInterval(timer); t.textContent = ""; let i = 0; if (reduce()) { t.textContent = txt; place(); return; } timer = setInterval(() => { t.textContent = txt.slice(0, ++i); if (i >= txt.length) clearInterval(timer); }, 18); };
    const setChips = list => { chips.innerHTML = ""; (list || []).forEach(ch => { const x = document.createElement("button"); x.type = "button"; x.className = "pxa-chip" + (ch.hot ? " hot" : "") + (ch.ghost ? " ghost" : "");
      x.innerHTML = `<span>${esc(ch.label)}</span>${ch.sub ? `<small>${esc(ch.sub)}</small>` : ""}`; x.onclick = () => ch.onClick && ch.onClick(); chips.appendChild(x); }); chips.hidden = !chips.children.length; };
    const setCard = c => {
      if (!c) { card.hidden = true; card.innerHTML = ""; return; }
      card.hidden = false;
      card.innerHTML = `<b>${esc(c.title)}</b><ul>${(c.lines || []).map(l => `<li>${esc(l)}</li>`).join("")}</ul><div class="pxa-cb"><button type="button" class="pxa-no">Cancelar</button><button type="button" class="pxa-yes">${esc(c.yes || "Sí, dale")}</button></div>`;
      card.querySelector(".pxa-no").onclick = () => { setCard(null); say("Listo, no toco nada. ¿Algo más?"); };
      card.querySelector(".pxa-yes").onclick = async () => { const r = await Promise.resolve(c.onYes()); setCard(null); show(r || { text: "Hecho." }); setTimeout(place, 250); };
      setTimeout(() => card.querySelector(".pxa-yes").focus({ preventScroll: true }), 30);
    };
    const show = r => { if (!r) return; say(r.text || ""); setChips(r.chips); setCard(r.confirm || null); setTimeout(place, 30); };
    show({ text: opts.hello || "¿En qué te puedo ayudar hoy?", chips: opts.chips });
    place();
    /* menciones: @ personas · # proyectos */
    let acList = [], acSel = 0, acTok = null;
    const tokenAt = () => { const v = inp.value, pos = inp.selectionStart || v.length, m = v.slice(0, pos).match(/([@#])([^\s@#]*(?:\s[^\s@#]+){0,2})$/); return m ? { type: m[1], q: m[2], start: pos - m[0].length, end: pos } : null; };
    const renderAc = () => {
      acTok = tokenAt(); acList = acTok && opts.mentions ? opts.mentions(acTok.type, acTok.q).slice(0, 6) : [];
      if (!acList.length) { ac.hidden = true; ac.innerHTML = ""; return; }
      acSel = Math.min(acSel, acList.length - 1);
      ac.innerHTML = acList.map((it, i) => `<button type="button" role="option" aria-selected="${i === acSel}" data-i="${i}"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</button>`).join("");
      ac.hidden = false;
    };
    const pick = i => { const it = acList[i]; if (!it || !acTok) return; const v = inp.value; inp.value = v.slice(0, acTok.start) + it.insert + " " + v.slice(acTok.end); const p = acTok.start + it.insert.length + 1; inp.setSelectionRange(p, p); ac.hidden = true; inp.focus(); };
    ac.addEventListener("mousedown", e => { const x = e.target.closest("[data-i]"); if (x) { e.preventDefault(); pick(+x.dataset.i); } });
    inp.addEventListener("input", () => { acSel = 0; renderAc(); });
    inp.addEventListener("keydown", e => {
      if (ac.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); acSel = (acSel + 1) % acList.length; renderAc(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); acSel = (acSel - 1 + acList.length) % acList.length; renderAc(); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(acSel); }
      else if (e.key === "Escape") { e.stopPropagation(); ac.hidden = true; }
    });
    /* dictado */
    let rec = null;
    if (SR) mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = "es-CO"; rec.interimResults = true; rec.continuous = false;
      const base = inp.value ? inp.value.trim() + " " : "";
      mic.classList.add("on"); mic.setAttribute("aria-pressed", "true"); say("Te escucho…");
      rec.onresult = ev => { let s = ""; for (const r of ev.results) s += r[0].transcript; inp.value = base + s; };
      rec.onerror = ev => { say(ev.error === "not-allowed" ? "Necesito permiso para usar el micrófono." : "No te escuché bien. ¿Lo intentamos otra vez?"); };
      rec.onend = () => { mic.classList.remove("on"); mic.setAttribute("aria-pressed", "false"); rec = null; if (inp.value.trim()) send(); };
      try { rec.start(); } catch (e) { rec = null; mic.classList.remove("on"); }
    };
    const ask = async v => { you.hidden = false; you.textContent = v; setChips([]); setCard(null); clearInterval(timer); t.textContent = "…";
      let r; try { r = opts.onAsk ? await Promise.resolve(opts.onAsk(v)) : { text: REPLIES[Math.floor(Math.random() * REPLIES.length)] }; } catch (e) { r = { text: "Se me cayó el render. ¿Me lo repites?" }; } show(r); };
    /* sin <form>: en vistas incrustadas (sandbox sin allow-forms) el envío de formularios está bloqueado */
    function send() { const v = inp.value.trim(); if (!v) { inp.focus(); return; } inp.value = ""; ac.hidden = true; ask(v); }
    $(".pxa-send").addEventListener("click", send);
    inp.addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing && !e.defaultPrevented && ac.hidden) { e.preventDefault(); send(); } });
    const close = () => { clearInterval(timer); if (rec) try { rec.abort(); } catch (e) { } b.remove(); document.removeEventListener("keydown", onKey); removeEventListener("resize", place); if (opts.onClose) opts.onClose(); };
    const onKey = e => { if (e.key === "Escape" && ac.hidden) close(); };
    document.addEventListener("keydown", onKey);
    $(".pxa-bx").onclick = close;
    setTimeout(() => inp.focus({ preventScroll: true }), 50);
    return { close, el: b, show, ask };
  }

  window.PXA = { render, headURL, fullURL, live, editor, bubble, norm, DEF, data: DATA, blit, TAIL, fx };
})();
