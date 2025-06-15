// =================================================================
// === NAVEGACIÓN GENERAL DEL SITIO WEB ============================
// =================================================================

function showSection(id) {
    // Oculta todas las secciones de contenido
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Muestra la sección elegida
    const targetSection = document.getElementById(id);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}


// =================================================================
// === JUEGO 1: COGE CAPOTAS (ALCACHOFAS) ==========================
// =================================================================

const game = {
    // Elementos del DOM
    container: document.getElementById('gameContainer'),
    canvas: document.getElementById('gameCanvas'),
    ctx: null,
    ui: {
        timer: document.getElementById('timer'),
        artichokes: document.getElementById('artichokes'),
        total: document.getElementById('total'),
        llenoMsg: document.getElementById('llenoMsg'),
        gameOver: document.getElementById('gameOver'),
        finalTime: document.getElementById('finalTime'),
    },

    // Estado del juego
    running: false,
    keys: {},
    startTime: 0,
    
    // Configuración del juego
    config: {
        MAX_CARRIED: 5,
        FIELD_COLOR: '#8B4513',
        TOTAL_ARTICHOKES: 50,
    },

    // Recursos (imágenes)
    assets: {
        player: { img: new Image(), src: 'img/2_Agricul.png' },
        tractor: { img: new Image(), src: 'img/Trator🚜.png' },
        artichoke: { img: new Image(), src: 'img/Alcachofa.png' },
    },

    // Entidades del juego
    player: {},
    tractor: {},
    artichokes: [],
    
    // Contadores
    carried: 0,
    collected: 0,
};

// --- INICIALIZACIÓN Y FLUJO DE JUEGO ---

function initGameAssets() {
    game.assets.player.img.src = game.assets.player.src;
    game.assets.tractor.img.src = game.assets.tractor.src;
    game.assets.artichoke.img.src = game.assets.artichoke.src;
}

function startGame() {
    game.container.style.display = 'block';
    game.ui.gameOver.style.display = 'none';

    if (!game.ctx) {
        game.ctx = game.canvas.getContext('2d');
    }

    // Resetear estado
    game.running = true;
    game.carried = 0;
    game.collected = 0;
    game.startTime = performance.now();
    
    // Posicionar jugador y tractor
    game.player = { x: game.canvas.width / 2, y: game.canvas.height - 120, w: 48, h: 48, speed: 4 };
    game.tractor = { x: game.canvas.width / 2 - 64, y: 40, w: 128, h: 96 };

    // Generar alcachofas aleatoriamente
    game.artichokes = [];
    for (let i = 0; i < game.config.TOTAL_ARTICHOKES; i++) {
        game.artichokes.push({
            x: Math.random() * (game.canvas.width - 40) + 20,
            y: Math.random() * (game.canvas.height - 240) + 140,
            w: 32, h: 32, taken: false
        });
    }

    resizeCanvas();
    requestAnimationFrame(gameLoop);
}

function exitGame() {
    game.running = false;
    game.container.style.display = 'none';
}

function gameLoop() {
    if (!game.running) return;
    update();
    render();
    requestAnimationFrame(gameLoop);
}


// --- LÓGICA DE ACTUALIZACIÓN (UPDATE) ---

function update() {
    // Movimiento del jugador basado en las teclas pulsadas
    if (game.keys['ArrowLeft'] || game.keys['a']) game.player.x -= game.player.speed;
    if (game.keys['ArrowRight'] || game.keys['d']) game.player.x += game.player.speed;
    if (game.keys['ArrowUp'] || game.keys['w']) game.player.y -= game.player.speed;
    if (game.keys['ArrowDown'] || game.keys['s']) game.player.y += game.player.speed;

    // Limitar el movimiento del jugador a los bordes del canvas
    game.player.x = clamp(game.player.x, 0, game.canvas.width - game.player.w);
    game.player.y = clamp(game.player.y, 0, game.canvas.height - game.player.h);

    // Colisión y recolección de alcachofas
    if (game.carried < game.config.MAX_CARRIED) {
        game.artichokes.forEach(a => {
            if (!a.taken && checkCollision(game.player, a)) {
                a.taken = true;
                game.carried++;
                game.collected++;
            }
        });
    }

    // Mostrar mensaje de inventario lleno
    game.ui.llenoMsg.style.display = (game.carried >= game.config.MAX_CARRIED) ? 'block' : 'none';

    // Colisión con el tractor para descargar
    if (game.carried > 0 && checkCollision(game.player, game.tractor)) {
        game.carried = 0; // Descarga todas las alcachofas
    }

    // Condición de victoria
    if (game.collected >= game.config.TOTAL_ARTICHOKES && game.carried === 0) {
        game.running = false;
        const totalTime = ((performance.now() - game.startTime) / 1000).toFixed(1);
        game.ui.finalTime.textContent = `Tiempo total: ${totalTime} s`;
        game.ui.gameOver.style.display = 'block';
    }

    updateUI();
}

function updateUI() {
    const elapsed = Math.floor((performance.now() - game.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    
    game.ui.timer.textContent = `Tiempo: ${minutes}:${seconds}`;
    game.ui.artichokes.textContent = `Alcachofas: ${game.carried}/${game.config.MAX_CARRIED}`;
    game.ui.total.textContent = `Total recogidas: ${game.collected}`;
}


// --- LÓGICA DE DIBUJADO (RENDER) ---

function render() {
    const ctx = game.ctx;
    ctx.fillStyle = game.config.FIELD_COLOR;
    ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

    // Dibujar tractor (con fallback de color si la imagen no carga)
    if (game.assets.tractor.img.complete && game.assets.tractor.img.naturalHeight !== 0) {
        ctx.drawImage(game.assets.tractor.img, game.tractor.x, game.tractor.y, game.tractor.w, game.tractor.h);
    } else {
        ctx.fillStyle = '#006400';
        ctx.fillRect(game.tractor.x, game.tractor.y, game.tractor.w, game.tractor.h);
    }

    // Dibujar alcachofas no recogidas
    game.artichokes.forEach(a => {
        if (!a.taken) {
            if (game.assets.artichoke.img.complete && game.assets.artichoke.img.naturalHeight !== 0) {
                ctx.drawImage(game.assets.artichoke.img, a.x, a.y, a.w, a.h);
            } else {
                ctx.fillStyle = '#228B22';
                ctx.fillRect(a.x, a.y, a.w, a.h);
            }
        }
    });

    // Dibujar jugador
    if (game.assets.player.img.complete && game.assets.player.img.naturalHeight !== 0) {
        ctx.drawImage(game.assets.player.img, game.player.x, game.player.y, game.player.w, game.player.h);
    } else {
        ctx.fillStyle = '#00f';
        ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);
    }
}


// --- FUNCIONES AUXILIARES Y EVENTOS ---

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const checkCollision = (rect1, rect2) => (
    rect1.x < rect2.x + rect2.w &&
    rect1.x + rect1.w > rect2.x &&
    rect1.y < rect2.y + rect2.h &&
    rect1.y + rect1.h > rect2.y
);

function resizeCanvas() {
    game.canvas.width = window.innerWidth;
    game.canvas.height = window.innerHeight;
}

// Event listeners para el control del juego
window.addEventListener('keydown', e => { game.keys[e.key] = true; });
window.addEventListener('keyup', e => { game.keys[e.key] = false; });
window.addEventListener('resize', resizeCanvas);

// Cargar imágenes al iniciar la página
initGameAssets();
