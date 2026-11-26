# PLAN_AGRICULTURA.md — Modo agricultura para Cabanillas Drive

Plan por fases para añadir a Cabanillas Drive un **modo agricultura**: parcelas reales del término de Cabanillas, delimitadas con el Catastro de Navarra y la ortofoto, que se trabajan con tractores, aperos y cosechadora hechos en 3D. El suelo cambia de aspecto por donde pasa el apero (arado, gradeado, abonado, sembrado, regado, cosechado) y las plantas nacen, crecen, maduran y se cosechan. Complementa a `PLAN.md`, `PLAN_REALISMO.md`, `PLAN_FIESTAS.md` y `PLAN_SALTO.md`. Las reglas de `CLAUDE.md` siguen siendo obligatorias: una fase cada vez, parada al final de cada fase, no inventar datos geográficos, todo en español, escritorio y móvil siempre.

Fecha: 2026-11-20. Estado: **A0, A2, A3, A4, A5, A6 y A7 aprobadas; A1 omitida por Rubén; A8 (cosecha) hecha el 2026-11-25, pendiente de que Rubén la pruebe** (ver §6 y `PROGRESO.md`, apartado «Agricultura»). Rama de trabajo: **`feat/cabanillas-agricultura`** (sale de `main`).

### Inspiración y límites

Referencias de Rubén (cuatro vídeos, no se suben al repositorio):

1. **Juego isométrico estilizado (cosechadora):** la cosechadora roja avanza por el borde del campo de cereal; detrás queda el rastrojo claro y el corte del cereal se ve como un «escalón» con la espiga dorada de lado. Hay franjas de cereal verde y maduro en la misma parcela.
2. **Mismo juego, ciclo completo («it ploughs · sows · grows · harvests»):** el tractor ara dejando tierra marrón con surcos y polvo, siembra encima, las franjas sembradas crecen (verde → dorado) y la cosechadora las corta. Las parcelas están separadas por lindes de hierba y caminos de tierra.
3. **Herramienta de mapas (delimitación y relieve):** se dibuja el polígono de la parcela sobre la ortofoto con vértices editables, se calcula la superficie y se colorea la cota (rojo alto, azul bajo) y la escorrentía; después se ve en 3D. **Es la base para delimitar las parcelas (A0) y para que el agua del riego siga la pendiente real (A7).**
4. **Simulador realista:** tractor rojo con sembradora-abonadora arrastrada sobre tierra labrada, con nube de polvo, sombras y terrones.

Se toman **solo ideas y mecánicas**. No se copia ni se descarga nada de esos juegos: ni modelos, ni texturas, ni interfaz, ni nombres. Tractores, aperos y cosechadora son **propios y genéricos, sin marcas ni logotipos reales**, hechos con un script de Blender o con primitivas en código (regla de `CLAUDE.md`). El aspecto buscado es el del juego actual (realista, con la ortofoto), no el estilizado del vídeo 1.

---

## 1. Objetivo

1. Desde el pueblo, el jugador llega en coche a la **COPE** (Sociedad Cooperativa del Campo San Isidro, en la calle San Isidro), cambia el coche por un **tractor** o una **cosechadora**, compra semilla, plantel, abono y aperos, y vende lo que cosecha.
2. **Todas las parcelas rústicas del término** están registradas con su contorno catastral, su superficie y su referencia (polígono-parcela): se pueden consultar, comprar, vender o trabajar. **Cualquiera se puede labrar** en cuanto el tractor entra en ella con el apero (decisión de Rubén, 2026-11-20).
3. Por los caminos reales llega a la parcela, engancha el **apero** que toca y trabaja la tierra. El suelo cambia **solo por donde pasa el apero bajado**, con la anchura de trabajo real:
   - rastrojo → **arado** (tierra volteada, surcos en la dirección de la pasada) → **gradeado/preparado** (tierra mullida y lisa) → **abonado** (granulado) → **sembrado** (líneas de siembra).
4. Las **plantas nacen y crecen** con el tiempo del juego (tamaño, color, densidad) según el agua y el abono que hayan recibido.
5. Al **regar**, el agua entra por la boquera de la acequia y **avanza sobre la parcela siguiendo el relieve real** del MDT, oscureciendo y encharcando la tierra.
6. La **cosechadora** corta el cultivo maduro por donde pasa el cabezal, llena la tolva y deja rastrojo. Se puede descargar el grano a un remolque.
7. Se ve el **ciclo completo** de la plantación mientras se trabaja: cada parcela trabajada guarda su estado y se conserva entre sesiones.

Al salir del modo, todo vuelve a la conducción normal.

---

## 2. Lo que ya existe y se reutiliza

