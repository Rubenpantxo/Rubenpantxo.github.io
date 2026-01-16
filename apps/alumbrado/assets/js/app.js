/**
 * AlumbradoPro - Aplicación Principal
 * Gestión de Alumbrado Público
 * 
 * @author Rubén Pantxo
 * @version 1.0.0
 */

// ============================================
// INICIALIZACIÓN DEL MAPA
// ============================================

const map = L.map('map', {
    zoomControl: false
}).setView(
    [APP_CONFIG.defaultLocation.lat, APP_CONFIG.defaultLocation.lng],
    APP_CONFIG.defaultLocation.zoom
);

// Añadir control de zoom
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ============================================
// CONFIGURACIÓN DE CAPAS
// ============================================

const mapLayers = {};

// Crear capa OSM
mapLayers.osm = {
    layer: L.tileLayer(LAYERS_CONFIG.osm.url, LAYERS_CONFIG.osm.options),
    active: true,
    isBase: true
};

// Crear capa PNOA (WMS)
mapLayers.pnoa = {
    layer: L.tileLayer.wms(LAYERS_CONFIG.pnoa.url, LAYERS_CONFIG.pnoa.options),
    active: false,
    isBase: true
};

// Crear capa Catastro (WMS)
mapLayers.catastro = {
    layer: L.tileLayer.wms(LAYERS_CONFIG.catastro.url, LAYERS_CONFIG.catastro.options),
    active: false,
    isBase: false
};

// Añadir capa base por defecto
mapLayers.osm.layer.addTo(map);

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================

let selectedTool = null;
let elements = [];
let markers = {};
let elementIdCounter = 1;
let activeFilter = 'all';

// Zoom de referencia para el tamaño base de los iconos
const REFERENCE_ZOOM = 16;

// ============================================
// FUNCIONES DE ESCALADO CON ZOOM
// ============================================

/**
 * Calcula el factor de escala basado en el nivel de zoom actual
 * Los iconos se reducen al hacer zoom out y mantienen tamaño al hacer zoom in
 */
function getZoomScale() {
    const currentZoom = map.getZoom();

    if (currentZoom >= REFERENCE_ZOOM) {
        // Zoom in: mantener tamaño base (o ligeramente mayor)
        return 1;
    }

    // Zoom out: reducir proporcionalmente
    // Factor exponencial para una reducción más natural
    const zoomDiff = REFERENCE_ZOOM - currentZoom;
    const scale = Math.pow(0.85, zoomDiff);

    // Limitar el tamaño mínimo para que siempre sean visibles
    return Math.max(scale, 0.3);
}

/**
 * Calcula el tamaño del icono basado en el zoom actual
 */
function getScaledIconSize(baseSize) {
    const scale = getZoomScale();
    return [
        Math.round(baseSize[0] * scale),
        Math.round(baseSize[1] * scale)
    ];
}

/**
 * Actualiza todos los marcadores cuando cambia el zoom
 */
function updateAllMarkersSize() {
    elements.forEach(element => {
        updateMarker(element);
    });
}

// ============================================
// FUNCIONES DE CAPAS
// ============================================

function toggleLegendPanel() {
    const panel = document.getElementById('legendPanel');
    const layerPanel = document.getElementById('layerPanel');
    const btn = document.getElementById('legendBtn');
    
    // Cerrar panel de capas si está abierto
    layerPanel.classList.remove('show');
    document.getElementById('layerBtn').classList.remove('active');
    
    // Toggle panel de leyenda
    panel.classList.toggle('show');
    btn.classList.toggle('active');
}

function toggleLayerPanel() {
    const panel = document.getElementById('layerPanel');
    const legendPanel = document.getElementById('legendPanel');
    const btn = document.getElementById('layerBtn');
    
    // Cerrar panel de leyenda si está abierto
    legendPanel.classList.remove('show');
    document.getElementById('legendBtn').classList.remove('active');
    
    // Toggle panel de capas
    panel.classList.toggle('show');
    btn.classList.toggle('active');
}

