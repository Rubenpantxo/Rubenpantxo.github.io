# PROGRESO — Cabanillas Drive

**Fase actual:** 6 — Extras **hecha, pendiente del OK de Rubén** (pedida el 2026-10-05): tráfico, caminar, carteles y ciclo día/noche.

**Siguiente (decidido por Rubén el 2026-10-05):** plan de realismo en `PLAN_REALISMO.md` (R1 árboles y vegetación → R2 tejados LiDAR → R3 render → R4 splats), antes de la fase 4. Pausa pedida por Rubén para recargar su uso.
- **R1 hecho (2026-10-05), pendiente del OK de Rubén:** `tools/08_arboles.py` (4 640 árboles del LiDAR, tipos con correcciones en `tools/arboles_tipos.json`, troncos fuera de la calzada) → `tools/texturas_arboles.py` → `npm run arboles` (9 variantes EZ-Tree/palmera, 0,9 MB) → `src/escena/arboles.js` (3D a < 90 m, impostores más lejos, viento, cilindro de colisión por tronco). `tools/08b_vegetacion_baja.py` → `src/escena/hierba.js` (césped y rastrojo en 3D a < 60 m con el color de la ortofoto). Galería de modelos: `?arboles`. Coste medido: ~1,7 ms por fotograma en la zona más cargada. R1 aprobado.
- **R2 hecho (2026-10-05), pendiente del OK de Rubén:** `tools/09_tejados.py` ajusta 1–4 faldones por RANSAC al MDS (tejado = mínimo de los planos, cumbreras exactas) o, si no cuadra, malla de rejilla del MDS; aleros de 0,3 m con canto; muros con la altura real del borde del tejado. 1 313 tejados de planos, 496 de rejilla, 3 planos por defecto. Error medio tejado − MDS 0,107 m (mediana 0,061). `tejados.json` + `tejados.bin` (2,6 MB, 1,1 MB comprimido). R2 aprobado.
- **R3 hecho (2026-10-05), pendiente del OK de Rubén:** `tools/10_sol.py` estima el sol del vuelo de la ortofoto correlacionando sombras del nDSM con lo oscuro de la foto (acimut 201°, elevación 65°). `src/escena/render.js`: sombras del sol en una caja que sigue a la cámara, oclusión ambiental N8AO + SMAA + OutputPass; reflejos del propio cielo (sin RoomEnvironment). `suelo.js`: el terreno recibe sombras 3D solo donde la foto está al sol, y detalle de cerca (`tools/11_suelo.py`: calzada/acera/tierra + texturas de asfalto, baldosa y tierra dibujadas). Calidad alto/medio/bajo en `src/config/calidad.js` (`?calidad=`; móvil → bajo). Render completo ≈ 7 ms a 1280×720. Rubén autorizó las descargas: cielo HDRI de Poly Haven (`tools/12_cielo.py`, girado para que su sol coincida con el de la ortofoto) y texturas de ambientCG para el suelo (`tools/11_suelo.py` las usa si están). 09_tejados: sin copas de árbol (píxeles verdes) y techo plano en edificios estrechos o con rejilla mala (error medio 0,090 m). Siguiente: R4 (splats, necesita capturas).

**Orden del pipeline:** `00_inspect_raw` → `01_origin_terrain` → `02_ortho` → `03_buildings` → `04_osm` → `05_superposicion` → `06_aspecto` → Blender `build_scene.py` → `npm run escena`.

## Fases

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Andamiaje | Hecha: `npm run dev` y `check_env.py` en `cabdrive` sin errores |
| 1 | Pipeline de datos | Hecha y revisada |
| 2 | Escena 3D (Blender headless) | Hecha y revisada; edificios con aspecto individual |
| 3 | Conducción | Hecha (pendiente de revisión de Rubén) |
| 4 | HUD | Hecha, pendiente del OK |
| 5 | Rendimiento móvil | Hecha, falta medir en un Android real |
| 6 | Extras (tráfico, a pie, carteles, día/noche) | Hecha, pendiente del OK |

## Hecho

