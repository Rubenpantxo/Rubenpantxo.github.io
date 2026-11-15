# PLAN_FIESTAS.md — Modo fiestas (festejo taurino) para Cabanillas Drive

Plan por fases para añadir a Cabanillas Drive un **modo fiestas**: el mismo pueblo, transformado como en las fiestas (vallas, arena, banderines, público, sin tráfico), con tres minijuegos de vacas. Complementa a `PLAN.md` y `PLAN_REALISMO.md`. Las reglas de `CLAUDE.md` siguen siendo obligatorias (una fase cada vez, parada al final de cada fase, no inventar datos geográficos, español, escritorio y móvil siempre).

Fecha: 2026-11-15. Estado: **F0 en segunda vuelta (2026-11-15), pendiente de la aprobación de Rubén**. Detalle en `PROGRESO.md`, apartado «Fiestas».

> **Correcciones del 2026-11-15 (respuestas y fotos de Rubén), que mandan sobre el texto de abajo:**
> - No hay camión de ganado. Las vacas salen de un **corral** en el lado sur de la plaza, por una manga de tablas, también en el encierro. La **ambulancia** (obligatoria) va detrás de la valla, en el callejón sur del Ayuntamiento.
> - Además del tablado del Ayuntamiento hay **gradas en la boca de la Calle Fragua**. La puerta entre plaza y calle queda al oeste de esa boca, no en el nudo de OSM.
> - Más tipos de valla: **barandilla roja de tubo**, **cierres de barrotes** que cruzan la acera y **vallas grises** que protegen puertas. Delante de las tapias no hay valla.

---

## 1. Objetivo

Al llegar a la Plaza del Ayuntamiento o a la Calle San Roque, el jugador puede entrar en el modo fiestas. El juego:

1. Quita el tráfico y los coches aparcados del recinto.
2. Monta el vallado real del pueblo, la arena de la plaza, los banderines y el camión de las vacas.
3. Convierte a los peatones en público colocado tras las vallas, en el tablado y en los balcones.
4. Pasa al jugador a pie, en tercera persona, dentro del recinto.
5. Ofrece un menú con tres modos: **Vacas en la plaza**, **Vacas en la calle** y **Encierro**.

Al salir, todo vuelve al estado normal de conducción.

Además, el mismo sistema de «puntos de entrada» sirve para enlazar otros juegos desde su sitio real del pueblo (el primero: el frontón → `juegos/cesta-punta/`).

### Inspiración y límites (importante)

La referencia de diseño es el juego web *Recortadores Bravos* (recortadoresbravos.com): cámara en tercera persona, tipos de recorte, cogida con muñeco articulado. **Solo se toman ideas y mecánicas.** No se copia ni se descarga nada suyo: ni código, ni modelos, ni texturas, ni animaciones, ni anuncios, ni nombre. Todo el arte y el código de este modo son propios, con las mismas reglas de `CLAUDE.md` (sin assets de licencia dudosa; lo que venga de fuera, con licencia clara y apuntado en `CREDITOS.md`).

---

## 2. Lo que ya existe y se reutiliza

| Necesidad | Ya está en el proyecto | Qué falta |
|---|---|---|
| Escenario de la plaza y San Roque | Casas modeladas a mano: `src/datos/casasPlaza.js` (plaza impares 1-11, pares 2-10, San Roque 50-54), más `casasCalles.js`; Sala de Cultura en `singulares.js` | Nada: el festejo se monta encima |
| Jugador a pie | `src/juego/peaton.js`: cápsula con el controlador de personaje de Rapier, primera persona, E/F para bajarse | Cuerpo visible, cámara en tercera persona, esprint, quiebro, salto, subirse a la valla |
| Personas | 12 modelos de MakeHuman con esqueleto de 53 huesos y animaciones de andar y quieto (`tools/build_personas.py`, `src/juego/peatones.js`) | Animaciones nuevas (correr, quiebro, salto, trepar, aplaudir, sentado) y uso como jugador, mozos y público |
| Tráfico y peatones | `src/juego/trafico.js`, `peatones.js`, con cantidad por calidad | Poder apagarlos o excluir una zona |
| Quitar cosas por zona | Patrones `EDIFICIOS_SUSTITUIDOS`, `ZONAS_SIN_MUROS`, `enZonaCasas()` | Lo mismo para coches aparcados, tráfico y peatones dentro del recinto |
| Colisiones | `registraEstatico()` y `creaGestorColisiones()` en `src/fisica/fisica.js` | Colisión de vallas, burladeros y camión |
| Cámara con obstáculos | `sinObstaculos()` de `src/camara/camaraCoche.js` | Adaptarla a la cámara del personaje |
| Suelo procedural | `src/escena/suelo.js` (asfalto, acera, tierra) | Capa de arena dentro del polígono de la plaza |
| Menús | `src/hud/pantallas.js` (inicio, pausa, «Ir a…») | Menú de fiestas, marcador y resultados |
| Controles | `src/controles/entrada.js` (teclado y táctil con joystick) | Acciones nuevas y botones táctiles |
| Publicación | `npm run publica` → `juegos/cabanillas-drive/` | Nada |

