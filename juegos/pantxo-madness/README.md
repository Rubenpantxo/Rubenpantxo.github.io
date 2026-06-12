# The Pantxo Madness Trial

Arcade racer de mundo abierto para navegador, homenaje al género de los city
racers de finales de los 90 / principios de los 2000.

**Jugar:** `index.html` (Three.js + WebGL, sin build, un solo archivo).

## Qué incluye

- **Bahía Pantxo**: ciudad procedural de 10×10 manzanas (~1 km²) con downtown
  de rascacielos, parques, plaza con fuente, lago al este, tren elevado con
  pilares en mitad de la calzada y rampas de salto en el parque central.
- **4 coches originales** por arquetipo: Pantxo GT (coupé), Txoko V8 (muscle),
  Furgo Erreka (furgoneta) y Bus Aldiri (autobús), cada uno con físicas propias.
- **Tráfico con IA** que circula por su carril y frena ante obstáculos, y
  **peatones** que esquivan al jugador (nunca pueden ser atropellados).
- **Dos modos**: Paseo libre y Carrera Checkpoint (8 puertas aleatorias con
  bonus de tiempo por puerta; récord guardado en `localStorage`).
- HUD retro con velocímetro, daños, minimapa y cronómetro; sonido de motor,
  derrape y choques sintetizado con WebAudio; controles táctiles en móvil.

## Controles

| Acción | Tecla |
|---|---|
| Acelerar / frenar | `W`/`↑` · `S`/`↓` |
| Dirección | `A`/`D` · `←`/`→` |
| Freno de mano (derrape) | `Espacio` |
| Cámara (cerca / lejos / capó) | `C` |
| Reparar y recolocar | `R` |
| Sonido on/off | `M` |
| Pausa | `Esc` |

## Nota de originalidad

Todo el contenido de este juego es **original**: el código, el mapa (generado
proceduralmente con semilla fija), los modelos de coches, edificios y tren, el
arte de la interfaz y el sonido (sintetizado en tiempo real). No contiene
assets, código, nombres ni datos de ningún otro juego; es un homenaje a un
*género* (las mecánicas de juego no son protegibles), sin afiliación con
ningún otro título. La única dependencia es [three.js](https://threejs.org)
(`three.r128.min.js`), redistribuida bajo licencia MIT.
