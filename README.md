# Rubenpantxo.com

Sitio web personal de Rubenpantxo, alojado en GitHub Pages bajo el dominio [rubenpantxo.com](https://rubenpantxo.com).

Hub estático que reúne aplicaciones, juegos y enlaces propios.

## Estructura

```
.
├── index.html              # Landing principal con secciones y router
├── 404.html                # Página de error (GitHub Pages la sirve para cualquier ruta que no exista)
├── legal/                  # Privacidad, aviso legal y condiciones, cookies
├── CNAME                   # Dominio personalizado
├── .htaccess               # Heredado de Apache: GitHub Pages lo ignora (las cabeceras van en Cloudflare)
├── robots.txt
├── sitemap.xml             # Portada, demos y fichas de sistemas de diseño, páginas legales
├── site.webmanifest        # Nombre e iconos del sitio
├── favicon.ico
├── tailwind.config.js      # Tailwind de la portada → CSS/tailwind.css (npm run css)
├── CSS/                    # Estilos globales (legal.css: legales y 404; fuentes/: Kalam e Inter propias)
├── js/                     # consentimiento.js: aviso de cookies + GA4 · app.js: errores, eventos y PWA de las apps
├── img/                    # Logos, iconos del sitio, imagen al compartir (compartir.png) e iconos de las apps (apps/)
├── docs/                   # cloudflare-y-publicacion.md: DNS, cabeceras, Search Console · apps-pwa-y-android.md: apps, PWA y Google Play
├── servicios/              # Demos de negocio que abre la sección Servicios (visor con móvil)
│   ├── kit/                # Base común: escena Three.js, gestos y estructura (app.css)
│   ├── bar-restaurante.html  # La mesa en 3D: platos que llegan, cuenta dividida, reserva en el plano
│   ├── tienda-ropa.html    # Revista de moda con la prenda colgada en 3D y probador por zonas
│   ├── carniceria.html     # Vitrina y báscula en 3D, papel que se pliega y turnos
│   ├── gimnasio.html       # Mapa muscular 3D, clases y reproductor de entreno
│   ├── supermercado.html   # Cesta 3D con física, Scan & Go y almacén (PIN 1234)
│   ├── granja.html         # La finca como maqueta 3D: tienda de temporada, visitas y sensores
│   ├── industria.html      # Pieza paramétrica, vista de plano y planta en gemelo digital
│   ├── logistica.html      # Mapa en relieve, caja que se mide, reparto y almacén
│   ├── sistemas-de-diseno.html  # Vitrina 3D, catálogo y mezclador de los sistemas
│   └── sistemas/           # Sistemas de diseño (tema.css + selector que usan todas las demos)
├── mapas/                  # Mapas embebidos
│   ├── cabanillas.html     # Plano urbano interactivo de Cabanillas (vector + ortofoto IDENA)
│   └── cabanillas-data.js  # Datos embebidos: Catastro de Navarra (alturas/parcelas) + OpenStreetMap
├── apps/                   # Aplicaciones (las públicas se instalan como PWA: *.webmanifest + sw.js)
│   ├── sw.js               # Service worker «red primero»: apps sin conexión
│   ├── biblioteca/         # (no listada, noindex)
│   ├── conversor-rueda.html  # Rueda: conversor de archivos
│   ├── escenas/            # Control de cámara: blocking 3D + generador de prompts
│   ├── format-explorer.html  # Escritorio estilo Vista que abre todas las apps
│   ├── instagram-downloader/   # (no listada, noindex)
│   └── pantxiko-notes.html # Notas con dictado y copia de seguridad
└── juegos/                 # Juegos
    ├── Chess3D/
    ├── cabanillas-drive/   # Compilado de prototipos/cabanillas-drive (npm run publica)
    ├── cesta-punta/
    ├── circle.html
    ├── pantxo-madness/
    ├── sm64coopdx/
    ├── tekken-barrio-ps1/
    └── tetris/
```

## Stack

- HTML / CSS / JavaScript vanilla
- Tailwind CSS compilado para la portada (`CSS/tailwind.css`): si añades clases nuevas a `index.html`, ejecuta `npm run css`
- Font Awesome vía CDN
- Three.js r170 servido desde el repo (`js/vendor/three/`) para las escenas 3D de Servicios
- Google Analytics 4 (`G-QDLQVMJHMJ`) cargado por `js/consentimiento.js` solo tras aceptar las cookies; fuera de rubenpantxo.com no mide (añade `?ga=1` para probarlo en local)
- Sin build step para servir: cualquier servidor estático sirve el sitio
- GitHub Pages como hosting, con Cloudflare delante (ver `docs/cloudflare-y-publicacion.md`)
- Monitor cada 30 min (`.github/workflows/monitor.yml` + `scripts/monitor.mjs`): abre una issue «caida» si la web falla
- Errores de las apps como evento `error_app` en GA4 (`js/app.js`); dependencias vigiladas por Dependabot (`.github/dependabot.yml`)

## Desarrollo local

```bash
python3 -m http.server 8000
# o
npx serve .
```

Luego abre <http://localhost:8000>.

## Licencia

MIT — ver [`LICENSE.txt`](LICENSE.txt).
