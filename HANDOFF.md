# Traspaso — Tráfico Post · Publicis postproducción · Colombian Hub

Versión: **v219** · 12 oct 2026 · Resumen general en `HANDOFF-COMPLETO.md` · Responsable: Bastián Torres

## v216 · Sala sin compañeros de demostración, luz según la hora con transición suave, "hoy" en hora local y revisión de guardado
- **Sala:** se eliminaron por completo los compañeros de demostración (código, casilla y textos); solo aparece quien está de verdad. El chip de la hora solo informa (la sala sigue sola la hora real; `PXP_SALA.hora(h)` queda para pruebas).
- **Transición suave:** la paleta se recalcula cada minuto y el fondo nuevo se funde con el anterior en 1,6 s. La oscuridad de la noche (`dark`, de 18:54 a 20:18 y de 05:12 a 06:42), los rayos de sol de la mañana y de la tarde dorada (`sunAm`, `sunPm`) y la lámpara de la mesa (se enciende y apaga en ~0,7 s) son rampas continuas, no interruptores.
- **Error corregido en toda la plataforma:** 13 lugares calculaban "hoy" con la fecha UTC (`new Date().toISOString().slice(0, 10)`). En Bogotá, después de las 7 p. m., eso ya era el día siguiente: fecha por defecto al registrar horas, cierre automático de proyectos, entregas "de hoy", licencias vencidas, nombre de las copias de seguridad. Ahora usan la fecha local.
- **Guardado:** nueva prueba `tools/guardado-e2e.mjs` contra las funciones reales: dos personas guardan su avatar a la vez, una fija su estado, se crean tareas y una etapa con el asistente mientras otra persona se crea una tarea, y una tercera abre el tablero y encuentra todo. Estar en la Sala no genera guardados del tablero.
- Todas las pruebas `tools/test-*.mjs` pasan, más netlify/guardado/sala/ai/extractor/migrate e2e y el recorrido completo de vistas.

## v215 · Home en laptops estrechos, tablero de notas como accesos, más cosas para proyectar (vistas completas, con desplazamiento), entrada limpia y rendimiento
- **Home 1181–1440 px:** la identidad cede espacio (`minmax(220px,310px)`) y las cifras de la derecha nunca bajan de 158 px; logros a 44 px por debajo de 1280.
- **Tablero de notas de la Sala:** cada nota lleva a una sección (Proyectos, Clientes, Team, Licencias, Tráfico, Capacidad, Reportes, Mis horas, Horas, Repositorio, Logros, Dashboard), solo las que la persona ve en su menú, hasta 8. Muestran conteos (proyectos activos, clientes activos, personas). Clientes abre el mapa (con "Ir a Clientes").
- **Proyectar:** nueva pestaña **Vistas** (cualquier pestaña de la plataforma). La vista se dibuja un instante sin pintarse y se vuelve a la Sala en el mismo paso. Las copias (`snap`) pasan los lienzos como imagen y cambian los ids por clases `slid-<id>` con sus estilos (`scopeIds`), así no se repiten ids en la página.
- **Desplazamiento:** la vista previa se puede bajar; al proyectar, el TV queda en el mismo punto (`ref#y=N`). En el TV en grande, quien proyecta puede bajar y el TV de todos lo sigue. Los clics dentro de las copias no abren nada.
- **Entrada limpia:** la pantalla de carga se queda hasta que hay datos, fuentes y el tablero dejó de moverse, también en la primera visita (pantalla de ingreso) y al iniciar sesión. Las animaciones de entrada escalonadas se desactivan siempre al entrar (`no-anim` desde el primer instante), así todo aparece de una vez.
- **Rendimiento:**
  - El barrido de la tarjeta del Home animaba `top` (≈25 recálculos de diseño por segundo); ahora usa `transform`.
  - Las animaciones decorativas de la tarjeta quedan aisladas con `contain` y se pausan cuando la tarjeta no está en pantalla.
  - El avatar del Home solo pide cuadros mientras camina (antes, 60 por segundo siempre) y tiene un solo oyente de `resize`.
  - Los avatares de Team no se redibujan cuando están ocultos (se redibujan al volver a verse). Medido con la vista Team abierta y quieta: de 1,1 s a 0,35 s de trabajo cada 10 s.
- Prueba: `node tools/test-v215.mjs` (44, incluye Home a 1181/1200/1280/1366 px).

## v214 · Sala: proyectar ventanas reales en 16:9 (proyecto, cliente, persona y gráficas) con un selector visual; sofás compactos
- **Proyectar** abre un selector con pestañas Proyectos · Clientes · Personas · Gráficas, buscador, fichas visuales (color del proyecto y estado, avatar del cliente o la persona) y vista previa 16:9. Clic = vista previa; doble clic o Enter = proyectar; flechas para moverse. "Apagar el TV" cuando hay algo proyectado.
- Lo proyectado es la **ventana real** de la plataforma: `capture(ref)` la abre sin mostrarla (clase `sl-cap` en `<html>`), copia su `.pm-box` y la cierra. Los estilos que dependen de un id (`#pxp-proj`, `#pxp-client`, `#pxp-person`, `#dash-wrap`) y de `.pxp-modal` se copian una vez a clases (`scopeCss`). Se muestra en un cuadro de 1280×720 escalado con `zoom` al tamaño del TV; en grande se puede bajar para ver toda la ventana. "Abrir en la plataforma" abre la ventana de verdad.
- Gráficas: "Disponibilidad del equipo" (`#dash-wrap .lb-panel`) y "Carga por persona" (panel del Dashboard).
- Referencias: `"proj:CLAVE" | "cli:Nombre" | "per:Nombre" | "chart:disp" | "chart:carga"`; viajan igual por `/api/sala` y por el adaptador (una clave sin prefijo se lee como proyecto).
- **Sofás** más pequeños (22×48 px), con brazos redondeados, costura, cojín lima y patas; siguen con 2 puestos cada uno.
- Prueba: `node tools/test-v214.mjs` (34).

