# PLAN_SALTO.md — Salto en paracaídas al empezar la partida

Plan por hitos para que Cabanillas Drive empiece como un *battle royale*: el personaje va en un avión que cruza el pueblo, salta, cae viendo todo Cabanillas, abre el paracaídas y aterriza en una calle, donde le espera su coche aparcado. Complementa a `PLAN.md`, `PLAN_REALISMO.md` y `PLAN_FIESTAS.md`. Las reglas de `CLAUDE.md` siguen siendo obligatorias: un hito cada vez, parada al final de cada uno, no inventar datos geográficos, todo en español, y escritorio y móvil siempre.

Fecha: 2026-11-19. Estado: **S0 hecho (`?salto`), pendiente de que Rubén lo pruebe**. Detalle en `PROGRESO.md`, apartado «Salto en paracaídas».

Origen: el documento de arquitectura de Rubén (`arquitectura_salto_battle_royale_cabanillas_drive.html`), contrastado con lo que el juego ya tiene. Tomamos de él la máquina de estados de seis fases, la altura de salto, la apertura automática según la velocidad y los planos de recorte que cambian con la altura. **No** tomamos la reconstrucción del pueblo desde el Catastro de IDENA con QGIS (el juego ya tiene algo mejor), ni el paso a KTX2 o Meshopt, ni WebGPU, ni Git LFS.

### Inspiración y límites

Solo se toman la idea y la mecánica de los *battle royale* (avión, salto, caída libre, paracaídas). No se copia nada de ningún juego: ni modelos, ni sonidos, ni interfaz, ni nombres. El avión, el paracaídas y los sonidos son propios, hechos con un script de Blender o en código, sin assets de licencia dudosa.

---

## 1. Objetivo

1. Al pulsar **Jugar**, el personaje aparece dentro de un avión que cruza el pueblo por una ruta al azar, dibujada en el minimapa.
2. El jugador elige cuándo saltar. Si no salta, el avión lo tira al final de la ruta.
3. **Caída libre** viendo todo el pueblo y la vega: se puede picar para bajar más rápido o abrirse para frenar y avanzar.
4. **Paracaídas**: se abre a mano o automáticamente a una altura mínima, y se planea dirigiéndolo hasta una calle.
5. **Aterrizaje**: el personaje toca el suelo, se suelta el paracaídas y queda a pie. Su coche está aparcado en esa calle, a pocos metros. Desde ahí el juego sigue como siempre.

Mientras dura el vuelo se sigue cargando lo que falte (celdas de detalle, coches, peatones): el avión hace también de pantalla de carga.

---

## 2. Lo que ya existe y se reutiliza

| Necesidad | Ya está en el proyecto | Qué falta |
|---|---|---|
| Pueblo visto desde arriba | Terreno con MDT de 1 m y ortofoto PNOA a 25 cm por píxel, en la zona de 1500 × 1400 m (`origin.json`) | **El horizonte fuera de la zona** (S1) |
| Edificios ligeros a distancia | `creaEdificios` en `src/escena/edificios.js`: celdas de 250 m, techo plano lejos y tejados del LiDAR solo cerca | Cargar antes las celdas del punto de aterrizaje |
| Árboles y hierba ligeros a distancia | Impostores a más de 90 m (`arboles.js`) y hierba en 3D solo a menos de 60 m | Nada |
| Altura del suelo | `terreno.alturaEn(x, z)` | Nada |
| Poner el coche en la calle más cercana | `llevaA()` e `irA()` en `src/juego/juego.js` | Dejarlo **aparcado** junto al punto de aterrizaje |
| Jugador a pie | `src/juego/peaton.js`: cápsula de Rapier y primera persona | Entrar a pie sin haber bajado del coche |
| Cuerpo visible del jugador | `src/fiestas/personaje.js`: persona de MakeHuman en tercera persona (solo en fiestas) | Usarlo fuera de fiestas durante el salto |
| Posturas | `src/fiestas/pose.js`: `giraHueso()`, `POSTURAS`, `creaCapa()` | Posturas de caída libre, picado y colgado del paracaídas |
| Cámara | `src/camara/camaraCoche.js` y `src/fiestas/camaraPersonaje.js` (esta evita obstáculos) | Cámara del avión, de la caída y del planeo |
| Sombras y oclusión ambiental | `src/escena/render.js`: caja de sombras que sigue a la cámara y N8AO | Apagarlas por encima de cierta altura |
| Niebla y cielo | `entorno.js` y `cicloDia.js`; calidad en `src/config/calidad.js` | Niebla según la altura en **todas** las calidades |
| Minimapa | `src/hud/minimapa.js` | Ruta del avión, icono del avión y punto de aterrizaje previsto |
| Mandos | `src/controles/entrada.js` (teclado, joystick táctil) y `CONTROLES` en `src/config/camara.js` | Teclas del salto y botón táctil «Saltar» / «Abrir» |
| Sonido sin archivos | `src/fiestas/sonido.js` (WebAudio) | Viento, motor del avión y golpe al abrir el paracaídas |
| Pantallas | `src/hud/pantallas.js` (inicio, pausa) | Empezar por el salto u omitirlo |
| Pruebas automáticas | `tools/prueba_*.mjs` | `tools/prueba_salto.mjs` |

