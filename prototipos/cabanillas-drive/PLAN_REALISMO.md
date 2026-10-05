# PLAN_REALISMO.md — Acercar el mapa a la Cabanillas real

Pedido por Rubén el 2026-10-05 (las 4 líneas). Va **antes de la fase 4 (HUD)** del PLAN.md.
Orden: **R1 → R2 → R3 → R4** (R4 cuando Rubén tenga las capturas). Parada al terminar cada bloque.

Principio: todo sale de **datos reales** (LiDAR, ortofoto, Catastro, OSM) o de capturas de Rubén;
nada de modelos genéricos que parezcan de juguete. Licencias: CC0/MIT o propias.

Descartado tras investigar: Google Photorealistic 3D Tiles (bloqueado para cuentas de la UE desde
el 8-7-2025) y fotos de Street View como textura (lo prohíben sus condiciones).

---

## R1 — Árboles y vegetación

**R1.1 `tools/08_arboles.py`** — árboles individuales desde el LiDAR (prueba hecha: 2 992 copas).
- Vegetación alta = nDSM > 2,5 m, fuera de edificios (+1 m) y verde en la ortofoto (índice 2G−R−B).
- Copas = máximos locales del nDSM suavizado (ventana 3,5 m). Por árbol: x, z, altura real, radio de copa
  (segmentación por cuencas sobre la mancha de vegetación), color medio de la copa.
- Tipo estimado: conífera (verde oscuro, copa estrecha/alta), palmera (copa pequeña y compacta en
  plazas y jardines), frondosa (resto). Ajustable a mano en `tools/arboles_tipos.json` si alguno falla.
- Salidas: `public/assets/arboles.json`, `previews/arboles.jpg` (círculos sobre la ortofoto).

**R1.2 Modelos** — `tools/genera_arboles.mjs` con **EZ-Tree** (`@dgreenheck/ez-tree`, MIT; cortezas CC0).
- 2–3 variantes por tipo: plátano de sombra, morera, olmo, chopo, pino, ciprés. Palmera aparte (tronco +
  hojas con textura de recorte CC0 de ambientCG/Poly Haven).
- Exporta GLB a `public/assets/arboles/`, ≤ 3 000 triángulos cerca + **impostor** (tarjeta con la imagen
  del árbol renderizada) para lejos.

**R1.3 Juego** — `src/escena/arboles.js`: InstancedMesh por variante, escalado a la altura y copa reales,
tinte de hojas con el color de la ortofoto, leve balanceo por viento en el sombreador. Colisión: cilindro
del tronco solo en los árboles a menos de 15 m de una calle. LOD por distancia (como los coches).

**R1.4 Parques y cultivos** — usos de OSM (park, grass, farmland, orchard…) + color de la ortofoto:
mechones de césped / cereal / rastrojo instanciados solo a menos de ~60 m de la cámara, con viento.

Aceptación: las copas 3D caen sobre las de la ortofoto (vista previa); ≥ 60 FPS en escritorio.

## R2 — Tejados reales desde el LiDAR

**`tools/09_tejados.py`**
- Por edificio, MDS a 0,5 m dentro de la huella → superficie del tejado. Mediana 3×3, recorte de
  chimeneas y antenas (> 1,5 m sobre el plano local), relleno de huecos.
- Simplificación por planos (1–4 faldones ajustados con RANSAC; si el error > 0,3 m, malla de rejilla
  simplificada). Aleros: 0,3 m de vuelo en los lados no medianeros.
- Muros: la altura de cada lado sigue el borde real del tejado (no un techo plano único).
- UV de los tejados al atlas existente (`tejados.jpg`).
- Salidas: `public/assets/tejados.glb` (o buffers binarios) y `previews/tejados_error.png`
  (diferencia malla − MDS).
- `src/escena/edificios.js`: muros con altura por vértice y tejado de la malla nueva. La física no cambia.

Aceptación: error medio malla − MDS < 0,3 m; vista aérea reconocible frente a la ortofoto.

## R3 — Mejoras de render

- **Sol y sombras**: dirección del sol estimada a partir de las sombras de la ortofoto (para que las sombras
  3D coincidan con las pintadas). Mapa de sombras que sigue al coche (≈150 m) o CSM
  (`three/examples/jsm/csm`).
- **Oclusión ambiental**: N8AO (MIT) o GTAOPass con EffectComposer; tone mapping AgX.
- **Cielo**: HDRI CC0 de Poly Haven como fondo y reflejos; niebla a juego.
- **Suelo de cerca**: máscara calzada/acera/tierra (calles OSM con su ancho, huellas, usos) horneada en una
  textura; el sombreador del terreno mezcla la ortofoto (color de fondo) con texturas PBR CC0 de
  **ambientCG** (asfalto, baldosa de acera, tierra) cuando la cámara está cerca. Quita lo borroso a ras de suelo.
- **Calidad** en `src/config/calidad.js`: alto / medio / bajo (móvil sin AO y sombras más cortas).

Aceptación: capturas antes/después a pie de calle; ≥ 60 FPS escritorio en «alto», ≥ 30 en móvil en «bajo».

## R4 — Edificios emblemáticos en splat (necesita a Rubén)

**Rubén** (cuando pueda), con **Scaniverse** (gratis, Android/iOS), 3–5 edificios: iglesia, ayuntamiento,
plaza, frontón…
- Día nublado o a primera/última hora (sin sombras duras), sin gente ni coches delante si se puede.
- Andar despacio alrededor: 2–3 vueltas a distintas alturas (brazo bajo, normal, alto), incluyendo el suelo
  y las esquinas.
- Exportar en **.ply (splat)** o **.spz** y dejarlo en `data/raw/splats/<nombre>/`.

**Claude**: recorte, escala y georreferencia (3 puntos de control contra huella y LiDAR, o ajuste ICP
contra el MDS), compresión a .spz/.sog, carga con **Spark** (`@sparkjsdev/spark`, MIT) solo a < 150 m;
el edificio procedural se oculta allí.

Aceptación: el splat encaja con la huella del Catastro (< 0,5 m) y no baja de 30 FPS en móvil a su lado.

---

## Presupuesto
| Bloque | Peso en `public/assets` | Triángulos dibujados (cerca) |
|---|---|---|
| R1 árboles + vegetación | ≈ 6 MB | ≈ 0,5 M |
| R2 tejados | ≈ 3 MB | ≈ 0,1 M |
| R3 texturas PBR + HDRI | ≈ 6 MB | — |
| R4 splats (5 edificios) | ≈ 30–60 MB | — (splats) |

Si R4 pasa del presupuesto, los splats se cargan bajo demanda y no van en `dist/` hasta decidirlo.
