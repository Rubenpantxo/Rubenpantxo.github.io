# 🥊 TEKKEN BARRIO PS1 - PWA

Juego de pelea arcade estilo PS1 instalable como **Progressive Web App** en cualquier dispositivo (PC, móvil, tablet).

15 luchadores, modo arcade, versus 2 jugadores, **modo torneo de 8 con eliminatorias**, partículas, pantalla de carga, opciones, guardado persistente y soporte táctil.

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
- `← → ↑ ↓` mover / navegar
- `Espacio` / `Enter` confirmar
- `Z` puño · `X` patada · `Shift` bloqueo
- `P` pausa · `Esc` volver

### Player 2 (vs 2 jugadores)
- `W A S D` mover · `Tab` confirmar
- `F` puño · `G` patada · `H` bloqueo

### Móvil / táctil
Los botones aparecen automáticamente en pantalla:
- **DPAD** izquierda
- **PUN / KCK / BLK / OK** derecha
- **II** pausa arriba

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
│   ├── touch.js            # Botones táctiles
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

## 🎨 Sustituir los sprites placeholder

Reemplaza los PNG de `sprites/thumbs/` y `sprites/full/` manteniendo los nombres. Para regenerar los placeholders:

```bash
pip install Pillow
python3 generate_sprites.py
```

---

## ⚙️ Mecánicas del combate

- **HP**: 100 puntos
- **Rondas**: ganar 2 de 3
- **Tiempo**: 60 segundos por ronda
- **Daño base**: puño 8 + bonus poder · patada 12 + bonus poder
- **Bloqueo**: reduce daño al 25%
- **IA**: 3 niveles (easy / normal / hard) con frecuencia y velocidad distintas

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