### Datos de partida que condicionan el diseño

- **La zona termina a ±750 m del centro.** Desde 550 m de altura se vería el borde del mundo. Por eso S1 añade el horizonte.
- En calidad **alta** y **media** la niebla es la de `config/escena.js` (de 1200 a 4000 m) y la cámara llega a 6000 m. En **baja**, la niebla va de 450 a 1300 m y la cámara llega a 1400 m. En el aire, la niebla se aleja según la altura en las tres calidades; es lo que esconde el borde exterior del horizonte.
- `cicloDia.js` solo cambia el color de la niebla; las distancias las puede mover el salto sin pelearse con él.
- La cámara tiene hoy `near` 0,5 m. Con 6000 m de `far`, la precisión de profundidad no da para 550 m de altura y los tejados parpadearían (*z-fighting*). Por eso `near` y `far` cambian con la altura.

---

## 3. Decisiones ya tomadas por Rubén

- **Cae el personaje**, no el coche (2026-11-19).
- El salto se hace **en Three.js, dentro del juego actual**. No se usan Unity ni otro motor.

### Dudas para Rubén (se resuelven en S0)

1. ¿El salto es el inicio **por defecto** al pulsar Jugar, con opción de saltárselo, o un botón aparte («Saltar en paracaídas»)?
2. Tras aterrizar, a pie: ¿la **primera persona** de ahora, o la **tercera persona** de fiestas sacada fuera del modo fiestas?
3. ¿Se puede aterrizar en un **tejado**? Lo sencillo es que no: si el punto cae sobre un edificio o el agua, se lleva el aterrizaje a la calle más cercana.
4. ¿El avión pasa siempre a **550 m** sobre el pueblo, o a una altura al azar entre 450 y 650 m?
5. ¿Colores del paracaídas? Propuesta: rojo y blanco, como las fiestas.

---

## 4. Arquitectura propuesta

Módulos nuevos en `src/salto/` y ajustes en `src/config/salto.js`. Nada de lo que hay se reescribe: el salto es un estado previo a `juego.js` y le entrega un punto de aparición.

```
src/salto/
  salto.js          máquina de estados y bucle del salto (crea, actualiza y libera lo demás)
  ruta.js           ruta al azar del avión sobre la zona y punto de salto forzoso
  avion.js          carga avion.glb (o una caja en S0) y gira las hélices
  caida.js          física sencilla de caída libre y planeo, sin Rapier
  paracaidas.js     lona en arco y cuerdas hechas en código, inflado animado
  camaraSalto.js    cámara del avión, de la caída y del planeo, con transiciones suaves
  alturaRender.js   near, far, niebla, sombras y N8AO según la altura
  aterrizaje.js     elige el punto válido (calle, no tejado ni agua) y aparca el coche
  sonidoSalto.js    viento, motor y apertura (WebAudio, sin archivos)
src/config/salto.js
```

