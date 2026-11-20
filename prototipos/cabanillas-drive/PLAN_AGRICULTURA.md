# PLAN_AGRICULTURA.md — Modo agricultura para Cabanillas Drive

Plan por fases para añadir a Cabanillas Drive un **modo agricultura**: parcelas reales del término de Cabanillas, delimitadas con el Catastro de Navarra y la ortofoto, que se trabajan con tractores, aperos y cosechadora hechos en 3D. El suelo cambia de aspecto por donde pasa el apero (arado, gradeado, abonado, sembrado, regado, cosechado) y las plantas nacen, crecen, maduran y se cosechan. Complementa a `PLAN.md`, `PLAN_REALISMO.md`, `PLAN_FIESTAS.md` y `PLAN_SALTO.md`. Las reglas de `CLAUDE.md` siguen siendo obligatorias: una fase cada vez, parada al final de cada fase, no inventar datos geográficos, todo en español, escritorio y móvil siempre.

Fecha: 2026-11-20. Estado: **plan redactado; A0 sin empezar**. Rama de trabajo: **`feat/cabanillas-agricultura`** (sale de `main`). Detalle en `PROGRESO.md`, apartado «Agricultura».

### Inspiración y límites

Referencias de Rubén (cuatro vídeos, no se suben al repositorio):

1. **Juego isométrico estilizado (cosechadora):** la cosechadora roja avanza por el borde del campo de cereal; detrás queda el rastrojo claro y el corte del cereal se ve como un «escalón» con la espiga dorada de lado. Hay franjas de cereal verde y maduro en la misma parcela.
2. **Mismo juego, ciclo completo («it ploughs · sows · grows · harvests»):** el tractor ara dejando tierra marrón con surcos y polvo, siembra encima, las franjas sembradas crecen (verde → dorado) y la cosechadora las corta. Las parcelas están separadas por lindes de hierba y caminos de tierra.
3. **Herramienta de mapas (delimitación y relieve):** se dibuja el polígono de la parcela sobre la ortofoto con vértices editables, se calcula la superficie y se colorea la cota (rojo alto, azul bajo) y la escorrentía; después se ve en 3D. **Es la base para delimitar las parcelas (A0) y para que el agua del riego siga la pendiente real (A7).**
4. **Simulador realista:** tractor rojo con sembradora-abonadora arrastrada sobre tierra labrada, con nube de polvo, sombras y terrones.

Se toman **solo ideas y mecánicas**. No se copia ni se descarga nada de esos juegos: ni modelos, ni texturas, ni interfaz, ni nombres. Tractores, aperos y cosechadora son **propios y genéricos, sin marcas ni logotipos reales**, hechos con un script de Blender o con primitivas en código (regla de `CLAUDE.md`). El aspecto buscado es el del juego actual (realista, con la ortofoto), no el estilizado del vídeo 1.

---

## 1. Objetivo

1. Desde el pueblo, el jugador llega en coche a una **nave agrícola** (punto de entrada) y cambia el coche por un **tractor** o una **cosechadora**.
2. Por los caminos reales llega a sus **parcelas**, que son parcelas catastrales reales con su contorno sobre la ortofoto y su referencia (polígono-parcela).
3. Engancha el **apero** que toca y trabaja la tierra. El suelo cambia **solo por donde pasa el apero bajado**, con la anchura de trabajo real:
   - rastrojo → **arado** (tierra volteada, surcos en la dirección de la pasada) → **gradeado/preparado** (tierra mullida y lisa) → **abonado** (granulado) → **sembrado** (líneas de siembra).
4. Las **plantas nacen y crecen** con el tiempo del juego (tamaño, color, densidad) según el agua y el abono que hayan recibido.
5. Al **regar**, el agua entra por la boquera de la acequia y **avanza sobre la parcela siguiendo el relieve real** del MDT, oscureciendo y encharcando la tierra.
6. La **cosechadora** corta el cultivo maduro por donde pasa el cabezal, llena la tolva y deja rastrojo. Se puede descargar el grano a un remolque.
7. Se ve el **ciclo completo** de la plantación mientras se trabaja: cada parcela guarda su estado y se conserva entre sesiones.

