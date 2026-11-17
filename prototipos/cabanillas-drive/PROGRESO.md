# PROGRESO — Cabanillas Drive

**Fase actual:** 6 — Extras **aprobada por Rubén (2026-10-06)**: tráfico, a pie, carteles, día/noche, peatones de MakeHuman, fachadas variadas, muros y vallas, y el resto de OpenStreetMap. Publicación (sección 8) hecha el 2026-10-08: el juego está en `juegos/cabanillas-drive/` y en la sección Juegos de la portada del sitio; sale en la web al fusionar esta rama en `main` y subirla.

**Siguiente (decidido por Rubén el 2026-10-05):** plan de realismo en `PLAN_REALISMO.md` (R1 árboles y vegetación → R2 tejados LiDAR → R3 render → R4 splats), antes de la fase 4. Pausa pedida por Rubén para recargar su uso.
- **R1 hecho (2026-10-05), pendiente del OK de Rubén:** `tools/08_arboles.py` (4 640 árboles del LiDAR, tipos con correcciones en `tools/arboles_tipos.json`, troncos fuera de la calzada) → `tools/texturas_arboles.py` → `npm run arboles` (9 variantes EZ-Tree/palmera, 0,9 MB) → `src/escena/arboles.js` (3D a < 90 m, impostores más lejos, viento, cilindro de colisión por tronco). `tools/08b_vegetacion_baja.py` → `src/escena/hierba.js` (césped y rastrojo en 3D a < 60 m con el color de la ortofoto). Galería de modelos: `?arboles`. Coste medido: ~1,7 ms por fotograma en la zona más cargada. R1 aprobado.
- **R2 hecho (2026-10-05), pendiente del OK de Rubén:** `tools/09_tejados.py` ajusta 1–4 faldones por RANSAC al MDS (tejado = mínimo de los planos, cumbreras exactas) o, si no cuadra, malla de rejilla del MDS; aleros de 0,3 m con canto; muros con la altura real del borde del tejado. 1 313 tejados de planos, 496 de rejilla, 3 planos por defecto. Error medio tejado − MDS 0,107 m (mediana 0,061). `tejados.json` + `tejados.bin` (2,6 MB, 1,1 MB comprimido). R2 aprobado.
- **R3 hecho (2026-10-05), pendiente del OK de Rubén:** `tools/10_sol.py` estima el sol del vuelo de la ortofoto correlacionando sombras del nDSM con lo oscuro de la foto (acimut 201°, elevación 65°). `src/escena/render.js`: sombras del sol en una caja que sigue a la cámara, oclusión ambiental N8AO + SMAA + OutputPass; reflejos del propio cielo (sin RoomEnvironment). `suelo.js`: el terreno recibe sombras 3D solo donde la foto está al sol, y detalle de cerca (`tools/11_suelo.py`: calzada/acera/tierra + texturas de asfalto, baldosa y tierra dibujadas). Calidad alto/medio/bajo en `src/config/calidad.js` (`?calidad=`; móvil → bajo). Render completo ≈ 7 ms a 1280×720. Rubén autorizó las descargas: cielo HDRI de Poly Haven (`tools/12_cielo.py`, girado para que su sol coincida con el de la ortofoto) y texturas de ambientCG para el suelo (`tools/11_suelo.py` las usa si están). 09_tejados: sin copas de árbol (píxeles verdes) y techo plano en edificios estrechos o con rejilla mala (error medio 0,090 m). Siguiente: R4 (splats, necesita capturas).

**Fiestas (2026-11-15):** modo fiestas de `PLAN_FIESTAS.md`, **F0 aprobada; F1 (el pueblo en fiestas), F2 (personaje en tercera persona) y F3 (la vaca) hechas el 2026-11-17, pendientes de que Rubén las pruebe**. Portada nueva («Cabanillas · El Juego · by Rubenpantxo», imagen de Rubén) el 2026-11-17. No se modela nada hasta que la apruebe. Ver el apartado «Fiestas» más abajo.

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

**Fase actual: F6 — ambiente de fiestas. Hecha el 2026-11-17; parada hasta que Rubén la pruebe y dé el visto bueno para la F7.** F0 aprobada; F1 a F5 hechas y en `main` (Rubén dio el visto bueno a la F6 sin esperar a probarlas).

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
- `npm audit`: 3 vulnerabilidades altas, solo en dependencias de desarrollo (`@gltf-transform/cli`). Las de ejecución están limpias.
- Si se publica esta carpeta tal cual en GitHub Pages, `prototipos/cabanillas-drive/index.html` no funciona sin compilar (imports de npm). El juego se publica desde `dist/` (PLAN §8).
