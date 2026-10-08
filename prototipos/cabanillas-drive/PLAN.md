# PLAN.md — Cabanillas Drive (prototipo)

> Documento de especificación para Claude Code. Léelo completo antes de escribir código.
> Las reglas de trabajo obligatorias están en `CLAUDE.md`. Si este plan y `CLAUDE.md` chocan, manda `CLAUDE.md`.

---

## 1. Objetivo

Construir un **prototipo web jugable** (Three.js + Rapier) en el que se conduce un coche por una reproducción 3D del casco urbano de **Cabanillas (Navarra)**, generada a partir de datos geográficos oficiales:

- Terreno real (LiDAR, Gobierno de Navarra)
- Ortofoto real como textura del suelo (PNOA, IGN)
- Edificios reales extruidos con su huella catastral y altura medida por LiDAR
- Calles, caminos y agua desde OpenStreetMap
- HUD con velocímetro y minimapa
- Jugable en escritorio (teclado) y móvil (táctil)

Se publicará como sitio estático en GitHub Pages (rubenpantxo.com).

## 2. Contexto del usuario

- Rubén: técnico superior en automatización. Ya ha hecho proyectos Three.js (recorrido en primera persona con joystick táctil, juego de cesta punta) y mapas con Overpass/Leaflet.
- Sistema operativo: **Windows** (PowerShell). Python vía **Miniforge/conda**. Node.js LTS.
- Idioma de comunicación, comentarios y textos del juego: **español**.

## 3. Entradas (las prepara Rubén)

```
data/raw/
├── zona.geojson          # 1 polígono rectangular, EPSG:25830 → define el bbox
├── mdt/                  # MDT 50 cm Gobierno de Navarra (.asc/.tif, posiblemente varias hojas)
├── mds/                  # MDS 50 cm del MISMO año que el MDT
├── catastro/             # Shapefile(s) Catastro de Navarra; capa objetivo: CATASTPolEdificacion
└── orto/                 # VACÍO normalmente (la ortofoto se descarga por WMS). Si existe orto_recorte.tif, úsalo.
config.json               # rutas y parámetros (ver sección 5)
```

Todos los datos brutos están en **EPSG:25830** (ETRS89 / UTM 30N), alturas ortométricas.

## 4. Convenciones espaciales (NO negociables)

- 1 unidad Three.js = **1 metro**.
- **Origen local** = centro del bbox de `zona.geojson`.
- Conversión UTM → local:
  - `x = E − E_centro`
  - `z = −(N − N_centro)` → el norte apunta a **−Z**
  - `y = altura − H_base`, donde `H_base` = cota mínima del MDT dentro de la zona
- Estos valores (`E_centro`, `N_centro`, `H_base`) se guardan en `data/processed/origin.json` y **todos** los scripts los leen de ahí. Ningún script recalcula el origen por su cuenta.

## 5. config.json

```json
{
  "blender_path": "C:/Program Files/Blender Foundation/Blender 4.x/blender.exe",
  "zona": "data/raw/zona.geojson",
  "terrain_resolution_m": 1.0,
  "ortho_px_per_m": 4,
  "ortho_tile_px": 2048,
  "building_height_default_m": 6.0,
  "building_height_min_m": 2.5,
  "building_height_max_m": 40.0,
  "osm_overpass_url": "https://overpass-api.de/api/interpreter"
}
```

## 6. Estructura del proyecto a crear

```
prototipos/cabanillas-drive/
├── CLAUDE.md  PLAN.md  GUIA_RUBEN.md  config.json  PROGRESO.md
├── environment.yml         # conda: python 3.11, gdal, rasterio, geopandas, shapely, pyproj, numpy, pillow, requests
├── package.json            # vite, three, @dimforge/rapier3d-compat, @gltf-transform/cli (dev)
├── vite.config.js          # base: './'
├── index.html
├── tools/                  # pipeline Python (+ script Blender)
├── data/
│   ├── raw/                # IGNORADO por git
│   └── processed/          # intermedios (+ previews/) — IGNORADO por git salvo origin.json
├── public/assets/          # lo que sirve el juego (sí se sube)
└── src/                    # código del juego
```

`.gitignore` debe excluir `data/raw/`, `data/processed/` (excepto `origin.json`), `node_modules/`, `dist/`.

---

## 7. Fases

Cada fase termina con **criterios de aceptación**. Al terminar una fase: actualiza `PROGRESO.md`, resume lo generado y **detente a esperar confirmación** de Rubén.

### FASE 0 — Andamiaje

