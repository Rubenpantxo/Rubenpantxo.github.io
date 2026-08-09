# Brief — Portada cinematica: Sistemas de diseno

## 1. Que es

- **Sujeto**: los sistemas de diseno de rubenpantxo.com.
- **Mensaje principal**: elegir entre mis diferentes sistemas de diseno.
- **Audiencia**: clientes potenciales que estan decidiendo el aspecto de su web
  o app, y no saben nombrar lo que quieren hasta que lo ven.
- **Tono**: tecnico pero calido. Un muestrario, no un catalogo de plantillas.
- **Idioma**: espanol.

## 2. Direccion visual

- **Concepto**: estudio oscuro. La camara entra en un almacen de piezas de
  interfaz iluminado por un tubo halogeno desde arriba a la derecha.
- **Paleta base**: la de **Halogen Kit**, tal cual esta en
  `apps/escenas/halogen.css`: canvas `#0a0d0a`, surface `#12160f`,
  raised `#1a1f18`, hairline `#2a312a`, acento halogeno `#a3e635`,
  ink `#f2f5f0`, ink-dim `#8f9a8c`, unchecked `#3a423a`.
- **Tipografia**: Inter Tight (display en peso 900, interletraje cerrado) y
  JetBrains Mono para datos y etiquetas tecnicas.
- **Luz**: una sola fuente calida arriba a la derecha; sombras largas a la izquierda.
- **Camara**: altura de pecho, horizonte al 62 %, focal media. Sin picados.
- **Que NO queremos**: degradados genericos de startup, neon por todas partes,
  objetos flotando sin motivo, glassmorphism gratuito.

Las capas no son un paisaje: son **piezas de interfaz a distintas
profundidades** — paneles, rejillas de muestras, barras de especimen
tipografico y componentes. Ninguna lleva texto quemado.

## 3. Beats narrativos

| Beat | Contenido | Checkpoint |
|---|---|---|
| Hero | "Seis maneras de que tu web se sienta tuya" | p = 0.00 |
| Apertura | Los paneles de primer plano se abren, la camara entra | p = 0.18 |
| Narrativa A | **Lo que se decide antes de dibujar nada** — paletas, patrones, tipografias y fuentes | p = 0.27 |
| Panorama | El almacen limpio, sin copy | p = 0.44 |
| Narrativa B | **Y lo que el dedo toca** — iconos, botones, checkboxes | p = 0.58 |
| Refoco | Vuelve el foco | p = 0.74 |
| Catalogo | Los 6 sistemas en tarjetas | p = 0.90 → 1.00 |

## 4. Interaccion final

Seis tarjetas, cada una con la paleta real del sistema y enlace a su ficha:

| Sistema | Origen | Acentos reales | Ficha |
|---|---|---|---|
| Halogen Kit | app Escenas · `apps/escenas/halogen.css` | `#a3e635` `#0a0d0a` `#f2f5f0` | `sistemas/halogen.html` |
| Rincon | Taberna El Rincon | `#b34a1f` `#fdf6ec` `#2e9e5b` | `sistemas/rincon.html` |
| Alba | ALBA moda | `#111114` `#e7335a` `#fafafa` | `sistemas/alba.html` |
| Manolo | Carniceria Manolo | `#a4262c` `#25d366` `#fbf7f1` | `sistemas/manolo.html` |
| Impulso | IMPULSO gimnasio | `#c8f04c` `#38e1d4` `#ff5e82` | `sistemas/impulso.html` |
| La Plaza | Super La Plaza | `#1f9d55` `#e67e22` `#10151c` | `sistemas/la-plaza.html` |

**Ninguno esta inventado.** Los cinco de abajo salen del bloque `:root` real de
cada demo de `servicios/`. Halogen Kit ya existia en `apps/escenas/halogen.css`
(548 lineas, componentes con prefijo `hk-`) y su ficha carga ese mismo CSS en
lugar de imitarlo, asi que lo que se ve ahi son las piezas de verdad. Esta
portada esta construida con Halogen Kit.

## 5. Tecnica

- **Pagina destino**: `servicios/sistemas-de-diseno.html` (nueva, autocontenida).
- **Entrada**: enlace desde el hero de `#servicios` en `index.html`.
- **Stack**: HTML/CSS/JS vanilla, sin build step. Nada de GSAP, Lenis ni Three.js.
- **Assets**: `img/cine-sistemas/` — 7 capas SVG.
- **Dispositivos**: 1440x900, 1280x720, 1024x768, 768x1024, 390x844.
- **Peso**: capas SVG vectoriales, unos pocos KB cada una.

## 6. Estado de los assets

Las 7 capas son SVG tematicos hechos para esta escena (no los placeholders
genericos de la skill). Son vectoriales y definitivos para este uso: no hay
fotografia que producir. Si algun dia se sustituyen por render 3D o fotografia
de estudio, los roles y anclajes ya estan documentados en `assets.json`.

| Rol | Archivo | Estado |
|---|---|---|
| 00 fondo | `img/cine-sistemas/00-fondo.svg` | definitivo |
| 10 lejania | `img/cine-sistemas/10-lejania.svg` | definitivo |
| 20 medio | `img/cine-sistemas/20-medio.svg` | definitivo |
| 30 heroe | `img/cine-sistemas/30-heroe.svg` | definitivo |
| 40 plano izq | `img/cine-sistemas/40-plano-izq.svg` | definitivo |
| 41 plano der | `img/cine-sistemas/41-plano-der.svg` | definitivo |
| 50 marco | `img/cine-sistemas/50-marco.svg` | definitivo |
