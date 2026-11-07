# Apps: estado, instalación como PWA y publicación en Android

Afecta a las cuatro apps públicas: **Pantxiko Notes** (`apps/pantxiko-notes.html`),
**Rueda** (`apps/conversor-rueda.html`), **Escenas** (`apps/escenas/`) y
**Format Explorer** (`apps/format-explorer.html`). Las dos apps no listadas
(Biblioteca e Instagram Downloader) tienen su propia tabla en el §7. Los juegos
y el mapa quedan fuera.

Las cuatro son páginas estáticas: no hay servidor propio, base de datos, cuentas
de usuario ni pagos. Todo lo que guardan se queda en el navegador de cada
persona (`localStorage`).

---

## 1. Estado del bloque «App» de la checklist

| Punto | Estado | Qué hay o por qué no aplica |
|---|---|---|
| API keys y secretos | ✅ | Ninguna clave en el código de las apps (revisado; el CI pasa gitleaks en cada push). |
| Permisos de BD y RLS | No aplica | No hay base de datos. |
| Autenticación | No aplica | No hay cuentas, y a propósito: una contraseña comprobada en el navegador no protege nada. Lo privado se queda en local o sin enlazar. |
| Datos de cada usuario | No aplica | Cada persona solo ve lo de su navegador; nada viaja a un servidor. |
| Inyección SQL y XSS | ✅ | SQL no aplica. XSS: Notes sanea todo el HTML que entra (guardado, pegado, arrastrado, copia restaurada y paso a PDF); Rueda ya escapaba nombres y textos, y ahora el Markdown no admite enlaces `javascript:`; Escenas y Format Explorer pintan con `textContent` o escapan. |
| Límites de API | No aplica | No hay API propia. |
| Dependencias | ✅ | pdf.js 3.11.174 con integridad SRI y `isEvalSupported:false` (cierra CVE-2024-4367). three.js r128 local (sin CVE que afecte). `npm audit`: 0 vulnerabilidades. Dependabot activado (`.github/dependabot.yml`). |
| Endpoints de API | No aplica | No hay endpoints. |
| Gestión de errores | ✅ | `js/app.js`: un fallo sin capturar muestra un aviso con «Recargar». Notes avisa si el navegador no deja guardar, si falla el portapapeles, las ventanas emergentes o el micrófono (con mensajes en castellano). Rueda captura los fallos de recortar y añadir fondo. Escenas sigue funcionando sin WebGL. |
| Información sensible | ✅ | Los errores que llegan a GA4 van recortados a 120 caracteres y sin URL. Nunca se envía el texto de las notas, lo dictado, ni nombres de archivo. |
| Pruebas de login | No aplica | No hay login. |
| Pagos | No aplica | No hay pagos. |
| Copias de seguridad | ✅ | Notes: ⚙️ → Descargar copia (.html), en texto (.txt) y Restaurar copia. Escenas: tarjeta «Copia de seguridad» → Descargar escena / Abrir escena (.json). Rueda no guarda nada; Format Explorer solo la posición de los iconos. |
| Responsive | ✅ | Revisadas a 375 px: sin scroll horizontal. Notes cortaba el botón ⚙️ en móvil (arreglado). Rueda explica el uso táctil (sin Shift). Format Explorer abre las apps con un toque. |
| Llamadas a la API | ✅ | Sin API. pdf.js solo se descarga al abrir el primer PDF. El service worker sirve las apps desde el dispositivo si no hay red. |
| Estados de carga | ✅ | Rueda: aviso con spinner, estado vacío y errores. Notes: marcador de nota vacía y avisos al copiar o pasar a PDF una nota vacía. Escenas: aviso sin WebGL. |
| Accesibilidad | ✅ | axe (WCAG 2 A/AA + buenas prácticas): 0 infracciones en las cuatro. Notes: nombres accesibles en la barra de formato, panel de ajustes como diálogo (Esc, foco atrapado y devuelto) y contraste de los botones inferiores (era ~1,8:1). Format Explorer: iconos, menú Inicio, categorías y fichas usables con teclado. |
| Analytics | ✅ | Eventos (solo con cookies aceptadas): ver §2. |
| Monitorización de errores | ✅ | Evento `error_app` en GA4 (ver §2). |
| Legal y tiendas | ✅ / pendiente | Política de privacidad actualizada (dictado, conversión local, instalación). Android: pasos en §4, sin publicar todavía. |