function toggleLayer(layerId) {
    const layerInfo = mapLayers[layerId];
    const checkbox = document.getElementById(`check-${layerId}`);
    
    if (layerInfo.isBase) {
        // Capas base: desactivar otras y activar la seleccionada
        Object.keys(mapLayers).forEach(id => {
            const info = mapLayers[id];
            if (info.isBase && id !== layerId && info.active) {
                map.removeLayer(info.layer);
                info.active = false;
                document.getElementById(`check-${id}`).classList.remove('checked');
            }
        });
        
        if (!layerInfo.active) {
            showLoading();
            layerInfo.layer.addTo(map);
            layerInfo.active = true;
            checkbox.classList.add('checked');
            setTimeout(hideLoading, 1000);
        }
        
        // Asegurar que catastro esté encima si está activo
        if (mapLayers.catastro.active) {
            mapLayers.catastro.layer.bringToFront();
        }
    } else {
        // Capas overlay: toggle normal
        if (layerInfo.active) {
            map.removeLayer(layerInfo.layer);
            layerInfo.active = false;
            checkbox.classList.remove('checked');
        } else {
            showLoading();
            layerInfo.layer.addTo(map);
            layerInfo.active = true;
            checkbox.classList.add('checked');
            layerInfo.layer.bringToFront();
            setTimeout(hideLoading, 1500);
        }
    }
    
    updateAttribution();
}

function updateAttribution() {
    const attr = [];
    if (mapLayers.pnoa.active) attr.push('Ortofoto: IGN PNOA');
    if (mapLayers.catastro.active) attr.push('Parcelas: Catastro');
    document.getElementById('wmsAttribution').textContent = attr.join(' | ');
}

function centerMap() {
    map.setView(
        [APP_CONFIG.defaultLocation.lat, APP_CONFIG.defaultLocation.lng],
        APP_CONFIG.defaultLocation.zoom
    );
}

// ============================================
// FUNCIONES DE UI
// ============================================

function showLoading() {
    document.getElementById('loadingIndicator').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingIndicator').classList.remove('show');
}

function showToast(icon, text) {
    const toast = document.getElementById('toast');
    document.querySelector('.toast-icon').textContent = icon;
    document.getElementById('toast-text').textContent = text;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, APP_CONFIG.toastDuration);
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ============================================
// FUNCIONES DE DATOS
// ============================================

function loadData() {
    const saved = localStorage.getItem(APP_CONFIG.storageKey);
    if (saved) {
        const data = JSON.parse(saved);
        elements = data.elements || [];
        elementIdCounter = data.counter || 1;
        
        elements.forEach(el => {
            createMarker(el);
        });
        
        updateStats();
        updateElementsList();
    }
}

function saveData(showNotification = false) {
    const data = {
        elements: elements,
        counter: elementIdCounter,
        location: APP_CONFIG.defaultLocation.name,
        lastSaved: new Date().toISOString()
    };
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(data));
    
    if (showNotification) {
        showToast('✓', 'Datos guardados correctamente');
    }
}

function exportData() {
    const lightTypes = ELEMENT_TYPES.LIGHT;
    
    const data = {
        application: APP_CONFIG.name,
        version: APP_CONFIG.version,
        location: APP_CONFIG.defaultLocation.name,
        exportDate: new Date().toISOString(),
        summary: {
            totalLuminarias: elements.filter(e => lightTypes.includes(e.type)).length,
            encendidas: elements.filter(e => lightTypes.includes(e.type) && e.status === STATUS.ON).length,
            apagadas: elements.filter(e => lightTypes.includes(e.type) && e.status === STATUS.OFF).length,
            cofresOK: elements.filter(e => e.type === 'cofre' && e.cofreStatus === STATUS.OK).length,
            cofresNotOK: elements.filter(e => e.type === 'cofre' && e.cofreStatus === STATUS.NOTOK).length,
            vehiculos: elements.filter(e => e.type === 'vehiculo').length
        },
        elements: elements
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alumbrado-${APP_CONFIG.defaultLocation.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('📥', 'Datos exportados correctamente');
}

// ============================================
// FUNCIONES DE HERRAMIENTAS
// ============================================

function selectTool(tool) {
    selectedTool = selectedTool === tool ? null : tool;
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === selectedTool);
    });
    
    map.getContainer().style.cursor = selectedTool ? 'crosshair' : '';
}