### Máquina de estados

| Fase | Duración | Qué pasa |
|---|---|---|
| 1. **Avión** | hasta saltar, unos 60–70 s si no se salta | El avión vuela a la altura de crucero y unos 70 m/s. Cámara orbitando el avión. Se sigue cargando el resto. |
| 2. **Salto** | 0,6 s | Sale por la rampa trasera con la velocidad del avión, que se frena enseguida. |
| 3. **Caída libre** | unos 8–12 s | Velocidad límite de 50 m/s normal, 65 m/s en picado y 35 m/s abierto. Avance horizontal de 15 a 25 m/s en la dirección de la mirada. |
| 4. **Apertura** | 1,1 s | Se infla la lona y se frena hasta la velocidad de planeo. |
| 5. **Planeo** | unos 15–25 s | 5 m/s de bajada y 12 m/s de avance (W: 16 m/s y 7 de bajada; S: 7 m/s y 4 de bajada). Giro de unos 60° por segundo. |
| 6. **Aterrizaje** | 1,2 s | Frenada final, la lona cae y se libera, y se pasa al juego a pie con el coche aparcado al lado. |

- Apertura automática a `h_auto = 70 + 1,5 · max(0, |vy| − 35)` m sobre el suelo (unos 115 m si se pica). A mano, con Espacio o el botón, por debajo de `alturaAperturaMaxM`.
- Todas las cifras van en `src/config/salto.js`, para ajustarlas probando.

### Render según la altura (`alturaRender.js`)

- `near = clamp(0,015 · h, 0,5, 2)` y `far` de unos 6000 m en el aire (relación 3000:1). El techo de 2 m queda por debajo de la distancia entre la cámara y el personaje, para no recortarlo a él ni al avión (corrección de Rubén, 2026-11-19). Cerca del suelo se recuperan los valores de `CALIDAD`.
- La niebla de altura esconde el borde del horizonte (a unos 3 km) y se funde con la de la calidad por debajo de unos 150 m.
- Sombras 3D y N8AO apagados por encima de unos 150 m, porque la ortofoto ya trae las sombras pintadas. Se encienden de forma gradual al bajar.
- Tráfico y peatones parados y ocultos durante el vuelo y la caída. Aparecen al aterrizar.
- Durante el planeo, las colisiones de Rapier (`colisiones.actualiza`) y las celdas de detalle se centran en el **punto de aterrizaje previsto**, no en la cámara, para que todo esté listo al tocar el suelo.

### Mandos

| | Escritorio | Móvil |
|---|---|---|
| Avión | Ratón o arrastrar: mirar. Espacio: saltar | Arrastrar: mirar. Botón grande 🪂: saltar |
| Caída libre | Ratón: mirar. W: picar. S: abrirse y frenar. A y D: girar. Espacio: abrir el paracaídas | Joystick: dirección. Botón 🪂: abrir |
| Planeo | W: adelantar. S: frenar. A y D: girar. Ratón: mirar | Joystick: dirección |

Las teclas van en `CONTROLES.teclasSalto` de `src/config/camara.js`. Mientras dura el salto, Espacio deja de ser el freno de mano.

---

## 5. Hitos

Cada hito termina en **parada**, con lo creado, cómo probarlo y qué se necesita de Rubén.

### S0 — Prototipo jugable sin modelos

Objetivo: que el salto entero funcione y saber cuánto cuesta en rendimiento, antes de hacer ningún modelo.

