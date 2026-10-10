# Traspaso — Tráfico Post · Publicis postproducción · Colombian Hub

Versión: **v153** · 8 oct 2026 · Responsable: Bastián Torres

## Cómo está armado ahora
- **Una sola fuente:** `src/app.html`, con todo el CSS y las capas JS.
  - Marcadores: `/*@state*/` para los datos y `<!--@pdf-->` para jsPDF y las fuentes.
- **Vendors:** `src/vendor-jspdf.js` y `src/vendor-fonts.js`.
- **Datos de prueba:** `data/state.js`. Son solo para la vista previa.
- **Build:** `python3 tools/build.py`. Genera:
  - `dist/preview.html`: vista previa con datos. **Es también la copia de seguridad completa del proyecto.**
  - `dist/trafico-netlify-public.zip`: carpeta `public/` (`index.html` sin datos y `pdf.js`).
- **Recuperación:** si se pierde el entorno, basta con el último `tablero-preview-vNNN.html`. Se separa en fuente, datos y vendors cortando por `// ⟦STATE:BEGIN⟧ … ⟦STATE:END⟧` y por `<script type="text/plain" id="pxp-jspdf">`.
- **Herramientas:**
  - `tools/split.py preview.html`: reconstruye `src/`, `data/` y vendors desde un preview (ida y vuelta idéntica byte a byte).
  - `tools/build.py [vNNN]`: genera `dist/` (con versión, también `tablero-preview-vNNN.html` y `trafico-netlify-vNNN-completo.zip`).
  - `node tools/smoke.mjs [dist/preview.html] [carpeta-capturas]`: recorre todas las vistas como admin y como creativo, en escritorio y celular; cierra la celebración de logros antes de capturar.
  - `tools/shots.py` + `tools/diff.py`: capturas de antes y después para comparar.
  - `tools/cssdead.py`: quita el CSS de clases que ya no existen.
- **Funciones de Netlify:** `netlify-site/` (`state.mjs`, `files.mjs`, `netlify.toml`, `package.json`). El build las mete en `dist/trafico-netlify.zip` junto con `public/`.
- **Guardado por clave (v153):** el cliente envía `keys: { PROJECTS: {clave: valor|null}, META: {…} }` cuando el servidor responde `ops: 1`. Si el servidor es antiguo, cae solo al envío por partes.

## Capas nuevas desde la v144
- **v145:** guardado seguro.
  - Mezcla a tres vías ante el error 409.
  - Borrador local en IndexedDB.
  - Guardado automático de la ventana de proyecto.
  - Indicador de estado del guardado.
- **v146–v147:** etapas por horas.
  - Jornada de 8:30 a 17:30, con almuerzo de 12:30 a 13:30.
  - Aviso de cruces de horario.
  - Autoasignación de etapas (propuesta que Administración confirma).
  - Carga calculada por etapas (40 h ponderadas = 100 %).
  - Salud del proyecto medida contra la **Entrega final**.
- **v148–v149:**
  - Cronograma unificado con vistas Día, Semana y Mes y la línea de "ahora".
  - Calendario de cuadros.
  - Pieza Hero y derivadas.
- **v150:** reportes internos.
  - Cargas del equipo en A4.
  - Time table en A4 horizontal.
- **v151:**
  - Integrantes de audio medidos por sus proyectos.
  - Horas extra en fines de semana y festivos, que suman para compensatorio.
  - Lupa en la vista previa de reportes.
  - Fotos de perfil en los reportes.
  - Selector flotante con buscador.
- **v152:**
  - Entrega final en la barra de resumen, con color que transiciona: verde con tiempo, rojo a 2 días hábiles o menos, violeta el día de la entrega y gris si ya pasó.
  - Convención del time table: "Revisión del cliente / ajustes".
  - Tipografía más grande en toda la plataforma.
- **v153:** verificación y limpieza.
  - Se quitaron el cronograma, el Gantt y el calendario antiguos, y el código que nunca se ejecutaba.
  - Se quitaron 175 reglas CSS sin uso.
  - Mantenimiento de datos al cargar (capa 47): normaliza campos viejos y, en Netlify, sube a `/api/files` las imágenes que quedaron incrustadas en los datos.
  - Se corrigió el desborde horizontal de la ventana de proyecto en celular.

## No cambiar sin consultar
- El ZIP de Netlify va sin datos, y no se guarda nada antes de cargar los datos del servidor.
- El guardado va en fila y por partes, con mezcla ante el 409.
- El tema del dispositivo manda.
- Los 6 estados de etapa.
- La ficha a la izquierda y los desplegables a la derecha en la ventana de proyecto.
- Los externos no cuentan en la capacidad.
- La entrega final **nunca** se rellena sola: la define Administración y puede ser estimada.

## Pendiente / ideas
- **Seguridad:**
  - validar los roles en el servidor;
  - sacar las contraseñas del código;
  - proteger `/api/files`.
