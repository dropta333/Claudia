# Tráfico Post · Guía de migración (v219 · 13 oct 2026)

## Qué es
Plataforma de tráfico de postproducción de Publicis Production Bogotá. Una sola página (HTML+JS) + funciones de Netlify para guardar datos, presencia de la Sala, IA y llamadas.
Repositorio: github.com/dropta333/Claudia (rama de trabajo: claude/friendly-johnson-4bo3zq). Historial detallado: HANDOFF.md y HANDOFF-COMPLETO.md.

## Estructura
- src/app.html ........ núcleo de la plataforma (todas las pestañas). Marcadores /*@state*/ y <!--@pdf--> los usa el build.
- src/capas/ .......... capas modernas (se insertan en app.html):
  - pxa-core.js / pxa.css / av4.json ... avatar pixel (render, editor, efectos, cadenas), burbuja del asistente
  - pxa-agent.js ...... asistente por reglas (ayudas por rol, consultas, acciones con confirmación); IA opcional
  - pxa-integ.js/.css . integración (tarjeta Home, frases, pantalla de carga, cabezas en vez de siglas)
  - sala.js / sala.css  Sala de juntas (presencia, proyección 16:9, café, reacciones, Daily, entrada con puertas)
  - plegables.js/.css . grupos plegables Dashboard/Tráfico, encabezado de persona en celular
  - dict211.json ...... traducciones EN
- src/vendor-*.js ..... jsPDF, fuentes, daily-js 0.92.2 (BSD-2)
- data/state.js ....... datos de ejemplo (solo para la vista previa)
- netlify-site/ ....... netlify.toml, package.json, LEEME.md y netlify/functions/:
  state.mjs (datos, Netlify Blobs) · files.mjs · migrate.mjs · sala.mjs (presencia) · ai.mjs (IA opcional) · daily.mjs (llamadas)
- tools/ .............. build y pruebas (Playwright)

## Construir
    python3 tools/capas.py          # inserta src/capas/* en src/app.html (idempotente)
    python3 tools/build.py v220     # genera dist/
Salidas: dist/preview.html (vista previa con datos), dist/trafico-netlify-v220-completo.zip (lo que se sube).
Opcional: minificar con esbuild (npm i --prefix /tmp/esb esbuild@0.24.0).

## Desplegar en Netlify (como hasta ahora)
Subir el ZIP completo (public/ + netlify/functions + netlify.toml + package.json). Usa Netlify Blobs (incluido).
Variables de entorno (Site configuration → Environment variables):
- DAILY_API_KEY, DAILY_ROOM_URL=https://trafficpostproduction.daily.co/salapxp → llamadas de la Sala
- (opcional IA) AI_PROVIDER=azure + AZURE_OPENAI_ENDPOINT/KEY/DEPLOYMENT, o AI_PROVIDER=compatible + AI_BASE_URL/AI_API_KEY/AI_MODEL
Tras cambiar variables, volver a desplegar. Comprobar: /api/daily → {"enabled":true,...}
Recomendado: sala de Daily en "Private" y regenerar la clave de Daily (se pegó en un chat).

## Otro servidor (no Netlify)
- public/index.html, pdf.js, daily.js son estáticos: sirven en cualquier hosting.
- Las funciones son "Request → Response" estándar (export default async (req) => Response) con config.path /api/*.
  Para Vercel/Cloudflare/Node hay que: (1) exponer las mismas rutas /api/state, /api/files, /api/migrate, /api/sala, /api/ai, /api/daily;
  (2) reemplazar getStore() de @netlify/blobs (state, files, sala) por un almacén clave-valor (Vercel KV/Blob, Cloudflare KV/R2, Redis o un JSON en disco).
- El front detecta el backend con window.PXP_BACKEND="netlify" (lo inyecta build.py); mantener esa línea o adaptar.
- Antes de migrar: en la plataforma, "Descargar copia" (pie de página) para respaldar los datos; luego "Restaurar copia" en el nuevo servidor.

## Pruebas (requieren Playwright + Chromium)
    node tools/test-v217.mjs                       # la más completa (Sala, asistente, plegables, celular)
    python3 tools/netlify-e2e-prep.py && node tools/sala-e2e.mjs /tmp/nfmock
    node tools/daily-e2e.mjs /tmp/nfmock ; node tools/guardado-e2e.mjs /tmp/nfmock
Nota: guardado-e2e a veces falla en "estar en la Sala no genera guardados" por tiempos de la prueba (otros clientes aún guardando).

## Pendientes conocidos
- Validación de roles en el servidor (hoy los permisos son del lado del navegador).
- IA: conectar el modelo aprobado por TI (las 12 herramientas ya están en PXA_AGENT.tools()).
- Probar llamadas Daily con personas reales (solo probado con Daily simulado).
- Preferencia del dueño: nunca entrar a controles de administrador ni cambiar configuraciones por él.