Coordenadas útiles ya presentes en `assets/osm/calles.geojson` (sistema local del juego, metros, norte = −Z):

- Plaza del Ayuntamiento: vías `w1433831399`, `w1433831400`, `w1433831402`.
- Calle San Roque (tramo que llega a la plaza): `w314839343`, que acaba en el nudo (148,4, 325,4), donde se juntan plaza, San Roque y Calle Fragua (`w316934229`). **Ahí va la puerta que separa plaza y calle.**
- Ayuntamiento (POI `townhall`): (211,4, 346,5).

---

## 3. Decisiones ya tomadas por Rubén

- **Tres modos:** Vacas en la plaza (recorte libre o concurso), Vacas en la calle (plaza y calle unidas, vacas de una en una) y Encierro (6 o 7 vacas a la vez).
- **Arena en la plaza siempre** en modo fiestas (en la realidad solo a veces): sirve además para que se note que se está en este modo. En la calle, asfalto.
- **Vallado como el real**, según las fotos de Rubén (guardarlas en `docs/fiestas/` como referencia):
  - *Valla de tablones*: postes metálicos rojos y 4 o 5 tablones horizontales de madera sin pintar, con huecos. Es la principal. La gente se sienta arriba o mira entre las tablas.
  - *Panel rojo macizo*: chapa roja cerrada, más baja, en tramos de la calle.
  - *Burladero*: panel rojo estrecho separado de la valla, para refugiarse.
  - *Tablado del Ayuntamiento*: estructura roja con gradas delante de la fachada.
  - *Puerta*: tramo de valla practicable entre plaza y calle.
- **Salida de las vacas:** camión de ganado con rampa pegado al vallado, en el lado de la plaza marcado como corral en el croquis.
- **Banderines** de triangulitos cruzando la calle de fachada a fachada.
- **Público:** fuera del recorrido, en la acera tras las vallas, subido a ellas, en el tablado y en los balcones. No circula por las calles del recinto.
- **Sin tráfico** en modo fiestas.
- El recinto se acota a plaza + San Roque hasta la Sala de Cultura (croquis de Rubén).

---

## 4. Arquitectura propuesta

```
src/config/fiestas.js        Parámetros ajustables (vacas, puntuación, cámara, cantidades por calidad)
src/datos/fiestas.js         Recinto: polígono de la plaza, eje de la calle, tramos de valla, puerta, corral, tablado, zonas de público
src/fiestas/modoFiestas.js   Entrar y salir del modo: apaga/enciende sistemas, crea/destruye el festejo
src/fiestas/vallado.js       Piezas modulares instanciadas + colisión
src/fiestas/ambiente.js      Arena, banderines, camión, público
src/fiestas/personaje.js     Jugador en tercera persona (sobre peaton.js)
src/fiestas/camaraPersonaje.js
src/fiestas/vaca.js          Modelo, animación y comportamiento de una vaca
src/fiestas/manada.js        Varias vacas (encierro)
src/fiestas/recortes.js      Detección y puntuación
src/fiestas/modos/           plaza.js, calle.js, encierro.js
src/hud/fiestas.js           Menú, marcador, resultados
src/juego/entradas.js        Puntos de entrada en el mundo (fiestas, frontón…)
tools/20_recinto_fiestas.py  Vista cenital del recinto sobre la ortofoto para que Rubén lo corrija
tools/build_vaca.py          Modelo y animaciones de la vaca (Blender)
```

