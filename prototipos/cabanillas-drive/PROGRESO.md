# PROGRESO — Cabanillas Drive

**Fase actual:** 6 — Extras **aprobada por Rubén (2026-10-06)**: tráfico, a pie, carteles, día/noche, peatones de MakeHuman, fachadas variadas, muros y vallas, y el resto de OpenStreetMap. Publicación (sección 8) hecha el 2026-10-08: el juego está en `juegos/cabanillas-drive/` y en la sección Juegos de la portada del sitio; sale en la web al fusionar esta rama en `main` y subirla.

**Siguiente (decidido por Rubén el 2026-10-05):** plan de realismo en `PLAN_REALISMO.md` (R1 árboles y vegetación → R2 tejados LiDAR → R3 render → R4 splats), antes de la fase 4. Pausa pedida por Rubén para recargar su uso.
- **R1 hecho (2026-10-05), pendiente del OK de Rubén:** `tools/08_arboles.py` (4 640 árboles del LiDAR, tipos con correcciones en `tools/arboles_tipos.json`, troncos fuera de la calzada) → `tools/texturas_arboles.py` → `npm run arboles` (9 variantes EZ-Tree/palmera, 0,9 MB) → `src/escena/arboles.js` (3D a < 90 m, impostores más lejos, viento, cilindro de colisión por tronco). `tools/08b_vegetacion_baja.py` → `src/escena/hierba.js` (césped y rastrojo en 3D a < 60 m con el color de la ortofoto). Galería de modelos: `?arboles`. Coste medido: ~1,7 ms por fotograma en la zona más cargada. R1 aprobado.
- **R2 hecho (2026-10-05), pendiente del OK de Rubén:** `tools/09_tejados.py` ajusta 1–4 faldones por RANSAC al MDS (tejado = mínimo de los planos, cumbreras exactas) o, si no cuadra, malla de rejilla del MDS; aleros de 0,3 m con canto; muros con la altura real del borde del tejado. 1 313 tejados de planos, 496 de rejilla, 3 planos por defecto. Error medio tejado − MDS 0,107 m (mediana 0,061). `tejados.json` + `tejados.bin` (2,6 MB, 1,1 MB comprimido). R2 aprobado.
- **R3 hecho (2026-10-05), pendiente del OK de Rubén:** `tools/10_sol.py` estima el sol del vuelo de la ortofoto correlacionando sombras del nDSM con lo oscuro de la foto (acimut 201°, elevación 65°). `src/escena/render.js`: sombras del sol en una caja que sigue a la cámara, oclusión ambiental N8AO + SMAA + OutputPass; reflejos del propio cielo (sin RoomEnvironment). `suelo.js`: el terreno recibe sombras 3D solo donde la foto está al sol, y detalle de cerca (`tools/11_suelo.py`: calzada/acera/tierra + texturas de asfalto, baldosa y tierra dibujadas). Calidad alto/medio/bajo en `src/config/calidad.js` (`?calidad=`; móvil → bajo). Render completo ≈ 7 ms a 1280×720. Rubén autorizó las descargas: cielo HDRI de Poly Haven (`tools/12_cielo.py`, girado para que su sol coincida con el de la ortofoto) y texturas de ambientCG para el suelo (`tools/11_suelo.py` las usa si están). 09_tejados: sin copas de árbol (píxeles verdes) y techo plano en edificios estrechos o con rejilla mala (error medio 0,090 m). Siguiente: R4 (splats, necesita capturas).

**Fiestas (2026-11-15):** modo fiestas de `PLAN_FIESTAS.md`, **F0 aprobada; F1 (el pueblo en fiestas), F2 (personaje en tercera persona) y F3 (la vaca) hechas el 2026-11-17, pendientes de que Rubén las pruebe**. Portada nueva («Cabanillas · El Juego · by Rubenpantxo», imagen de Rubén) el 2026-11-17. No se modela nada hasta que la apruebe. Ver el apartado «Fiestas» más abajo.

**Salto en paracaídas (2026-11-19):** plan en `PLAN_SALTO.md` (S0 prototipo con `?salto` → S1 horizonte de 6 × 6 km → S2 avión, paracaídas y personaje → S3 juego completo, móvil y sonido). Decidido por Rubén: cae el personaje, no el coche, y todo en Three.js dentro del juego. **S0 hecho; desde el 2026-11-19 el juego empieza por el salto (se puede omitir) con el avión y la mochila-paracaídas de Rubén; pendiente de que Rubén lo pruebe**; ver el apartado «Salto en paracaídas». S1 necesita permiso para descargar el MDT y la ortofoto del horizonte.

**Editor de personaje (2026-11-19, pedido por Rubén):** `PLAN_PERSONAJE.md`. P1 hecho: editor tipo Sims/GTA con MakeHuman en el navegador (macros, 200 rasgos, escultura directa, herencia, piel, ojos, pelo, ropa), al empezar la sesión; el personaje es el jugador de fiestas y salto (con su mochila redibujada y un arnés ajustado a su cuerpo; ver «Salto en paracaídas»). La ropa ya no deja asomar la piel al andar ni saltar y las canas salen por mechones. Datos: `python tools/40_editor_personaje.py` → `npm run personaje`. Prueba: `?personaje`. Pendiente de que Rubén lo pruebe.

**Agricultura (2026-11-20, pedido por Rubén):** `PLAN_AGRICULTURA.md`, en la rama `feat/cabanillas-agricultura` (no toca el juego de `main`). Parcelas reales del Catastro de Navarra y el SIGPAC, tractor, aperos y cosechadora propios, suelo que cambia por donde pasa el apero, cultivos que crecen y riego a manta que sigue el relieve del MDT. Fases A0 (parcelas sobre plano) → A10 (publicación). **A0 hecha** (las 1 797 parcelas del término con contorno, superficie y referencia), pendiente de que Rubén la revise. Ver el apartado «Agricultura».

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
| 6 | Extras (tráfico, a pie, carteles, día/noche, peatones, muros, OSM) | Hecha y aprobada |
| 7 | Publicación (`npm run publica` → `juegos/cabanillas-drive/`, 36,6 MB en 82 archivos) | Hecha, falta fusionar en `main` y subir |

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
  - Extras pedidos por Rubén tras el OK de la fase 6 (2026-10-05):
    - Noche más viva: de noche se enciende una parte de las ventanas del shader de fachadas (más al anochecer,
      se van apagando de madrugada; tonos cálidos y alguna azulada), fluorescentes en las naves, y un resplandor
      cálido en la niebla y en la luz rebotada del suelo. Decorativo: no hay datos reales de ventanas con luz ni
      de farolas.
    - Peatones (`src/juego/peatones.js`, `src/config/peatones.js`): figuras genéricas por las aceras (a media
      calzada + 0,9 m de cada calle OSM del casco urbano, como el suelo de `11_suelo.py`) y por las sendas
      peatonales; un lado de calle no se usa si atraviesa un edificio del Catastro. Eligen calle en los cruces,
      a veces cruzan o se paran; los coches del tráfico les ceden el paso y se apartan del coche del jugador
      (a 29 y 50 km/h quedan a 1,6–1,7 m de su eje). 60/40/16 según calidad, un 30 % de noche; 0,05 ms por fotograma.
  - Segunda tanda de extras (2026-10-05, petición de Rubén):
    - Fachadas mucho más variadas (`fachadas.glsl.js`): ladrillo con medidas, aparejos, ladrillo manual y
      morteros distintos; piedra en sillería, mampostería, canto rodado y verdugadas; enfoscados con grano,
      churretes, humedad y desconchones según la edad; zócalos, plantas bajas de otro material, recercados y
      paletas con variación por casa. En calidad baja, versión simplificada.
    - Muros y vallas (`tools/13_muros.py`, `src/escena/muros.js`): 18 barreras de OSM y 754 tapias que el
      nDSM mide en los linderos del Catastro (5,1 km), con acabados procedurales, malla metálica y colisión.
    - Inventario de OSM (`tools/04b_osm_inventario.py`, API oficial; Overpass estaba caído): en
      `data/processed/osm_inventario.md`.
    - Resto de OSM (`tools/15_osm_elementos.py` → `assets/osm/elementos.json` → `src/escena/elementos.js`):
      53 bancos y 2 mesas de pícnic (mirando a la vía más cercana), fuente y bebedero, aparcabicis, 3 paneles
      con el plano real del pueblo, poste de parada de autobús (OSM no tiene marquesina), 2 hitos de la NA-126
      (km 7 y 8), 10 STOP y 2 ceda el paso a la derecha del carril al que afectan, puerta de la valla,
      48 piscinas (agua y borde), porterías del campo de fútbol (107×66 m, reglamentarias), canastas, gradas
      escalonadas mirando al campo, columpio y tobogán genéricos en los 2 parques infantiles y 827 placas de
      número de portal en la pared del Catastro más próxima a su calle. Con colisión.
      No se dibuja la línea de 66 kV: OSM solo tiene sus torres a kilómetros de la zona y por donde la recta
      cruza el término el LiDAR no ve nada alto (trazado real desconocido). La torre suelta de dentro de la
      zona va con la altura del LiDAR (5,7 m), sin cables (no hay ninguno mapeado).
    - Carteles de lugares a ~55 %; portada a pantalla completa (en vertical, a lo ancho sobre la imagen
      desenfocada para no cortar el título).
    - Peatones realistas: 12 personas de MakeHuman (`tools/personas.json` → `tools/14_personas.py` →
      `build_personas.py` en Blender con configuración aislada → `npm run personas`): malla reducida,
      esqueleto de 53 huesos, piel, pelo y ropa en un atlas, animaciones de andar y quieto propias;
      2,8 MB en total. 45/30/12 según calidad (6 variantes en baja), dibujados hasta 110/85/60 m, sombra
      hasta 45 m; las aceras evitan las tapias.
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

### Peticiones de Rubén (2026-10-09)
- [x] Minimapa: al tocarlo se abre el pueblo entero (arrastrar, rueda o pellizco; «Todo» y «Dónde estoy»); pausa el juego. M gira el minimapa.
- [x] Hora: solo Amanecer (7:21), Día (la de la ortofoto), Atardecer y Noche. Fuera el ciclo continuo; T adelanta una hora.
- [x] Fuera la brújula.
- [x] Kuga (el coche blanco con el capó «levantado»): el capó y paneles del techo iban en el objeto INTERIOR, que se quitaba entero. `excluir_materiales` en `tools/coches.json` quita solo las caras del habitáculo.
- [x] Agua (`src/escena/agua.js`): oleaje animado con reflejos. Canal de Tauste como lámina a la cota del cauce en el MDT (franja plana ~0,5 m bajo las orillas), sin hierba encima; piscinas con albardilla; fuente con láminas y cortina de agua.
- [x] Marcas viales (`tools/16_marcas_viales.py` → `assets/osm/marcas.json`, `src/escena/marcas.js`): 72 pasos de cebra de OSM, ejes y bordes de la carretera, 12 líneas de STOP/ceda, 21,6 km de bordillo. Aceras más claras y asfalto algo más oscuro en el shader del suelo.
- [x] Ajustes en Controles (pestaña «Ajustes»): esquina del minimapa, minimapa girando o norte arriba, joystick fijo y visible, mover los botones táctiles (freno de mano, pedales…). Se guardan en el navegador.
- [x] Muros (`tools/13_muros.py`, fuente 3): en el casco urbano del Catastro, los linderos sin edificio son tapias (salvo calzada, parques y zonas peatonales de OSM). +998 tramos (20 km); altura del LiDAR si se ve, si no 2 m.
- [x] Farolas (`tools/17_farolas.py`, `src/escena/farolas.js`): OSM no tiene y el plano de alumbrado del Ayuntamiento solo cubre la UE5. 67 báculos detectados en el nDSM y 334 estimados completando cada calle con la separación medida. De noche: brillo, halo, charco de luz y luces reales en las 8 más cercanas (4 en media, 0 en móvil).
- [x] Prueba de fachadas reales (`src/datos/fachadasReales.js`): estilo, color, zócalo, balcones y rejas por edificio. 4 casas de la calle Ramón y Cajal a partir de la foto de Mapillary 532346855555160 (avaldeon, CC-BY-SA 4.0). La correspondencia foto–edificio va por la posición de la imagen (±5 m).
- [x] Fachadas reales en toda la carretera (2026-11-11): 71 casas (66 de la acera norte y 5 de la sur) recorriendo la secuencia de Mapillary de avaldeon (25-02-2023), única calle con fotos. La 957 pasa a ladrillo (era la de al lado). Casadas por orden entre cruces: alguna puede estar corrida una casa.
- [x] Colores de fachada sin doble conversión (2026-11-11): `edificios.js` pasaba los hex a lineal dos veces (THREE.Color ya lo hace), y los ocres claros salían naranjas y oscuros (`#e3c48a` → `#c48d41`). La luz de «Día» era neutra (pared blanca medida: gris algo azulado). Afecta a todas las casas: las de paleta también salen más claras.
- [x] Fachadas PBR (2026-11-11): el shader de fachadas calcula además un relieve en metros (bump por derivadas de pantalla, sin texturas) y rugosidad/metal por material: llagas y piedras hundidas o abombadas, grano del enfoscado, chapa ondulada algo metálica, ventanas y puertas metidas en el muro, marcos, cornisa y losas de balcón salientes, forja metálica, placas de zócalo pulidas, pie sucio mate. El relieve fino se apaga con la distancia antes que el color (evita moiré). En calidad baja (FACHADA_SIMPLE) no hay relieve.
- [x] Relieve PBR en tapias y tejados (2026-11-11): la función de bump es común (`GLSL_RELIEVE` en `fachadas.glsl.js`). Tapias (`muros.js`): juntas de bloque y ladrillo hundidas, grano del enfoscado, piedras de mampostería abombadas, rebaba del encofrado, y rugosidad por acabado. Tejados: teja árabe (canal y cobija cada 25 cm, filas cada 38 cm) con el eje de caída y la pendiente media de cada tejado (atributo `aTeja`, tensor de normales por área: los triángulos del LiDAR tienen ruido y orientarlos uno a uno daba granizo); desde ~8° de pendiente, y en las planas solo grano. Como los tejados son la ortofoto sin luz, el relieve solo aclara u oscurece la foto según el sol (`SOL_TEJADOS`, de cicloDia.js), sin volver a iluminarla.
- [x] Suelo procedural en calles y caminos (2026-11-11): en calzada, acera y caminos de tierra la ortofoto se sustituye por textura (`suelo.js`), porque de cerca era borrosa y sus rayas difusas no casaban con la pintura 3D. Asfalto (árido ambientCG, parches, rodadas, grietas selladas, polvo junto al bordillo) más oscuro que la foto; acera de cemento fratasado con juntas cada 1,5 m alineadas con la calle; camino de tierra con el color de la foto muy suavizado, grano, guijarros, rodadas y hierba en el centro. `11_suelo.py` añade `direccion.png` (orientación de la vía más cercana y distancia a su eje), mide el color de cada suelo en la foto (`colores_srgb` en suelo.json) y ya no pone acera fuera del casco. Las sombras 3D oscurecen siempre el suelo procedural (no trae sombras pintadas). Calidad baja: sigue la foto.
- [x] Badenes (2026-11-11): OSM no tiene ninguno; por decisión de Rubén, los 8 pasos de cebra de la travesía (carretera dentro del casco) son pasos sobreelevados (`elevado` en marcas.json, `16_marcas_viales.py`): meseta de 4 m y 10 cm con la cebra, rampas de 1,5 m con dientes de sierra, el material del suelo de debajo y colisión convexa. La pintura (ejes, bordes, cebras) sube por encima. El borde continuo se corta en todos los pasos de cebra (hueco de 3,6 m en los normales y 4,6 m en los sobreelevados). Pendiente: el tráfico IA no sube al badén (usa la altura del terreno).
- [x] Badén como el real (2026-11-11): franjas de cebra con punta de flecha en un extremo y línea de detención continua antes del paso en el carril de cada sentido; sin dientes de sierra.
- [x] Arcén de aparcamiento en la travesía (2026-11-11): los coches aparcados quedaban sobre la acera (están a 4,6 m del eje; fachadas a ~8 m). En el casco la calzada de la carretera llega a 6 m del eje (`MEDIA_TRAVESIA_M` en 11_suelo.py y 16_marcas_viales.py): bordillo, asfalto y pasos de cebra de bordillo a bordillo; la acera queda detrás (1,8 m). Las líneas de borde (3,75 m) separan carril y aparcamiento, como en la realidad.
- [x] Singulares (2026-11-11, `src/escena/singulares.js`, datos en `src/datos/singulares.js`, referencia: fotos de calle de Rubén):
  - Campanario de la Asunción (OSM bell_tower): 4 pilares de ladrillo crema, zunchos, 3 plataformas con barandilla (la del medio con aspas), campana de bronce con yugo, 19 m; colisión en los pilares. Pie: zócalo de hormigón en los pilares y suelo; plaza alta con murete de hormigón y barandilla negra hacia la Vicera y Fueros de Navarra, escalinata al sur y farola fernandina de dos faroles. Se quitan la parcela 575 del Catastro (era la plaza con el solar de la torre, con 7,4 m de alto y un tejado LiDAR que subía con la torre y los árboles) y la «valla» de 2 m de muros.json que la rodeaba (`ZONAS_SIN_MUROS`). La iglesia (572 y 1004) pasa a blanca con zócalo de ladrillo.
  - Fuera también el edificio 1543 del Catastro junto al pino (caja de 13,6 m que no existe). Los edificios quitados (`EDIFICIOS_SUSTITUIDOS`) se filtran al cargar el mundo: no se dibujan ni chocan.
  - Pino piñonero centenario de la entrada (árbol LiDAR de 16,2 m y copa de 11,4 m, que se quita de arboles.json): tronco inclinado que se abre en brazos y copa en parasol: volumen de lóbulos con normales suaves cubierto de 2600 penachos de acículas (planos con textura de canvas y alphaTest, también en la sombra), que rompen el contorno.
  - Sala de Cultura: fachada este de bloque blanco con el arco rebajado, tres rejas plegables de celosía, rótulo «SALA DE CULTURA», óculos, columna de pavés y barricas (sustituye al pórtico 451 del Catastro); terraza al sur sobre pilares con barandilla y pérgola. Edificios 7 y 8 en bloque blanco.
