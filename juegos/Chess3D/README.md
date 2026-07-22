Ajedrez 3D — edición definitiva
===============================

Juego de ajedrez en 3D para navegador (HTML5/WebGL), con la estética clásica de
tablero y piezas de madera del [Chess3D original de Yann Granjon (FrenchYann)][chess3d]
y una capa de juego completamente renovada.

![Chess3D](http://yanngranjon.com/static/games/chess3D/screenshot.jpg)

Cómo jugar
----------

1. Haz doble clic en **`Jugar.bat`** (necesita Node.js o Python instalado).
2. Se abrirá el juego en tu navegador en `http://localhost:8123`.

> El juego necesita servirse por HTTP (un doble clic en `index.html` no carga
> las texturas por las restricciones de seguridad del navegador).

Modos de juego
--------------

- **Contra la IA** — 10 niveles, de *Peón (~400)* a *Gran Maestro (~2300)*,
  con barra de ventaja en vivo, pistas del motor y deshacer.
- **Dos jugadores** — partida local en el mismo tablero.
- **Ráfaga de mates** — 3 minutos y 3 vidas para encadenar tantos mates en 1
  como puedas. 64 puzzles validados por el motor y récord guardado en tu navegador.
- **Cargar partida** — importa cualquier PGN y sigue jugando contra la IA.

Características
---------------

- Relojes de torneo: bala 1', relámpago 3'+2" y 5', rápida 10' o sin reloj.
- Animaciones de piezas (con salto del caballo), captura al paso, enroque y
  coronación con selector visual de pieza.
- Resaltado de jugadas legales, última jugada, jaque y pista.
- Detección completa de fin de partida: mate, ahogado, 50 movimientos,
  triple repetición, material insuficiente y caída de bandera.
- Sonidos generados por síntesis (sin ficheros de audio), silenciables.
- Estadísticas locales: partidas, victorias, mejor nivel vencido y récord de ráfaga.
- Guardado/carga en formato [PGN][pgn] y tarjeta de resultado para compartir.
- Interfaz en español, sin dependencias de jQuery.

Tecnología
----------

- Motor de ajedrez: [Garbochess-JS][garbochess] de Gary Linscott (en un web worker).
- Render 3D: three.js r58 con los modelos y texturas originales de FrenchYann
  (Blender → JSON), reflejos falsos y oclusión ambiental precalculada.
- JavaScript puro (ES5), sin proceso de build: abre y juega.

Créditos y licencia
-------------------

- Juego original Chess3D: [Yann Granjon (FrenchYann)][chess3d] — ¡gracias por
  ese tablero tan bonito!
- IA: [Garbochess-JS][garbochess] de Gary Linscott.
- Licencia: GNU GPLv3 (ver `LICENSE.md`).

  [chess3d]: https://github.com/FrenchYann/Chess3D
  [garbochess]: https://github.com/glinscott/Garbochess-JS
  [pgn]: https://es.wikipedia.org/wiki/Notaci%C3%B3n_portable_de_juego
