#!/usr/bin/env python3
"""Recupera el entorno desde un tablero-preview-vNNN.html.
Uso: python3 tools/split.py ruta/al/preview.html"""
import sys, re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
html = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
m = re.search(r"// ⟦STATE:BEGIN⟧\n.*?// ⟦STATE:END⟧", html, re.S)
assert m, "sin bloque STATE"
state = m.group(0)
html = html[:m.start()] + "/*@state*/" + html[m.end():]
a = html.index('<script type="text/plain" id="pxp-jspdf">\n')
b = html.index("</script>\n<script>\nwindow.PXP_FONTS=", a)
jspdf = html[a + len('<script type="text/plain" id="pxp-jspdf">\n'):b]
c = b + len("</script>\n<script>\n")
d = html.index("\n</script>\n", c)
fonts = html[c:d]
html = html[:a] + "<!--@pdf-->" + html[d + len("\n</script>"):]
(R / "data/state.js").write_text(state, encoding="utf-8")
(R / "src/vendor-jspdf.js").write_text(jspdf, encoding="utf-8")
(R / "src/vendor-fonts.js").write_text(fonts, encoding="utf-8")
(R / "src/app.html").write_text(html, encoding="utf-8")
print("ok", len(html), len(state), len(jspdf), len(fonts))
