"""Minifica un HTML de una sola página con esbuild: CSS y cada <script> (espacios, comentarios y sintaxis; sin renombrar).
El <script> con el bloque de datos (⟦STATE:BEGIN⟧) no se toca: la exportación lo busca por sus marcas."""
import re, subprocess, os, sys
ESB = os.environ.get("ESBUILD", "/tmp/esb/node_modules/.bin/esbuild")
def esb(code, loader):
    r = subprocess.run([ESB, f"--loader={loader}", "--minify-whitespace", "--minify-syntax", "--charset=utf8", "--log-level=error"] + (["--minify"] if loader == "css" else []),
                       input=code.encode("utf-8"), capture_output=True)
    if r.returncode: raise SystemExit("esbuild: " + r.stderr.decode()[:500])
    return r.stdout.decode("utf-8").rstrip("\n")
def minify(html):
    def css(m): return m.group(1) + esb(m.group(2), "css") + m.group(3)
    html = re.sub(r"(<style[^>]*>)([\s\S]*?)(</style>)", css, html)
    def js(m):
        attrs, body = m.group(1), m.group(2)
        if "type=" in attrs and "javascript" not in attrs: return m.group(0)     # text/plain (jsPDF guardado), JSON, etc.
        if "⟦STATE:BEGIN⟧" in body or not body.strip(): return m.group(0)
        out = esb(body, "js")
        assert "</script" not in out.lower(), "cierre de script dentro del código"
        return f"<script{attrs}>{out}</script>"
    return re.sub(r"<script([^>]*)>([\s\S]*?)</script>", js, html)
if __name__ == "__main__":
    s = open(sys.argv[1], encoding="utf-8").read(); o = minify(s)
    open(sys.argv[2], "w", encoding="utf-8").write(o); print(f"{len(s)//1024} KB → {len(o)//1024} KB")
