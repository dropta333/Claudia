# Tráfico Post · v163 — cómo publicar

1. En el tablero actual toca **Descargar copia** (pie de página) para tener un respaldo de hoy.
2. En Netlify, abre tu sitio → **Deploys** y arrastra este ZIP (o la carpeta descomprimida) a la zona de despliegue.
3. Los datos del equipo **no se tocan**: viven en Netlify Blobs y el tablero los carga al abrir.
4. Entra primero como Administración y espera el aviso **"Tablero optimizado"** (mueve las imágenes viejas a archivos).

Novedades v163 (solo el tablero): todo se edita en la ventana del proyecto. Lápiz junto al título para nombre, cliente y marca (renombrar, solo Administración); color del proyecto tocando su franja en la cabecera; Eliminar proyecto en el pie con doble confirmación.

Novedades v162 (solo el tablero): en cada etapa, "Horas reales" para que los responsables registren con − N h + y Registrar; el estimado (duración en el cronograma) es automático según el tipo y el nombre, y se puede cambiar.

Novedades v161 (solo el tablero): "Nuevo proyecto" abre la misma ventana del proyecto, vacía y lista para llenar (nada se guarda hasta tocar Crear proyecto); duración y horas registradas en una sola casilla; nombre de la etapa más grande; fases de etapas en escala de grises con su color.

Novedades v160 (solo el tablero): reacciones en las notas de los proyectos (Visto, De acuerdo, Aprobado, Atención, Me encanta y Gracias), con quién reaccionó al pasar el mouse y aviso en las notificaciones de quien escribió la nota.

Novedades v159 (solo el tablero): Inicio del proyecto de primero en las características; ficha de resumen mejor distribuida, con la duración en días hábiles; agregar etapas eligiendo la fase (Preproducción, Rodaje o Postproducción); vistas del cronograma siempre a la derecha y sin scroll horizontal.

Novedades v158 (solo el tablero): licencias agotadas salen de la lista a los 3 días y vencidas al día siguiente (quedan en Historial); nueva columna "Agotadas / Vencidas" en el Tablero de capacidad.

Novedades v157 (solo el tablero): estado del proyecto automático según sus etapas (con nuevo estado "En preproducción"; Entregado se marca solo cuando la entrega final queda lista; Cotizado, Standby y Aprobado siguen a mano y, al quedar Entregado, aparece un aviso para confirmar Aprobado); cronograma "Todo" de inicio a entrega final con hoy al centro; columna de etapas más ancha y textos más grandes.

Novedades v156 (solo el tablero): etapas sugeridas, una por integrante y con fechas desde hoy que caben antes de la entrega final; ventana de proyecto más ancha; cronograma sin desplazamiento horizontal, con hoy siempre al centro y la vista "Todo" que se ajusta a las fechas.

Novedades v155 (solo el tablero): filas de etapa más bajas; Revisión y Entrega compactas y con su color, con menos horas y exigencia liviana por defecto; selectores de horario y exigencia con estilo de calendario; sugerencia de bloqueador en las revisiones; etapas sugeridas por fase en un clic (con Deshacer); cronograma con todas las etapas, altura controlada, vista Año, mañana/tarde e inicio del proyecto; fecha de inicio del proyecto en la barra de resumen.

Novedades v154 (solo el tablero, sin cambios en el servidor): ventana de proyecto con secciones plegables, etapas agrupadas por fase (Preproducción · Rodaje · Postproducción), tipo de etapa (Proceso · Revisión · Entrega), horario (Mañana · Tarde · Hora exacta · Se extiende), varios responsables por etapa y etapas sugeridas según el equipo.

Novedades del servidor (v153): `PUT /api/state` acepta `keys` para guardar solo los proyectos o claves de META que cambiaron (guardados de 3–7 KB en vez de ~2 MB). Es compatible con los datos y con el formato anterior.

---

# Tráfico Post · Publicis Production — versión Netlify

Esta carpeta publica el tablero en Netlify con **datos compartidos**: todas las personas que abren el enlace ven y editan la misma información. Los datos no quedan guardados en cada computador (ese era el problema de la matriz de licencias). Se guardan en el servidor de Netlify, en **Netlify Blobs**, que viene incluido en Netlify y no necesita una base de datos externa.

## Qué hay en la carpeta

- `public/index.html`: el tablero (no trae datos: todo llega del servidor).
- `public/pdf.js`: generador de PDF y sus fuentes; solo se descarga la primera vez que alguien exporta un reporte.
- `netlify/functions/state.mjs`: la función que lee y guarda los datos en `/api/state`.
- `netlify.toml`: la configuración de Netlify.
- `package.json`: la dependencia `@netlify/blobs`.

## Cómo subirla (importante)

**No uses "arrastrar y soltar" (Netlify Drop).** Ese método solo sube archivos estáticos y no publica la función. Sin la función, el tablero vuelve a guardar en cada navegador por separado.

Hay dos formas de subirla.

### Opción A · Netlify CLI (la más rápida)

```bash
npm install -g netlify-cli
cd trafico-netlify
netlify login
netlify init          # crear un sitio nuevo (o "link" si ya existe)
netlify deploy --prod
```

### Opción B · GitHub