### Fase 0
- Estructura de carpetas, `.gitignore`, `environment.yml`, `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/config/calidad.js`.
- Escena mínima: cielo (`Sky`), luz hemisférica + sol con sombras, plano gris de 3 × 3 km, cubo de referencia de 4 m, cámara orbital (ratón y táctil), rótulo "Cabanillas Drive — fase 0".
- `npm install` hecho (three 0.180, vite 7.3, rapier3d-compat 0.14). `npm run dev` comprobado en escritorio y en móvil (375 px), sin errores de consola. `npm run build` correcto.
- `tools/comun.py` (rutas desde `config.json` con `pathlib`) y `tools/check_env.py`.

### Fase 1
- `tools/00_inspect_raw.py`: inventario de `data/raw/` → `data/processed/informe_raw.md`. Probado con `data/raw/` vacío y con datos sintéticos fuera del proyecto (detecta falta de CRS, cobertura < 100 %, años distintos y Catastro dentro de ZIP).

## Pendiente
- [ ] Rubén: probar la conducción y decir qué ajustar (sensación del coche, cámara, controles táctiles).
- [x] Fase 4 (HUD): `src/hud/` — velocímetro de aguja (canvas), minimapa circular precalculado desde los GeoJSON
  (calles, caminos, agua, parques, edificios; gira con el rumbo o norte arriba con M/clic; se aleja con la velocidad),
  brújula en franja con grados, pantalla de inicio (progreso de carga, Jugar, calidad, controles), pausa (Esc/P/☰) con
  la cámara girando alrededor del coche y la física parada, y créditos con todas las atribuciones. Ajustes en
  `src/config/hud.js`. Diseño adaptado a móvil (pantalla táctil: minimapa y velocímetro arriba).
- [x] Fase 5 (rendimiento móvil), medido en el PC con calidad «bajo» y pantalla de móvil (375×812):
  | | antes | después |
  |---|---|---|
  | paso de física (Rapier) | 4,8 ms | 0,17 ms |
  | llamadas de dibujo (calle) | 586 | 124–130 |
  | triángulos (calle) | 2,47 M | 0,53 M |
  | CPU de render (calle) | 20,8 ms | 2,4 ms |
  | memoria de texturas | 271 MB | ~105 MB |
  | descarga del móvil | ~43 MB | ~20 MB |
  - Física: los obstáculos fijos (edificios, árboles, coches aparcados) se activan solo cerca del coche
    (`creaGestorColisiones`, radio 45 m + anticipación 0,8 s). Con los 6 723 activos cada paso costaba ~5 ms.
  - Coches aparcados en 3 niveles: modelo completo / versión ligera / coche genérico instanciado (2 llamadas para
    todos); más allá del máximo no se dibujan. Mallas vacías ocultas (no piden llamadas).
  - Edificios por celdas de 250 m con LOD: techo plano para todos y tejados del LiDAR solo en las celdas cercanas
    (se generan al acercarse y se liberan al alejarse).
  - Calidad «bajo»: terreno simplificado (error ≤ 8 cm) con ortofoto a 768 px (`cabanillas_bajo.glb`), atlas de
    tejados a la mitad, niebla y plano lejano a 1,3–1,4 km, sin sombras de edificios (ya están pintadas en la foto),
    coche del jugador con materiales agrupados (36 → 12 piezas), proporción de píxeles 1 y resolución dinámica
    (objetivo 30 FPS, mínimo 60 %).
  - Alturas en Uint16 (`terrain.u16`, la mitad que el Float32). `npm run movil` genera las variantes.
  - Contador con `?debug=1`: FPS, ms, llamadas, triángulos, colisiones activas, calidad y resolución.
  - Falta: medir en un Android de gama media real (objetivo ≥ 30 FPS en «bajo»).
