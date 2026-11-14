# The Pantxo Madness Trial

Arcade racer de mundo abierto para navegador, homenaje al género de los city
racers de finales de los 90 / principios de los 2000.

**Jugar:** `index.html` (Three.js + WebGL, sin build; módulos en `js/`).

## Qué incluye

- **Bahía Pantxo**: ciudad procedural de 10×10 manzanas (~1 km²) con downtown
  de rascacielos, parques, plaza con fuente, lago al este, tren elevado con
  pilares en mitad de la calzada y rampas de salto en el parque central.
- **Física de verdad**: cuatro ruedas con agarre, deriva y círculo de fricción,
  transferencia de peso, motor con curva de par y cambio automático, freno de
  mano para derrapar, choques con impulso y daño por energía del impacto.
- **4 coches originales**: Pantxo GT (coupé), Txoko V8 (muscle, derrapón),
  Furgo Erreka (furgoneta, tracción delantera) y Bus Aldiri (autobús).
- **Carrera contra rivales**: 8 checkpoints aleatorios con tiempo límite y 5
  rivales con IA (trazada por las calles, carriles y adelantamientos, frenada
  planificada en cada curva, esquivan los pilares del tren).
- **Tráfico** por su carril (dos por sentido) con semáforos lógicos en los
  cruces y cesión del paso; al recibir un golpe pasan a la física completa.
- **Peatones** articulados que caminan por las aceras y saltan a un lado si un
  coche va hacia ellos (nunca pueden ser atropellados).
- **Policía**: coches patrulla aparcados que te persiguen si pasas muy rápido o
  chocas cerca; si te alcanzan parado, te detienen. Sirena y luces.
- HUD retro con velocímetro, daños, posición, minimapa (rivales y policía) y
  cronómetro; sonido sintetizado con WebAudio; controles táctiles en móvil.

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

## Código

| Archivo | Qué hace |
|---|---|
| `js/main.js` | Ciudad, menús, HUD, sonido, cámara y bucle (física a 120 Hz) |
| `js/physics.js` | Física del coche |
| `js/tuning.js` | Parámetros de cada coche a partir de masa, potencia, punta y agarre |
| `js/vehicle.js` | Modelo + física, saltos en las rampas |
| `js/models.js` | Modelos de coches, tráfico y policía |
| `js/world.js` | Colisiones con la ciudad |
| `js/citynet.js` | Red de calles y rutas |
| `js/ai.js` | Piloto automático de rivales y policía |
| `js/ambient.js` | Tráfico, peatones y policía |
| `js/peds.js` | Peatones articulados y su animación |
| `js/session.js` | Partida: corredores, choques, puntos de control y posiciones |

## Nota de originalidad

Todo el contenido de este juego es **original**: el código, el mapa (generado
proceduralmente con semilla fija), los modelos de coches, peatones, edificios y
tren, el arte de la interfaz y el sonido (sintetizado en tiempo real). No
contiene assets, código, nombres ni datos de ningún otro juego; es un homenaje a
un *género* (las mecánicas de juego no son protegibles), sin afiliación con
ningún otro título. Dependencias: [three.js](https://threejs.org)
(`three.r128.min.js`, licencia MIT) y las fuentes Russo One y Permanent Marker
de Google Fonts (licencias SIL Open Font y Apache 2.0) para el logotipo.