## 2. Qué mide GA4 en las apps

Solo si el visitante acepta la analítica. Dentro de una ventana de Format
Explorer o de la portada, el evento se pasa a la página que la contiene.

| Evento | Cuándo | Parámetros |
|---|---|---|
| `app_abierta` | Al abrir la app | `app`, `incrustada` (si/no) |
| `nota_dictada` | Primer dictado de la visita | `idioma` |
| `nota_copiada`, `nota_pdf` | Copiar o pasar a PDF | — |
| `nota_exportada` / `nota_restaurada` | Copia de seguridad | `formato` (html/txt) |
| `archivo_convertido` | Rueda convierte, recorta o añade fondo | `de`, `a` (extensiones) |
| `prompt_copiado` | Escenas: «Copiar prompt» | `modelo`, `salida` (imagen/vídeo) |
| `escena_exportada` / `escena_importada` | Copia de la escena | — |
| `app_lanzada` | Format Explorer abre una app | `destino` |
| `error_app` | Un fallo de JavaScript, o uno controlado (sin WebGL, conversión fallida) | `tipo`, `mensaje`, `fuente` |

En GA4: **Administrar → Definiciones personalizadas → Crear dimensión
personalizada** (ámbito *evento*) para `app`, `tipo`, `mensaje`, `de`, `a` y
`destino`; si no, los parámetros no salen en los informes. Los errores se ven en
**Informes → Interacción → Eventos → error_app**. Puedes crear una alerta en
**Administrar → Estadísticas personalizadas** para que te avise si `error_app`
sube de golpe.

Para el «onboarding» de cada app, el paso que importa es la primera acción útil:
`nota_dictada` o `nota_exportada` en Notes, `archivo_convertido` en Rueda,
`prompt_copiado` en Escenas. Un embudo
*app_abierta → primera acción* en **Explorar → Exploración de embudo** dice
dónde se queda la gente.

## 3. Instalación como PWA

Cada app tiene su manifiesto (`*.webmanifest`), sus iconos (`img/apps/`) y un
alcance propio: se instalan como cuatro aplicaciones distintas. El service
worker `apps/sw.js` (lo registra `js/app.js`) usa «red primero»: con conexión
siempre sirve lo último publicado, y guarda una copia para abrirlas sin
conexión. No hace falta tocar nada al publicar cambios.

- **Android (Chrome)**: menú ⋮ → *Instalar aplicación* (o *Añadir a pantalla de inicio*).
- **Escritorio (Chrome, Edge)**: icono de instalar en la barra de direcciones.
- **iPhone/iPad (Safari)**: Compartir → *Añadir a pantalla de inicio*.

Comprobado en local: los cuatro manifiestos y sus iconos cargan, el service
worker se registra con alcance `/apps/`, y con el servidor apagado Rueda abre
desde la copia (una página no guardada muestra «Sin conexión»).

Para revisarlo en la web publicada: Chrome → F12 → **Application → Manifest**
(sin avisos en *Installability*) y **Service workers**.

Si algún día cambias la estrategia o la lista `PRECARGA` de `apps/sw.js`,
sube `CACHE = 'rp-apps-v1'` a `v2` para que se borre la copia vieja.

### Permisos del navegador

