# Apps: estado, instalación como PWA y publicación en Android

Afecta a las cuatro apps públicas: **Pantxiko Notes** (`apps/pantxiko-notes.html`),
**Rueda** (`apps/conversor-rueda.html`), **Escenas** (`apps/escenas/`) y
**Format Explorer** (`apps/format-explorer.html`). Biblioteca, Instagram
Downloader, los juegos y el mapa quedan fuera.

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

### 4.2 Empaquetar
- **PWABuilder** (pwabuilder.com → URL de la app → *Package for stores →
  Android*): lo más sencillo; descarga el AAB firmado, la clave y el
  `assetlinks.json`.
- O **Bubblewrap** (`npx @bubblewrap/cli init --manifest https://rubenpantxo.com/apps/pantxiko-notes.webmanifest`,
  luego `bubblewrap build`). Necesita JDK y Android SDK (los instala él).
- Nombre de paquete sugerido: `com.rubenpantxo.notes`.
- **Guarda la clave de firma** (`.keystore` y sus contraseñas) fuera del repo y
  con copia: sin ella no se pueden subir actualizaciones. Activa *Play App
  Signing* en la consola.

### 4.3 Digital Asset Links (para que no salga la barra del navegador)
La TWA solo se ve a pantalla completa si la web declara que la app es suya:

1. Crea `/.well-known/assetlinks.json` con el contenido que da PWABuilder o
   `bubblewrap fingerprint` (huella SHA-256 de la clave de Play App Signing,
   que está en Play Console → *Integridad de la app*).
2. **Ojo con GitHub Pages**: Jekyll ignora las carpetas que empiezan por
   punto. Añade un archivo vacío `.nojekyll` en la raíz del repo (el sitio no
   usa Jekyll para nada) o un `_config.yml` con `include: [".well-known"]`.
3. Comprueba que `https://rubenpantxo.com/.well-known/assetlinks.json`
   responde con el JSON.

### 4.4 Ficha de Play Store
| Campo | Requisito |
|---|---|
| Nombre | Hasta 30 caracteres («Pantxiko Notes») |
| Descripción breve | Hasta 80 caracteres |
| Descripción completa | Hasta 4000 caracteres |
| Icono | 512 × 512 PNG (ya está: `img/apps/notes-512.png`) |
| Gráfico de funciones | 1024 × 500 PNG o JPG (falta) |
| Capturas de móvil | Mínimo 2, entre 320 y 3840 px, proporción hasta 2:1 (faltan) |
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