// ============================================
// FUNCIONES DE MARCADORES
// ============================================

function getIconSrc(element) {
    const config = ICON_CONFIG[element.type];
    
    switch(element.type) {
        case 'baculo':
        case 'foco':
        case 'pared':
            return element.status === STATUS.ON ? config.on : config.off;
        case 'cofre':
            return element.cofreStatus === STATUS.OK ? config.ok : config.off;
        case 'vehiculo':
            return config.default;
        default:
            return '';
    }
}

function getMarkerClass(element) {
    switch(element.type) {
        case 'baculo':
        case 'foco':
        case 'pared':
            return element.status === STATUS.ON ? 'on' : '';
        case 'cofre':
            return element.cofreStatus === STATUS.OK ? 'ok' : '';
        default:
            return '';
    }
}

function createMarker(element) {
    const config = ICON_CONFIG[element.type];
    const imgSrc = getIconSrc(element);
    const extraClass = getMarkerClass(element);
    const scaledSize = getScaledIconSize(config.size);

    const iconHtml = `<div class="marker-container ${extraClass}"><img src="${imgSrc}" alt="${config.name}" style="width:${scaledSize[0]}px;height:${scaledSize[1]}px;"></div>`;

    const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: scaledSize,
        iconAnchor: [scaledSize[0]/2, scaledSize[1]/2]
    });

    const marker = L.marker([element.lat, element.lng], { icon }).addTo(map);
    marker.on('click', () => openPopup(element, marker));
    markers[element.id] = marker;
}

function updateMarker(element) {
    const marker = markers[element.id];
    if (!marker) return;

    const config = ICON_CONFIG[element.type];
    const imgSrc = getIconSrc(element);
    const extraClass = getMarkerClass(element);
    const scaledSize = getScaledIconSize(config.size);

    const iconHtml = `<div class="marker-container ${extraClass}"><img src="${imgSrc}" alt="${config.name}" style="width:${scaledSize[0]}px;height:${scaledSize[1]}px;"></div>`;

    const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: scaledSize,
        iconAnchor: [scaledSize[0]/2, scaledSize[1]/2]
    });

    marker.setIcon(icon);
}

// ============================================
// FUNCIONES DE POPUP
// ============================================

function openPopup(element, marker) {
    const config = ICON_CONFIG[element.type];
    const imgSrc = getIconSrc(element);
    
    let controlsHtml = '';
    
    if (element.type === 'cofre') {
        controlsHtml = `
            <div class="popup-control-row">
                <span class="popup-label">Estado fusible:</span>
                <div class="status-toggle">
                    <button class="status-toggle-btn ${element.cofreStatus === STATUS.OK ? 'active-ok' : ''}" 
                            onclick="setCofreStatus('${element.id}', '${STATUS.OK}')">OK</button>
                    <button class="status-toggle-btn ${element.cofreStatus === STATUS.NOTOK ? 'active-notok' : ''}" 
                            onclick="setCofreStatus('${element.id}', '${STATUS.NOTOK}')">NOT OK</button>
                </div>
            </div>
        `;
    } else if (element.type === 'vehiculo') {
        controlsHtml = `
            <div class="popup-control-row">
                <span class="popup-label" style="font-size: 11px; color: var(--accent-blue);">
                    📍 Posición del vehículo guardada
                </span>
            </div>
        `;
    } else {
        controlsHtml = `
            <div class="popup-control-row">
                <span class="popup-label">Encendida:</span>
                <div class="toggle-switch ${element.status === STATUS.ON ? 'on' : ''}" 
                     onclick="toggleLightStatus('${element.id}')"></div>
            </div>
        `;
    }
    
    const content = `
        <div class="popup-content">
            <div class="popup-header">
                <span class="popup-icon"><img src="${imgSrc}" alt="${config.name}"></span>
                <div>
                    <div class="popup-title">${config.name}</div>
                    <div class="popup-id">#${element.id}</div>
                </div>
            </div>
            <div class="popup-controls">
                ${controlsHtml}
            </div>
            <div class="popup-delete">
                <button class="delete-btn" onclick="deleteElement('${element.id}')">🗑️ Eliminar</button>
            </div>
        </div>
    `;
    
    marker.bindPopup(content, {
        closeButton: true,
        className: 'custom-popup'
    }).openPopup();
}

