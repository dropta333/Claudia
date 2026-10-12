#!/usr/bin/env python3
"""Build: src/app.html (+ data/state.js + vendors) →
  dist/preview.html               vista previa con datos (copia de seguridad completa)
  dist/trafico-netlify-public.zip public/ (index.html sin datos + pdf.js)
  dist/trafico-netlify.zip        public/ + netlify/functions + netlify.toml + package.json + LEEME.md
Uso: python3 tools/build.py [vNNN]   (con versión, copia también a dist/tablero-preview-vNNN.html y dist/trafico-netlify-vNNN.zip)"""
import sys, pathlib, zipfile, shutil
R = pathlib.Path(__file__).resolve().parent.parent
rd = lambda p: (R / p).read_text(encoding="utf-8")
app, state, jspdf, fonts = rd("src/app.html"), rd("data/state.js"), rd("src/vendor-jspdf.js"), rd("src/vendor-fonts.js")
assert app.count("/*@state*/") == 1 and app.count("<!--@pdf-->") == 1, "marcadores"
EMPTY = """// ⟦STATE:BEGIN⟧
let TEAM = [];
let RODAJES = WEEKS.map(() => []);
let FREELANCE = WEEKS.map(() => []);
let PENDIENTES = WEEKS.map(() => []);
let CAPACIDAD_HISTORICO = {};
let AUDIO = [];
const AUDIO_HEADS = "";
let PROJECTS = {};
let META = {"licSeed":1};
// ⟦STATE:END⟧"""
pdf_block = ('<script type="text/plain" id="pxp-jspdf">\n' + jspdf + "</script>\n<script>\n" + fonts + "\n</script>")
preview = app.replace("/*@state*/", state).replace("<!--@pdf-->", pdf_block)
net = app.replace("/*@state*/", EMPTY).replace("<!--@pdf-->", "")
net = net.replace("<head>\n", '<head>\n<script>window.PXP_BACKEND="netlify";</script>\n', 1)
# v182 · El index de Netlify sale minificado (esbuild: espacios, comentarios y sintaxis; sin renombrar).
# Requiere esbuild: npm i --prefix /tmp/esb esbuild@0.24.0  (o la variable ESBUILD). Si no está, sale sin minificar.
try:
    sys.path.insert(0, str(R / "tools")); import minify as _mn, os as _os
    if _os.path.exists(_mn.ESB): net = _mn.minify(net)
    else: print("aviso: esbuild no está instalado; el index de Netlify sale sin minificar")
except Exception as e: print("aviso: no se pudo minificar:", e)
pdfjs = "\n" + jspdf + "\n\n" + fonts + "\n"
D = R / "dist"; D.mkdir(exist_ok=True)
(D / "preview.html").write_text(preview, encoding="utf-8")
def zipit(path, full):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("public/index.html", net); z.writestr("public/pdf.js", pdfjs)
        dj = R / "src/vendor-daily.js"   # v218 · librería de llamadas de Daily (0.92.2, licencia BSD-2), se carga solo al entrar a la Sala
        if dj.exists(): z.write(dj, "public/daily.js")
        ext = R / "tools/extractor/extractor.html"
        if ext.exists(): z.write(ext, "public/extractor.html")   # v185 · extractor de datos (botón de favoritos)
        if full:
            for f in sorted((R / "netlify-site").rglob("*")):
                if f.is_file(): z.write(f, f.relative_to(R / "netlify-site").as_posix())
zipit(D / "trafico-netlify-public.zip", False); zipit(D / "trafico-netlify.zip", True)
if len(sys.argv) > 1:
    v = sys.argv[1]
    shutil.copy(D / "preview.html", D / f"tablero-preview-{v}.html")
    shutil.copy(D / "trafico-netlify.zip", D / f"trafico-netlify-{v}-completo.zip")
print(f"preview {len(preview)//1024} KB · netlify index {len(net)//1024} KB · pdf.js {len(pdfjs)//1024} KB")
