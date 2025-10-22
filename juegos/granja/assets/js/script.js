// ============================================
// CONFIGURACIÓN DEL JUEGO
// ============================================

const GAME_CONFIG = {
    crops: {
        wheat: {
            name: 'Trigo',
            icon: '🌾',
            seedCost: 1,
            coinCost: 0,
            growthTime: 15000, // 15 segundos
            seedReward: 2,
            coinReward: 0
        },
        corn: {
            name: 'Maíz',
            icon: '🌽',
            seedCost: 2,
            coinCost: 1,
            growthTime: 20000, // 20 segundos
            seedReward: 3,
            coinReward: 1
        },
        potato: {
            name: 'Patata',
            icon: '🥔',
            seedCost: 2,
            coinCost: 1,
            growthTime: 18000, // 18 segundos
            seedReward: 3,
            coinReward: 1
        },
        tomato: {
            name: 'Tomate',
            icon: '🍅',
            seedCost: 3,
            coinCost: 25,
            growthTime: 30000, // 30 segundos
            seedReward: 5,
            coinReward: 30
        },
        strawberry: {
            name: 'Fresa',
            icon: '🍓',
            seedCost: 3,
            coinCost: 25,
            growthTime: 28000, // 28 segundos
            seedReward: 5,
            coinReward: 30
        },
        pumpkin: {
            name: 'Calabaza',
            icon: '🎃',
            seedCost: 4,
            coinCost: 50,
            growthTime: 40000, // 40 segundos
            seedReward: 8,
            coinReward: 60
        }
    },
    upgrades: {
        sickle: {
            name: 'Hoz',
            icon: '🔪',
            cost: 5,
            description: 'Cosecha más rápido'
        },
        watering: {
            name: 'Regadera',
            icon: '💧',
            cost: 10,
            description: 'Acelera el crecimiento'
        },
        expand: {
            name: 'Expandir Granja I',
            icon: '↗️',
            cost: 10,
            description: 'Añade más parcelas'
        },
        shovel: {
            name: 'Pala',
            icon: '⛏️',
            cost: 50,
            description: 'Planta múltiples cultivos'
        }
    }
};

// ============================================
// ESTADO DEL JUEGO
// ============================================

const gameState = {
    seeds: 1,
    coins: 0,
    plots: [],
    selectedCrop: null,
    plantingMode: false,
    upgrades: {
        sickle: false,
        watering: false,
        expand: false,
        shovel: false
    },
    growthSpeedMultiplier: 1
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializePlots();
    setupEventListeners();
    updateResourceDisplay();
    loadGameState();
    updateTopMessage('Haz clic en el botón de tienda en la esquina superior izquierda para comprar cultivos.');
});

// Crear las parcelas de cultivo
function initializePlots() {
    const farmScene = document.getElementById('farmScene');
    const numPlots = 6;
    
    // Posiciones para un diseño isométrico básico
    const positions = [
        { x: 300, y: 300 },
        { x: 480, y: 360 },
        { x: 660, y: 420 },
        { x: 300, y: 450 },
        { x: 480, y: 510 },
        { x: 660, y: 570 }
    ];
    
    positions.forEach((pos, index) => {
        const plot = createPlot(index, pos.x, pos.y);
        farmScene.appendChild(plot);
        gameState.plots.push({
            id: index,
            element: plot,
            crop: null,
            growthProgress: 0,
            growthInterval: null,
            startTime: null,
            ready: false
        });
    });
}

function createPlot(id, x, y) {
    const plot = document.createElement('div');
    plot.className = 'plot';
    plot.style.left = `${x}px`;
    plot.style.top = `${y}px`;
    plot.dataset.plotId = id;
    
    const ground = document.createElement('div');
    ground.className = 'plot-ground';
    plot.appendChild(ground);
    
    plot.addEventListener('click', () => handlePlotClick(id));
    
    return plot;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Botón de tienda
    document.getElementById('shopButton').addEventListener('click', openShop);
    
    // Cerrar modal
    document.getElementById('closeModal').addEventListener('click', closeShop);
    
    // Tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Selección de cultivos
    document.querySelectorAll('.crop-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const cropType = e.currentTarget.dataset.crop;
            selectCrop(cropType);
        });
    });
    
    // Compra de mejoras
    document.querySelectorAll('.upgrade-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const upgradeType = e.currentTarget.dataset.upgrade;
            purchaseUpgrade(upgradeType);
        });
    });
    
    // Botón de cancelar
    document.getElementById('cancelButton').addEventListener('click', cancelPlanting);
    
    // Botón de volver
    document.getElementById('backButton').addEventListener('click', hidePlotInfo);
    
    // Velocidad de crecimiento
    document.getElementById('growthSpeed').addEventListener('change', (e) => {
        gameState.growthSpeedMultiplier = parseFloat(e.target.value);
    });
    
    // Cerrar modal al hacer clic fuera
    document.getElementById('shopModal').addEventListener('click', (e) => {
        if (e.target.id === 'shopModal') {
            closeShop();
        }
    });
}

