# Traspaso — Tráfico Post · Publicis postproducción · Colombian Hub

Versión: **v163** · 10 oct 2026 · Responsable: Bastián Torres

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