Al salir del modo, todo vuelve a la conducción normal.

---

## 2. Lo que ya existe y se reutiliza

| Necesidad | Ya está en el proyecto | Qué falta |
|---|---|---|
| Sistema de coordenadas | `data/processed/origin.json` (1 u = 1 m, norte = −Z, `H_base`) | Nada: las parcelas se convierten con el mismo origen |
| Catastro de Navarra | `data/raw/catastro/` (ya se leen `CATASTPolEdificacion`, `CATASTPolParcelaUrba`, `CATASTPolCascoUrbano` con `busca_capa()` de `tools/comun.py`) | La capa de **parcelas rústicas** del mismo paquete (nombre exacto a confirmar con `00_inspect_raw.py`) |
| Terreno y ortofoto | `tools/01_origin_terrain.py`, `02_ortho.py`; zona de juego de 1 500 × 1 400 m | Detalle de terreno y ortofoto donde estén las parcelas si quedan fuera de esa zona (A1) |
| Horizonte | `tools/40_horizonte.py` (8 km, paso 20 m) y S1 de `PLAN_SALTO.md` (6 × 6 km) | Hueco con detalle para la zona agrícola |
| Caminos y acequias | `tools/04_osm.py` ya pide `highway` (incluye `track`) y `waterway` | Ampliar la consulta a la zona agrícola si sale de la actual |
| Vehículo con física | `src/vehiculo/coche.js` (Rapier `DynamicRayCastVehicleController`), `src/config/vehiculo.js` | Tractor (4RM, ruedas distintas delante y detrás, marchas lentas de trabajo) y cosechadora (dirección trasera) |
| Modelos 3D desde Blender | `tools/build_coches.py`, `build_activos_salto.py` → `gltf-transform` (`npm run coches`, `npm run salto`) | `tools/build_maquinaria.py` y `npm run maquinaria` |
| Suelo procedural | `src/escena/suelo.js`, `tools/11_suelo.py` (texturas de tierra, asfalto, baldosa) | Material de parcela con estados y surcos |
| Rastrojo y cereal cerca de la cámara | `src/escena/hierba.js` (matas 3D a < 60 m con viento) | Cultivo que crece y se corta |
| Agua | `src/escena/agua.js` | Lámina de riego que avanza |
| Puntos de entrada | `src/juego/entradas.js` + `src/config/entradas.js` (F7 de fiestas) | Entrada «Nave agrícola» |
| Cámara con obstáculos | `src/camara/camaraCoche.js` | Distancias y alturas para tractor y cosechadora |
| Controles | `src/controles/entrada.js` (teclado y joystick táctil) | Subir/bajar apero, toma de fuerza, enganchar, descargar |
| Minimapa e «Ir a…» | `src/hud/minimapa.js`, `src/hud/pantallas.js` | Parcelas coloreadas por estado |
| Carga diferida | Patrón de fiestas (`import()` dinámico, chunk aparte) | El mismo para `src/agricultura/` |
| Pruebas automáticas | `tools/prueba_*.mjs` | `prueba_agricultura.mjs` y repetir las existentes |

---

## 3. Decisiones que tiene que tomar Rubén (antes o durante A0)