- [x] Fase 6 (extras):
  - Tráfico (`src/juego/trafico.js`, `src/datos/grafoCalles.js`): coches cinemáticos por el grafo dirigido de
    `calles.geojson` (respeta los sentidos únicos), siguen al de delante y reaparecen fuera de la vista.
  - A pie (`src/juego/peaton.js`): E/F (o 🚶) para bajarse con el coche parado; cápsula con el controlador de
    personaje de Rapier (bordillos, choques); ratón con clic para mirar, Mayús para correr.
  - Carteles (`src/escena/carteles.js`): 11 lugares de `poi.geojson` con icono sobre el edificio y 44 placas de
    nombre de calle en las fachadas de las esquinas; iconos en el minimapa; «Ir a…» en la pausa.
  - Día y noche (`src/escena/cicloDia.js`, `src/config/dia.js`, `src/juego/luces.js`): el sol recorre el camino del
    día del vuelo (declinación y hora sacadas de `sol.json` y la latitud: la foto es de las 14:43); de noche, luna,
    estrellas y cielo calculado fundido con el fotográfico; la ortofoto se oscurece y recibe la luz de la luna y los
    faros; faros reales en el coche y puntos de faros y pilotos en el tráfico. Selector «Hora» en inicio y pausa
    (hora de la foto, ciclo de 24 min, mañana, atardecer, noche; se recuerda) y T para adelantar una hora.
    Sin ventanas iluminadas ni farolas: no hay datos de farolas y las fachadas no tienen ventanas modeladas.
  - Calidad alta más robusta: el AO no se crea a 0×0 si la página se abre en un panel oculto y se avisa si la GPU
    retira el contexto WebGL (pasaba con varias pestañas del juego abiertas a la vez en calidad alta).

- [x] Pantallas (petición de Rubén, 2026-10-05): inicio solo con la portada (`public/ui/portada.webp`, imagen de
  Rubén), barra de carga, Jugar, Calidad y Hora; sin lema, sin párrafo de controles y sin Créditos (siguen en la pausa).
  La barra cuenta los bytes de **todas** las descargas (`src/hud/progresoCarga.js` envuelve `fetch`; antes solo el GLB y se
  quedaba parada al 100 %), con estimación por nivel en `calidad.js` (`descargaEstimadaMB`: 22 alto/medio, 13 bajo).
  Si en 25 s no avanza nada, ofrece «Recargar» y «Probar con calidad baja». El desplegable de Hora tiene sus opciones desde
  el principio (antes esperaba al cielo y salía vacío); lo elegido antes de cargar se aplica al crear el ciclo.
  Pausa: Continuar, **Controles** (captura del juego con marcas numeradas y leyenda; pestañas teclado / táctil, empieza
  por la del aparato; capturas en `public/ui/controles_*.webp`), Ir a…, Calidad, Hora y Créditos. Al empezar a jugar
  aparece 6 s «Esc / ☰: pausa y controles». Medido en local: 2,6 s en frío (escritorio, 22 MB por fetch), 0,7 s en móvil.
  Abierto: en móvil apaisado el velocímetro tapa parte del botón ▲.

### Fase 2b — Aspecto individual de los edificios (petición de Rubén, 2026-10-05)
- [x] `03_buildings.py` lee los rótulos `CATAST_Txt_EdifAlturas`: plantas reales (1101 de 1 planta, 653 de 2, 55 de 3, 3 de 4), porches/tejavanas (168) y singulares; descarta sótanos sin nada sobre rasante. Marca 4503 lados medianeros.
- [x] `06_aspecto.py`: atlas `tejados.jpg` (4096×2048, 1,7 MB) con la ortofoto de cada tejado y 1556 fachadas a la calle.
- [x] Edificios generados en el navegador (`src/escena/edificios.js`): tejado con su foto real y fachadas procedurales (`fachadas.glsl.js`): enfoscado/ladrillo/piedra/nave/hormigón/porche, ventanas por planta con persianas, balcones, puertas y portones solo en fachadas a la calle, medianeras ciegas, zócalo y cornisa. Cada casa distinta (semilla por id).
- [x] El GLB pasa a llevar solo el terreno (12,2 MB); los edificios siguen en `cabanillas.blend` para revisarlos.

