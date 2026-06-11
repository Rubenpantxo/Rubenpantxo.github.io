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
├── mapas/                  # Mapas embebidos
│   ├── cabanillas.html     # Plano urbano interactivo de Cabanillas (vector + ortofoto IDENA)
│   └── cabanillas-data.js  # Datos embebidos: Catastro de Navarra (alturas/parcelas) + OpenStreetMap
├── apps/                   # Aplicaciones
│   ├── alumbrado-pro/      # (privada)
│   ├── biblioteca/         # (privada)
│   ├── format-explorer.html
│   ├── instagram-downloader/   # (privada)
│   ├── pantxiko-notes.html
│   ├── plants/
│   ├── qibla.html          # Brújula Qibla
│   ├── resource-hub/       # (privada)
│   └── rubenpantxo-garden/ # Solo logo; la app vive en un repo privado independiente
└── juegos/                 # Juegos
    ├── Chess3D/
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