- **Qué parcelas.** Lista de referencias catastrales (polígono-parcela) o marcarlas en la vista de A0. Recomendación: **3 a 6 parcelas contiguas** junto a un camino, de 0,5 a 3 ha cada una, para el primer prototipo.
- **Dónde están respecto a la zona actual.** Si caen dentro de la zona de juego (bordes del casco), A1 se reduce a casi nada. Si están en la vega, fuera de los 1 500 × 1 400 m, A1 descarga terreno y ortofoto de detalle (necesita permiso de descarga, como S1 del salto).
- **Qué cultivos.** Propuesta: **cereal (trigo o cebada)** primero (es el de los vídeos y el más sencillo de dibujar), después **maíz** (regadío, plantas grandes) y uno **hortícola** de la Ribera que elija Rubén.
- **Riego.** Propuesta: **a manta desde la acequia** (es lo que deja ver el agua avanzar). Rubén indica qué acequia o brazal riega esas parcelas y dónde está la boquera. Aspersión o goteo, más adelante si quiere.
- **Nave agrícola.** Sitio real donde se cambia de vehículo y se cargan semilla y abono. Candidata: la Cooperativa San Isidro (la COPE). Rubén confirma el sitio.
- **Maquinaria.** Colores y tipo de tractor (genérico, sin marca). Fotos de tractores y aperos del pueblo como referencia, si las tiene.
- **Tiempo agrícola.** Cuántos minutos reales dura un día de cultivo y si hay botón de «pasar días».

---

## 4. Arquitectura

```
src/config/agricultura.js       Parámetros: resolución de las máscaras, tiempo agrícola, cantidades por calidad, activo
src/config/maquinaria.js        Tractor y cosechadora (como vehiculo.js) y aperos (anchura, velocidades, qué labor hacen)
src/config/cultivos.js          Etapas, duración, altura, colores, necesidades de agua y abono, rendimiento
src/datos/parcelas.js           Carga public/assets/agricultura/parcelas.json
src/agricultura/modoAgricultura.js  Entrar y salir del modo; crea y libera todo
src/agricultura/parcela.js      Malla de la parcela sobre el MDT + máscaras de estado (CPU y textura)
src/agricultura/pincel.js       Pinta en la máscara el rectángulo barrido por el apero entre dos fotogramas
src/agricultura/sueloParcela.js Material del suelo (estados, surcos orientados, humedad, abono, rodadas)
src/agricultura/cultivo.js      Plantas: matas instanciadas cerca, dosel en medio, color en el suelo lejos
src/agricultura/crecimiento.js  Reloj agrícola y vigor por celda (agua, abono)
src/agricultura/riego.js        Simulación del agua sobre el MDT y su lámina visible
src/agricultura/maquina.js      Tractor y cosechadora sobre Rapier (a partir de coche.js)
src/agricultura/enganche.js     Tripuntal (aperos suspendidos) y enganche de bola (arrastrados, con articulación)
src/agricultura/aperos.js       Arado, cultivador, abonadora, sembradora, cabezal, remolque
src/agricultura/particulas.js   Polvo, terrones, grano, paja, aves que siguen al arado
src/agricultura/guardado.js     Estado de cada parcela en localStorage (máscaras comprimidas)
src/hud/agricultura.js          Panel de parcela, apero, calendario, avisos
tools/50_parcelas.py            Catastro + SIGPAC → parcelas.json + vista cenital para revisar
tools/51_zona_agricola.py       Terreno y ortofoto de detalle de la zona agrícola (si hace falta)
tools/52_riego.py               Pendientes, boquera y orden de llenado por parcela (como el vídeo 3)
tools/build_maquinaria.py       Tractor, cosechadora y aperos en Blender (consola), piezas con nombre
tools/prueba_agricultura.mjs    Prueba automática: labra, siembra, riega, crece y cosecha una parcela
```

Principios:

- **Un solo mundo.** Como fiestas: el modo añade un grupo (`raizAgricultura`) y sus colisiones al entrar y los libera al salir.
- **Carga diferida.** Código y modelos de agricultura en un chunk aparte con `import()`: quien solo conduce no los descarga.
- **Sin tocar el juego.** Todo vive en `src/agricultura/`, `src/config/` y `public/assets/agricultura/`. Los únicos cambios en archivos compartidos son ganchos pequeños y protegidos por `AGRICULTURA.activo` (ver §7).
- **Acceso directo para pruebas:** `?agricultura` entra al modo junto a las parcelas; `?agricultura=cosecha` empieza con el cereal maduro; `?agricultura=riego` con la parcela sembrada y la boquera al lado.
- **La máscara manda.** El estado de cada metro de parcela está en memoria (CPU); las texturas, las plantas y el agua se dibujan a partir de ella. Así se puede medir el porcentaje trabajado, guardar y cargar.

