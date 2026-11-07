# Cloudflare, dominio y Search Console

Pasos que no se pueden hacer desde el código. GitHub Pages sigue alojando la
web; Cloudflare se pone delante para lo que GitHub no deja hacer: cabeceras de
seguridad (HSTS, CSP…), redirecciones 301 de verdad y una caché más larga.

Estado comprobado el 7-11-2026 (lo repite el workflow **Monitor**):

- ✅ El CNAME de `www` ya apunta a `rubenpantxo.github.io`, y GitHub Pages lo da
  por válido y apto para HTTPS. Antes apuntaba a `www.rubenpantxo.github.io`,
  que no existe.
- ⏳ `http://rubenpantxo.com` todavía responde **200 sin pasar a https**. GitHub
  está emitiendo el certificado que incluye `www` y, hasta que termine, no deja
  activar «Enforce HTTPS».

Hazlo **en este orden**: primero que GitHub tenga los certificados bien y
fuerce HTTPS; después, Cloudflare.

---

## 1. Arreglar `www` en el DNS actual ✅ (hecho el 7-11-2026)

En el panel de tu proveedor de dominio, cambia el registro de `www`:

| Tipo | Nombre | Valor |
|---|---|---|
| CNAME | `www` | `rubenpantxo.github.io` |

(Ahora pone `www.rubenpantxo.github.io`). Los cuatro `A` del dominio raíz
(185.199.108.153, .109, .110 y .111) están bien y no se tocan.

## 2. Forzar HTTPS en GitHub

Cuando GitHub termine de emitir el certificado (Settings → Pages muestra el
dominio sin avisos, puede tardar desde minutos hasta 24 h):
**Settings → Pages → Enforce HTTPS**. Si no deja marcarlo, el certificado aún
no está listo: espera y vuelve a intentarlo.

## 3. Poner Cloudflare delante (plan gratuito)

1. Crea la cuenta en cloudflare.com → **Add a site** → `rubenpantxo.com` → plan **Free**.
2. Revisa los registros que importa y deja estos, todos con la **nube naranja** (proxied):

   | Tipo | Nombre | Valor |
   |---|---|---|
   | A | `@` | 185.199.108.153 |
   | A | `@` | 185.199.109.153 |
   | A | `@` | 185.199.110.153 |
   | A | `@` | 185.199.111.153 |
   | CNAME | `www` | `rubenpantxo.github.io` |

3. Cloudflare te da dos *nameservers*: ponlos en tu proveedor de dominio en
   lugar de los actuales. Cuando el panel diga **Active**, sigue.

### SSL/TLS
- **Overview** → modo **Full (strict)**. (Si algún día GitHub no puede renovar
  su certificado detrás de Cloudflare y la web da error 526, cambia a **Full**.)
- **Edge Certificates**:
  - Always Use HTTPS: **On**
  - Automatic HTTPS Rewrites: **On**
  - Minimum TLS Version: **1.2**
  - HSTS: **Enable** → Max-Age **6 months**, Include subdomains **On**,
    Preload **Off**, No-Sniff **On**. (Cuando lleve meses sin problemas puedes
    subir a 12 meses y pedir el *preload*.)

### Redirecciones 301 (Rules → Redirect Rules → Single Redirects)

| Nombre | Si… | Entonces (301, conservar la query) |
|---|---|---|
| www a dominio | Hostname equals `www.rubenpantxo.com` | Dynamic: `concat("https://rubenpantxo.com", http.request.uri.path)` |
| index.html a raíz | URI Path equals `/index.html` | Static: `https://rubenpantxo.com/` |
| Sistemas renombrados | URI Path equals `/servicios/sistemas/alba.html` | `https://rubenpantxo.com/servicios/sistemas/editorial.html` |
| | `/servicios/sistemas/halogen.html` | `…/servicios/sistemas/halogeno.html` |
| | `/servicios/sistemas/impulso.html` | `…/servicios/sistemas/neon.html` |
| | `/servicios/sistemas/la-plaza.html` | `…/servicios/sistemas/savia.html` |
| | `/servicios/sistemas/manolo.html` | `…/servicios/sistemas/carmin.html` |
| | `/servicios/sistemas/rincon.html` | `…/servicios/sistemas/terracota.html` |
| Ajedrez | URI Path equals `/juegos/Chess3D/Chess3D.html` | `https://rubenpantxo.com/juegos/Chess3D/` |

