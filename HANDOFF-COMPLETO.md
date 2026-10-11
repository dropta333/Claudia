# Handoff completo · Tráfico Post · Publicis Postproducción

**Versión actual:** v209 · 11 oct 2026
**Responsable:** Bastián Torres (Administración)
**Repositorio:** `dropta333/claudia` · rama de trabajo `claude/friendly-johnson-4bo3zq`, que también es la rama principal.

Este documento sirve para retomar el proyecto en otra conversación sin perder contexto. Para el detalle técnico por versión, ver `HANDOFF.md`, que tiene una línea por versión.

---

## 1. Qué es la plataforma y para qué sirve

**Tráfico Post** es el tablero interno del equipo de postproducción de Publicis Production (Colombian Hub). Con él, Administración y cada integrante saben, semana a semana:

- **Quién está libre y quién está cargado.** Muestra la capacidad del equipo con un semáforo de carga y las horas por semana.
- **Qué proyecto está en qué estado.** Los estados son cotizado, preproducción, rodaje, postproducción, revisión, entregado, aprobado y standby.
- **Qué entrega o qué etapa viene,** y cuáles ya vencieron.
- **Cuántas horas se trabajaron y en qué.** Incluye el registro de horas, las horas extra y el compensatorio.
- **Qué licencias de software hay,** cuántos créditos les quedan y cuándo vencen.

**Objetivo:** reemplazar las planillas sueltas y los mensajes por **una sola fuente de verdad** para el tráfico de postproducción. Quien sea debe poder ver de un vistazo la carga del equipo, el avance de cada proyecto y lo que se entrega, y Administración debe poder planificar y sacar reportes en PDF para clientes y dirección.

**Usuarios y permisos:**

| Usuario | Qué puede hacer |
|---|---|
| **Administración** | Edita todo: proyectos, equipo, grupos, licencias, contraseñas y reportes. |
| **Integrantes** | Usan la vista **Personal**: sus proyectos, sus etapas, su carga y sus horas. Registran horas, reaccionan y escriben notas. |
| **Modo consulta** (solo lectura) | Ve sin poder editar. |

- **Ingreso:** el ingreso es por nombre (la lista está agrupada por equipo) más contraseña. La contraseña inicial es "nombre + 2026" y Administración puede restablecerla.
- **Idiomas:** español e inglés. La interfaz está traducida completa; solo quedan en el idioma original los textos que escriben las personas.
- **Tema claro u oscuro:** lo decide el dispositivo.

---

## 2. Funciones por pestaña

### Home
- **Vista Global:**
  - Hay tres gráficas fijas: Estado del equipo, Estado de los proyectos y Tipos de proyecto.
  - El resto de las gráficas va en el bloque plegable **"Más gráficas"**, que se recuerda por persona.
- **Vista Personal:**
  - **Cabecera:** la tarjeta de perfil con foto, estado, logros, KPIs (proyectos en curso, etapas pendientes, próxima entrega, horas de la semana), skills y software.
  - **Mosaico sin huecos:**
    - Estado de los proyectos, en dos columnas.
    - Próximas entregas y etapas: 5 próximas, 2 vencidas y "Ver más".
    - Mis gráficas: horas por semana, horas por proyecto, etapas, proyectos activos y "Mi carga · próximas semanas".
  - **Barra "Mis gráficas" (v209):** va al pie de la columna más corta y muestra u oculta las gráficas. Se recuerda por persona.

### Dashboard (Administración)
- Disponibilidad del equipo, agrupada por estado (incluye "Ocupados"). Cada columna muestra 4 filas y "Ver N más".
- Paneles de carga y el botón "Nuevo proyecto".

### Tráfico
- Una ficha por persona para la semana elegida, en un mosaico sin huecos (v186 y v208).
- Cada ficha muestra:
  - un semáforo vertical de carga;
  - estados en íconos: disponible, proyectos, horas de etapas, vencidas y ausencia;
  - las marcas de proyecto de la semana.
- **Vista tabla,** con la columna N.º primero.
- Herramientas: buscador, ordenar, cambio de semana y el plegable **"Rodajes"**, que abre una ventana naranja con los rodajes de la semana.
- Las fichas se reacomodan solas al repintar, cambiar de semana, buscar o cambiar el tema (v208).

### Proyectos
- **Barra:**
  - Activos/Todos, buscador y **"Filtrar por"** (un desplegable diseñado con todos los filtros agrupados; los filtros aplicados quedan como etiquetas con ✕).
  - Vista Fichas o Filas, Agrupar (por defecto "Sin agrupar"), Ordenar, Plegar/Desplegar todos y Nuevo proyecto.
