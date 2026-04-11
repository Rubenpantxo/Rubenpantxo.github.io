## Handoff Spec: Ajedrez 3D (Chess 3D)

### Overview
Juego de ajedrez completo con perspectiva 3D CSS, motor de IA propio con alpha-beta pruning, 4 modos de juego, sistema de internacionalizacion trilingue (ES/EN/EUS) y fondo animado con p5.js. Single-file HTML application (~1850 lineas) sin dependencias de backend.

**Stack**: Vanilla JS (ES6+), CSS3 (Custom Properties, Grid, 3D Transforms), p5.js (fondo animado)
**Target**: Navegadores modernos con soporte CSS 3D Transforms (Chrome 36+, Firefox 16+, Safari 9+, Edge 12+)

---

### Layout

**Sistema de grid**: CSS Grid con `grid-template-columns` adaptativo.

| Pantalla | Layout |
|----------|--------|
| Menu principal | Centrado vertical, grid 2x2 para las tarjetas |
| Juego (>840px) | Grid `auto 280px` (tablero + sidebar) |
| Juego (<=840px) | Grid `1fr` columna unica, sidebar bajo tablero |
| Aprender | Max-width 800px centrado, contenido scroll |
| Setup partida | Centrado flex, max-width 400px |

---

### Design Tokens

| Token (CSS Variable) | Valor | Uso |
|---|---|---|
| `--gold` | `#c9a84c` | Titulos, bordes activos, iconos, headings |
| `--gold-dim` | `rgba(201,168,76,0.45)` | Bordes hover, separadores |
| `--gold-glow` | `rgba(201,168,76,0.12)` | Box-shadow glow en cards |
| `--bg` | `#0d0a08` | Fondo principal (casi negro calido) |
| `--bg2` | `#1a1410` | Fondo secundario |
| `--bg3` | `#261e16` | Fondo terciario |
| `--cream` | `#e8dcc8` | Texto principal body |
| `--cream-dim` | `rgba(232,220,200,0.55)` | Texto secundario/descripciones |
| `--sq-light` | `#f0d9b5` | Casillas claras del tablero |
| `--sq-dark` | `#b58863` | Casillas oscuras del tablero |
| `--wood-light` | `#d4b896` | Marco del tablero (highlight) |
| `--wood-mid` | `#a07850` | Marco del tablero (medio) |
| `--wood-dark` | `#6d3c24` | Marco del tablero (sombra) |
| `--wood-deep` | `#4a2518` | Marco del tablero (base) |
| `--board-w` | `min(440px, 72vw)` | Ancho del tablero responsive |
| `--frame` | `16px` | Padding del marco del tablero |
| `--serif` | `'Cormorant Garamond', Georgia, serif` | Titulos, labels de UI |
| `--sans` | `'Outfit', system-ui, sans-serif` | Texto body, botones, movimientos |

---

### Components

| Componente | Variantes | Props/Config | Notas |
|---|---|---|---|
| `menu-card` | Default, Hover | icon, title, desc, mode | Grid 2x2, animacion de entrada escalonada (0.1s-0.4s) |
| `sq` (casilla) | light, dark, selected, legal, capture, check, last-from, last-to | data-idx (0-63) | Beveled con inset shadows para efecto 3D |
| `pc` (pieza) | white-piece, black-piece | Unicode chess char | 6-layer text-shadow para extrusion 3D + drop-shadow |
| `board-frame` | - | - | Marco de madera con 6-layer box-shadow extruido |
| `board-platform` | Default, Flat (learn) | rotateX(28deg) | Perspectiva 3D CSS, flat para modo Aprender |
| `btn` | Primary, Secondary | - | Gold gradient / transparent gold |
| `panel` | - | - | Fondo glassmorphism con backdrop-filter blur |
| `lang-flag-btn` | ES, EN, EUS | SVG inline | Muestra solo idiomas no seleccionados |
| `diff-btn` | Default, Selected | data-depth (1-4) | Grid 2x2 en setup dialog |
| `color-opt` | Default, Selected | data-color | Flex row, 2 opciones |
| `learn-tab` | Default, Active | - | Flex wrap tabs |
| `tip-card` | - | h4 title, p desc | Cards de consejos con borde gold sutil |
| `tactic-card` | - | h4 title, p desc | Cards de tacticas |
| `curiosity-card` | - | h4 title, p desc | Cards de curiosidades |