| Necesidad | Ya está en el proyecto | Qué falta |
|---|---|---|
| Sistema de coordenadas | `data/processed/origin.json` (1 u = 1 m, norte = −Z, `H_base`) | Nada: las parcelas se convierten con el mismo origen |
| Catastro de Navarra | **Hecho en A0:** `tools/50_parcelas.py` lo baja del WFS de IDENA (en el PC no está `data/raw/`); si algún día está el paquete en `data/raw/catastro/`, usa ese | — |
| Terreno y ortofoto | `tools/01_origin_terrain.py`, `02_ortho.py`; zona de juego de 1 500 × 1 400 m | Detalle de terreno y ortofoto donde estén las parcelas que se trabajen fuera de esa zona (A1) |
| Horizonte | `tools/40_horizonte.py` (8 km, paso 20 m; MDT05 cacheado) y S1 de `PLAN_SALTO.md` (6 × 6 km) | Hueco con detalle para la zona agrícola |
| Caminos y acequias | `tools/04_osm.py` ya pide `highway` (incluye `track`) y `waterway`; A0 saca los caminos como huecos entre parcelas del Catastro + viales SIGPAC | Ampliar la consulta de OSM a la zona agrícola si sale de la actual |
| Vehículo con física | `src/vehiculo/coche.js` (Rapier `DynamicRayCastVehicleController`), `src/config/vehiculo.js` | Tractor (4RM, ruedas distintas delante y detrás, marchas lentas de trabajo) y cosechadora (dirección trasera) |
| Modelos 3D desde Blender | `tools/build_coches.py`, `build_activos_salto.py` → `gltf-transform` (`npm run coches`, `npm run salto`) | `tools/build_maquinaria.py` y `npm run maquinaria` |
| Suelo procedural | `src/escena/suelo.js`, `tools/11_suelo.py` (texturas de tierra, asfalto, baldosa) | Material de parcela con estados y surcos |
| Rastrojo y cereal cerca de la cámara | `src/escena/hierba.js` (matas 3D a < 60 m con viento) | Cultivo que crece y se corta |
| Agua | `src/escena/agua.js` | Lámina de riego que avanza |
| Puntos de entrada | `src/juego/entradas.js` + `src/config/entradas.js` (F7 de fiestas) | Entrada «COPE» |
| Cámara con obstáculos | `src/camara/camaraCoche.js` | Distancias y alturas para tractor y cosechadora |
| Controles | `src/controles/entrada.js` (teclado y joystick táctil) | Subir/bajar apero, toma de fuerza, enganchar, descargar |
| Minimapa e «Ir a…» | `src/hud/minimapa.js`, `src/hud/pantallas.js` | Parcelas coloreadas por estado |
| Carga diferida | Patrón de fiestas (`import()` dinámico, chunk aparte) | El mismo para `src/agricultura/` |
| Pruebas automáticas | `tools/prueba_*.mjs` | `prueba_agricultura.mjs` y repetir las existentes |

---

## 3. Decisiones de Rubén

Tomadas (2026-11-20):

- **Qué parcelas: todas.** Las 1 797 parcelas rústicas y mixtas del término quedan registradas con contorno, superficie y referencia. No hace falta sembrarlas ni animarlas todas: solo se crea el estado (máscaras, plantas, agua) de la parcela que se empieza a trabajar.
- **A0 aprobada:** contornos y entradas bien.
- **Datos:** autorizada la descarga del Catastro rústico, el SIGPAC, el regadío (WFS de IDENA) y la ortofoto PNOA de la zona de parcelas.
- **Cultivos:** **trigo, cebada, cebolla, brócoli, alcachofa y espárrago** (ver §5.4).
- **La COPE** (Sociedad Cooperativa del Campo San Isidro) es la nave agrícola. Rubén la marcó sobre una foto aérea y coincide con la **parcela urbana 2-1031 del Catastro** (2,29 ha: la nave grande y el patio, entre el camino del oeste, el campo de fútbol y la calle San Isidro). Funciona como una cooperativa de verdad: se compran semillas, plantel, abono, herramientas y aperos, y se vende la cosecha.
- **Parcela de pruebas: 2-700** (0,44 ha, Cza las Planas, regadío, al norte de la COPE), elegida por Rubén el 2026-11-21 entre tres candidatas (vista `cope_y_parcelas_prueba.jpg`). Como está en la zona del juego, **A1 se omite**.
- **Riego de la 2-700** (2026-11-24): la acequia corre por fuera de la linde sureste, de nordeste a suroeste, hacia la COPE, y el agua entra por esa linde en su tramo del lado este (captura de Rubén en `docs/agricultura/riego_2-700_acequia.jpg`). En A7 la acequia se afinó con la ortofoto (`config.json` → `agricultura.riego`).
- **Maquinaria** (2026-11-24): referencias de Rubén, dos tractores (verde y rojo) y una cosechadora amarilla. Modelos genéricos sin marcas; el tractor se puede pintar de rojo, verde, azul o naranja en la COPE; la cosechadora será amarilla (A8).
- **Tiempo agrícola** (2026-11-25): un día de cultivo = una hora de juego (con el juego en marcha). En la COPE se pueden pasar días (+1, +7, +30).
- **Entrega:** la rama `feat/cabanillas-agricultura` se sube a GitHub (excepción a la regla de no hacer push, pedida por Rubén); `main` no se toca.

Pendientes:

- **Dosis** de abono y de semilla (A5 usa valores orientativos: 300 kg/ha de abono, 200 de trigo, 180 de cebada).
- **Riego** (A7 usa valores orientativos): caudal de una boquera (60 L/s), tiempo de riego de la 2-700 y si hay desagüe al final.
- **Cosecha** (A8 usa valores orientativos): rendimiento del trigo (6 500 kg/ha) y de la cebada (5 800), tolva de 6 000 L y remolque de 10 000 kg.
- **Dinero:** precios de compra y venta en la COPE y si se pueden comprar y vender parcelas (A9).

---

