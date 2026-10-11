"""Prepara /tmp/nfmock para tools/netlify-e2e.mjs: index.html y pdf.js del ZIP, funciones reales y Netlify Blobs simulado."""
import zipfile, pathlib, shutil, sys
R = pathlib.Path(__file__).resolve().parent.parent; T = pathlib.Path("/tmp/nfmock")
z = zipfile.ZipFile(sys.argv[1] if len(sys.argv) > 1 else R / "dist/trafico-netlify.zip")
for d in ["public", "fn", "node_modules/@netlify/blobs"]: (T / d).mkdir(parents=True, exist_ok=True)
(T / "public/index.html").write_bytes(z.read("public/index.html")); (T / "public/pdf.js").write_bytes(z.read("public/pdf.js"))
for f in ["state.mjs", "files.mjs", "migrate.mjs"]: (T / "fn" / f).write_bytes(z.read("netlify/functions/" + f))
shutil.copy(R / "tools/nfmock/blobs-mock.mjs", T / "node_modules/@netlify/blobs/index.mjs")
(T / "node_modules/@netlify/blobs/package.json").write_text('{"name":"@netlify/blobs","type":"module","exports":"./index.mjs"}')
(T / "package.json").write_text('{"type":"module"}'); print("listo:", T)