- `src/salto/` con la máquina de estados completa. El avión es una caja alargada, el personaje una cápsula y el paracaídas un arco plano.
- Ruta al azar que cruza la zona por el casco (con semilla en `?salto=semilla` para repetir pruebas).
- `camaraSalto.js` y `alturaRender.js` con `near`, `far`, niebla, sombras y N8AO según la altura.
- `aterrizaje.js`: punto válido (fuera de edificios de `buildings.geojson` y del agua de `agua.geojson`), coche aparcado en la calle más cercana con la lógica de `llevaA()`, y paso a pie con el modo actual.
- Entrada temporal con `?salto`. El inicio normal no cambia hasta que Rubén decida la duda 1.
- `tools/prueba_salto.mjs`: salta, cae con la apertura automática y comprueba que aterriza en una calle con el coche a menos de 15 m. Sin errores de consola.
- **Medición** con `?debug` a 550, 200 y 50 m, en calidad alta y baja, y en pantalla de móvil (375 × 812): fps, llamadas de dibujo, triángulos y memoria de texturas.

Aceptación: Rubén salta con `?salto` en escritorio y en móvil y opina sobre los tiempos y la sensación. Se verá el borde de la zona, porque eso lo arregla S1. **Se resuelven las dudas de la sección 3.**

### S1 — Horizonte (Capa 0)

Objetivo: que desde el avión no se vea el borde del mundo, sino la vega del Ebro, los campos y el relieve.

- **Datos nuevos: hace falta el permiso de Rubén antes de descargar nada.** Fuentes posibles:
  - Relieve: MDT de 5 m (MDT05) o de 25 m (MDT25) del IGN, por su servicio WCS o descargado del CNIG y puesto por Rubén en `data/raw/`.
  - Color: ortofoto PNOA del mismo WMS que ya usa `02_ortho.py` (`config.json`), a unos 4 m por píxel. **Exactamente la misma capa y el mismo año (vuelo)** que la zona, y con el mismo desplazamiento de `origin.json`: si el pueblo es de un vuelo de verano y el anillo de otro de primavera, se notaría un escalón de color en el borde de ±750 m (indicación de Rubén).
  - Las descargas se guardan en `data/processed/` y no se repiten. **Si falta algo o un dato no cuadra, se para y se pregunta.**
- `tools/40_horizonte.py` (idempotente, parámetros en `config.json`): un anillo de unos 6 × 6 km alrededor del origen, con un hueco del tamaño de la zona actual.
  - Rejilla de unos 20 m, simplificada donde el terreno es llano.
  - Borde interior un poco por debajo del terreno actual y solapado unos 20 m con él, para que no se vea costura.
  - Salida: `public/assets/horizonte.glb` con una textura de 2048 px (1024 px en calidad baja).
- Carga diferida del horizonte en `src/escena/`: sin luz, como el terreno; sin sombras ni colisiones. Se descarga durante el vuelo si aún no está.
- Vista previa en `data/processed/previews/horizonte.png` (horizonte y zona juntos, desde arriba y desde 550 m).
- Atribución en `CREDITOS.md` y en la pantalla de créditos.

Aceptación: Rubén revisa la vista previa y salta: no hay costura visible y el borde exterior queda tapado por la niebla.

### S2 — Avión, paracaídas y personaje

Objetivo: cambiar las cajas de S0 por modelos propios.

- **Avión**: `tools/build_avion.py` (Blender sin ventana, como `build_scene.py`).
  - Avión de carga de diseño propio, sin marcas reales: ala alta, rampa trasera abierta y 2 o 4 hélices como nodos aparte (`helice_*`) que se giran desde el código.
  - De 3000 a 5000 triángulos, colores por vértice sin texturas. 1 unidad = 1 m, Y arriba.
  - Salida: `public/assets/salto/avion.glb`, optimizado como los coches.
- **Paracaídas** en código (`paracaidas.js`):
  - Lona en arco de unos 7 × 3 m (rejilla de 16 × 4) con franjas de color por vértice, y cuerdas (`LineSegments`) hasta los hombros.
  - Inflado animado de plegado a abierto en la fase de apertura, sin simular tela.
  - Se libera (`dispose()`) al aterrizar.
- **Personaje**: la persona de MakeHuman del modo fiestas (`FIESTAS.personaje.modelo`), sacando de `personaje.js` lo que no depende del recinto.
  - Posturas nuevas en `pose.js`: caída libre (boca abajo, brazos y piernas abiertos), picado (brazos pegados y cabeza abajo), colgado del paracaídas (brazos arriba en los mandos) y aterrizaje (piernas flexionadas).
  - Se inclina hacia donde se dirige.