// ============================================
// FUNCIONES DE ESTADO
// ============================================

function toggleLightStatus(id) {
    const element = elements.find(e => e.id === id);
    if (element) {
        element.status = element.status === STATUS.ON ? STATUS.OFF : STATUS.ON;
        updateMarker(element);
        updateStats();
        updateElementsList();
        
        const toggle = document.querySelector('.toggle-switch');
        if (toggle) {
            toggle.classList.toggle('on', element.status === STATUS.ON);
        }
        
        saveData(false);
    }
}

function setCofreStatus(id, status) {
    const element = elements.find(e => e.id === id);
    if (element) {
        element.cofreStatus = status;
        updateMarker(element);
        updateStats();
        updateElementsList();
        
        document.querySelectorAll('.status-toggle-btn').forEach(btn => {
            btn.classList.remove('active-ok', 'active-notok');
        });
        
        const activeBtn = document.querySelector(`.status-toggle-btn:${status === STATUS.OK ? 'first-child' : 'last-child'}`);
        if (activeBtn) {
            activeBtn.classList.add(status === STATUS.OK ? 'active-ok' : 'active-notok');
        }
        
        saveData(false);
    }
}

function deleteElement(id) {
    const marker = markers[id];
    if (marker) {
        map.removeLayer(marker);
        delete markers[id];
    }
    
    elements = elements.filter(e => e.id !== id);
    updateStats();
    updateElementsList();
    saveData(false);
    showToast('🗑️', 'Elemento eliminado');
}

// ============================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================

function updateStats() {
    const lightTypes = ELEMENT_TYPES.LIGHT;
    const lights = elements.filter(e => lightTypes.includes(e.type));
    const cofres = elements.filter(e => e.type === 'cofre');
    
    document.getElementById('stat-on').textContent = lights.filter(e => e.status === STATUS.ON).length;
    document.getElementById('stat-off').textContent = lights.filter(e => e.status === STATUS.OFF).length;
    document.getElementById('stat-ok').textContent = cofres.filter(e => e.cofreStatus === STATUS.OK).length;
    document.getElementById('stat-notok').textContent = cofres.filter(e => e.cofreStatus === STATUS.NOTOK).length;
}

// ============================================
// FUNCIONES DE LISTA DE ELEMENTOS
// ============================================

