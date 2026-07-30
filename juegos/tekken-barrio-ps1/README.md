# 🥊 TEKKEN BARRIO PS1 - PWA

Juego de pelea arcade estilo PS1 instalable como **Progressive Web App** en cualquier dispositivo (PC, móvil, tablet).

15 luchadores, modo arcade, versus 2 jugadores, **modo torneo de 8 con eliminatorias**, partículas, pantalla de carga, opciones, guardado persistente y **controles táctiles pensados para jugar con los pulgares**.

Los luchadores y los escenarios se dibujan **por código** en canvas: cuerpos con volumen, ropa, caras y accesorios, y 5 escenarios de barrio con capas animadas (público, neones, ropa tendida, coches, lluvia, vapor...).

---

## 🚀 Cómo arrancar

### Opción 1: Servidor local (recomendado)
```bash
cd tekken-barrio-ps1
python3 -m http.server 8000
```
Abre **http://localhost:8000** en tu navegador.

> El Service Worker y el manifest **necesitan HTTP/HTTPS** para registrarse. No funcionará abriendo `index.html` con doble click.

### Opción 2: Cualquier servidor estático
Sirve la carpeta con Nginx, Apache, Vercel, Netlify, GitHub Pages, etc.

---

## 📲 Instalar como app

Una vez cargado el juego en el navegador:

- **Chrome / Edge desktop**: aparecerá un icono de instalación en la barra de direcciones
- **Android Chrome**: menú → "Añadir a pantalla de inicio"
- **iOS Safari**: compartir → "Añadir a pantalla de inicio"

Tras instalar, el juego se abre **a pantalla completa**, **funciona offline** y aparece como una app más.

---

## 🕹️ Controles

### Player 1 (teclado)
- `← →` mover · `↑` **saltar** · `↓` **agacharse**
- `Espacio` / `Enter` confirmar (menús)
- `Z` puño · `X` patada · `Shift` bloqueo
- `P` pausa · `Esc` volver

### Player 2 (vs 2 jugadores)
- `A D` mover · `W` saltar · `S` agacharse · `Tab` confirmar
- `F` puño · `G` patada · `H` bloqueo

### Móvil / táctil
Los botones aparecen solos y **cambian según la pantalla**:

| Pantalla | Botones |
|---|---|
| Menús | `▲▼◀▶` para navegar + `OK` + `ESC` |
| Combate | `◀ ▶` mover · `▲ SALTO` · `▼ AGACHAR` · `PUÑO` / `PATADA` / `BLOQ` + pausa |

En combate **no aparece el OK** (no hace nada peleando) y las flechas arriba/abajo
sirven para saltar y agacharse.

Detalles pensados para móvil:
- **Multitáctil**: se puede mover y golpear a la vez.
- **Arrastre en el pad**: sin levantar el dedo se pasa de `◀` a `▶`, a saltar o a agacharse.
- Botones grandes y semitransparentes; la arena ocupa **toda** la pantalla y la línea
  de suelo se sube por encima de los controles (nada queda tapado).
- **Vibración** corta al pulsar (se puede desactivar en Opciones).
- Soporta **safe areas** (notch) y **horizontal**: en apaisado los controles se pegan a
  los lados y ocupan mucho menos alto.
- En la selección de luchador, **un toque elige y el segundo confirma**.

---

## 🎮 Modos de juego

| Modo | Descripción |
|------|-------------|
| **ARCADE (VS CPU)** | Pelea contra la CPU, mejor de 3 rondas |
| **VERSUS 2 JUGADORES** | Local 1v1 en el mismo teclado |
| **TORNEO** | Bracket de 8 luchadores, cuartos → semis → final |
| **OPCIONES** | Volumen, dificultad, partículas, reset de datos |
| **CRÉDITOS** | Scroll de créditos arcade |

---

## 🏆 Modo Torneo

- 8 luchadores: tú + 7 CPU mezclados aleatoriamente
- Estructura: **CUARTOS → SEMIS → FINAL**
- Cuando te toque pelear, vas al combate normal
- Cuando son CPU vs CPU, se simula automáticamente según stats
- Si ganas el torneo, **incrementa tu contador de torneos ganados**

---

## ⚙️ Opciones

- **Volumen Música** (0-100%)
- **Volumen SFX** (0-100%)
- **Dificultad CPU**: Easy / Normal / Hard
- **Partículas**: ON / OFF
- **Controles táctiles**: AUTO / ON / OFF
- **Vibración**: ON / OFF
- **Resetear datos**: borra estadísticas y opciones

Todas las opciones se guardan en `localStorage` y persisten.

---

## 💾 Guardado persistente

El juego guarda automáticamente en `localStorage`:
- Total de victorias y derrotas
- Torneos ganados
- Personajes más usados
- Historial de las últimas 30 peleas

Visibles en la **pantalla de menú** como contadores.

---

## 🧩 Estructura del proyecto