- [x] Bordillo nítido (2026-11-11): `11_suelo.py` añade `bordillo.png` (0,5 m/px, distancia con signo al borde de la calzada, exacta con la geometría de OSM en la franja junto a las aceras), y `suelo.js` reparte asfalto y cemento por ella justo bajo el listón del bordillo en vez de mezclarlos metro y medio (tipos.png es borroso). El polvo del asfalto junto al bordillo queda en 0,7 m. El ramal de la carretera (`primary_link`) usa 3,5 m de media calzada como en 15/16, para que el corte case con el bordillo.
- [x] Casas de San Isidro 5-15 a mano (2026-11-11, `src/escena/casas.js`, datos en `src/datos/casasSanIsidro.js`, referencia: fotos de calle de Rubén; números por `addr:housenumber` de OSM): fachadas con huecos de verdad (ventana con marco, vidrio, persiana, alféizar, contraventanas y rejas; puertas de madera o acristaladas; portones de tablas, seccional y de chapa), zócalos y aplacados de piedra, ladrillo caravista crema, claro, rojizo y rústico, porches con pilar de piedra o columna, terrazas y escaleras con barandilla, balcones de forja, tejados de teja con alero, sofito de madera o blanco, canalón, placas fotovoltaicas y colectores solares, lucernario y chimeneas, vallas de murete con forja (barrotes o cruces) y cancelas, setos de boj y árboles de bola en la acera (sustituyen a los del LiDAR). Coordenadas de la fila (u a lo largo de la calle desde la esquina con Bardenas Reales, w hacia dentro desde la valla) sobre las huellas del Catastro, que se quitan (13 edificios; los cobertizos del fondo se quedan) junto con los muros de muros.json de los patios delanteros. Colisión en volúmenes, vallas y setos. 50 mallas, ~24 k triángulos.
- [x] Aparcamiento en San Isidro (2026-11-11, `tools/calzadas.py`, común a 11_suelo.py y 16_marcas_viales.py): los coches aparcados quedaban sobre la acera (media calzada fija de 3 m). Calzada de ancho variable: a cada lado llega hasta `acera` m de las fachadas, tapias y parcelas de OSM (rayos cada metro, suavizado), y la acera rellena hasta ellas; donde no hay nada cerca, la media calzada normal. Acera norte de 2,4 m: acaba en el borde de los alcorques de los árboles de bola (puestos en fila a 1,85 m de las vallas); sur, 1,8 m. 11_suelo.py mete en la calzada los coches que aún pisaban la acera (22; idempotente; no mueve los de más de 1,25 m, que estarán en vados o con el eje de OSM descentrado).
- [x] Plaza del Ayuntamiento y Calle San Roque a mano (2026-11-11, datos en `src/datos/casasPlaza.js`, índice de filas en `src/datos/casas.js`; fotos de Rubén, sin las vallas de los encierros): impares 1, 3, 5, 7, 9 y 11 y pares 2, 4, 6, 8 y 10 de la plaza, San Roque 50, 52 y 54. `casas.js` pasa a varias filas (origen y eje propios) y suma arcos de medio punto (granero del 4), balcones de barriga, forja de aros, roja y granate, antepechos de uralita (5), canecillos (8 y 9), persianas de tijera y rótulos del bar Katepa (6), miradores (2 y 10), cornisas y azoteas con barandilla (7, 10, 11), cortina de tiras (50), contadores, postes y jardineras en los balcones; materiales nuevos: sillería y placa clara, sillar de piedra, mármol negro, pizarra, granito, losa rosa, ladrillo marrón, tostado y rayado, cal vieja. Se quitan 15 edificios del Catastro (los de fondo se quedan, como la nave de la discoteca detrás del 6). El nº 5 sale de la foto marcada con «7» en rojo: por las otras dos fotos es el de los balcones de uralita.
- [x] San Isidro, ajuste (2026-11-11): la acera norte baja a 2 m (acaba en el borde de los alcorques; árboles a 1,6 m de las vallas y alcorques de 70 cm) y los coches aparcados se arriman al bordillo a 25 cm, hacia dentro o hacia fuera (27 movidos; solo hasta 1,25 m y no los que circulan por el centro).
- [x] Calle Juan XXIII y Calle las Eras a mano (2026-11-11, datos en `src/datos/casasCalles.js`; fotos de Rubén): Juan XXIII 10, 16, 18, 20, 26, 37, 41, 43, 47, 51, 53, 55, 57, 69, 71 y 73; Las Eras 6, 7, 8, 9, 11 y 13. Cada casa con su marco sacado de su huella del Catastro (la que se quita). El 6 de Las Eras son tres cuerpos: el Bar Paco, una casa vieja de una planta con portón y la de ladrillo rosado con portón de madera (por eso sale con el 6 en dos fotos). `casas.js` suma recercados de huecos, árboles por casa y zócalo bajo las ventanas que entran en él; materiales nuevos: ladrillo amarillo y rosado, piedra gris, azulejo marrón y travertino. Los 87 y 89 de Ramón y Cajal (en blanco en la foto) no se han hecho.
- [x] Herramienta para casas a mano (2026-11-11, `tools/30_casas_marcos.py`): por calle y números busca la casa en OSM, sus huellas del Catastro y el eje de la calle, y da el marco (origen, eje, ancho, fondo), lo que se quita y lo que se queda, el orden de la calle y hacia dónde mira cada fachada (`--listar`), avisa de huellas compartidas (`--juntas`) y de casas ya modeladas, y saca el esqueleto `fila(...)` para `casasCalles.js` (`--esqueleto`). La usa la skill de usuario `fachadas-cabanillas` (`~/.claude/skills/fachadas-cabanillas`), que hace todo el proceso a partir de las fotos de Rubén.
- [x] Ayuntamiento a mano (2026-11-16, datos en `src/datos/casasAyuntamiento.js`; dos fotos de Rubén): fachada a la plaza (soportal con columna troncocónica y pavés, balcón corrido de forja gris, ladrillo amarillo con el paño crema del reloj, cuatro banderas) y trasera (planta baja blanca, ladrillo, ático de placas con ventanas, banda gris). Edificio exento: cuatro filas (oeste, este, norte, sur) sobre las huellas 121 y 259 con un `nivel` común (la calle de detrás baja ~0,3 m) y tejado a cuatro aguas con torreta de lamas. Los laterales norte y sur no salen en las fotos: ventanas supuestas siguiendo la trasera. Nuevo en `casas.js`: `nivel` de fila, `relojes`, `banderas`, columnas troncocónicas con material, chimeneas con `ancho` y `lamas`, materiales `paves` y `hierroGris` (barandillas `gris`), y el alero da la vuelta en las limatesas.
- Orden del pipeline: … → 13_muros → 15_osm_elementos → 16_marcas_viales → 17_farolas.

## Fiestas (PLAN_FIESTAS.md)

**Fase actual: F8 — rendimiento, móvil y publicación. Hecha el 2026-11-17 y en `main`, salvo la medición en el Pixel 10, que Rubén deja para más adelante (junto con una revisión general y una lista de correcciones). Es la última fase del plan de fiestas.** Después de la F8: entradas al frontón (D14), en la rama.

### Después de la F8: posturas más naturales (2026-11-17, a petición de Rubén)
- **Piernas abiertas al andar** (jugador, peatones, público y mozos): el reposo de MakeHuman tiene las piernas abiertas (tobillos a ±0,20 m con las caderas a ±0,11 m) y las animaciones de `tools/build_personas.py` parten de ahí. Sin rehacer los GLB (aquí no hay Blender), `src/juego/corrigePersonas.js` gira cada muslo hacia dentro (6–9° según la persona) en el reposo y en todas las animaciones al cargarlas: el tobillo queda 2 cm por dentro de la cadera. También cierra un poco los dedos (estaban estirados). Valores en `PEATONES.correccion`. **Desde el 2026-11-24 también en `tools/build_personas.py`** (mismo cálculo, `TOBILLO_DENTRO_M`): los GLB que se generen ya traerán las piernas juntas en andar y quieto. Como el juego mide las piernas en la postura «quieto», con esos GLB no gira nada (comprobado: una segunda pasada da 0°), así que no hay doble corrección. Sin probar en Blender (aquí no lo hay); la cuenta se comprobó aparte con las posiciones de `h_joven` (7,0°, tobillo a 2 cm por dentro). **Los dedos, desde el 2026-11-25 también en `build_personas.py`** (`DEDOS_RAD`, `PULGAR`, claves en andar y quieto): con esos GLB el juego ya no los toca (lo detecta porque las animaciones traen las falanges). La cuenta se comparó con la del juego sobre los huesos de `h_joven`: las articulaciones acaban a menos de 1 mm. Sin probar en Blender.
- **Carrera** del jugador y de los mozos: antes los antebrazos iban rectos hacia delante con las manos abiertas; ahora codos doblados, antebrazos hacia arriba y algo hacia dentro, y braceo al paso de las piernas (`POSTURAS.corre` en `src/fiestas/pose.js`, valores en `FIESTAS.personaje.correr`).
- El giro «hacia dentro» de las posturas del público estaba al revés (el aplauso abría los brazos); corregido, y ajustados aplauso y apoyado.
- Para revisarlo a ojo: `node tools/vista_posturas.mjs <carpeta>` (de frente y de lado: quieto, andar, correr, aplauso, olé, uy, apoyado, cita).

### Hecho en F8
- **Presupuesto medido** (`tools/mide_fiestas.mjs`; llamadas de dibujo, contando el mapa de sombras, y miles de triángulos; desde el centro de la plaza en el concurso y desde la calle en el encierro):

  | Calidad | Modo | Total | Público | Mozos | Vallado | Vacas | Lógica (ms/fotograma) |
  |---|---|---|---|---|---|---|---|
  | baja | concurso | 483 / 1472k | 19 / 214k (16 personas) | 4 / 49k | 10 / 21k | 14 / 6k | 1,1 |
  | baja | encierro | 288 / 1013k | 8 / 93k | 3 / 36k | 7 / 21k | 42 / 17k (6) | 0,7 |
  | alta | concurso | 1278 / 4712k | 67 / 788k (70 personas) | 15 / 169k | 9 / 31k | 21 / 8k | 3,7 |
  | alta | encierro | 959 / 2868k | 53 / 625k | 13 / 158k | 7 / 21k | 42 / 17k | 2,6 |

  Lo que más pesa es el público (unos 11 000 triángulos por persona). Cambio: **el público y los mozos solo dan sombra cerca de la cámara** (alta 40 m, media 28 m, baja 18 m; `FIESTAS.publico.sombraHastaM`); en alta el público bajó de 1042k a 788k triángulos en la plaza y de 925k a 625k en el encierro. Cantidades por calidad sin cambios (público 70/40/16, mozos 8/6/3). La lógica queda por debajo de 4 ms en el ordenador de pruebas. En el Pixel 10 (PowerVR) no hay sombras 3D, así que el público cuesta solo la pasada principal.
- **Pantalla táctil en apaisado** (`tools/prueba_disposicion.mjs`): en 667×375, 740×360, 844×390, 915×412 y 1024×600 el marcador, el aviso, el consejo, el minimapa, ☰ y los botones de las suertes no se pisan ni se salen.
- **Controles**: pestaña nueva «Fiestas» con capturas propias del ordenador y del móvil (`tools/capturas_controles.mjs` las rehace y dice dónde van los números) y la tecla E de los aros en «Teclado y ratón». **Créditos** del juego con el apartado de las fiestas; `CREDITOS.md` ya estaba al día desde la F6.
- **Publicado** con `npm run publica` en `juegos/cabanillas-drive/` (en esta copia `public/assets` es un enlace a esa carpeta: se comprobó que `dist/` llevaba los mismos archivos y se quitaron los dos paquetes viejos que arrastraba el enlace). Comprobado sirviendo la carpeta como en GitHub Pages: carga, «Ir a las fiestas» y el encierro, sin errores ni archivos que falten.

### Pendiente tras F8
- **Medir en el Pixel 10** (Rubén): FPS en calidad baja en la plaza (concurso) y en el encierro. Si va justo, se bajan el público (`FIESTAS.publico.cantidad.bajo`) y los mozos (`FIESTAS.mozos.cantidad.bajo`). Con esos datos se decide también lo del muñeco articulado en la cogida.
- Un público lejano simplificado (impostores) no ha hecho falta con estas cifras; si en el móvil va justo, es lo siguiente.

### Hecho en F7
- `src/config/entradas.js`: los puntos de entrada, una línea por lugar (id, nombre, icono, sitio y acción: abrir las fiestas o ir a otro juego de la web). `src/juego/entradas.js` los pone en el mundo: un aro dorado que gira en el suelo y un rótulo encima.
- **Fiestas · Plaza** (centro del ruedo) y **Fiestas · San Roque** (en la calle, a 45 m de la puerta de la plaza): dentro del aro, a pie o en coche casi parado (≤ 12 km/h), sale el aviso «E: entrar» (en táctil, el botón «Entrar») y abre el menú de fiestas. E también es bajarse del coche: dentro del aro manda entrar.
- **Frontón → `juegos/cesta-punta/`**: preparado (al entrar guarda en la dirección `?aparece=fronton` y, al volver atrás en el navegador, el coche aparece en el frontón), pero apagado hasta saber dónde está (D14).
- **Pantalla de inicio**: botón «🐂 Ir a las fiestas» bajo «Jugar». **«Ir a…»** de la pausa y **minimapa**: las entradas salen con su icono; «Ir a…» deja el coche en el aro.
- Prueba: `tools/prueba_entradas.mjs` (escritorio y móvil). Capturas en `docs/fiestas/f7_*.jpg`.

### D14 — Frontón (resuelta el 2026-11-17)
Rubén mandó una captura con los dos frontones y los dos caminos de entrada. Los frontones sí están en el Catastro, sin rótulo de frontón: el 1 (el que prefiere para jugar) es el edificio 532 y el 2, el 538. Hay dos entradas, al principio de cada camino: **Frontón · San Isidro** (camino naranja, por el pasillo entre el edificio 548 y la piscina) y **Frontón · Bardenas Reales** (camino azul, frente a la calle las Planas). Las dos llevan a `juegos/cesta-punta/`; al volver atrás, el coche aparece en la entrada por la que se fue. Sitio medido sobre la captura con los edificios como referencia. Captura: `docs/fiestas/f7_aro_fronton.jpg`.