| App | Permiso | Cuándo se pide |
|---|---|---|
| Pantxiko Notes | Micrófono | Solo al pulsar «Dictar». El reconocimiento de voz es del navegador (Google en Chrome, Microsoft en Edge, Apple en Safari). |
| Notes, Escenas | Portapapeles (escritura) | Al pulsar «Copiar»; no suele mostrar aviso. |
| Rueda | Ninguno | Los archivos se eligen con el selector o arrastrándolos. |
| Format Explorer | Ninguno | — |

Ninguna pide ubicación, cámara ni notificaciones. La cabecera
`Permissions-Policy` de `docs/cloudflare-y-publicacion.md` ya deja el micrófono
solo para el propio dominio.

## 4. Google Play (cuando decidas cuál)

La vía más directa es una **Trusted Web Activity (TWA)**: un APK/AAB mínimo que
abre la PWA a pantalla completa con Chrome. La app sigue siendo la web: cada
cambio publicado llega sin subir versión nueva a Play.

**Candidata más sensata: Pantxiko Notes** (funciona sin conexión, el dictado le
da sentido en el móvil). Rueda también encaja. Escenas pide pantalla grande y
Format Explorer es más una curiosidad.

### 4.1 Requisitos previos
1. Que la app pase la instalabilidad de §3 en la web publicada y con **HTTPS
   forzado** (pendiente: Enforce HTTPS en GitHub).
2. Cuenta de **Google Play Console**: pago único de 25 USD y verificación de
   identidad. Las cuentas personales nuevas tienen que hacer una **prueba
   cerrada con al menos 12 testers durante 14 días** antes de poder publicar.
3. Un móvil Android para probar.

### 4.2 Paquete (hecho)
El proyecto Android está **fuera de este repo** (todo lo que entra aquí se
publica en la web), en `aplicaciones/1_Pantxiko_Notes/android/`, la carpeta
hermana de este repo:

- `salida/pantxiko-notes-1.0.0.aab` para Google Play y
  `salida/pantxiko-notes-1.0.0.apk` para instalar a mano en un móvil.
- `firma/`: la clave (`pantxiko-notes.keystore`, alias `pantxiko-notes`) y su
  contraseña. **Haz copia fuera del ordenador**: sin ellas no se pueden subir
  actualizaciones.
- Paquete `com.rubenpantxo.notes`, Android 7.0 o superior (API 24), objetivo
  API 36. Generado con Bubblewrap 1.27.0.
- Cómo recompilar y firmar una versión nueva: `LEEME.md` de esa carpeta.

### 4.3 Digital Asset Links (hecho, a falta de Play)
La TWA solo se ve a pantalla completa si la web declara que la app es suya:

- `/.well-known/assetlinks.json` declara `com.rubenpantxo.notes` con la huella
  de la clave local (`D6:23:B7:…:2A:FB:7B`).
- `.nojekyll` en la raíz: sin él, GitHub Pages pasa el sitio por Jekyll, que
  no publica las carpetas que empiezan por punto. El sitio no usa nada de
  Jekyll (ningún archivo con *front matter*). Como efecto, ahora se sirven
  tal cual los archivos con punto del repo (`.github/`, `.gitignore`…); el
  repo ya es público, así que no se expone nada nuevo.
- El workflow **Monitor** comprueba que `assetlinks.json` siga respondiendo.

**Al subir el primer AAB a Play** (con *Play App Signing*, obligatorio), Google
firma la app con su propia clave: copia su huella SHA-256 de Play Console →
*Integridad de la app → Firma de apps* y **añádela** a la lista
`sha256_cert_fingerprints` sin quitar la actual. Comprobación:
`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://rubenpantxo.com&relation=delegate_permission/common.handle_all_urls`