Son 9 reglas (el plan gratuito admite 10). Las páginas antiguas siguen en el
repo con redirección por `meta refresh`, así que no se rompe nada si alguna
regla falta. Las apps borradas en la auditoría de seguridad (qibla,
alumbrado-pro, resource-hub, granja) **no** se redirigen: que den 404 es lo correcto.

### Cabeceras de seguridad (Rules → Transform Rules → Modify Response Header)

**Regla 1 · «Cabeceras comunes»** — *All incoming requests* → **Set static**:

| Cabecera | Valor |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Permissions-Policy` | `camera=(), microphone=(self), geolocation=(self), payment=(), usb=()` |

**Regla 2 · «CSP estricta»** — *Custom filter expression* (Edit expression):

```
(http.request.uri.path eq "/") or (http.request.uri.path eq "/index.html") or (http.request.uri.path eq "/404.html") or starts_with(http.request.uri.path, "/legal/") or (starts_with(http.request.uri.path, "/servicios/") and ends_with(http.request.uri.path, ".html") and not starts_with(http.request.uri.path, "/servicios/sistemas/kits/") and not starts_with(http.request.uri.path, "/servicios/sistemas/uiverse/"))
```

→ Set static `Content-Security-Policy`:

```
default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.google.com; connect-src 'self' https://api.web3forms.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.google.com; frame-src 'self'; worker-src 'self' blob:; media-src 'self' data: blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://api.web3forms.com; frame-ancestors 'self'; upgrade-insecure-requests
```

**Regla 3 · «CSP básica»** (juegos, apps y mapas, que cargan mapas, WebAssembly
y librerías de muchos sitios): *Custom filter expression* = la misma de la
regla 2 envuelta en `not (…)` → Set static `Content-Security-Policy`:

```
object-src 'none'; base-uri 'self'; frame-ancestors 'self'; upgrade-insecure-requests
```

La CSP estricta se probó en local en la portada, las 8 demos, las fichas de
sistemas, las legales y la 404 (carga, GA4 tras aceptar, formulario y 3D) sin
ninguna violación. `'unsafe-inline'` sigue siendo necesario porque la portada y
las demos llevan su JS dentro del HTML; aun así la política impide cargar
scripts, iframes o envíos de formulario desde cualquier otro dominio.

### Caché (Caching → Cache Rules)

| Nombre | Si… | Entonces |
|---|---|---|
| Fuentes e imágenes | URI File Extension is in `woff2 png jpg jpeg webp svg ico glb wasm data mp3 ogg` | Eligible for cache · Edge TTL **30 días** · Browser TTL **7 días** |

El HTML, el CSS y el JS se quedan como los sirve GitHub (10 minutos): sus
nombres no cambian al editarlos, y una caché larga mezclaría HTML nuevo con
CSS viejo. Si cambias una imagen o una fuente sin cambiarle el nombre:
**Caching → Configuration → Purge Everything**.

En **Speed → Optimization** activa **Brotli**, **Early Hints** y **HTTP/3**.
Deja **Bot Fight Mode desactivado**: puede bloquear el workflow Monitor.

### Comprobar
Actions → **Monitor** → *Run workflow*. Los avisos de cabeceras, de http→https
y de `www` tienen que desaparecer.

---

## 4. Google Search Console

Sirve para ver qué páginas tiene Google, con qué búsquedas sale la web y qué
errores encuentra al rastrearla. Se tarda unos 15 minutos. Los informes
empiezan a llenarse a los 2 o 3 días.

**Antes de empezar.** Mejor hazlo con *Enforce HTTPS* ya activo (paso 2), para
que Google vea directamente las direcciones `https://`, aunque no es
imprescindible. No hace falta esperar a Cloudflare. Usa la misma cuenta de
Google que tiene GA4, para poder vincularlos en el 4.5.