---

## 5. Técnica de las piezas clave

### 5.1 Parcelas reales (A0)

- **Fuente principal:** parcelas rústicas del Catastro de Navarra (`catastro.navarra.es/descargas`, el mismo paquete de shapefiles que ya usa el juego). Cada parcela con su **polígono y número de parcela**, su contorno exacto y su superficie.
- **Fuente complementaria:** recintos del **SIGPAC de Navarra** (descarga por municipio en `sigpac.navarra.es/descargas/municipios/`), que dan el **uso agrícola** (tierra arable, regadío…), el **coeficiente de regadío** y la **pendiente media**. Sirve para saber qué parte de la parcela catastral se cultiva y si es de regadío.
- `tools/50_parcelas.py` (re-ejecutable, parámetros en `config.json` → bloque `agricultura`):
  - lee las capas, reproyecta si hace falta y se queda con las parcelas de la lista de Rubén;
  - pasa los vértices al sistema local con `origin.json`;
  - calcula superficie, cota media y pendiente con el MDT, **dirección de labor** (eje largo del rectángulo mínimo) y **entrada** (punto del contorno más cercano a un camino de OSM);
  - escribe `public/assets/agricultura/parcelas.json` y la vista `data/processed/previews/parcelas.png`: ortofoto con los contornos numerados, superficie, referencia y entrada, y un mapa de cotas en color como el del vídeo 3.
- Si el contorno catastral no coincide con la linde que se ve en la ortofoto (pasa a menudo), **no se corrige a ojo**: se marca como duda y Rubén decide (catastro, recinto SIGPAC o corrección manual guardada en `src/datos/correccionesParcelas.js`).

### 5.2 Malla y máscaras de estado (A2)

- **Malla:** el polígono triangulado y subdividido en rejilla de 1 m que sigue el MDT, unos centímetros por encima del suelo (`polygonOffset`), con un borde de linde (ribazo de hierba) de 0,5–1 m.
- **Dos máscaras por parcela**, a 0,5 m por píxel (1 m en calidad baja; máximo 1024 × 1024), en memoria como `Uint8Array` y en GPU como `DataTexture`:
  - **Máscara A (laboreo):** R = estado de la tierra (rastrojo, arado, gradeado, preparado), G = **dirección de la pasada** (ángulo del apero al pintar), B = abono, A = rodadas/compactación.
  - **Máscara B (cultivo):** R = humedad, G = día de siembra (0 = sin sembrar), B = cortado/cosechado, A = vigor.
- **Pincel (`pincel.js`):** en cada fotograma, si el apero está **bajado, dentro de la parcela y a velocidad de trabajo**, se pinta el cuadrilátero barrido entre la posición anterior y la actual con la anchura real del apero (relleno por líneas, muy barato). Solo se sube a la GPU el trozo modificado, como mucho 10 veces por segundo.
- **Recuento:** se lleva la cuenta de píxeles de cada estado dentro del polígono → «Arado: 63 %».

### 5.3 Aspecto del suelo (A2)

`sueloParcela.js` amplía `MeshStandardMaterial` (`onBeforeCompile`) y mezcla según las máscaras:

| Estado | Aspecto |
|---|---|
| Rastrojo | Color de la ortofoto + textura de paja corta; matas de `hierba.js` cerca |
| Arado | Tierra oscura volteada, **surcos con mapa de normales orientado según el canal G** (siguen las pasadas reales del jugador, como en el vídeo 2), terrones |
| Gradeado / preparado | Tierra más clara, mullida y lisa, surcos finos |
| Abonado | Moteado de granulado blanco-grisáceo (o más oscuro si es estiércol) que se va apagando con los días |
| Sembrado | Líneas de siembra finas en la dirección de la pasada |
| Húmedo | Más oscuro y brillante (menos rugosidad); charcos donde la lámina es alta; se seca con los días |
| Cosechado | Rastrojo claro y alto, con hileras de paja detrás de la cosechadora |
| Rodadas | Huellas de neumático donde pisó la máquina, más marcadas si la tierra estaba mojada |