### 4.4 Ficha de Play Store
| Campo | Requisito |
|---|---|
| Nombre | Hasta 30 caracteres («Pantxiko Notes») |
| Descripción breve | Hasta 80 caracteres |
| Descripción completa | Hasta 4000 caracteres |
| Icono | 512 × 512 PNG (ya está: `img/apps/notes-512.png`) |
| Gráfico de funciones | 1024 × 500 PNG o JPG (hecho: `ficha/` del proyecto Android) |
| Capturas de móvil | Mínimo 2, entre 320 y 3840 px, proporción hasta 2:1 (hechas: 4 de 1080 × 1920 en `ficha/`) |
| Categoría | Productividad |
| Correo de contacto | rubenpantxo@gmail.com |
| Política de privacidad | `https://rubenpantxo.com/legal/privacidad.html` |

### 4.5 Contenido de la app (formularios de Play Console)
- **Acceso a la app**: sin restricciones (no hay login).
- **Anuncios**: no contiene.
- **Clasificación de contenido** (cuestionario IARC): utilidad sin contenido sensible.
- **Público objetivo**: mayores de 13 (la política dice que no está dirigida a menores de 14).
- **Seguridad de los datos**: la app no recoge datos en servidores propios. Si
  la analítica se queda activa, declara *Actividad en la app → interacciones* y
  *Info y rendimiento de la app → registros de fallos*, recogidos, **opcionales**
  (piden consentimiento), no compartidos, cifrados en tránsito. El audio del
  dictado lo procesa el servicio de voz del sistema/Chrome, no la app;
  revísalo con la guía de Google en el momento de rellenarlo.
- **Permisos**: una TWA no declara micrófono en el APK; Chrome lo pide como en
  la web. Pruébalo en el móvil antes de publicar.
- **Nivel de API objetivo**: Play exige uno reciente (lo marca la consola cada
  agosto); PWABuilder y Bubblewrap ya generan el que toca, basta con
  regenerar el paquete cada año.

### 4.6 Riesgos de revisión
Google rechaza apps que solo «envuelven» una web sin aportar nada
(*funcionalidad mínima*). A favor de Notes: funciona sin conexión, guarda en
el dispositivo y tiene dictado. Antes de enviarla conviene que la app no lleve
enlaces que saquen al resto de la web dentro de la TWA.

## 5. App Store (iPhone)
Apple no acepta PWA tal cual. Haría falta envolverla con **Capacitor** (u otra
herramienta), un Mac con Xcode y la cuenta de desarrollador (99 USD/año), y
pasar la guía 4.2 (funcionalidad mínima), más estricta que la de Google. Para
iPhone, *Añadir a pantalla de inicio* desde Safari ya da casi lo mismo gratis.

## 6. Mantenimiento
- **pdf.js** (Rueda) está fijado a 3.11.174 desde cdnjs con su hash. Si lo
  subes a 4.x cambia la forma de cargarlo (módulo `.mjs`) y hay que actualizar
  la URL y el `integrity` (cdnjs da el hash en la página de cada versión).
- **three.js r128** (Escenas) va copiado en `apps/escenas/`; no lo ve
  Dependabot. No hay fallos conocidos que afecten a su uso aquí.
- **Google Fonts** (Escenas: Inter Tight y JetBrains Mono): si quieres quitar
  la última llamada a Google de las apps, se pueden servir desde
  `CSS/fuentes/` como Inter y Kalam.
- Alertas de seguridad de Dependabot: **Settings → Code security →
  Dependabot alerts** (actívalas si no lo están; el archivo
  `.github/dependabot.yml` solo programa los PR de actualización).

## 7. Apps no listadas: Biblioteca e Instagram Downloader

Siguen con `noindex` y fuera del sitemap y de las tiendas; no se instalan como
PWA a propósito (no se anuncian). Sí cargan el aviso de cookies y `js/app.js`
(errores y eventos) cuando se abren en rubenpantxo.com.

**Biblioteca** (`apps/biblioteca/`) es un catálogo fijo: no guarda nada del
usuario. **Instagram Downloader** (`apps/instagram-downloader/`) es la única app
con API: una página que habla con `server.js`, un servidor que cada uno arranca
en su propio ordenador (127.0.0.1:8787) y que llama a yt-dlp.

