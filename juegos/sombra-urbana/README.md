# Sombra Urbana

Runner de parkour en 2D con siluetas: corres por las azoteas de una ciudad
infinita mientras unos agentes te pisan los talones. Homenaje original al
género de los *parkour runners* de silueta.

**Jugar:** `index.html` (un solo archivo, sin dependencias ni build).

## Cómo se juega

El personaje corre solo. Tú decides *cuándo* y *qué* acrobacia hace:

| Acción | Teclado | Móvil |
|---|---|---|
| Saltar / voltereta / trepar | `W` · `↑` · `Espacio` | Toca la pantalla o el botón ▲ |
| Deslizarse / rodar al caer | `S` · `↓` | Desliza el dedo hacia abajo o botón ▼ |
| Pausa | `Esc` · `P` | Botón ❚❚ |
| Sonido | `M` | Botón 🔊 |

- **Cajas y barreras** → pulsa arriba justo antes para hacer la **voltereta**.
- **Pórticos** (el travesaño amarillo) → pulsa abajo para **deslizarte** por debajo.
- **Muros altos** → pulsa arriba para el **salto de pared**.
- **Huecos entre edificios** → salta; si la caída es larga, pulsa abajo en el
  aire para **rodar** al aterrizar y no perder velocidad.
- Si te quedas corto en un salto y rozas la fachada, el corredor se **agarra a
  la cornisa** automáticamente (pierdes algo de ventaja, pero sobrevives).

Cada acrobacia encadenada suma multiplicador y **aleja al agente**; cada golpe
te frena y lo acerca. Si te alcanza, o caes al vacío, se acabó. La velocidad y
la densidad de obstáculos crecen con la distancia.

## Detalles técnicos

- **Animación esquelética con cinemática inversa**: no hay sprites. Cada
  fotograma resuelve las articulaciones (cadera, rodilla, hombro, codo) a
  partir de la trayectoria objetivo de pies y manos, con una pose distinta por
  estado (carrera, salto, caída, deslizamiento, voltereta, trepada, tropiezo).
- **Ciudad procedural infinita**: azoteas, alturas, huecos, obstáculos y
  núcleos se generan sobre la marcha y se descartan al salir de cámara.
- **Resolución virtual** de 640 unidades de alto escalada al lienzo, para que
  la física sea idéntica en cualquier pantalla; controles táctiles y aviso de
  giro en vertical.
- **Sonido sintetizado** en tiempo real con WebAudio (pasos, saltos, golpes,
  núcleos); sin archivos de audio.
- Récord de distancia y puntuación guardados en `localStorage`.

## Nota de originalidad

Todo el contenido —código, animación, ciudad, interfaz y sonido— es original y
se genera por procedimiento. No incluye assets, código, nombres, marcas ni
datos de ningún otro juego: es un homenaje a un *género* (las mecánicas de
juego no son protegibles), sin afiliación con ningún otro título.