### Coches 3D (petición de Rubén, 2026-10-05)
- [x] `tools/build_coches.py` (Blender) + `tools/coches.json`: 13 de los 17 modelos descargados (4 solo existen en .max de 3ds Max, que no se puede abrir). Limpieza (suelos, esqueletos, interiores), alineado automático por componentes principales, escala a su largo real, reducción a ~9 000 triángulos (+ versión de 1 500 para lejos), pintura teñible. `npm run coches` → `public/assets/coches/` (2,5 MB).
- [x] Coche del jugador: Toyota Land Cruiser con ruedas separadas; caja de colisión, anclajes y radio de ruedas salen del modelo.
- [x] `tools/07_coches_orto.py`: detector YOLO11-OBB (Ultralytics, DOTA) sobre la ortofoto → 271 coches con posición, orientación (circulación por la derecha), largo y color; se borran de la ortofoto y se vuelven a cortar las teselas (luego Blender + `npm run escena`).
- [x] Juego: coches aparcados instanciados con el color de la foto y el modelo de largo más parecido, con caja de colisión fija; LOD por distancia (70 m): 2,45 M → ~0,7 M triángulos.

### Fase 3
- [x] Física Rapier (`src/fisica/fisica.js`): heightfield desde terrain.f32 (1501×1401), 1104 edificios como prisma convexo y 708 como trimesh (cóncavos o con patio), muros invisibles en el borde.
- [x] Coche (`src/vehiculo/`): DynamicRayCastVehicleController, chasis 4,2×1,8×1,4 m, 1250 kg, tracción trasera, modelo con primitivas. Parámetros en `src/config/vehiculo.js`.
- [x] Cámara de persecución suavizada que se acerca si un edificio tapa, y vista capó (C). `src/config/camara.js`.
- [x] Controles: WASD/flechas, Espacio freno de mano, R recolocar en la calle más cercana, C cámara; táctil con joystick izquierdo (aparece donde se toca) y botones acelerar/frenar/mano + cámara/recolocar.
- [x] Salida en el nodo de calle más cercano al origen; recolocación automática si cae y aviso si vuelca.
- [x] Pruebas automáticas en el navegador: 0→41 km/h en 4 s en línea recta (desvío 4 cm), frena de 41 a 0 en ~1,3 s, D gira a la derecha, 3 choques frontales a ~54 km/h contra edificios del casco: se para a 2,1 m de la fachada (no atraviesa). 165 FPS en el escritorio. Joystick y botones táctiles comprobados. `npm run build` correcto (dist 33,6 MB).
- [x] Visor de la fase 2 disponible con `?visor`; FPS con `?debug`.
- [x] Rubén: instalar Miniforge (GUIA A3).
- [x] Claude: entorno `cabdrive` creado; `check_env.py`: Python 3.11.16, GDAL 3.12.3, rasterio 1.4.4, geopandas 1.2.0, pyproj 3.7.2, Blender 5.0.1 → todo correcto.
- [x] Datos en `data/raw/`: zona 1500 × 1400 m (E 621222–622722, N 4653842–4655242); MDT y MDS 2024 a 50 cm, hojas 0282_44 y 0283_14; Catastro municipal (`CATAST_Pol_Edificacion`, 2220 huellas en la zona).
- [x] Informe 1.0: cobertura 100 % de MDT y MDS, mismo año, sin bloqueantes.
- [x] 1.1 `01_origin_terrain.py` (OK de Rubén el 2026-10-05): origin.json, terreno 1501×1401 a 1 m, recortes, nDSM y relieve.png.
- [x] 1.2 `02_ortho.py`: PNOA por WMS (capa OI.OrthoimageCoverage, máx. 4096 px), 6000×5600 px a 4 px/m → 4×4 teselas de 1500×1400 px (9 MB), `orto_mosaico.tif`, `orto.jpg`.
- [x] 1.3 `03_buildings.py`: 2220 polígonos en la zona, 405 < 8 m² descartados → 1815 edificios (0,4 MB). Alturas mediana 6,7 m, p90 8,8, máx 15,9; 11 limitados a [2,5, 40]; ninguno sin nDSM. `alturas.png`.
- [x] 1.4 `04_osm.py`: 423 elementos → 90 calles, 245 caminos, 5 agua, 58 usos, 13 POI. `osm.png`.
- [x] `05_superposicion.py`: `superposicion.png` (2 px/m) y `superposicion_detalle.png` (400 m a 4 px/m). Huellas sobre tejados y ejes OSM sobre calzadas: alineados.
- [x] Repetir 02–04 desde caché deja `public/assets/` idéntico (17,5 MB en 25 archivos; objetivo < 40 MB).
- [x] Rubén revisó la fase 1 y decidió **no** commitear `public/assets/` (2026-10-05).