| Punto | Biblioteca | Instagram Downloader |
|---|---|---|
| API keys y secretos | ✅ Ninguno | ✅ Ninguno. El token de sesión se genera en cada arranque y ya no se imprime en la consola. |
| Permisos de BD y RLS | No aplica | No aplica |
| Autenticación | No aplica | ✅ Token por arranque + `Host` y origen comprobados (sin cuentas) |
| Datos de cada usuario | No aplica | No aplica: cada uno usa su propio servidor local |
| Inyección y XSS | ✅ React escapa todo; datos fijos | ✅ Arreglado: la miniatura iba en `src="…"` escapada sin comillas (inyección de atributos). Ahora se escapan comillas y solo se aceptan miniaturas `https`. A yt-dlp nunca llega texto libre: la URL se rehace desde el código del post. |
| Límites de API | No aplica | ✅ 2 a la vez, 30 consultas y 20 descargas cada 10 min (429 + `Retry-After`), enlaces ≤ 500 caracteres, índice < 50 |
| Dependencias | ✅ React 18.3.1 servido desde el repo (`vendor/`, sacado del registro de npm); Babel y Tailwind ya no se cargan en el navegador. Antes: React, Babel y Tailwind de CDN **sin versión fija** | ✅ Tailwind compilado e incrustado (su CDN no admite comprobar integridad); Font Awesome con SRI. `server.js` no usa paquetes de npm; yt-dlp se actualiza al arrancar `Iniciar.bat`. |
| Endpoints de API | No aplica | ✅ Pruebas automáticas de todos (`npm test`, en la CI) |
| Gestión de errores | ✅ Si un componente falla, aviso con «Recargar» en vez de pantalla en blanco | ✅ Mensajes claros (servidor apagado, sin yt-dlp, foto sin vídeo, Instagram pide sesión, límite); si cierras la página, yt-dlp se para y se borran los temporales, también si falla a medias |
| Información sensible | ✅ — | ✅ En la consola: sin token y con lo que manda el navegador recortado a una línea |
| Pruebas de login | No aplica | No aplica (las del token están en `npm test`) |
| Pagos | No aplica | No aplica |
| Copias de seguridad | No aplica (los datos están en el código) | No aplica (no guarda nada) |
| Responsive | ✅ 375 px sin scroll horizontal | ✅ 375 px sin scroll horizontal |
| Llamadas y tiempos de carga | ✅ De ~3,5 MB (Babel + Tailwind CDN + compilar el JSX en cada visita) a ~240 KB | ✅ Sin los ~400 KB del CDN de Tailwind |
| Estados de carga | ✅ «Cargando la biblioteca…» mientras llega el JS; categoría vacía ya existía | ✅ Ya existían (comprobando, procesando, error, servidor apagado); ahora se anuncian a lectores de pantalla |
| Accesibilidad | ✅ axe: 0 infracciones en categorías, estante y ficha. El texto de «Arte» (granate sobre negro, ~1,5:1) se aclara solo lo necesario | ✅ axe: 0 infracciones. Campo del enlace con etiqueta, estados con `role="status"`/`alert` |
| Analytics | `categoria_abierta`, `libro_abierto` | `video_encontrado`, `video_descargado` (solo desde rubenpantxo.com; en localhost no hay GA) |
| Monitorización de errores | ✅ `error_app` | ✅ `error_app` en la versión web; el servidor local escribe sus errores en su ventana |
| Legal y tiendas | No aplica (no listada) | No aplica (no listada). El LEEME recuerda descargar solo contenido público y para uso personal. |

### Cómo se edita ahora la Biblioteca
El código está en `apps/biblioteca/biblioteca.jsx`. Después de cambiarlo:

```bash
npm install          # la primera vez
npm run build        # biblioteca.js, biblioteca.css y el CSS del Downloader
```

La CI (trabajo **compilados**) falla si los archivos generados no coinciden con
su fuente, así que no se puede publicar un cambio a medias.