- **Ventana de proyecto** (el corazón de la plataforma):
  - **Cabecera:** nombre, cliente, marca, color (por defecto el del cliente), imagen y lápiz para editar.
  - **Ficha:** a la izquierda, con tipo, complejidad, duración en días hábiles y agencia.
  - **Desplegables:** a la derecha.
  - **Equipo:** mapa de nodos por cargo y grupo.
  - **Etapas por fase** (Preproducción, Rodaje y Postproducción):
    - Tipos: Proceso, Revisión o Entrega. Revisión y Entrega son hitos.
    - Cada etapa tiene horario (mañana, tarde u hora), varios responsables, exigencia y horas estimadas automáticas que se pueden editar.
    - Horas reales con "− N h +" y Registrar.
    - Bloqueadores, y "Solicitud de ajustes" con adjuntos.
  - **Filas de etapas:** arriba una fila de **Inicio del proyecto** y abajo una de **Entrega final**.
  - **Estado automático:** se calcula según las etapas. Cotizado, Standby y Aprobado se ponen a mano, y al quedar Entregado aparece un aviso para confirmar Aprobado.
  - **Cronograma:** vistas Todo, Día, Semana, Mes y Año, con hoy al centro y marcas de Inicio, Hoy y Entrega.
  - **Piezas:** Hero, derivadas, variación, adaptación de formato o de región, y formatos típicos.
  - **Notas:** con foto, @usuario, reacciones (6 tipos) y "Ver N notas más".
  - **Revisiones y enlaces, ruta en el share** y taxonomía sugerida.
  - **Etapas sugeridas** según el equipo.
- **Reglas de la ficha:**
  - Para crear un proyecto se usa la misma ventana, en modo creación.
  - Desde ella se renombra (mueve la clave y actualiza tráfico y licencias) y se elimina, con doble confirmación.

### Team
- **Grupos por cargo:** cada grupo tiene su forma y su color. Son plegables, con "Cerrar todos" y "Abrir todos".
- **Fichas por persona (v209):**
  - la foto va alineada con el nombre (más grande) y el cargo;
  - debajo, las skills y el software a todo el ancho;
  - a la derecha, "N proyectos ↗", que lleva a Proyectos filtrado.
- **Botones,** de derecha a izquierda: Nuevo miembro, Nuevo grupo y Cerrar/Abrir todos.
- **Ventana de persona:**
  - **Cabecera:** foto con íconos para cambiarla o quitarla, cargo destacado con lápiz y estado en píldora. En el celular, la foto va arriba y centrada.
  - **Contenido:** red de proyectos (dos anillos si tiene más de 12), "Sus proyectos" y "Etapas" con "Ver más", cronograma, logros y "Mis datos".
  - **Tipo de integrante:** solo lo ve y lo edita Administración. Los externos no cuentan en la capacidad.

### Clientes
- El árbol cliente → marca → proyecto va primero: diseño de 3 columnas con logo, desplegable por cliente, Activos/Todos y Abrir/Cerrar todos. "Nuevo cliente" está dentro de la caja.
- Gráficas lado a lado, **Trabajo por cliente** y **Tipo de proyecto**, con el selector Semanas, Meses o Año, que también aplica a "Ver tablas de datos".
- Reparto por cliente (donut, ranking y "Otros") y Tipos de proyecto, en dos columnas.
- Ficha de cliente con red de proyectos. Desde ella se puede fusionar un cliente repetido o eliminar uno sin proyectos.
- Mars y MARS se unen: la plataforma no distingue mayúsculas en los nombres de clientes.

### Capacidad (Administración)
- Dos vistas, **fichas** (mosaico) o **tabla**.
- Grupos plegables, con encabezado en barra: avatares, personas, horas en cola, sin cupo o al límite.
- Agrupar por cargo o sin agrupar, más un buscador.
- La carga se calcula por etapas: 40 h ponderadas equivalen al 100 %.

### Horas / Mis horas
- **Registro de horas** por etapa o proyecto. La jornada es de lunes a viernes, de 8:30 a 17:30, con una hora de almuerzo.
- **Horas extra:** las de fines de semana y festivos suman para compensatorio.
- **Histórico** por semana.

### Licencias
- Barra integrada con buscador, acciones, estados, filtros y ordenar.
- **Agotadas y vencidas:** salen de la lista de activas a los 3 días o al día siguiente, y quedan en el Historial.
- **Tablero de capacidad** de licencias.