## v213 · Sala: personas reales, fichas de Proyectos y Clientes, terraza con ciudad, sofás y conversación más alta
- **Presencia real** (`netlify/functions/sala.mjs`, `/api/sala`): cada persona guarda su propia ficha `p/<id>` en Blobs (`trafico-sala`): posición, silla, micrófono, cámara, últimos mensajes (15 min) y proyección. GET/POST devuelven a los demás vivos (latido en los últimos 20 s); los viejos se borran solos. En el tablero, `NET` (sala-js) late cada 2,5 s con gente / 6 s sola, solo con la pestaña Sala visible; al cerrar se despide con `keepalive`. Sin servidor (vista previa) sigue el canal entre pestañas.
- **Demostración:** solo para Bastián (`isDev`), apagada por defecto (`pxp_sala_demo` = "1" para encenderla). Los demás no ven la casilla.
- **Proyectar** muestra la ficha real de Proyectos (`window.pxpCardHtml`), escalada para caber entera en el TV 16:9; clic en el TV la abre en grande y clic en la ficha abre el proyecto.
- **Mapa** abre las fichas reales de Clientes (`window.pxpClientTreeHtml`, expuesta en esta versión). Sus estilos viven bajo `#view-clientes`; `cssClientes()` los copia una vez con el alcance `.sl-cv`. El cliente elegido en el corcho queda resaltado.
- **Escena:** la ventana es una terraza con baranda, matera y ciudad al fondo (luces encendidas de noche); sofás a los costados (2 puestos cada uno); 2 sillas por cabecera. 16 puestos en total.
- **Conversación:** el panel derecho mide lo mismo que la sala y el registro crece hacia abajo (80 mensajes).
- Pruebas: `node tools/test-v213.mjs` (28) y `python3 tools/netlify-e2e-prep.py && node tools/sala-e2e.mjs /tmp/nfmock` (9: dos personas se ven, mensaje, silla, proyección y salida). `tools/ai-e2e.mjs` usa la fecha local.

## v212 · Sala de juntas (prototipo), IA lista para conectar y perfil con foto más grande
- **Sala** (`view-sala`, pestaña después de Team; capa `<style id="sala-v212">` + `<script id="sala-js">`): sala pixel en picado de 320×200 px lógicos.
  - Mesa grande al centro con 10 puestos (4 atrás de frente, 4 adelante de espaldas, 2 en los extremos). Clic en el piso para caminar (rodea la mesa), clic en una silla para sentarse; también con las flechas o WASD.
  - El chat sale como burbuja sobre el avatar y queda en "Conversación". "Proyectar" muestra un proyecto en el TV (16:9 exacto); clic en el TV lo abre en grande.
  - Corcho de la derecha = mapa: una nota por cliente (los 5 con más proyectos activos), un pin por proyecto e hilos al centro. Al pasar muestra cliente, proyectos y personas; al hacer clic abre todos los clientes con sus proyectos y su equipo.
  - Paleta según la hora con transición suave: mañana cálida, mediodía neutro, tarde dorada, atardecer, noche fría. De noche se apagan las luces y se prende la de la mesa si hay gente sentada. El chip de la hora permite ver la sala a otras horas (vista previa).
  - Cámara (reemplaza la cara del avatar), micrófono (indicador de voz) y pantalla (en el TV) funcionan solo en el equipo de cada quien.
  - Transporte: mensajes `{t:"hi"|"state"|"mv"|"say"|"st"|"proj"|"bye"}`. Hoy viajan entre pestañas (BroadcastChannel) y hay compañeros de demostración (se apagan con la casilla). Para el servicio de llamadas: `PXP_SALA.setProvider({ connect({me,onMessage}), send(msg), setMic(on,stream), setCam(on,stream), setScreen(on,stream), leave() })`; también `PXP_SALA.state()`, `PXP_SALA.say(t)`, `PXP_SALA.hora(h|null)`.
- **IA lista** (`netlify/functions/ai.mjs`, ruta `/api/ai`): apagada sin variables. Azure OpenAI o API compatible con OpenAI (variables en LEEME). El navegador nunca ve la clave. `PXA_AGENT.tools()` entrega 12 herramientas; cada una se traduce a una frase que el intérprete ya entiende, así permisos, confirmaciones y Deshacer son los mismos. Las reglas responden primero; solo lo que no entienden va al modelo.
- **Asistente:** la caja de "Pídeme algo" ya no usa `<form>` (en visores incrustados el envío estaba bloqueado). Muestra "…" mientras piensa. Sabe ir a la Sala.
- **Perfil:** foto de 112 px (132 px en triángulos, con el triángulo más lleno) y botones de cambiar/quitar foto debajo, sin taparla.
- Pruebas: `node tools/test-v212.mjs` (26 comprobaciones, con cámara y micrófono simulados) y `python3 tools/netlify-e2e-prep.py && node tools/ai-e2e.mjs /tmp/nfmock` (11: apagada sin variables, 403 desde otro sitio, la clave solo en el servidor, herramienta → misma tarjeta de confirmación).

## v211 · Avatar pixel personal y asistente sin modelo
- **Avatar 32×32 en picado** que cada persona crea y edita (Administración no puede cambiarlo). Se guarda en `persona.avatar` (`{v:1, hair, hc, eyes, fh, skin, fit, oc, dc, gl, fc, lc, acc, ac, ears, sh, pin, pc}`; `dc`/`pc` nulos = color del grupo).
  - Editor en 4 pestañas (Cara, Pelo, Ropa, Accesorios), cintas de color, pin del grupo editable (forma, color, "Sin pin"), borrador en `localStorage` (`pxa-draft:<nombre>`) y aviso de cambios sin guardar.
  - Se ve en la tarjeta del Home (camina en laptop, frases y recordatorios cada 30–45 s, brillo del color del grupo), en la ventana de la persona, en las fichas de Team (animación desincronizada, 72 px) y en lugar de las iniciales cuando no hay foto.
  - Estado en una sola píldora: Automático según la carga o fijado a mano (`semaforo` / `semaforoFijo`).
  - La pantalla de carga se mantiene hasta que el tablero queda armado (máximo 3 s, aunque no carguen las fuentes).
