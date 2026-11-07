# Cloudflare, dominio y Search Console

Pasos que no se pueden hacer desde el código. GitHub Pages sigue alojando la
web; Cloudflare se pone delante para lo que GitHub no deja hacer: cabeceras de
seguridad (HSTS, CSP…), redirecciones 301 de verdad y una caché más larga.

Estado comprobado el 7-11-2026 (lo repite el workflow **Monitor**):

- `http://rubenpantxo.com` responde **200 sin pasar a https**: «Enforce HTTPS»
  está desactivado en GitHub.
- `https://www.rubenpantxo.com` da **error de certificado**: el CNAME de `www`
  apunta a `www.rubenpantxo.github.io` (no existe) en vez de a
  `rubenpantxo.github.io`, y por eso GitHub no emite certificado para `www`.

Hazlo **en este orden**: primero que GitHub tenga los certificados bien y
fuerce HTTPS; después, Cloudflare.

---

## 1. Arreglar `www` en el DNS actual

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

1. search.google.com/search-console → **Añadir propiedad** → tipo **Dominio** → `rubenpantxo.com`.
2. Copia el registro **TXT** que te da y añádelo en Cloudflare → DNS
   (tipo TXT, nombre `@`). Pulsa **Verificar**.
3. **Sitemaps** → envía `https://rubenpantxo.com/sitemap.xml`.
4. **Inspección de URLs** → `https://rubenpantxo.com/` → *Solicitar indexación*.
5. En unos días, revisa **Indexación → Páginas**: las que aparezcan como
   «Excluida por la etiqueta noindex» deben ser solo la 404, las apps no
   listadas (biblioteca, instagram-downloader) y las redirecciones antiguas.

## 5. Google Analytics 4

- **Administrar → Eventos** → marca `generate_lead` como **evento clave**: es
  el envío correcto del formulario (o la apertura del correo si falla).
- Otros eventos que ya se envían: `cta_click`, `demo_abierta`,
  `demo_pantalla_completa`, `quiero_una_asi`, `ver_sistemas`,
  `contacto_email` y `formulario_error`.
- La política de privacidad dice que los datos se guardan **2 meses** (lo que
  trae GA4 de serie). Si lo cambias en *Administrar → Recogida y conservación
  de datos*, cambia también ese texto en `legal/privacidad.html`.