### Logros
- **Medallas por nivel:** son individuales, de grupo y de equipo, y algunas son propias de cada cargo.
- **Cabecera compacta,** con el conteo grande por nivel y las últimas medallas junto al progreso.
- **Tarjeta flotante:** indica qué mide cada logro, qué falta para el siguiente nivel y cómo lograrlo.

### Repositorio y Reportes
- **Repositorio:** enlaces y archivos.
- **Reportes en PDF:**
  - Reporte de proyecto, en 2 páginas: KPIs, ficha, equipo en red, Gantt y actividad.
  - Reporte de cliente.
  - Cargas del equipo en A4.
  - **Time table:** vistas Calendario y Gantt, cabecera de marca, idioma español o inglés y equipo elegible.
- **Vista previa** con zoom, "Real", Centrar y arrastrar.

### Transversal
- **Notificaciones:** reacciones, entregas y otros avisos.
- **Copias:** "Descargar copia" y "Restaurar copia". La restauración combina con lo actual sin pisarlo.
- **Migración:** desde otro servidor de Netlify, con un extractor (`public/extractor.html`).
- **Componente desplegable diseñado:** `select[data-dd]`, con buscador y hoja en el celular.
- **Control de plegado unificado:** `.fold`, en todas las pestañas.

---

## 3. Cómo está armado (técnico)

- **Fuente única:** `src/app.html`, de unas 23 000 líneas. Tiene todo el CSS y el JS en "CAPAS": cada IIFE envuelve funciones `window.*`. Las capas nuevas se agregan al final y envuelven a las anteriores.
- **Vendors:** `src/vendor-jspdf.js` y `src/vendor-fonts.js`.
- **Datos de prueba:** `data/state.js`. Son solo para el preview.
- **Build:** `python3 tools/build.py vNNN` genera:
  - `dist/preview.html` y `dist/tablero-preview-vNNN.html`: el preview con datos. Sirve también como copia de seguridad completa del proyecto.
  - `dist/trafico-netlify-vNNN-completo.zip`: el sitio de Netlify, **sin datos**. Incluye `index.html` minificado, `pdf.js`, `extractor.html` y las funciones.
- **Recuperación:** `tools/split.py preview.html` reconstruye `src/`, `data/` y los vendors.
- **Netlify** (`netlify-site/`): las funciones `state.mjs` (datos en Blobs), `files.mjs` (adjuntos) y `migrate.mjs`.
  - Guardado por clave, en fila y por partes.
  - Mezcla a tres vías ante el error 409.
  - Borrador local en IndexedDB.
  - Solo se aceptan escrituras desde el propio origen.
- **i18n:** CAPA 31, con el diccionario `DICT` y los patrones `PAT`. Cada texto nuevo debe sumarse al diccionario.
- **Ayudantes útiles:**
  - `pxpOnDom(fn, opts)`: observador del DOM con debounce.
  - `pxpNombreBonito`: pone mayúscula inicial a los nombres.
  - `pxpSkillsMini`: las skills compactas de las fichas.
  - `repartir()`: el mosaico del Home.
  - `pxpTraficoMosaico` / `acomodar()`: el mosaico de Tráfico.
  - `pxpCapMosaico`: el mosaico de Capacidad.
  - `pxpTeamPack`: el reparto de los grupos de Team.
- **Pruebas** (Playwright, con el Chromium del entorno):
  - `node tools/test-vNNN.mjs`: una prueba por versión, de la v164 a la v209.
  - `node tools/smoke.mjs`: recorre todas las vistas, como admin y como creativo, en escritorio y celular.
  - Conviene correr subconjuntos dirigidos, porque la suite completa tarda mucho.
- **Pruebas de punta a punta de Netlify:** `tools/netlify-e2e.mjs`, `tools/migrate-e2e.mjs` y `tools/extractor-e2e.mjs`.

---

## 4. Reglas que no se cambian sin consultar

1. **Datos:**
   - El ZIP de Netlify va **sin datos**.
   - **Nunca** se guarda antes de cargar los datos del servidor.
   - El guardado va en fila y por partes, con mezcla ante el 409.
2. **Interfaz:**
   - El **tema del dispositivo** manda.
   - En la ventana de proyecto, la ficha va a la izquierda y los desplegables a la derecha.
3. **Capacidad:**
   - Los **externos no cuentan** en la capacidad.
   - Se mantienen los 6 estados de etapa.