- **Asistente sin modelo** (`window.PXA_AGENT`, capa `<script id="pxa-agent">`): entiende pedidos en español con los datos del tablero. Buscar y resumir proyectos y personas, mis pendientes, quién está libre, navegar, registrar horas (con el formulario oficial), crear tareas y etapas, cambiar estado de etapa o de proyecto, abrir proyecto nuevo y reportes.
  - Toda escritura pide confirmación, respeta los permisos de siempre (`pxpPuedeEditar`, `pxpPuedeRegistrar`) y deja **Deshacer**. Los cambios quedan en el historial con "· con el asistente".
  - `@` sugiere personas y `#` proyectos; micrófono con dictado del navegador (es-CO), sin servicios externos.
  - Cuando llegue la IA aprobada, este catálogo de acciones se le entrega como herramientas.
- Código: capa al final de `src/app.html` (`<style id="pxa-v211">`, `pxa-core`, `pxa-agent`, `pxa-integ`); traducciones al inglés en CAPA 31 (`// v211`).
- Prueba: `node tools/test-v211.mjs` (21 comprobaciones: Home, editor, asistente, @, confirmación, deshacer, permisos, Team y celular).

## v210 · Home personal vuelve exactamente al mosaico de la v207 a 3 columnas: sin "Mis gráficas" (código y CSS de v208–v209 eliminados)

## v209 · Team: foto alineada con nombre (23 px) y cargo, skills a todo el ancho; HANDOFF-COMPLETO.md

## v208 · Tráfico: decorar + acomodar sincrónico al repintar, vigilante del #main-grid y limpieza del mosaico sin fichas

## v207 · Cabecera del perfil en celular: foto arriba, centrada y más grande (108 px); nombre, cargo (caja angosta con el lápiz al lado) y estado centrados

## v206 · Cabecera del perfil: cargo destacado con color del grupo + lápiz, cambiar/quitar foto como íconos sobre la foto, estado en píldora; leyenda de la red en una línea (Forma · tipo / Punto · estado + ?); Tipo de integrante solo para Administración

## v205 · Team sin "esta semana" en las fichas y botones Nuevo miembro · Nuevo grupo · Cerrar/Abrir todos (de derecha a izquierda); Capacidad y Horas: las fotos conservan la forma del grupo al esconder/mostrar (nameOf sin las iniciales del avatar); grp-bar con wrap

## v204 · Team: grupos plegables con flecha + Abrir/Cerrar todos (pxp_team_cerr), sin horas registradas en las fichas; Capacidad: encabezados de grupo en barra (avatares, personas, horas en cola, sin cupo/al límite); Disponibilidad: máximo 4 filas por columna con "Ver N más"

## v203 · Tráfico: se elimina "Carga por rol" (diseño antiguo) de raíz: renderRoleSummary y roleSummary borrados; el plegable queda como "Rodajes" y se limpia cualquier tarjeta vieja que se cuele

## v201–v202 · Ficha del proyecto sin Inicio/Entrega repetidos; ventana de Rodajes con estilo naranja por semana (pxpRodajesVentana); nombres con mayúscula inicial (pxpNombreBonito) y foto centrada con nombre y cargo en las fichas de persona

## v200 · Clientes: "Proyectos activos / Todo el año" y Semana en una barra encima de las gráficas (.cli-gbar); "Nuevo cliente" dentro de la caja de clientes y sin la fila superior; sin el texto explicativo del árbol

## v199 · Clientes: "Trabajo por cliente" y "Tipo de proyecto" lado a lado; selector Semanas/Meses/Año compartido (window.__cliPer) en las dos gráficas y en "Ver tablas de datos" (pxpCliGrupos, pxpCliTablasPer, periodoCli)

## v197–v198 · Clientes: árbol primero, semana solo en Activos (desplegable), Reparto/Tipos en 2 columnas y más bajos; Logros: cabecera compacta, conteo por nivel grande, últimos al lado del progreso; Home personal: estado en 2 columnas; Dashboard: Disponibilidad muestra a todos los "cargado" (antes solo 1–2 proyectos) y sin leyenda

## v196 · Proyectos: Plegar/Desplegar todos ya no falla tras visitar Horas/Capacidad/Repositorio (pvAll limitado a #proj-wrap); "Filtrar por" en la barra principal, etiquetas y Ordenar por en la fila de estados; Capacidad en fichas respeta Por cargo/Sin agrupar y la búsqueda (pxpGrpSt), botones fijos; Reportes en mosaico (rp-mos)

## v195 · Control de plegar/desplegar unificado (.fold con íconos) en Proyectos, Horas, Capacidad, Repositorio, Reportes y Clientes; Capacidad en fichas: grupos plegables (pxp_cap_cerr) y Esconder/Mostrar todos funcionan; filtros de Proyectos dentro de la barra

## v194 · Red de proyectos del cliente vuelve a todo el ancho (choque de clase .rc → .rcx); Proyectos sin agrupar por defecto (clave pxp_pv_v4) y Agrupar/Filtrar/Ordenar con desplegables diseñados (optgroup, buscador); logros de grupo y equipo en una fila

## v193 · Licencias: barra integrada (buscar + acciones / estados + filtros + ordenar) con desplegables diseñados (data-dd, hoja en celular); Clientes: botones Abrir/Cerrar todos y Ver todos

## v192 · Clientes vuelven al diseño de 3 columnas (logo grande, marcas) con desplegable; Proyectos en vista personal ya no muestra todo al plegar/filtrar; Tráfico: el mosaico dejaba de reacomodarse sin fin

## v191 · Capacidad en mosaico (grupos se acomodan sin huecos, fichas con 3 proyectos y "+N más"); vista personal: caja de entregas corta (5 próximas + 2 vencidas)

## v190 · Clientes: "Mars" y "MARS" se unen en las gráficas; Reparto por cliente con donut grande + ranking + "Otros"; Tipos de proyecto en lista con barras; desplegable por cliente (Activos por defecto)

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

