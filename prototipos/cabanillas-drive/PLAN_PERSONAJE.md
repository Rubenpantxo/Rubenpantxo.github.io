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

## Pendiente
- Ojos salen negros (la malla de ojos high-poly se dibuja negra; revisar normales/UV o usar low-poly).
- Usar la apariencia en el jugador de fiestas y en el salto (`window.__aparienciaJugador` / localStorage).
- Probar móvil y calidad baja; medir tiempos.