---

### States and Interactions

| Elemento | Estado | Comportamiento |
|---|---|---|
| `menu-card` | Hover | translateY(-5px), border-color gold 0.35, box-shadow 16px 40px + gold glow. Gradient overlay ::before opacity 1 |
| `menu-card` | Default | Animacion `cardIn` 0.6s (fade + translateY 24px) |
| `sq` (casilla) | Pieza seleccionada | `box-shadow: inset 0 0 0 3px var(--gold)` |
| `sq` | Movimiento legal | Punto verde central (::after, 26% size, rgba(60,170,60,0.65)) |
| `sq` | Captura posible | `box-shadow: inset 0 0 0 3px rgba(220,50,50,0.7)` |
| `sq` | Rey en jaque | Radial gradient rojo pulsante |
| `sq` | Ultimo movimiento | Box-shadow dorado sutil (from: 0.35, to: 0.5 opacity) |
| `sq` | Pieza recien colocada | Animacion `placeAnim` 0.3s (scale 1.18 + translateY -6px -> normal) |
| `pc` (pieza) | Hover | `transform: translateY(-3px) scale(1.04)` |
| `btn` | Hover | translateY(-2px), box-shadow 8px 20px |
| `btn` | Active | translateY(0) |
| `back-btn` | Hover | background gold 0.1, border-color gold-dim |
| `g-tab` | Active | color gold, border-bottom 2px gold |
| IA | Pensando | Texto "IA pensando..." / "AI thinking..." en turnInfo |
| Partida | Jaque Mate | Texto "{color} gana!" con indicador de fin |
| Partida | Tablas | "Tablas - Ninguna!" |
| Partida | Jaque | "{color} Jaque!" |

---

### Screens Flow

```
MENU PRINCIPAL
  |
  +---> [Partida Libre] ---> Setup (Color + Dificultad) ---> JUEGO
  |                                                            |
  +---> [Practica] ----------------------------------------> JUEGO (Level 1/10 -> auto level-up)
  |                                                            |
  +---> [Puzzles Famosos] ---------------------------------> JUEGO (Puzzle 1/6, no undo/newgame/resign)
  |                                                            |
  +---> [Aprender] ----------------------------------------> LEARN PAGE
                                                               |
                                                               +-- Consejos (8 tips)
                                                               +-- Movimiento de Piezas (tablero interactivo)
                                                               +-- Tacticas y Aperturas (6 tacticas)
                                                               +-- Curiosidades (4 curiosidades)
```

---

### Engine (Motor de Ajedrez)

| Parametro | Descripcion |
|---|---|
| **Clase** | `Engine` (ES6 class) |
| **Representacion** | Array lineal de 64 posiciones, chars mayus=blancas, minus=negras |
| **Busqueda** | Minimax con alpha-beta pruning |
| **Evaluacion** | Material (P=100, N=320, B=330, R=500, Q=900, K=20000) + Piece-Square Tables |
| **Profundidad** | 1 (Principiante), 2 (Intermedio), 3 (Avanzado), 4 (Experto) |
| **Reglas** | Enroque (4 tipos), en passant, promocion (auto a Dama), jaque/mate/tablas |
| **Undo** | Stack completo de estados para deshacer movimientos |

**Niveles de Practica**: 10 niveles (1-3: depth 1, 4-6: depth 2, 7-9: depth 3, 10: depth 4)

---

### Puzzles