- **v154:** ventana de proyecto más ordenada.
  - Secciones plegables con resumen (capa 48): Avance por etapas, Revisiones y enlaces, Ruta en el share y Taxonomía sugerida. Cada persona recuerda cuáles dejó abiertas.
  - Etapas agrupadas por fase en desplegables: **Preproducción · Rodaje · Postproducción** (`e.fase`, se deduce del nombre si no se elige).
  - Tipo de etapa **Proceso · Revisión · Entrega** (`e.clase`, se deduce del nombre). El time table usa el mismo tipo.
  - Horario de la etapa (`e.franja`: `am` 8:30 · `pm` 13:30 · `hora` con `e.hIni`) y "Se extiende" (`e.extiende`, `e.hasta`).
  - Varios responsables: `e.resps` (lista) y `e.resp` = el primero, por compatibilidad. Helpers globales `pxpResps`, `pxpEsResp`, `pxpSetResps`. La carga reparte las horas entre ellos.
  - "Etapas sugeridas según el equipo": arma etapas por cargo del proyecto (editor, color, compo, 3D, IA, master, casa de audio, Dirección de Post, PM o Producción Ejecutiva) con responsables, tipo, fase y horas.
  - Pruebas: `node tools/test-v154.mjs [carpeta-capturas]` y `node tools/shotproj.mjs salida.png [proyecto] [ancho] [usuario] [js] [selector]`.

- **v155:** etapas más claras y cronograma completo.
  - Filas más bajas. Revisión y Entrega usan una fila compacta (`.et-row.mini`) teñida con el color de su tipo.
  - Valores por tipo: duración sugerida proceso 8 h · revisión 4 h · entrega 1 h (al cambiar el tipo, solo si tenía la sugerida); exigencia liviana por defecto en revisión y entrega (`pxpTipoEtapa`).
  - Horario y Exigencia se eligen en selectores flotantes con el lenguaje del calendario (`pxpEtPick`). "Se extiende" va dentro del selector de horario.
  - Revisión en curso o vencida: botón "¿Bloquea lo que sigue?" que crea un bloqueador de feedback (`bloqueos[].etapa`).
  - Etapas sugeridas por fase en un clic (Preproducción · Rodaje · Postproducción), combinación al azar según los cargos del equipo, con Deshacer.
  - Cronograma: en el proyecto se ven todas las etapas por fecha de inicio (flechas con fecha si caen fuera del periodo), altura máxima con desplazamiento desde 9 filas, vista **Año** (en persona, una fila por proyecto), mañana/tarde en Mes y Año, y línea de **Inicio del proyecto**.
  - Fecha de inicio del proyecto (`fechaInicio`, `inicioEst`) junto a la entrega final, primera en la barra de resumen con color turquesa y días hábiles de ejecución.
  - Pruebas: `node tools/test-etapas.mjs [carpeta-capturas]`.

- **v156:** sugerencias y cronograma más sensatos.
  - Etapas sugeridas: **una por integrante** por fase (al azar entre las de su cargo). Empiezan hoy (o en el inicio del proyecto si es futuro) y, si hay entrega final, las horas se reducen para caber antes de ella; avisa si igual se pasan.
  - Cronograma con **hoy siempre al centro** (pasado a la izquierda, futuro a la derecha). Vistas: **Todo** (por defecto, se ajusta a las fechas de las etapas), Día, Semana (±2 días hábiles), Mes (±10) y Año (±130). La escala cambia sola (días, semanas o meses) y nunca hay desplazamiento horizontal. Preferencia guardada en `pxp_crono2_*`.
  - Ventana de proyecto más ancha: hasta 1320 px.

- **v157:** estado automático y cronograma de inicio a entrega.
  - Nuevo estado **En preproducción** (`preproduccion`) en todas las listas, filtros, colores, reportes y carga por proyectos.
  - Estado automático (`pxpEstadoCalc`, `pxpEstadoAuto`): con la etapa actual (la marcada por el equipo; si no, la de hoy en el cronograma; si no, la próxima) → En preproducción, En rodaje, En postproducción o En revisión; **Entregado** cuando la última etapa de tipo Entrega queda en Listo. Cotizado, Standby y Aprobado son siempre a mano (`PXP_EST_MANUAL`). Cuando el proyecto queda Entregado aparece un aviso (`pxpAprobAviso`) para confirmar **Aprobado**; "Todavía no" lo oculta hasta el día siguiente.
  - Un cambio a mano distinto del calculado queda fijado (`estadoFijo`) hasta "Volver a automático". Cada cambio automático queda en la actividad.
  - Se recalcula en cada cambio de etapa y al abrir el proyecto (quien puede editar; en Netlify se guarda al momento, en la vista previa con el siguiente guardado).
  - Cronograma **Todo**: borde izquierdo = inicio del proyecto, derecho = entrega final (con su marca, "est." si es estimada), hoy al centro; cada mitad tiene su propia escala. Columna de etapas de 280 px y textos más grandes.
  - Pruebas: `node tools/test-estado.mjs [carpeta-capturas]`.

- **v158:** licencias agotadas y vencidas.
  - Agotada = usa créditos y está en 0 %. Se guarda `agotadaEn` al marcar 0 % (y se borra al recargar); para datos viejos se usa `creditosFecha`.
  - Salen de Activas a los 3 días (agotadas) y al día siguiente del vencimiento (vencidas). No se borran: quedan en Historial y en Todas.
  - Tablero de capacidad: columna **Agotadas / Vencidas** con las que aún no salen y cuántos días les quedan. "Por recargar" pasa a 1–24 %.
  - Pruebas: `node tools/test-licencias.mjs [carpeta-capturas]`.

- **v159:** ajustes de la ventana de proyecto.
  - "Inicio del proyecto" es el primer desplegable de las características.
  - "+ Agregar etapa" pregunta la fase (`pxpEtAdd`); cada grupo abierto tiene "+ Agregar etapa a …". La etapa se inserta al final de su fase.
  - Ficha de resumen: Tipo, Complejidad, Inicio, Entrega final, Duración (días hábiles) y Agencia en dos columnas que ocupan todo el alto; en modo consulta, los datos usan el espacio libre en dos columnas.
  - Cronograma: Todo / Día / Semana / Mes / Año siempre a la derecha; las barras nunca pasan del borde y el cuerpo no se desplaza a lo ancho.

- **v160:** reacciones en las notas (capa 49).
  - Seis reacciones de línea con color: Visto, De acuerdo, Aprobado, Atención, Me encanta y Gracias. Una por persona y nota (otra la reemplaza; la misma la quita). Todo el equipo puede reaccionar, también en modo consulta.
  - Datos: `nota.reac = { NOMBRE_NORMALIZADO: { r, n, ts } }`. Como es un objeto por persona, la mezcla a tres vías suma las reacciones simultáneas.
  - Selector flotante en forma de píldora (flechas y Esc); al pasar el mouse por una reacción (o mantener presionado en el celular) se ve quién reaccionó y cuándo.
  - Notificaciones: quien escribió la nota recibe las reacciones de los demás (últimos 30 días).
  - Pruebas: `node tools/test-reacciones.mjs [carpeta-capturas]`.