Tareas:
1. Crear estructura de carpetas, `.gitignore`, `environment.yml`, `package.json`, `vite.config.js`, `index.html`, `src/main.js`.
2. `tools/check_env.py`: imprime versiones de Python, GDAL, rasterio, geopandas, pyproj; verifica que `blender_path` de `config.json` existe y ejecuta `blender --version`.
3. Escena mínima: cielo, luz, plano gris, cámara orbital, texto "Cabanillas Drive — fase 0".
4. Crear `PROGRESO.md` con la tabla de fases.

Aceptación:
- `python tools/check_env.py` sin errores.
- `npm run dev` muestra la escena mínima.

### FASE 1 — Pipeline de datos

**1.0 `tools/00_inspect_raw.py`** — Inventario. Para cada archivo de `data/raw/`: formato, CRS, extensión, resolución, nodata. Informa si MDT y MDS cubren el 100 % de la zona y si son del mismo año. Detecta la capa de edificaciones en `catastro/` y lista sus campos.
→ **Parada obligatoria:** enseña el informe a Rubén antes de seguir.

**1.1 `tools/01_origin_terrain.py`**
- Lee el bbox de `zona.geojson`. Mosaica y recorta MDT y MDS a la zona.
- Calcula y escribe `data/processed/origin.json` (`E_centro`, `N_centro`, `H_base`, ancho, alto, crs).
- Remuestrea el MDT a `terrain_resolution_m`. Asegura dimensiones **(2^n + 1)** por lado cuando sea razonable (p. ej. 1025) para facilitar LOD/heightfield; documenta el paso real resultante.
- Rellena nodata por interpolación.
- Salidas:
  - `public/assets/terrain/terrain.f32` (Float32 little-endian, fila a fila de norte a sur, alturas ya restadas `H_base`)
  - `public/assets/terrain/terrain.json` (filas, columnas, paso_m, tamaño_x_m, tamaño_z_m, altura_min, altura_max)
  - `data/processed/mdt_clip.tif`, `data/processed/mds_clip.tif`, `data/processed/ndsm.tif` (= MDS − MDT)
  - `data/processed/previews/relieve.png` (sombreado)

**1.2 `tools/02_ortho.py`**
- Si existe `data/raw/orto/orto_recorte.tif`, úsalo. Si no, descarga por **WMS del PNOA máxima actualidad del IGN** (`https://www.ign.es/wms-inspire/pnoa-ma`). Verifica con `GetCapabilities` el nombre de capa y el tamaño máximo por petición; pide en teselas, EPSG:25830, JPEG, y ensambla.
- Resolución objetivo: `ortho_px_per_m`. Cortar en teselas de `ortho_tile_px` alineadas con el terreno.
- Salidas: `public/assets/orto/orto_{fila}_{col}.jpg`, `public/assets/orto/orto.json` (rejilla de teselas y su extensión local), `data/processed/previews/orto.jpg` (reducida).
- Si el WMS falla tras 3 reintentos: detente y pide a Rubén la opción manual (GUIA_RUBEN.md, Parte F).

**1.3 `tools/03_buildings.py`**
- Lee `CATASTPolEdificacion`, reproyecta si hace falta, recorta a la zona, descarta polígonos < 8 m².
- Por edificio:
  - `base_y` = mínimo del MDT bajo la huella (local, restando `H_base`)
  - `height` = percentil 90 del nDSM dentro de la huella; limitar a [min, max] de config; si no hay píxeles válidos → `building_height_default_m`
  - simplificar geometría (tolerancia 0,3 m), orientar anillos (CCW exterior)
- Salidas: `public/assets/buildings.geojson` (coordenadas locales x/z, propiedades `id`, `base_y`, `height`), `data/processed/previews/alturas.png` (mapa coloreado por altura).

**1.4 `tools/04_osm.py`**
- Consulta Overpass para el bbox (convertido a WGS84): `highway=*`, `waterway=*`, `natural=water`, `landuse=*`, `leisure=park`, `amenity` relevantes.
- Convertir a coordenadas locales. Separar en `public/assets/osm/calles.geojson`, `caminos.geojson`, `agua.geojson`, `usos.geojson`, `poi.geojson`.
- Guardar respuesta cruda en `data/processed/osm_raw.json` para no repetir peticiones.
- Preview: `data/processed/previews/osm.png` superpuesto a la ortofoto.

Aceptación Fase 1:
- Todas las salidas existen; las 4 previews se ven correctas y **alineadas entre sí** (genera también `previews/superposicion.png` con edificios + calles sobre la ortofoto).

### FASE 2 — Escena 3D (Blender headless)