### Fase 2
- [x] 2.1 `tools/build_scene.py` (Blender 5.0.1, ~15 s): 16 chunks de terreno (4,2 M triángulos, UV a su tesela), 1815 edificios en 12 chunks con fachada en color de vértice y teja oscura. `cabanillas_raw.glb` (78 MB) y `cabanillas.blend`. Ningún edificio flota > 0,5 m (máx. 0,20 m) ni tiene el tejado bajo el terreno.
- [x] 2.2 `npm run escena` (gltf-transform optimize, meshopt + WebP, simplificación con bordes bloqueados): **12,5 MB**; terreno 657 k triángulos, edificios 26 k. `public/assets/` total ≈ 30 MB.
- [x] 2.3 Visor en `src/`: GLB + calles OSM sobre el terreno (L / botón para ocultarlas) y comprobación GLB ↔ terrain.f32 por rayos: media 1,0 cm, p95 2,8 cm, máx. 7,1 cm. Probado en escritorio y móvil, sin errores. `npm run build` correcto (dist 30 MB).

## Pendiente de Rubén (lo hará más adelante; no recordárselo en cada informe)
- R4: capturas de Scaniverse de 3–5 edificios en `data/raw/splats/<nombre>/` (instrucciones en `PLAN_REALISMO.md`).
- Probar en su Android: `npm run dev:red` y abrir `http://<IP del PC>:5173/?debug=1` (objetivo ≥ 30 FPS en «bajo»).
- Ajustes cuando quiera: tipos de árbol en `tools/arboles_tipos.json`, HUD en `src/config/hud.js`, calidad en
  `src/config/calidad.js`.

