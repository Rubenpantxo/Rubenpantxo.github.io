# Rubenpantxo.com

Sitio web personal de Rubenpantxo, alojado en GitHub Pages bajo el dominio [rubenpantxo.com](https://rubenpantxo.com).

Hub estático que reúne aplicaciones, juegos y enlaces propios. Algunas apps son privadas: se muestran con un candado y piden contraseña al abrirlas.

## Estructura

```
.
├── index.html              # Landing principal con secciones y router
├── 404.html                # Página de error
├── CNAME                   # Dominio personalizado
├── .htaccess               # Cabeceras de seguridad y reglas del servidor
├── robots.txt
├── CSS/                    # Estilos globales
├── js/                     # Scripts
├── img/                    # Logos e iconos del sitio
├── docs/                   # Notas internas (guías, recursos)
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
├── apps/                   # Aplicaciones
│   ├── alumbrado-pro/      # (privada)
│   ├── biblioteca/         # (privada)
│   ├── escenas/            # Control de cámara: blocking 3D + generador de prompts
│   ├── format-explorer.html
│   ├── instagram-downloader/   # (privada)
│   ├── pantxiko-notes.html
│   ├── qibla.html          # Brújula Qibla
│   └── resource-hub/       # (privada)
└── juegos/                 # Juegos
    ├── Chess3D/
    ├── cabanillas-drive/   # Compilado de prototipos/cabanillas-drive (npm run publica)
    ├── circle.html
    ├── cesta-punta/
    ├── granja/             # (privada)
    ├── tekken-barrio-ps1/
    └── tetris/
```

## Zona privada

Las apps y juegos marcados con la clase `private-app` se muestran siempre en sus secciones con un candado (🔒). Al hacer clic piden la contraseña en un modal; si es correcta se abre la app y la sesión queda validada (candados en 🔓). La autenticación es cliente-side (hash SHA-256 contra `PASSWORD_HASH` en `index.html`) y la sesión se guarda en `sessionStorage`.

> Nota: como el hash viaja en el HTML, la zona privada solo sirve para ocultar contenido del visitante casual, no protege secretos.

## Stack

- HTML / CSS / JavaScript vanilla
- Tailwind CSS y Font Awesome vía CDN
- Three.js r170 servido desde el repo (`js/vendor/three/`) para las escenas 3D de Servicios
- Sin build step: cualquier servidor estático sirve el sitio
- GitHub Pages como hosting

## Desarrollo local

```bash
python3 -m http.server 8000
# o
npx serve .
```

Luego abre <http://localhost:8000>.

## Licencia

MIT — ver [`LICENSE.txt`](LICENSE.txt).
