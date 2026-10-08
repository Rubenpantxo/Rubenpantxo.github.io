# Créditos y atribuciones — Cabanillas Drive

## Datos geográficos
- LiDAR (MDT y MDS 2024) y Catastro: © Gobierno de Navarra.
- Ortofoto: PNOA cedido por © Instituto Geográfico Nacional.
- Calles, caminos, agua y usos del suelo: © colaboradores de OpenStreetMap (ODbL).

## Modelos de coche (`data/raw/coches/`, aportados por Rubén)
- «Tesla model S Plaid 2023», de slowpoly (Sketchfab), licencia CC-BY-4.0.
- «Mercedes-Benz G-Class Free Download», de slowpoly (Sketchfab), licencia CC-BY-4.0.
- Toyota Land Cruiser, Maxus T60, BYD Song Plus EV, Civilian Vehicle 05, Grey car, Ford Kuga 2017 y
  Mercedes CLS500 2021: descargas gratuitas de 3DExport (sin archivo de licencia incluido).
- Dodge Challenger, «14-car», «43-202009122216-2» y «3vhh1v51xvk0-Car»: descargas gratuitas sin licencia incluida.

Los modelos sin licencia explícita se usan por decisión de Rubén (2026-10-05); conviene revisar las
condiciones de cada web antes de publicar el juego.

## Árboles y vegetación
- Generador de árboles EZ-Tree, de Daniel Greenheck (licencia MIT), con sus texturas de hojas.
- Cortezas: Poly Haven (CC0) y TextureCan (CC0), incluidas en EZ-Tree.
- Palmeras, racimos de hojas y mechones de hierba: dibujados por los scripts del proyecto.

## Elementos urbanos
- Posición de bancos, mesas, fuentes, señales, hitos, paneles, parada, piscinas, campos, gradas, parques
  infantiles y números de portal: © colaboradores de OpenStreetMap (ODbL). Los modelos son genéricos,
  hechos por `src/escena/elementos.js`; el plano de los paneles se dibuja con las calles de OSM y los
  edificios del Catastro.

## Personas (peatones)
- Cuerpos, pieles, ojos, cejas, pestañas, pelo y ropa: recursos de la comunidad MakeHuman (CC0):
  makehuman_system_assets, hair01, shoes01, pants01, shirts01, skirts01, skins01 y skins02, en
  `data/raw/externos/makehuman/`. Generadas con MPFB2 (GPL-3.0, solo en el pipeline; no se distribuye).
- Animaciones de andar y de estar quieto: hechas por `tools/build_personas.py`.

## Render
- Cielo: HDRI «Kloofendal 48d Partly Cloudy (Pure Sky)», de Poly Haven (CC0), en `data/raw/externos/cielo/`.
- Detalle del suelo: Asphalt031, PavingStones136 y Ground109, de ambientCG (CC0), en `data/raw/externos/texturas/`.
- N8AO (oclusión ambiental), de N8python, licencia ISC; postprocessing (pmndrs), licencia Zlib.

## Herramientas del pipeline (no se distribuyen con el juego)
- MPFB2 (MakeHuman Plugin For Blender) 2.0.17, GPL-3.0, de extensions.blender.org.
- Detector de coches YOLO11-OBB de Ultralytics (AGPL-3.0), entrenado con el conjunto DOTA.