## 4. Arquitectura

```
src/config/agricultura.js       Parámetros: resolución de las máscaras, tiempo agrícola, cantidades por calidad, activo
src/config/maquinaria.js        Tractor y cosechadora (como vehiculo.js) y aperos (anchura, velocidades, qué labor hacen)
src/config/cultivos.js          Etapas, duración, altura, colores, necesidades de agua y abono, rendimiento
src/datos/parcelas.js           Carga public/assets/agricultura/parcelas.json (1 797 parcelas; 3,8 MB, ~1 MB comprimido)
src/agricultura/modoAgricultura.js  Entrar y salir del modo; crea y libera todo
src/agricultura/registro.js     Busca la parcela bajo un punto (rejilla espacial) y su estado: libre, propia, trabajada
src/agricultura/parcela.js      Malla de la parcela sobre el MDT + máscaras de estado (CPU y textura); solo para las parcelas activas
src/agricultura/pincel.js       Pinta en la máscara el rectángulo barrido por el apero entre dos fotogramas
src/agricultura/sueloParcela.js Material del suelo (estados, surcos orientados, humedad, abono, rodadas)
src/agricultura/cultivo.js      Plantas: matas instanciadas cerca, dosel en medio, color en el suelo lejos
src/agricultura/crecimiento.js  Reloj agrícola, edad por píxel, curva del cultivo y vigor (GLSL y JavaScript) (A6)
src/agricultura/riego.js        Simulación del agua sobre el MDT, humedad, agua del cultivo y lámina visible (A7)
src/agricultura/acequia.js      Acequia (canal de hormigón con agua) y tajaderas de las boqueras (A7)
src/agricultura/maquina.js      Tractor y cosechadora sobre Rapier (a partir de coche.js), con sus piezas que se mueven
src/agricultura/cosechadora.js  Cabezal, molinete, siega de lo maduro, tolva, tubo, descarga al remolque, paja (A8)
src/agricultura/enganche.js     Tripuntal (aperos suspendidos) y enganche de bola (arrastrados, con articulación)
src/agricultura/aperos.js       Arado, cultivador, abonadora, sembradora, remolque de grano
src/agricultura/labranza.js     Con el apero bajado: pinta la franja de trabajo y las rodadas, freno de la tierra (A4)
src/agricultura/particulas.js   Polvo, terrones, grano, paja
src/agricultura/aves.js         Gaviotas que siguen al arado (A4)
src/agricultura/sonidoMotor.js  Motor diésel con WebAudio, con carga (A4)
src/agricultura/guardado.js     Estado de cada parcela trabajada en localStorage (máscaras comprimidas)
src/hud/agricultura.js          Panel de parcela, apero, calendario, avisos
tools/50_parcelas.py            Catastro + SIGPAC + regadío → parcelas.json + vistas para revisar (HECHO, A0)
tools/51_zona_agricola.py       Terreno y ortofoto de detalle de la zona agrícola (si hace falta)
tools/52_riego.py               Cotas, ribazo, boqueras, simulación y vista del llenado por parcela → riego.json (HECHO, A7)
tools/build_maquinaria.py       Tractor, cosechadora, aperos y remolque en Blender (consola), piezas con nombre
tools/prueba_agricultura.mjs    Prueba automática: labra, siembra, riega, crece y cosecha una parcela
```

Principios:

- **Un solo mundo.** Como fiestas: el modo añade un grupo (`raizAgricultura`) y sus colisiones al entrar y los libera al salir.
- **Carga diferida.** Código y modelos de agricultura en un chunk aparte con `import()`: quien solo conduce no los descarga.
- **Registro ligero, estado bajo demanda.** Las 1 797 parcelas son solo contornos y datos (para el minimapa, el panel y comprar/vender). La malla, las máscaras y las plantas se crean cuando el tractor entra en una parcela con el apero bajado, y se liberan al alejarse (el estado queda guardado).
- **Sin tocar el juego.** Todo vive en `src/agricultura/`, `src/config/` y `public/assets/agricultura/`. Los únicos cambios en archivos compartidos son ganchos pequeños y protegidos por `AGRICULTURA.activo` (ver §7).
- **Acceso directo para pruebas:** `?agricultura` empieza en la COPE con el tractor esperando (A3); `?agricultura=pincel` (y `&parcela=…`) abre el pincel de pruebas de A2; `?agricultura=cosecha` empieza con el cereal maduro; `?agricultura=riego` con la parcela sembrada y la boquera al lado; `?agricultura=2-656` en una parcela concreta.
- **La máscara manda.** El estado de cada metro de parcela está en memoria (CPU); las texturas, las plantas y el agua se dibujan a partir de ella. Así se puede medir el porcentaje trabajado, guardar y cargar.

---

## 5. Técnica de las piezas clave

### 5.1 Parcelas reales (A0, hecha)