Bordes suaves entre estados (muestreo bilineal y ruido), y fundido con la ortofoto en la linde. Texturas propias o de ambientCG (CC0), como las de `tools/11_suelo.py`.

### 5.4 Cultivos y crecimiento (A6)

- **Reloj agrícola** (`crecimiento.js`): días de cultivo acelerados respecto al ciclo de día y noche (`cicloDia.js`), con opción de pasar días. Parámetro en `src/config/agricultura.js`.
- **Modelo de cultivo** (`src/config/cultivos.js`), por cultivo: etapas (nascencia, ahijado, encañado, espigado, madurez, seco), días de cada una, altura y color por etapa, densidad, necesidad de agua y abono, rendimiento por hectárea.
- **Vigor por celda** (rejilla de 2 m en CPU): sube con humedad y abono dentro de rango, baja con sequía, encharcamiento largo o siembra sin labrar. Se guarda en el canal A de la máscara B. Así salen **rodales** más altos y más bajos, como en un campo de verdad.
- **Dibujo por distancia (presupuesto por calidad):**
  - **Cerca (< 40–60 m):** matas instanciadas (cereal: haces de hojas y espigas; maíz: plantas sueltas) con viento, como `hierba.js`. Altura, color y presencia leídas de las máscaras en el vertex shader (cortado = no se dibuja).
  - **Media distancia:** **dosel** = malla de rejilla elevada a la altura del cultivo, con textura de espigas arriba y de tallos en los lados donde hay corte: da el «escalón» del vídeo 1 al cosechar.
  - **Lejos:** solo color en el material del suelo.
- Todo el crecimiento se calcula en el shader con `uDia` y el día de siembra de cada píxel: **no hay que regenerar geometría** al pasar el tiempo.

### 5.5 Riego a manta (A7)

- `tools/52_riego.py` prepara, por parcela, una **rejilla de cotas de 1 m** del MDT (sin edificios ni árboles) y la boquera, y pinta la vista de cotas y escorrentía (como el vídeo 3) para que Rubén compruebe hacia dónde corre el agua.
- **Simulación** (`riego.js`, en CPU a 10 Hz; parcela de 2 ha ≈ 20 000 celdas): cada celda tiene lámina de agua; pasa agua a sus 4 vecinas según la diferencia de (cota + lámina), con un caudal de entrada en la boquera (abrir la **tajadera**), infiltración y evaporación. El frente avanza siguiendo el microrrelieve real; en parcelas niveladas avanza casi recto, como en la realidad.
- **Dibujo:** malla de agua sobre la parcela con la altura de la lámina y transparencia donde hay menos de 1 cm, con el material de `agua.js` y reflejo del cielo; espuma en el frente. La humedad del suelo (máscara B) toma el máximo de lámina y se seca con los días.
- Cerrar la tajadera corta el caudal. Regar de más encharca (vigor baja) y deja el suelo blando: el tractor patina y deja rodadas profundas.

### 5.6 Maquinaria (A3, A4, A5, A8)

Medidas aproximadas de máquinas genéricas, ajustables en `src/config/maquinaria.js`:

| Máquina / apero | Medidas | Tipo | Labor |
|---|---|---|---|
| Tractor | ~4,5 × 2,5 m; ruedas traseras ~1,8 m, delanteras ~1,2 m; 4RM; trabajo 6–12 km/h, carretera 40 km/h | Vehículo | Lleva aperos |
| Arado de vertedera reversible | 3–4 cuerpos, ~1,4–2 m de trabajo | Suspendido (tripuntal) | Rastrojo → arado |
| Cultivador / grada | ~3–4 m | Suspendido | Arado → gradeado |
| Abonadora centrífuga | 12–24 m de reparto | Suspendida, toma de fuerza | Abono |
| Sembradora (con tolva de abono) | ~3–4 m | Arrastrada o suspendida | Preparado → sembrado |
| Remolque | ~6 m de caja | Arrastrado (enganche de bola) | Llevar grano |
| Cosechadora | ~9 m de largo; cabezal ~6 m; **dirección trasera** | Vehículo | Maduro → cosechado |