Principios:

- **Un solo mundo.** El modo fiestas no carga otra escena: añade un grupo (`raizFiestas`) y sus colisiones al entrar, y los libera al salir.
- **Carga diferida.** El código y los assets de fiestas van en un chunk aparte (`import()` dinámico): quien solo conduce no los descarga.
- **Todo instanciado.** Vallas, banderines y público con `InstancedMesh`; cantidades por calidad en `src/config/fiestas.js`.
- **Acceso directo para pruebas:** `?fiestas=plaza|calle|encierro` entra directamente al modo.

---

## 4b. Controles, suertes y marcador (decisión de Rubén: los mismos que la referencia)

Rubén quiere el **mismo esquema de control y la misma información en pantalla** que *Recortadores Bravos*, documentados aquí a partir de sus capturas y de la pantalla de ayuda del propio juego (2026-11-15). Se replica el funcionamiento; **el aspecto (colores, iconos, tipografía, textos) es propio**, con el estilo del HUD de Cabanillas Drive.

### Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Moverse | WASD (y flechas) | Joystick a la izquierda («Mover») |
| Correr | Mayús | Joystick a fondo |
| Quiebro | Q | Botón Quiebro |
| Recorte | E | Botón Recorte |
| Salto | Espacio | Botón Salto |
| Especial (salto al trascuerno) | E + Espacio a la vez | Botón Especial |
| Combo (quiebro de ida y vuelta) | Q dos veces seguidas | Quiebro dos veces seguidas |
| Subir al refugio / bajar | F | Botón Subir (aparece junto al refugio) |
| Cámara | V (por confirmar) | Botón del ojo |
| Sonido | M (por confirmar) | Botón del altavoz |
| Pantalla completa | — | Botón de la esquina |

Disposición táctil: joystick abajo a la izquierda; a la derecha, cuatro botones redondos en abanico (Recorte y Especial abajo, Salto y Quiebro encima) y, sobre ellos, sonido y cámara. En móvil se juega en horizontal.

Nota: E y F ya se usan en Cabanillas Drive para bajarse y subirse al coche. No chocan, porque en modo fiestas no hay coche; `entrada.js` debe tener un mapa de teclas por modo.

### Cómo funcionan las suertes

- **La acción es inmediata y depende de la distancia.** El botón de cada suerte se ilumina cuando la vaquilla llega a la distancia buena; pulsar entonces ejecuta la suerte. Fuera de distancia no sale o sale mal.
- **Cuanto más cerca, más puntos:** un pase ceñido y sin contacto vale más.
- **Energía:** cada suerte gasta. El quiebro poca, el recorte algo más, el salto mucha, y la especial es la que más paga y la que más cansa. Se recupera sola, y más deprisa subido al refugio.
- **Vida:** baja con cada cogida (hay cogidas leves y fuertes); a cero, se acaba la tanda.
- **La vaquilla se cansa:** empieza con fuerza y va perdiendo a lo largo de la tanda.
- **Refugio:** en la referencia son remolques; en Cabanillas, **la valla de tablones y los burladeros**, con la misma tecla (F).
- **Tanda de dos minutos** por defecto (ajustable por modo).

### Marcador

- **Panel del jugador:** Puntos, Tiempo (cuenta atrás en segundos), Pases, barra de Vida y barra de Energía.
- **Panel de la vaquilla:** barra de fuerza con su estado («Con fuerza»…), lo que está haciendo («Embestida», «Te revuelca»…) y la distancia al jugador en metros.
- **Avisos:** consejo breve abajo («Calcula su paso») y aviso grande arriba en los momentos clave («¡Cogida fuerte!»). Los textos se escriben propios.
- **Antes de entrar:** pantalla con los controles y cuatro o cinco consejos de juego.

Todos los valores (distancias válidas, gasto de energía, daño, puntos, duración) van en `src/config/fiestas.js`.

---

## 5. Fases

Cada fase termina en **parada** con: lo creado, cómo probarlo y qué se necesita de Rubén.

### F0 — Recinto sobre plano

Objetivo: dejar fijado, con datos, dónde va cada cosa.