- Cámara definitiva: detrás y por encima del personaje en la caída, mirando unos 40° hacia abajo para ver el pueblo, con FOV 70; más atrás y más alta en el planeo, para que se vea la lona.
- `tools/vista_posturas.mjs` se amplía con las posturas del salto.

Aceptación: Rubén ve el avión, las posturas y el paracaídas en la vista de posturas y en el juego.

### S3 — Juego completo, móvil y sonido

Objetivo: que el salto sea el inicio de verdad y funcione igual de bien en el móvil.

- Minimapa: ruta del avión, icono del avión moviéndose y, en la caída, el punto de aterrizaje previsto.
- Inicio según la duda 1: en la pantalla de inicio (y en la pausa, «Volver a saltar»), con forma de omitir el salto.
- Botón táctil contextual («Saltar» o «Abrir») sin romper el joystick ni los demás botones.
- `sonidoSalto.js`:
  - Motor del avión, más fuerte dentro.
  - Viento con un ruido filtrado cuyo volumen y tono suben con la velocidad.
  - Golpe de tela al abrir.
  - Se respeta la tecla M y el sonido apagado.
- Carga anticipada: las celdas de detalle y los coches aparcados alrededor del punto previsto, durante el planeo.
- Avisos cortos: «Espacio: saltar», «Espacio: abrir el paracaídas», «Tu coche está aparcado ahí · E para subir».
- Aterrizaje mejorado según la duda 3: si el punto cae en un tejado o en el agua, el planeo se desvía hacia la calle más cercana. **Solo por debajo de 25–30 m y de forma progresiva**; más arriba, el control es 100 % del jugador, para que no sienta que el juego se lo quita (indicación de Rubén).
- Juntar las mallas de las casas a mano entre filas (mismo material, una llamada): desde el aire se ven las 29 filas a la vez (medido en S0).
- Medición final en calidad baja con pantalla de móvil y, si Rubén puede, en un Android real. `npm run publica` y el tamaño nuevo apuntados en `PROGRESO.md`.

Aceptación: Rubén juega varias partidas empezando por el salto, en escritorio y en el móvil.

---

## 6. Riesgos

- **Rendimiento a 550 m**: se ve el pueblo entero a la vez. Debería aguantar, porque todo está en su versión ligera (techo plano, impostores, coches genéricos). Por eso S0 mide antes de hacer modelos.
- **Costura del horizonte**: el MDT de 5 o 25 m y el de 1 m no coinciden exactamente en el borde. Se resuelve con el solape y el borde hundido; si aun así se nota, con una franja de mezcla en la textura.
- **Pérdida del contexto WebGL en móvil**: el horizonte añade una textura grande. En calidad baja va a 1024 px y el avión se libera al saltar.
- **Datos de S1**: dependen del permiso y de las fuentes. Sin ellos, S0, S2 y S3 funcionan igual con la niebla tapando el borde.
- **Cambio de mandos**: Espacio es el freno de mano y aquí es saltar o abrir. Se cambia solo durante el salto y se prueba con `tools/prueba_entradas.mjs`.

---

## 7. Registro

`PROGRESO.md` gana un apartado «Salto» con el hito actual (S0…S3), lo hecho, lo pendiente, las mediciones y las decisiones. Commits pequeños en español (`feat(salto-s0): máquina de estados del salto`). Sin push.

---

## 8. Mensaje para empezar en Claude Code

```
Lee CLAUDE.md, PROGRESO.md y PLAN_SALTO.md. Resume en pocas líneas qué vas a reutilizar
del proyecto. Después ejecuta solo el hito S0 (prototipo sin modelos, con ?salto): máquina de
estados, cámara, render según la altura y aterrizaje con el coche aparcado. Haz la prueba
automática, mide a 550, 200 y 50 m en calidad alta y baja, y párate para que yo lo pruebe.
No descargues datos ni hagas modelos todavía.
```