- **Modelos** con `tools/build_maquinaria.py` (Blender en consola, como `build_coches.py`): piezas con nombre (`rueda_*`, `cabina`, `tripuntal`, `brazo_elevador`, `toma_fuerza`, `rotativo`, `luces_*`, `molinete`, `tubo_descarga`), materiales de pintura recoloreables y vistas de comprobación. Optimizados con `gltf-transform` (`npm run maquinaria`). Opción B, si Rubén aporta modelos con licencia libre: pasan por el mismo script y se anotan en `CREDITOS.md`.
- **Física:** `maquina.js` generaliza `coche.js` (ruedas por eje, tracción a las cuatro, marchas cortas). Agarre y resistencia según el estado del suelo (más resistencia en arado, menos agarre si está mojado).
- **Enganche** (`enganche.js`): aperos suspendidos como hijos cinemáticos del tripuntal, con subida y bajada animadas; aperos arrastrados y remolque como cuerpos de Rapier unidos con una articulación esférica en el enganche. Al bajar el apero: sonido, polvo y empieza a pintar.
- **Partículas** (`particulas.js`, por calidad): polvo detrás del apero (vídeo 4), terrones, abanico de grano de la abonadora, paja y polvo de la cosechadora, chorro de grano al descargar y **aves que siguen al arado**.
- **Cosechadora:** el molinete gira, el cabezal corta lo que es madurez (pinta «cosechado» en la máscara B), la tolva se llena según el rendimiento de las celdas cortadas y se vacía con el tubo sobre un remolque.

### 5.7 Juego y HUD (A9)

- **Entrada:** aro de `entradas.js` en la nave agrícola → menú: elegir máquina, apero, semilla; ver el estado de las parcelas.
- **Panel de parcela** (al entrar en ella): referencia catastral, superficie (ha), cultivo, etapa, días hasta la siguiente, humedad, abono, % de la labor actual.
- **Indicadores de máquina:** apero subido/bajado, toma de fuerza, velocidad de trabajo correcta (verde/ámbar/rojo), nivel de la tolva de semilla, abono o grano.
- **Avisos:** «Hay que labrar antes de sembrar», «La parcela pide agua», «El cereal está maduro».
- **Minimapa:** parcelas coloreadas por estado y la máquina con su anchura de trabajo.
- **Guardado** por parcela en `localStorage` (máscaras comprimidas en RLE, unos pocos KB).
- **Controles nuevos** (teclado y táctil, con el joystick de siempre): subir/bajar apero, toma de fuerza, enganchar/desenganchar, abrir/cerrar tajadera, descargar grano, cambiar de máquina. Pantalla de Controles con capturas nuevas.

---

## 6. Fases

Cada fase termina en **parada** con: lo creado, cómo probarlo y qué se necesita de Rubén. Commits pequeños en español (`feat(agri-a2): máscara de laboreo y pincel`).

### A0 — Parcelas sobre plano (datos)

- Confirmar con `00_inspect_raw.py` el nombre de la capa de parcelas rústicas del Catastro y descargar el SIGPAC de Cabanillas (pedir permiso de descarga).
- `tools/50_parcelas.py` → `parcelas.json` + `previews/parcelas.png` (contornos numerados, referencia, ha, entrada, cotas).
- Bloque `agricultura` en `config.json` con la lista de parcelas.

Aceptación: Rubén ve sus parcelas sobre la ortofoto y confirma contornos, entradas y cultivo de cada una. **Parada obligatoria: no se modela nada hasta aprobar las parcelas.**

### A1 — Zona agrícola con detalle (solo si las parcelas están fuera de la zona actual)