- `src/datos/fiestas.js` con: polígono de la plaza, eje y ancho de la calle hasta la Sala de Cultura, tramos de valla y su tipo, puerta en el nudo (148,4, 325,4), corral/camión, tablado, cortes de las calles que entran al recinto y zonas de público.
- Las posiciones salen de los croquis de Rubén, de `calles.geojson`, de las fachadas de `casasPlaza.js`/`casasCalles.js` y del Catastro. **Lo que no se pueda deducir no se inventa: se marca como duda.**
- `tools/20_recinto_fiestas.py` → `data/processed/previews/recinto_fiestas.png`: ortofoto con el recinto, vallas por tipo (colores), puerta, corral y tablado, numerados.

Aceptación: Rubén revisa la imagen y corrige. **Parada obligatoria: no se modela nada hasta que el recinto esté aprobado.**

Dudas que debe resolver Rubén aquí: lado exacto del tablado y del camión; dónde se cortan las calles de arriba de la plaza; qué tramos llevan tablones y cuáles panel rojo; dónde hay burladeros; final exacto del recorrido en la Sala de Cultura.

### F1 — El pueblo en fiestas (sin vacas)

Objetivo: entrar al modo y pasear a pie por el recinto montado.

- `modoFiestas.js`: entrar/salir con fundido; apaga tráfico, quita coches aparcados y peatones del recinto, pone la hora de «Día».
- `vallado.js`: valla de tablones, panel rojo, burladero, puerta (abierta/cerrada) y tablado, con primitivas, materiales propios y colisión. Medidas tomadas de las fotos (altura de una persona como escala) y ajustables en config.
- `ambiente.js`: arena en el polígono de la plaza (capa en el shader del suelo), banderines con viento, camión con rampa (primitivas).
- Público estático: personas de MakeHuman en postura de quieto tras las vallas, en el tablado y en balcones (posturas sentado y apoyado se añaden en F6).

Aceptación: con `?fiestas=plaza` se recorre todo el recinto a pie sin poder salir de él ni atravesar vallas; al salir del modo el pueblo queda exactamente como antes; escritorio y móvil; coste medido con `?debug=1`.

### F2 — Personaje en tercera persona

Objetivo: que moverse sea divertido antes de que haya vacas.

- `personaje.js` sobre el controlador de `peaton.js`: cuerpo visible (modelo de MakeHuman), andar, correr y esprint con cansancio, giro rápido.
- Acciones: **quiebro** (finta lateral corta), **salto**, **subirse a la valla / entrar en el burladero** (zona segura) y bajarse.
- Animaciones nuevas hechas en el pipeline de Blender (`tools/build_personas.py`): correr, esprint, quiebro izquierda/derecha, salto, trepar, caída.
- `camaraPersonaje.js`: detrás del hombro, se acerca si una fachada tapa, y tiene en cuenta a la vaca más cercana para no perderla de vista.
- Controles en `entrada.js`: los de la sección 4b (mismo esquema que la referencia), en teclado y táctil.

Aceptación: prueba de recorrido plaza → final de la calle y vuelta; subirse y bajarse de la valla en cualquier tramo; táctil comprobado.

### F3 — La vaca

Objetivo: una vaca creíble a la que se pueda recortar.

- `tools/build_vaca.py`: modelo propio de vaquilla con esqueleto sencillo y animaciones (parada, trote, galope, embestida, derrote, frenada). Capas de color: colorada, negra y berrenda.
- `vaca.js`, máquina de estados: sale del camión → reconoce → elige objetivo (jugador o mozo cercano y en movimiento) → embiste → pasa de largo o derrota en la valla → se para y vuelve a mirar.
- **La clave del recorte:** la vaca corre más que el jugador, pero **gira peor cuanto más deprisa va**. Esa diferencia es la que permite el quiebro. Parámetros en config (velocidad, radio de giro, tiempo de reacción, bravura).
- No ataca a quien está en zona segura; sí remata contra la valla y la hace vibrar.
- Cogida: en esta fase, volteo sencillo y vuelta a zona segura. Sin sangre.

Aceptación: una vaca suelta en la plaza persigue, embiste y se la puede esquivar con un quiebro bien medido; no atraviesa vallas ni se queda atascada en esquinas (prueba automática de 5 minutos sin atasco).

### F4 — Recortes y puntuación