### Pendiente tras F7
- El juego de cesta punta no tiene botón de «Volver a Cabanillas»: se vuelve con «atrás» del navegador (no he tocado ese juego).
- En el servidor de desarrollo `/juegos/cesta-punta/` no existe; solo funciona en la web publicada.

### Hecho en F6
- **Mozos** (`src/fiestas/mozos.js`): gente del pueblo en el recorrido con el jugador (en calidad alta 8, media 6, baja 3; en la plaza, el 60 %). Pasean, citan a la vaca agitando el brazo, y cuando se les arranca quiebran de lado o corren a la valla y se suben; bajan cuando la vaca se aleja. La vaca también se les arranca a ellos (elige al más cercano que ve; el jugador tiene algo de preferencia y el mozo que cita, más) y los puede coger: vuelan, quedan tendidos un momento y se van a la valla. En el encierro corren delante de la manada, se apartan a la valla cuando se les echa encima y la siguen por detrás para la segunda carrera. `?mozos=0` los quita.
- Las embestidas que van a un mozo no puntúan para el jugador (ni pases ni metros delante).
- **Público con posturas y reacciones** (`src/fiestas/pose.js`, `ambiente.js`): gente sentada encima de la valla de tablones de la plaza, apoyada en la valla en la primera fila, y en las gradas, el tablado y los balcones como antes. Reacciona al lance, más cuanto más cerca: aplauso, «¡olé!» con los brazos arriba (y luego aplausos) en las suertes ceñidas y a los mozos que la dejan pasar cerca, manos a la cabeza en las cogidas, aplausos al salir la vaca y al acabar el festejo; y alguno aplaude de vez en cuando por su cuenta.
- **Sonido** (`src/fiestas/sonido.js`), todo sintetizado con Web Audio (sin grabaciones): murmullo de la gente que sube cuando hay embestida, cohete al salir la primera vaca, cencerros (cada vaca el suyo) y pezuñas que suenan desde donde está la vaca, pisadas del jugador, golpe en la valla, olé, aplausos y «¡uy!». **M** o el botón **🔊** lo quitan y lo ponen (se recuerda); en la pausa calla. En fiestas, M ya no gira el minimapa.
- **La valla vibra** cuando la vaca remata (en el sombreador, alrededor del golpe; pendiente de la F3).
- Valores en `FIESTAS.mozos`, `FIESTAS.sonido`, `FIESTAS.vibracion` y `FIESTAS.publico` (`src/config/fiestas.js`). Créditos en `CREDITOS.md`.
- Pruebas: `tools/prueba_mozos.mjs` (sin navegador: plaza y calle 5 minutos, encierro entero) y `tools/prueba_ambiente.mjs` (dentro del juego: sonido, mozos, reacciones, golpe, M, encierro; escritorio y móvil). Capturas en `docs/fiestas/f6_*.jpg`.

### No hecho en F6, y por qué
- **Cogida con muñeco articulado (Rapier)**: el plan la pedía «si el rendimiento lo permite». Aquí no puedo medir el rendimiento (el navegador de pruebas va a menos de 1 FPS), así que se queda el volteo de la F3. Propuesta: Rubén mide los FPS en su móvil con la F6 y, si sobran, se hace.
- **Animaciones de Blender** (correr, saltar, sentarse, aplaudir): siguen siendo giros de huesos encima de andar y quieto; aquí no hay Blender.

### Pendiente tras F6
- Los mozos no chocan con el jugador ni con las vacas (se apartan del jugador, pero la vaca los puede atravesar si no los coge).
- Sonido: no lo he podido escuchar (no hay altavoces aquí); los volúmenes y los tonos son una primera propuesta en `FIESTAS.sonido`.
- Rendimiento con 70 personas y 8 mozos en calidad alta, sin medir.

### Hecho en F5
- **Menú de fiestas** (`src/hud/menuFiestas.js`): Recorte libre · Concurso · Vacas en la calle · Encierro · Volver al pueblo, con la mejor marca de cada uno, los controles y los consejos (la «pantalla previa» del §4b). Se abre desde la pausa («Fiestas → Menú de fiestas») o con `?fiestas=menu`. La pausa sigue dejando entrar directo a cada modo y añade «Dejar la partida (ver resultado)».
- **Pantalla de resultados**: puntos, pases, cogidas, nota (concurso), metros delante de la vaca (calle) o segundos delante de la manada (encierro), mejor marca (guardada en el navegador, `cabanillas.fiestas.marcas`) y Repetir / Menú de fiestas / Volver al pueblo.
- `src/fiestas/partida.js` lleva cada festejo de principio a fin:
  - *Recorte libre*: una vaca, sin tiempo; acaba al quedarse sin vida o al dejarlo.
  - *Concurso*: 3 rondas de 60 s, cada una con su vaca (al acabar el tiempo vuelve sola al corral); nota sobre 10 (3000 puntos = 10).
  - *Vacas en la calle*: puerta abierta, 3 vacas de una en una, 75 s cada una; además de los recortes, 2 puntos por metro corrido delante de la vaca que embiste.
  - *Encierro*: 6 vacas en manada (`src/fiestas/manada.js`): salen del corral, van al final de la calle y vuelven, dos veces, y entran al corral (como dijo Rubén). Van de dos en fondo y de vez en cuando una se descuelga. Puntos por segundo corrido delante y cerca (más cuanto más cerca); cogen a quien pillen por delante. El jugador empieza en la calle, a 14 m de la puerta, de espaldas a la plaza.
- La vaca sabe ir guiada (manada) y recogerse al corral por la manga. `recortes.js` lleva una embestida por vaca.
- Valores en `FIESTAS.partida` (`src/config/fiestas.js`).
- Pruebas: `tools/prueba_modos.mjs` (sin navegador: cada modo de principio a fin) y `tools/prueba_menu.mjs` (dentro del juego: menú → concurso → resultados → repetir → dejar → menú → calle → encierro → pueblo; escritorio y móvil). Capturas en `docs/fiestas/f5_*.jpg`.
- Fallo encontrado por la prueba y corregido: el menú no se ocultaba (el `display: grid` del estilo anulaba `hidden`).

### Pendiente tras F5
- Las vacas no chocan entre sí (en la manada se pueden solapar un poco).
- En «Vacas en la calle» y el encierro no hay mozos ni más gente corriendo: F6.
- El acceso al menú es por la pausa; la entrada desde la plaza del pueblo es la F7.
- Duraciones, número de vacas, velocidad de la manada y puntos: a ajustar cuando Rubén lo juegue.

### Hecho en F4
- `src/fiestas/recortes.js`: mira cada embestida y la puntúa al acabar. Pase (la vaca cruza a menos de 4,5 m sin coger), suertes (quiebro 100, recorte 150, salto 200, combo 250, especial 350) hechas con la vaca a distancia válida, multiplicadas por el riesgo (×1 a ×3 según lo cerca que pasan los cuernos: lejano, bueno, ceñido), ×0,8 si pasa rozando, ×0,7 si se repite la suerte y ×1,2 si es distinta de las dos anteriores. Cogida leve o fuerte (según la velocidad de la vaca): quita vida y puntos. La tanda dura 120 s desde que sale la vaca o hasta quedarse sin vida.
- Marcador (`src/hud/fiestas.js`): panel del jugador (puntos, tiempo, pases, vida, energía), panel de la vaquilla (fuerza y su estado, lo que hace, metros), aviso grande («¡Olé! Quiebro ceñido +300», «¡Cogida fuerte!»), consejo abajo, y teclas/botones táctiles que se encienden cuando la vaca está a distancia buena.
- Cámara lenta breve (0,55 s al 35 %) en las suertes ceñidas.
- Todos los valores en `FIESTAS.recortes` (`src/config/fiestas.js`).
- Cambios sobre F3: el burladero está a 0,5 m de la valla (antes 0,9; lo pidió Rubén); el salto normal (0,75 m) ya libra a la vaca si se hace a tiempo (`saltoLibraM` 0,95 → 0,6), porque antes solo valía el especial.
- Pruebas: `tools/prueba_recortes.mjs` (sin navegador: tabla de casos con la puntuación esperada, variedad, vida y tiempo) y `tools/prueba_marcador.mjs` (dentro del juego, escritorio y móvil). Capturas en `docs/fiestas/f4_*.jpg`.

### Pendiente tras F4
- Al acabar la tanda solo sale un aviso y a los 7 s empieza otra: la pantalla de resultados, el menú y la pantalla previa con controles y consejos son de la F5.
- El «olé» es solo el aviso en pantalla: el público no reacciona ni suena hasta la F6.
- El recorte (E) puntúa como suerte pero no se ha medido que libre a la vaca tan bien como el quiebro: ajustar al probarlo Rubén.

### Hecho en F3
- **Vaca** (`src/fiestas/vaca.js`, parámetros en `FIESTAS.vaca`): modelo propio de primitivas (tronco, cabeza con cuernos, cuatro patas y rabo que se animan por código) en tres capas: colorada, negra y berrenda (`?capa=`; si no, al azar). No hay Blender en esta sesión, así que `tools/build_vaca.py` no se ha hecho: queda para la F6 junto con las animaciones de las personas.
- **Comportamiento**: espera 4 s en el corral → sale por la manga → reconoce (trota a su aire) → se fija en el jugador → embiste → pasa de largo o remata en la valla → frena y vuelve a mirar. Galopa a 8,6 m/s (el jugador esprinta a 6,6) pero su giro máximo es 3,4 / (1 + (v / 4,2)²) rad/s: parada gira en el sitio y a galope casi nada. Persigue adonde estaba el jugador hace 0,22 s. Se cansa: pierde fuerza con el tiempo y con cada embestida, y con ella velocidad (hasta el 45 %).
- **No sale del recinto** sin física: se la mantiene a 0,55 m de los bordes del ruedo y, con la puerta abierta, también de los de la calle. Si no ve al jugador (una esquina de la calle) va por el eje del recorrido en vez de en línea recta.
- **No se arranca** a quien está a salvo (subido a la valla o tras un burladero). Si el jugador salta con los pies a más de 0,95 m, pasa por debajo.
- **Cogida** (volteo sencillo, sin sangre): si lo alcanza de frente a menos de 0,95 m, el jugador sale por los aires dando una vuelta y acaba sentado en la valla más cercana; aviso «¡Cogida! A la valla». La vida y la puntuación son de la F4.
- En los tres modos sale una vaca (los modos de verdad y la manada son de la F5). `?vacas=0` entra sin vaca.
- **Pruebas**:
  - `tools/prueba_vaca.mjs` (sin navegador, con un jugador de mentira que usa las medidas del de verdad). Seis sueltas de 5 minutos (tres con la puerta cerrada y tres abierta): 0 pasos fuera del recinto, parada más larga 4,5 s (la espera del corral), entre 31 y 71 embestidas cada una. Embestidas medidas con la vaca a 15 m:
    | Qué hace el jugador | Resultado |
    |---|---|
    | Se queda quieto | lo coge |
    | Quiebro con la vaca a 3,5 m | pasa de largo a 2,25 m |
    | Quiebro con la vaca a 2,5 m | pasa de largo a 1,76 m |
    | Quiebro demasiado pronto, a 11 m | lo coge (le da tiempo a corregir) |
    | Huye en recta a esprint | lo alcanza y lo coge |
    | Salto alto (especial) con la vaca a 3 m | pasa por debajo |
    | Subido a la valla 90 s | ninguna embestida |
  - `tools/prueba_cogida.mjs` (en el juego, navegador sin ventana): la vaca sale del corral a los 5,1 s; con el jugador quieto lo coge y acaba «refugiado»; subido 20 s, ninguna embestida; con el quiebro a 3,2 m, pasa de largo. Sin errores de consola.
- Encontrado con la prueba y corregido: con la puerta abierta la vaca iba en línea recta hacia su destino y se quedaba hasta 18 s contra las vallas de la calle.

### Pendiente de F3 / para más adelante
- Rubén: probar la sensación (¿corre demasiado?, ¿gira demasiado poco?, ¿cuánto tarda en arrancarse?). Todo son números en `FIESTAS.vaca`.
- La valla no vibra cuando la vaca remata (el vallado es una sola malla); irá con el sonido en la F6.
- El modelo de Blender con esqueleto y las animaciones de verdad (parada, trote, galope, embestida, derrote, frenada).
- Las pruebas de F1 y F2 (`prueba_fiestas.mjs`, `prueba_personaje.mjs`) entran ahora con `vacas=0`.

### Hecho en F2
- **Jugador** (`src/fiestas/personaje.js`, parámetros en `FIESTAS.personaje`): una persona de MakeHuman (`h_joven`) con el cuerpo visible sobre la cápsula de `juego/peaton.js`, que gana tres métodos para esto (`mueve`: velocidad en el mundo con gravedad y salto; `llevaA`: colocar sin colisión; `ponColision`). Se mueve respecto a la cámara y el cuerpo gira hacia donde va.
  - Andar 2,2 m/s (joystick a medias), correr 4,6 m/s y esprint 6,6 m/s (Mayús o joystick a fondo). El esprint gasta energía: se agota en 9,5 s y entonces se queda en correr hasta recuperar.
  - **Quiebro** (Q): finta lateral de 2,3 m en 0,26 s, al lado al que se empuja la palanca o alternando. Dos seguidos hacen el **combo** de ida y vuelta.
  - **Recorte** (E): arco hacia un lado mientras el cuerpo gira 155°.
  - **Salto** (Espacio): 0,78 m de alto. **Especial** (E y Espacio casi a la vez, o su botón): 1,34 m de alto y 3,4 m de largo. El salto se convierte en especial si el otro botón llega en 0,16 s, y al revés.
  - **Refugio** (F o botón «Subir»): a menos de 1,5 m de una valla de tablones se sube y se queda sentado arriba mirando al ruedo; junto al burladero o la valla gris se mete detrás, agachado. Otra vez F, baja. Dentro recupera energía el triple de rápido y `seguro` vale verdadero (lo usará la F3).
  - Cada suerte cuesta energía (quiebro 0,07, recorte 0,11, salto 0,18, especial 0,32 de 1).
- **Animaciones**: no hay Blender en esta sesión, así que no se han hecho las nuevas. Correr, saltar, quebrar, recortar, agacharse y sentarse en la valla se consiguen girando huesos por encima de «andar» y «quieto» (tronco inclinado, codos doblados, piernas recogidas…). Es el «juego reducido de animaciones» que el plan preveía; las de verdad quedan para la F6.
- **Cámara** (`src/fiestas/camaraPersonaje.js`, `FIESTAS.camara`): detrás del hombro, con el ratón (clic para capturarlo) o arrastrando el dedo. Si una fachada tapa, se acerca; las vallas no cuentan (se ve a través). V o 👁 cambia entre hombro, lejos y ojos. Tiene ya el gancho de la vaca: si hay una cerca fuera de la imagen y no se toca la cámara, gira hacia ella (`fiestas.ponVaca`).
- **Controles** (`entrada.js`, `CONTROLES.teclasFiestas`): mapa de teclas por modo; en fiestas E, F y Espacio dejan de ser bajarse y freno de mano. Táctil: joystick a la izquierda y, a la derecha, Recorte y Especial abajo, Salto y Quiebro encima, y sobre ellos «Subir/Bajar» (solo aparece junto a un refugio) y la cámara. Los mandos del coche y el velocímetro se ocultan en fiestas.
- **Marcador mínimo** (`src/hud/fiestas.js`): barra de energía y aviso «F: subir a la valla». El completo es de la F4.
- **Prueba automática** (`tools/prueba_personaje.mjs`), en calidad baja, escritorio y móvil emulado (844×390 táctil):
  | Qué | Resultado |
  |---|---|
  | Recorrido plaza → final de la calle → plaza con los mandos | 16 de 16 puntos, 337 m en 63 s, sin atascos |
  | Subir y bajar en cada refugio | 20 de 20 (18 tramos de tablones, burladero y valla gris) |
  | Suertes | quiebro 3,1 m; recorte 2,7 m; salto 0,78 m; especial 1,34 m; combo vuelve a 0,9 m del origen; salto + recorte = especial |
  | Cámara | de 3,85 m libre a 3,0 m de espaldas a una fachada; con una vaca a la espalda gira 2,3 rad hasta dejarla dentro |
  | Táctil | los cuatro botones hacen su suerte, el joystick mueve (7,9 m), «Subir» aparece y sube, y pasa a «Bajar» |
  | Al salir | sin restos, teclas y mandos del coche otra vez |
  Sin errores de consola.