- `tools/51_zona_agricola.py`: recorte del MDT a 1 m y ortofoto a 4 px/m del rectángulo de las parcelas y sus caminos, con el mismo origen. Hueco correspondiente en el horizonte (coordinar con S1 de `PLAN_SALTO.md`).
- Caminos (`highway=track`) y acequias (`waterway=ditch|canal`) de OSM en esa zona.
- En el juego: se puede conducir el coche hasta las parcelas sin saltos ni huecos.

Aceptación: llegar en coche desde el pueblo a las parcelas por el camino real. Medir la memoria en calidad baja.

### A2 — Parcela viva (sin máquinas)

- `parcela.js`, `pincel.js`, `sueloParcela.js`, `src/config/agricultura.js`.
- Pincel de depuración (`?agricultura&pincel`): con el ratón o el dedo se pinta cada estado para ver los ocho aspectos de la tabla 5.3.
- Vista de comprobación: capturas de una parcela en cada estado, de cerca y de lejos.

Aceptación: los estados se distinguen bien de cerca y de lejos, los surcos siguen la pasada y la linde funde con la ortofoto.

### A3 — Tractor y nave agrícola

- `tools/build_maquinaria.py` (tractor primero), `npm run maquinaria`, `maquina.js`, `src/config/maquinaria.js`.
- Cámara de tractor (detrás y alta) y vista de cabina. Controles de teclado y táctiles.
- Entrada «Nave agrícola» en `src/config/entradas.js` (sitio que confirme Rubén): cambiar coche ↔ tractor.

Aceptación: conducir el tractor por el pueblo y los caminos, entrar en la parcela, sin vuelcos raros. Rubén aprueba el modelo.

### A4 — Labranza: arado y cultivador

- `enganche.js` (tripuntal), `aperos.js` (arado, cultivador), subir y bajar el apero, pintar la máscara A.
- Polvo, terrones, rodadas y aves detrás del arado. Sonido de motor con carga.

Aceptación: arar media parcela deja la mitad arada con los surcos en la dirección de las pasadas; el HUD marca el porcentaje.

### A5 — Abonado y siembra

- Abonadora centrífuga (toma de fuerza, abanico de grano, reparto ancho) y sembradora arrastrada (articulación, tolva que se vacía, líneas de siembra).
- Cargar semilla y abono en la nave.

Aceptación: abonar y sembrar una parcela preparada; la máscara B guarda el día de siembra.

### A6 — Cultivos que crecen

- `crecimiento.js`, `cultivo.js`, `src/config/cultivos.js` (cereal primero).
- Matas cercanas, dosel y color lejano; viento; vigor por celda (rodales).
- Botón de pasar días y `?agricultura&dia=N` para pruebas.

Aceptación: de una siembra a la madurez se ven nascencia, verde, espigado y dorado; las franjas sembradas en días distintos tienen alturas distintas, como en el vídeo 2. Coste medido por fotograma en alto y bajo.

### A7 — Riego

- `tools/52_riego.py` (cotas, boquera, vista de escorrentía), `riego.js`.
- Tajadera en la boquera, avance del agua, humedad, charcos, secado, efecto en el vigor y en la tracción.

Aceptación: al abrir la tajadera, el agua entra y cubre la parcela siguiendo la pendiente real en un tiempo razonable; al cerrarla se va secando. Rubén comprueba que el sentido del agua es el que conoce.

### A8 — Cosecha

- Cosechadora (modelo, dirección trasera, cabezal, molinete), corte del dosel con el escalón del vídeo 1, tolva, hileras de paja, rastrojo.
- Remolque y descarga de grano con el tubo.

Aceptación: cosechar una parcela madura deja rastrojo; la tolva se llena según el rendimiento y se descarga al remolque.

### A9 — Ciclo completo, HUD y guardado