- `recortes.js`: resuelve las suertes de la sección 4b (**quiebro**, **recorte**, **salto**, **especial** y **combo**) cuando el jugador pulsa con la vaca a distancia válida, y cuenta los **pases**.
- Nota de cada suerte por riesgo (distancia mínima a los cuernos), limpieza (sin tropiezo) y variedad; combos; penalización por cogida.
- Marcador de la sección 4b (puntos, tiempo, pases, vida, energía y panel de la vaquilla), avisos en pantalla, cámara lenta breve en los mejores recortes y respuesta del público (olés).

Aceptación: tabla de casos de prueba (quiebro ceñido, quiebro lejano, salto, cogida) con la puntuación esperada.

### F5 — Los tres modos y el menú

- **Menú de fiestas** (`src/hud/fiestas.js`): Vacas en la plaza · Vacas en la calle · Encierro · Volver al pueblo.
- **Vacas en la plaza** (puerta cerrada): *recorte libre* (sin tiempo) y *concurso* (rondas con tiempo, nota final y mejor marca guardada en el navegador).
- **Vacas en la calle** (puerta abierta, plaza y calle unidas): salen de una en una; cada vaca está un tiempo y se recoge antes de soltar la siguiente; puntos por recortes y por metros corridos delante.
- **Encierro**: 6 o 7 vacas en manada (`manada.js`: se mantienen juntas, alguna se descuelga) de un extremo del recorrido al otro; puntos por tiempo corrido delante y cerca de la manada sin cogida.

Aceptación: los tres modos se juegan de principio a fin con pantalla de resultados y vuelta al menú.

### F6 — Ambiente de fiestas

- Mozos (personajes no jugadores) en el recorrido: corren, citan a la vaca y se suben a la valla.
- Público con animaciones: sentado en la valla, apoyado, aplaudiendo; reacciona a recortes y cogidas.
- Sonido: ambiente de gente, cencerros, pasos, golpe en la valla, cohete de inicio. Propio, sintetizado o con licencia libre anotada en `CREDITOS.md`.
- Cogida con muñeco articulado (Rapier) si el rendimiento lo permite; si no, se queda el volteo de F3.

### F7 — Entradas desde el pueblo

- `src/juego/entradas.js`: zonas del mundo con un marcador visible y aviso «E / botón: entrar».
  - Plaza y San Roque → menú de fiestas.
  - Frontón (edificio de tipo `fronton` en `buildings.geojson`) → abre `juegos/cesta-punta/` y, al volver, se reaparece en la puerta del frontón.
- Acceso también desde la pantalla de inicio y desde «Ir a…» de la pausa; icono en el minimapa.
- Preparado para añadir más juegos con una línea de configuración por lugar.

### F8 — Rendimiento, móvil y publicación

- Presupuesto por calidad (vallas, público, vacas) y medición en el Pixel 10 (recordar: sin sombras 3D en PowerVR).
- Controles táctiles revisados en apaisado.
- Capturas nuevas para la pantalla de Controles, `CREDITOS.md` al día, `npm run publica`.

---

## 6. Riesgos

- **Animaciones**: es la parte más laboriosa (personaje y vaca). Si se alarga, F2 y F3 pueden salir con un juego reducido de animaciones y ampliarse en F6.
- **Atascos de la vaca** en esquinas y burladeros: por eso F3 lleva una prueba automática.
- **Rendimiento en móvil** con mucho público: cantidades por calidad y público lejano muy simplificado.
- **Precisión del recinto**: depende de la revisión de Rubén en F0.

---

## 7. Registro

`PROGRESO.md` gana un apartado «Fiestas» con la fase actual (F0…F8), lo hecho, lo pendiente y las decisiones. Commits pequeños en español (`feat(fiestas-f1): vallado de tablones con colisión`). Sin push.

---

## 8. Mensaje para empezar en Claude Code

```
Lee CLAUDE.md, PROGRESO.md y PLAN_FIESTAS.md. Resume en pocas líneas qué entiendes del modo
fiestas y qué vas a reutilizar del proyecto. Después ejecuta solo la fase F0 (recinto sobre
plano): crea src/datos/fiestas.js y la vista cenital, lista las dudas y párate para que yo
revise la imagen. No modeles nada todavía.
```

Antes, Rubén copia en `docs/fiestas/` los dos croquis (plaza y calle) y las seis fotos de las vallas.