| # | Nombre | Tema |
|---|---|---|
| 1 | Back Rank Mate | Mate con torre en ultima fila |
| 2 | Queen Sacrifice | Sacrificio de dama para mate |
| 3 | Knight Fork | Horquilla de caballo (rey+dama) |
| 4 | Smothered Mate | Mate ahogado con caballo |
| 5 | Pin & Win | Clavada de alfil |
| 6 | Discovered Attack | Ataque descubierto con alfil+torre |

---

### Responsive Behavior

| Breakpoint | Cambios |
|---|---|
| Desktop (>840px) | Grid 2 columnas (tablero + sidebar 280px). Board-w: min(440px, 72vw) |
| Tablet/Mobile (<=840px) | Grid 1 columna, sidebar 100% max-width 440px debajo del tablero |
| Movil estrecho (<=500px) | Menu grid 1 columna, max-width 300px |

**Board sizing**: `min(440px, 72vw)` asegura que el tablero se adapte sin overflow horizontal.
**Perspectiva 3D**: `perspective: 900px`, `perspective-origin: 50% 95%`, `rotateX(28deg)`.

---

### Animation / Motion

| Elemento | Trigger | Animacion | Duracion | Easing |
|---|---|---|---|---|
| Menu cards | Page load | Fade-in + slide-up (opacity 0->1, translateY 24px->0) | 0.6s | ease, staggered 0.1s |
| Card hover | mouseenter | translateY(0 -> -5px) + glow | 0.35s | cubic-bezier(.25,.46,.45,.94) |
| Board platform | Mount | rotateX(28deg) | 0.6s | cubic-bezier(.25,.46,.45,.94) |
| Pieza colocada | After move | scale(1.18)->1, translateY(-6px)->0, opacity 0.6->1 | 0.3s | cubic-bezier(.25,.46,.45,.94) |
| Pieza hover | mouseover | translateY(-3px) scale(1.04) | 0.15s | ease |
| Screen transition | Mode change | opacity 0->1, visibility | 0.45s | ease |
| Boton primary | Hover | translateY(-2px) | 0.2s | default |
| P5 background | Continuous | Particulas animadas (rise/orbit/drift/wave segun modo) | continuous | - |

---

### P5.js Background Modes

| Modo | Color Primario | Color Secundario | Particulas | Estilo |
|---|---|---|---|---|
| Menu | rgb(180,148,60) | rgb(120,90,30) | 40 | Rise (ascendente) |
| Free Play | rgb(201,168,76) | rgb(160,130,50) | 35 | Rise |
| Practice | rgb(80,180,100) | rgb(40,140,60) | 45 | Orbit (circular) |
| Puzzles | rgb(90,130,200) | rgb(50,90,160) | 35 | Drift (aleatorio) |
| Learn | rgb(180,110,180) | rgb(130,70,140) | 30 | Wave (ondulante) |

Opacity global del canvas: 0.55. Particulas conectadas con lineas en modos orbit/drift (distancia < 90px).

---

### Internationalization (i18n)

| Idioma | Codigo | Cobertura |
|---|---|---|
| Espanol | `es` | Completa (default) |
| English | `en` | Completa |
| Euskera | `eus` | Completa |

**Sistema**: Objeto `LANG` con claves por idioma. Funcion `T(key)` para traduccion inline.
**Cambio**: Click en bandera SVG -> `setLang(lang)` -> `applyLang()` re-renderiza textos.
**Banderas**: SVG inline generadas por `createFlagSVG()`. Solo se muestran los idiomas no activos.

Total de claves i18n: ~85 por idioma (titulos, descripciones, piezas, tips, tacticas, curiosidades, UI labels).

---

### Accessibility Notes