**2.1 `tools/build_scene.py`** — ejecutar con:
`<blender_path> -b -P tools/build_scene.py -- --root .`
- Usar solo `bpy`/`bmesh` de Blender 4.x (sin addons).
- Terreno: malla desde `terrain.f32`, dividida en **chunks** (p. ej. 4×4), UVs mapeados a las teselas de ortofoto (material por chunk con su tesela).
- Edificios: extrusión desde `buildings.geojson` (base en `base_y`, techo plano en `base_y + height`). Material de fachada neutro (color ocre/blanco típico de la Ribera con ligera variación), techo teja oscura. Agrupar por chunk.
- Exportar `data/processed/cabanillas_raw.glb` (+Y arriba) y guardar también `data/processed/cabanillas.blend` para que Rubén pueda abrirlo.

**2.2 Optimización**
- `npx gltf-transform optimize data/processed/cabanillas_raw.glb public/assets/cabanillas.glb` con compresión de geometría (Draco o meshopt) y texturas WebP/KTX2.
- Informar tamaño final. Objetivo: **< 40 MB** en total para `public/assets/`.

**2.3 Visor de comprobación** en `src/`: carga el GLB con OrbitControls y dibuja encima `calles.geojson` como líneas para verificar alineación.

Aceptación: GLB carga en el navegador, edificios apoyados en el terreno (sin flotar ni hundirse > 0,5 m), calles alineadas con la ortofoto.

### FASE 3 — Conducción

- Física: `@dimforge/rapier3d-compat`.
  - Terreno: **collider heightfield** construido desde `terrain.f32` (NO desde el GLB), mismo paso y escala.
  - Edificios: colliders generados desde `buildings.geojson` (prismas convexos por edificio; si un polígono es cóncavo, usar trimesh).
  - Límites de la zona: muros invisibles en el borde del bbox.
- Vehículo: `DynamicRayCastVehicleController` de Rapier. Chasis caja (4,2 × 1,8 × 1,4 m), 4 ruedas, tracción trasera. Parámetros de suspensión, fricción y par en `src/config/vehicle.js` para ajustarlos fácilmente.
- Modelo del coche: primitivas Three.js (sin assets externos con licencia dudosa).
- Cámara de persecución suavizada (lerp) + tecla/botón para vista capó.
- Controles:
  - Teclado: WASD/flechas, Espacio freno de mano, R reiniciar en la calle más cercana, C cambiar cámara.
  - Táctil: joystick izquierdo (dirección) + botones acelerar/frenar a la derecha. Reutiliza el enfoque de joystick de su proyecto Parcela_Movil si Rubén aporta el archivo; si no, impleméntalo desde cero.
- Punto de inicio: plaza/centro del casco urbano (el nodo de `calles.geojson` más cercano al origen).

Aceptación: se conduce por las calles, el coche no atraviesa edificios ni cae del terreno, 60 FPS en escritorio.

### FASE 4 — HUD

- Velocímetro (km/h) en canvas/HTML, estilo propio (no copiar HUDs de juegos comerciales).
- Minimapa en canvas 2D: calles, agua y edificios desde los GeoJSON; jugador centrado con flecha; rotación opcional según rumbo.
- Brújula / indicador de norte.
- Pantalla de inicio con título "Cabanillas Drive" y botón Jugar.
- Pantalla de **créditos** con atribuciones: © Gobierno de Navarra (LiDAR, Catastro), PNOA cedido por © Instituto Geográfico Nacional, © colaboradores de OpenStreetMap (ODbL).

### FASE 5 — Rendimiento móvil

- Cargar chunks de terreno/edificios por distancia; LOD de edificios lejanos.
- Sombras solo en radio cercano; `renderer.setPixelRatio(min(devicePixelRatio, 1.5))` en móvil.
- Contador FPS con `?debug=1`.
- Objetivo: ≥ 30 FPS en un móvil Android de gama media.

### FASE 6 — Extras (solo si Rubén lo pide)

Bajarse del coche y caminar; tráfico simple siguiendo `calles.geojson`; puntos de interés con carteles; ciclo día/noche.

---

## 8. Publicación

- `npm run build` → `dist/` con rutas relativas (`base: './'`).
- `npm run publica` compila y copia `dist/` a `juegos/cabanillas-drive/` del repo `Rubenpantxo.github.io`
  (Rubén pidió el 2026-10-08 que lo hiciera yo); `npm run web` sirve el sitio entero en el puerto 3100 para probarlo.
- Ningún archivo de `public/assets/` > 50 MB (límite práctico de GitHub).
