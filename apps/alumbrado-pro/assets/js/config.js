/**
 * AlumbradoPro - Configuración
 * 
 * @author Rubén Pantxo
 * @version 1.0.0
 */

// ============================================
// CONFIGURACIÓN DE LA APLICACIÓN
// ============================================

const APP_CONFIG = {
    // Información de la aplicación
    name: 'AlumbradoPro',
    version: '1.0.0',
    author: 'Rubén Pantxo',
    
    // Configuración de ubicación por defecto (Ribafrecha, La Rioja)
    defaultLocation: {
        name: 'Ribafrecha, La Rioja',
        lat: 42.4020,
        lng: -2.3680,
        zoom: 15
    },
    
    // Clave para localStorage
    storageKey: 'alumbrado-ribafrecha',
    
    // Intervalo de autoguardado (en milisegundos)
    autoSaveInterval: 60000, // 60 segundos
    
    // Duración del toast (en milisegundos)
    toastDuration: 2500
};

// ============================================
// CONFIGURACIÓN DE ICONOS
// ============================================

const ICON_CONFIG = {
    baculo: {
        off: 'assets/icons/farola_baculo_logo.png',
        on: 'assets/icons/On_farola_bac_logo.png',
        size: [32, 40],
        name: 'Báculo',
        prefix: 'B'
    },
    foco: {
        off: 'assets/icons/Foco.png',
        on: 'assets/icons/On_Foco.png',
        size: [32, 32],
        name: 'Foco',
        prefix: 'F'
    },
    pared: {
        off: 'assets/icons/farola_pared_logo.png',
        on: 'assets/icons/On_farola_logo.png',
        size: [36, 28],
        name: 'Pared',
        prefix: 'P'
    },
    cofre: {
        off: 'assets/icons/Cofred.png',
        ok: 'assets/icons/Ok_Cofred.png',
        size: [24, 40],
        name: 'Cofre',
        prefix: 'C'
    },
    vehiculo: {
        default: 'assets/icons/Camion_gloobal.png',
        size: [40, 40],
        name: 'Vehículo',
        prefix: 'V'
    }
};

// ============================================
// CONFIGURACIÓN DE CAPAS WMS
// ============================================

const LAYERS_CONFIG = {
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 20
        },
        isBase: true,
        name: 'OpenStreetMap',
        description: 'Callejero con nombres de calles'
    },
    pnoa: {
        url: 'https://www.ign.es/wms-inspire/pnoa-ma',
        options: {
            layers: 'OI.OrthoimageCoverage',
            format: 'image/png',
            transparent: true,
            attribution: '© IGN PNOA',
            maxZoom: 20
        },
        isWMS: true,
        isBase: true,
        name: 'PNOA Ortofoto',
        description: 'Fotografía aérea IGN (alta resolución)'
    },
    catastro: {
        url: 'https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx',
        options: {
            layers: 'Catastro',
            format: 'image/png',
            transparent: true,
            attribution: '© Catastro',
            maxZoom: 20
        },
        isWMS: true,
        isBase: false,
        name: 'Catastro',
        description: 'Delimitación de parcelas'
    }
};

// ============================================
// TIPOS DE ELEMENTOS
// ============================================

const ELEMENT_TYPES = {
    LIGHT: ['baculo', 'foco', 'pared'],
    COFRE: ['cofre'],
    VEHICLE: ['vehiculo']
};

// ============================================
// ESTADOS
// ============================================

const STATUS = {
    ON: 'on',
    OFF: 'off',
    OK: 'ok',
    NOTOK: 'notok',
    PENDING: 'pending'
};