- Encontrado con las capturas y corregido: los giros de huesos se acumulaban de un fotograma a otro (el jugador acababa con los brazos en alto), porque el mezclador de animación no reescribe los huesos que no cambian.

### Pendiente de F2 / para más adelante
- Rubén: probar cómo se siente (velocidades, quiebro, salto, cámara) en PC y móvil; todo se ajusta en `src/config/fiestas.js`. Aquí no se puede juzgar la sensación: el navegador de pruebas va a menos de un fotograma por segundo.
- Las animaciones de verdad (correr, quiebro, salto, trepar, caída) en Blender: F6.
- La tecla M para el sonido no se ha puesto (no hay sonido hasta la F6 y M ya gira el minimapa).
- La pantalla de controles de la pausa sigue siendo la del coche; al entrar a fiestas sale un aviso con las teclas.

### Hecho en F1
- **Entrar y salir** (`src/fiestas/modoFiestas.js`, enganchado en `juego.js`): con `?fiestas=plaza|calle|encierro` o desde la pausa (desplegable «Fiestas»; dentro ofrece «Volver al pueblo»). Fundido a negro; se retira el tráfico, se ocultan los peatones, se pone la hora de «Día» sin cambiar la que el jugador tenía guardada, y el jugador queda a pie dentro del recinto (plaza: en el ruedo mirando al tablado; calle: a 45 m de la puerta; encierro: en el ruedo mirando a la puerta). Al salir se libera todo y vuelve al coche. El código de fiestas va en un archivo aparte (30 kB) que solo se descarga al entrar.
- **Vallado** (`src/fiestas/vallado.js`, medidas en `src/config/fiestas.js`): tablones, panel rojo, barandilla de tubo, cierres de barrotes, puerta (cerrada en «plaza», abierta en los otros dos modos, recogida contra la valla norte), tablado y gradas del nº 2 con filas, burladero, valla gris y manga del corral con su portón. Una malla por material y colisión en cada tramo (3 m de alto: no se salta). Los tramos sin valla (tapias) también llevan colisión: la tapia de `muros.json` tiene un hueco de 0,9 m por el que se salía.
- **Ambiente** (`src/fiestas/ambiente.js`): arena de 16 cm sobre el ruedo (tapa los bordillos), con su colisión; 20 ristras de banderines de fachada a fachada (515 banderines, se mueven con el viento); ambulancia en el callejón sur; público en las aceras de detrás de las vallas, en el tablado, en las gradas y en los balcones (también el del Ayuntamiento). **Los de las gradas y el tablado, sentados** (petición de Rubén): como aún no hay animación de sentado, se doblan los huesos de la postura de quieto.
- **Farolas**: las 4 que caen en el ruedo o en el recorrido se quitan al entrar, con su choque, y se reponen al salir (`farolas.oculta` / `repone`).
- **Montón delante del nº 5** (petición de Rubén): era un bulto de 0,8 m del MDT. Se aplana al cargar el mundo, en las alturas y en la malla (`src/datos/correccionesTerreno.js`); vale también para el modo de conducción. Es el único bulto de más de 20 cm en todo el recinto.
- **Ayuntamiento a mano** (PR 152 de Rubén, fusionado): el tablado y el cierre del callejón sur cuelgan ahora de su fachada, que queda 1,4 m al oeste de la huella del Catastro. El ruedo pasa a 373 m² y 36 m de largo.
- **Prueba automática** (`tools/prueba_fiestas.mjs`, con el servidor de desarrollo y Playwright): capturas, un «bot» que corre al azar a paso de física y comprobación al salir.
  | Modo | Calidad | Recorrido del bot | Pasos fuera del recinto | Al salir |
  |---|---|---|---|---|
  | plaza (puerta cerrada) | bajo y medio | 0,6 km | 0 de 9 000 | igual que antes |
  | calle (puerta abierta) | bajo | 2,4 km | 0 de 36 000 | igual que antes |
  | encierro, móvil emulado 844×390 táctil | bajo | 2,4 km | 0 de 36 000 | igual que antes; mandos táctiles visibles |
  «Igual que antes»: mismas colisiones (12 936), hora, tráfico y peatones visibles, farolas repuestas y nada del festejo en la escena. Sin errores de consola. La escena queda con 1 o 2 mallas más que antes de entrar (cambia de una prueba a otra); no llevan nombre de fiestas y no se ha mirado cuáles son (lo más probable, tejados que el juego genera al acercarse a la plaza). En modo plaza el bot no pasa de la puerta.
- **Coste** (contado, no medido en FPS: aquí no hay tarjeta gráfica): el festejo añade 27 mallas y 0,20 M de triángulos en «bajo» (16 personas) y 51 mallas y 0,49 M en «medio» (40 personas). Casi todo es el público: cada persona son ~11 000 triángulos y una malla con esqueleto. En «alto», 70 personas.

### Pendiente de F1 / para más adelante
- Rubén: probarlo en su PC y en el móvil (`npm run dev` y `?fiestas=plaza&debug=1`) y decir cómo va de FPS. No está publicado en `juegos/` (eso es `npm run publica`, mejor desde su PC).
- El público de calidad «alto» (70 personas, ~0,8 M de triángulos) no se ha podido probar aquí. Si pesa, bajar `FIESTAS.publico.cantidad`; el público lejano simplificado es de la F8.
- La tapia del lado norte de San Roque se ve con un hueco de 0,9 m (viene de `muros.json`); no se puede pasar, pero se ve.
- Las vallas grises de las puertas no dejan entrar (los refugios son de la F2).
- La ortofoto pilló montadas las gradas del nº 2: en calidad «bajo» se ve su mancha en el suelo junto a las gradas.

### Hecho en F0
- `PLAN_FIESTAS.md` añadido al proyecto (venía del chat).
- `src/datos/fiestas.js`: el recinto como dato. Línea de fachadas de la plaza y de San Roque (de las filas de `casasPlaza.js`, las huellas del Catastro y las tapias de `muros.json`; cada lado dice de dónde sale), y de ella cuelgan las vallas, paralelas a `SEPARACION_VALLA` (1,5 m). 31 tramos numerados (plaza 1–5, puerta 6, calle 7–31) con su tipo y dónde se ven (`visto`), cierres de barrotes, ruedo de arena, recorrido de la calle, puerta, tablado, gradas del nº 2, corral con su pasillo y su patio, ambulancia, burladero, valla gris, regla del encierro, zonas de público y dudas. `estado: 'propuesta'`.
- `tools/20_recinto_fiestas.py` → `data/processed/previews/recinto_fiestas.png` (y copia en `docs/fiestas/recinto_fiestas.jpg` con `--jpg`): vista general, tres detalles y el texto de las dudas. Lee `fiestas.js` con node (única fuente). Comprueba que ninguna valla atraviesa edificios, que la línea de fachadas pasa por fachadas reales, el ancho libre y el desnivel, y lista lo que hay hoy en el recinto. Con `--assets` usa otra carpeta de datos (la del juego publicado) y, si no están las teselas de la ortofoto, las saca de `cabanillas.glb`.
- Medidas (con el Ayuntamiento a mano): plaza 577 m² entre fachadas, ruedo 373 m² (36 m de largo; 8,0 m de ancho en la puerta y 12,4 m junto al tablado). Calle: 155 m de eje desde la puerta; el paso más estrecho son los 3,5 m entre las gradas del nº 2 y la valla norte. Puerta de 4,5 m. Casi llano: 0,7 % en la plaza y 0,9 % en la calle.
- En el recinto hoy: 0 coches aparcados, 9 farolas (1 del LiDAR y 8 estimadas), 3 árboles del LiDAR en San Roque (el de x ≈ 131 se ve en la foto 2) y ningún banco ni señal de OSM. La F1 decide qué se quita.

### Lo que fijan las respuestas, las fotos y los croquis de Rubén (descritos en `docs/fiestas/README.md`)
- Separación valla–fachada: 1,5 m (foto 2 y croquis 1).
- **Tablado**: 3 m de fondo, 3 m por delante de la fachada oeste del Ayuntamiento, de la valla norte a la esquina de la cara sur. Por detrás se pasa del callejón norte a la acera de detrás de la valla norte. El cierre hacia el callejón sur va en línea con su frente.
- No hay camión. Las vacas salen de los **corrales**, el patio de detrás del nº 8 de la plaza, por un pasillo que acaba en el portón del nº 8 y una manga de tablas que cruza la acera. La **ambulancia** va dentro del callejón sur del Ayuntamiento.
- **Gradas a dos aguas delante del nº 2** de la plaza (no en la boca de la Fragua): una mira a la plaza y la otra a la calle. La **puerta** sigue su cara este: la mitad sur del cierre es fija (el frente de la grada) y la mitad norte es la puerta. La calle pasa por el hueco que queda entre las gradas y la valla norte.
- **Encierro** (para la F5): con la puerta abierta todo el rato, las vacas salen del corral, van hasta el final de la calle y vuelven a la plaza; el corral sigue cerrado y repiten el recorrido; a la segunda vuelta lo encuentran abierto y entran.
- Tipos de valla vistos: tablones en la plaza y en el lado norte de la calle hasta la mitad del nº 29; barandilla roja de tubo frente al resto del nº 29, que acaba en un cierre de barrotes contra la tapia; sin valla en las tapias de bloque del lado norte y en la casa siguiente (Catastro 365), que lleva una valla gris en la puerta; panel rojo macizo en el lado sur, del Catastro 166 al nº 54.
- Un burladero en el lado sur de la plaza.
- 18 de los 31 tramos (213 de 426 m) se ven en fotos o croquis. El resto sigue de tablones como propuesta (con «?» en el plano).

### Puesto a ojo o sin confirmar (dudas abiertas en `fiestas.js` y en la imagen)
- D1: la lectura del rectángulo rojo del croquis 1 (tablado separado 3 m de la fachada).
- D13 medidas de las gradas del nº 2 (5 m de fondo; 3 + 4 m de gradas y 2,4 m de hueco), sacadas del croquis 3 y de la ortofoto, donde se ven montadas. Patio y pasillo de los corrales, también a ojo (no se ven desde la plaza).
- D6 sitio del burladero y los demás. D5 tipo de valla de los tramos 13–24 y 29. D7 final del recorrido. D8 bocacalles de la Vicera, de la Fragua y del ramal. D9 plazuela y retranqueo.
- Resueltas: D2 (ambulancia, no camión), D3 (callejones cerrados), D4 (1,5 m), D10 (puerta), D11 (encierro) y D12 (corral en el nº 8).

### Dudas de la F0 que siguen abiertas
- Tienen todas un valor puesto y se pueden cambiar después (son un número o una palabra en `fiestas.js`): D1, D5, D6, D7, D8, D9 y D13.

### Decisiones
- El recinto vive solo en `src/datos/fiestas.js`; la herramienta de Python lo evalúa con node para no duplicarlo.
- Las vallas no se guardan punto a punto: se calculan de la línea de fachadas y la separación. Cambiar la separación o el tipo de un tramo es cambiar un número o una palabra. Donde dos tramos seguidos tienen distinta separación sale un escalón con su cierre de barrotes.
- En la foto aérea los tejados salen desplazados 1–2 m (no es ortofoto verdadera): para las vallas manda la línea de fachadas del Catastro, que es la del juego.
- Las fotos y los croquis de Rubén no se suben al repositorio (es público; en las fotos salen vecinos reconocibles y son de la retransmisión, y los croquis van sobre capturas de Google Maps): queda su descripción en `docs/fiestas/README.md`.
- La foto que Rubén rotula «nº 22» se ha situado en el nº 25 de San Roque (Catastro 365): tapia de bloque a continuación, árbol del LiDAR en la acera y el cierre de barrotes del nº 29 al fondo. El nº 22 de OSM está 60 m al oeste de la Sala de Cultura, fuera del recinto.
- La ortofoto del juego pilló montadas las gradas del nº 2 (por eso salía un «tejado» en medio de la calle junto al nudo). En F1 habrá que ver si se nota en el suelo del modo de conducción; en fiestas queda debajo de las gradas.
- La F0 se hizo en sesiones en la nube sin `public/assets/` ni `data/raw/`: los datos se leyeron del juego publicado (`juegos/cabanillas-drive/assets`).

## Salto en paracaídas (PLAN_SALTO.md)

**Hito actual: S0 hecho (2026-11-19), pendiente de que Rubén lo pruebe.** Se juega con `?salto` (o `?salto=7` para repetir la misma ruta); sin el parámetro, el inicio no cambia.

### S0 — Prototipo sin modelos (hecho)
- `src/salto/`: `salto.js` (máquina de estados avión → salida → caída → apertura → planeo → aterrizaje), `ruta.js` (recta al azar con semilla, pasa a ≤ 220 m del centro del casco), `caida.js` (física sin Rapier, apertura automática a `70 + 1,5·max(0, |vy| − 35)` m), `camaraSalto.js`, `alturaRender.js`, `aterrizaje.js`, `figuras.js` (avión de cajas, cápsula y lona en arco roja y blanca: provisionales hasta S2). Ajustes en `src/config/salto.js`.
- Render según la altura: `near = clamp(0,015·h, 0,5, 2)` (techo de 2 m por la indicación de Rubén, para no recortar al personaje), far 6000 m (3200 en «bajo») y niebla del aire; sin N8AO por encima de 150 m (`render.ponAo`); sin carpintería, cristales ni rejas de las casas a mano por encima de 120 m (`casas.userData.ponDetalle`); hierba, coches y detalle de edificios no se generan bajo la cámara si va alta, y las celdas del sitio de aterrizaje se cargan desde que se abre el paracaídas. Al aterrizar todo vuelve a los valores de la calidad.
- Aterrizaje: lo que hay debajo es el terreno o el tejado del Catastro. Si cae en un tejado, en el agua o encima de algo, baja a la calle más cercana. El coche queda aparcado en esa calle a ~7 m (si cae en el campo, a su lado mirando hacia la calle) y se sigue a pie (primera persona).
- Mandos: modo «salto» en `entrada.js` (`CONTROLES.teclasSalto`: Espacio salta y abre). En táctil, un botón 🪂 en lugar de los del coche.
- Prueba: `tools/prueba_salto.mjs` (avión, salto con Espacio o 🪂, no abre por encima de 500 m, se abre solo a ~90 m, near ≤ 2 m, aterrizaje válido con el coche a < 15 m, salto forzoso y 5 rutas al azar). **Todo bien** en «bajo», «medio», «alto» y móvil. Uso con el Chrome instalado: `$env:PUERTO=5180; $env:CANAL="chrome"; $env:PLAYWRIGHT_RAIZ=<carpeta node_modules con playwright>; node tools/prueba_salto.mjs <capturas> bajo`. Capturas en `data/processed/previews/salto/`.
- Medido (llamadas de dibujo, contando la pasada de sombras; triángulos), ruta 7:

  | | 550 m | 200 m | 50 m | a pie al aterrizar |
  |---|---|---|---|---|
  | alto 1280×720 | 192 · 1,2 M | 661 · 1,3 M | 1149 · 2,1 M | 1354 · 3,7 M |
  | bajo 1280×720 | 175 · 0,9 M | 515 · 0,9 M | 527 · 1,1 M | 594 · 2,0 M |
  | bajo 375×812 | 139 · 0,8 M | 272 · 0,7 M | 234 · 0,8 M | 277 · 1,1 M |

  El salto nunca cuesta más que ir a pie por la calle. Antes de ocultar el detalle de fachadas, a ~370 m en «bajo» salían 809 llamadas (519 de las casas a mano: 29 filas × ~18 materiales). **FPS sin medir**: el navegador de pruebas va a menos de 2 FPS; Rubén puede verlos con `?salto&debug`.