```
tekken-barrio-ps1/
├── index.html              # Punto de entrada (con manifest)
├── manifest.webmanifest    # Configuración PWA
├── sw.js                   # Service Worker (cache offline)
├── README.md
├── generate_sprites.py     # Genera placeholders + iconos
├── css/
│   ├── main.css
│   ├── loading.css
│   ├── menu.css
│   ├── select.css
│   ├── battle.css
│   ├── victory.css
│   ├── credits.css
│   ├── options.css
│   ├── tournament.css
│   └── touch.css
├── js/
│   ├── storage.js          # localStorage
│   ├── audio.js            # Audio + volúmenes desde Storage
│   ├── input.js            # Teclado P1/P2
│   ├── touch.js            # Botones táctiles contextuales (menú / combate)
│   ├── fighter-art.js      # Dibujo detallado de luchadores + retratos
│   ├── stages.js           # Escenarios con capas animadas
│   ├── particles.js        # Canvas de partículas
│   ├── characters.js       # Roster de 15
│   ├── scene-manager.js    # Cambio de escenas
│   └── main.js             # Arranque + SW
├── scenes/
│   ├── loading.js          # Pantalla de carga animada
│   ├── menu.js             # Menú principal
│   ├── options.js          # Opciones
│   ├── select.js           # Selección
│   ├── battle.js           # Combate
│   ├── victory.js          # Victoria
│   ├── credits.js          # Créditos
│   └── tournament.js       # Torneo de 8
├── sprites/
│   ├── thumbs/             # 15 PNG (192×192) - placeholders
│   └── full/               # 15 PNG (512×512) - placeholders
├── icons/
│   ├── icon-192.png        # Icono PWA
│   └── icon-512.png        # Icono PWA
└── audio/                  # Coloca aquí MP3 (opcional)
```

---

## 🎵 Añadir música y SFX

Coloca archivos MP3 en `audio/` con estos nombres:

```
menu-music.mp3
battle-music.mp3
victory-music.mp3
sfx-move.mp3
sfx-confirm.mp3
sfx-punch.mp3
sfx-kick.mp3
sfx-hit.mp3
sfx-ko.mp3
sfx-fight.mp3
```

Si un archivo no existe, no sonará pero **no rompe el juego**. Los volúmenes se controlan desde la pantalla de Opciones.

---

## 🎨 Arte procedural

Ya **no se usan los sprites placeholder**: tanto los luchadores del combate como los
retratos de las pantallas de selección, victoria y torneo se dibujan en canvas desde
`js/fighter-art.js` (los retratos se cachean como data URL en `Portraits`).

La apariencia de cada luchador (tono de piel, peinado, ropa, complexión y accesorios)
se deriva de su `id`, su `style` y sus `stats`, así que es estable entre partidas:
guantes de boxeo, cinta de kickboxer, gorra y cadena de oro, bastón y boina, bote de
spray, llave inglesa, mandil de mercado, gafas de sol...

Los escenarios viven en `js/stages.js`:

| Escenario | Ambiente |
|---|---|
| PLAZA DEL BARRIO | Atardecer, público, ropa tendida, coches que pasan, palomas |
| AZOTEA DE MADRUGADA | Noche estrellada, luna, depósitos de agua, neones |
| MERCADO DE LA ESQUINA | Mediodía, puestos con toldo, guirnalda de bombillas |
| CALLEJÓN NEÓN | Noche, lluvia, vapor de alcantarilla, escalera de incendios |
| TALLER DEL MECÁNICO | Interior, lámparas colgantes, herramientas, chispas de soldadura |

Los PNG/SVG de `sprites/` se conservan por compatibilidad, pero el juego ya no los carga.

---

## ⚙️ Mecánicas del combate

- **HP**: 100 puntos · **Rondas**: ganar 2 de 3 · **Tiempo**: 60 s por ronda
- **Movimiento en dos ejes**: andar, **saltar** (con desplazamiento en el aire) y **agacharse**

### Golpes según la altura

| Golpe | Cómo | Daño base | A quién alcanza |
|---|---|---|---|
| Puño | `Z` / PUÑO | 8 | Alto: **falla contra un rival agachado** y contra el que salta |
| Patada | `X` / PATADA | 12 | Media: pilla agachados y sirve de **antiaérea** si el rival está bajo |
| Barrido | agachado + patada | 10 | Bajo: solo a rivales **pisando el suelo** |
| Patada aérea | en el aire + puño/patada | 14 | Castiga desde arriba (un ataque por salto) |

- **Bloqueo**: reduce el daño al 25%; **agachado y bloqueando**, al 18% frente a golpes medios
- Agachado no se camina; en el aire no se cambia de dirección
- **IA**: 3 niveles; en normal/hard **se agacha para esquivar puños, salta los barridos
  y ataca desde el aire**
- Golpes con **retroceso**, temblor de pantalla, chispas, polvo y suciedad progresiva
  en los luchadores según van perdiendo vida

---

## 👥 Roster (15 luchadores)

| # | Nombre | Estilo |
|---|--------|--------|
| 1 | BRAWLER AMARILLO | POWER / PRESSURE |
| 2 | MATRIARCA AZUL | GRAB / COUNTER |
| 3 | SULIMA-X FIGHTER | RUSH / SPEED |
| 4 | DUO RAYAS & CADENA | TAG / RANGE |
| 5 | LA PATAI & HIJA | MIX / FAMILY |
| 6 | CABALLERO NEGRO | DEFENSE / COUNTER |
| 7 | EL CHACAL | KICK / SPEED |
| 8 | DOÑA MERCADO | GRAB / CHAOS |
| 9 | PANAS DEL BARRIO | TAG / OFFENSE |
| 10 | LA GRAFFITERA | PROJECTILE / TRICK |
| 11 | EL MECÁNICO | TECH / SETUP |
| 12 | LOS PRIMOS | MIX / COMBO |
| 13 | EL VIEJO DEL BARRIO | VETERAN / TIMING |
| 14 | LA REINA DEL RING | BOX / PRESSURE |
| 15 | EL RAPERO | RHYTHM / PROJECTILE |

---

## 📜 Licencia

Proyecto demo libre para uso personal y modificación.

© 1996 BARRIO ARCADE INC. ALL RIGHTS BARRIO. 🥊
