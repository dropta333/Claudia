# Inserta las capas v211 (avatar y asistente) y v212+ (Sala) en src/app.html desde src/capas/. Idempotente.
# Uso: python3 tools/capas.py   (luego python3 tools/build.py vNNN)
import json,re,os
S=os.path.join(os.path.dirname(__file__),'..','src','capas'); F=os.path.join(os.path.dirname(__file__),'..','src','app.html')
rd=lambda f: open(os.path.join(S,f),encoding='utf8').read()
app=open(F,encoding='utf8').read()
app=re.sub(r'\n  Object\.assign\(DICT, \{[^\n]*// v211 · Avatar pixel y asistente','',app)
app=re.sub(r'<!-- ═════ v211 · Avatar pixel.*?<script id="pxa-integ">.*?</script>\n','',app,flags=re.S)
app=re.sub(r'<!-- ═════ v21[2-9][^ ]* · .*?<script id="sala-js">.*?</script>\n(<script id="plegables-js">.*?</script>\n)?','',app,flags=re.S)
i=app.index('// v181 · Cómo lograr cada logro'); j=app.index('\n',i)
app=app[:j]+'\n  Object.assign(DICT, '+json.dumps(json.loads(rd('dict211.json')),ensure_ascii=False)+');   // v211 · Avatar pixel y asistente'+app[j:]
core=rd('pxa-core.js').replace('__DATA__',rd('av4.json'))
capa=('<!-- ═════ v211 · Avatar pixel personal (editor, Home, Team, iniciales) y asistente sin modelo (agente por reglas, @ y #, dictado) ═════ -->\n'
 '<style id="pxa-v211">'+rd('pxa.css')+rd('pxa-integ.css')+'</style>\n'
 '<script id="pxa-core">'+core+'</script>\n<script id="pxa-agent">'+rd('pxa-agent.js')+'</script>\n<script id="pxa-integ">'+rd('pxa-integ.js')+'</script>\n')
capa+=('<!-- ═════ v212–v217 · Sala de juntas (entrar y salir con confirmación, presencia real, proyección en 16:9, tablero con vista previa), perfil y grupos plegables ═════ -->\n'
 '<style id="sala-v212">'+rd('sala.css')+rd('plegables.css')+'</style>\n<script id="sala-js">'+rd('sala.js')+'</script>\n<script id="plegables-js">'+rd('plegables.js')+'</script>\n')
k=app.rfind('</body>'); app=app[:k]+capa+app[k:]
open(F,'w',encoding='utf8').write(app); print('capas ok',len(app))