### 2026-11-19 (tarde) — Inicio con salto, casas juntas y modelos de Rubén
- **Recursos desactualizados en esta copia** (lo vio Rubén en la acera de San Isidro): `public/assets/` no está en git y la copia `Rubenpantxo.github.io` tenía el suelo del 11-nov a las 17:33, de antes de las correcciones de asfalto, acera y bordillo; le faltaba `suelo/bordillo.png`, y `suelo/tipos.png`, `osm/marcas.json` y `coches_aparcados.json` eran distintos. Copiados de `bifurcaciones/feat-cabanillas-drive` (los más nuevos, idénticos a los del juego publicado). En git no había nada sin fusionar: `main` = `origin/main` y la rama `feat/cabanillas-ayuntamiento` de esa otra copia está fusionada (va 36 commits por detrás). **Los datos del pipeline (`data/processed/`) siguen solo en esa otra copia.**
- **El juego empieza por el salto.** En la pantalla de inicio: «🪂 Jugar» (salto), «🚗 Empezar en la calle» (como antes) e «🐂 Ir a las fiestas». En la pausa, mientras se vuela, «⏭ Saltarse el salto». `?salto=0` lo omite; `?salto=N` repite la ruta N. Entrar a las fiestas o «Ir a…» lo cancelan. Las pruebas antiguas abren con `?salto=0`, y todas aceptan `PUERTO` y `CANAL=chrome`.
- **Casas a mano juntas por material y celda de 400 m** (`casas.js`, `juntaPorCeldas`): de 519 mallas a 176. Llamadas de dibujo: plaza de 1756 a 1480 (alta) y de 793 a 657 (baja); desde el aire a 370 m, de 670 a 442 y de 514 a 355. Con celdas de 150 m apenas mejoraba (las rayas partían la plaza en seis).
- **Avión y mochila-paracaídas de Rubén** (`modelos/salto/`, versionados) → `npm run salto` (`tools/optimiza_salto.mjs`) → `public/assets/salto/` (55 y 42 KB). Los GLB venían de `THREE.GLTFExporter` con **todas las mallas guardadas como líneas** (material en «wireframe»: el exportador deja el índice de triángulos pero marca LINES): el script las devuelve a triángulos sin perder nada (86 + 43), deja las cuerdas de verdad como líneas y quita 139 KB de `extras` sobrantes. `src/salto/modelos.js`: hélices que giran sobre su eje; mochila **cerrada** en la espalda (venía exportada abierta) que se abre en la fase de apertura (solapas → pilotillo → bandas y cuerdas → cúpula de 9 celdas) y se pliega al aterrizar. Salida por el final de la rampa trasera. Si no cargan, se usan las figuras provisionales.
- Pruebas: `prueba_salto.mjs` todo bien en «bajo», «medio» y «alto» móvil (con los nuevos inicios: Jugar → avión, «Empezar en la calle», «Ir a las fiestas», «Saltarse el salto», `?salto=0`). `prueba_entradas.mjs` (con `?salto=0`): todo bien salvo dos comprobaciones que dependen del entorno, no del salto: el aviso «Fiestas · Plaza» ya ha caducado cuando la prueba lo lee (el navegador sin gráfica va a menos de 2 FPS; leído en el primer fotograma, sale bien) y tres 404 (el favicon y `/juegos/cesta-punta/`, que solo existe en el sitio publicado).
- **Script CAD paramétrico de Rubén** en `tools/build_activos_salto.py`: adaptado a Blender 5.0 (los materiales nuevos ya no traen «Principled BSDF»), lee `config.json` y escribe en `data/processed/salto_blender/` sin pisar nada (con `--out modelos/salto` sustituye los del juego). Ejecutado y comprobado: sus modelos (más sencillos: celdas sueltas, sin cuerdas) también cargan y se animan en el juego.

### Decisiones provisionales de S0 (las dudas de la sección 3 del plan, a confirmar por Rubén)
1. ~~El salto solo con `?salto`~~ Decidido por Rubén (2026-11-19): el juego empieza por el salto, con forma de saltárselo.
2. Tras aterrizar, a pie en primera persona (la de siempre).
3. No se aterriza en tejados: se baja a la calle (en S3, desvío progresivo por debajo de 25–30 m).
4. Avión siempre a 550 m sobre el centro.
5. Paracaídas rojo y blanco.

### Pendiente
- **S1 hecho (2026-11-19, con permiso de Rubén):** `tools/40_horizonte.py` → `public/assets/horizonte/` (2,1 MB: alturas 401×401 a 20 m y ortofoto de 2048 px, 1024 en baja). Cuadrado de 8 × 8 km. MDT05 del IGN por WCS (`Elevacion25830_5`), desfase con el terreno del juego −0,01 m. Ortofoto del mismo WMS y capa que `02_ortho.py`, correlación 0,977 con la del juego (mismo vuelo). Costura: la rejilla toma dentro de la zona la altura del terreno 0,3 m hundida; diferencia media en la primera fila de fuera, 0,59 m. `src/escena/horizonte.js`: anillo sin luz con una falda lisa a 15 km que la niebla funde con el cielo (ya no asoma la franja marrón del cielo fotográfico). En el aire la cámara llega a 12 km y la niebla acaba a 4 km (3 km en baja). Coste: 2 llamadas; 310 000 triángulos en alta y 78 000 en baja. Vista previa: `data/processed/previews/horizonte.jpg`. También se ve desde la calle (las Bardenas al fondo). Descargas en caché en `data/processed/horizonte/`.
- **S3 (parte, 2026-11-19):** minimapa del salto con la ruta del avión (discontinua), una cruz donde te tira y el aro del aterrizaje previsto; el radio crece con la altura (1100 m en el avión). Sonido sin archivos (`src/salto/sonidoSalto.js`): motor del avión con el batir de las hélices (se aleja al saltar), viento que sube con la velocidad y golpe de tela al abrir; M quita y pone el sonido (misma preferencia que las fiestas) y la pausa lo calla. `prueba_salto.mjs` lo comprueba: todo bien en «bajo». Falta de S3: medir en un móvil.
- **FPS del salto (S3, 2026-11-24)**, medidos con Chrome sin ventana pero con la gráfica del PC (Radeon RX 6700 XT, ANGLE D3D11), calidad «bajo», `?salto=7`, bucle real del juego (scripts en el borrador de la sesión: `fps_salto.mjs`, `perfil_salto.mjs`). Escritorio 1280×720, tras los arreglos de abajo: 220–306 FPS en todas las fases (avión 272, caída 306, planeo 250, últimos 30 m 226, a pie 232; antes 197–276), 220–390 llamadas; peor fotograma 29 ms al abrir (antes 55 ms, y 143 ms en los últimos 30 m). Pantalla de móvil 844×390 con la CPU frenada ×4 (para parecerse a un teléfono; la gráfica sigue siendo la del PC): 35–44 FPS, 27 en la apertura (antes 22–37). Manda la CPU: el 61 % es dibujar (three.js: matrices, uniformes, cambios de programa) y el salto en sí cuesta un 3 %.
  - Tirones encontrados y arreglados: (1) compilar sombreadores la primera vez que salen el personaje y la mochila (834 ms al saltar con la CPU ×4), los rótulos de las casas (a 117 m), la hierba (a 98 m) y los coches (a 14 m): al empezar el salto se compila toda la escena con todo visible un instante (`precompilaEscena` en `juego.js`; con `renderer.compile`: `compileAsync` daba error si te saltabas el salto en seguida); (2) construir una celda de edificios con tejados del LiDAR de golpe (175–210 ms, varias seguidas al acercarse al aterrizaje, también conduciendo): ahora se construye a trozos de 4 ms por fotograma (`edificios.avanza`, `ESCENA.msObraEdificios`); (3) la hierba de un sitio nuevo (140 ms, la mitad comprobando el agua): como mucho dos celdas nuevas por fotograma. Con la CPU ×4, el peor fotograma pasa de 213 a ~100 ms y no quedan tareas de más de 120 ms salvo una de ~180 ms al saltar (probablemente la sombra del personaje, que la compilación previa no cubre).
  - Probado y descartado: dibujar una vez toda la escena en una imagen de 1×1 para que el controlador acabe los sombreadores: para el avión 5 s (×4) y apenas mejora el salto.
  - Falta medirlo en un móvil de verdad (Rubén).
- **Desvío a la calle (S3, 2026-11-19):** con el paracaídas abierto, por debajo de 28 m, si el aterrizaje previsto cae en un tejado, en el agua o encima de algo, se busca una calle (cada 0,25 s hasta encontrarla; luego queda fija) y el planeo se va llevando hacia ella. El peso sube suave de 0 a 28 m a 1 a 6 m y no vuelve a bajar (al salir del tejado la altura sobre el suelo crece de golpe); por encima de 28 m el control es entero del jugador. Mezcla la velocidad del jugador con la que hace falta para llegar justo al tocar el suelo (máx. 16 m/s) y gira el personaje hacia allí. La calle se elige entre las más cercanas a varios puntos del camino (`calleDesvio` en `aterrizaje.js`): la más cercana al punto previsto a la que se llega en línea recta sin pasar por debajo de un tejado (si no, cruzaba el tejado y lo tocaba antes de llegar). Aviso: «Debajo hay un tejado: el paracaídas te lleva a la calle». Parámetros en `SALTO.planeo.desvio`. Si aun así cae mal, sigue el arreglo de antes (te baja a la calle de golpe). `prueba_salto.mjs` (apartado 5b) suelta al jugador a 60 m apuntando a seis tejados del casco: los seis se posan en la calle solos, sin desvío antes de los 28 m.
- `?personaje=0` (saltarse el editor de personaje) arrancaba solo el editor y no el juego: `main.js` miraba `parametros.has('personaje')`. Corregido (2026-11-19); `prueba_salto.mjs` abre con `personaje=0`. Las demás pruebas (`prueba_entradas`, `prueba_menu`…) aún no lo llevan: con el editor nuevo, sus botones de jugar abren el editor primero.
- **Todas las pruebas pasan (2026-11-19)** con `?personaje=0` (el editor de personaje se lo salta), `PUERTO` y `CANAL=chrome`: modos, mozos, recortes, vaca, salto, entradas, menú, personaje, fiestas (plaza, calle, encierro), ambiente, cogida, marcador y disposición. Para pasarlas mientras otra sesión guarda archivos hace falta un servidor sin recarga automática (si no, Vite recarga la página en mitad de cada prueba); en `.claude/launch.json` está «cabanillas-pruebas», con una configuración de Vite sin HMR ni vigilancia de archivos (en el borrador de la sesión: hay que reiniciarlo para que vea cambios). Arreglos: icono vacío en `index.html` (el 404 de `/favicon.ico` hacía fallar las comprobaciones de consola); el aviso de fiestas en pantallas bajas, a 85 px (con la letra de Chrome en Windows pisaba el marcador 4 px); `prueba_entradas` lee el último aviso (`api.ultimoAviso`) en vez del texto en pantalla, que caducaba antes de leerlo; `prueba_disposicion` dice cuántos píxeles se pisan.
- Descargas desde Python en este PC: algo intercepta HTTPS con su propio certificado raíz y `www.ign.es` no manda su cadena completa; `tools/40_horizonte.py` usa `truststore` (instalado con pip en `cabdrive` y añadido a `environment.yml`). conda no llega a conda-forge por lo mismo.
- Hecho (2026-11-25): las líneas blancas de parcelas que se veían desde el aire fuera de la zona eran tapias del paso 3 de `tools/13_muros.py`. El casco urbano del Catastro incluye trozos lejanos del término, hasta a 1,3 km, y fuera del terreno el juego les daba la altura del borde, así que flotaban sobre el horizonte. Ahora `13_muros.py` recorta todos los muros a la zona, 1 m hacia dentro (`recorta_a_zona`). Quedan 1640 muros de 1770: 142 tramos quitados o recortados. Como los rasters y `data/raw` no están en este checkout, el recorte se aplicó al `muros.json` ya generado con la misma función. Copiado también a `juegos/`.
- Hecho (2026-11-19): los materiales de las casas a mano que solo cambian de color (enfoscados, persianas y lisos de igual aspereza y brillo) se juntan en uno con color por vértice; el detalle de fachada sigue aparte. Mallas de 176 a 135; casas en vista de 114 a 94 en la plaza y de 132 a 99 desde el aire; mismo aspecto. Quedan 111 materiales distintos: tejas, ladrillos, sillares, tablas… llevan el color pintado en la textura.
- Hecho (2026-11-19): la cápsula del salto es ya la persona de MakeHuman del jugador de fiestas (`src/salto/persona.js`), con posturas que siguen a los mandos: caída en cruz (rodillas dobladas, brazos abiertos), picado (W, brazos atrás), frenado (S, más abierto), colgado del paracaídas (brazos arriba a los mandos) y posarse por debajo de 7 m. La mochila se coloca en su espalda a partir del hueso del pecho. Sin personas cargadas, sigue la cápsula. Prueba del salto: todo bien en «bajo».

### 2026-11-19 (noche) — El personaje del editor en el salto (pedido por Rubén)
- **Salta el personaje del editor** (`personas.jugador`, ver `PLAN_PERSONAJE.md`). Con `?personaje=0` o al volver de otro juego se monta el último guardado **antes** de crear el salto (antes caía la persona por defecto).
- **Posturas por dirección** (`persona.js`): cada postura dice hacia dónde apunta brazo, antebrazo, muslo y pierna (+Y arriba, +Z delante, x hacia fuera) y cada hueso se gira lo justo para apuntar ahí. Antes se giraba el codo sobre un eje fijo y, con los brazos en cruz, solo se retorcía. Caída en postura de caja (tripa abajo, brazos en W, rodillas a ~80°); posarse con los mandos tirados hasta la cadera, piernas juntas y rodillas algo dobladas. Vale para cualquier cuerpo.
- **Mochila redibujada** (`src/salto/mochilaNueva.js`, en código sobre el modelo de Rubén, sin tocar `modelos/salto/`): contenedor de una pieza contorneado y abombado, respaldo acolchado, solapas oscuras con vivo rojo, costura y franja de la reserva, bolsillo del pilotillo y cintas de hombro, con relieve de rip-stop. Se esconden las cajas del modelo, **las perneras** (los dos aros que colgaban bajo el personaje) y el arnés delantero del modelo, que flotaba. Las solapas y la cúpula siguen siendo los nodos del modelo y se abren igual. Se mide contra la espalda (cuerpo y ropa) y sigue a `spine_02`: no se despega al arquearse.
- **Arnés ajustado a cada cuerpo** (`src/salto/arnes.js`): tirantes de la mochila por el hombro y el pecho hasta las perneras, cinta del pecho con hebilla y perneras en lo alto de los muslos. Se mide el contorno del cuerpo y la ropa en cortes (de perfil para los tirantes, horizontales para el pecho y los muslos) y la cinta va tensa por encima (máximo de ±3°, 12 mm de separación). Lleva piel (pesos del vértice más cercano): se mueve con las posturas. Probado con el hombre por defecto y con una mujer corpulenta, en caída y con paracaídas.
- **Pelo al viento** (`persona.js` + shader del pelo en `src/personaje/materiales.js`): cada vértice del pelo lleva cuánto puede moverse (0 en el cuero cabelludo … 1 en las puntas, según lo lejos que quede del centro de la cabeza; el corto apenas se mueve) y el shader lo empuja con el aire relativo (la velocidad medida entre fotogramas, pasada al espacio de la malla) más un temblor que cambia a lo largo del mechón. Empuje de las puntas: 7 cm en caída y 3,8 cm con el paracaídas (curva de raíz). El pelo del salto lleva material y geometría propios: el del jugador de las fiestas no se mueve. Ajustes en `SALTO.pelo`.
- **Cámara del salto más cerca** (`SALTO.camara`): 4,6 m en caída y 9 m con el paracaídas (antes 9 y 15: el personaje salía diminuto).
- **El coche ya no te sigue** (pedido por Rubén): al aterrizar se queda aparcado donde estaba y hay que ir a buscarlo. El minimapa lo marca como «Mi coche» (🚗 en un círculo amarillo; si queda fuera, una flecha amarilla en el borde con la distancia), también durante el salto y a pie; en el mapa grande, 🚗 «Mi coche». Aviso al aterrizar: «Ve a buscar tu coche: está donde lo dejaste». `prueba_salto.mjs` comprueba que el coche no se mueve: todo bien en «bajo» (5 rutas, a 67–510 m).
- **Sin botón «Mano» a pie**: los mandos táctiles llevan la clase `a-pie` mientras se anda y el freno de mano se esconde sin mover los demás botones.
- Arreglo del modelo: el vaivén de la pelvis de las animaciones salía ×14 (la altura de la plantilla se medía en el espacio girado de la malla) y desplazaba el cuerpo 16 cm, también al andar en las fiestas.