function updateElementsList() {
    const list = document.getElementById('elementsList');
    const lightTypes = ELEMENT_TYPES.LIGHT;
    
    let filteredElements = [...elements];
    
    if (activeFilter === 'on') {
        filteredElements = elements.filter(e => lightTypes.includes(e.type) && e.status === STATUS.ON);
    } else if (activeFilter === 'off') {
        filteredElements = elements.filter(e => lightTypes.includes(e.type) && e.status === STATUS.OFF);
    } else if (activeFilter === 'pending') {
        filteredElements = elements.filter(e => 
            (e.type === 'cofre' && (!e.cofreStatus || e.cofreStatus === STATUS.NOTOK)) ||
            (lightTypes.includes(e.type) && e.status === STATUS.OFF)
        );
    }
    
    if (filteredElements.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <img src="assets/icons/farola_baculo_logo.png" alt="">
                </div>
                <div class="empty-state-text">
                    ${elements.length === 0 ? 'Añade elementos al mapa<br>usando las herramientas' : 'No hay elementos con<br>este filtro'}
                </div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = filteredElements.map(el => {
        const config = ICON_CONFIG[el.type];
        const imgSrc = getIconSrc(el);
        let statusHtml = '';
        
        switch(el.type) {
            case 'baculo':
            case 'foco':
            case 'pared':
                statusHtml = el.status === STATUS.ON 
                    ? '<span class="status-badge status-on">Encendida</span>'
                    : '<span class="status-badge status-off">Apagada</span>';
                break;
            case 'cofre':
                if (el.cofreStatus === STATUS.OK) {
                    statusHtml = '<span class="status-badge status-ok">OK</span>';
                } else if (el.cofreStatus === STATUS.NOTOK) {
                    statusHtml = '<span class="status-badge status-notok">NOT OK</span>';
                } else {
                    statusHtml = '<span class="status-badge status-pending">Pendiente</span>';
                }
                break;
            case 'vehiculo':
                statusHtml = '<span class="status-badge status-vehicle">Marcado</span>';
                break;
        }
        
        return `
            <div class="element-card" onclick="focusElement('${el.id}')">
                <div class="element-header">
                    <div class="element-type">
                        <span class="element-type-icon"><img src="${imgSrc}" alt="${config.name}"></span>
                        <span class="element-type-name">${config.name}</span>
                    </div>
                    <span class="element-id">#${el.id}</span>
                </div>
                <div class="element-status">
                    ${statusHtml}
                </div>
            </div>
        `;
    }).join('');
}

function focusElement(id) {
    const element = elements.find(e => e.id === id);
    const marker = markers[id];
    
    if (element && marker) {
        map.setView([element.lat, element.lng], 19);
        openPopup(element, marker);
    }
}

function filterElements(filter) {
    activeFilter = filter;
    
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.filter === filter);
    });
    
    updateElementsList();
}

// ============================================
// EVENT LISTENERS
// ============================================

// Evento de zoom: actualizar tamaño de todos los marcadores
map.on('zoomend', function() {
    updateAllMarkersSize();
});

// Click en el mapa para añadir elementos
map.on('click', function(e) {
    if (!selectedTool) return;
    
    const config = ICON_CONFIG[selectedTool];
    
    const newElement = {
        id: `${config.prefix}${String(elementIdCounter++).padStart(3, '0')}`,
        type: selectedTool,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        status: selectedTool === 'vehiculo' ? null : STATUS.OFF,
        cofreStatus: selectedTool === 'cofre' ? null : undefined,
        createdAt: new Date().toISOString()
    };
    
    elements.push(newElement);
    createMarker(newElement);
    updateStats();
    updateElementsList();
    saveData(false);
    
    showToast('✓', `${config.name} añadido`);
});

// Cerrar paneles al hacer clic fuera
document.addEventListener('click', function(e) {
    const layerPanel = document.getElementById('layerPanel');
    const legendPanel = document.getElementById('legendPanel');
    const layerBtn = document.getElementById('layerBtn');
    const legendBtn = document.getElementById('legendBtn');
    
    if (!layerPanel.contains(e.target) && !layerBtn.contains(e.target)) {
        layerPanel.classList.remove('show');
        layerBtn.classList.remove('active');
    }
    
    if (!legendPanel.contains(e.target) && !legendBtn.contains(e.target)) {
        legendPanel.classList.remove('show');
        legendBtn.classList.remove('active');
    }
});

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

// Autoguardado silencioso
setInterval(() => saveData(false), APP_CONFIG.autoSaveInterval);