### 4.1 Crear la propiedad

1. Entra en <https://search.google.com/search-console>.
2. Arriba a la izquierda, abre el selector de propiedades y elige **Añadir
   propiedad**.
3. Elige el recuadro de la izquierda, **Dominio** (no «Prefijo de la URL»).
   Escribe `rubenpantxo.com` sin `https://` ni `www` y pulsa **Continuar**.

   Una propiedad de tipo *Dominio* junta en una sola `http`, `https`, `www` y
   cualquier subdominio. Con «Prefijo de la URL» harían falta varias.

4. Aparece un valor del tipo `google-site-verification=AbC123…`. Cópialo con el
   botón **Copiar** y deja esa ventana abierta.

### 4.2 Verificar con un registro TXT

El valor se añade como registro TXT donde esté el DNS en ese momento.

**Si el DNS sigue en Squarespace** (así está hoy):

1. Ve a <https://account.squarespace.com/domains>, abre **rubenpantxo.com** y
   entra en **DNS** (*DNS settings*).
2. En **Registros personalizados** (*Custom records*), pulsa **Añadir
   registro** (*Add record*):

   | Tipo | Host | Datos | TTL |
   |---|---|---|---|
   | TXT | `@` | `google-site-verification=…` (el valor copiado, completo) | el que venga (1 h) |

3. Guarda. No toques los cuatro `A`, el `CNAME` de `www` ni ningún registro de
   correo que haya. Ya hay dos TXT en `@`, `dub-domain-verification=…` y
   `openai-domain-verification=…`: no los borres. El de Google se añade como
   uno más; un mismo nombre puede tener varios TXT.

**Si ya has pasado a Cloudflare:** ve a **DNS → Records → Add record**, con
Type `TXT`, Name `@`, Content el valor copiado y TTL `Auto`. Los TXT no llevan
nube naranja.

Después, en cualquiera de los dos casos:

4. Vuelve a Search Console y pulsa **Verificar**. Si dice que no encuentra el
   registro, espera de 10 a 60 minutos y pulsa otra vez. Si has cerrado la
   ventana, entra en la propiedad sin verificar: te da el mismo valor.
5. Para comprobar tú que el registro ya se ve:

   ```bash
   nslookup -type=TXT rubenpantxo.com 8.8.8.8
   ```

   En la respuesta tiene que salir la línea `google-site-verification=…`.

> **No borres nunca ese TXT.** Google lo vuelve a comprobar de vez en cuando
> y, si desaparece, pierdes la verificación. Al pasar a Cloudflare (paso 3),
> mira que los tres TXT (Google, dub y openai) estén entre los registros
> importados **antes** de cambiar los nameservers. Si falta alguno, añádelo a
> mano.

Verificar mediante GA4 no funciona aquí. GA4 solo se carga después de aceptar
las cookies, así que Google no encuentra su código al leer la página.

### 4.3 Enviar el sitemap

1. Ve a **Indexación → Sitemaps**.
2. En «Añadir un sitemap nuevo», el prefijo `https://rubenpantxo.com/` ya viene
   puesto. Escribe solo `sitemap.xml` y pulsa **Enviar**.
3. El estado debe quedar en **Correcto** con **29 páginas descubiertas**: la
   portada, las 8 demos y su vitrina, las 12 fichas de sistemas, las 4 apps
   públicas y las 3 legales. Al principio puede salir «No se ha podido
   obtener»: es normal, Google lo reintenta solo.

`robots.txt` ya indica dónde está el sitemap, así que Google lo encontraría de
todas formas. Enviarlo solo adelanta el proceso.

### 4.4 Pedir que indexe las páginas principales

1. Arriba, en la barra **Inspeccionar cualquier URL**, pega
   `https://rubenpantxo.com/`.
2. Pulsa **Probar URL publicada**. Tiene que decir «La URL está disponible para
   Google».