- **v161:** nuevo proyecto y etapas más legibles.
  - **Nuevo proyecto** (capa 50) abre la misma ventana del proyecto en modo creación: nombre, cliente y marca en la cabecera; características, equipo (mapa vacío con la lista para arrastrar o sumar) y etapas; Cancelar / Crear proyecto. Estado inicial Cotizado; obligatorios nombre y cliente.
  - El borrador vive en `PROJECTS["· NUEVO PROYECTO ·"]` como propiedad **no enumerable**: la ventana lo encuentra, pero listas, conteos, guardados (Netlify, vista previa, borrador local) y copias no lo ven. Al crear pasa a su clave real; al cancelar se borra (pregunta si ya tenía datos; tocar el fondo no lo cierra).
  - Se quitó el formulario viejo de nuevo proyecto (capas 9, 21, 34c y 34e). Quedan selectores CSS `#pxp-newproj` sin uso para una limpieza futura de CSS.
  - Etapas: nombre a 22 px (18 px en revisión y entrega); Duración y Horas en una sola casilla (`pxpEtHorasReg`: barra de registradas frente a planeadas, en rojo si se pasa; toca para registrar).
  - Fases: fondo en escala de grises (Preproducción el más claro, Postproducción el más profundo) con línea y marca del color de su estado.
  - Pruebas: `node tools/test-nuevo.mjs [carpeta-capturas]`.

- **v162:** horas reales en la etapa.
  - La casilla es para registrar lo trabajado: − N h + y "Registrar" (hoy, a nombre de quien inició sesión; `pxpHrQ`, `pxpHrQGo`). Responsables de la etapa y Administración. Debajo, la barra de reales contra estimadas, quién registró y el estimado. El detalle (otro día, nota, otra persona) sigue en el formulario de horas.
  - Estimado automático (`pxpEstAuto`): revisión 4 h, entrega 1 h y proceso según el nombre (offline 24, 3D 24, compo/IA/motion 16, color/online/audio/render/master 8, ingesta 4, kickoff/plan 2…). `e.hpAuto` = sigue en automático (se recalcula al cambiar nombre o tipo). Al cambiarlo a mano queda fijo; "Volver a automático". Las etapas que ya existían conservan sus horas.
  - Pruebas: `node tools/test-horas.mjs [carpeta-capturas]`.

- **v163:** la ficha completa vive en la ventana del proyecto.
  - Se quitó "Editar ficha completa". Lápiz junto al título (Administración): nombre, cliente y marca en la cabecera con Guardar/Cancelar (`pxpCabEditar`, `pxpCabGuardar`; reusa `pxpNuevoCab(k,p,tipo,editar)`). Renombrar mueve la clave y actualiza el tráfico semanal y las licencias; avisa si el nombre ya existe.
  - Color del proyecto: se toca la franja de color de la cabecera (`pxpColorProy`) → paleta, color libre o "Volver al automático". Escribe solo `colorHex`; el color del cliente no se toca desde aquí.
  - Eliminar proyecto en el pie (Administración), con doble toque de confirmación (`pxpProyEliminar`); borra también sus marcas del tráfico semanal.
  - Corrección: `p.color` es el colorista; versiones anteriores podían guardar ahí el color del cliente. El mantenimiento (capa 47) lo mueve a `colorHex`.
  - Al pasar a Entregado sin fecha de cierre, se pone hoy.
  - El editor viejo (`saveFicha`) queda en el código sin acceso, para limpieza futura.
  - Pruebas: `node tools/test-cabecera.mjs [carpeta-capturas]`.

- **v164:** etapas compactas, hitos, cabecera y piezas.
  - Proceso: casilla de horas en una línea (− N h + ✓ · barra · registradas / estimado); quién registró va en el tooltip. Horario en una línea (el ícono dice la franja).
  - Revisión y Entrega son hitos (`MINI_EST`): reciben equipo, cliente, agencia o externo (`"Cliente: X"`, `"Agencia: X"`, `"Externo: X"` en `resps`; no cuentan en la capacidad). Solo fecha y hora de entrega (fecha fija + `franja:"hora"`, acción `hEnt`) y, en revisión, cuánto tarda (`hp`). Estados Pendiente · Revisado/Entregado · Solicitud de ajustes · Aprobado, guardados como pendiente/revision/ajustes/listo (no cambian reportes ni estado automático). Las etapas de proceso conservan los 6 estados. `pxpEstEtapaL(e)` da la etiqueta.
  - Solicitud de ajustes (solo Revisión): imagen, documento o enlace en `e.adj` (`pxpAjAdd`, `pxpAjVer`, `pxpAjQuitar`; sube con `pxpAdjSubir`).
  - Cronograma del proyecto: filas con el gris y la marca de color de su grupo, y leyenda de grupos. Grises de los grupos más marcados (3 · 8 · 14 %).
  - Cabecera: imagen del proyecto como botón al lado de la flor (también al crear); "Editar" junto al cliente; el nombre editable usa la tipografía del título; lista propia de clientes y marcas (`pxpCombo`); paleta pequeña. **El color automático de un proyecto es el de su cliente** (`projectColor`).
  - La ficha resumen guarda su alto con los desplegables abiertos (`fijaFicha`, capa 50).
  - Piezas: menús propios de tipo, derivada "Variación", duraciones y formatos típicos al tocar la casilla, "+ Otra pieza" que no depende del Hero.
  - Pruebas: `node tools/test-v164.mjs [carpeta-capturas]`.