## Agricultura (PLAN_AGRICULTURA.md)

**Fase actual: A9 (ciclo completo, dinero, guardado, avisos y minimapa) hecha el 2026-11-26, pendiente de que Rubén la pruebe.** A8 aprobada (2026-11-26); A7 aprobada (2026-11-25); A6 aprobada (2026-11-25); A5 aprobada (2026-11-25); A4 aprobada (2026-11-25); A3 aprobada (2026-11-25); A2 aprobada (2026-11-24); A0 aprobada; A1 omitida por decisión de Rubén (la parcela de pruebas, 2-700, está en la zona del juego). Rama `feat/cabanillas-agricultura` (subida a GitHub a petición de Rubén; `main` sin tocar).

### Hecho en A0
- **Todas las parcelas del término** (decisión de Rubén): 1 775 rústicas + 22 mixtas = **1 797 parcelas, 3 275 ha** de las 3 574 del término; 9 polígonos. 259 dentro de la zona del juego, 70 en parte y 1 468 fuera.
- `tools/50_parcelas.py` + bloque `agricultura` en `config.json`. Datos del **WFS de IDENA** (permiso de Rubén): `CATAST_Pol_ParcelaRusti`, `CATAST_Pol_ParcelaMixta`, `CATAST_Pol_ParcelaVia`, `CATAST_Pol_CascoUrbano`, `CATAST_Pol_Poligono`, `CATAST_Pol_Municipio`, `SIGPAC_Pol_Recinto` y `REGADI_Pol_Parcelas` (Cabanillas = `CMUNICIPIO` 62). Catastro con fecha de alta 16/11/2026. El servidor da 1 000 elementos por petición y su paginación no sirve (el campo `FEATURE` es igual en toda la capa): se parte la caja en cuadrantes con `BBOX` dentro del `CQL_FILTER` y se comprueba el recuento.
- Por parcela: referencia, paraje, superficie, perímetro, contorno en coordenadas locales (agujeros y trozos incluidos), cota media/mín/máx, pendiente y hacia dónde baja, dirección de labor, entrada y metros de frente a camino, uso SIGPAC y superficie cultivable, secano/regadío, comunidad de regantes, enlace a la ficha del Catastro y dudas.
- Relieve: terreno del juego (LiDAR 1 m) dentro de la zona; fuera, MDT05 de la caché del horizonte + **4 bloques de 2 km al norte** del mismo WCS del IGN (el término llega 1,3 km más al norte que el cuadrado del horizonte). El MDT05 da metros enteros: vale para cota y pendiente medias, no para el riego (A1/A7).
- Caminos para las entradas: huecos entre parcelas de ≥ 2,5 m, viales SIGPAC (CA), parcelas de vía y casco urbano. 136 parcelas quedan sin camino al lado (se entra por otra o falta el camino).
- Salidas: `public/assets/agricultura/parcelas.json` (3,8 MB; 0,96 MB comprimido), `data/processed/agricultura/parcelas.csv` (para buscar en Excel), vistas en `data/processed/previews/`: `parcelas.jpg`, `parcelas_cotas.jpg`, `parcelas_cotas_vega.jpg`, `parcelas_zona_juego.jpg` y `parcelas_pol_01…09.jpg`. Re-ejecutado sin descargas: salida idéntica.

### Comprobaciones
- Catastro y SIGPAC: el mismo contorno en todas (coincidencia ≥ 99,7 %); superficie calculada = la del Catastro (< 2 %) en todas.
- Contornos sobre la ortofoto de la zona del juego: casan con las lindes y los caminos que se ven.
- Pendiente: la del plano ajustado al relieve (mediana 1,4 %) y la del SIGPAC (mediana 4,1 %, tomando `PENDIENTE` en décimas de %) se parecen (correlación 0,77) pero no coinciden; el SIGPAC sale más alto. Se guardan las dos.
- Usos SIGPAC principales: tierra arable 2 285 ha, pasto arbustivo 576 ha, forestal 264 ha, viales 58 ha. Regadío: 983 parcelas en el SIGPAC; casi todo de la comunidad «Canal de Tauste (Tauste)».

### Decisiones de Rubén (2026-11-20, tras ver A0)
- Contornos y entradas bien: **A0 aprobada**.
- **Cultivos:** trigo, cebada, cebolla, brócoli, alcachofa y espárrago. Cereales en A6–A8; hortícolas en una fase nueva, A10 (la de rendimiento y publicación pasa a A11).
- **COPE** (Sociedad Cooperativa del Campo San Isidro) = nave agrícola y tienda: se compran semillas, plantel, abono, herramientas y aperos y se vende la cosecha. La marcó en una foto aérea: coincide con la **parcela urbana 2-1031 del Catastro** (2,29 ha), en la calle San Isidro, al oeste del campo de fútbol.
- Parcela de pruebas: de regadío junto al pueblo. Candidatas en `data/processed/previews/cope_y_parcelas_prueba.jpg`: A 2-650, B 2-700 (al norte de la COPE) y C 1-1100 (junto al canal). 2-701, la más cercana, es mixta (tiene construcción) y se descarta.
- (2026-11-21) **Parcela de pruebas: B, la 2-700** (0,44 ha, Cza las Planas, regadío). **A1 se omite.** Empezar A2.

### Hecho en A2 (2026-11-21)
- `src/agricultura/`: `registro.js` (las 1 797 parcelas en una rejilla de 100 m: qué parcela hay en un punto), `parcela.js` (malla de 1 m apoyada en el terreno, 3 cm por encima, solo en las celdas de la parcela; máscaras de laboreo y de cultivo en `Uint8Array` + `DataTexture`; máscara «dentro» con el fundido de la linde; recuento por estado), `pincel.js` (franja barrida por un apero entre dos puntos, con borde suave, solo dentro de la linde; ocho labores: rastrojo/borrar, arar, gradear, abonar, sembrar, regar, cosechar y rodadas), `sueloParcela.js` (material) y `modoAgricultura.js` (pincel de pruebas). `src/config/agricultura.js` y `src/datos/parcelas.js`.
- **Material:** malla transparente; lo que no se ha trabajado no se dibuja y se ve la ortofoto de debajo tal cual (sin costuras). Arado: tiras de vertedera en la dirección de cada pasada y terrones, con relieve calculado en el shader y sombreado con el sol del juego. Gradeado: más claro y liso. Abono: moteado de granulado (de lejos, un velo). Sembrado: líneas cada 17 cm en la dirección de la pasada. Mojado: oscurece lo de debajo (también la foto) y encharca en los bajos con el agua a tope. Cosechado: rastrojo claro e hileras de paja cada 6 m. Rodadas: huella aplastada con tacos, hundida. Linde con borde irregular que se funde con la foto. De noche oscurece como la ortofoto (`LUZ_SUELO`) y recibe las sombras 3D.
- La hierba 3D (`hierba.js`) se quita de lo labrado (`ponExclusion`).
- Máscaras a 0,5 m/píxel en las tres calidades (en «bajo» con tope de 512 px de lado; en alta y media, 1 024). Parcela 2-700: 195 × 189 px, malla de 9 032 triángulos, una llamada de dibujo.
- **Pincel de pruebas:** `?agricultura=pincel` (y `&parcela=2-650` para otra parcela; desde A3, `?agricultura` a secas es el modo con el tractor). Panel con las ocho labores (teclas 1–8), ancho de 0,5 a 12 m, 🖌️ Pintar / ✋ Mover (Espacio), vistas Cerca, Lejos y Arriba, 🧪 Muestrario (una franja por estado, con su nombre encima), Limpiar y el recuento en %. Ratón: botón izquierdo pinta, derecho gira, rueda acerca, Mayús+izquierdo desplaza. Táctil: un dedo pinta (o gira en ✋), dos dedos acercan y desplazan. El juego queda en pausa debajo; ✖ recarga sin el parámetro.
- Único cambio en un archivo compartido: `src/main.js` (13 líneas: con `?agricultura` no hay salto, se carga el modo con `import()` y se salta la pantalla de inicio).
- **Prueba:** `node tools/vista_agricultura.mjs <carpeta> [bajo|medio|alto] [movil]`: superficie de la máscara = la del Catastro (0,442 ha), recuentos del muestrario, trazos curvos con el ratón o el dedo (ara y siembra), nada fuera de la parcela, sin errores de consola y, sin `?agricultura`, no se descarga nada del modo. **Todo bien** en «bajo» escritorio, «bajo» móvil (412 × 860, táctil) y «alto». Capturas en `data/processed/previews/agricultura/`.
- Arreglado por el camino: la malla sin normales hacía que la luz de Lambert diera NaN y la parcela salía negra.

### Decisiones de Rubén (2026-11-24, tras ver A2)
- **A2 aprobada** («okey»): los estados y los colores valen.
- **Riego de la 2-700:** marcó sobre la captura de la COPE la acequia (línea verde) y por dónde entra el agua (flechas): la acequia corre por fuera de la linde **sureste** de la 2-700, de nordeste a suroeste, hasta el camino del norte de la COPE; el agua entra por esa linde, en su tramo del lado este. Copia de su captura en `docs/agricultura/riego_2-700_acequia.jpg` y coordenadas (±3 m, a confirmar en A7) en `AGRICULTURA.riegoPruebas` de `src/config/agricultura.js`: las dos boqueras caen en la linde (a menos de 5 cm) y la acequia queda a 2,7 m por fuera.
- **Maquinaria:** pasó como referencia fotos de dos tractores (uno verde y otro rojo, de dos marcas) y de una cosechadora amarilla. Se toman solo proporciones y colores; los modelos son genéricos, sin marcas, logotipos ni rótulos (regla del plan).

### Hecho en A3 (2026-11-24)
- **Tractor genérico** con `tools/build_maquinaria.py` (Blender en consola, solo primitivas y colores, sin texturas): doble tracción, ~5,2 × 2,6 × 3,4 m, ruedas traseras de 0,86 m de radio y delanteras de 0,62, capó con el frente inclinado, rejilla negra de arriba abajo con faros y faros en los costados, contrapesos delanteros, cabina de cuatro postes acristalada, escape vertical, rotativo, luces de trabajo, guardabarros traseros y tripuntal con toma de fuerza. Piezas con nombre (`rueda_*`, `carroceria`, `vidrios`, `tripuntal`, `luces_trabajo`, `rotativo`, `pilotos`); 12 600 triángulos; `modelos/maquinaria/tractor.glb` → `npm run maquinaria` → `public/assets/maquinaria/` (113 KB). Vistas en `data/processed/previews/maquinaria/`.
- **Física:** el mismo controlador que el coche (`src/vehiculo/coche.js`, ahora con configuración como 4.º parámetro y `motor.traccionTotal`). `src/config/maquinaria.js`: 6,2 t, centro de masas bajo, casi sin suspensión, mucho agarre, 40 km/h en carretera, 14 marcha atrás, freno motor fuerte, giro cerrado. Cámara propia (más alta y lejos) y cámara de cabina (C o 👁).
- **COPE:** entrada «COPE · San Isidro» en el patio (`src/config/entradas.js`, solo con el modo activo). E (o «Entrar») abre `src/hud/menuCope.js`: elegir color (rojo, verde, azul o naranja; se recuerda) y «Coger el tractor», o con el tractor «Dejar el tractor y coger el coche». El que no se conduce queda aparcado en el patio (`AGRICULTURA.cope`: sitios del tractor y del coche, lejos de la nave y las casetas) y sigue en la física, frenado.
- `src/agricultura/modoAgricultura.js` (el modo: tractor, aparcamiento y menú) y `maquina.js` (carga del modelo). El pincel de A2 pasa a `pincelPruebas.js` (`?agricultura=pincel`).
- Ganchos en archivos compartidos, todos inactivos sin `?agricultura`: `juego.js` (vehículo intercambiable: `cambiaVehiculo`, `aparcaVehiculo`, vehículos aparcados en la física, `cargaAgricultura` con `import()`), `camaraCoche.js` (`ponVehiculo` y ajustes por vehículo), `coche.js` (configuración y tracción total), `main.js` (con `?agricultura` se empieza en la COPE sin salto) y `entradas.js`.
- **Prueba:** `node tools/prueba_tractor.mjs <carpeta> [bajo|medio|alto] [movil]`: salida en la COPE con el tractor aparcado, menú, coger el tractor en verde, andar adelante y atrás sin volcar, cámara de cabina, entrar en la 2-700 desde su linde, dejar el tractor y volver al coche, sin errores y sin nada del modo sin `?agricultura`. **Todo bien** en escritorio y móvil. `vista_agricultura.mjs` (A2) sigue bien.

### Decisiones de Rubén (2026-11-25)
- **A3 aprobada** («okey, empieza a4»): el tractor y la COPE valen.

### Hecho en A4 (2026-11-25)
- **Aperos genéricos** en `tools/build_maquinaria.py` (sin marcas, con placas de señalización rojas y blancas): **arado reversible de 4 cuerpos** (1,6 m de trabajo, verde oliva: cabezal con cilindro de volteo, viga en diagonal, vertederas alabeadas de acero, rejas, talones, cuchillas circulares, rueda de control que queda abajo al voltear; 6 500 triángulos) y **cultivador de 3 m** (mostaza: tres barras con 15 brazos en S, rodillo desterronador que gira; 5 400 triángulos). `npm run maquinaria` → 66 y 65 KB. Vistas en `data/processed/previews/maquinaria/{arado,cultivador}_*.png`. El script acepta `--solo arado,cultivador`.
- **Tripuntal que se mueve:** el tractor tiene ahora `brazos_tripuntal` aparte (brazos, tirantes y tercer punto) y en `maquinaria.json` los puntos del enganche (pivote, rótulas, tercer punto). `src/agricultura/enganche.js`: los brazos giran en su eje y suben o bajan el apero (Q en el teclado; botón ⬇/⬆ arriba a la derecha en el móvil); bajado, el apero sigue el terreno de debajo; el reversible da la vuelta cada vez que se levanta.
- **COPE:** los aperos esperan en el patio (`AGRICULTURA.cope.sitiosAperos`, a más de 9 m de los edificios, con caja de colisión). En el menú se elige con qué apero sale el tractor y, con el tractor en el aro, se cambia o se deja; también se quita o pone el sonido del motor.
- **Labranza** (`src/agricultura/labranza.js`): con el apero bajado, dentro de una parcela y hacia delante, cada fotograma pinta en las máscaras de A2 la franja que barre la línea de trabajo del apero (su anchura real; arado → «arado», cultivador → «gradeado», que deshace el arado) y las rodadas de las ruedas traseras. La parcela se activa la primera vez que se labra (sirve cualquiera de las 1 797) y se queda mientras dura la partida (guardar entre sesiones: A9). La hierba 3D se quita de lo labrado poco a poco (`hierba.olvidaZona`, nuevo, solo rehace esas celdas).
- **Carga:** con el apero clavado el tractor no pasa de 10 km/h (arado) o 13 (cultivador), la tierra lo frena (`resistenciaN`) y al soltar el acelerador se para enseguida; marcha atrás con el apero clavado no labra y avisa de levantarlo.
- **Efectos:** polvo (nube de puntos con su tamaño y opacidad), terrones que la vertedera echa al lado que toca (cambia al voltear), gaviotas que llegan al rato, vuelan en círculo detrás del arado, se posan a picotear en lo removido y se espantan si pasa el tractor (`particulas.js`, `aves.js`; tres mallas instanciadas). **Sonido** del motor diésel con WebAudio (`sonidoMotor.js`): baja de vueltas y suena más fuerte cuando tira del apero; respeta el sonido quitado de fiestas y salto.
- **Panel** (`src/hud/agricultura.js`): apero, bajado o levantado, ritmo (despacio, buen ritmo, deprisa), parcela que se pisa (referencia, paraje, hectáreas) y porcentaje arado o cultivado con barra.
- Ganchos nuevos (inactivos sin `?agricultura`): `juego.js` llama a `agricultura.paso` en cada paso de física, `agricultura.actualiza` en cada fotograma y `agricultura.pausa` en pausa; tecla `apero` (Q) en `src/config/camara.js` y `entrada.js`; botón táctil del apero en `index.html`. Corregido: los vehículos se colocaban con la caja de colisión metida 15 cm en el suelo y, en cuesta, giraban al aparecer.
- **Prueba:** `node tools/prueba_labranza.mjs <carpeta> [bajo|medio|alto] [movil]`: arado y cultivador en el patio; coger el tractor con el arado; dos pasadas conducidas de verdad en la 2-700 (ida y vuelta al lado): el porcentaje casa con 1,6 m × lo recorrido, surcos en la dirección de la pasada, no pasa de la velocidad de trabajo, polvo, terrones, rodadas, motor, panel, volteo del reversible y gaviotas; media parcela con 15 pasadas de 1,6 m (con el pincel, sin conducir) = 50,7 %; cambiar al cultivador en la COPE (el arado vuelve al patio) y cultivar lo arado (el rodillo gira); sin errores. **Todo bien** en escritorio y móvil. `prueba_tractor.mjs` (A3) sigue bien.