3. Pulsa **Solicitar indexación**.
4. Repítelo con 2 o 3 páginas importantes, por ejemplo
   `https://rubenpantxo.com/servicios/sistemas-de-diseno.html`, una demo y
   `https://rubenpantxo.com/apps/pantxiko-notes.html`. Hay un cupo diario de
   unas 10. El resto lo recoge del sitemap.

### 4.5 Vincular con GA4 (opcional)

1. En GA4 ve a **Administrar → Vinculaciones de productos → Vinculaciones de
   Search Console → Vincular**.
2. Elige la propiedad `rubenpantxo.com` y el flujo web.
3. Los datos salen en **Informes → Search Console**. Si no ves ese apartado, ve a
   **Biblioteca** y publica la colección «Search Console».

### 4.6 Qué revisar a los 3–7 días: Indexación → Páginas

Que haya páginas «sin indexar» no es un error, salvo que sean páginas que
quieres en Google. Esto es lo esperable:

| Motivo que muestra Search Console | Qué páginas | ¿Está bien? |
|---|---|---|
| Excluida por la etiqueta «noindex» | `404.html`, `apps/biblioteca/index_biblio.html`, `apps/instagram-downloader/index_insta_down.html` y las 6 fichas renombradas (`alba`, `halogen`, `impulso`, `la-plaza`, `manolo`, `rincon`) | ✅ A propósito |
| Página con redirección | `www.…`, `juegos/Chess3D/Chess3D.html`; y `http://…` en cuanto esté *Enforce HTTPS* | ✅ |
| Página alternativa con etiqueta canónica adecuada | `/index.html` (y `http://…` mientras no se fuerce HTTPS) | ✅ Su `canonical` apunta a la buena. Pasa a «con redirección» cuando Cloudflare la redirija |
| Bloqueada por robots.txt | `/prototipos/`, `/servicios/sistemas/uiverse/`, `/servicios/sistemas/kits/` | ✅ A propósito |
| No encontrada (404) | Las apps borradas (qibla, alumbrado-pro, resource-hub, granja) | ✅ Desaparecen solas con el tiempo |
| Descubierta o rastreada: actualmente sin indexar | Cualquiera | ⏳ Normal en una web nueva. Si a las 3–4 semanas sigue así una página importante, vuelve a pedir su indexación (4.4) |

Esto **no** debería aparecer. Si aparece, hay algo que arreglar:

- **Duplicada: el usuario no ha indicado ninguna versión canónica.** Las 29
  páginas del sitemap llevan su `canonical`: comprobado el 7-11-2026.
- **Error de servidor (5xx)** o **Error de redirección.** Revisa Cloudflare, sobre
  todo las Redirect Rules.
- En **Experiencia → HTTPS**, páginas «no HTTPS». Esto pasa si *Enforce HTTPS*
  sigue sin activar.

### 4.7 Después

- Cuando añadas o quites una página pública, actualiza `sitemap.xml` (con su
  `lastmod`). Search Console vuelve a leer el sitemap solo.
- Si una página no debe salir en Google, ponle `<meta name="robots"
  content="noindex">` y quítala del sitemap. Bloquearla en `robots.txt` no basta
  y además impide que Google vea el `noindex`.
- Google avisa por correo a los propietarios de los errores graves. No hace falta
  configurarlo.

## 5. Google Analytics 4

- **Administrar → Eventos** → marca `generate_lead` como **evento clave**: es
  el envío correcto del formulario (o la apertura del correo si falla).
- Otros eventos que ya se envían: `cta_click`, `demo_abierta`,
  `demo_pantalla_completa`, `quiero_una_asi`, `ver_sistemas`,
  `contacto_email` y `formulario_error`. Los de las apps (`app_abierta`,
  `archivo_convertido`, `error_app`…) están en `docs/apps-pwa-y-android.md`.
- La política de privacidad dice que los datos se guardan **2 meses** (lo que
  trae GA4 de serie). Si lo cambias en *Administrar → Recogida y conservación
  de datos*, cambia también ese texto en `legal/privacidad.html`.