- **Fuente:** WFS de IDENA (`https://idena.navarra.es/ogc/wfs`), Gobierno de Navarra, EPSG:25830 (el del juego), filtrado por `CMUNICIPIO = 62` (Cabanillas):
  - `CATAST_Pol_ParcelaRusti` (1 775) y `CATAST_Pol_ParcelaMixta` (22): polígono, parcela, **paraje**, contorno y superficie. En el paquete de shapefiles la capa se llama `CATASTPolParcelaRusti`.
  - `CATAST_Pol_ParcelaVia`, `CATAST_Pol_CascoUrbano`, `CATAST_Pol_Poligono` (9 polígonos), `CATAST_Pol_Municipio` (término, 3 574 ha).
  - `SIGPAC_Pol_Recinto` (3 767 recintos): uso (`IDUSO26`), secano/regadío (`TIPOEXPLOT`), pendiente.
  - `REGADI_Pol_Parcelas`: regadío y comunidad de regantes.
  - El servidor da como mucho 1 000 elementos por petición y su paginación no funciona: el script parte la caja en cuadrantes con `BBOX` dentro del `CQL_FILTER` y comprueba el recuento.
- **Relieve:** terreno del juego (LiDAR, 1 m) dentro de la zona; fuera, MDT05 del IGN (la caché de `40_horizonte.py` más 4 bloques al norte bajados por el mismo WCS).
- `tools/50_parcelas.py` (re-ejecutable, parámetros en `config.json` → bloque `agricultura`) calcula por parcela: superficie, perímetro, cota media/mín/máx, pendiente y rumbo hacia el que baja (plano ajustado), **dirección de labor** (eje largo del rectángulo mínimo), **entrada** (centro del tramo de linde más largo junto a un camino) y su frente a camino, uso SIGPAC, superficie cultivable, regadío y dudas.
- **Caminos:** el Catastro rústico casi no los dibuja como parcelas: son los huecos entre parcelas. Se toman los huecos de 2,5 m o más (apertura morfológica), los viales SIGPAC, las parcelas de vía y el casco urbano.
- Catastro y SIGPAC coinciden en todas las parcelas (≥ 99,7 %). Si en otra versión no casaran, **no se corrige a ojo**: queda como duda y Rubén decide (catastro, recinto SIGPAC o corrección manual en `src/datos/correccionesParcelas.js`).

### 5.2 Malla y máscaras de estado (A2)

- **Malla:** el polígono triangulado y subdividido en rejilla de 1 m que sigue el MDT, unos centímetros por encima del suelo (`polygonOffset`), con un borde de linde (ribazo de hierba) de 0,5–1 m.
- **Dos máscaras por parcela activa**, a 0,5 m por píxel en todas las calidades (lado máximo 1024 px; 512 en «bajo»), en memoria como `Uint8Array` y en GPU como `DataTexture`. Como quedaron en A2:
  - **Máscara A (laboreo):** R = arado, G = gradeado, B = abono, A = **dirección de la pasada** (0…π).
  - **Máscara B (cultivo):** R = humedad, G = día de siembra (0 = sin sembrar), B = cosechado, A = rodadas. El vigor de A6 se calcula en el shader (labor, abono y rodales); el agua que ha tenido el cultivo va en otra máscara («agua», A7).
  - Una tercera, «dentro» (R), con la distancia a la linde para el fundido.
- Parcelas grandes del secano (hasta decenas de ha): se trocean en teselas de máscara de 512 × 512 y solo se crean las que pisa el apero.
- **Pincel (`pincel.js`):** en cada fotograma, si el apero está **bajado, dentro de la parcela y a velocidad de trabajo**, se pinta el cuadrilátero barrido entre la posición anterior y la actual con la anchura real del apero (relleno por líneas, muy barato). Solo se sube a la GPU el trozo modificado, como mucho 10 veces por segundo.
- **Recuento:** se lleva la cuenta de píxeles de cada estado dentro del polígono → «Arado: 63 %».

### 5.3 Aspecto del suelo (A2)

`sueloParcela.js` amplía `MeshLambertMaterial` (`onBeforeCompile`, con la luz del terreno `LUZ_SUELO`) y mezcla según las máscaras. Hecho en A2 sin texturas ni mapas de normales: todo es procedural en el shader, el relieve se sombrea con el sol del juego y la malla es transparente (lo que no se ha trabajado es la ortofoto de debajo):

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
- **Modelo de cultivo** (`src/config/cultivos.js`), por cultivo: etapas, días de cada una, altura y color por etapa, marco de plantación (líneas, caballones), necesidad de agua y abono, rendimiento por hectárea y cómo se cosecha.
- **Los seis cultivos de Rubén** (calendario orientativo de la Ribera, a afinar en A6/A10 con fuentes agronómicas):

  | Cultivo | Cómo se pone | Ciclo | Cosecha | Notas para el juego |
  |---|---|---|---|---|
  | Trigo | Siembra con sembradora | Siembra en otoño, cosecha a principios de verano | Cosechadora | Franjas verde → dorado, escalón al cortar (vídeos 1 y 2) |
  | Cebada | Siembra con sembradora | Como el trigo, algo más corto | Cosechadora | Espiga con barbas; color más claro |
  | Cebolla | Siembra o trasplante en líneas | Primavera → verano | Arrancadora (deja la cebolla en hileras) y recogida | Bulbo que asoma; hojas que se tumban al madurar |
  | Brócoli | Trasplante de plantel (plantadora) | Verano → otoño-invierno | A mano, en cajas al remolque | Plantas sueltas en líneas; cabeza verde |
  | Alcachofa (Blanca de Tudela) | Plantación de zuecas en verano | Plurianual; cortes en otoño y sobre todo de marzo a junio en Navarra | A mano | Matas grandes grisáceas; parada en lo más frío del invierno |
  | Espárrago blanco | Plantación de garras | Plurianual (vida productiva de varios años); recolección de primavera | A mano, de madrugada, abriendo el caballón | **Caballones** con acaballonadora; el turión crece bajo tierra; en verano crece la mata (frondes) |