- `src/hud/agricultura.js`, panel de parcela, avisos, minimapa, menú de la nave, guardado y carga.
- Segundo cultivo (maíz) y, si da tiempo, el hortícola elegido.
- `tools/prueba_agricultura.mjs`: labra, abona, siembra, riega, pasa días y cosecha una parcela automáticamente y comprueba porcentajes y estado guardado.

Aceptación: Rubén hace un ciclo completo en escritorio y en el móvil.

### A10 — Rendimiento, móvil y publicación

- Presupuesto por calidad (resolución de máscaras, distancia de matas, partículas, rejilla de riego) y medición en el Pixel 10 (recordar: sin sombras 3D en PowerVR).
- Repetir todas las pruebas existentes (`prueba_salto`, `prueba_fiestas`, `prueba_modos`…) para confirmar que el juego normal no ha cambiado.
- `CREDITOS.md` al día, capturas de controles, `npm run publica`, fusión de la rama en `main` (lo hace Rubén).

---

## 7. Trabajar en la rama sin afectar al juego

- **Rama `feat/cabanillas-agricultura`**, creada desde `main`. Todo el trabajo de agricultura va ahí. `main` sigue publicando el juego tal cual.
- Traer los cambios de `main` a menudo (`git merge main` o `rebase`) para que la fusión final sea pequeña.
- **Archivos compartidos que se tocan** (solo ganchos, cada uno protegido por `AGRICULTURA.activo` o por `?agricultura`):
  - `src/main.js`: leer `?agricultura` y cargar el modo con `import()`.
  - `src/juego/juego.js`: cambiar el vehículo activo (coche ↔ máquina) y avisar al modo agricultura en cada fotograma.
  - `src/config/entradas.js`: la entrada de la nave agrícola.
  - `src/hud/minimapa.js`: dibujar parcelas si el modo las aporta.
  - `src/controles/entrada.js`: acciones nuevas (sin cambiar las que ya existen).
  - `config.json` y `package.json`: bloque `agricultura` y script `maquinaria`.
- Con `AGRICULTURA.activo = false` el juego publicado es idéntico al de `main`. Se activa cuando A9 esté aprobada.

---

## 8. Riesgos

- **Contornos catastrales que no casan con las lindes de la ortofoto:** se resuelven en A0 con Rubén, no a ojo.
- **Parcelas fuera de la zona actual:** más descarga y más memoria (A1). Mitigación: solo el rectángulo de las parcelas, con detalle por calidad.
- **Rendimiento del cultivo** en móvil: matas solo cerca, dosel barato, presupuesto por calidad.
- **Física de aperos arrastrados** (sembradora, remolque) en marcha atrás y en giros cerrados: limitar el ángulo de la articulación y prueba automática.
- **Animaciones y modelos de maquinaria:** es la parte más laboriosa. Si se alarga, A3–A5 pueden salir con modelos sencillos y detallarse en A10.

---

## 9. Registro

`PROGRESO.md` gana un apartado «Agricultura» con la fase actual (A0…A10), lo hecho, lo pendiente y las decisiones. Commits pequeños en español (`feat(agri-a4): arado reversible con surcos orientados`). Sin push desde Claude Code (lo hace Rubén).

---

## 10. Mensaje para empezar en Claude Code

```
Estamos en la rama feat/cabanillas-agricultura. Lee CLAUDE.md, PROGRESO.md y PLAN_AGRICULTURA.md.
Resume en pocas líneas qué entiendes del modo agricultura y qué vas a reutilizar del proyecto.
Después ejecuta solo la fase A0: confirma con 00_inspect_raw.py el nombre de la capa de parcelas
rústicas del Catastro, pídeme permiso para descargar el SIGPAC de Cabanillas, crea
tools/50_parcelas.py y la vista cenital de las parcelas, lista las dudas y párate para que
revise la imagen. No modeles nada todavía.
```

Antes, Rubén apunta las referencias catastrales (polígono-parcela) de las parcelas que quiere usar y, si las tiene, copia en `docs/agricultura/` fotos de esas parcelas, de la acequia y la boquera, y de tractores y aperos del pueblo.
