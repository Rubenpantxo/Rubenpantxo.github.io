# PLAN_PERSONAJE — Editor de personaje

Editor tipo Sims/GTA al empezar la sesión (luego: gimnasio, peluquería y tienda de ropa del pueblo).
Matemática de MakeHuman en el navegador: malla hm08 + targets macro (SVD rango 64 + correcciones
dispersas, error ≤ 0,8 mm) + 200 deslizadores de detalle + expresiones; ropa, pelo, cejas, pestañas
y ojos ajustados con su .mhclo; esqueleto game_engine desde los cubos joint-*; animaciones de h_joven.

Pipeline: `python tools/40_editor_personaje.py` → `npm run personaje` (texturas WebP). Probar: `?personaje`.

## Hecho (P1, 2026-11-19)
- Datos (`tools/40_editor_personaje.py`, `tools/personaje_catalogo.json`), motor, modelo, materiales
  (piel con SSS aproximada, recoloreado de pelo/ropa), estudio, escultura directa, interfaz completa,
  herencia, azar, deshacer/rehacer, guardado local. Integrado en el inicio (botón «Crea tu personaje»
  y antes de cualquier «Jugar»).

- Ojos: la córnea usa una zona transparente de la textura → alphaTest 0,5 (antes salían negros).
- El personaje es el jugador de las fiestas y el del salto (`api.ponJugador`, `src/personaje/jugador.js`).
  Con el editor pendiente, el salto espera a que el jugador esté montado. Sin editor (`?personaje=0`
  o `?aparece`) se usa el último guardado.
- Probado: escritorio y móvil (375 × 812, hoja inferior), calidad baja, escultura (el punto sigue al
  ratón: 15 px pedidos → 13,9 px), fiestas andando con el personaje.

## Ropa sobre el cuerpo (2026-11-19, `src/personaje/modelo.js`)
La piel y la tela no se deforman igual en las articulaciones: pegadas, la piel asomaba al andar o
saltar. Ahora:
- **Piel tapada no se dibuja:** además de los `delete_verts` de cada prenda (muchas no los traen),
  se ocultan los triángulos del cuerpo con sus tres vértices bajo tela ceñida de la parte de arriba,
  la de abajo o el conjunto (vértices del cuerpo a los que se enganchan los de la prenda a menos de
  2,5 cm). No cuentan los 4 anillos de la prenda junto a sus bordes (cuello, mangas, bajos): por
  esas aberturas se vería a través. Con el polo y el cargo se ocultan ~5 000 de 26 756 triángulos.
- **Capas hacia fuera** por su normal: pantalón 3 mm, conjunto 4, parte de arriba 6, calzado 2. La
  ropa se dibuja a dos caras (por dentro del cuello y las mangas).
- **Pantalón por dentro de la parte de arriba:** por cada uno de 48 sectores alrededor del eje de
  la pelvis se mide el bajo de la camiseta (suavizado con los vecinos: la malla es dispersa y el
  sector de detrás salía 13 cm alto). Lo del pantalón por encima va 8 mm hacia dentro y nunca más
  lejos del eje que la camiseta a esa altura; los triángulos enteros bajo ella que llegan a más de
  3 cm por encima del bajo no se dibujan (la cinturilla sigue a la pelvis y la camiseta a la
  columna: al andar, una costura trasera la atravesaba). Los pantalones de MakeHuman se enganchan a
  `helper-tights`, no a la piel, por eso se compara por posición y no por vértices.
- Probado andando con el polo y el cargo y con cuatro conjuntos al azar, de frente, de lado y de
  espaldas: sin piel ni pantalón asomando.

## Canas (2026-11-19, `src/personaje/materiales.js`)
Por mechones siguiendo la luminancia de la textura del pelo (los más claros encanecen antes), sin
cambios de un píxel al de al lado. Antes, `fract(lum · 37)` salía moteado.

## En el salto
El personaje del editor salta con posturas por dirección, la mochila redibujada y un arnés medido
sobre su cuerpo y su ropa: ver `PROGRESO.md`, «Salto en paracaídas», 2026-11-19 (noche).

## Pendiente
- Medir en un móvil real (memoria y tiempo de montaje del personaje).
- Altura: el editor limita la macro a 0,15–0,72 (≈1,45–2,05 m); MakeHuman llega a 2,45 m.
- Más adelante: gimnasio (complexión), peluquería (pelo) y tienda de ropa del pueblo reutilizando el editor
  con solo su pestaña.