- Cereales primero (A6–A8, como estaba); los hortícolas en una fase propia (A10), porque piden aperos y una forma de cosechar distintos.
- **Vigor por celda** (rejilla de 2 m en CPU): sube con humedad y abono dentro de rango, baja con sequía, encharcamiento largo o siembra sin labrar. Se guarda en el canal A de la máscara B. Así salen **rodales** más altos y más bajos, como en un campo de verdad.
- **Dibujo por distancia (presupuesto por calidad):**
  - **Cerca (< 40–60 m):** matas instanciadas (cereal: haces de hojas y espigas; hortícolas: plantas sueltas en líneas) con viento, como `hierba.js`. Altura, color y presencia leídas de las máscaras en el vertex shader (cortado = no se dibuja).
  - **Media distancia:** **dosel** = malla de rejilla elevada a la altura del cultivo, con textura de espigas arriba y de tallos en los lados donde hay corte: da el «escalón» del vídeo 1 al cosechar.
  - **Lejos:** solo color en el material del suelo.
- Todo el crecimiento se calcula en el shader con `uDia` y el día de siembra de cada píxel: **no hay que regenerar geometría** al pasar el tiempo.

### 5.5 Riego a manta (A7)

- `tools/52_riego.py` prepara, por parcela, una **rejilla de cotas de 1 m** del MDT (sin edificios ni árboles) y la boquera, y pinta la vista de cotas y escorrentía (como el vídeo 3) para que Rubén compruebe hacia dónde corre el agua. Fuera de la zona del juego el MDT05 da la cota en metros enteros: para regar ahí hace falta el LiDAR de detalle (A1).
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
| Remolque | ~6 m de caja | Arrastrado (enganche de bola) | Llevar grano, cajas de verdura |
| Plantadora / trasplantadora | 2–4 líneas | Arrastrada, con asientos | Preparado → plantado (brócoli, cebolla, alcachofa, espárrago) |
| Acaballonadora / aporcadora | 1–3 caballones | Suspendida | Caballones del espárrago; aporcar |
| Arrancadora de cebolla | ~1,5–2 m | Arrastrada | Saca la cebolla y la deja en hileras |
| Cosechadora | ~9 m de largo; cabezal ~6 m; **dirección trasera** | Vehículo | Maduro → cosechado |

- **Modelos** con `tools/build_maquinaria.py` (Blender en consola, como `build_coches.py`): piezas con nombre (`rueda_*`, `cabina`, `tripuntal`, `brazo_elevador`, `toma_fuerza`, `rotativo`, `luces_*`, `molinete`, `tubo_descarga`), materiales de pintura recoloreables y vistas de comprobación. Optimizados con `gltf-transform` (`npm run maquinaria`). Opción B, si Rubén aporta modelos con licencia libre: pasan por el mismo script y se anotan en `CREDITOS.md`.
- **Física:** `maquina.js` generaliza `coche.js` (ruedas por eje, tracción a las cuatro, marchas cortas). Agarre y resistencia según el estado del suelo (más resistencia en arado, menos agarre si está mojado).
- **Enganche** (`enganche.js`): aperos suspendidos como hijos cinemáticos del tripuntal, con subida y bajada animadas; aperos arrastrados y remolque como cuerpos de Rapier unidos con una articulación esférica en el enganche. Al bajar el apero: sonido, polvo y empieza a pintar.
- **Partículas** (`particulas.js`, por calidad): polvo detrás del apero (vídeo 4), terrones, abanico de grano de la abonadora, paja y polvo de la cosechadora, chorro de grano al descargar y **aves que siguen al arado**.
- **Cosechadora:** el molinete gira, el cabezal corta lo que es madurez (pinta «cosechado» en la máscara B), la tolva se llena según el rendimiento de las celdas cortadas y se vacía con el tubo sobre un remolque.

### 5.7 Juego y HUD (A9)

- **Entrada:** aro de `entradas.js` en la COPE (parcela urbana 2-1031, calle San Isidro) → menú: elegir máquina, comprar semilla, plantel, abono y aperos, vender la cosecha, ver el estado de las parcelas.
- **Recolección a mano** (espárrago, alcachofa, brócoli): se baja del tractor y se cosecha a pie con el personaje (el de fiestas y salto), llenando cajas que van al remolque.
- **Panel de parcela** (al entrar en ella): referencia catastral, paraje, superficie (ha), uso SIGPAC, secano/regadío, cultivo, etapa, días hasta la siguiente, humedad, abono, % de la labor actual.
- **Indicadores de máquina:** apero subido/bajado, toma de fuerza, velocidad de trabajo correcta (verde/ámbar/rojo), nivel de la tolva de semilla, abono o grano.
- **Avisos:** «Hay que labrar antes de sembrar», «La parcela pide agua», «El cereal está maduro».
- **Minimapa:** parcelas coloreadas por estado y la máquina con su anchura de trabajo.
- **Guardado** por parcela trabajada en `localStorage` (máscaras comprimidas en RLE, unos pocos KB).
- **Controles nuevos** (teclado y táctil, con el joystick de siempre): subir/bajar apero, toma de fuerza, enganchar/desenganchar, abrir/cerrar tajadera, descargar grano, cambiar de máquina. Pantalla de Controles con capturas nuevas.