## Decisiones
- Rubén pide usar todos sus modelos de coche aunque no traigan licencia (2026-10-05): se salta la regla de assets de CLAUDE.md para ellos. Atribuciones en `CREDITOS.md`. Los 2 de slowpoly son CC-BY-4.0.
- Pipeline completo: 00 → 01 → 02 → 03 → 04 → 05 → 06 → 07_coches_orto → 08_arboles → 08b_vegetacion_baja → 09_tejados → 10_sol → 11_suelo → 12_cielo → Blender `build_scene.py` → `npm run escena` → `npm run movil` (variantes para móvil y alturas Uint16); coches: Blender `build_coches.py` → `npm run coches`; árboles: `texturas_arboles.py` → `npm run arboles`.
- Edificios del juego generados en el navegador desde buildings.geojson (no desde el GLB): mismo dato para gráficos y física, atributos por muro para las fachadas procedurales y sin problemas de cuantización de UV en gltf-transform.
- Los rótulos PAV/J/SUELO/PISCINA del Catastro están fuera de las huellas de edificación (son patios de parcela): no generaban cajas falsas.
- Ejes del coche: Z adelante, Y arriba (la izquierda es +X). `setIndexForwardAxis = 2`, eje de rueda (−1, 0, 0): comprobado que la fuerza positiva empuja hacia delante y que D gira a la derecha.
- Colliders de edificios bajan 2 m por debajo de base_y para que no queden huecos con el terreno.
- Origen: E_centro 621972, N_centro 4654542, H_base 243,842 m (mínimo del MDT 0,5 m en la zona).
- Terreno a **1 m exacto, 1501×1401 vértices**, sin 2^n+1: con 1500×1400 m daría celdas no cuadradas (1,465×1,367 m con 1025 o 0,73×0,68 m con 2049). Los chunks 4×4 de la fase 2 salen exactos (375×350 celdas).
- Cada vértice es la media de los píxeles de 0,5 m de su celda de 1 m, ponderada por área: los .asc de Navarra tienen `xllcorner` en .875 (centros en .125/.625), así que no coinciden con los metros enteros. Comprobado contra el MDT original: 0,00 cm.
- Huecos: el MDT se rellena por interpolación (3 px en la zona); el MDS se deja sin dato. Solapes entre hojas: MDT ±8 cm, MDS hasta 1,7 m en puntos aislados (manda la hoja 0282_44).
- Ortofoto: rejilla de N×N teselas alineada con el terreno (cada tesela, nº entero de celdas y ≤ ortho_tile_px). Con 1500×1400 m sale 4×4 de 375×350 m, que coincide con los chunks 4×4 previstos para la fase 2. Se pide al WMS en bloques ≤ 4096 px y se cachea en `data/processed/orto_wms/`.
- Edificios: el Catastro trocea las construcciones en volúmenes (mediana 46 m²); se respeta. En 70 edificios el techo medido por MDS difiere > 1 m (máx. 3 m) de base_y + height por estar en pendiente; se sigue el PLAN (p90 del nDSM). Coordenadas [x, z] con anillo exterior CCW en ese plano.
- OSM: `highway=pedestrian` va a caminos (no se circula en coche). Overpass dio un 504 al primer intento y respondió al segundo.
- `CATAST_Txt_EdifAlturas` trae rótulos de plantas (I, II, SS+II, PISCINA…): no se usa ahora; podría servir para afinar alturas o tipos más adelante.
- `public/assets/` **no se commitea** (decisión de Rubén): está en `.gitignore`; se regenera con los scripts y el juego publicado lo lleva en `dist/`.
- Altura de edificios: p90 del **MDS** − base (en vez del p90 del nDSM del PLAN). En llano es lo mismo; en pendiente deja el tejado a su cota real (70 edificios ganaban hasta 3 m). Respaldo: nDSM y después la altura por defecto.
- Ejes: Blender se construye en (x, −z, y) y se exporta +Y arriba, así el GLB queda en coordenadas locales del juego. Triángulos del terreno con diagonal NO–SE.
- Terreno del GLB simplificado por meshoptimizer (error ≤ 0,01 % de la extensión ≈ 3,75 cm por chunk) con bordes bloqueados: sin grietas entre chunks. La física de la fase 3 usará terrain.f32, no el GLB.
- El terreno se pinta sin iluminación (`MeshBasicMaterial`): la ortofoto ya trae la luz. Ajustable en `src/config/escena.js`.
- `gltf-transform`: `--join false` para conservar los chunks (carga por distancia en la fase 5) y `--palette false`. Materiales de una sola cara.
- `zona.geojson`: Rubén la dibujó girada; a petición suya, Claude la reescribió como rectángulo alineado con los ejes respetando su encuadre (2026-10-05).
- La capa de edificios se llama `CATAST_Pol_Edificacion` en la descarga municipal; el script compara nombres sin `_`.
- Ejecutar los scripts con `conda run -n cabdrive` (llamar al python.exe del entorno sin activar falla por GDAL_DATA/PROJ).
- **Blender 5.0** (instalado: 5.0.1) en lugar de 4.x. Así lo decidió Rubén el 2026-10-04. `config.json` apunta a `Blender 5.0/blender.exe`.
- **Worktree**: el proyecto vive en la rama `feat/cabanillas-drive` (sale de `main`), en el worktree `repos/Github/bifurcaciones/feat-cabanillas-drive/` (carpeta de bifurcaciones, para no confundirla con el repo principal). Así no se tocan los cambios sin commitear de `feat/sistemas-kits-y-galeria`.
- `config.json` gana `raw_dir` y `processed_dir` para que ningún script tenga rutas fijas.
- `00_inspect_raw.py` carga las librerías geográficas solo cuando hay datos que leer. Sale con código 1 si hay bloqueantes.
- La escena usa el `Sky` de `three/examples/jsm` (viene en el paquete npm de three, no es un asset externo).

## Problemas abiertos
- Resuelto en la fase 5: `vite.config.js` quita de `dist/` las teselas de `assets/orto/` y `terrain.f32` (solo los usa el pipeline).
- El JS del juego pesa 2,7 MB (939 KB gzip), casi todo Rapier con el wasm incrustado (`-compat`). Se puede revisar en la fase 5.
- El modelo del coche es sencillo (primitivas); mejorable si Rubén quiere.
- `npm audit`: 3 vulnerabilidades altas, solo en dependencias de desarrollo (`@gltf-transform/cli`). Las de ejecución están limpias.
- Si se publica esta carpeta tal cual en GitHub Pages, `prototipos/cabanillas-drive/index.html` no funciona sin compilar (imports de npm). El juego se publica desde `dist/` (PLAN §8).