- **v165:** ajustes de etapas y piezas.
  - Hitos: nombre a 22 px como las de proceso; estados con la misma píldora de íconos (Pendiente · Revisado/Entregado · Solicitud de ajustes · Aprobado). "¿Bloquea lo que sigue?" vuelve a la fila superior como ícono.
  - "+ Agregar etapa" (`pxpEtAdd(btn, fase)`, `pxpEtAddSel`): tipo + fase con el lenguaje del menú de tipo; las sugerencias por fase viven solo aquí (`pxpEt('add',0,'fase|tipo')`). El menú de tipo ya no trae exigencia (sigue en su casilla). "+ Agregar etapa a …" del grupo abre el mismo menú con la fase puesta.
  - Cronograma: leyenda de grupos y de estados en una sola fila.
  - Piezas: "Reformato" pasa a "Adaptación de formato" (el mantenimiento convierte las guardadas) y se suma "Adaptación de región".
  - Bocetos del time table v2 en `bocetos/bocetos-v2.html`: cabecera oscura sobre hoja clara y dos vistas, Calendario (semanas, mañana/tarde, festivos) y Gantt.

- **v166:** time table en PDF nuevo (capa 45, `B.custom.tt`).
  - Cabecera oscura (título en Barlow Black, ficha con roles y entregables, fechas y avance) sobre hoja clara; logo de Publicis Production abajo a la derecha (`logoImg`).
  - Dos vistas: **Calendario** (semanas lunes–domingo, mañana/tarde, festivos rayados, mes marcado) y **Gantt** (filas por grupo, barras y hitos con hora, hoy y entrega final).
  - Cada mes con su tono de fondo (alterna blanco y gris, `MES_BG`) en las dos vistas.
  - Panel: vista, idioma (es/en), color por grupo o tipo, mañana y tarde o día completo, sábados y domingos, responsables. Vista previa con −/+, Ajustar, **100 %** (tamaño real) y arrastrar para moverse (sirve para todos los reportes).
  - Fuentes del PDF: se sumó `black` (Barlow Black, subconjunto latino, licencia OFL) en `src/vendor-fonts.js`.
  - "Equipo en la cabecera" (`s.roles`, `pxpTTRol`): desplegable con casillas, se elige rol por rol quién sale (por defecto productor(a) ejecutivo(a), director de post y PM); la ficha pasa a 3 columnas si hay más de 4. Los sábados y domingos tienen siempre el mismo gris; solo los días hábiles cambian de tono por mes. Festivos y domingos llevan rayas marcadas (`FEST_C`); los domingos sin la palabra. Un borde sutil (`MES_LN`) sigue el contorno de cada mes. En el calendario cada etapa lleva solo su nombre (9,5 pt); cada día se parte en mañana (arriba) y tarde (abajo) en mitades iguales y las etapas de cada mitad se reparten su espacio; la de todo el día ocupa la celda; en el Gantt, el nombre (9,5 pt) y la hora de los hitos.
  - Pruebas: `node tools/test-tt.mjs`.

- **v167:** Home, Dashboard, Tráfico y logros.
  - Home (solo Global, capa del mosaico): fijas Estado del equipo, Estado de los proyectos y Tipos de proyecto; el resto en el bloque plegable "Más gráficas" (`pxpHmMore`, se recuerda por persona en `pxp_hm_more_<usuario>`). La vista Personal no cambia.
  - Dashboard: sin la vista Fichas (siempre paneles); "Nuevo proyecto" va en la fila de "Disponibilidad del equipo".
  - Tráfico: fichas a 3 columnas (2 en pantallas medianas, 1 en móvil) con el lenguaje de las fichas del Dashboard.
  - Logros: tarjeta flotante al pasar el mouse (o tocar en celular) en la pestaña Logros, el Home y el perfil: qué mide, nivel actual con progreso, los 4 niveles con lo que falta y "Cómo lograrlo" (`COMO`).
  - Logros nuevos (capa 37): 6 generales (Viernes 5:29 pm, Fin de semana heroico, Madrugador, Cuatro manos, Emoji master, Desatascador oficial) y 3 por cargo (`c` = grupo; solo los ve y gana ese grupo). Métricas nuevas en `extras()`.
  - Pruebas: `node tools/test-v167.mjs`.

- **v168:** notas, hitos de inicio y entrega, cronograma y Tráfico.
  - Notas del proyecto: tarjeta con la foto adentro (42 px) junto al nombre, cargo y hora; la mía con el color del proyecto. Foto del cuadro para escribir también a 42 px.
  - Avance por etapas: fila delgada de **Inicio del proyecto** arriba (azul) y de **Entrega final** abajo (tinta), con fecha, "automático" si sale de las etapas, cuántos días faltan o pasaron, y se tocan para cambiarlas (`hitoFila`, usa `pxpInicioPick` / `pxpEntregaPick`).
  - Cronograma: Inicio, Hoy y Entrega con su fecha en una fila propia sobre la escala (`.cr-mk`), sin tapar las fechas; si quedan cerca se abren hacia lados distintos. La entrega final pasa a color tinta.
  - Tráfico: sin la columna de complejidad; la carga es un semáforo (`.semaf`) con su estado escrito; la ausencia ocupa más espacio.
  - Pruebas: `node tools/test-v168.mjs`.