---

## 6. Fases

Cada fase termina en **parada** con: lo creado, cómo probarlo y qué se necesita de Rubén. Commits pequeños en español (`feat(agri-a2): máscara de laboreo y pincel`).

### A0 — Parcelas sobre plano (datos) — HECHA y aprobada (2026-11-20)

- `tools/50_parcelas.py` → `public/assets/agricultura/parcelas.json` (1 797 parcelas, 3 275 ha), `data/processed/agricultura/parcelas.csv` y vistas en `data/processed/previews/`: `parcelas.jpg` (término por uso), `parcelas_cotas.jpg` y `parcelas_cotas_vega.jpg` (cotas), `parcelas_zona_juego.jpg` (referencias en la zona del juego) y `parcelas_pol_01…09.jpg` (una hoja por polígono).
- Bloque `agricultura` en `config.json`.

Aceptación: Rubén ve las parcelas sobre la ortofoto y confirma contornos y entradas, y elige la parcela de pruebas. **Parada obligatoria: no se modela nada hasta aprobar las parcelas.**

### A1 — Zona agrícola con detalle (solo para las parcelas que se trabajen fuera de la zona actual) — OMITIDA por ahora (2026-11-21)

- `tools/51_zona_agricola.py`: recorte del MDT a 1 m y ortofoto a 4 px/m del rectángulo de las parcelas y sus caminos, con el mismo origen. Hueco correspondiente en el horizonte (coordinar con S1 de `PLAN_SALTO.md`).
- Caminos (`highway=track`) y acequias (`waterway=ditch|canal`) de OSM en esa zona.
- En el juego: se puede conducir el coche hasta las parcelas sin saltos ni huecos.

Aceptación: llegar en coche desde el pueblo a las parcelas por el camino real. Medir la memoria en calidad baja.

### A2 — Parcela viva (sin máquinas) — HECHA y aprobada (2026-11-24)

- `registro.js`, `parcela.js`, `pincel.js`, `sueloParcela.js`, `src/config/agricultura.js`.
- Pincel de depuración (`?agricultura=pincel`, y `&parcela=<ref>` para otra parcela): con el ratón o el dedo se pinta cada estado para ver los ocho aspectos de la tabla 5.3; 🧪 Muestrario pinta una franja por estado.
- Vista de comprobación: `tools/vista_agricultura.mjs` → capturas de la parcela en cada estado, de cerca y de lejos, en `data/processed/previews/agricultura/`.
- Hecho así: malla transparente (lo no trabajado deja ver la ortofoto de debajo); máscaras a 0,5 m/px; relieve de surcos, terrones y rodadas calculado en el shader y sombreado con el sol; la hierba 3D se quita de lo labrado.

Aceptación: los estados se distinguen bien de cerca y de lejos, los surcos siguen la pasada y la linde funde con la ortofoto.

### A3 — Tractor y nave agrícola — HECHA y aprobada (2026-11-25)

- `tools/build_maquinaria.py` (tractor primero), `npm run maquinaria`, `maquina.js`, `src/config/maquinaria.js`.
- Cámara de tractor (detrás y alta) y vista de cabina. Controles de teclado y táctiles.
- Entrada «COPE» en `src/config/entradas.js` (parcela urbana 2-1031, en la calle San Isidro): cambiar coche ↔ tractor.
- Hecho así: tractor genérico de primitivas en Blender (`tools/build_maquinaria.py`, sin texturas ni marcas), mismo controlador que el coche con tracción total (`coche.js` + `src/config/maquinaria.js`), menú de la COPE con el color del tractor (`src/hud/menuCope.js`), el vehículo que no se conduce queda aparcado en el patio y `tools/prueba_tractor.mjs`.

Aceptación: conducir el tractor por el pueblo y los caminos, entrar en la parcela, sin vuelcos raros. Rubén aprueba el modelo.

### A4 — Labranza: arado y cultivador — HECHA y aprobada (2026-11-25)

- `enganche.js` (tripuntal), `aperos.js` (arado, cultivador), subir y bajar el apero, pintar la máscara A.
- Polvo, terrones, rodadas y aves detrás del arado. Sonido de motor con carga.
- Hecho así: arado reversible de 4 cuerpos (1,6 m) y cultivador de 3 m en `build_maquinaria.py`; brazos del tripuntal aparte y puntos del enganche en `maquinaria.json`; aperos en el patio de la COPE, elegidos en su menú; Q o ⬇ sube y baja; `labranza.js` pinta la franja de la línea de trabajo y las rodadas, frena el tractor (10 y 13 km/h como mucho) y quita la hierba 3D de lo labrado; `particulas.js` (polvo y terrones), `aves.js` (gaviotas), `sonidoMotor.js` y panel `src/hud/agricultura.js`; prueba `tools/prueba_labranza.mjs`.

Aceptación: arar media parcela deja la mitad arada con los surcos en la dirección de las pasadas; el HUD marca el porcentaje.

### A5 — Abonado y siembra — HECHA y aprobada (2026-11-25)

