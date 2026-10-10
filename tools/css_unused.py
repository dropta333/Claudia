# Busca reglas CSS cuyos selectores no aparecen en ningún lugar del HTML/JS (candidatas a borrar)
import re, sys, json
src = open(sys.argv[1], encoding='utf-8').read()
a = src.index('<style'); a = src.index('>', a) + 1; b = src.index('</style>', a)
css, rest = src[a:b], src[:a] + src[b:]

def rules(text, base=0):
    """Devuelve (inicio, fin, selector, es_bloque_at) de cada regla de primer nivel."""
    out, i, n = [], 0, len(text)
    while i < n:
        if text.startswith('/*', i):
            j = text.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if text[i].isspace(): i += 1; continue
        j = i; depth = 0; sel_end = None
        while j < n:
            if text.startswith('/*', j): k = text.find('*/', j + 2); j = n if k < 0 else k + 2; continue
            c = text[j]
            if c == '"' or c == "'":
                k = j + 1
                while k < n and text[k] != c: k += 2 if text[k] == '\\' else 1
                j = k + 1; continue
            if c == '{':
                if depth == 0: sel_end = j
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0: j += 1; break
            elif c == ';' and depth == 0: j += 1; break
            j += 1
        out.append((base + i, base + j, text[i:sel_end].strip() if sel_end else text[i:j].strip(), sel_end))
        i = j
    return out

def used_token(t):
    if re.search(r'(?<![\w-])' + re.escape(t) + r'(?![\w-])', rest): return True
    for k in range(len(t)):            # prefijos dinámicos: "fr-${v}", 'st-' + x
        if t[k] in '-_' and k > 0:
            p = t[:k + 1]
            if re.search(re.escape(p) + r'(\$\{|["\']\s*\+|`\s*\+)', rest): return True
    return False

cand = []
def walk(text, base):
    for s, e, sel, se in rules(text, base):
        if sel.startswith('@'):
            if re.match(r'@(media|supports|container)', sel):
                inner_a = se - base + 1 if False else None
                body_start = text.index('{', s - base) + 1; body_end = e - base - 1
                walk(text[body_start:body_end], base + body_start)
            continue
        if se is None: continue
        sels = [x.strip() for x in sel.split(',')]
        def sel_used(x):
            toks = re.findall(r'[.#]([A-Za-z_][\w-]*)', re.sub(r'\[[^\]]*\]|::?[\w-]+(\([^)]*\))?', lambda m: m.group(0) if m.group(0).startswith(':not') or m.group(0).startswith(':is') or m.group(0).startswith(':where') or m.group(0).startswith(':has') else '', x))
            toks = [t for t in toks if not re.fullmatch(r'[0-9a-fA-F]{3,8}', t)]
            if not toks: return True
            return all(used_token(t) for t in toks)
        if not any(sel_used(x) for x in sels):
            cand.append((s, e, sel))
walk(css, 0)
tot = sum(e - s for s, e, _ in cand)
print(len(cand), 'reglas candidatas,', tot, 'bytes de', len(css))
json.dump([[s, e, sel] for s, e, sel in cand], open(sys.argv[2], 'w'), ensure_ascii=False)
for s, e, sel in cand[:40]: print('  ', sel[:110])
