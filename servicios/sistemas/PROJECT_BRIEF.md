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
- **Paleta base**: la de **Halogeno**, tal cual esta en
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
| Hero | "N maneras de que tu web se sienta tuya" (N lo escribe el generador) | p = 0.00 |
| Apertura | Los paneles de primer plano se abren, la camara entra | p = 0.18 |
| Narrativa A | **Lo que se decide antes de dibujar nada** — paletas, patrones, tipografias y fuentes | p = 0.27 |
| Panorama | El almacen limpio, sin copy | p = 0.44 |
| Narrativa B | **Y lo que el dedo toca** — iconos, botones, checkboxes | p = 0.58 |
| Refoco | Vuelve el foco | p = 0.74 |
| Catalogo | Todos los sistemas en tarjetas | p = 0.90 → 1.00 |

## 4. Interaccion final

Una tarjeta por sistema, cada una con la paleta real y enlace a su ficha. El
catalogo **no se escribe a mano**: sale de `sistemas-datos.mjs`.

| Sistema | Rasgo | Acentos reales | Ficha |
|---|---|---|---|
| Halogeno | oscuro, un acento, radio mutante | `#a3e635` `#0a0d0a` `#f2f5f0` | `sistemas/halogeno.html` |
| Terracota | claro, dos acentos, radio 16 | `#b34a1f` `#fdf6ec` `#2e9e5b` | `sistemas/terracota.html` |
| Editorial | claro, un acento, esquina recta | `#111114` `#e7335a` `#fafafa` | `sistemas/editorial.html` |
| Carmin | claro, dos acentos, cuerpo grande | `#a4262c` `#25d366` `#fbf7f1` | `sistemas/carmin.html` |
| Neon | oscuro, tres acentos, radio 18 | `#c8f04c` `#38e1d4` `#ff5e82` | `sistemas/neon.html` |
| Savia | doble tema, dos acentos, radio 16 | `#1f9d55` `#e67e22` `#10151c` | `sistemas/savia.html` |
| Organico | claro, dos acentos, radio 16 | `#c67139` `#7a8a5e` `#f5ead8` | `sistemas/organico.html` |
| Clasico | claro, un acento, radio 4 | `#b68235` `#f3f2f2` `#201f1d` | `sistemas/clasico.html` |
| Industrial | claro, un acento, rejilla marcada | `#5980a6` `#728fab` `#f2f2f3` | `sistemas/industrial.html` |

**Ninguno esta inventado.** Los seis primeros salen del bloque `:root` real de
las demos de `servicios/` y de `apps/escenas/halogen.css`; los tres ultimos, del
`theme.json` de su proyecto de Claude Design. Esta portada esta construida con
Halogeno, y su ficha carga el CSS de verdad en lugar de imitarlo.

**Ningun nombre alude a un negocio.** Los sistemas son intercambiables: uno
cualquiera puede vestir un proyecto cualquiera, y por eso las fichas no llevan
seccion de "cuando usarlo" ni etiqueta de sector.

## 4 ter. Tres ejes, no nueve paquetes

Un sistema ya no es un bloque cerrado. Son tres ejes que se combinan libremente:

| Eje | Cuantos | Se nombran por |
|---|---|---|
| Paletas | 9 | sus colores (Carbon y lima, Barro y crema...) |
| Tipografias | 9 | sus fuentes (Serif en titulares, Caja alta...) |
| Elementos | 8 | su forma (Pastilla mutante, Recto, Filete...) |

Son 648 combinaciones. Los nueve sistemas con nombre son solo `presets`: la
combinacion de partida de cada uno.

Se aplica con tres atributos, no con JavaScript:

    <html data-paleta="..." data-tipo="..." data-elem="...">

Cada pagina lleva su combinacion escrita en el HTML, asi que se ve bien aunque
el script no llegue a correr. `js/selector-sistema.js` solo cambia los
atributos. En el configurador los atributos van en el lienzo de muestra y no en
`<html>`, para que la herramienta con la que eliges no se mueva.

`data-tema-memoria="no"` apaga la memoria compartida: lo llevan las nueve
fichas, porque la ficha DE un sistema no debe abrirse con la paleta de otro.

### Paginas

- `configurador.html` — los tres catalogos con muestra en vivo
- `elementos.html` — 196 elementos de UIverse (MIT), montados en shadow root
- `paletas.html` — el muestrario de color
- las nueve fichas, y las cinco demos de `servicios/`

### Contraste

Nada se elige a ojo. `generar-tema.mjs` audita los 7 pares de texto de cada
paleta y falla si alguno no llega a 4,5:1. Ojo con dos trampas que ya costaron
caras:

- `--sd-accent` NO vale como relleno de una accion: sobre banda clara se queda
  en 3:1. Para eso esta `--sd-accent-solid`, que es el auditado.
- `--sd-accent` NO vale como texto por la misma razon. Para eso esta
  `--sd-accent-text`.

Y una trampa de medicion: auditar el contraste cambiando `data-paleta` a mano y
midiendo acto seguido da falsos positivos a puñados, porque el recalculo aun no
ha ocurrido. Hay que cargar la pagina con `?paleta=...` y dejarla asentarse.

## 4 bis. Como se mantiene sincronizado con Claude Design

`servicios/sistemas/sistemas-datos.mjs` es la fuente unica. Cada sistema lleva
el `proyectoCD` de su proyecto en Claude Design, que es el hilo entre los dos
lados.

| Sentido | Que hacer |
|---|---|
| Editas en Claude Design | Volcar los tokens nuevos a `sistemas-datos.mjs` y regenerar |
| Editas en el repo | Regenerar el bundle y volver a subirlo |

    node servicios/sistemas/generar-sistemas.mjs   # portada + home + redirecciones
    node servicios/sistemas/generar-paletas.mjs    # muestrario + paleta de cada ficha
    node servicios/sistemas/generar-bundle-cd.mjs  # bundles para Claude Design

El ultimo deja los bundles en `.bundles-cd/` (ignorado por git, es salida
regenerable). Subirlos requiere las herramientas de Claude Design; el bundle de
Organico, Clasico e Industrial se genera pero **no se sube**: esos proyectos
tienen el bundle nativo de Claude Design, mas completo, y machacarlo seria
perderlo.

Los tres ultimos generadores avisan por consola de cualquier par de texto que
no llegue a 4,5:1. Si avisa, se corrige antes de publicar.

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