// ============================================
// GESTIÓN DE TIENDA
// ============================================

function openShop() {
    document.getElementById('shopModal').style.display = 'flex';
    updateShopAffordability();
}

function closeShop() {
    document.getElementById('shopModal').style.display = 'none';
}

function switchTab(tabName) {
    // Actualizar botones
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    if (tabName === 'crops' || tabName === 'upgrades') {
        updateShopAffordability();
    }
}

function updateShopAffordability() {
    // Actualizar cultivos
    document.querySelectorAll('.crop-item').forEach(item => {
        const cropType = item.dataset.crop;
        const crop = GAME_CONFIG.crops[cropType];
        
        if (gameState.seeds >= crop.seedCost && gameState.coins >= crop.coinCost) {
            item.classList.add('affordable');
        } else {
            item.classList.remove('affordable');
        }
    });
    
    // Actualizar mejoras
    document.querySelectorAll('.upgrade-item').forEach(item => {
        const upgradeType = item.dataset.upgrade;
        const upgrade = GAME_CONFIG.upgrades[upgradeType];
        
        if (gameState.upgrades[upgradeType]) {
            item.classList.add('purchased');
        } else if (gameState.coins >= upgrade.cost) {
            item.classList.add('affordable');
            item.classList.remove('purchased');
        } else {
            item.classList.remove('affordable');
        }
    });
}

// ============================================
// SISTEMA DE CULTIVOS
// ============================================