### Decisiones de Rubén (2026-11-25, tras A4)
- **A4 aprobada** («empieza a5»).

### Hecho en A5 (2026-11-25)
- **Aperos nuevos** en `tools/build_maquinaria.py` (genéricos, sin marcas, con placas de señalización): **abonadora centrífuga** suspendida (azul: tolva de tronco de pirámide con rejilla, dos discos con paletas que giran en sentidos contrarios, protector, caja de engranajes, patas de apoyo; 2 800 triángulos, 42 KB) y **sembradora de cereal arrastrada** de 3 m y 20 líneas (burdeos: lanza en A, tolva corrida a lo ancho, ruedas, rejas de disco con sus tubos de caída, rastrillo tapador, pata de apoyo que solo se ve aparcada; 4 500 triángulos, 54 KB). Las dos tienen la carga de la tolva (abono blanco, grano dorado) como pieza que baja y encoge con lo que queda. El tractor apunta además en `maquinaria.json` la barra de tiro y la toma de fuerza.
- **Enganche** (`enganche.js`): la abonadora va al tripuntal y un **cardán** amarillo une la toma de fuerza del tractor con la suya; bajada, gira la toma de fuerza y giran los discos. La sembradora va a la **barra de tiro**: sigue al tractor sobre sus ruedas como un remolque (su eje va hacia la lanza: en las curvas va por dentro y marcha atrás se cruza), con la lanza limitada a 75° y apoyada en el terreno (cabeceo y alabeo); Q o ⬇ baja y sube sus rejas. **Decisión:** es cinemática, sin cuerpo en la física (una articulación de Rapier con el controlador de vehículo sería inestable): no choca con nada.
- **Tolvas y COPE:** en el menú se elige el apero y la semilla (trigo o cebada); al enganchar la abonadora o la sembradora en la COPE su tolva sale **llena** (800 kg de abono; 400 kg de semilla), y con el tractor en el aro hay «Llenar la tolva». Gastan por la superficie que cubren: abono 300 kg/ha, trigo 200 kg/ha, cebada 180 kg/ha (orientativos, en `src/config/maquinaria.js`; se afinarán en A6). Vacías, no hacen nada y avisan de volver a la COPE. De momento no se paga (A9).
- **Labores** (`labranza.js`): la abonadora deja abonada una franja de **12 m** (no deshace lo labrado; los discos echan el granulado aunque caiga fuera de la parcela, como de verdad); la sembradora siembra **3 m** y guarda en la máscara B el **día de cultivo** (día 1 hasta que haya reloj agrícola en A6) y en la parcela el cultivo (`parcela.siembra`). Sembrar sobre rastrojo avisa de labrar antes. Las ruedas de la sembradora dejan sus rodadas. Las franjas de los aperos acaban **rectas** (antes en redondo, que con 12 m se veía un círculo al empezar).
- **Efectos:** abanico de granulado blanco desde cada disco hacia atrás y a su lado (`particulas.granos`); polvo fino de la sembradora y algunas gaviotas detrás de ella. El motor va con carga con la toma de fuerza o la sembradora.
- **Panel:** la tolva (barra, kg y de qué) y los porcentajes de arado, cultivado, abonado y sembrado.
- **Prueba:** `node tools/prueba_siembra.mjs <carpeta> [bajo|medio|alto] [movil]`: la mitad central de la 2-700 se deja cultivada con el pincel (el arado y el cultivador de verdad los prueba `prueba_labranza.mjs`); menú con abonadora, sembradora y semilla; tolva llena y cardán; una pasada de verdad abonando (franja de ~12 m, kg gastados = dosis × hectáreas, granulado en el aire, discos, velocidad); cambio a la sembradora en la COPE; una pasada sembrando (franja de 3 m, día de siembra en la máscara, trigo en la parcela, kg por la dosis, rodadas, ruedas que giran, apoyada en el suelo); curva (la sembradora gira respecto al tractor sin pasar de 75°) y marcha atrás (no siembra); sembrar sobre rastrojo avisa; tolva vacía deja de sembrar y avisa; sin errores. **Todo bien** en escritorio y móvil; `prueba_labranza.mjs` (A4) y `prueba_tractor.mjs` (A3) siguen bien.

### Decisiones de Rubén (2026-11-25, tras A5)
- **A5 aprobada** («puedes comenzar ya la A6»).
- **Tiempo agrícola:** un día de cultivo dura **una hora de juego** (con el juego en marcha; en pausa no corre). Así un trigo tarda unas 220 horas de juego en madurar: para verlo crecer, en la COPE se pasan días.

### Hecho en A6 (2026-11-25)
- **Reloj agrícola** (`src/agricultura/crecimiento.js`, `AGRICULTURA.reloj`): cuenta días de cultivo con el juego en marcha (3 600 s por día). En el menú de la COPE, apartado «Calendario», se ve el día y se pasan **+1, +7 o +30 días**; `?agricultura&dia=N` empieza en el día N. El panel del tractor enseña el día y cuánto falta para el siguiente. De momento el reloj y lo sembrado no se guardan al cerrar (A9).
- **Edad por píxel:** al sembrar se guarda en la máscara el día como (día mod 255) + 1; la edad es (hoy − siembra) mod 255. Lo que se queda sin cosechar se topa a 250 días cada vez que cambia el día (también si se pasan cientos de golpe): sigue maduro y no «vuelve a nacer».
- **Trigo y cebada** (`src/config/cultivos.js`): curva por edad (altura, cobertura del suelo, espiga, color de la hoja, de la espiga y cabeceo) con las etapas **sembrado, nascencia, ahijado, encañado, espigado, floración, llenado del grano y madura**. Calendario orientativo de cereal de invierno en el regadío de Navarra (siembra en noviembre, espigado del trigo hacia primeros de mayo, cosecha a finales de junio o julio; la cebada unas dos semanas antes): trigo maduro a los 222 días y 0,86 m; cebada a los 205 días y 0,76 m, con la espiga que se dobla al madurar.
- **Vigor:** la tierra preparada y abonada crece más (de 0,62 sobre rastrojo sin abono a ~1,05), con rodales más altos y más bajos (ruido lento). Mismo cálculo en el shader y en JavaScript (para el rendimiento de A8). El agua llega en A7.
- **Dibujo por distancia** (`src/agricultura/cultivo.js`), todo calculado en los shaders con la edad de cada píxel (no se rehace geometría al pasar el tiempo):
  - **Lejos:** el suelo de la parcela toma el color del cultivo; de joven, plantitas a lo largo de las líneas de siembra.
  - **Dosel:** la rejilla de la parcela (de 0,5 m en las parcelas pequeñas, salvo en calidad baja) levantada a la altura del cultivo a partir de 12 cm, con hojas, espigas y olas de viento por encima, los huecos entre líneas de cerca y los tallos en los bordes de lo sembrado (el «escalón» entre franjas de distinta edad); recibe sombras. El borde de lo sembrado se suaviza (sin la escalera de los píxeles de 0,5 m).
  - **Matas** cerca de la cámara: tarjetas cruzadas con tallos, hojas y espigas (textura hecha en el navegador, distinta para trigo y cebada) en una rejilla que sigue a la cámara (radio y separación por calidad: 32/0,30 m, 24/0,34 m, 14/0,42 m); cada una lee su edad, vigor y la altura del terreno, se mueve con el viento y se esconde donde no hay nada sembrado.
- **Panel:** cultivo, etapa, días y cuánto falta para la siguiente etapa donde está el tractor.
- **Prueba:** `node tools/prueba_cultivo.mjs <carpeta> [bajo|medio|alto] [movil]`: `?dia=3`, el reloj avanza con el juego, media hora = medio día, «+7 días» en la COPE; tres franjas de trigo sembradas los días 1, 31 y 61 (con el pincel) y cebada en la parcela de al lado (2-701); pasando días, la primera franja pasa por nascencia, ahijado, encañado, espigado, llenado del grano y madura, y el panel lo dice; el día 173 las tres franjas miden 0,84, 0,57 y 0,26 m; 300 días después sigue madura; coste del cultivo; sin errores. **Coste** (medido en swiftshader, que es muy lento: vale la proporción): en calidad baja el fotograma pasa de 954 a 1 161 ms (×1,2; 4 761 matas por parcela); en alta, de 2 115 a 2 712 ms (×1,28; 46 225 matas por parcela).

### Decisiones de Rubén (2026-11-25, tras A6)
- **A6 aprobada** («empieza la A7»).

### Hecho en A7 (2026-11-25)
- **Datos** (`tools/52_riego.py`, parámetros en `config.json` → `agricultura.riego`): para la 2-700, rejilla de cotas de 1 m con el terreno del juego (LiDAR), plano (0,34 % hacia el suroeste, 225°), microrrelieve (±5 cm) y **ribazo** de las lindes (lo que sobresale más de 12 cm del plano, 6 %: no se riega). La **acequia** se ha afinado con la ortofoto PNOA: es un canal estrecho que se ve como una línea clara a 1,5–2 m por fuera de la linde sureste, sobre el lomo que marca el LiDAR (unos 3 m más al este que lo dibujado a mano; sigue hasta el camino del norte de la COPE). Las **boqueras** son las dos flechas de Rubén. Simula el riego con el mismo modelo que el juego y escribe `public/assets/agricultura/riego.json` (lo lee el juego) y la vista `data/processed/previews/agricultura/riego_2-700.jpg` (ortofoto con la acequia, cotas con curvas cada 5 cm y flechas hacia donde baja, y orden de llegada del agua).
- **Simulación** (`src/agricultura/riego.js`, la misma en Python): lámina de agua por celda de 1 m; el agua pasa a las cuatro vecinas por la diferencia de cota + lámina con la ecuación «inercial local» (Bates y otros, 2010) y rozamiento de Manning; caudal por cada boquera abierta; infiltración que baja según se llena el suelo (agua útil); fuera de la linde, pared. Va con el tiempo agrícola (24 veces más rápido que el juego: un día de cultivo por hora). Valores orientativos: 60 L/s por boquera, n = 0,08, infiltración de 60 a 8 mm/h, 100 mm de agua útil, 4 mm/día de evapotranspiración.
- **Resultado en la 2-700** (las dos boqueras): el agua entra por la linde sureste y avanza hacia el oeste y el suroeste, que es hacia donde baja; cubre el 50 % a los 14 min, el 90 % a los 35 y el 95 % a los 47 (unos 2 min de juego) con 77 mm. Al cerrar, lo más bajo (junto a la linde suroeste, un 9 % de la parcela) se queda encharcado unas horas: es la cola del riego.
- **En el juego:** la acequia (canal de hormigón con el agua corriendo) y una **tajadera** en cada boquera (compuerta de chapa con husillo y volante, y un poste con una placa azul). Junto a una (en coche o en tractor), **G** o el botón **💧** la abre o la cierra: la compuerta sube, cae el chorro a la parcela y la **lámina** de agua (malla que sigue el terreno, marrón y con reflejos, con espuma en el frente) avanza por el relieve. El aviso de abajo dice la tajadera, si está abierta, el caudal, cuánto de la parcela tiene agua y los mm echados; el panel del tractor, la humedad del suelo y si se está regando. `?agricultura=riego` empieza con el tractor junto a la tajadera B1.
- **Suelo y cultivo:** lo que empapa queda como humedad del suelo (la tierra se ve más oscura) y se seca con los días; **pasar días** con el agua corriendo cierra las tajaderas y mete el agua en el suelo. Cada día, lo sembrado que crece apunta en una máscara nueva («agua») el agua que ha tenido, pesada por lo que crece ese día: sin riego (solo la lluvia) crece como en A6; bien regado, hasta un 20 % más alto; con sed, hasta un 20 % menos; y lo que pasa el día encharcado, menos.
- **Barro:** con la tierra mojada o con agua encima, el tractor agarra menos (hasta un 35 %), frena más, deja rodadas más hondas y no levanta polvo.
- **Prueba:** `node tools/prueba_riego.mjs <carpeta> [bajo|medio|alto] [movil]`: acequia y tajaderas; aviso y botón; G abre y el agua entra con el juego en marcha; con las dos boqueras cubre el 50/90/95 % en los mismos tiempos que `52_riego.py` (14,2/34,5/45,8 min frente a 14,3/35,2/47,2); avanza desde las boqueras y llega antes a lo bajo; al cerrar se mete en el suelo; el suelo se seca con los días; el trigo regado apunta más agua que el de la parcela de al lado sin regar; barro bajo el tractor; pasar días con agua; la simulación cuesta 0,25 ms por fotograma; sin errores. Bien en escritorio (calidad baja y alta) y en el móvil; `prueba_siembra`, `prueba_labranza`, `prueba_tractor` y `prueba_cultivo` siguen bien. El suelo mojado ya no oscurece las hojas del cultivo (solo la tierra).

### Decisiones de Rubén (2026-11-25, tras A7)
- **A7 aprobada** («empieza con A8»). Siguen pendientes los datos reales del riego (caudal de la boquera, tiempo de riego, desagüe) si los tiene.

### Hecho en A8 (2026-11-25)
- **Cosechadora** (`tools/build_maquinaria.py` → `cosechadora.glb`): compacta, genérica, amarilla y sin marca (proporciones de la foto de Rubén): cabezal de cereal de 5,4 m con molinete de seis bates con púas, sinfín, barra de corte con dedos y puntones; canal de alimentación; cabina delante con plataforma, barandilla y escalera; tolva de grano arriba (con el grano dentro, que sube); motor detrás con el filtro rotativo y el escape; picador y esparcidor de paja; tubo de descarga a la izquierda, plegado hacia atrás. Ruedas delanteras grandes (motrices) y traseras pequeñas (directrices). Piezas que se mueven: `cabezal` (sube con el canal sobre su pivote), `molinete`, `tubo_descarga` y `carga`. Vistas en `data/processed/previews/maquinaria/cosechadora_*.png`.
- **Remolque de grano** (`remolque.glb`): basculante de un eje, caja de 2,3 × 5,2 × 1,15 m (10 000 kg), lanza con ojo, pata y el montón de grano que crece. Es un apero arrastrado más del tractor (en el patio y en el menú de la COPE); no se baja.
- **Conducción** (`coche.js`): la cosechadora tira de las ruedas de delante y gira con las de atrás (la cola sale hacia fuera en las curvas), 25 km/h en carretera y 8 con el cabezal bajado. Cámara más alta y más lejos; la de la cabina, arriba delante.
- **Siega** (`src/agricultura/cosechadora.js`): **Q** (o ⬇) baja el cabezal y gira el molinete; en marcha, la barra de corte (5,4 m) siega por donde pasa (nueva labor `segar` del pincel) **solo lo maduro** (lo verde lo deja y avisa de los días que faltan); lo segado queda como rastrojo con las hileras de paja, y el cultivo de al lado enseña los tallos en el borde (el «escalón»). El grano va a la tolva por píxel: rendimiento del cultivo (trigo 6 500 kg/ha, cebada 5 800, con vigor 1) por el vigor de esa tierra (labor, abono y el agua que tuvo): de unos 4 000 kg/ha sobre rastrojo sin abono a unos 8 000 bien regado (lo que INTIA da por alcanzable en el regadío navarro bien llevado). Tolva de 6 000 L (4 680 kg de trigo); llena, no siega. Polvo en la barra, paja que sale del esparcidor y rodadas de las ruedas delanteras. El panel dice el cabezal, la tolva, si siega y a cuántos kg/ha, el cultivo y lo cosechado de la parcela.
- **Descarga:** **X** (o 🌾) saca el tubo (gira hacia la izquierda); si la boca cae sobre la caja de un remolque (el del tractor, enganchado o aparcado) el grano pasa de la tolva al remolque a 75 L/s, con el chorro de grano; si no hay remolque debajo no sale y avisa. En la COPE, con la cosechadora se descarga la tolva y con el tractor el remolque: de momento se apunta lo entregado (la venta llega en A9).
- **Cambiar de vehículo a pie** (`juego.js`): al bajarse (E o 🚶) y subir (E o 🚗), se sube al vehículo más cercano, sea el que se dejó u otro aparcado (el tractor, la cosechadora). Así, en el campo, se deja la cosechadora y se coge el tractor con el remolque.
- **COPE:** la cosechadora espera en el oeste del patio; en el menú, «Coger la cosechadora», y con ella su tolva, «Descargar la tolva en la COPE» y «Dejar la cosechadora». `?agricultura=cosecha` empieza en la cosechadora dentro de la 2-700 sembrada de trigo maduro, con el tractor y el remolque junto a la entrada.
- **Prueba:** `node tools/prueba_cosecha.mjs <carpeta> [bajo|medio|alto] [movil]`. ?agricultura=cosecha; cabezal y molinete; una pasada de verdad de 39 m siega 5,4 m de ancho a 6 830 kg/ha (trigo en tierra preparada y abonada) y llena la tolva; detrás queda rastrojo y al lado sigue el trigo; una franja verde no la siega; sin remolque debajo el tubo no descarga y con él pasa lo mismo que sale; el montón sube; a pie se sube al tractor de al lado; en la COPE se descarga la tolva; sin errores. Bien en escritorio y en el móvil; `prueba_riego`, `prueba_siembra`, `prueba_labranza`, `prueba_tractor` y `prueba_cultivo` siguen bien.

