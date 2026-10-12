/* ═════ v212 · Sala de juntas (prototipo): los avatares entran, caminan, se sientan, hablan en burbujas y proyectan en el TV ═════
   Todo lo que viaja entre personas pasa por un "transporte" con mensajes simples ({t:"hi"|"mv"|"say"|"st"|"proj"|"bye", …}).
   Hoy: presencia real en /api/sala (en la vista previa, entre pestañas del mismo navegador).
   Cuando TI apruebe el servicio de llamadas: PXP_SALA.setProvider({...}) entrega presencia, chat, voz, video y pantalla con los mismos mensajes.
   Cámara, micrófono y pantalla funcionan ya, pero solo en tu equipo (no se transmiten). */
(function () {
  if (!window.PXA) return;
  const W = 320, H = 200;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nn = s => (window.normName ? normName(s) : String(s || "").toLowerCase().trim());
  const me = () => (typeof currentUser !== "undefined" ? currentUser : "");
  const tit = t => String(t || "").toLowerCase().replace(/(^|[\s(-])\S/g, m => m.toUpperCase());
  const find = n => { try { const f = window.pxpFindPerson && pxpFindPerson(n); return f && f.p; } catch (e) { return null; } };
  const grp = p => { try { const g = pxpGrupo(p); return { name: g, color: pxpCargoColor(g), shape: pxpGrupoForma(g) }; } catch (e) { return { name: "", color: "#6c4cff", shape: "circle" }; } };
  const people = () => [].concat(typeof TEAM !== "undefined" ? TEAM : []).filter(p => p && p.name && p.tipoMiembro !== "externo");
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDark = () => { const r = document.documentElement; return r.dataset.theme ? r.dataset.theme === "dark" : !(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches); };
  const L = (es, en) => (window.pxpLang === "en" ? en : es);

  /* ---------- geometría: mesa grande casi cuadrada al centro, sala limpia (píxeles lógicos; los pies de cada avatar son su punto) ---------- */
  const TABLE = { x: 72, y: 88, w: 176, h: 52 };
  const SEATS = [];
  [100, 140, 180, 220].forEach(x => SEATS.push({ x, y: TABLE.y + 8, view: "front", ax: x, ay: 66, side: "back" }));
  [110, 138].forEach(y => SEATS.push({ x: 57, y, view: "front", ax: 44, ay: y, side: "end" }, { x: 263, y, view: "front", ax: 276, ay: y, side: "end" }));
  [100, 140, 180, 220].forEach(x => SEATS.push({ x, y: TABLE.y + TABLE.h + 22, view: "back", ax: x, ay: 178, side: "front" }));
  [128, 150].forEach(y => SEATS.push({ x: 18, y, view: "front", ax: 42, ay: y, side: "sofa" }, { x: 302, y, view: "front", ax: 278, ay: y, side: "sofa" }));
  const BLOCK = [{ x: 62, y: 78, w: 196, h: 94 }, { x: 0, y: 104, w: 30, h: 54 }, { x: 290, y: 104, w: 30, h: 54 }];
  const BOUNDS = { x0: 8, x1: 312, y0: 62, y1: 190 };
  const DOOR = { x: 160, y: 196 };
  const TV = { x: 120, y: 3, w: 80, h: 45 };   // 16:9 exacto
  const BOARD = { x: 222, y: 5, w: 90, h: 42 };
  const inBlock = (x, y, m) => BLOCK.some(b => x > b.x - (m || 0) && x < b.x + b.w + (m || 0) && y > b.y - (m || 0) && y < b.y + b.h + (m || 0));
  const clampP = (x, y) => [Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, x)), Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, y))];
  const segFree = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3); for (let i = 1; i < n; i++) { const t = i / n; if (inBlock(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 1)) return false; } return true; };
  function route(a, b) {
    if (segFree(a, b)) return [b];
    const nodes = [a, b]; BLOCK.forEach(o => { const m = 5; [[o.x - m, o.y - m], [o.x + o.w + m, o.y - m], [o.x - m, o.y + o.h + m], [o.x + o.w + m, o.y + o.h + m]].forEach(([x, y]) => { if (x >= BOUNDS.x0 && x <= BOUNDS.x1 && y >= BOUNDS.y0 && y <= BOUNDS.y1 && !inBlock(x, y)) nodes.push([x, y]); }); });
    const d = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = nodes.map(() => false); d[0] = 0;
    for (;;) { let u = -1; d.forEach((v, i) => { if (!done[i] && v < Infinity && (u < 0 || v < d[u])) u = i; }); if (u < 0 || u === 1) break; done[u] = true;
      nodes.forEach((n, v) => { if (done[v] || v === u) return; if (!segFree(nodes[u], n)) return; const nd = d[u] + Math.hypot(n[0] - nodes[u][0], n[1] - nodes[u][1]); if (nd < d[v]) { d[v] = nd; prev[v] = u; } }); }
    if (prev[1] < 0) return [b];
    const out = []; for (let v = 1; v > 0; v = prev[v]) out.unshift(nodes[v]); return out;
  }

  /* ---------- paleta según la hora: mañana cálida, mediodía neutro, tarde dorada, atardecer, noche fría ---------- */
  const PAL = {
    noche: { sofa: "#36407a", sofaHi: "#45508f", sofaLo: "#2a3262", city: "#1a2040", ol: "#0d0f1f", wallHi: "#39406a", wall: "#2c3256", wallLo: "#232847", trim: "#3b4370", trimLo: "#2a305a", floor: "#283052", floorMk: "#202744", rug: "#323b66", rugIn: "#2b3359", rugHi: "#3d477a", wood: "#4b4560", woodHi: "#5a5474", woodLo: "#3a354c", woodDk: "#2b2738", chair: "#23263d", chairHi: "#343854", plant: "#2f5a5a", plantHi: "#3d6f6c", pot: "#4a4050", metal: "#5a6080", paper: "#8a90b0", sky1: "#0b1030", sky2: "#141c48", sky3: "#1f2a60", curtain: "#3a4270", curtainLo: "#2c3358", frame: "#1a1d33", board: "#5a5f86", cork: "#4a4560" },
    manana: { sofa: "#c46a3e", sofaHi: "#d9824f", sofaLo: "#a3542e", city: "#c9a98a", ol: "#3b2418", wallHi: "#fbe7c8", wall: "#f4d6a8", wallLo: "#e8c08a", trim: "#d9925a", trimLo: "#b8743f", floor: "#e3a466", floorMk: "#d08e52", rug: "#c9824a", rugIn: "#b9733f", rugHi: "#dc9a62", wood: "#a5643a", woodHi: "#c07c4c", woodLo: "#8a5030", woodDk: "#6b3b22", chair: "#6b4a3c", chairHi: "#85604e", plant: "#6f9a4a", plantHi: "#8bb35a", pot: "#b86e3e", metal: "#b8a48e", paper: "#fff4e0", sky1: "#f6c38a", sky2: "#fad9a8", sky3: "#fdebc8", curtain: "#f2b84a", curtainLo: "#d9973a", frame: "#8a5030", board: "#fffaf0", cork: "#d9a873" },
    mediodia: { sofa: "#6a5ad6", sofaHi: "#7d6ee0", sofaLo: "#5546b0", city: "#9aa6bd", ol: "#22202e", wallHi: "#f2f0f5", wall: "#e6e3ec", wallLo: "#d6d2e0", trim: "#b9b3c9", trimLo: "#9d97b0", floor: "#d4d0dc", floorMk: "#c4bfd0", rug: "#b8b1cc", rugIn: "#aaa2c2", rugHi: "#c8c2da", wood: "#8c6a54", woodHi: "#a3806a", woodLo: "#725440", woodDk: "#574030", chair: "#3e3c4a", chairHi: "#55526a", plant: "#4f9a6a", plantHi: "#63b07c", pot: "#c4a888", metal: "#a0a0b0", paper: "#ffffff", sky1: "#8fbcef", sky2: "#aed0f4", sky3: "#cfe3f8", curtain: "#d9d4e6", curtainLo: "#bdb6d0", frame: "#4a4658", board: "#ffffff", cork: "#cdb69a" },
    dorada: { sofa: "#b0442a", sofaHi: "#c95a38", sofaLo: "#8e3420", city: "#b8784a", ol: "#2e1608", wallHi: "#fcd59c", wall: "#f6c27e", wallLo: "#e8a660", trim: "#d4783c", trimLo: "#b35e2a", floor: "#e07a3a", floorMk: "#c9672c", rug: "#a85a2c", rugIn: "#96501f", rugHi: "#bd6a38", wood: "#a24e24", woodHi: "#c0643a", woodLo: "#84401c", woodDk: "#612c12", chair: "#5a3424", chairHi: "#774634", plant: "#7a8a38", plantHi: "#97a648", pot: "#b45a2a", metal: "#c49a70", paper: "#fff0d0", sky1: "#f08a3a", sky2: "#f6a54e", sky3: "#fbc676", curtain: "#f6b33a", curtainLo: "#d9902a", frame: "#6a3416", board: "#fff4dc", cork: "#d08a4a" },
    atardecer: { sofa: "#6a4a9a", sofaHi: "#7c5aae", sofaLo: "#553a80", city: "#5a4470", ol: "#1c1028", wallHi: "#b78aa8", wall: "#9a7096", wallLo: "#7e5a80", trim: "#6e4f80", trimLo: "#573f6a", floor: "#7a5878", floorMk: "#684a68", rug: "#6a4c74", rugIn: "#5c4066", rugHi: "#7a5a86", wood: "#6a4450", woodHi: "#805464", woodLo: "#54363f", woodDk: "#3e2730", chair: "#3a2a44", chairHi: "#4e3a5a", plant: "#4a6a5a", plantHi: "#5a806a", pot: "#7a5060", metal: "#8a7a9a", paper: "#e8d8e8", sky1: "#3a2a6a", sky2: "#a05a8a", sky3: "#f08a6a", curtain: "#b07a9a", curtainLo: "#8a5a7c", frame: "#3a2440", board: "#d8cce0", cork: "#8a6a7a" },
  };
  const KEYS = [[0, "noche"], [5.5, "noche"], [7, "manana"], [10, "manana"], [12, "mediodia"], [15, "mediodia"], [17, "dorada"], [18.6, "atardecer"], [19.8, "noche"], [24, "noche"]];
  const MOMENTO = { noche: ["Noche", "Night"], manana: ["Mañana", "Morning"], mediodia: ["Mediodía", "Midday"], dorada: ["Tarde dorada", "Golden hour"], atardecer: ["Atardecer", "Dusk"] };
  const hora = () => S.hora != null ? S.hora : (d => d.getHours() + d.getMinutes() / 60)(new Date());
  function paleta(h) {
    let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
    const [h0, a] = KEYS[i], [h1, b] = KEYS[i + 1], t = h1 > h0 ? Math.max(0, Math.min(1, (h - h0) / (h1 - h0))) : 0, A = PAL[a], B = PAL[b], out = {};
    Object.keys(A).forEach(k => { out[k] = t <= 0 ? A[k] : t >= 1 ? B[k] : mix(A[k], B[k], t); });
    const ss = (e0, e1, v) => { const k = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };   /* rampa suave */
    out.dark = Math.max(ss(18.9, 20.3, h), 1 - ss(5.2, 6.7, h));                         /* 0 de día · 1 de noche, con transición */
    out.sunAm = ss(6.4, 7.4, h) * (1 - ss(9.6, 10.8, h)); out.sunPm = ss(15.8, 17, h) * (1 - ss(18, 18.8, h));
    out.momento = t < .5 ? a : b; out.noche = out.dark > .5; out.sol = h >= 6.5 && h < 18.4; return out;
  }

  /* ---------- tablero de notas: accesos a las secciones de la plataforma (solo las que la persona puede ver) ---------- */
  const NOTE_C = ["#F3FF57", "#ff8fb8", "#7fd0ff", "#b7a8ff", "#ffb36b", "#8ff0b4", "#ffd36b", "#f5f1e6"];
  const NOTAS = [["projects", ["Proyectos", "Projects"]], ["clientes", ["Clientes", "Clients"]], ["team", ["Team", "Team"]], ["licencias", ["Licencias", "Licenses"]], ["traffic", ["Tráfico", "Traffic"]],
    ["capacidad", ["Capacidad", "Capacity"]], ["reportes", ["Reportes", "Reports"]], ["mishoras", ["Mis horas", "My hours"]], ["horas", ["Horas", "Hours"]], ["repositorio", ["Repositorio", "Repository"]], ["logros", ["Logros", "Achievements"]], ["dashboard", ["Dashboard", "Dashboard"]]];
  function tableroData() {
    const nav = $("tab-nav"), P = typeof PROJECTS !== "undefined" ? PROJECTS : {}, act = Object.keys(P).filter(k => P[k] && !P[k].archivadoEn && P[k].estadoGeneral !== "aprobado" && P[k].estadoGeneral !== "entregado");
    const cnt = { projects: act.length, clientes: new Set(act.map(k => nn(P[k].cliente)).filter(Boolean)).size, team: people().length };
    const tip = { projects: n => `${n} ${L("proyectos activos", "active projects")}`, clientes: n => `${n} ${L("clientes activos · ver el mapa", "active clients · see the map")}`, team: n => `${n} ${L("personas", "people")}` };
    const ok = v => !nav || !!nav.querySelector(`[data-view="${v}"]`);
    return NOTAS.filter(([v]) => ok(v)).slice(0, 8).map(([v, lab], i) => ({ v, label: L(...lab), n: cnt[v], tip: (tip[v] ? tip[v](cnt[v]) : L("Vista previa de ", "Preview of ") + L(...lab)), color: NOTE_C[i], slot: [BOARD.x + 12 + (i % 4) * 22, BOARD.y + 12 + Math.floor(i / 4) * 19] }));
  }

  /* ---------- dibujo: contorno parejo, esquinas redondeadas, paleta única ---------- */
  let bg = null, bgKey = "";
  function drawBg() {
    const h = hora(), M = tableroData(), key = Math.round(h * 60) + "|" + (window.pxpLang || "es") + "|" + M.map(m => m.v + m.n).join(",");
    if (bg && bgKey === key) return bg; bgKey = key; S.mapa = M; if (bg) { S.bgPrev = bg; S.fade0 = performance.now(); }
    const C = paleta(h); S.pal = C;
    bg = document.createElement("canvas"); bg.width = W; bg.height = H; const x = bg.getContext("2d");
    const R0 = (c, a, b, w, hh) => { x.fillStyle = c; x.fillRect(a, b, w, hh); };
    const rbox = (a, b, w, hh, f, hi, lo) => { R0(C.ol, a, b - 1, w, hh + 2); R0(C.ol, a - 1, b, w + 2, hh); R0(f, a, b, w, hh); if (hi) R0(hi, a + 1, b, w - 2, 1); if (lo) R0(lo, a + 1, b + hh - 1, w - 2, 1); };
    // pared con zócalo
    R0(C.wall, 0, 0, W, 50); R0(C.wallHi, 0, 0, W, 2);
    for (let i = 20; i < W; i += 40) R0(C.wallLo, i, 4, 1, 44);
    R0(C.ol, 0, 49, W, 1); R0(C.trim, 0, 50, W, 6); R0(C.trimLo, 0, 55, W, 1); R0(C.ol, 0, 56, W, 1);
    // piso liso con marcas sueltas
    R0(C.floor, 0, 57, W, H - 57);
    let sd = 7; const rnd = n => { sd = (sd * 9301 + 49297) % 233280; return Math.floor(sd / 233280 * n); };
    for (let i = 0; i < 38; i++) { const a = rnd(W - 6), b = 62 + rnd(H - 72); R0(C.floorMk, a, b, 3, 1); R0(C.floorMk, a + 1, b - 1, 1, 1); }
    // alfombra
    rbox(48, 74, 224, 108, C.rug); R0(C.rugHi, 51, 77, 218, 1); R0(C.rugHi, 51, 178, 218, 1); R0(C.rugHi, 51, 77, 1, 102); R0(C.rugHi, 268, 77, 1, 102);
    for (let i = 56; i < 266; i += 10) { R0(C.rugIn, i, 80, 4, 2); R0(C.rugIn, i + 1, 79, 2, 1); R0(C.rugIn, i, 174, 4, 2); R0(C.rugIn, i + 1, 176, 2, 1); }
    // terraza: puerta de vidrio, baranda, matera y la ciudad al fondo (cielo y luces según la hora)
    const GX = 6, GY = 3, GW = 64, GH = 46;
    R0(C.ol, GX - 1, GY - 1, GW + 2, GH + 2); R0(C.sky2, GX, GY, GW, GH); R0(C.sky1, GX, GY, GW, 13); R0(C.sky3, GX, GY + 26, GW, 20);
    if (C.sol) { const p = Math.max(0, Math.min(1, (h - 6.5) / 12)); R0(C.paper, GX + 6 + Math.round(p * 48), GY + 24 - Math.round(Math.sin(p * Math.PI) * 18), 4, 4); }
    else { R0(C.board, GX + 50, GY + 5, 4, 4); R0(C.sky1, GX + 52, GY + 4, 3, 3); [[8, 6], [20, 3], [34, 9], [44, 4]].forEach(([a2, b2]) => R0(C.board, GX + a2, GY + b2, 1, 1)); }
    for (let i = 0; i < GW; i++) { const hh = Math.round(9 + 4 * Math.sin(i / 9) + 2 * Math.sin(i / 3.1)); R0(mix(C.sky3, C.plant, .45), GX + i, GY + 30 - hh, 1, hh); }
    const BLD = [[0, 13, 9], [9, 18, 7], [16, 10, 8], [24, 24, 6], [30, 15, 9], [39, 20, 7], [46, 12, 8], [54, 17, 10]];
    BLD.forEach(([bx, bh, bw], i) => { const top = GY + 36 - bh; R0(mix(C.city, C.ol, i % 2 ? .18 : 0), GX + bx, top, bw, bh);
      for (let yy = top + 2; yy < GY + 34; yy += 3) for (let xx = GX + bx + 1; xx < GX + bx + bw - 1; xx += 2) if ((xx * 7 + yy * 3 + i) % 5 < (C.noche ? 2 : 1)) R0(C.noche ? "#ffd27a" : mix(C.city, C.paper, .45), xx, yy, 1, 1); });
    R0(mix(C.city, C.ol, .3), GX + 26, GY + 6, 2, 6); R0(C.noche ? "#ff6b6b" : mix(C.city, C.ol, .3), GX + 26, GY + 5, 2, 1);   // torre con antena
    R0(C.woodLo, GX, GY + 38, GW, 8); R0(C.woodHi, GX, GY + 38, GW, 1); for (let i = 4; i < GW; i += 8) R0(C.woodDk, GX + i, GY + 39, 1, 7);   // piso de la terraza
    R0(C.ol, GX, GY + 30, GW, 1); for (let i = 2; i < GW; i += 6) R0(C.ol, GX + i, GY + 30, 1, 8); R0(C.metal, GX, GY + 29, GW, 1);   // baranda
    R0(C.ol, GX + 48, GY + 32, 10, 8); R0(C.pot, GX + 49, GY + 33, 8, 6); R0(C.plant, GX + 47, GY + 25, 12, 8); R0(C.plantHi, GX + 49, GY + 24, 6, 3);
    R0(C.ol, GX + 21, GY, 1, GH); R0(C.ol, GX + 43, GY, 1, GH); R0("rgba(255,255,255,.18)", GX + 3, GY + 2, 2, 20); R0("rgba(255,255,255,.12)", GX + 25, GY + 2, 2, 14);
    // repisa con premios
    rbox(74, 28, 34, 2, C.wood, C.woodHi);
    rbox(78, 19, 6, 8, "#e8b84a", "#ffe08a"); rbox(89, 21, 5, 6, "#c9c9d4", "#ffffff"); rbox(99, 18, 5, 9, "#e8b84a", "#ffe08a");
    rbox(80, 7, 22, 7, C.paper); R0(C.trimLo, 83, 9, 15, 1); R0(C.trimLo, 83, 11, 10, 1);
    // TV 16:9
    R0(C.ol, TV.x - 2, TV.y - 2, TV.w + 4, TV.h + 4); R0("#141220", TV.x, TV.y, TV.w, TV.h); R0("#F3FF57", TV.x + TV.w - 3, TV.y + TV.h + 1, 2, 1);
    // reloj
    rbox(206, 12, 10, 10, C.paper);
    // tablero de corcho con notas adhesivas (accesos a las secciones)
    const B = BOARD; rbox(B.x, B.y, B.w, B.h, C.cork); R0(C.frame, B.x, B.y + B.h - 1, B.w, 1);
    for (let i = 0; i < 26; i++) R0(mix(C.cork, C.ol, .12), B.x + 2 + rnd(B.w - 4), B.y + 2 + rnd(B.h - 4), 1, 1);
    M.forEach((m, i) => { const [cx, cy] = m.slot, nx = cx - 9, ny = cy - 7, tilt = i % 3 === 1 ? 1 : 0;
      R0("rgba(0,0,0,.14)", nx + 1, ny + 2, 19, 15); rbox(nx, ny + tilt, 19, 15, m.color); R0(mix(m.color, C.ol, .22), nx + 15, ny + tilt + 12, 4, 3); R0(mix(m.color, "#ffffff", .35), nx + 1, ny + tilt, 17, 1);
      R0(C.ol, cx - 1, ny + tilt - 2, 2, 2); R0(i % 2 ? "#d23b3b" : "#624AFF", cx - 1, ny + tilt - 2, 1, 1); });
    // sofás compactos a los costados: respaldo contra la pared, brazos redondeados, dos cojines, cojín de color y patas
    [[5, 1], [293, -1]].forEach(([sx, dir]) => { const W2 = 22, top = 106, H2 = 48, f = mix(C.sofa, C.wall, .25), hi = mix(C.sofaHi, C.wall, .2), lo = mix(C.sofaLo, C.wall, .15);
      const back = dir > 0 ? sx : sx + W2 - 5, seat = dir > 0 ? sx + 5 : sx;
      R0(C.ol, sx, top - 1, W2, H2 + 2); R0(C.ol, sx - 1, top, W2 + 2, H2);   // contorno con esquinas recortadas
      R0(f, sx, top, W2, H2); R0(lo, back, top, 5, H2); R0(hi, seat, top + 6, W2 - 5, 1);
      [[top, 6], [top + H2 - 6, 6]].forEach(([y0, hh]) => { R0(lo, sx, y0, W2, hh); R0(hi, sx + 1, y0, W2 - 2, 1); R0(C.ol, sx, y0 + (y0 === top ? hh : -1), W2, 1); });   // brazos
      R0(C.ol, seat, top + H2 / 2, W2 - 5, 1); R0(hi, seat, top + H2 / 2 + 1, W2 - 5, 1);   // costura entre cojines
      R0(C.ol, dir > 0 ? seat + 1 : seat + 10, top + 9, 7, 7); R0("#F3FF57", dir > 0 ? seat + 2 : seat + 11, top + 10, 5, 5); R0("#c9d23f", dir > 0 ? seat + 2 : seat + 11, top + 14, 5, 1);   // cojín lima
      [[sx + 1, top + H2 + 1], [sx + W2 - 3, top + H2 + 1]].forEach(([lx, ly]) => R0(C.woodDk, lx, ly, 2, 2)); });
    // respaldos detrás de la gente (fila de atrás y extremos)
    SEATS.filter(s => s.side === "back" || s.side === "end").forEach(s => { rbox(s.x - 8, s.y - 24, 16, 10, C.chair, C.chairHi); });
    // muro frontal con la puerta
    R0(C.ol, 0, 192, 142, 8); R0(C.ol, 178, 192, W - 178, 8); R0(C.floorMk, 142, 194, 36, 6); R0("#F3FF57", 146, 193, 28, 1);
    return bg;
  }
  function drawTable(x) {
    const C = S.pal || paleta(hora()), T = TABLE, used = new Set([...S.ents.values()].map(e => e.seat));
    const R0 = (c, a, b, w, hh) => { x.fillStyle = c; x.fillRect(a, b, w, hh); };
    const rbox = (a, b, w, hh, f, hi) => { R0(C.ol, a, b - 1, w, hh + 2); R0(C.ol, a - 1, b, w + 2, hh); R0(f, a, b, w, hh); if (hi) R0(hi, a + 1, b, w - 2, 1); };
    // sombra
    R0("rgba(0,0,0,.16)", T.x + 4, T.y + T.h + 8, T.w - 8, 3);
    // canto (frente) y cubierta con esquinas redondeadas de 2 px
    R0(C.ol, T.x + 2, T.y - 1, T.w - 4, T.h + 9); R0(C.ol, T.x, T.y + 1, T.w, T.h + 5); R0(C.ol, T.x - 1, T.y + 2, T.w + 2, T.h + 3);
    R0(C.woodLo, T.x + 1, T.y + T.h, T.w - 2, 5); R0(C.woodDk, T.x + 1, T.y + T.h + 4, T.w - 2, 1); R0(C.woodDk, T.x + 1, T.y + T.h, T.w - 2, 1);
    R0(C.wood, T.x + 2, T.y, T.w - 4, T.h); R0(C.wood, T.x, T.y + 2, T.w, T.h - 3); R0(C.wood, T.x + 1, T.y + 1, T.w - 2, T.h - 1);
    R0(C.woodHi, T.x + 2, T.y, T.w - 4, 1); R0(C.woodHi, T.x, T.y + 2, 1, T.h - 4);
    // vetas suaves y bandas laterales
    for (let i = 0; i < T.w - 30; i += 34) { R0(C.woodLo, T.x + 12 + i, T.y + 6, 14, 1); R0(C.woodLo, T.x + 24 + i, T.y + T.h - 7, 12, 1); }
    // centro: panel de cuero con altavoz de conferencias (luz verde si alguien tiene el micrófono abierto)
    const cx = T.x + T.w / 2, cy = T.y + T.h / 2;
    R0(mix(C.woodLo, C.ol, .25), T.x + 46, cy - 9, T.w - 92, 18); R0(mix(C.wood, C.woodLo, .6), T.x + 47, cy - 8, T.w - 94, 16);
    const mic = [...S.ents.values()].some(e => e.mic);
    rbox(cx - 6, cy - 3, 12, 6, "#2b2b33"); R0("#3c3c46", cx - 5, cy - 3, 10, 1); R0(mic ? "#64d861" : "#5a5a66", cx - 3, cy + 1, 6, 1);
    rbox(cx - 30, cy - 2, 5, 6, C.paper); R0(C.plant, cx - 32, cy - 7, 9, 5); R0(C.plantHi, cx - 30, cy - 8, 4, 2);
    rbox(cx + 22, cy - 2, 3, 5, "#bfe3f2"); rbox(cx + 27, cy - 1, 3, 4, "#bfe3f2");
    // en cada puesto: portátil si está ocupado, libreta si está libre
    SEATS.forEach((s, i) => {
      let px, py; if (s.side === "back") { px = s.x; py = T.y + 3; } else if (s.side === "front") { px = s.x; py = T.y + T.h - 9; } else { px = s.x < cx ? T.x + 10 : T.x + T.w - 10; py = cy - 3; }
      if (used.has(i)) { if (s.side === "front") { rbox(px - 6, py, 12, 5, C.metal); R0(C.noche ? "#9fd0ff" : mix(C.metal, "#ffffff", .5), px - 5, py + 1, 10, 3); } else { rbox(px - 6, py, 12, 6, C.metal, mix(C.metal, "#ffffff", .3)); R0(C.paper, px - 1, py + 2, 2, 2); } }
      else { rbox(px - 4, py + 1, 8, 5, C.paper); R0(C.trimLo, px - 3, py + 3, 5, 1); }
      if (i % 3 === 1 && s.side !== "end") { rbox(px + 8, py + 1, 3, 4, C.paper); R0(C.woodLo, px + 8, py + 2, 3, 1); }
    });
  }
  function drawFrontChair(x, s) { const C = S.pal; const R0 = (c, a, b, w, hh) => { x.fillStyle = c; x.fillRect(a, b, w, hh); };
    R0(C.ol, s.x - 8, s.y - 5, 16, 11); R0(C.ol, s.x - 9, s.y - 4, 18, 9); R0(C.chair, s.x - 8, s.y - 4, 16, 9); R0(C.chairHi, s.x - 7, s.y - 4, 14, 1);
    R0(C.ol, s.x - 1, s.y + 6, 2, 3); R0(C.ol, s.x - 6, s.y + 9, 12, 1); }
  function drawSofaFront() { }
  function drawClock(x) { const C = S.pal, cx = 211, cy = 17, h0 = hora(), m = Math.floor((h0 % 1) * 60), hh = (h0 % 12);
    x.fillStyle = C.paper; x.fillRect(207, 13, 9, 9);
    const hand = (a, len, c) => { x.fillStyle = c; for (let i = 0; i <= len; i++) x.fillRect(Math.round(cx + Math.sin(a) * i), Math.round(cy - Math.cos(a) * i), 1, 1); };
    hand(m / 60 * Math.PI * 2, 4, C.ol); hand(hh / 12 * Math.PI * 2, 3, "#624AFF"); }
  /* luces: de noche todo oscuro; si hay gente en la mesa se prende la luz sobre ella; el TV siempre brilla */
  function drawLight(x) {
    const C = S.pal; if (!C) return;
    const enMesa = [...S.ents.values()].some(e => e.seat >= 0), now = performance.now(), dt = Math.min(100, now - (S.lt || now)); S.lt = now;
    S.lamp = (S.lamp || 0) + ((enMesa ? 1 : 0) - (S.lamp || 0)) * Math.min(1, dt / 700);   /* la lámpara se enciende y apaga despacio */
    const ray = (a, col) => { if (a < .01) return; x.save(); x.globalCompositeOperation = "soft-light"; x.globalAlpha = a; x.fillStyle = col;
      x.beginPath(); x.moveTo(14, 57); x.lineTo(64, 57); x.lineTo(122, 130); x.lineTo(58, 130); x.closePath(); x.fill(); x.restore(); };
    ray(C.sunAm, "rgba(255,230,170,.55)"); ray(C.sunPm, "rgba(255,180,90,.55)");
    const d = C.dark || 0; if (d < .01) return;
    const a = d * (.8 - .25 * S.lamp);
    x.save(); x.globalCompositeOperation = "multiply"; x.fillStyle = `rgba(${Math.round(40 + 30 * S.lamp)},${Math.round(46 + 34 * S.lamp)},${Math.round(96 + 44 * S.lamp)},${a.toFixed(3)})`; x.fillRect(0, 0, W, H); x.restore();
    x.save(); x.globalCompositeOperation = "screen";
    const glow = (cx, cy, r, c) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
    glow(TV.x + TV.w / 2, TV.y + TV.h + 6, 64, `rgba(120,140,255,${(.3 * d).toFixed(3)})`);
    if (S.lamp > .01) glow(160, 114, 118, `rgba(255,205,140,${(.42 * d * S.lamp).toFixed(3)})`);
    x.restore();
  }


  /* ---------- sprites: frente (del núcleo) y espalda (cabeza cubierta con pelo, nuca en piel) ---------- */
  const hex2 = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const mix = (a, b, t) => { const x = hex2(a), y = hex2(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const LONG = new Set(["melena", "lacio", "ondas", "rizos", "trenza", "coleta", "coletas", "bob", "afro", "rizado", "gorro"]);
  const sprites = new Map();
  function sprite(cfg, g, pose) {
    const key = JSON.stringify([cfg, g && g.color, g && g.shape, pose]); if (sprites.has(key)) return sprites.get(key);
    if (sprites.size > 600) sprites.clear();
    const back = pose.back, c = PXA.norm(cfg);
    const cv = PXA.render(back ? Object.assign({}, c, { gl: "ninguna", fh: "ninguno" }) : c, { br: pose.br, blink: pose.blink, dx: pose.dx, walk: pose.walk }, back ? Object.assign({}, g, { nopin: true }) : g);
    if (back) {
      const x = cv.getContext("2d"), im = x.getImageData(0, 0, 32, 23), d = im.data, P = PXA.data.P, s = c.skin;
      const face = [s, mix(s, "#000000", .14), mix(s, "#ffffff", .4), mix(s, "#e0707a", .35), P.E, P.e, P.W, P.r, P.l].filter(Boolean).map(h => hex2(String(h).slice(0, 7)).join(","));
      const bald = c.hair === "calvo", hairC = hex2(bald ? mix(s, "#000000", .1) : c.hc), hairS = hex2(bald ? mix(s, "#000000", .2) : mix(c.hc, "#000000", .3)), nape = hex2(mix(s, "#000000", .14));
      let low = -1; const hit = [];
      for (let y = 0; y < 23; y++) for (let x0 = 0; x0 < 32; x0++) { const i = (y * 32 + x0) * 4; if (d[i + 3] < 200) continue; if (face.includes(d[i] + "," + d[i + 1] + "," + d[i + 2])) { hit.push([x0, y]); if (y > low) low = y; } }
      hit.forEach(([x0, y]) => { const i = (y * 32 + x0) * 4, col = (!LONG.has(c.hair) && !bald && y >= low - 1) ? nape : (y === low - 2 && !LONG.has(c.hair) ? hairS : hairC); d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; });
      x.putImageData(im, 0, 0);
    }
    const out = document.createElement("canvas"); out.width = out.height = 32; out.getContext("2d").drawImage(cv, 0, 0);
    sprites.set(key, out); return out;
  }
  /* avatar provisional (para quien todavía no crea el suyo): estable a partir del nombre */
  function cfgFor(p) {
    if (p && p.avatar) return p.avatar;
    const D = PXA.data.D, Pp = PXA.data.P; let h = 0; String(p && p.name || "x").split("").forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) >>> 0; });
    const r = n => { h = (h * 1103515245 + 12345) >>> 0; return (h >>> 8) % n; };
    const ks = o => Object.keys(o);
    return { v: 1, hair: ks(D.hair).filter(k => k !== "gorro")[r(ks(D.hair).length - 1)], hc: Pp.hair[r(Pp.hair.length)], eyes: ks(D.eyes)[r(ks(D.eyes).length)], fh: "ninguno", skin: Pp.skin[r(Pp.skin.length)],
      fit: ks(D.fit)[r(ks(D.fit).length)], oc: Pp.fit[r(Pp.fit.length)], dc: null, gl: r(3) === 0 ? ks(D.glasses)[1 + r(ks(D.glasses).length - 1)] : "ninguna", fc: Pp.frame[r(Pp.frame.length)], acc: "ninguno", ac: Pp.acc[0], ears: "ninguno", lc: null, sh: "#3b2a24", pin: null, pc: null };
  }

  /* ---------- estado ---------- */
  const S = { ents: new Map(), myId: "", proj: null, projBy: "", log: [], raf: 0, last: 0, keys: new Set(), mounted: false, inside: false, unread: 0, prevView: "", media: { mic: null, cam: null, screen: null } };
  let tr = null; // transporte activo
  const myEnt = () => S.ents.get(S.myId);

  function mkEnt(o) {
    const p = find(o.name) || { name: o.name };
    const e = Object.assign({ id: nn(o.name), name: o.name, cfg: cfgFor(p), g: grp(p), role: p.alias || p.role || "", x: DOOR.x, y: DOOR.y, path: [], seat: -1, walkT: 0, step: 1, br: 0, brT: R(800, 2400), blink: 0, blinkT: R(1200, 4000), dx: 0, dxT: R(3000, 8000), mic: false, cam: false, speaking: 0, back: false }, o);
    e.el = document.createElement("div"); e.el.className = "sl-e"; e.el.innerHTML = `<span class="sl-spk"></span><span class="sl-cam"></span><span class="sl-tag"><i class="sl-mic" hidden></i><b></b></span>`;
    e.el.querySelector("b").textContent = tit(String(o.name).split(" ")[0]) + (o.id === S.myId || nn(o.name) === S.myId ? " · " + L("tú", "you") : "");
    e.el.style.setProperty("--c", e.g.color || "#F3FF57"); $("sl-ov").appendChild(e.el); S.ents.set(e.id, e); return e;
  }
  function rmEnt(id) { const e = S.ents.get(id); if (!e) return; e.el.remove(); if (e.bub) e.bub.remove(); S.ents.delete(id); }
  const seatOf = i => SEATS[i];
  const seatTaken = (i, but) => [...S.ents.values()].some(e => e.seat === i && e.id !== but);

  function walkTo(e, x, y, seat) {
    if (e.seat >= 0) { const s = seatOf(e.seat); e.x = s.ax; e.y = s.ay; e.seat = -1; }
    [x, y] = clampP(x, y); if (inBlock(x, y)) return false;
    e.path = route([e.x, e.y], [x, y]); e.goSeat = seat == null ? -1 : seat; return true;
  }
  function sitAt(e, i) { if (seatTaken(i, e.id)) return false; const s = seatOf(i); return walkTo(e, s.ax, s.ay, i); }

  /* ---------- transporte ---------- */
  const PROVIDER = { impl: null };
  function send(m) { m.from = S.myId; try { if (PROVIDER.impl && PROVIDER.impl.send) PROVIDER.impl.send(m); else if (NET.on) netQueue(m); else if (tr) tr.postMessage(m); } catch (e) { } }
  /* presencia real (/api/sala): quién está de verdad, dónde, qué dijo y qué proyecta. Solo late mientras tienes la Sala abierta. */
  const API_SALA = "/api/sala", NET = { on: false, t: 0, q: 0, busy: false, dirty: false, out: [], proj: undefined, seen: {}, projTs: 0, projId: "" };
  function netQueue(m) {
    if (m.t === "say") NET.out.push({ text: m.text }); else if (m.t === "proj") NET.proj = m.k ? { k: m.k } : null;
    else if (m.t === "bye") { try { fetch(API_SALA, { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ id: S.myId, bye: true }) }); } catch (e) { } return; }
    NET.dirty = true; clearTimeout(NET.q); NET.q = setTimeout(() => { if (!NET.busy) netTick(); }, 250);
  }
  async function netTick() {
    clearTimeout(NET.t); if (!NET.on) return;
    const v = $("view-sala"), visible = v && v.classList.contains("active") && !document.hidden, e = myEnt();
    /* afuera: solo se mira quién está (sin aparecer), y solo con la pestaña Sala a la vista */
    if (!S.inside || !e) { if (visible && !NET.busy) { NET.busy = true; try { const r = await fetch(API_SALA, { cache: "no-store" }); if (r.ok) netApply(await r.json()); } catch (er) { } NET.busy = false; } NET.t = setTimeout(netTick, visible ? 5000 : 8000); return; }
    const tgt = e.path.length ? e.path[e.path.length - 1] : [e.x, e.y];
    const body = { id: S.myId, name: me(), x: Math.round(tgt[0]), y: Math.round(tgt[1]), seat: e.seat >= 0 ? e.seat : (e.goSeat >= 0 ? e.goSeat : -1), mic: !!e.mic, cam: !!e.cam, say: NET.out.splice(0) };
    if (NET.proj !== undefined) { body.proj = NET.proj; NET.proj = undefined; }
    NET.busy = true; NET.dirty = false;
    try { const r = await fetch(API_SALA, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); if (r.ok) netApply(await r.json()); else NET.out.unshift(...body.say); }
    catch (er) { NET.out.unshift(...body.say); }
    NET.busy = false;
    NET.t = setTimeout(netTick, NET.dirty ? 250 : [...S.ents.values()].some(x => x.net) ? 2500 : 6000);
  }
  function logAdd(name, text, ts) { S.log.push({ ts, name, text }); S.log.sort((a, b) => a.ts - b.ts); if (S.log.length > 80) S.log.splice(0, S.log.length - 80); renderLog(); }
  function netApply(j) {
    const ids = new Set();
    (j.people || []).forEach(p => {
      if (!p || !p.id || p.id === S.myId) return; ids.add(p.id);
      let e = S.ents.get(p.id); const nuevo = !e;
      const says = (p.say || []).slice().sort((a, b) => a.ts - b.ts), last = says.length ? says[says.length - 1].ts : 0;
      if (nuevo) {
        e = mkEnt({ name: p.name }); e.net = true;
        if (p.seat >= 0 && SEATS[p.seat]) { e.seat = p.seat; e.x = SEATS[p.seat].x; e.y = SEATS[p.seat].y; } else { e.x = p.x; e.y = p.y; }
        says.forEach(m => logAdd(p.name, m.text, m.ts)); NET.seen[p.id] = last;
      } else {
        if (p.seat >= 0) { if (e.seat !== p.seat && e.goSeat !== p.seat) sitAt(e, p.seat); }
        else { const t = e.path.length ? e.path[e.path.length - 1] : [e.x, e.y]; if (e.seat >= 0 || Math.hypot(t[0] - p.x, t[1] - p.y) > 2) walkTo(e, p.x, p.y); }
        says.filter(m => m.ts > (NET.seen[p.id] || 0)).forEach(m => { say(e, m.text, m.ts); }); NET.seen[p.id] = Math.max(NET.seen[p.id] || 0, last);
      }
      if (!DL.call) { e.mic = !!p.mic; } e.camR = !!p.cam;
      if (p.proj && p.proj.ts > NET.projTs) { NET.projTs = p.proj.ts; NET.projId = p.id; setProj(p.proj.k, p.name, true); }
      else if (!p.proj && NET.projId === p.id && S.proj) { NET.projId = ""; setProj(null, "", true); }
    });
    [...S.ents.values()].filter(e => e.net && !ids.has(e.id)).forEach(e => { if (NET.projId === e.id && S.proj) { NET.projId = ""; setProj(null, "", true); } rmEnt(e.id); });
    if (DL.call) dailySync(); else people_();
  }
  function onMsg(m) {
    if (!m || m.from === S.myId) return;
    if (m.t === "who") { if (S.inside) sendState(); return; }
    let e = S.ents.get(m.from);
    if (m.t === "hi" || m.t === "state") { if (!e) e = mkEnt({ name: m.name, x: m.x, y: m.y }); if (m.seat >= 0) { e.seat = m.seat; const s = seatOf(m.seat); e.x = s.x; e.y = s.y; } else { e.x = m.x; e.y = m.y; } e.mic = !!m.mic; e.cam = false; if (m.t === "hi") sendState(); people_(); if (m.proj && !S.proj) setProj(m.proj, m.name, true); return; }
    if (!e) return;
    if (m.t === "mv") { if (m.seat >= 0) sitAt(e, m.seat); else walkTo(e, m.x, m.y); }
    else if (m.t === "say") say(e, m.text);
    else if (m.t === "st") { e.mic = !!m.mic; e.speaking = m.spk ? 1 : 0; people_(); }
    else if (m.t === "proj") setProj(m.k, e.name, true);
    else if (m.t === "bye") { rmEnt(m.from); people_(); }
  }
  const sendState = () => { const e = myEnt(); if (e) send({ t: "state", name: e.name, x: e.x, y: e.y, seat: e.seat, mic: e.mic, proj: S.projBy === e.name ? S.proj : null }); };
  function openTransport() {
    if (PROVIDER.impl || NET.on || tr) return;
    const local = () => { try { tr = new BroadcastChannel("pxp-sala-v1"); tr.onmessage = ev => onMsg(ev.data); tr.postMessage({ t: "who", from: S.myId }); } catch (e) { tr = null; } };
    if (!/^https?:/.test(location.protocol)) return local();
    fetch(API_SALA, { cache: "no-store" }).then(r => { if (r.ok) { NET.on = true; netTick(); } else local(); }).catch(local);
  }

  /* ---------- burbujas, registro y proyección ---------- */
  function say(e, text, ts) {
    text = String(text || "").trim().slice(0, 140); if (!text) return;
    logAdd(e.name, text, ts || Date.now());
    if (e.bub) e.bub.remove();
    const b = document.createElement("div"); b.className = "sl-bub pxb"; b.innerHTML = `<span class="pxb-o"><span class="pxb-i"></span></span>${PXA.TAIL}`; b.querySelector(".pxb-i").textContent = text;
    $("sl-ov").appendChild(b); e.bub = b; e.bubT = performance.now() + 4200 + text.length * 70;
    if (e.id !== S.myId && S.inside && !salaVisible()) { S.unread++; pill(); }
  }
  function renderLog() {
    const l = $("sl-log"); if (!l) return;
    l.innerHTML = S.log.slice(-80).map(m => `<li><b>${esc(tit(String(m.name).split(" ")[0]))}</b> ${esc(m.text)} <time>${new Date(m.ts).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}</time></li>`).join("") || `<li class="sl-empty">${L("Aquí queda lo que se dice en la sala.", "What's said in the room stays here.")}</li>`;
    l.scrollTop = l.scrollHeight;
  }
  const ESTP = { cotizado: "Cotizado", preproduccion: "Preproducción", rodaje: "Rodaje", en_produccion: "Postproducción", postproduccion: "Postproducción", revision: "Revisión", entregado: "Entregado", aprobado: "Aprobado", standby: "Standby" };
  const fD = f => { try { return new Date(f + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" }); } catch (e) { return f; } };

  /* la misma ficha de la pestaña Proyectos, escalada para que quepa entera */
  /* ---------- medios locales (no se transmiten hasta conectar el servicio de llamadas) ---------- */
  function note(t) { const n = $("sl-toast"); if (!n) return; n.textContent = t; n.hidden = false; clearTimeout(n._t); n._t = setTimeout(() => { n.hidden = true; }, 4200); }
  const mErr = (e, what) => note(e && e.name === "NotAllowedError" ? L(`No hay permiso para ${what}. Revísalo en el candado de la barra de direcciones.`, `No permission for ${what}.`) : L(`No pude abrir ${what} en esta vista. Ábrela en el navegador.`, `Couldn't open ${what} here.`));
  let actx = null, anal = null, buf = null;
  async function toggleMic() {
    const e = myEnt(); if (!e) return;
    if (S.media.mic) { dlMic(false); S.media.mic.getTracks().forEach(t => t.stop()); S.media.mic = null; e.mic = false; e.speaking = 0; anal = null; }
    else { try { S.media.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); e.mic = true;
        try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const src = actx.createMediaStreamSource(S.media.mic); anal = actx.createAnalyser(); anal.fftSize = 512; buf = new Uint8Array(anal.fftSize); src.connect(anal); } catch (er) { anal = null; }
      } catch (er) { mErr(er, L("el micrófono", "the microphone")); return; } }
    if (PROVIDER.impl && PROVIDER.impl.setMic) try { PROVIDER.impl.setMic(e.mic, S.media.mic); } catch (er) { }
    if (e.mic) dlMic(true);
    send({ t: "st", mic: e.mic }); bar(); people_();
  }
  async function toggleCam() {
    const e = myEnt(); if (!e) return;
    if (S.media.cam) { dlCam(false); S.media.cam.getTracks().forEach(t => t.stop()); S.media.cam = null; e.cam = false; const c = e.el.querySelector(".sl-cam"); c.innerHTML = ""; }
    else { try { S.media.cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 320 }, facingMode: "user" } }); e.cam = true;
        const v = document.createElement("video"); v.muted = true; v.autoplay = true; v.playsInline = true; v.srcObject = S.media.cam; const c = e.el.querySelector(".sl-cam"); c.innerHTML = ""; c.appendChild(v); v.play().catch(() => { });
      } catch (er) { mErr(er, L("la cámara", "the camera")); return; } }
    if (PROVIDER.impl && PROVIDER.impl.setCam) try { PROVIDER.impl.setCam(e.cam, S.media.cam); } catch (er) { }
    if (e.cam) dlCam(true);
    bar(); people_();
  }
  function stopScreen() { if (S.media.screen) { dlScreen(false); S.media.screen.getTracks().forEach(t => t.stop()); } S.media.screen = null; const tv = $("sl-tv"); if (tv) tv.innerHTML = ""; if (PROVIDER.impl && PROVIDER.impl.setScreen) try { PROVIDER.impl.setScreen(false, null); } catch (er) { } paintTV(); bar(); }
  async function toggleScreen() {
    if (S.media.screen) { stopScreen(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { note(L("Este navegador no permite compartir pantalla.", "This browser can't share the screen.")); return; }
    try { S.media.screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); } catch (er) { if (er && er.name !== "NotAllowedError") mErr(er, L("la pantalla", "the screen")); return; }
    S.media.screen.getVideoTracks()[0].onended = stopScreen; S.proj = null; const tv = $("sl-tv"); if (tv) tv.innerHTML = "";
    if (PROVIDER.impl && PROVIDER.impl.setScreen) try { PROVIDER.impl.setScreen(true, S.media.screen); } catch (er) { }
    if (S.proj && S.projBy === me()) setProj(null, me());
    dlScreen(true); paintTV(); bar(); note(DL.st === "on" ? L("Todos en la sala ven tu pantalla en el TV.", "Everyone in the room sees your screen on the TV.") : L("Tu pantalla se ve en el TV. Por ahora solo en tu equipo.", "Your screen is on the TV. Only on your device for now."));
  }


  /* ---------- bucle ---------- */
  function update(dt) {
    const now = performance.now();
    // teclado (flechas / WASD)
    const me_ = myEnt();
    if (me_ && S.keys.size) {
      let vx = 0, vy = 0; if (S.keys.has("l")) vx--; if (S.keys.has("r")) vx++; if (S.keys.has("u")) vy--; if (S.keys.has("d")) vy++;
      if (vx || vy) { if (me_.seat >= 0) { const s = seatOf(me_.seat); me_.x = s.ax; me_.y = s.ay; me_.seat = -1; } me_.path = []; const sp = 52 * dt / 1000, n = Math.hypot(vx, vy);
        const nx = me_.x + vx / n * sp, ny = me_.y + vy / n * sp, [cx, cy] = clampP(nx, ny);
        if (!inBlock(cx, cy)) { me_.x = cx; me_.y = cy; } else if (!inBlock(cx, me_.y)) me_.x = cx; else if (!inBlock(me_.x, cy)) me_.y = cy;
        me_.moving = true; me_.back = vy < 0 && Math.abs(vy) >= Math.abs(vx); me_.kbT = now; }
    }
    S.ents.forEach(e => {
      if (e.path.length) {
        const [tx, ty] = e.path[0], dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), sp = 46 * dt / 1000;
        e.back = dy < -0.5 && Math.abs(dy) > Math.abs(dx) * .8;
        if (d <= sp) { e.x = tx; e.y = ty; e.path.shift(); if (!e.path.length && e.goSeat >= 0) { if (!seatTaken(e.goSeat, e.id)) { e.seat = e.goSeat; const s = seatOf(e.seat); e.x = s.x; e.y = s.y; e.goSeat = -1; } else { e.goSeat = -1; if (e.id === S.myId) say(e, L("Uy, alguien se sentó primero", "Oops, someone took that seat")); } if (e.id === S.myId) { bar(); sendState(); } } }
        else { e.x += dx / d * sp; e.y += dy / d * sp; }
        e.moving = true;
      } else if (!(e.id === S.myId && S.keys.size)) e.moving = false;
      if (e.moving) { e.walkT += dt; if (e.walkT > 170) { e.walkT = 0; e.step = e.step === 1 ? 2 : 1; } }
      if (!reduce()) {
        e.brT -= dt; if (e.brT <= 0) { e.br = e.br ? 0 : 1; e.brT = e.br ? R(700, 1000) : R(2400, 4600); }
        e.blinkT -= dt; if (e.blinkT <= 0) { e.blink = e.blink ? 0 : 1; e.blinkT = e.blink ? 120 : R(2600, 5600); }
        e.dxT -= dt; if (e.dxT <= 0) { e.dx = e.dx ? 0 : (Math.random() < .5 ? -1 : 1); e.dxT = e.dx ? R(700, 1400) : R(5000, 11000); }
      }
      if (e.bub && now > e.bubT) { const b = e.bub; e.bub = null; b.classList.add("out"); setTimeout(() => b.remove(), 400); }
    });
    // nivel del micrófono propio
    if (me_ && anal && buf) { anal.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; } const rms = Math.sqrt(s / buf.length), spk = rms > .045;
      if (spk !== !!me_.speaking) { me_.speaking = spk ? 1 : 0; send({ t: "st", mic: true, spk }); } }
    if (me_ && me_.moving && (!me_._sent || now - me_._sent > 400)) { me_._sent = now; send({ t: "mv", x: Math.round(me_.path.length ? me_.path[me_.path.length - 1][0] : me_.x), y: Math.round(me_.path.length ? me_.path[me_.path.length - 1][1] : me_.y), seat: me_.goSeat >= 0 ? me_.goSeat : -1 }); }
  }
  function frame(x) {
    x.imageSmoothingEnabled = false; x.clearRect(0, 0, W, H); x.drawImage(drawBg(), 0, 0); if (S.bgPrev) { const f = (performance.now() - S.fade0) / 1600; if (f >= 1) S.bgPrev = null; else { x.globalAlpha = 1 - f * f * (3 - 2 * f); x.drawImage(S.bgPrev, 0, 0); x.globalAlpha = 1; } } drawClock(x); horaChip(); mapaHot();
    const ents = [...S.ents.values()];
    const items = ents.map(e => {
      const s = e.seat >= 0 ? seatOf(e.seat) : null, back = s ? s.view === "back" : e.back;
      const z = s ? (s.side === "back" ? TABLE.y - 1 : s.side === "front" ? s.y + .2 : s.y + .2) : e.y;
      return { z, draw: () => { const top = s && s.side === "sofa" ? s.y - 30 : (s ? s.y - 30 : e.y - 30);
        const spr = sprite(e.cfg, e.g, { back, br: e.moving ? 0 : e.br, blink: back ? 0 : e.blink, dx: back ? 0 : e.dx, walk: e.moving ? e.step : 0 });
        if (!s) { x.fillStyle = "rgba(0,0,0,.0)"; }
        x.drawImage(spr, Math.round((s ? s.x : e.x) - 16), Math.round(top)); e._top = Math.round(top); e._cx = Math.round(s ? s.x : e.x); } };
    });
    items.push({ z: TABLE.y + TABLE.h + 2, draw: () => drawTable(x) });
    SEATS.forEach(s => { if (s.side === "front") items.push({ z: s.y + .5, draw: () => drawFrontChair(x, s) }); });
        items.sort((a, b) => a.z - b.z).forEach(i => i.draw());
    drawLight(x);
  }
  function overlays() {
    const st = $("sl-stage"); if (!st) return;
    S.ents.forEach(e => {
      if (e._cx == null) return;
      const s = e.seat >= 0 ? seatOf(e.seat) : null;
      e.el.style.left = (e._cx / W * 100) + "%"; e.el.style.top = (e._top / H * 100) + "%";
      const tagY = s ? (s.side === "back" ? (TABLE.y + 11 - e._top) : s.side === "front" ? 39 : 33) : 33;
      e.el.style.setProperty("--ty", tagY);
      e.el.classList.toggle("spk", !!e.speaking); e.el.classList.toggle("cam", !!e.cam); e.el.classList.toggle("me", e.id === S.myId); e.el.classList.toggle("seated", !!s);
      e.el.querySelector(".sl-mic").hidden = !e.mic;
      if (e.bub) { e.bub.style.left = (e._cx / W * 100) + "%"; e.bub.style.top = ((e._top + 2) / H * 100) + "%"; }
    });
  }
  function loop(t) {
    S.raf = 0; const v = $("view-sala"); if (!v || !v.classList.contains("active") && getComputedStyle(v).display === "none") return;
    const dt = Math.min(64, t - (S.last || t)); S.last = t; update(dt);
    const cv = $("sl-cv"); if (cv) frame(cv.getContext("2d")); overlays();
    if (!S._tv || t - S._tv > 30000) { S._tv = t; if (!S.proj && !S.media.screen) paintTV(); }
    S.raf = requestAnimationFrame(loop);
  }
  const run = () => { if (!S.raf) { S.last = 0; S.raf = requestAnimationFrame(loop); } };

  let chipK = "";
  function horaChip(force) { const c = $("sl-hora"); if (!c || !S.pal) return; const h = hora(), k = S.pal.momento + (S.hora == null ? "" : "*") + Math.floor(h * 4); if (!force && k === chipK) return; chipK = k;
    const hh = Math.floor(h), mm = Math.floor((h % 1) * 60), t = new Date(2000, 0, 1, hh, mm).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
    c.innerHTML = `<i style="background:${S.pal.wall};box-shadow:inset -5px 0 0 ${S.pal.floor}"></i>${esc(L(...MOMENTO[S.pal.momento]))} · ${esc(t)}${S.hora == null ? "" : ` <em>${L("vista previa", "preview")}</em>`}`; }
  /* mapa: notas del corcho con detalle al pasar y vista grande al hacer clic */
  let mapK = "";
  function mapaHot() {
    const box = $("sl-map"); if (!box || !S.mapa) return; const k = S.mapa.map(m => m.v + m.n + m.label).join("|"); if (k === mapK) return; mapK = k;
    const pct = (v, o, l) => ((v - o) / l * 100) + "%";
    box.innerHTML = S.mapa.map((m, i) => `<button type="button" class="sl-mn" data-v="${m.v}" style="left:${pct(m.slot[0], BOARD.x, BOARD.w)};top:${pct(m.slot[1] + (i % 3 === 1 ? 1 : 0), BOARD.y, BOARD.h)}" data-sl-tip="${esc(m.tip)}" aria-label="${esc(m.label)} · ${esc(m.tip)}"><b>${esc(m.label)}</b>${m.n != null ? `<small>${m.n}</small>` : ""}</button>`).join("");
    box.onclick = ev => { const b = ev.target.closest(".sl-mn"); if (!b) return; ev.stopPropagation(); const v = b.dataset.v;
      if (v === "clientes") return mapaBig(-1); notaPreview(v); };
  }
  /* copia los estilos de las fichas de Clientes (que viven bajo #view-clientes) para usarlos en el mapa */
  function cssClientes() {
    if ($("sl-cli-css")) return; const out = [];
    const walk = (rules, wrap) => { for (const r of rules) { try {
      if (r.type === 1 && /#view-clientes|#cli-wrap/.test(r.selectorText)) { const t = r.cssText.replace(/#view-clientes/g, ".sl-cv").replace(/#cli-wrap/g, ".sl-cv"); out.push(wrap ? `@media ${wrap}{${t}}` : t); }
      else if (r.type === 4) walk(r.cssRules, r.conditionText || r.media.mediaText); } catch (e) { } } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules, null); } catch (e) { } }
    const st = document.createElement("style"); st.id = "sl-cli-css"; st.textContent = out.join("\n"); document.head.appendChild(st);
  }
  function mapaBig(focus) {
    let html = ""; try { html = window.pxpClientTreeHtml ? pxpClientTreeHtml() : ""; } catch (e) { }
    const tmp = document.createElement("div"); tmp.innerHTML = html; const tree = tmp.querySelector(".ctree"); if (!tree) return;
    cssClientes();
    const fc = null;
    const n = tree.querySelectorAll("details.cnode").length, foot = tmp.querySelector(".ct-foot");
    const ov = document.createElement("div"); ov.className = "sl-mp"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", L("Mapa de proyectos", "Project map"));
    ov.innerHTML = `<div class="sl-mp-b"><header><h3>${L("Mapa de proyectos", "Project map")}</h3><p>${n} ${L("clientes con proyectos activos", "clients with active projects")}</p>${S.inside ? `<button type="button" class="sl-np-pj">${L("Proyectar en el TV", "Show on the TV")}</button>` : ""}<button type="button" class="sl-mp-go">${L("Abrir Clientes", "Open Clients")}</button><button type="button" class="sl-mp-x" aria-label="${L("Cerrar", "Close")}">✕</button></header><div class="sl-cv"></div></div>`;
    const host = ov.querySelector(".sl-cv"); host.appendChild(tree); if (foot) host.appendChild(foot);
    document.body.appendChild(ov);
    const close = () => { ov.remove(); document.removeEventListener("keydown", k); }; const k = ev => { if (ev.key === "Escape") close(); };
    document.addEventListener("keydown", k); ov.querySelector(".sl-mp-x").onclick = close;
    ov.querySelector(".sl-mp-go").onclick = () => { close(); try { switchView("clientes"); window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { } };
    const pj = ov.querySelector(".sl-np-pj"); if (pj) pj.onclick = () => { close(); setProj("view:clientes", me()); const e = myEnt(); if (e) say(e, L("Les proyecto ", "Showing ") + refLabel("view:clientes")); };
    ov.addEventListener("click", ev => { if (ev.target === ov) return close(); if (ev.target.closest(".pchip, .cn-link, .cav, .ct-all, [data-k]")) setTimeout(close, 0); });
    if (fc) { const d = [...tree.querySelectorAll("details.cnode")].find(x => nn(x.dataset.ck) === fc); if (d) { d.open = true; d.classList.add("sl-focus"); setTimeout(() => d.scrollIntoView({ block: "nearest" }), 60); } }
    setTimeout(() => ov.querySelector(".sl-mp-x").focus(), 30);
  }
  /* ---------- interfaz ---------- */
  const IC = {
    mic: '<path d="M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/>',
    micOff: '<path d="M3 3l18 18"/><path d="M9 9v2a3 3 0 0 0 5 2.2M15 9.3V5a3 3 0 0 0-5.7-1.3"/><path d="M5 10a7 7 0 0 0 11.5 5.4M19 10a7 7 0 0 1-.6 2.8M12 17v4M8 21h8"/>',
    cam: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
    camOff: '<path d="M3 3l18 18"/><path d="M16 16H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1M10 6h4a2 2 0 0 1 2 2v3l5-3v9"/>',
    screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    proj: '<path d="M4 5h16v10H4z"/><path d="M8 19l4-4l4 4"/>',
    seat: '<path d="M6 4v10h12V4"/><path d="M5 14h14M7 14v6M17 14v6"/>',
    send: '<path d="M5 12h14M13 6l6 6l-6 6"/>',
    log: '<path d="M5 6h14M5 12h14M5 18h9"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    side: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    enter: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M3 12h11M10 8l4 4l-4 4"/>',
    exit: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M21 12H10M17 8l4 4l-4 4"/>',
    room: '<rect x="5" y="9" width="14" height="6" rx="1"/><circle cx="8" cy="5.5" r="1.6"/><circle cx="12" cy="5.5" r="1.6"/><circle cx="16" cy="5.5" r="1.6"/><path d="M8 15v4M16 15v4"/>',
  };
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  function bar() {
    const e = myEnt(), b = $("sl-bar"); if (!b) return;
    const set = (id, on, ico, icoOff, a, z) => { const x = $(id); if (!x) return; x.classList.toggle("on", !!on); x.setAttribute("aria-pressed", on ? "true" : "false"); x.querySelector("i").innerHTML = svg(on || !icoOff ? ico : icoOff); x.querySelector("span").textContent = on ? a : z; };
    set("sl-mic", e && e.mic, IC.mic, IC.micOff, L("Mic encendido", "Mic on"), L("Micrófono", "Microphone"));
    set("sl-camb", e && e.cam, IC.cam, IC.camOff, L("Cámara encendida", "Camera on"), L("Cámara", "Camera"));
    set("sl-scr", !!S.media.screen, IC.screen, null, L("Dejar de compartir", "Stop sharing"), L("Pantalla", "Screen"));
    set("sl-seat", e && e.seat >= 0, IC.seat, null, L("Levantarme", "Stand up"), L("Sentarme", "Sit down"));
    const out = !S.inside; ["sl-mic", "sl-camb", "sl-scr", "sl-projb", "sl-seat", "sl-in", "sl-send"].forEach(id => { const x = $(id); if (x) x.disabled = out; });
    const vw = $("sl-vw"); if (vw) { vw.classList.toggle("on", !!S.full); vw.querySelector("i").innerHTML = svg(S.full ? IC.shrink : IC.expand); vw.querySelector("span").textContent = S.full ? L("Reducir", "Exit wide view") : L("Ampliar", "Wide view"); vw.setAttribute("aria-pressed", S.full ? "true" : "false"); }
    const sd = $("sl-sidet"); if (sd) { sd.hidden = !S.full; sd.classList.toggle("on", S.full && !S.sideOff); }
    b.classList.toggle("out", out); const x = $("sl-exit"); if (x) { x.classList.toggle("in", !out); x.querySelector("span").textContent = out ? L("Entrar a la sala", "Enter the room") : L("Salir de la sala", "Leave the room"); x.querySelector("i").innerHTML = svg(out ? IC.enter : IC.exit); }
  }
  function people_() {
    const ul = $("sl-ppl"); if (!ul) return; const list = [...S.ents.values()].sort((a, b) => (b.id === S.myId) - (a.id === S.myId) || a.name.localeCompare(b.name));
    $("sl-n").textContent = list.length;
    ul.innerHTML = list.map(e => `<li data-id="${esc(e.id)}"><img src="${PXA.headURL(e.cfg, null, 44)}" alt=""><span><b>${esc(tit(e.name))}${e.id === S.myId ? ` <em>${L("tú", "you")}</em>` : ""}</b><small>${esc(e.role)}</small></span><i class="${e.mic ? "on" : ""}" title="${e.mic ? L("Micrófono encendido", "Mic on") : L("Micrófono apagado", "Mic off")}">${svg(e.mic ? IC.mic : IC.micOff)}</i><i class="${e.cam || e.camR ? "on" : ""}" title="${e.cam || e.camR ? L("Cámara encendida", "Camera on") : L("Cámara apagada", "Camera off")}">${svg(e.cam || e.camR ? IC.cam : IC.camOff)}</i></li>`).join("");
    if (!S.inside) lobby(); pill();
    paintTV();
  }
  function chatSend() { const i = $("sl-in"); const v = i.value.trim(); if (!v) { i.focus(); return; } i.value = ""; const e = myEnt(); if (!e) return; say(e, v); send({ t: "say", text: v }); }
  /* ---------- proyección: ventanas reales de la plataforma (proyecto, cliente, persona) y gráficas del equipo, en un cuadro 16:9 ----------
     ref = "proj:CLAVE" | "cli:Nombre" | "per:Nombre" | "chart:disp" | "chart:carga"  (una clave sin prefijo = proyecto) */
  const FW = 1280, FH = 720;
  const parseRef = r => { r = String(r || ""); let y = 0; const m = r.match(/#y=(\d+)$/); if (m) { y = +m[1]; r = r.slice(0, m.index); } const i = r.indexOf(":"); return i < 0 ? { t: "proj", id: r, y, base: "proj:" + r } : { t: r.slice(0, i), id: r.slice(i + 1), y, base: r }; };
  const VIEWS_PJ = [["dashboard", ["Dashboard", "Dashboard"], "Disponibilidad, entregas y cargas"], ["traffic", ["Tráfico", "Traffic"], "La semana de todo el equipo"], ["projects", ["Proyectos", "Projects"], "Todas las fichas de proyecto"], ["team", ["Team", "Team"], "Grupos y personas"], ["clientes", ["Clientes", "Clients"], "Clientes, marcas y gráficas"], ["capacidad", ["Capacidad", "Capacity"], "Quién tiene cupo"], ["horas", ["Horas", "Hours"], "Horas registradas por persona"], ["mishoras", ["Mis horas", "My hours"], "Tus horas de la semana"], ["reportes", ["Reportes", "Reports"], "Reportes y time tables"], ["licencias", ["Licencias", "Licenses"], "Licencias de herramientas"], ["logros", ["Logros", "Achievements"], "Logros del equipo"], ["repositorio", ["Repositorio", "Repository"], "Proyectos aprobados"]];
  const CHARTS = { disp: { label: L("Disponibilidad del equipo", "Team availability"), sel: "#dash-wrap .lb-panel", sub: L("Libres, ocupados y en sobrecarga esta semana", "Free, busy and overloaded this week") },
    carga: { label: L("Carga por persona", "Load by person"), title: "Carga por persona", sub: L("Proyectos activos de cada persona esta semana", "Active projects per person this week") } };
  const WIN = { proj: { m: "pxp-proj", open: id => openProjectFicha(id), close: () => pxpCloseProject() }, cli: { m: "pxp-client", open: id => pxpOpenClient(id), close: () => pxpCloseClient() }, per: { m: "pxp-person", open: id => pxpOpenPerson(id), close: () => pxpClosePerson() } };
  function refLabel(r) { const { t, id } = parseRef(r); if (t === "view") { const v = VIEWS_PJ.find(x => x[0] === id); return v ? L(...v[1]) : id; } if (t === "proj") return ((typeof PROJECTS !== "undefined" && PROJECTS[id]) || {}).nombre || id; if (t === "chart") return (CHARTS[id] || {}).label || id; return tit(id); }
  /* copia una vez los estilos que dependen de un id (#pxp-proj, #dash-wrap…) a una clase, para que la copia se vea igual */
  function scopeCss() {
    if ($("sl-win-css")) return; const MAP = [[".pxp-modal", ".sl-pxm"], ["#pxp-proj", ".sl-w-pxp-proj"], ["#pxp-client", ".sl-w-pxp-client"], ["#pxp-person", ".sl-w-pxp-person"], ["#dash-wrap", ".sl-w-dash"], ["#view-dashboard", ".sl-w-dash"]], out = [];
    const conv = t => MAP.reduce((a, [f, r]) => a.split(f).join(r), t);
    const walk = (rules, wrap) => { for (const r of rules) { try { if (r.type === 1 && MAP.some(([f]) => r.selectorText.includes(f))) { const t = conv(r.cssText); out.push(wrap ? `@media ${wrap}{${t}}` : t); } else if (r.type === 4) walk(r.cssRules, r.conditionText || r.media.mediaText); } catch (e) { } } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules, null); } catch (e) { } }
    const st = document.createElement("style"); st.id = "sl-win-css"; st.textContent = out.join("\n"); document.head.appendChild(st);
  }
  /* ids → clases: la copia no repite ids en la página y conserva los estilos que dependían de ellos */
  const SLID = new Set(); let slidCss = null;
  function scopeIds(root, extra) {
    const ids = (extra || []).slice();
    root.querySelectorAll("[id]").forEach(e => { if (e.closest("svg")) return; const id = e.id; e.removeAttribute("id"); if (/^[\w-]+$/.test(id)) { e.classList.add("slid-" + id); ids.push(id); } });
    const nuevos = [...new Set(ids)].filter(i => /^[\w-]+$/.test(i) && !SLID.has(i)); if (!nuevos.length) return;
    nuevos.forEach(i => SLID.add(i)); const re = new RegExp("#(" + nuevos.join("|") + ")(?![\\w-])", "g"), out = [];
    const walk = (rules, wrap) => { for (const r of rules) { try { if (r.type === 1 && r.selectorText && (re.lastIndex = 0, re.test(r.selectorText))) { re.lastIndex = 0; const t = r.cssText.replace(re, ".slid-$1"); out.push(wrap ? `@media ${wrap}{${t}}` : t); } else if (r.type === 4) walk(r.cssRules, r.conditionText || r.media.mediaText); } catch (e) { } } };
    for (const sh of document.styleSheets) { if (sh.ownerNode && sh.ownerNode.id === "sl-slid-css") continue; try { walk(sh.cssRules, null); } catch (e) { } }
    if (!slidCss) { slidCss = document.createElement("style"); slidCss.id = "sl-slid-css"; document.head.appendChild(slidCss); } slidCss.textContent += "\n" + out.join("\n");
  }
  /* copia un pedazo de la página: los lienzos (gráficas) pasan como imagen */
  function snap(src, wrapCls, wrapIds, header) {
    const cl = src.cloneNode(true), sc = [...src.querySelectorAll("canvas")], cc = [...cl.querySelectorAll("canvas")];
    cc.forEach((c, i) => { const o = sc[i]; if (!o) return; try { const img = document.createElement("img"); img.src = o.toDataURL(); img.className = c.className; img.style.cssText = c.style.cssText; img.style.width = (o.clientWidth || o.width) + "px"; img.style.height = (o.clientHeight || o.height) + "px"; c.replaceWith(img); } catch (e) { } });
    cl.querySelectorAll("video, iframe, script").forEach(x => x.remove());
    const w = document.createElement("div"); w.className = wrapCls; if (header) w.insertAdjacentHTML("afterbegin", header); w.appendChild(cl); scopeIds(w, wrapIds); return w.outerHTML;
  }
  const capCache = new Map();
  function capture(r) {
    const { t, id, base } = parseRef(r); const hit = capCache.get(base); if (hit && Date.now() - hit.t < 15000) return hit.html;
    let html = "";
    if (WIN[t]) {
      const w = WIN[t], m0 = $(w.m), wasOpen = m0 && m0.classList.contains("open"); if (wasOpen) return hit ? hit.html : "";
      document.documentElement.classList.add("sl-cap");
      try { w.open(id); const m = $(w.m), box = m && m.querySelector(".pm-box"); if (box) html = snap(box, `sl-wwin sl-pxm open sl-w-${w.m} slid-${w.m}`, [w.m]); } catch (e) { }
      try { w.close(); } catch (e) { } setTimeout(() => document.documentElement.classList.remove("sl-cap"), 60);
    } else if (t === "chart") {
      const c = CHARTS[id]; if (!c) return "";
      const find_ = () => c.sel ? document.querySelector(c.sel) : [...document.querySelectorAll("#dash-wrap .home-panel, #dash-wrap section")].find(x => (x.querySelector(".hp-title") || {}).textContent && x.querySelector(".hp-title").textContent.includes(c.title));
      let el = find_(); if (!el) { try { renderDashboard(); } catch (e) { } el = find_(); }
      if (el) html = snap(el, "sl-wchart sl-w-dash slid-dash-wrap", ["dash-wrap"], `<header><b>${esc(c.label)}</b><span>${esc(c.sub)}</span></header>`);
    } else if (t === "view") {
      /* una pestaña completa: se dibuja un instante sin pintarse (todo en el mismo paso) y se vuelve a la Sala */
      const cur = (document.querySelector(".view.active") || { id: "view-sala" }).id.replace(/^view-/, ""), sy = scrollY;
      S.capturing = true; try { switchView(id); const v = $("view-" + id); if (v) { html = snap(v, "sl-wview", ["view-" + id]); html = html.replace(/class="view active /, 'class="').replace(/class="view active"/, 'class=""'); } } catch (e) { }
      try { switchView(cur); } catch (e) { } S.capturing = false; window.scrollTo(0, sy);
    }
    capCache.set(base, { t: Date.now(), html }); return html;
  }
  function frameHTML(r, big) { const h = capture(r); return h ? `<div class="sl-frame${big ? " big" : ""}">${h}</div>` : `<div class="sl-frame empty"><p>${L("No pude abrir esa ventana.", "Couldn't open that window.")}</p></div>`; }
  function fit(box, y) { const f = box.querySelector(".sl-frame"); if (!f) return; const k = box.clientWidth / FW; if (k > 0) f.style.zoom = k; if (y != null) f.scrollTop = y; }
  /* clics dentro de una copia: no abren nada (solo se desplaza) */
  const blockClicks = box => box.addEventListener("click", ev => { if (ev.target.closest(".sl-frame")) { ev.preventDefault(); ev.stopPropagation(); } }, true);
  const projHTML = (k) => frameHTML("proj:" + k);
  function setProj(r, by, remote) {
    if (S.media.screen && r) stopScreen();
    S.proj = r || null; S.projBy = r ? by : ""; paintTV();
    if (!remote) send({ t: "proj", k: S.proj });
    const s = $("sl-projs"); if (s) s.textContent = S.proj ? `${tit(String(by).split(" ")[0])} ${L("proyecta", "is showing")} ${refLabel(S.proj)}` : "";
  }
  function paintTV() {
    const tv = $("sl-tv"); if (!tv) return;
    const scr = pantalla();
    if (scr) { const v0 = tv.querySelector("video"); if (!v0 || v0.srcObject !== scr) { tv.innerHTML = ""; const v = document.createElement("video"); v.muted = true; v.autoplay = true; v.playsInline = true; v.srcObject = scr; tv.appendChild(v); v.play().catch(() => { }); } tv.dataset.mode = "screen"; return; }
    if (S.proj) { const R = parseRef(S.proj); if (tv.dataset.k !== R.base || tv.dataset.mode !== "proj") { scopeCss(); tv.innerHTML = frameHTML(S.proj); tv.dataset.k = R.base; } tv.dataset.mode = "proj"; fit(tv); const f = tv.querySelector(".sl-frame"); if (f) f.scrollTo({ top: R.y, behavior: "smooth" }); return; }
    tv.dataset.k = "";
    const n = S.ents.size; tv.dataset.mode = "idle";
    tv.innerHTML = `<div class="sl-idle"><b>${L("Sala de juntas", "Meeting room")}</b><span>${n} ${n === 1 ? L("persona", "person") : L("personas", "people")} · ${new Date().toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}</span></div>`;
  }
  addEventListener("resize", () => { const tv = $("sl-tv"); if (tv) fit(tv); });
  /* elegir qué proyectar: pestañas, búsqueda, fichas visuales y vista previa 16:9 */
  function projPicker() {
    if (document.querySelector(".sl-pj")) return;
    scopeCss();
    const P = typeof PROJECTS !== "undefined" ? PROJECTS : {}, act = k => P[k] && !P[k].archivadoEn && P[k].estadoGeneral !== "aprobado";
    const ESTC = { cotizado: "var(--muted)", preproduccion: "var(--cyan)", rodaje: "var(--yellow)", en_produccion: "var(--majorelle)", postproduccion: "var(--majorelle)", revision: "var(--cyan)", entregado: "var(--green)", standby: "var(--pink)" };
    const clientes = () => { const by = {}; Object.keys(P).filter(act).forEach(k => { const c = String(P[k].cliente || "").trim(); if (c) (by[c] = by[c] || []).push(k); }); return Object.keys(by).sort((a, b) => by[b].length - by[a].length).map(c => ({ c, n: by[c].length })); };
    const av = (kind, n) => { try { return window.pxpAvatar ? pxpAvatar(kind, n, 34) : ""; } catch (e) { return ""; } };
    const TABS = [["proj", L("Proyectos", "Projects")], ["cli", L("Clientes", "Clients")], ["per", L("Personas", "People")], ["chart", L("Gráficas", "Charts")], ["view", L("Vistas", "Views")]];
    let tab = S.proj ? parseRef(S.proj).t : "proj", sel = S.proj || "";
    const ov = document.createElement("div"); ov.className = "sl-pj"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", L("Proyectar en el TV", "Show on the TV"));
    ov.innerHTML = `<div class="sl-pj-b"><header><h3>${L("Proyectar en el TV", "Show on the TV")}</h3><div class="seg sl-pj-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" data-t="${k}">${l}</button>`).join("")}</div><button type="button" class="sl-mp-x" aria-label="${L("Cerrar", "Close")}">✕</button></header>
      <div class="sl-pj-m"><div class="sl-pj-l"><input type="search" class="sl-pj-q" aria-label="${L("Buscar", "Search")}"><div class="sl-pj-g" role="listbox"></div></div>
      <div class="sl-pj-r"><div class="sl-pj-prev"><div class="sl-idle"><b>${L("Vista previa", "Preview")}</b><span>${L("Elige algo a la izquierda", "Pick something on the left")}</span></div></div><p class="sl-pj-n"></p><p class="sl-pj-h">${L("Clic para ver la vista previa · doble clic o Enter para proyectar", "Click to preview · double-click or Enter to show")}</p>
      <div class="sl-pj-a">${S.proj ? `<button type="button" class="sl-pj-off">${L("Apagar el TV", "Turn TV off")}</button>` : ""}<button type="button" class="sl-pj-go" disabled>${L("Proyectar", "Show")}</button></div></div></div></div>`;
    document.body.appendChild(ov);
    const $o = s => ov.querySelector(s), g = $o(".sl-pj-g"), q = $o(".sl-pj-q"), prev = $o(".sl-pj-prev"), go = $o(".sl-pj-go");
    const tiles = () => { const nq = nn(q.value);
      if (tab === "proj") return Object.keys(P).filter(act).filter(k => !nq || nn(P[k].nombre || k).includes(nq) || nn(P[k].cliente).includes(nq)).sort((a, b) => (P[a].nombre || a).localeCompare(P[b].nombre || b))
        .map(k => `<button type="button" role="option" class="sl-tl" data-r="proj:${esc(k)}" style="--tc:${window.pxpProjectColor ? pxpProjectColor(k) : "var(--majorelle)"}"><i class="sl-tl-c"></i><b>${esc(P[k].nombre || k)}</b><small>${esc(tit(P[k].cliente || ""))}</small><em style="--ec:${ESTC[P[k].estadoGeneral] || "var(--muted)"}">${esc(ESTP[P[k].estadoGeneral] || "")}</em></button>`);
      if (tab === "cli") return clientes().filter(x => !nq || nn(x.c).includes(nq)).map(x => `<button type="button" role="option" class="sl-tl av" data-r="cli:${esc(x.c)}">${av("client", x.c)}<b>${esc(tit(x.c))}</b><small>${x.n} ${x.n === 1 ? L("proyecto activo", "active project") : L("proyectos activos", "active projects")}</small></button>`);
      if (tab === "per") return people().filter(p => !nq || nn(p.name).includes(nq) || nn(p.alias || p.role).includes(nq)).sort((a, b) => a.name.localeCompare(b.name)).map(p => `<button type="button" role="option" class="sl-tl av" data-r="per:${esc(p.name)}">${av("person", p.name)}<b>${esc(tit(p.name))}</b><small>${esc(p.alias || p.role || "")}</small></button>`);
      if (tab === "view") { const nav = $("tab-nav"); return VIEWS_PJ.filter(([v]) => (!nav || nav.querySelector(`[data-view="${v}"]`)) && (!nq || nn(L(...VIEWS_PJ.find(x => x[0] === v)[1])).includes(nq))).map(([v, lab, sub]) => `<button type="button" role="option" class="sl-tl vw" data-r="view:${v}"><i class="sl-tl-vw"><span></span><span></span><span></span></i><b>${esc(L(...lab))}</b><small>${esc(sub)}</small></button>`); }
      return Object.keys(CHARTS).filter(k => !nq || nn(CHARTS[k].label).includes(nq)).map(k => `<button type="button" role="option" class="sl-tl ch" data-r="chart:${k}"><i class="sl-tl-ch">${k === "disp" ? "<span></span><span></span><span></span>" : "<span></span><span></span><span></span><span></span>"}</i><b>${esc(CHARTS[k].label)}</b><small>${esc(CHARTS[k].sub)}</small></button>`); };
    const PH = { proj: L("Busca un proyecto o cliente", "Search a project or client"), cli: L("Busca un cliente", "Search a client"), per: L("Busca a alguien del equipo", "Search a teammate"), chart: L("Busca una gráfica", "Search a chart"), view: L("Busca una pestaña de la plataforma", "Search a platform tab") };
    const draw = () => { ov.querySelectorAll(".sl-pj-tabs button").forEach(b => { b.classList.toggle("on", b.dataset.t === tab); b.setAttribute("aria-selected", b.dataset.t === tab); }); q.placeholder = PH[tab];
      const list = tiles(); g.innerHTML = list.join("") || `<p class="sl-pj-e">${L("Nada con ese nombre.", "Nothing by that name.")}</p>`; g.querySelectorAll(".sl-tl").forEach(b => b.setAttribute("aria-selected", b.dataset.r === sel)); };
    const pick = r => { const R = parseRef(r); sel = R.base; g.querySelectorAll(".sl-tl").forEach(b => b.setAttribute("aria-selected", b.dataset.r === sel)); prev.innerHTML = frameHTML(sel); requestAnimationFrame(() => fit(prev, R.y)); $o(".sl-pj-n").textContent = refLabel(sel); go.disabled = false; };
    blockClicks(prev);
    const doGo = () => { if (!sel) return; const f = prev.querySelector(".sl-frame"), y = f ? Math.round(f.scrollTop) : 0; setProj(sel + (y > 0 ? "#y=" + y : ""), me()); close(); const e = myEnt(); if (e) say(e, L("Les proyecto ", "Showing ") + refLabel(sel)); };
    ov.querySelector(".sl-pj-tabs").onclick = ev => { const b = ev.target.closest("[data-t]"); if (!b) return; tab = b.dataset.t; q.value = ""; draw(); q.focus(); };
    g.onclick = ev => { const b = ev.target.closest(".sl-tl"); if (b) pick(b.dataset.r); };
    g.ondblclick = ev => { const b = ev.target.closest(".sl-tl"); if (b) { pick(b.dataset.r); doGo(); } };
    g.onkeydown = ev => { const b = ev.target.closest(".sl-tl"); if (!b) return; const all = [...g.querySelectorAll(".sl-tl")], i = all.indexOf(b), cols = Math.max(1, Math.round(g.clientWidth / b.offsetWidth));
      const mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[ev.key]; if (mv) { ev.preventDefault(); const n = all[Math.max(0, Math.min(all.length - 1, i + mv))]; n.focus(); pick(n.dataset.r); } else if (ev.key === "Enter") { ev.preventDefault(); pick(b.dataset.r); doGo(); } };
    q.oninput = draw; q.onkeydown = ev => { if (ev.key === "ArrowDown") { ev.preventDefault(); const f = g.querySelector(".sl-tl"); if (f) { f.focus(); pick(f.dataset.r); } } else if (ev.key === "Enter") { ev.preventDefault(); const f = g.querySelector(".sl-tl[aria-selected=true]") || g.querySelector(".sl-tl"); if (f) { pick(f.dataset.r); doGo(); } } };
    go.onclick = doGo; const off = $o(".sl-pj-off"); if (off) off.onclick = () => { setProj(null, me()); close(); };
    const close = () => { ov.remove(); document.removeEventListener("keydown", k); setTimeout(() => { const b = $("sl-projb"); if (b) b.focus({ preventScroll: true }); }, 120); }; const k = ev => { if (ev.key === "Escape") close(); };
    document.addEventListener("keydown", k); $o(".sl-mp-x").onclick = close; ov.addEventListener("click", ev => { if (ev.target === ov) close(); });
    draw(); if (sel) pick(sel); setTimeout(() => q.focus(), 40);
  }
  function tvBig() {
    if (!S.proj && !pantalla()) return;
    const { t, id } = parseRef(S.proj || "");
    const ov = document.createElement("div"); ov.className = "sl-big"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", L("TV en grande", "TV enlarged"));
    ov.innerHTML = `<div class="sl-big-b"><button type="button" class="sl-big-x" aria-label="${L("Cerrar", "Close")}">✕</button><div class="sl-big-c"></div><div class="sl-big-a"><button type="button" class="sl-big-f">${L("Pantalla completa", "Full screen")}</button>${S.proj && WIN[t] && !pantalla() ? `<button type="button" class="sl-big-o">${L("Abrir en la plataforma", "Open in the platform")}</button>` : ""}</div></div>`;
    document.body.appendChild(ov); const c = ov.querySelector(".sl-big-c");
    const close = () => { ov.remove(); document.removeEventListener("keydown", k); }; const k = ev => { if (ev.key === "Escape") close(); };
    if (pantalla()) { const v = document.createElement("video"); v.muted = true; v.autoplay = true; v.playsInline = true; v.srcObject = pantalla(); c.appendChild(v); v.play().catch(() => { }); }
    else { scopeCss(); const R = parseRef(S.proj); c.innerHTML = frameHTML(S.proj, true); blockClicks(c); requestAnimationFrame(() => { fit(c, R.y); const f = c.querySelector(".sl-frame"); let tm = 0;
        if (f && S.projBy === me()) f.addEventListener("scroll", () => { clearTimeout(tm); tm = setTimeout(() => { if (!S.proj) return; const y = Math.round(f.scrollTop); setProj(parseRef(S.proj).base + (y > 0 ? "#y=" + y : ""), me()); }, 220); }); }); }
    document.addEventListener("keydown", k); ov.querySelector(".sl-big-x").onclick = close; ov.onclick = ev => { if (ev.target === ov) close(); };
    const o = ov.querySelector(".sl-big-o"); if (o) o.onclick = () => { close(); try { WIN[t].open(id); } catch (e) { } };
    const fb = ov.querySelector(".sl-big-f"), bx = ov.querySelector(".sl-big-b");
    fb.onclick = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else (bx.requestFullscreen || bx.webkitRequestFullscreen).call(bx); } catch (e) { } };
    const fsc = () => { fb.textContent = document.fullscreenElement ? L("Salir de pantalla completa", "Exit full screen") : L("Pantalla completa", "Full screen"); if (!ov.isConnected) document.removeEventListener("fullscreenchange", fsc); };
    document.addEventListener("fullscreenchange", fsc);
  }
  function personCard(e, cx, cy) {
    document.querySelectorAll(".sl-card").forEach(x => x.remove());
    const c = document.createElement("div"); c.className = "sl-card"; c.innerHTML = `<img src="${PXA.headURL(e.cfg, null, 56)}" alt=""><b>${esc(tit(e.name))}</b><small>${esc(e.role)}</small><button type="button">${L("Ver ficha", "View profile")}</button>`;
    $("sl-stage").appendChild(c); c.style.left = (cx / W * 100) + "%"; c.style.top = (cy / H * 100) + "%";
    c.querySelector("button").onclick = () => { c.remove(); try { pxpOpenPerson(e.name); } catch (er) { } };
    setTimeout(() => document.addEventListener("pointerdown", function h(ev) { if (!c.contains(ev.target)) { c.remove(); document.removeEventListener("pointerdown", h); } }), 0);
  }
  function stageClick(ev) {
    const st = $("sl-stage"), r = st.getBoundingClientRect(), rot = S.full && S.rot, e = myEnt(); if (!e) return;
    const x = rot ? (ev.clientY - r.top) / r.height * W : (ev.clientX - r.left) / r.width * W, y = rot ? (r.right - ev.clientX) / r.width * H : (ev.clientY - r.top) / r.height * H;
    if (ev.target.closest(".sl-card,.sl-pick,.sl-map")) return;
    if (x >= TV.x && x <= TV.x + TV.w && y >= TV.y && y <= TV.y + TV.h) { tvBig(); return; }
    // ¿clic sobre alguien?
    const who = [...S.ents.values()].find(o => o.id !== S.myId && o._cx != null && Math.abs(x - o._cx) < 9 && y > o._top + 3 && y < o._top + 30);
    if (who) { personCard(who, who._cx, who._top); return; }
    // ¿una silla?
    const si = SEATS.findIndex(s => Math.abs(x - s.x) < 11 && y > s.y - 26 && y < s.y + 8);
    if (si >= 0) { if (seatTaken(si, e.id)) { say(e, L("Esa silla está ocupada", "That seat is taken")); return; } sitAt(e, si); send({ t: "mv", seat: si }); return; }
    if (y < BOUNDS.y0 - 6) return;
    if (walkTo(e, x, y)) send({ t: "mv", x: Math.round(x), y: Math.round(y), seat: -1 });
  }

  function mount() {
    const nav = $("tab-nav"); if (!nav) return;
    if (!nav.querySelector('[data-view="sala"]')) {
      const b = document.createElement("button"); b.className = "tab-btn"; b.dataset.view = "sala"; b.setAttribute("onclick", "switchView('sala')");
      b.innerHTML = `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC.room}</svg>${L("Sala", "Room")}`;
      const ref = nav.querySelector('[data-view="team"]'); if (ref) ref.after(b); else nav.appendChild(b);
    }
    if ($("view-sala")) return;
    const host = $("view-logros") || $("view-repositorio") || $("view-team"); if (!host) return;
    host.insertAdjacentHTML("afterend", `<div class="view" id="view-sala"><div class="proj-wrap sl-wrap">
      <div class="sl-head"><div><h2>${L("Sala de juntas", "Meeting room")}</h2><p>${L("Haz clic en el piso para caminar o en una silla para sentarte. También con las flechas.", "Click the floor to walk or a chair to sit. Arrow keys work too.")}</p></div>
        <div class="sl-hr"><span class="sl-hora" id="sl-hora" title="${L("La sala sigue la hora del día", "The room follows the time of day")}"></span><span class="sl-badge">${L("Prototipo", "Prototype")}</span></div></div>
      <div class="sl-main">
        <div class="sl-stage" id="sl-stage" tabindex="0" role="application" aria-label="${L("Sala de juntas. Flechas para caminar.", "Meeting room. Arrow keys to walk.")}">
          <canvas id="sl-cv" width="${W}" height="${H}"></canvas>
          <div class="sl-tv" id="sl-tv" style="left:${TV.x / W * 100}%;top:${TV.y / H * 100}%;width:${TV.w / W * 100}%;height:${TV.h / H * 100}%" title="${L("Clic para ver en grande", "Click to enlarge")}"></div>
          <div class="sl-map" id="sl-map" style="left:${BOARD.x / W * 100}%;top:${BOARD.y / H * 100}%;width:${BOARD.w / W * 100}%;height:${BOARD.h / H * 100}%"></div><div class="sl-ov" id="sl-ov"></div><div class="sl-toast" id="sl-toast" role="status" hidden></div>
        </div>
        <aside class="sl-side"><section><h3>${L("En la sala", "In the room")} <b id="sl-n">0</b></h3><ul class="sl-ppl" id="sl-ppl"></ul><p class="sl-projs" id="sl-projs"></p></section>
          <section><h3>${L("Conversación", "Conversation")}</h3><ul class="sl-log" id="sl-log"></ul></section></aside>
      </div>
      <div class="sl-bar" id="sl-bar">
        <div class="sl-ctl">
          <button type="button" class="sl-b" id="sl-mic"><i></i><span></span></button>
          <button type="button" class="sl-b" id="sl-camb"><i></i><span></span></button>
          <button type="button" class="sl-b" id="sl-scr"><i></i><span></span></button>
          <button type="button" class="sl-b" id="sl-projb"><i>${svg(IC.proj)}</i><span>${L("Proyectar", "Show project")}</span></button>
          <button type="button" class="sl-b" id="sl-seat"><i></i><span></span></button>
          <button type="button" class="sl-b sl-vwb" id="sl-vw"><i></i><span></span></button>
          <button type="button" class="sl-b sl-sideb" id="sl-sidet"><i>${svg(IC.side)}</i><span>${L("Personas y chat", "People & chat")}</span></button>
          <button type="button" class="sl-b sl-exit" id="sl-exit"><i></i><span></span></button>
        </div>
        <div class="sl-chat"><input id="sl-in" type="text" enterkeyhint="send" maxlength="140" autocomplete="off" placeholder="${L("Escribe a la sala…", "Write to the room…")}" aria-label="${L("Mensaje para la sala", "Message to the room")}"><button type="button" id="sl-send" aria-label="${L("Enviar", "Send")}">${svg(IC.send)}</button></div>
      </div>
      <p class="sl-note">${L("Voz, video y pantalla compartida llegan cuando TI apruebe el servicio de llamadas. Por ahora tu cámara, tu micrófono y tu pantalla solo se ven en tu equipo.", "Voice, video and screen sharing arrive once IT approves the calling service. For now your camera, mic and screen are only visible on your device.")}</p>
    </div></div>`);
    $("sl-stage").addEventListener("click", stageClick);
    $("sl-mic").onclick = toggleMic; $("sl-camb").onclick = toggleCam; $("sl-scr").onclick = toggleScreen; $("sl-projb").onclick = projPicker; $("sl-exit").onclick = () => S.inside ? leaveAsk() : lobby(true); $("sl-vw").onclick = () => S.full ? exitFull() : goFull(); $("sl-sidet").onclick = () => { const w = document.querySelector(".sl-wrap"); w.classList.toggle("side-off"); S.sideOff = w.classList.contains("side-off"); fitFull(); };
    $("sl-seat").onclick = () => { const e = myEnt(); if (!e) return; if (e.seat >= 0) { const s = seatOf(e.seat); e.seat = -1; e.x = s.ax; e.y = s.ay; walkTo(e, s.ax, s.side === "back" ? 63 : s.side === "front" ? 184 : s.ay); bar(); sendState(); return; }
      let best = -1, bd = 1e9; SEATS.forEach((s, i) => { if (seatTaken(i, e.id)) return; const d = Math.hypot(s.ax - e.x, s.ay - e.y); if (d < bd) { bd = d; best = i; } }); if (best >= 0) { sitAt(e, best); send({ t: "mv", seat: best }); } };
    $("sl-send").onclick = chatSend; $("sl-in").addEventListener("keydown", ev => { if (ev.key === "Enter" && !ev.isComposing) { ev.preventDefault(); chatSend(); } ev.stopPropagation(); });
    $("sl-ppl").onclick = ev => { const li = ev.target.closest("li[data-id]"); if (!li) return; const e = S.ents.get(li.dataset.id); if (e && e.id !== S.myId) personCard(e, e._cx, e._top); };
    const KM = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d", a: "l", d: "r", w: "u", s: "d", A: "l", D: "r", W: "u", S: "d" };
    $("sl-stage").addEventListener("keydown", ev => { const k = KM[ev.key]; if (k) { ev.preventDefault(); S.keys.add(k); } else if (ev.key === "Enter") { $("sl-in").focus(); } });
    $("sl-stage").addEventListener("keyup", ev => { const k = KM[ev.key]; if (k) { S.keys.delete(k); if (!S.keys.size) sendState(); } });
    $("sl-stage").addEventListener("blur", () => S.keys.clear());
    bar(); renderLog();
  }
  const salaVisible = () => { const v = $("view-sala"); return !!(v && v.classList.contains("active")); };
  /* ---------- v218 · llamadas reales con Daily: voz, cámara y pantalla para todos los que están en la sala ----------
     La presencia (dónde está cada quien, el chat, lo proyectado) sigue por /api/sala; Daily solo lleva audio y video.
     El permiso de entrada lo da /api/daily (la clave de Daily vive en Netlify, nunca aquí). Sin configurar, todo sigue local. */
  const DL = { st: "off", call: null, enabled: null, aud: new Map(), rScr: null, err: "" };
  async function dailyCheck() {
    if (DL.enabled != null) return DL.enabled;
    if (!/^https?:/.test(location.protocol)) return (DL.enabled = false);
    try { const r = await fetch("/api/daily", { cache: "no-store" }); const j = r.ok ? await r.json() : {}; DL.enabled = !!j.enabled; } catch (e) { DL.enabled = false; }
    callNote(); return DL.enabled;
  }
  const loadDaily = () => window.Daily ? Promise.resolve(window.Daily) : new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "daily.js"; s.async = true; s.onload = () => window.Daily ? ok(window.Daily) : ko(new Error("lib")); s.onerror = () => ko(new Error("lib")); document.head.appendChild(s); });
  function callNote() {
    const n = document.querySelector(".sl-note"); if (!n) return;
    n.textContent = DL.enabled
      ? (DL.st === "on" ? L("Llamada conectada: tu micrófono, tu cámara y tu pantalla los ven y escuchan todos los que están en la sala.", "Call connected: everyone in the room sees and hears your mic, camera and screen.")
        : DL.st === "joining" ? L("Conectando la llamada…", "Connecting the call…")
        : DL.st === "err" ? L("No se pudo conectar la llamada. ", "Couldn't connect the call. ") + (DL.err || "")
        : L("Al entrar a la sala se conecta la llamada: micrófono, cámara y pantalla para todos.", "Entering the room connects the call: mic, camera and screen for everyone."))
      : L("Voz, video y pantalla compartida llegan cuando se configure el servicio de llamadas. Por ahora tu cámara, tu micrófono y tu pantalla solo se ven en tu equipo.", "Voice, video and screen sharing arrive once the calling service is set up. For now your camera, mic and screen are only visible on your device.");
    n.classList.toggle("on", DL.st === "on");
  }
  async function dailyJoin() {
    if (!S.inside || DL.call || DL.st === "joining") return;
    if (!(await dailyCheck()) || !S.inside) return;
    DL.st = "joining"; DL.err = ""; callNote();
    try {
      const r = await fetch("/api/daily", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: S.myId, name: me() }) });
      const j = await r.json().catch(() => ({})); if (!r.ok || !j.token) throw new Error(j.error || L("Sin permiso de entrada.", "No entry token."));
      const D = await loadDaily(); if (!S.inside) { DL.st = "off"; callNote(); return; }
      const call = D.createCallObject({ subscribeToTracksAutomatically: true, audioSource: false, videoSource: false });
      DL.call = call;
      ["participant-joined", "participant-updated", "participant-left", "track-started", "track-stopped"].forEach(ev => call.on(ev, dailySync));
      call.on("active-speaker-change", ev => { const sid = ev && ev.activeSpeaker && ev.activeSpeaker.peerId, ps = call.participants();
        Object.values(ps).forEach(p => { if (p.local) return; const e = S.ents.get(p.user_id); if (e) e.speaking = p.session_id === sid && p.audio ? 1 : 0; }); clearTimeout(DL.spkT); DL.spkT = setTimeout(() => S.ents.forEach(e => { if (e.id !== S.myId) e.speaking = 0; }), 2500); });
      call.on("error", ev => { DL.err = (ev && ev.errorMsg) || ""; dailyLeave(true); DL.st = "err"; callNote(); });
      call.on("left-meeting", () => { if (DL.call === call) dailyLeave(true); });
      await call.join({ url: j.url, token: j.token, userName: me(), startVideoOff: true, startAudioOff: true });
      if (!S.inside) { dailyLeave(); return; }
      DL.st = "on"; callNote();
      if (S.media.mic) dlMic(true); if (S.media.cam) dlCam(true); if (S.media.screen) dlScreen(true);
      dailySync();
    } catch (e) { DL.err = (e && e.message) || ""; if (DL.call) { try { DL.call.destroy(); } catch (er) { } } DL.call = null; DL.st = "err"; callNote(); note(L("No pude conectar la llamada. ", "Couldn't connect the call. ") + DL.err); }
  }
  function dailyLeave(soft) {
    const c = DL.call; DL.call = null; DL.st = "off";
    if (c && !soft) { try { c.leave().finally(() => { try { c.destroy(); } catch (e) { } }); } catch (e) { } } else if (c) { try { c.destroy(); } catch (e) { } }
    DL.aud.forEach(x => { try { x.srcObject = null; x.remove(); } catch (e) { } }); DL.aud.clear();
    S.ents.forEach(e => { if (e.id === S.myId) return; if (e.dlV) { e.dlV = null; e.cam = false; const v = e.el.querySelector(".sl-cam"); if (v) v.innerHTML = ""; } e.speaking = 0; });
    if (DL.rScr) { DL.rScr = null; paintTV(); } callNote(); people_();
  }
  const track = (p, k) => p && p.tracks && p.tracks[k] && p.tracks[k].state === "playable" ? p.tracks[k].persistentTrack : null;
  function dailySync() {
    const c = DL.call; if (!c) return; let ps = {}; try { ps = c.participants(); } catch (e) { return; }
    const vivos = new Set(); let scr = null;
    Object.values(ps).forEach(p => {
      if (p.local) return; vivos.add(p.session_id);
      const a = track(p, "audio");
      let el = DL.aud.get(p.session_id);
      if (a) { if (!el) { el = document.createElement("audio"); el.autoplay = true; el.playsInline = true; el.dataset.dl = p.session_id; el.style.display = "none"; document.body.appendChild(el); DL.aud.set(p.session_id, el); }
        if (!el.srcObject || el.srcObject.getAudioTracks()[0] !== a) { el.srcObject = new MediaStream([a]); el.play().catch(() => { }); } }
      else if (el) { el.srcObject = null; el.remove(); DL.aud.delete(p.session_id); }
      const e = S.ents.get(p.user_id);
      if (e) {
        const v = track(p, "video");
        if (v && e.dlV !== v) { e.dlV = v; e.cam = true; const box = e.el.querySelector(".sl-cam"); const ve = document.createElement("video"); ve.muted = true; ve.autoplay = true; ve.playsInline = true; ve.srcObject = new MediaStream([v]); box.innerHTML = ""; box.appendChild(ve); ve.play().catch(() => { }); }
        else if (!v && e.dlV) { e.dlV = null; e.cam = false; const box = e.el.querySelector(".sl-cam"); if (box) box.innerHTML = ""; }
        e.mic = !!p.audio;
      }
      const sv = track(p, "screenVideo"); if (sv && !scr) scr = { t: sv, by: p.user_name || "", sid: p.session_id };
    });
    DL.aud.forEach((el, sid) => { if (!vivos.has(sid)) { el.srcObject = null; el.remove(); DL.aud.delete(sid); } });
    const prev = DL.rScr;
    if (scr && (!prev || prev.t !== scr.t)) { DL.rScr = { t: scr.t, stream: new MediaStream([scr.t]), by: scr.by }; if (S.proj) { S.proj = null; S.projBy = ""; } const tv = $("sl-tv"); if (tv) tv.innerHTML = ""; paintTV(); const s = $("sl-projs"); if (s) s.textContent = `${tit(String(scr.by).split(" ")[0])} ${L("comparte su pantalla", "is sharing their screen")}`; }
    else if (!scr && prev) { DL.rScr = null; const tv = $("sl-tv"); if (tv) tv.innerHTML = ""; paintTV(); const s = $("sl-projs"); if (s && !S.proj) s.textContent = ""; }
    people_();
  }
  async function dlMic(on) { const c = DL.call; if (!c || DL.st !== "on") return; try { if (on && S.media.mic) { await c.setInputDevicesAsync({ audioSource: S.media.mic.getAudioTracks()[0] }); c.setLocalAudio(true); } else c.setLocalAudio(false); } catch (e) { console.warn(e); } }
  async function dlCam(on) { const c = DL.call; if (!c || DL.st !== "on") return; try { if (on && S.media.cam) { await c.setInputDevicesAsync({ videoSource: S.media.cam.getVideoTracks()[0] }); c.setLocalVideo(true); } else c.setLocalVideo(false); } catch (e) { console.warn(e); } }
  async function dlScreen(on) { const c = DL.call; if (!c || DL.st !== "on") return; try { if (on && S.media.screen) c.startScreenShare({ mediaStream: S.media.screen }); else c.stopScreenShare(); } catch (e) { console.warn(e); } }
  const pantalla = () => S.media.screen || (DL.rScr && DL.rScr.stream) || null;

  /* ---------- entrar y salir: siempre con confirmación ---------- */
  function lobby(show) {
    const st = $("sl-stage"); if (!st) return; let lb = $("sl-lobby");
    if (S.inside) { if (lb) lb.remove(); return; }
    if (!lb) { lb = document.createElement("div"); lb.id = "sl-lobby"; lb.className = "sl-lobby"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "false"); lb.setAttribute("aria-labelledby", "sl-lb-t"); st.appendChild(lb); show = true; }
    const ppl = [...S.ents.values()].filter(e => e.id !== S.myId), n = ppl.length;
    const k = n + ppl.map(e => e.id).join(",") + (window.pxpLang || ""); if (!show && lb.dataset.k === k) return; lb.dataset.k = k;
    const heads = ppl.slice(0, 6).map(e => `<img src="${PXA.headURL(e.cfg, null, 44)}" alt="" title="${esc(tit(e.name))}">`).join("") + (n > 6 ? `<em>+${n - 6}</em>` : "");
    const quien = n ? (n === 1 ? `${esc(tit(ppl[0].name.split(" ")[0]))} ${L("está adentro", "is inside")}` : n <= 3 ? `${ppl.map(e => esc(tit(e.name.split(" ")[0]))).join(", ").replace(/, ([^,]*)$/, " " + L("y", "and") + " $1")} ${L("están adentro", "are inside")}` : `${n} ${L("personas adentro", "people inside")}`) : L("No hay nadie todavía. Puedes ser la primera persona.", "Nobody's here yet. You can be the first.");
    lb.innerHTML = `<div class="sl-lb-c"><h3 id="sl-lb-t">${L("¿Entrar a la sala de juntas?", "Enter the meeting room?")}</h3>${n ? `<div class="sl-lb-h">${heads}</div>` : ""}<p>${quien}</p><p class="sl-lb-s">${L("Al entrar, las demás personas te ven en la sala hasta que salgas.", "Once inside, others see you in the room until you leave.")}</p><div class="sl-lb-a"><button type="button" class="sl-lb-no">${L("Ahora no", "Not now")}</button><button type="button" class="sl-lb-si">${L("Entrar", "Enter")}</button></div></div>`;
    lb.querySelector(".sl-lb-si").onclick = join;
    lb.querySelector(".sl-lb-no").onclick = () => { const p = S.prevView && S.prevView !== "sala" ? S.prevView : "home"; try { switchView(p); window.scrollTo({ top: 0 }); } catch (e) { } };
    if (show) setTimeout(() => { const b = lb.querySelector(".sl-lb-si"); if (b && salaVisible()) b.focus({ preventScroll: true }); }, 60);
  }
  function join() {
    if (S.inside || !S.myId) return; S.inside = true; S.unread = 0;
    const e = mkEnt({ name: me() }); e.x = DOOR.x; e.y = DOOR.y; walkTo(e, DOOR.x + 18, 180);
    if (NET.on) { NET.dirty = true; clearTimeout(NET.t); if (!NET.busy) netTick(); else NET.q = setTimeout(netTick, 400); }
    else if (tr) tr.postMessage({ t: "hi", from: S.myId, name: me(), x: DOOR.x, y: DOOR.y, seat: -1, mic: false });
    lobby(); people_(); bar(); pill(); paintTV(); avHint(); dailyJoin();
    const st = $("sl-stage"); if (st) st.focus({ preventScroll: true });
  }
  function leave() {
    if (!S.inside) return; const e = myEnt();
    if (S.media.mic) toggleMic(); if (S.media.cam) toggleCam(); if (S.media.screen) stopScreen();
    if (S.proj && S.projBy === me()) setProj(null, me());
    send({ t: "bye" }); NET.out = []; NET.proj = undefined;
    if (PROVIDER.impl && PROVIDER.impl.leave) try { PROVIDER.impl.leave(); } catch (er) { }
    dailyLeave();
    if (e) rmEnt(S.myId); S.inside = false; S.unread = 0; S.keys.clear();
    document.querySelectorAll(".sl-card").forEach(x => x.remove());
    people_(); bar(); pill(); if (salaVisible()) lobby(true);
  }
  function askBox(o) {
    document.querySelectorAll(".sl-ask").forEach(x => x.remove());
    const ov = document.createElement("div"); ov.className = "sl-ask"; ov.setAttribute("role", "alertdialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "sl-ask-t");
    ov.innerHTML = `<div class="sl-ask-b"><h3 id="sl-ask-t">${o.title}</h3>${o.text ? `<p>${o.text}</p>` : ""}<div class="sl-lb-a"><button type="button" class="sl-lb-no">${o.no}</button><button type="button" class="sl-lb-si${o.danger ? " danger" : ""}">${o.yes}</button></div></div>`;
    document.body.appendChild(ov); const back = document.activeElement;
    const close = () => { ov.remove(); document.removeEventListener("keydown", k, true); try { if (back && back.isConnected) back.focus({ preventScroll: true }); } catch (e) { } };
    const k = ev => { if (ev.key === "Escape") { ev.stopPropagation(); close(); } };
    document.addEventListener("keydown", k, true); ov.querySelector(".sl-lb-no").onclick = close; ov.onclick = ev => { if (ev.target === ov) close(); };
    ov.querySelector(".sl-lb-si").onclick = () => { close(); o.onYes(); };
    setTimeout(() => ov.querySelector(".sl-lb-no").focus(), 30);
  }
  function leaveAsk() {
    const yo = S.proj && S.projBy === me();
    askBox({ title: L("¿Salir de la sala?", "Leave the room?"), text: yo ? L("Estás proyectando: al salir se apaga el TV para todos.", "You're showing something: leaving turns the TV off for everyone.") : L("Las demás personas dejarán de verte en la sala.", "Others will stop seeing you in the room."), yes: L("Salir", "Leave"), no: L("Quedarme", "Stay"), danger: true, onYes: leave });
  }
  /* mientras estás adentro y miras otra pestaña: un aviso flotante para volver o salir */
  function pill() {
    let p = $("sl-pill"); const show = S.inside && !salaVisible() && !!me();
    if (!show) { if (p) p.hidden = true; return; }
    if (!p) { p = document.createElement("div"); p.id = "sl-pill"; p.className = "sl-pill"; p.setAttribute("role", "status"); document.body.appendChild(p);
      p.onclick = ev => { if (ev.target.closest(".sl-pill-x")) return leaveAsk(); if (ev.target.closest(".sl-pill-v")) { try { switchView("sala"); window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { } } }; }
    const e = myEnt(), n = S.ents.size;
    p.innerHTML = `<button type="button" class="sl-pill-v" aria-label="${L("Volver a la sala", "Back to the room")}">${e ? `<img src="${PXA.headURL(e.cfg, null, 40)}" alt="">` : ""}<span><b>${L("Estás en la sala", "You're in the room")}</b><small>${n} ${n === 1 ? L("persona", "person") : L("personas", "people")}${S.proj ? " · " + L("TV encendido", "TV on") : ""}</small></span>${S.unread ? `<em>${S.unread}</em>` : ""}</button><button type="button" class="sl-pill-x">${L("Salir", "Leave")}</button>`;
    p.hidden = false;
  }
  /* notas del tablero: vista previa en una ventana, sin sacarte de la sala */
  function notaPreview(v) {
    const m = (S.mapa || []).find(x => x.v === v) || { label: refLabel("view:" + v), tip: "" }; scopeCss();
    const ov = document.createElement("div"); ov.className = "sl-mp sl-np"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", L("Vista previa de ", "Preview of ") + m.label);
    ov.innerHTML = `<div class="sl-mp-b"><header><h3>${esc(m.label)}</h3><p>${esc(m.n != null ? m.tip : L("Vista previa", "Preview"))}</p>${S.inside ? `<button type="button" class="sl-np-pj">${L("Proyectar en el TV", "Show on the TV")}</button>` : ""}<button type="button" class="sl-mp-go">${L("Abrir ", "Open ")}${esc(m.label)}</button><button type="button" class="sl-mp-x" aria-label="${L("Cerrar", "Close")}">✕</button></header><div class="sl-np-prev"></div><p class="sl-np-h">${L("Desplázate para ver más. Al abrir la pestaña sigues en la sala.", "Scroll to see more. Opening the tab keeps you in the room.")}</p></div>`;
    document.body.appendChild(ov); const prev = ov.querySelector(".sl-np-prev");
    prev.innerHTML = frameHTML("view:" + v, true); blockClicks(prev); requestAnimationFrame(() => fit(prev, 0));
    const ro = window.ResizeObserver ? new ResizeObserver(() => fit(prev)) : null; if (ro) ro.observe(prev);
    const close = () => { if (ro) ro.disconnect(); ov.remove(); document.removeEventListener("keydown", k); }; const k = ev => { if (ev.key === "Escape") close(); };
    document.addEventListener("keydown", k); ov.querySelector(".sl-mp-x").onclick = close; ov.onclick = ev => { if (ev.target === ov) close(); };
    ov.querySelector(".sl-mp-go").onclick = () => { close(); try { switchView(v); window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { } };
    const pj = ov.querySelector(".sl-np-pj"); if (pj) pj.onclick = () => { const f = prev.querySelector(".sl-frame"), y = f ? Math.round(f.scrollTop) : 0; close(); setProj("view:" + v + (y > 0 ? "#y=" + y : ""), me()); const e = myEnt(); if (e) say(e, L("Les proyecto ", "Showing ") + m.label); };
    setTimeout(() => ov.querySelector(".sl-mp-x").focus(), 30);
  }
  function avHint() {
    const ed = S.inside && !(find(me()) || {}).avatar, hint = $("sl-noav");
    if (ed && !hint && window.pxpAvatarEditor) { const n = document.createElement("div"); n.id = "sl-noav"; n.className = "sl-noav"; n.innerHTML = `<span>${L("Entraste con un avatar provisional.", "You came in with a temporary avatar.")}</span><button type="button">${L("Crear mi avatar", "Create my avatar")}</button>`; document.querySelector(".sl-head > div").appendChild(n); n.querySelector("button").onclick = () => { pxpAvatarEditor(me()); }; }
    else if (!ed && hint) hint.remove();
  }
  /* ---------- vistas: normal o ampliada (pantalla completa; en celular, horizontal) ---------- */
  const isPhone = () => Math.min(innerWidth, innerHeight) < 600 && matchMedia("(pointer:coarse)").matches;
  function fitFull() {
    const w = document.querySelector(".sl-wrap"); if (!w) return;
    if (!S.full) { w.style.removeProperty("--sw"); return; }
    S.rot = innerHeight > innerWidth && isPhone() && !(screen.orientation && /landscape/.test(screen.orientation.type || ""));
    w.classList.toggle("sl-rot", S.rot);
    const vw = S.rot ? innerHeight : innerWidth, vh = S.rot ? innerWidth : innerHeight; w.style.setProperty("--fw", vw + "px"); w.style.setProperty("--fh", vh + "px");
    if (S.sideOff == null) { S.sideOff = vw < 900; w.classList.toggle("side-off", S.sideOff); }
    requestAnimationFrame(() => { const m = w.querySelector(".sl-main"), sd = w.querySelector(".sl-side"); if (!m) return;
      const aw = m.clientWidth - (S.sideOff || !sd ? 0 : sd.offsetWidth + 12), ah = m.clientHeight; const sw = Math.max(200, Math.min(aw, ah * W / H)); w.style.setProperty("--sw", Math.floor(sw) + "px"); const tv = $("sl-tv"); if (tv) fit(tv); });
  }
  function goFull() {
    const w = document.querySelector(".sl-wrap"); if (!w || S.full) return; S.full = true; S.sideOff = null;
    /* se lleva al cuerpo de la página mientras dura: así nada de la pestaña la recorta ni la desplaza */
    S.home = { p: w.parentNode, n: w.nextSibling }; document.body.appendChild(w);
    w.classList.add("sl-full"); document.documentElement.classList.add("sl-full-on");
    const de = document.documentElement, rq = de.requestFullscreen || de.webkitRequestFullscreen;
    const lock = () => { try { if (isPhone() && screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").then(fitFull).catch(() => { }); } catch (e) { } };
    if (rq && !document.fullscreenElement) { try { const p = rq.call(de); S.fsUs = true; if (p && p.then) p.then(lock).catch(() => { S.fsUs = false; }); else lock(); } catch (e) { } } else lock();
    fitFull(); bar(); setTimeout(() => { const st = $("sl-stage"); if (st) st.focus({ preventScroll: true }); }, 60);
  }
  function exitFull() {
    const w = document.querySelector(".sl-wrap"); if (!S.full) return; S.full = false; S.rot = false;
    if (w) { w.classList.remove("sl-full", "sl-rot", "side-off"); if (S.home && S.home.p && S.home.p.isConnected) S.home.p.insertBefore(w, S.home.n && S.home.n.parentNode === S.home.p ? S.home.n : null); } S.home = null; document.documentElement.classList.remove("sl-full-on");
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { }
    if (S.fsUs && document.fullscreenElement) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { } } S.fsUs = false;
    fitFull(); bar(); const tv = $("sl-tv"); if (tv) setTimeout(() => fit(tv), 50);
  }
  addEventListener("resize", () => { if (S.full) fitFull(); });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && S.full && S.fsUs) { S.fsUs = false; exitFull(); } });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && S.full && !document.querySelector(".sl-mp,.sl-pj,.sl-big,.sl-ask,.pxp-modal.open,.sl-card")) exitFull(); });
  function enter() {
    mount(); if (!$("view-sala")) return;
    const id = nn(me()); if (!id) return;
    if (S.myId !== id) { if (S.inside) leave(); [...S.ents.keys()].forEach(rmEnt); S.myId = id; S.inside = false; }
    openTransport();
    if (S.inside) { S.unread = 0; const e = myEnt(), p = find(me()); if (e && p) { e.cfg = cfgFor(p); e.g = grp(p); } if (NET.on && !NET.busy) netTick(); }
    else if (NET.on && !NET.busy) netTick();
    lobby(); people_(); bar(); pill(); paintTV(); run(); avHint(); dailyCheck().then(callNote);
  }
  addEventListener("pagehide", () => { if (S.inside) send({ t: "bye" }); if (DL.call) dailyLeave(); });

  /* proveedor del servicio de llamadas: se conecta con estos mismos mensajes */
  window.PXP_SALA = {
    version: 1,
    /* impl: { connect({me, onMessage}) → Promise, send(msg), setMic(on, stream), setCam(on, stream), setScreen(on, stream), leave() } */
    hora: h => { S.hora = h == null ? null : +h; bgKey = ""; },
    setProvider(impl) { PROVIDER.impl = impl; if (tr) { try { tr.close(); } catch (e) { } tr = null; } if (impl && impl.connect) return impl.connect({ me: me(), onMessage: onMsg }); },
    state: () => ({ me: S.myId, people: [...S.ents.values()].map(e => ({ id: e.id, name: e.name, x: Math.round(e.x), y: Math.round(e.y), seat: e.seat, mic: e.mic, cam: e.cam })), proj: S.proj, log: S.log.slice() }),
    say: t => { const e = myEnt(); if (e) { say(e, t); send({ t: "say", text: t }); } },
    seats: SEATS.length,
    llamada: () => ({ enabled: DL.enabled, state: DL.st, remotos: DL.call ? Object.values(DL.call.participants()).filter(p => !p.local).length : 0, pantalla: !!DL.rScr }),
    inside: () => S.inside, full: on => (on === false ? exitFull() : goFull()), join: () => { if (!S.inside) join(); }, leave: () => leave(),
  };

  const oSw = window.switchView;
  if (typeof oSw === "function") window.switchView = function (name) { const cv = (document.querySelector(".view.active") || { id: "" }).id.replace(/^view-/, ""); if (name === "sala" && cv && cv !== "sala") S.prevView = cv; if (name !== "sala" && S.full && !S.capturing) exitFull(); const r = oSw.apply(this, arguments); if (name === "sala") { try { enter(); } catch (e) { console.error(e); } } try { pill(); } catch (e) { } return r; };
  const tryMount = () => { try { if (me()) mount(); } catch (e) { } };
  const oEnter = window.enterApp; if (typeof oEnter === "function") window.enterApp = function () { const r = oEnter.apply(this, arguments); setTimeout(tryMount, 1900); return r; };
  let rt = null; const oRender = window.render; if (typeof oRender === "function") window.render = function () { const r = oRender.apply(this, arguments); clearTimeout(rt); rt = setTimeout(tryMount, 950); return r; };
  if (window.pxpOnDom) pxpOnDom(() => { const nav = $("tab-nav"); if (nav && me() && !nav.querySelector('[data-view="sala"]')) tryMount(); }, { childList: true, subtree: true });
  (function arranque() { let n = 0; const iv = setInterval(() => { if (me() && $("tab-nav")) { clearInterval(iv); setTimeout(tryMount, 1300); } else if (++n > 80) clearInterval(iv); }, 500); })();
})();