- Abonadora centrífuga (toma de fuerza, abanico de grano, reparto ancho) y sembradora arrastrada (articulación, tolva que se vacía, líneas de siembra).
- Cargar semilla y abono en la COPE.
- Hecho así: abonadora suspendida de dos discos (12 m) con cardán a la toma de fuerza y sembradora de 3 m y 20 líneas enganchada a la barra de tiro, que sigue al tractor de forma cinemática (tractriz, lanza limitada a 75°, apoyada en el terreno; sin cuerpo en la física); tolvas con carga visible que se gastan por dosis × superficie (abono 300 kg/ha, trigo 200, cebada 180, orientativas) y se llenan en la COPE al enganchar o con «Llenar la tolva»; la siembra guarda el día de cultivo (1 hasta A6) y el cultivo de la parcela; franjas de los aperos con extremos rectos; prueba `tools/prueba_siembra.mjs`.

Aceptación: abonar y sembrar una parcela preparada; la máscara B guarda el día de siembra.

### A6 — Cultivos que crecen — HECHA y aprobada (2026-11-25)

- `crecimiento.js`, `cultivo.js`, `src/config/cultivos.js` (trigo y cebada).
- Matas cercanas, dosel y color lejano; viento; vigor por celda (rodales).
- Botón de pasar días y `?agricultura&dia=N` para pruebas.
- Hecho así: reloj de una hora de juego por día, con «Calendario» en la COPE (+1, +7, +30 días); edad por píxel = (hoy − día de siembra) mod 255, topada a 250 días; curvas por edad de altura, cobertura, espiga, colores y cabeceo con ocho etapas; vigor por tierra preparada y abono, con rodales; color en el suelo de lejos, dosel (rejilla de la parcela levantada en el vertex shader) y matas instanciadas en una rejilla que sigue a la cámara, todo en los shaders con la edad de cada píxel; el vigor va calculado en el shader (no hace falta otra máscara); prueba `tools/prueba_cultivo.mjs`.

Aceptación: de una siembra a la madurez se ven nascencia, verde, espigado y dorado; las franjas sembradas en días distintos tienen alturas distintas, como en el vídeo 2. Coste medido por fotograma en alto y bajo.

### A7 — Riego — HECHA y aprobada (2026-11-25)

- `tools/52_riego.py` (cotas, boquera, vista de escorrentía), `riego.js`.
- Tajadera en la boquera, avance del agua, humedad, charcos, secado, efecto en el vigor y en la tracción.
- Hecho así: acequia de la 2-700 afinada con la ortofoto (canal estrecho sobre el cajero, a 1,5–2 m de la linde sureste) y boqueras de Rubén en `config.json`; `52_riego.py` saca cotas, plano, ribazo de las lindes (no se riega), simula y escribe `riego.json` y la vista `riego_2-700.jpg`; en el juego, la misma simulación (lámina por celda de 1 m, ecuación inercial local con Manning, caudal por boquera, infiltración que baja al llenarse el suelo) con el tiempo agrícola (×24); acequia y tajaderas en 3D, G o 💧 junto a una tajadera; lámina que sigue el terreno; la humedad queda en la máscara de cultivo y se seca cada día; nueva máscara «agua» con el agua que ha tenido el cultivo (vigor ×0,8…×1,2); barro (agarre, freno, rodadas, sin polvo); pasar días cierra las tajaderas; `?agricultura=riego`; prueba `tools/prueba_riego.mjs`. Valores del modelo orientativos (pendientes de Rubén).

Aceptación: al abrir la tajadera, el agua entra y cubre la parcela siguiendo la pendiente real en un tiempo razonable; al cerrarla se va secando. Rubén comprueba que el sentido del agua es el que conoce.

### A8 — Cosecha — HECHA y aprobada (2026-11-26)

- Cosechadora (modelo, dirección trasera, cabezal, molinete), corte del dosel con el escalón del vídeo 1, tolva, hileras de paja, rastrojo.
- Remolque y descarga de grano con el tubo.
- Hecho así: cosechadora genérica amarilla de 5,4 m de cabezal y remolque de grano de un eje en `build_maquinaria.py` (cabezal, molinete, tubo y grano como piezas que se mueven, apartadas en `maquina.js`); `coche.js` con tracción delantera y dirección trasera; `cosechadora.js`: Q baja el cabezal, la labor `segar` del pincel corta solo lo maduro y apunta el grano por píxel (rendimiento del cultivo × vigor), tolva de 6 000 L, paja, polvo y rodadas; X saca el tubo y el grano pasa al remolque que haya debajo; en la COPE se descarga (se apunta lo entregado); a pie se sube al vehículo más cercano; `?agricultura=cosecha`; prueba `tools/prueba_cosecha.mjs`. Rendimientos orientativos: trigo 6 500 y cebada 5 800 kg/ha con vigor 1.

Aceptación: cosechar una parcela madura deja rastrojo; la tolva se llena según el rendimiento y se descarga al remolque.

### A9 — Ciclo completo, HUD y guardado — HECHA (2026-11-26), pendiente de que Rubén la pruebe

- Hecho así: dinero (3 000 €), venta de grano (trigo 0,25 y cebada 0,238 €/kg, Lonja del Ebro, noviembre de 2026), compra de semilla y abono al llenar la tolva (0,45 €/kg, orientativo), menú de la COPE con «Tus parcelas», avisos, panel con SIGPAC y regadío, capa de parcelas y de anchura de trabajo en el minimapa, guardado en `localStorage` (RLE por canales + base64; un escenario de pruebas no guarda) y `tools/prueba_agricultura.mjs`. Comprar y vender parcelas: pendiente de que Rubén lo quiera.

