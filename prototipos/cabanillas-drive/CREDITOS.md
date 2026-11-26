# Créditos y atribuciones — Cabanillas Drive

## Datos geográficos
- LiDAR (MDT y MDS 2024) y Catastro: © Gobierno de Navarra.
- Ortofoto: PNOA cedido por © Instituto Geográfico Nacional.
- Horizonte de 8 × 8 km (`tools/40_horizonte.py`): relieve MDT05 y ortofoto PNOA cedidos por © Instituto Geográfico Nacional.
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

## Modo fiestas
- Vacas, vallas, tablado, gradas, ambulancia y banderines: hechos con primitivas por `src/fiestas/`.
- Posturas del público y de los mozos (aplaudir, olé, manos a la cabeza, apoyarse, sentarse, correr):
  giros de huesos encima de las animaciones de andar y de quieto (`src/fiestas/pose.js`).
- Sonido (murmullo, olé, aplausos, «¡uy!», cencerros, pezuñas, pisadas, golpe en la valla y cohete):
  sintetizado en el navegador por `src/fiestas/sonido.js` (Web Audio). No hay grabaciones de terceros.

## Modo agricultura
- Parcelas (contornos, superficie y referencia catastral): Catastro de Navarra, © Gobierno de Navarra
  (WFS público). Uso del suelo, tipo de cultivo y regadío: SIGPAC y mapa de regadíos, © Gobierno de Navarra.
  Relieve de las acequias y del riego a manta: MDT LiDAR 2024, © Gobierno de Navarra.
- Precios de venta (trigo, cebada): Lonja del Ebro, noviembre de 2026. Los de cebolla, brócoli, alcachofa
  y espárrago llevan su fuente en `src/config/economia.js` (`ECONOMIA.fuente`). Los precios de compra
  (semilla, abono, plantel), los rendimientos y las dosis son orientativos, sin fuente oficial.
- Tractor, aperos (arado, cultivador, abonadora, sembradora, plantadora, arrancadora, remolque) y
  cosechadora: modelos hechos con primitivas por el código del proyecto (`src/agricultura/`). Iconos del
  menú: SVG propios dibujados a mano (`src/hud/iconos.js`). Sonido del motor: sintetizado (Web Audio).
  No hay modelos ni grabaciones de terceros.

## Salto en paracaídas
- Avión de carga y mochila-paracaídas (`modelos/salto/`): modelos propios de Rubén, sin texturas.
  `tools/build_activos_salto.py` (script CAD paramétrico de Rubén para Blender) genera una versión
  más sencilla de los dos.
- Figuras provisionales (si no cargan los modelos): hechas por `src/salto/figuras.js`.

## Render
- Cielo: HDRI «Kloofendal 48d Partly Cloudy (Pure Sky)», de Poly Haven (CC0), en `data/raw/externos/cielo/`.
- Detalle del suelo: Asphalt031, PavingStones136 y Ground109, de ambientCG (CC0), en `data/raw/externos/texturas/`.
- N8AO (oclusión ambiental), de N8python, licencia ISC; postprocessing (pmndrs), licencia Zlib.

## Fachadas de referencia
- Fotos de Mapillary, CC-BY-SA 4.0: secuencia de avaldeon del 25-02-2023 por la carretera Tudela–Tauste /
  calle Ramón y Cajal (71 casas; el id de la imagen de cada una va en `fuente`).
  Se usan como referencia para elegir estilo, colores, zócalo, balcones y rejas (src/datos/fachadasReales.js);
  la foto no se copia al juego.

## Herramientas del pipeline (no se distribuyen con el juego)
- MPFB2 (MakeHuman Plugin For Blender) 2.0.17, GPL-3.0, de extensions.blender.org.
- Detector de coches YOLO11-OBB de Ultralytics (AGPL-3.0), entrenado con el conjunto DOTA.