4. **La entrega final nunca se rellena sola.** La define Administración y puede ser estimada.

---

## 5. Forma de trabajar con Bastián (preferencias)

- **Idioma:** responder en **español**, breve, con viñetas en negrita y sin código, salvo que lo pida.
- **Cada entrega incluye:**
  - una **versión numerada** (vNNN);
  - el **preview HTML**;
  - el **ZIP completo de Netlify** (sin datos);
  - **capturas** de escritorio y, cuando aplica, de celular.
  - Además, se suma una línea a `HANDOFF.md`.
- **Diseño** (dirección de arte, diseño, UX/UI):
  - Odia los **espacios vacíos y los huecos**. Pide layouts compactos y bien distribuidos, mosaicos parejos y nada flotando.
  - Si solo se agrega una función, **se mantiene el diseño existente**; no se rediseña lo que ya le gusta.
  - Hay que **limpiar** los restos de diseños anteriores en lugar de esconderlos.
  - Quiere botones y desplegables diseñados, no los nativos. Para plegar se usa el componente `.fold` y para seleccionar, `data-dd`.
- **Reportes de error:** suele reportar con capturas o por voz, así que a veces el texto llega cortado. Conviene interpretar la intención y, si un bug no se puede reproducir, decirlo y pedir captura o video.

---

## 6. Historial resumido de esta etapa (v190 → v209)

- **v190–v192:**
  - Clientes: unión sin distinguir mayúsculas, nuevo Reparto, desplegables, vuelta al diseño de 3 columnas.
  - Capacidad en mosaico.
  - Vista personal corregida en Proyectos.
  - Mosaico de Tráfico estable.
- **v193–v196:**
  - Desplegables diseñados (`data-dd`) y barra integrada en Licencias.
  - Control de plegado unificado (`.fold`) en todas las pestañas.
  - Barra de Proyectos con "Filtrar por".
  - Capacidad agrupa y busca.
  - Reportes en mosaico.
- **v197–v200:**
  - Clientes con el árbol primero y gráficas lado a lado con Semanas, Meses o Año.
  - Logros con cabecera compacta.
  - Dashboard: Disponibilidad con todo el equipo.
  - Home personal: estado en 2 columnas.
- **v201–v203:**
  - La ficha del proyecto deja de repetir fechas.
  - Ventana de Rodajes en naranja.
  - Nombres con mayúscula inicial.
  - Se elimina "Carga por rol" (diseño antiguo).
- **v204–v205:**
  - Team: grupos plegables, sin horas ni "esta semana" en las fichas, y botones en orden.
  - Capacidad: encabezados en barra.
  - Disponibilidad con "Ver más".
  - Las fotos conservan su forma al esconder o mostrar.
- **v206–v207:**
  - Cabecera del perfil rediseñada (también en el celular).
  - Leyenda de la red en una línea.
  - Tipo de integrante solo para Administración.
- **v208:**
  - Tráfico: las fichas se reacomodan al instante al repintar, con un vigilante del DOM.
  - Home personal con "Mis gráficas" plegable.
- **v209:**
  - Home personal vuelve al mosaico sin huecos y "Mis gráficas" queda como una barra compacta al pie de la columna más corta.
  - Team: la foto se alinea con el nombre y el cargo, el nombre es más grande y las skills van a todo el ancho.
  - Se agrega este documento.

---

## 7. Pendientes e ideas

- **Seguridad:**
  - validar los roles en el servidor;
  - sacar las contraseñas del código;
  - proteger `/api/files`.
- **Tráfico:** si el usuario sigue viendo fichas desacomodadas, pedir una captura o un video. Las pruebas automáticas no reproducen el problema.
- **Limpieza:**
  - el editor viejo de fichas (`saveFicha`) y los selectores `#pxp-newproj` sin uso;
  - en la raíz del repo quedan previews y ZIPs viejos (v154–v189) que se pueden archivar.

---

## 8. Cómo retomar en otra conversación

1. Clonar `dropta333/claudia` y trabajar en la rama `claude/friendly-johnson-4bo3zq`.
2. Leer este archivo y luego `HANDOFF.md`, que tiene el detalle por versión.
3. Editar `src/app.html` agregando una capa nueva al final, marcada con su versión (por ejemplo `/* ═════ v210 · … ═════ */`).
4. Correr `python3 tools/build.py v210`, crear `tools/test-v210.mjs` y correr las pruebas relacionadas junto con `tools/smoke.mjs`.
5. Hacer commit y push, y entregar el ZIP, el preview y las capturas.