- `src/hud/agricultura.js`, panel de parcela, avisos, minimapa, menú de la COPE (comprar y vender), guardado y carga.
- Comprar y vender parcelas si Rubén lo quiere.
- `tools/prueba_agricultura.mjs`: labra, abona, siembra, riega, pasa días y cosecha una parcela automáticamente y comprueba porcentajes y estado guardado.

Aceptación: Rubén hace un ciclo completo en escritorio y en el móvil.

### A10 — Hortícolas: cebolla, brócoli, alcachofa y espárrago

- Plantadora, acaballonadora y arrancadora (modelos y enganche como en A4–A5).
- Plantas de cada cultivo (matas instanciadas y dosel) y sus etapas; espárrago y alcachofa plurianuales (la parcela guarda la edad de la plantación).
- Recolección a mano con el personaje y cajas al remolque; arrancado de la cebolla en hileras.
- Venta en la COPE.

Estado (2026-11-26): hecho salvo la **acaballonadora** (el espárrago se planta en llano) y el ciclo de varios años (alcachofa y espárrago rebrotan en su edad de rebrote). Cebolla con arrancadora y cajón; brócoli, alcachofa y espárrago con plantadora (tolva en plantas) y recolección a pie con cesta de 40 kg. Detalle en `PROGRESO.md`.

Aceptación: Rubén planta y cosecha cada uno de los cuatro, en escritorio y en el móvil.

### A11 — Rendimiento, móvil y publicación

- Presupuesto por calidad (resolución de máscaras, distancia de matas, partículas, rejilla de riego) y medición en el Pixel 10 (recordar: sin sombras 3D en PowerVR).
- Repetir todas las pruebas existentes (`prueba_salto`, `prueba_fiestas`, `prueba_modos`…) para confirmar que el juego normal no ha cambiado.
- `CREDITOS.md` al día (Catastro, SIGPAC y regadío del Gobierno de Navarra), capturas de controles, `npm run publica`, fusión de la rama en `main` (lo hace Rubén).

---

## 7. Trabajar en la rama sin afectar al juego

- **Rama `feat/cabanillas-agricultura`**, creada desde `main`. Todo el trabajo de agricultura va ahí. `main` sigue publicando el juego tal cual.
- Traer los cambios de `main` a menudo (`git merge main` o `rebase`) para que la fusión final sea pequeña.
- **Archivos compartidos que se tocan** (solo ganchos, cada uno protegido por `AGRICULTURA.activo` o por `?agricultura`):
  - `src/main.js`: leer `?agricultura` y cargar el modo con `import()`.
  - `src/juego/juego.js`: cambiar el vehículo activo (coche ↔ máquina) y avisar al modo agricultura en cada fotograma.
  - `src/config/entradas.js`: la entrada de la COPE.
  - `src/hud/minimapa.js`: dibujar parcelas si el modo las aporta.
  - `src/controles/entrada.js`: acciones nuevas (sin cambiar las que ya existen).
  - `config.json` y `package.json`: bloque `agricultura` y script `maquinaria`.
- Con `AGRICULTURA.activo = false` el juego publicado es idéntico al de `main`. Se activa cuando A9 esté aprobada (los hortícolas de A10 pueden llegar después).

---

## 8. Riesgos

- **Contornos catastrales que no casan con las lindes de la ortofoto:** en A0 casan bien en la zona revisada; si aparece alguno, se resuelve con Rubén, no a ojo.
- **Parcelas fuera de la zona actual:** casi todas (1 468 de 1 797). Se trabajan con el MDT05 y la ortofoto del horizonte hasta que A1 añada detalle donde haga falta. Mitigación: detalle solo en el rectángulo de las parcelas que se trabajen, por calidad.
- **Parcelas muy grandes en el secano:** máscaras por teselas, solo las que se pisan.
- **Hortícolas:** cuatro cultivos con labores y cosecha distintas; si se alarga, se hacen de uno en uno (cebolla primero, que se parece más al cereal).
- **Rendimiento del cultivo** en móvil: matas solo cerca, dosel barato, presupuesto por calidad.
- **Física de aperos arrastrados** (sembradora, remolque) en marcha atrás y en giros cerrados: limitar el ángulo de la articulación y prueba automática.
- **Animaciones y modelos de maquinaria:** es la parte más laboriosa. Si se alarga, A3–A5 pueden salir con modelos sencillos y detallarse en A11.

---

## 9. Registro

`PROGRESO.md` tiene un apartado «Agricultura» con la fase actual (A0…A11), lo hecho, lo pendiente y las decisiones. Commits pequeños en español (`feat(agri-a4): arado reversible con surcos orientados`). Push de la rama de agricultura a GitHub permitido por Rubén (2026-11-20); `main` no se toca.

---

## 10. Cómo regenerar los datos de A0 en el PC

```
conda run -n cabdrive python tools/50_parcelas.py
```

Usa las cachés de `data/processed/agricultura/` (WFS y MDT05), `data/processed/horizonte/` y `data/processed/orto_wms/`; si están, no descarga nada. La primera vez sin caché tarda unos minutos.