- **v169:** Tráfico, notas, cronograma y logros del Home.
  - Ficha de Tráfico: nombre y cargo más grandes; a la derecha un **semáforo vertical** grande con su estado escrito; debajo del nombre, estados en íconos (`pxpEstadosIco`): Disponible (sí/parcial/no), Proyectos, Horas de etapas de la semana, Vencidas y Ausencia (el ícono tiene el selector y un botón de fechas). El bloque viejo de ausencia queda oculto.
  - Notas: foto de 60 px alineada con el nombre (18,5 px, con su @usuario) y el cargo; el comentario va debajo a todo el ancho.
  - Cronograma: Entrega final en violeta (#7B61FF, igual que su fila en las etapas); Hoy en negro (amarillo en tema oscuro).
  - Logros en la tarjeta de perfil del Home: tarjeta corta (nombre, nivel y progreso); la completa queda en la pestaña Logros.

- **v170:** traducciones al inglés de los textos nuevos (v163–v169) en el diccionario de la capa 31. Pendiente: notas explicativas largas y el catálogo de logros (nombres y descripciones) en inglés.

- **v171:** bloqueadores de revisiones y entregas se bloquean y desbloquean con un toque (pxpEt 'desbloquear' los marca resueltos). En "Todo" el cronograma deja 2 días hábiles de aire tras la entrega. Servidor: state y files rechazan escrituras desde otro origen (403). Más textos en inglés.

- **v172:** vista previa de reportes y time tables: el 100 % es el antiguo 125 % (factor 1.25 en .rp-page), "Ajustar" = 80 %, botón Centrar (pxpRpCentrar) y la hoja abre centrada; el botón de tamaño real se llama "Real".

- **v173:** reporte de proyecto con página 2 (opción "Ficha y cronograma", activa por defecto): ficha del proyecto, Gantt de etapas con inicio, hoy y entrega, equipo y las secciones que no cupieron en la página 1.

- **v174:** reporte de proyecto: resumen con "Inicio → entrega"; página 2 con equipo como red de nodos y reparto del espacio para que no queden huecos. Ficha de cliente: fusionar un cliente repetido con otro (pxpClMerge) o eliminar uno sin proyectos.

- **v175–v176:** reporte de proyecto rediseñado. Página 1: KPIs con Inicio (azul) y Entrega final (violeta) separados, ficha del proyecto, y a dos columnas Tiempo frente a avance, Etapas por estado y Días por fase (secTiempo, secEstados, secFases); las tarjetas se estiran (CARD_MIN) para no dejar huecos. Página 2: Gantt, equipo en red de nodos sobre fondo negro con la forma y el color de cada grupo, y detalle de etapas. Reporte de cliente: la tabla de proyectos empieza siempre en la página 2 y sigue en más páginas si hace falta. Ficha de cliente: "¿Repetido?" compacto abajo a la izquierda. Nuevo cliente con el look de nuevo proyecto (ncx-*). Selector de semana en Clientes con diseño. Estado del equipo: Ausentes y Freelance.

- **v177:** reporte de proyecto: el equipo vuelve a tarjeta blanca y pasa a la página 1 a una columna (secRed se adapta a media columna); Etapas por estado más compacta; página 2 con dos gráficas de barras, días por etapa y etapas por persona (secBarrasP2).

- **v178:** reporte de proyecto: "Actividad del proyecto" (secActividad, gráfica de puntos de notas, cambios, revisiones y bloqueos en el tiempo) reemplaza al detalle de etapas en la página 2 (el detalle queda solo si no hay historial); la ficha lista a todos los que participaron (equipo y responsables de etapas).

- **v179:** título de la página "Publicis Production · Traffic Platform", favicon SVG en línea (P lima con punto violeta sobre negro) y theme-color.

- **v180:** time table y reporte de proyecto en inglés traducen los nombres de las etapas (pxpEtapaEN, diccionario de términos de producción). pxpRepEN hace una copia solo para el PDF con el mismo plan (p.__plan), la misma clase, fase y peso: el proyecto guardado no cambia.

- **v181:** inglés completo de la interfaz: catálogo de logros (FAM_EN en la capa 37; f.n y f.d cambian con window.pxpLang), "Cómo lograrlo" de cada logro, notas de ayuda de Capacidad, Horas, Reportes, Repositorio y Logros, fechas con año, "hace N d" y avisos. Solo quedan en español los textos que escriben las personas (notas, nombres, logros especiales).

- **v182:** limpieza y optimización. Se borraron 92 reglas CSS sin uso (tools/css_unused.py las detecta; tools/shots.mjs + tools/shots_diff.py comparan capturas de las 12 pestañas y 5 ventanas en claro y oscuro: sin cambios visibles). El index de Netlify sale minificado con esbuild (tools/minify.py, desde build.py): 1,9 MB → 1,65 MB; el bloque de datos con las marcas ⟦STATE⟧ no se toca. Prueba de punta a punta del modo Netlify: python3 tools/netlify-e2e-prep.py && node tools/netlify-e2e.mjs /tmp/nfmock (servidor local con las funciones reales y Blobs simulado: carga, guardado simultáneo de dos personas, 403 desde otro sitio, reporte PDF, permiso de reportes). Se dejó el editor viejo de fichas (saveFicha): está entrelazado con otras capas y quitarlo ahorra menos del 1 %.

- **v183:** perfil de persona: balancearPerfil arma arriba Sus proyectos (izq.) y Etapas (der.), debajo el resto en dos columnas parejas (.pp-b) y el cronograma a todo el ancho (.pp-full). Notas del proyecto: se ven 2 y el resto en "Ver N notas más" (recuerda si estaba abierto por proyecto). Grupos: 5 formas nuevas (hepta, kite, para, burst, arch: CSS --sh, pxpShapeSvg, PDF) y 3 colores (#E11D48, #9CA33A, #B07A4A) en las tres paletas de grupo. Home personal: tarjeta "Mi carga · próximas semanas" (horas de mis etapas pendientes por semana, 6 semanas, línea de 40 h).

- **v184:** copias completas y migración. Antes "Descargar copia" solo guardaba algunas claves de META (se perdían licencias, logros, temas…); ahora guarda todo. "Restaurar copia" combina con lo actual (pxpCombinarEstado: lo actual manda, se agregan proyectos, personas, listas con id e historiales que falten, y claves de META vacías) y acepta también los datos crudos de /api/state. Nueva función netlify/functions/migrate.mjs (POST /api/migrate {from} lee el tablero antiguo; {from, file} copia un adjunto, por partes si pesa más de 4,5 MB; solo https://*.netlify.app y solo desde el propio tablero). En la barra inferior (solo Netlify y Administración): "Traer datos de otro servidor". Pruebas: tools/nf-server.mjs (servidor local), tools/migrate-e2e.mjs (dos servidores: antiguo y nuevo).

- **v185:** extractor de datos (tools/extractor/extractor.html, va en el ZIP como public/extractor.html): un botón de favoritos que, abierto en cualquier sitio del tablero, descarga restauracion-completa-….json con el estado completo y los adjuntos dentro (base64). "Restaurar copia" sube esos adjuntos al sitio nuevo, cambia los ids y combina. No requiere tocar el sitio antiguo. Prueba: tools/extractor-e2e.mjs.

- **v186:** Tráfico en fichas como mosaico (pxpTraficoMosaico): rejilla de filas de 4 px y cada ficha con grid-row/grid-column explícitos en la columna más corta; los títulos ocupan todo el ancho; se recalcula con cambios del DOM, al cambiar el tamaño de la ventana y con un ResizeObserver. En la tabla de Tráfico la columna N.º va primera. Prueba: tools/test-v186.mjs.

- **v187:** ingreso en Netlify: la lista agrupa por equipo antes de entrar (precargarGrupos lee /api/state y calcula los grupos sin tocar los datos; antes todos caían en "Otros"). Proyectos en fichas agrupadas: cada grupo en un bloque (.pvc-blk) que ocupa las columnas que necesita, lado a lado con grid dense. Ventana de grupo: selector de formas en 2 filas de 10 (5 por fila en celular), encabezado que no se tapa en celular, forma elegida más visible; tarjetas con skills compactas (pxpSkillsCompact, íconos con nombre al pasar el cursor y +N). Las redes por cargo (roleStyle) usan la forma elegida para el grupo. Prueba: tools/test-v187.mjs y el ingreso en tools/netlify-e2e.mjs.

- **v188:** ventana de persona: la red de proyectos con más de 12 proyectos usa un lienzo ancho y dos anillos alternados (svg.big ocupa todo el ancho); "Sus proyectos" muestra 6 y el resto en "Ver N proyectos más" (recuerda si estaba abierto por persona); Logros: individuales a lo ancho y de grupo y de equipo en la misma fila (.lg-pb).

- **v189:** Proyectos: barra nueva (.pvx) con Activos/Todos (pv.alcance; Activos oculta los entregados salvo que se filtre por ese estado), buscador, botón Filtros (un solo selector con todos los filtros agrupados; los aplicados quedan como etiquetas con ✕), vista Fichas/Filas, Agrupar (desplegable) y Nuevo proyecto. Preferencias en pxp_pv_v3 con valores por defecto: fichas, activos, por cliente. Ventana de persona: Sus proyectos y Etapas con "Ver 5 más" (verMas/pxpVerMas, recuerda cuántos por persona). Prueba: tools/test-v189.mjs.

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

## v217 · Sala con confirmación, perfil en celular, plegables en Dashboard y Tráfico, asistente por rol
- Fuentes de las capas v211+ ahora en `src/capas/`; se insertan con `python3 tools/capas.py` y luego `python3 tools/build.py vNNN`.
- Sala: pide confirmación para entrar (quien no ha entrado ve quién está, sin aparecer) y para salir; seguir en la sala desde otras pestañas (aviso flotante con no leídos); notas del tablero abren vista previa en ventana (Proyectar / Abrir); vista ampliada a pantalla completa y horizontal en celular.
- Perfil y cliente en celular: una columna sin desbordes; red de proyectos vertical; filas de proyectos en dos líneas.
- Home Global: «Más gráficas» reparte en las tres columnas (desempate por reparto parejo).
- Dashboard (Carga por persona) y Tráfico (por cargo, secciones y tabla): grupos plegables con «Esconder todos / Mostrar todos»; en Tráfico por cargo cada grupo es un bloque con barra estilo Capacidad y se acomoda sin huecos.
- Asistente: ayudas por rol (Administración: planear, asignar, seguimiento, reportes; creativos: mi día, registrar, organizarme, buscar) y nuevas consultas (resumen del equipo, sobrecarga, vencidas, entregas de la semana, standby, mi semana, mis horas, mis tareas).
- Frases del avatar: ~90, amables y con humor de post, sin repetirse hasta agotarse; según hora, día y rol.
- Pruebas: tools/test-v217.mjs (57), tools/sala-e2e.mjs actualizado.

## v218 · Llamadas reales en la Sala con Daily
- `netlify/functions/daily.mjs` (`/api/daily`): GET dice si está configurado; POST entrega un permiso (meeting token, 4 h) a nombre de la persona. Variables: `DAILY_API_KEY`, `DAILY_ROOM_URL`. La clave nunca va al navegador ni al repositorio.
- `src/vendor-daily.js` (daily-js 0.92.2, BSD-2) se empaqueta como `public/daily.js` y se carga solo al entrar a la Sala.
- En `src/capas/sala.js` (bloque DL): al confirmar la entrada se conecta la llamada; micrófono, cámara y pantalla usan las mismas pistas locales; el audio de los demás suena, su cámara va en la cara del avatar y su pantalla en el TV (con TV en grande y pantalla completa). Al salir se cuelga. La presencia y el chat siguen por `/api/sala`.
- Prueba: `tools/daily-e2e.mjs` (función con Daily simulado + dos personas con un Daily falso), 17 revisiones.
- Ajustes v218: en Dashboard se pliega la caja completa de «Carga por persona» (sin plegables por cargo); en Tráfico «Por cargo» Audio entra al mismo mosaico y la sección ya no dice «cabezas: …» (texto fijo heredado); en la tabla, cada grupo trae la barra con avatares y resumen.
- Aviso flotante de la sala rediseñado (estado en vivo, vista previa de la conversación o de lo proyectado, avatares, Salir integrado, animaciones suaves y respeto a "reducir movimiento").
- Rincón del café entre la terraza y el TV: mueble con cafetera y jarra de agua (zonas `#sl-cafe` / `#sl-agua`). Al tocarlas, el avatar camina, recibe taza o vaso (`cup` viaja en la presencia de `/api/sala`) y da sorbos de vez en cuando; tocar de nuevo la deja.
- Encabezado de persona en celular: el cargo es una sola tarjeta (cargo en una línea, grupo debajo, lápiz adentro); si cargo y grupo son iguales se muestra una vez con el punto de color del grupo.

## v219 · Sala: entrada con puertas, proyección sin trabas, reacciones; avatar con cadenitas y efectos
- Proyección: se corrigió el bucle que trababa al proyectar pestañas; se arma después del clic; ventanas en 960×540; en celular tarjeta en el TV pequeño y vista grande legible.
- Entrada/salida con puertas oscuras animadas; panel de personas y chat ocultable; burbujas más grandes y duraderas.
- Reacciones (mano y emojis) sincronizadas por /api/sala (hand, rx).
- Avatar: sin pin por defecto (Auto = forma del grupo), cadenitas (nk, kc) y efectos (fx, xc): brillo, aura, lluvia de ideas, confeti.
- Arreglo v219: el TV en portátiles (~225 px) muestra la ficha (la tarjeta solo aplica bajo 150 px, celular); al iniciar sesión la pantalla de carga espera hasta que lleguen los datos del servidor (máx. 20 s).
- Aura tornasol psicodélica, mascotas (perrito y gatito) y pestaña Efectos aparte en el editor.