- **Focus order**: Menu cards -> Game nav (back, tabs) -> Board (squares by index) -> Sidebar buttons
- **Cursor**: `pointer` sobre piezas del jugador activo, `default` en casillas vacias
- **Keyboard**: No implementado actualmente. Recomendacion: añadir `tabindex` a casillas y navegacion con flechas
- **ARIA pendiente**: `role="grid"` en tablero, `role="gridcell"` en casillas, `aria-label` con coordenada algebraica (ej. "e4, white pawn")
- **Contraste**: Gold (#c9a84c) sobre bg oscuro (#0d0a08) = ratio ~7.5:1 (AAA)
- **Contraste secundario**: cream-dim sobre bg = ratio ~4.8:1 (AA)
- **Motion**: Animaciones sutiles, sin parpadeo. P5 background opacity 0.55 reduce distraccion
- **Screen reader**: Movimientos anunciados en panel de texto (lista de movimientos legible)

---

### Edge Cases

| Caso | Comportamiento |
|---|---|
| Tablero vacio (bug) | Engine maneja array con nulls, renderBoard no dibuja casillas vacias |
| Texto largo (i18n) | Euskera tiene strings mas largos (~30%); layout flex-wrap y word-break |
| Promocion de peon | Auto-promocion a Dama (configurable en Partida Libre via selector) |
| Doble click pieza | Deselecciona la pieza (toggle) |
| Click fuera del tablero | Sin efecto |
| IA sin movimientos | Detecta checkmate/stalemate, muestra resultado |
| Puzzle incorrecto | Muestra hint "Esa es una jugada legal, pero no la correcta" |
| Puzzle correcto | Muestra feedback verde "¡Correcto! ¡Jugada brillante!" |
| Practica nivel maximo | Muestra "Maximo nivel alcanzado!" al completar nivel 10 |
| Resign | Dialogo confirm() nativo del navegador |
| Window resize | Board responsive via CSS vars, camera aspect updated |

---

### File Structure

```
Chess3D.html          # App completa (HTML + CSS + JS, ~1850 lineas)
3D/json/              # Geometrias JSON para Three.js (legacy 3D mode)
  bishop.json, board.json, innerBoard.json, king.json,
  knight.json, pawn.json, queen.json, rook.json
js/                   # JavaScript modules (legacy Three.js 3D mode)
  AI/boardui.js, AI/garbochess.js  # Motor AI alternativo (Web Worker)
  Cell.js, chess.js, factory.js, geoPieces.js, gui.js,
  loading.js, pgnParser.js, three-extend.js
  lib/three.js, OrbitAndPanControls.js
  jquery/jquery-1.9.1.js, jquery-ui-1.10.3.custom.js
css/dark-hive/        # jQuery UI theme (legacy)
texture/              # Texturas para Three.js (legacy)
  wood-0.jpg, wood-1.jpg, wood_N.jpg, wood_S.jpg,
  floor.jpg, floor_N.jpg, floor_S.jpg, fakeShadow.jpg,
  bishop-ao.jpg, king-ao.jpg, knight-ao.jpg, pawn-ao.jpg,
  queen-ao.jpg, rook-ao.jpg, cell-0.jpg, cell-1.jpg
```

**Nota**: La app principal es self-contained en `Chess3D.html`. Los archivos JS/texture/3D son del modo legacy Three.js WebGL (no activo en la version actual CSS-3D).

---

### Performance Notes

- **Engine search depth 4**: ~2-5s en hardware moderno (bloqueante en main thread via setTimeout)
- **P5.js background**: ~60fps continuo, bajo impacto (particulas simples, sin texturas)
- **DOM**: Max 64 casillas + ~32 piezas = ~100 elementos activos en el tablero
- **Memory**: Sin leaks significativos. Puzzles clonan board element para limpiar event listeners
- **Bundle**: Single HTML file, unica dependencia externa: p5.js via CDN + Google Fonts

---

### Known Limitations / Future Work

| Item | Estado | Prioridad |
|---|---|---|
| Navegacion por teclado | No implementado | Alta (a11y) |
| ARIA labels en tablero | No implementado | Alta (a11y) |
| AI en Web Worker (non-blocking) | No implementado para engine actual | Media |
| Sonidos (movimiento, captura, jaque) | No implementado | Media |
| Drag & drop de piezas | No implementado | Baja |
| Modo multijugador local | No implementado | Baja |
| Historial de partidas (localStorage) | No implementado | Baja |
| Touch gestures (mobile zoom/pan) | No implementado | Baja |