function selectCrop(cropType) {
    const crop = GAME_CONFIG.crops[cropType];
    
    // Verificar si se puede comprar
    if (gameState.seeds < crop.seedCost || gameState.coins < crop.coinCost) {
        updateTopMessage(`No tienes suficientes recursos para comprar ${crop.name}.`);
        return;
    }
    
    // Marcar cultivo seleccionado
    document.querySelectorAll('.crop-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    gameState.selectedCrop = cropType;
    gameState.plantingMode = true;
    
    closeShop();
    showCancelButton();
    updateTopMessage(`Haz clic en una parcela vacía para plantar ${crop.name}.`);
}

function cancelPlanting() {
    gameState.selectedCrop = null;
    gameState.plantingMode = false;
    hideCancelButton();
    
    document.querySelectorAll('.plot').forEach(plot => {
        plot.classList.remove('selected');
    });
    
    updateTopMessage('Plantación cancelada. Abre la tienda para seleccionar otro cultivo.');
}

function handlePlotClick(plotId) {
    const plot = gameState.plots[plotId];
    
    // Si está en modo plantación y la parcela está vacía
    if (gameState.plantingMode && !plot.crop) {
        plantCrop(plotId);
    }
    // Si la parcela tiene un cultivo listo para cosechar
    else if (plot.ready && plot.crop) {
        harvestCrop(plotId);
    }
    // Si la parcela tiene un cultivo creciendo
    else if (plot.crop && !plot.ready) {
        showPlotInfo(plotId);
    }
}

function plantCrop(plotId) {
    const plot = gameState.plots[plotId];
    const cropType = gameState.selectedCrop;
    const crop = GAME_CONFIG.crops[cropType];
    
    // Deducir recursos
    gameState.seeds -= crop.seedCost;
    gameState.coins -= crop.coinCost;
    updateResourceDisplay();
    
    // Plantar cultivo
    plot.crop = cropType;
    plot.growthProgress = 0;
    plot.ready = false;
    plot.startTime = Date.now();
    
    // Actualizar visual
    plot.element.classList.add('planted');
    
    // Añadir visual del cultivo
    const cropVisual = document.createElement('div');
    cropVisual.className = 'crop-visual';
    cropVisual.textContent = crop.icon;
    plot.element.appendChild(cropVisual);
    
    // Añadir icono de agua si se tiene la mejora
    if (gameState.upgrades.watering) {
        const toolIcon = document.createElement('div');
        toolIcon.className = 'tool-icon';
        toolIcon.textContent = '💧';
        plot.element.appendChild(toolIcon);
    }
    
    // Iniciar crecimiento
    startGrowth(plotId);
    
    // Cancelar modo plantación
    gameState.plantingMode = false;
    gameState.selectedCrop = null;
    hideCancelButton();
    
    updateTopMessage('Selecciona tus cultivos para obtener más información.');
}

function startGrowth(plotId) {
    const plot = gameState.plots[plotId];
    const crop = GAME_CONFIG.crops[plot.crop];
    
    // Calcular tiempo de crecimiento con modificadores
    let growthTime = crop.growthTime / gameState.growthSpeedMultiplier;
    
    if (gameState.upgrades.watering) {
        growthTime *= 0.7; // 30% más rápido con regadera
    }
    
    const updateInterval = 100; // Actualizar cada 100ms
    
    plot.growthInterval = setInterval(() => {
        const elapsed = Date.now() - plot.startTime;
        plot.growthProgress = Math.min((elapsed / growthTime) * 100, 100);
        
        // Actualizar barra de progreso si el panel está visible
        const infoPanel = document.getElementById('infoPanel');
        if (infoPanel.style.display !== 'none') {
            const currentPlotId = parseInt(infoPanel.dataset.plotId);
            if (currentPlotId === plotId) {
                document.getElementById('progressBar').style.width = `${plot.growthProgress}%`;
            }
        }
        
        if (plot.growthProgress >= 100) {
            clearInterval(plot.growthInterval);
            finishGrowth(plotId);
        }
    }, updateInterval);
}

function finishGrowth(plotId) {
    const plot = gameState.plots[plotId];
    const crop = GAME_CONFIG.crops[plot.crop];
    
    plot.ready = true;
    
    // Crear indicador de cosecha lista
    const harvestIcon = document.createElement('div');
    harvestIcon.className = 'floating-icon harvest-ready';
    
    const rewardText = crop.seedReward > 0 
        ? `${crop.seedReward} SEMILLAS` 
        : `${crop.coinReward} MONEDAS`;
    
    harvestIcon.innerHTML = `
        <span class="big-text">${rewardText} LISTAS</span>
        <span class="small-text">Clic para Cosechar</span>
    `;
    
    plot.element.appendChild(harvestIcon);
    
    updateTopMessage('¡Tus cultivos están listos para cosechar!');
}

function harvestCrop(plotId) {
    const plot = gameState.plots[plotId];
    const crop = GAME_CONFIG.crops[plot.crop];
    
    // Dar recompensas
    gameState.seeds += crop.seedReward;
    gameState.coins += crop.coinReward;
    updateResourceDisplay();
    
    // Animación de cosecha
    const cropVisual = plot.element.querySelector('.crop-visual');
    if (cropVisual) {
        cropVisual.classList.add('harvest-animation');
    }
    
    // Mostrar animación de recompensa
    const rewardIcon = document.createElement('div');
    rewardIcon.className = crop.seedReward > 0 ? 'floating-icon' : 'floating-icon coins';
    rewardIcon.textContent = crop.seedReward > 0 ? `+${crop.seedReward} 🌱` : `+${crop.coinReward} 💰`;
    rewardIcon.style.top = '-100px';
    plot.element.appendChild(rewardIcon);
    
    setTimeout(() => {
        rewardIcon.style.animation = 'harvestAnimation 1s ease forwards';
        setTimeout(() => rewardIcon.remove(), 1000);
    }, 100);
    
    // Limpiar parcela después de la animación
    setTimeout(() => {
        resetPlot(plotId);
    }, 500);
    
    updateTopMessage('¡Cosecha exitosa! Continúa cultivando tu granja. Ahorra 5 monedas para comprar una mejora.');
}

function resetPlot(plotId) {
    const plot = gameState.plots[plotId];
    
    plot.crop = null;
    plot.growthProgress = 0;
    plot.ready = false;
    plot.startTime = null;
    
    if (plot.growthInterval) {
        clearInterval(plot.growthInterval);
        plot.growthInterval = null;
    }
    
    plot.element.classList.remove('planted');
    plot.element.innerHTML = '<div class="plot-ground"></div>';
}

// ============================================
// PANEL DE INFORMACIÓN
// ============================================

function showPlotInfo(plotId) {
    const plot = gameState.plots[plotId];
    const crop = GAME_CONFIG.crops[plot.crop];
    
    const infoPanel = document.getElementById('infoPanel');
    infoPanel.style.display = 'block';
    infoPanel.dataset.plotId = plotId;
    
    document.getElementById('cropName').textContent = crop.name;
    document.getElementById('cropStatus').textContent = plot.ready ? 'Listo' : 'Creciendo';
    document.getElementById('progressBar').style.width = `${plot.growthProgress}%`;
    
    document.getElementById('backButton').style.display = 'block';
    
    updateTopMessage('Espera a que tus cultivos crezcan...');
}

function hidePlotInfo() {
    document.getElementById('infoPanel').style.display = 'none';
    document.getElementById('backButton').style.display = 'none';
    
    updateTopMessage('Selecciona tus cultivos para obtener más información.');
}

// ============================================
// SISTEMA DE MEJORAS
// ============================================

function purchaseUpgrade(upgradeType) {
    const upgrade = GAME_CONFIG.upgrades[upgradeType];
    
    // Verificar si ya fue comprada
    if (gameState.upgrades[upgradeType]) {
        updateTopMessage(`Ya has comprado: ${upgrade.name}`);
        return;
    }
    
    // Verificar si se puede comprar
    if (gameState.coins < upgrade.cost) {
        updateTopMessage(`No tienes suficientes monedas para comprar ${upgrade.name}.`);
        return;
    }
    
    // Comprar mejora
    gameState.coins -= upgrade.cost;
    gameState.upgrades[upgradeType] = true;
    updateResourceDisplay();
    updateShopAffordability();
    
    // Aplicar efecto de la mejora
    applyUpgrade(upgradeType);
    
    updateTopMessage(`¡${upgrade.name} comprada! ${upgrade.description}`);
}

function applyUpgrade(upgradeType) {
    switch(upgradeType) {
        case 'expand':
            expandFarm();
            break;
        case 'watering':
            updateTopMessage('¡Tus cultivos ahora crecen 30% más rápido!');
            break;
        case 'sickle':
            updateTopMessage('¡Ahora puedes cosechar con la hoz haciendo clic en el icono sobre la parcela!');
            break;
        case 'shovel':
            updateTopMessage('¡Ahora puedes plantar múltiples cultivos seguidos!');
            break;
    }
}

function expandFarm() {
    const farmScene = document.getElementById('farmScene');
    const currentPlots = gameState.plots.length;
    
    // Añadir 3 nuevas parcelas
    const newPositions = [
        { x: 300, y: 600 },
        { x: 480, y: 660 },
        { x: 660, y: 720 }
    ];
    
    newPositions.forEach((pos, index) => {
        const newId = currentPlots + index;
        const plot = createPlot(newId, pos.x, pos.y);
        farmScene.appendChild(plot);
        gameState.plots.push({
            id: newId,
            element: plot,
            crop: null,
            growthProgress: 0,
            growthInterval: null,
            startTime: null,
            ready: false
        });
    });
    
    updateTopMessage('¡Granja expandida! Ahora tienes más parcelas para cultivar.');
}

// ============================================
// INTERFAZ DE USUARIO
// ============================================

function updateResourceDisplay() {
    document.getElementById('seedsCount').textContent = gameState.seeds;
    document.getElementById('coinsCount').textContent = gameState.coins;
}

function updateTopMessage(message) {
    const messageElement = document.getElementById('topMessage');
    messageElement.textContent = message;
    
    // Reiniciar animación
    messageElement.style.animation = 'none';
    setTimeout(() => {
        messageElement.style.animation = 'fadeIn 0.5s ease';
    }, 10);
}

function showCancelButton() {
    document.getElementById('cancelButton').style.display = 'block';
}

function hideCancelButton() {
    document.getElementById('cancelButton').style.display = 'none';
}

// ============================================
// GUARDADO Y CARGA
// ============================================

function saveGameState() {
    const saveData = {
        seeds: gameState.seeds,
        coins: gameState.coins,
        upgrades: gameState.upgrades,
        plots: gameState.plots.map(plot => ({
            id: plot.id,
            crop: plot.crop,
            growthProgress: plot.growthProgress,
            ready: plot.ready,
            startTime: plot.startTime
        }))
    };
    
    localStorage.setItem('farmGameSave', JSON.stringify(saveData));
}

function loadGameState() {
    const savedData = localStorage.getItem('farmGameSave');
    
    if (savedData) {
        const data = JSON.parse(savedData);
        gameState.seeds = data.seeds;
        gameState.coins = data.coins;
        gameState.upgrades = data.upgrades;
        
        // Restaurar cultivos
        data.plots.forEach(savedPlot => {
            if (savedPlot.crop) {
                const plot = gameState.plots[savedPlot.id];
                plot.crop = savedPlot.crop;
                plot.ready = savedPlot.ready;
                plot.startTime = savedPlot.startTime;
                
                const crop = GAME_CONFIG.crops[savedPlot.crop];
                
                // Restaurar visual
                plot.element.classList.add('planted');
                const cropVisual = document.createElement('div');
                cropVisual.className = 'crop-visual';
                cropVisual.textContent = crop.icon;
                plot.element.appendChild(cropVisual);
                
                // Continuar crecimiento si no está listo
                if (!savedPlot.ready) {
                    startGrowth(savedPlot.id);
                } else {
                    finishGrowth(savedPlot.id);
                }
            }
        });
        
        updateResourceDisplay();
    }
}

// Guardar automáticamente cada 10 segundos
setInterval(saveGameState, 10000);

// Guardar al cerrar la página
window.addEventListener('beforeunload', saveGameState);

console.log('🌾 ¡Juego de Granja inicializado! 🌾');
