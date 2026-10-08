# Cabanillas Drive — Guía de tareas manuales (Rubén)

Todo lo que tienes que hacer tú, fuera de Claude Code, en orden. Marca cada casilla al terminar.

---

## PARTE A — Instalar programas

### A1. Blender 4.x (LTS)
- Descarga: https://www.blender.org/download/lts/
- Instala con opciones por defecto.
- **Anota la ruta del ejecutable**, normalmente:
  `C:\Program Files\Blender Foundation\Blender 4.x\blender.exe`
  La necesitarás en `config.json`.
- Comprobación: abre PowerShell y ejecuta
  `& "C:\Program Files\Blender Foundation\Blender 4.x\blender.exe" --version`
  → debe mostrar la versión.
- No necesitas BlenderGIS: Claude Code generará la escena con scripts propios. (Opcional, para trastear: https://github.com/domlysz/BlenderGIS)

- [ ] Blender instalado y ruta anotada

### A2. QGIS (versión LTR)
- Descarga: https://qgis.org/download/ → instalador de Windows "Long Term Release".
- Lo usarás para: dibujar la zona, localizar las hojas del mapa y revisar resultados.

- [ ] QGIS instalado

### A3. Miniforge (Python con GDAL sin dolores de cabeza)
- Descarga: https://github.com/conda-forge/miniforge/releases/latest → `Miniforge3-Windows-x86_64.exe`
- Durante la instalación marca "Add to PATH" solo si no tienes otro Python que te importe; si no, usa la consola "Miniforge Prompt".
- Comprobación: en Miniforge Prompt → `conda --version`
- El entorno concreto (`cabdrive`) lo crea Claude Code con un `environment.yml`. Si Claude Code no puede ejecutar conda, lo creas tú con:
  `conda env create -f environment.yml` y luego `conda activate cabdrive`

- [ ] Miniforge instalado

### A4. Node.js LTS
- Descarga: https://nodejs.org/ → botón "LTS".
- Comprobación: `node -v` y `npm -v`

- [ ] Node.js instalado

### A5. Ya lo tienes (solo verifica)
- Git: `git --version`
- VS Code
- Claude Code: `claude --version`

- [ ] Todo verificado

---

## PARTE B — Preparar la carpeta del proyecto

1. En tu repo local `Rubenpantxo.github.io`, crea:
   ```
   prototipos/cabanillas-drive/
   prototipos/cabanillas-drive/data/raw/mdt/
   prototipos/cabanillas-drive/data/raw/mds/
   prototipos/cabanillas-drive/data/raw/orto/
   prototipos/cabanillas-drive/data/raw/catastro/
   ```
2. Copia dentro de `prototipos/cabanillas-drive/` los archivos que te he generado:
   `PLAN.md`, `CLAUDE.md`, `config.json`, `GUIA_RUBEN.md`.
3. Edita `config.json` y pon la ruta real de `blender.exe`.

- [ ] Carpetas creadas y archivos copiados
- [ ] `config.json` con la ruta de Blender

---

## PARTE C — Definir la zona del juego en QGIS

**Resultado:** `data/raw/zona.geojson` (un único rectángulo).

1. Abre QGIS → Proyecto nuevo.
2. Abajo a la derecha, cambia el SRC del proyecto a **EPSG:25830** (ETRS89 / UTM 30N).
3. Añade un mapa de fondo: Panel Navegador → **XYZ Tiles → OpenStreetMap** (doble clic).
4. Haz zoom a Cabanillas.
5. Capa → Crear capa → **Nueva capa temporal de borrador**:
   - Tipo de geometría: **Polígono**
   - SRC: **EPSG:25830**
6. Activa la edición (lápiz) → Barra de digitalización de formas → **"Añadir rectángulo desde extensión"** (si no la ves: Ver → Barras de herramientas → Digitalización de formas).
7. Dibuja el rectángulo sobre el casco urbano. **Máximo 1,5 × 1,5 km** para el primer prototipo. Guarda la edición.
8. Clic derecho en la capa → Exportar → **Guardar objetos como…**
   - Formato: **GeoJSON**
   - Archivo: `prototipos/cabanillas-drive/data/raw/zona.geojson`
   - SRC: **EPSG:25830**

- [ ] `zona.geojson` guardado

---

## PARTE D — Descargar el terreno y las superficies (Gobierno de Navarra)

**Resultado:** archivos MDT y MDS del mismo año en `data/raw/mdt/` y `data/raw/mds/`.

La diferencia MDS − MDT da la altura de los edificios, por eso necesitas **los dos del mismo año y resolución**.

1. Abre el repositorio: https://filescartografia.navarra.es/6_MDE/
2. Lee primero `_leeme.txt` de esa carpeta: explica la nomenclatura. Los archivos se llaman así:
   `MDT_<hoja10000>_<año>_EPSG25830_<resolución>` (p. ej. `MDT_0064_43_2017_EPSG25830_50cm`).
3. **Averigua qué hojas 1:10.000 cubren tu zona:**
   - En esa misma carpeta hay una malla `malla_IGN_10000_EPSG25830` (shape). Descárgala.
   - Ábrela en QGIS junto a `zona.geojson`.
   - Anota los códigos de todas las hojas que toca el rectángulo (pueden ser 1, 2 o 4).
4. Elige el **año LiDAR más reciente** que haya para esas hojas y resolución **50 cm**.
5. Descarga para cada hoja:
   - El **MDT** → descomprime en `data/raw/mdt/`
   - El **MDS** → descomprime en `data/raw/mds/`
6. Comprueba en QGIS que los rásteres cubren todo el rectángulo sin huecos.

**Alternativa** si algo falla: Centro de Descargas del CNIG, producto "MDT50 cm – 3ª cobertura" (incluye Navarra): https://centrodedescargas.cnig.es/CentroDescargas/buscadorCatalogo.do?codFamilia=LIDAR
(El CNIG no ofrece MDS a 50 cm en ese producto; en ese caso habría que calcular alturas de otra forma. Prioriza Navarra.)

- [ ] Hojas identificadas: ______________________
- [ ] MDT descargados
- [ ] MDS descargados (mismo año)

---

## PARTE E — Descargar los edificios del Catastro de Navarra

**Resultado:** shapefile de edificaciones en `data/raw/catastro/`.

Opción 1 (por municipio, recomendada):
1. https://catastro.navarra.es/descargas/
2. Escribe "Cabanillas", selecciónalo y descarga la cartografía.
3. Descomprime en `data/raw/catastro/`. Buscamos la capa **CATASTPolEdificacion** (polígonos de edificaciones). Si vienen más capas, déjalas todas: Claude Code elegirá.

Opción 2 (repositorio general):
- https://filescartografia.navarra.es/2_CARTOGRAFIA_TEMATICA/2_7_CATASTRO/
- Lee el `_leeme.txt` y descarga el ZIP que contenga `CATASTPolEdificacion`.

Opción 3 (a medida): visor IDENA https://idena.navarra.es/navegar/ → herramienta "Descargar" sobre tu zona, capa de edificaciones de Catastro.

- [ ] Edificios descargados

---

## PARTE F — Ortofoto

**No tienes que hacer nada**: Claude Code la descargará automáticamente del servicio WMS del PNOA para tu zona exacta.

Solo si el WMS fallase, Claude Code te pedirá hacerlo a mano. En ese caso:
1. Descarga la ortofoto PNOA de máxima actualidad de https://filescartografia.navarra.es/3_ORTOFOTOGRAFIA/ o del CNIG.
2. En QGIS: Ráster → Extracción → **Cortar ráster por extensión**, usando `zona.geojson` como extensión.
3. Guarda como GeoTIFF: `data/raw/orto/orto_recorte.tif`

---

## PARTE G — Arrancar Claude Code

1. Abre una terminal en `prototipos/cabanillas-drive/`.
2. Ejecuta `claude`.
3. Pega el prompt de arranque (está en el chat donde te preparé esto).
4. Claude Code se detendrá al final de cada fase y te pedirá revisar. Tus revisiones:

| Fase | Qué revisas tú | Dónde |
|---|---|---|
| 0 | La página de prueba abre con `npm run dev` | Navegador |
| 1 | Imágenes de previsualización: relieve, ortofoto, alturas de edificios, calles | `data/processed/previews/` |
| 2 | La escena 3D cargada y alineada | Blender o visor web |
| 3 | Conducir: sensación del coche, colisiones | Navegador + móvil |
| 4 | HUD y minimapa | Navegador + móvil |
| 5 | FPS en el móvil | Móvil |

**Probar en el móvil:** con `npm run dev -- --host` y abres la IP local que te muestre desde el móvil (misma WiFi).

---

## PARTE H — Publicar (cuando esté listo)

1. Claude Code generará la versión final con `npm run build`.
2. Copia el contenido de `dist/` a `juegos/cabanillas-drive/` en el repo.
3. `git add`, `commit` y `push` → rubenpantxo.com/juegos/cabanillas-drive/

**Atribuciones obligatorias** (Claude Code las pondrá en una pantalla de créditos):
- © Gobierno de Navarra (datos LiDAR y Catastro)
- PNOA cedido por © Instituto Geográfico Nacional
- © Colaboradores de OpenStreetMap (ODbL)
