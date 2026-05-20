# Rubenpantxo.com

Sitio web personal de Rubenpantxo, alojado en GitHub Pages bajo el dominio [rubenpantxo.com](https://rubenpantxo.com).

Hub estático que reúne aplicaciones, juegos y enlaces propios. Incluye una zona privada con autenticación por contraseña para apps de uso personal.

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
├── apps/                   # Aplicaciones
│   ├── alumbrado-pro/      # (privada)
│   ├── arbol-genealogico/  # Árbol genealógico
│   ├── biblioteca/         # (privada)
│   ├── format-explorer.html
│   ├── gueb_y_jitjub.html
│   ├── instagram-downloader/   # (privada)
│   ├── pantxiko-notes.html
│   ├── plants/
│   ├── qibla.html          # Brújula Qibla
│   ├── resource-hub/       # (privada)
│   └── rubenpantxo-garden/ # Solo logo; la app vive en un repo privado independiente
└── juegos/                 # Juegos
    ├── Chess3D/
    ├── circle.html
    ├── flappy-bardenas.html
    ├── granja/             # (privada)
    ├── tekken-barrio-ps1/
    └── tetris/
```

## Zona privada

Algunas apps y juegos están marcados con la clase `private-app` y permanecen ocultos hasta que el usuario se autentica desde el icono de la esquina superior derecha del index. La autenticación es cliente-side (hash SHA-256 contra `PASSWORD_HASH` en `index.html`) y la sesión se guarda en `sessionStorage`.

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
