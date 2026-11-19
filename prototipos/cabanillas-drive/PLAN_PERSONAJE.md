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

## Pendiente
- Medir en un móvil real (memoria y tiempo de montaje del personaje).
- Altura: el editor limita la macro a 0,15–0,72 (≈1,45–2,05 m); MakeHuman llega a 2,45 m.
- Más adelante: gimnasio (complexión), peluquería (pelo) y tienda de ropa del pueblo reutilizando el editor
  con solo su pestaña.