1. Sube esta carpeta a un repositorio.
2. En Netlify, elige **Add new site → Import an existing project** y selecciona el repo.
3. Netlify lee `netlify.toml` solo. No hay que cambiar ninguna configuración.

## Primer uso

El `index.html` no incluye datos: si el servidor está vacío, el tablero arranca en blanco. Nada se guarda hasta que los datos del servidor hayan cargado, y cada parte del tablero (equipo, proyectos, META…) se guarda por separado, así que un cambio pequeño no reescribe todo. Los datos guardados con versiones anteriores se migran solos en el primer guardado.

Si el tablero original siguió cambiando mientras tanto, hay dos caminos:

- Descarga una copia de seguridad (.json) desde el tablero original y cárgala con **Restaurar copia** en la versión de Netlify.
- O regenera esta carpeta con los datos al día.

## Cómo se comporta

- Cada cambio se guarda en el servidor al instante. El pie de página confirma: "guardado para todo el equipo".
- Cada 20 segundos, y al volver a la pestaña, el tablero revisa si otra persona guardó cambios y los carga. Si en ese momento estás escribiendo o tienes una ficha abierta, espera a que termines.
- Si dos personas guardan casi al mismo tiempo, gana la primera. La segunda ve un aviso, se carga la versión nueva y debe repetir su último cambio. Así nadie borra el trabajo de otro sin darse cuenta.
- El servidor guarda además una copia automática por día (`backup/AAAA-MM-DD`).

## Colores

Cada proyecto y cada cliente puede tener su propio color. Se cambia en la ficha del proyecto (campos "Color del proyecto" y "Color del cliente") o desde el panel "Clientes, marcas y proyectos" de la pestaña Clientes. Los colores se guardan en el servidor, así que todo el equipo ve los mismos. Si no eliges ninguno, se usa un color automático.

## Fotos de perfil y tareas

Cada persona del equipo y cada cliente puede tener una foto. Se sube desde la ventana de la persona (clic en su nombre) o desde el panel de clientes (clic en su círculo). La imagen se reduce automáticamente a un tamaño pequeño (unos pocos KB) y se guarda en el servidor, así que todo el equipo la ve. Las tareas que se asignan desde la ventana de cada persona también se comparten.

## Archivos adjuntos en las notas

Las notas de cada proyecto admiten imágenes, audios, videos, PDF, documentos y cualquier otro archivo. En Netlify se guardan aparte del tablero (en Netlify Blobs, almacén "trafico-archivos", con la función `netlify/functions/files.mjs`), con un máximo de 5 MB por archivo. Al borrar una nota se borran también sus archivos. No hay que configurar nada: se despliega junto con el resto.

## Acceso

Todo el equipo entra con su nombre y la clave: primer nombre + 2026, en minúsculas y sin tildes (ej: maria2026). Pueden editar horas, cargas, ausencias y asignaciones: Dirección de Post, Producción Ejecutiva, Project Manager y Bastián Torres. Los demás entran en modo consulta.

## Límites de archivos

- Adjuntos en las notas: hasta 15 MB por archivo. Los archivos de más de 4,5 MB se suben en partes (Netlify acepta unos 6 MB por envío) y se vuelven a unir al verlos o descargarlos.
- Imágenes: se aceptan hasta 40 MB y se optimizan al subirlas (lado mayor de 3200 px, calidad alta). Una foto de 16 MB suele quedar entre 2 y 5 MB sin pérdida visible.
- Fotos de perfil y de clientes: 400 × 400 px en alta calidad. Imagen del proyecto (banner): 2000 × 800 px.

## Notificaciones, grupos y casas de audio

- La campana de arriba abre un panel lateral con las notificaciones de **esa persona**: comentarios nuevos en sus proyectos, sus tareas y etapas, entregas próximas y proyectos asignados. Lo que ya se leyó se guarda en el navegador de cada persona (no en el servidor).
- Los grupos se pueden renombrar y recolorear (lápiz junto al título en Team) y las casas de audio se administran en Team → Audio. Ambos quedan guardados en el estado compartido, igual que el resto.
- Editar el perfil de un integrante (nombre, cargo, grupo, correo…) lo hacen quienes tienen permiso de edición; el cambio de nombre se actualiza en todos los proyectos y en su acceso (clave: primer nombre + 2026).

## Seguridad: tenlo en cuenta

- Las claves del login están dentro del código de la página, así que sirven para ordenar quién edita, no como protección real.
- La dirección `/api/state` acepta lecturas y escrituras de quien tenga el enlace.
- Si el tablero va a manejar información sensible, el siguiente paso recomendado es proteger el sitio. Hay dos opciones: **Password Protection** de Netlify (plan Pro) o mover el login a la función con claves en variables de entorno.

## Actualizar el sitio sin perder datos
Sube de nuevo la carpeta `trafico-netlify` (arrastrar a Netlify). Los datos del equipo viven en Netlify Blobs, **no** en la página: al abrirse, la página carga lo que está guardado en el servidor y descarta la copia que trae incluida. Esa copia solo se usa si el servidor está completamente vacío (primer uso).
- Los logros ya alcanzados se registran como "base" la primera vez que alguien entra y no se celebran.
- La función `state.mjs` ahora guarda solo lo que cambió y revisa la versión con un registro pequeño (`state-meta`): es compatible con los datos que ya tienes.