### Hecho en A9 (2026-11-26)
- **Dinero** (`src/config/economia.js`): se empieza con 3 000 €. **Venta**: trigo 0,25 €/kg y cebada 0,238 €/kg, según la Lonja del Ebro de noviembre de 2026 (trigo 252–255 €/t, cebada de más de 64 de peso específico 238 €/t). **Compra** (semilla de trigo 0,45, de cebada 0,42, abono 0,45 €/kg): ORIENTATIVOS, sin fuente; a confirmar con Rubén.
- **COPE** (`menuCope.js`): arriba, el dinero y los precios; llenar la tolva de abono o semilla **se paga** (solo lo que falta; sin dinero suficiente se llena lo que llegue y avisa); el grano entregado (tolva de la cosechadora o remolque) se **vende** con un botón por cultivo; «Tus parcelas» enseña cada parcela trabajada con su estado (rastrojo, arada, preparada, sembrada con los días que faltan, madura, cosechada); botón para empezar una partida nueva (con confirmación). Se quita el «Pronto: …».
- **Guardado** (`src/agricultura/partida.js`): en `localStorage` una clave con lo general (día, dinero, grano, parcelas trabajadas) y una por parcela con sus máscaras (laboreo, cultivo y agua) en RLE por canales y base64 (la 2-700, de 195×189 píxeles, ocupa unos 35 KB). Se guarda sola cada 10 s si algo ha cambiado, al ocultar la pestaña y al pausar; al entrar se cargan las parcelas y el día. Si el navegador no deja guardar, avisa. **Un escenario de pruebas** (`?agricultura=cosecha`, `=riego`) **o `?dia=N` ni cargan ni guardan**, para no pisar la partida de verdad.
- **Avisos:** «Hay que labrar antes de sembrar», «La parcela pide agua» (sembrada y con el suelo en la humedad de la lluvia, con «abre la tajadera» si tiene acequia), «El cereal está maduro» (al entrar en la parcela y el día en que madura) y el de tolva vacía; el «⏩ Día N» ya no pisa el aviso de maduro.
- **Panel:** la línea de la parcela lleva el uso SIGPAC y secano o regadío; el apero con toma de fuerza enseña si gira.
- **Minimapa** (`capaMinimapa.js`, gancho `capaMinimapa` en `hud/minimapa.js`): las parcelas trabajadas se colorean por su estado (también en el mapa grande); con una máquina se ven los contornos de las de alrededor y una barra con la anchura de trabajo (apero o cabezal de 5,4 m).
- **Iconos propios** (`src/hud/iconos.js`): se acabaron los emojis del menú de la COPE, del panel y de los botones táctiles. Cada icono es un SVG dibujado a mano con degradados (tractor, arado de vertederas, cultivador con rodillo, abonadora, sembradora, remolque, cosechadora, coche, edificio de la COPE, billete, espigas de trigo y cebada, saco de abono, tolva, calendario, gota, tajadera, etc.), con `iconoHtml(nombre, px)`. Los avisos en pantalla aún llevan algún emoji suelto (texto).
- **Prueba:** `node tools/prueba_agricultura.mjs <carpeta> [bajo|medio|alto] [movil]`: partida nueva con 3 000 €; compra de tolvas (360 € de abono, 180 € de semilla; con 45 € solo 100 kg); la 2-700 labrada, abonada y sembrada; riego (93 % cubierto, 88 % regado); 60 días secos y avisa que pide agua; hasta el día 231 y avisa de que madura; «Tus parcelas»; una pasada de verdad de 40 m de cosechadora (163 kg, ~7 550 kg/ha); descargar en la COPE y vender (41 €); guardado (35 KB) y recarga con la parcela igual; `?agricultura=cosecha` no guarda; sin errores.
- **No hecho (a decidir con Rubén):** comprar y vender parcelas (el plan lo deja a su gusto); el plantel y la recolección a mano llegan con los hortícolas (A10).

### Hecho en A10 (2026-11-26) — hortícolas
- **Cebolla** (`prueba_cebolla.mjs`): se siembra con la sembradora (3,5 kg/ha) y se arranca con la **arrancadora** (modelo propio hecho en código, `src/agricultura/modeloscodigo.js`): cinta, cajón de 3 000 kg que se llena a la vista; el cajón se descarga en la COPE y se vende (0,3355 €/kg, 55 t/ha).
- **Brócoli, alcachofa y espárrago**: plantas y etapas propias (curvas y texturas en `cultivos.js` / `cultivo.js`), **plantadora** (modelo en código, 4 líneas, tolva de 12 000 **plantas** en vez de kg; solo acepta estos tres) con su plantel comprado en la COPE («plantel de brócoli», «zuecas de alcachofa», «garras de espárrago»).
- **Recolección a mano** (`src/agricultura/recoleccion.js`): a pie junto a la parcela, X (o el botón de la **cesta**) corta lo maduro en un círculo de 1,3 m delante del personaje; cesta de 40 kg de un solo cultivo; al entrar en la COPE se entrega sola y se vende. El brócoli se retira; alcachofa y espárrago **rebrotan** (vuelven a su edad de rebrote y maduran otra vez).
- **Precios** (`economia.js`): venta brócoli 0,8618, alcachofa 1,8538, espárrago 2,85 €/kg (con su fuente en `ECONOMIA.fuente`); compra de plantel ORIENTATIVA (0,04 / 0,45 / 0,2 € por planta). Rendimientos por corte orientativos: brócoli 12 t/ha, alcachofa 4 t/ha, espárrago 1,5 t/ha.
- **Iconos nuevos:** brócoli, alcachofa, espárrago, plantadora, cesta, cebolla, arrancadora.
- **Escenarios:** `?agricultura=cebolla|brocoli|alcachofa|esparrago[&edad=N]`. **Prueba:** `node tools/prueba_horticolas.mjs <carpeta> [bajo|medio|alto] [movil]` (`CULTIVOS=brocoli` para uno solo).
- **No hecho / simplificado:** la **acaballonadora** y los caballones del espárrago no están (se planta en llano); los cultivos de varios años no se simulan (la edad solo llega a 254 días): rebrotan en lugar de pasar años.

### Hecho en A11 (2026-11-26) — rendimiento, comprobaciones y créditos
- **Presupuesto** (`node tools/mide_agricultura.mjs [bajo,medio,alto] [cebolla,brocoli]`, y `tools/atribuye_agricultura.mjs <nivel> <escenario>` para repartir el coste por grupos de la escena). Con la gráfica por software (los FPS no valen; los conteos sí), 40 fotogramas en la 2-700 sembrada:

| Nivel | Escenario | Llamadas | Triángulos | Texturas | JS de agricultura/fotograma |
|---|---|---|---|---|---|
| bajo | cebolla (con tractor) | 764 | 2,0 M | 259 | 1,4 ms (máx. 9) |
| bajo | brócoli (a pie) | 109 | 0,9 M | 96 | 0,3 ms |
| medio | cebolla | 947 | 3,9 M | 279 | 1,6 ms |
| medio | brócoli | 204 | 1,7 M | 115 | 0,3 ms |
| alto | cebolla | 1 010 | 4,9 M | 277 | 1,5 ms |
| alto | brócoli | 207 | 2,0 M | 113 | 0,4 ms |

  Reparto en «bajo» con la cebolla: **el modo agricultura aporta 42 llamadas y 149 mil triángulos** (7 %); el grueso es del juego normal (tráfico 880 mil, mundo 505 mil, muros 284 mil, casas 293 mil; las sombras cuentan dos veces). Memoria de JS 200–290 MB. Máscaras de la 2-700: 195×189 px. **No hizo falta recortar nada**: los niveles de matas (`MATAS`: radio 14/24/32 m) y el tope de máscara (512 px en bajo) ya bastan. **Pendiente: medir los FPS reales en el Pixel 10** (aquí no hay GPU).
- **Juego normal sin cambios:** `prueba_modos.mjs` entera bien; juego sin `?agricultura` en móvil/«bajo»: sin errores, se baja y se sube del coche, no sale el botón de descarga. La rama toca el juego normal solo en ganchos: `capaMinimapa` (vacía sin modo), tecla X (`descargar`), `subirse` al vehículo más cercano (distancia al rectángulo del vehículo en vez de al centro del coche: casi igual de cerca) y ruedas traseras directrices opcionales del tractor. Con `AGRICULTURA.activo = false` el modo solo existe con `?agricultura`.
- **Créditos:** `CREDITOS.md` con el apartado «Modo agricultura» (Catastro, SIGPAC, regadío y MDT del Gobierno de Navarra; Lonja del Ebro; modelos, iconos y sonido propios).
- **No hecho aquí:** `npm run publica`, poner `activo: true` y fusionar en `main` (lo decide y hace Rubén). Las pruebas largas con navegador (`prueba_siembra`, `prueba_cosecha`, `prueba_agricultura`) no acaban aquí en el tiempo disponible (la escena va a ~1 FPS); `prueba_cebolla` y `prueba_horticolas` sí se ejecutaron en A10.

### Pendiente de Rubén
- (A11) Medir en el Pixel 10 (`npm run dev:red`, `?agricultura=cebolla&debug=1`, calidad «bajo») y decir si va fluido; decidir si se publica: poner `AGRICULTURA.activo = true`, `npm run publica` y fusionar la rama en `main`.
- Hacer un ciclo completo en escritorio y en el móvil (labrar, abonar, sembrar, regar, pasar días, cosechar, descargar y vender; recargar la página y comprobar que sigue todo) y decir qué cambiar.
- Decir si quiere comprar y vender parcelas, y si los precios de compra de la semilla y el abono (0,45 €/kg) le cuadran.
- (A8, ya aprobada) Probar la cosecha (`?agricultura=cosecha`, o sembrar, pasar días hasta que madure y coger la cosechadora en la COPE) y decir si le cuadran la cosechadora, la siega, el rendimiento y la descarga al remolque.
- Si sabe los datos de verdad: rendimiento del trigo y la cebada en la 2-700, tamaño de la tolva y del remolque.
- Probar los hortícolas (A10) y decir si cuadran: precios del plantel, rendimientos por corte, dosis y tamaño de la cesta; si quiere acaballonadora para el espárrago.
- Más adelante: precios (§3 del plan).

### Notas
- En el PC no hay `data/raw/` en `Rubenpantxo.github.io/prototipos/cabanillas-drive` (los datos del pipeline siguen en `bifurcaciones/feat-cabanillas-drive`, ver «Salto en paracaídas»): por eso A0 baja el Catastro del WFS. Si se copia el paquete de shapefiles a `data/raw/catastro/`, el script lo usa en lugar del WFS.
- Atribución para `CREDITOS.md` cuando el modo se publique: © Gobierno de Navarra (Catastro, SIGPAC, regadío).

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
- Cielo fotográfico limitado por calidad (`CALIDAD.cielo`): los reflejos (PMREM) del HDRI de 4096 px ocupaban ~200 MB de memoria gráfica (dos texturas de 3072 × 4096 en coma flotante más seis caras de 2048²) y en el móvil se perdía el contexto WebGL (vista 3D en blanco con el HUD visible). Ahora: alto 4096/2048, medio 4096/1024, bajo 2048/512 (fondo/reflejos). En «bajo», la memoria de texturas pasa de ~320 MB a ~125 MB.
- Segundo ajuste para móvil (seguía en blanco en un Android con Chrome): en «bajo» el fondo del cielo baja a 1024 px (three lo convierte en un cubo de 6 caras de 1024² si mide 2048) y las texturas de coches, personas y árboles se reducen a 512 px al cargar (`src/escena/texturas.js`, `CALIDAD.texturaMax`). Texturas en «bajo»: ~118 MB.
- Pérdida del contexto WebGL: el aviso iba a `#estado`, que el juego sobrescribe en cada fotograma, así que nunca se veía (solo blanco con el HUD encima). Ahora sale una pantalla fija (`#fallo`) con el motivo, la gráfica, la calidad, la fase y la memoria del dispositivo, y botones de recarga. Ya no se recarga sola al recuperar el contexto (en un móvil sin memoria sería un bucle).
- La pantalla de fallo identificó el móvil de Rubén: Pixel 10, gráfica **PowerVR D-Series DXT-48-1536**, 8 GB, contexto perdido justo al acabar la carga (cuando se activan las sombras). Es un fallo conocido del controlador PowerVR al muestrear el mapa de sombras (three.js #34311): con una gráfica PowerVR el juego desactiva las sombras 3D (la ortofoto ya las trae pintadas). `?sombras=0|1` lo fuerza en cualquier gráfica. Si no se puede crear el contexto WebGL (Chrome lo bloquea para la web tras varios fallos), se avisa en la pantalla de fallo en vez de quedarse la carga en 0 MB.
- `package.json` fuerza `glob` ^14.0.4 dentro de `@donmccurdy/caporal` mediante `overrides` (2026-11-07). Ese paquete es el CLI de `@gltf-transform/cli`. Corrige la alerta 11 de Dependabot: minimatch 9 tenía un fallo de denegación de servicio, GHSA-g3hv-75wg-m249. También corrige el de glob 10, GHSA-3g3m-2fjr-6pw4. Caporal solo usa la función `glob` con nombre, y glob 14 la mantiene. Comprobado con `gltf-transform inspect` y `optimize --compress meshopt`. `npm audit` da 0 vulnerabilidades. Se puede quitar cuando gltf-transform publique una versión con glob ≥ 14.

## Problemas abiertos
- Resuelto en la fase 5: `vite.config.js` quita de `dist/` las teselas de `assets/orto/` y `terrain.f32` (solo los usa el pipeline).
- El JS del juego pesa 2,7 MB (939 KB gzip), casi todo Rapier con el wasm incrustado (`-compat`). Se puede revisar en la fase 5.
- El modelo del coche es sencillo (primitivas); mejorable si Rubén quiere.
- Resuelto el 2026-11-19 (pedido por Rubén): la niebla de la calidad «bajo» no se aplicaba, porque `main.js` copiaba `{ cerca, lejos }` a `THREE.Fog`, que usa `near` y `far`. Ahora va de 450 a 1300 m, como dice `calidad.js`, y tapa el corte de la cámara a 1400 m. Alta y media no cambian (1200–4000 m). La prueba del salto pasa en «bajo».
- `npm audit`: 3 vulnerabilidades altas, solo en dependencias de desarrollo (`@gltf-transform/cli`). Las de ejecución están limpias.
- Si se publica esta carpeta tal cual en GitHub Pages, `prototipos/cabanillas-drive/index.html` no funciona sin compilar (imports de npm). El juego se publica desde `dist/` (PLAN §8).
