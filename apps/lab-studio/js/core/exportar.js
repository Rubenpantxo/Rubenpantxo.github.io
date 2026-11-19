// Salidas derivadas del montaje: lista de materiales, lista de redes y mapa
// de pines para el firmware. Todo sale del documento y del análisis, no de
// plantillas: lo que se exporta es lo que está cableado.

import { clavePin } from './modelo.js';

export function listaMateriales(doc, catalogo, inventario = {}) {
    const filas = new Map();
    for (const p of doc.partes) {
        const def = catalogo.get(p.tipo);
        if (!def) continue;
        const clave = def.id + '|' + (p.valor || '');
        if (!filas.has(clave)) {
            filas.set(clave, { def, valor: p.valor || '', refs: [], propio: inventario[def.id] ?? !!def.propio });
        }
        filas.get(clave).refs.push(p.ref);
    }
    const lista = [...filas.values()].map(f => ({
        ...f,
        cantidad: f.refs.length,
        importe: (f.def.precio || 0) * f.refs.length
    }));
    lista.sort((a, b) => a.refs[0].localeCompare(b.refs[0], 'es', { numeric: true }));
    const total = lista.reduce((s, f) => s + f.importe, 0);
    const pendiente = lista.filter(f => !f.propio).reduce((s, f) => s + f.importe, 0);
    return { lista, total, pendiente };
}

const csv = v => /[",;\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);

export function materialesCsv(doc, catalogo, inventario) {
    const { lista } = listaMateriales(doc, catalogo, inventario);
    const filas = [['Referencias', 'Cantidad', 'Componente', 'Valor', 'Fabricante', 'Precio unitario (EUR)', 'Importe (EUR)', 'En inventario']];
    for (const f of lista) {
        filas.push([f.refs.join(' '), f.cantidad, f.def.nombre, f.valor, f.def.fabricante || '', (f.def.precio || 0).toFixed(2), f.importe.toFixed(2), f.propio ? 'sí' : 'no']);
    }
    return '﻿' + filas.map(f => f.map(csv).join(';')).join('\r\n') + '\r\n';
}

export function listaRedesTexto(doc, analisis) {
    const l = [`# Lista de redes — ${doc.nombre}`, `# ${doc.partes.length} piezas, ${doc.cables.length} cables, ${analisis.redes.length} redes`, ''];
    for (const r of analisis.redes) {
        l.push(`${r.nombre}`);
        const pines = [...r.pines].sort((a, b) => a.clave.localeCompare(b.clave, 'es', { numeric: true }));
        for (const e of pines) l.push(`    ${e.parte.ref}.${e.pin.red || e.pin.n || e.pin.id}  (${e.def.corto})`);
        l.push('');
    }
    return l.join('\n');
}

const macro = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

// Asignación GPIO → señal para cada microcontrolador del montaje.
export function mapaPines(doc, catalogo, analisis) {
    const mapas = [];
    for (const parte of doc.partes) {
        const def = catalogo.get(parte.tipo);
        if (!def || !def.mcu) continue;
        const filas = [];
        for (const pin of def.pines) {
            if (pin.gpio == null) continue;
            const red = analisis.porPin.get(clavePin(parte.id, pin.id));
            if (!red) continue;
            const otros = red.pines.filter(e => e.parte.id !== parte.id && e.pin.tipo !== 'pas');
            const pasivos = red.pines.filter(e => e.parte.id !== parte.id && e.pin.tipo === 'pas');
            for (const e of otros.length ? otros : pasivos) {
                filas.push({ gpio: pin.gpio, pin, destino: e, macro: `PIN_${macro(e.parte.ref)}_${macro(e.pin.n || e.pin.id)}` });
            }
        }
        filas.sort((a, b) => a.gpio - b.gpio);
        mapas.push({ parte, def, filas });
    }
    return mapas;
}

export function cabeceraPines(doc, catalogo, analisis) {
    const mapas = mapaPines(doc, catalogo, analisis);
    const l = ['// pines.h — generado por Lab Studio a partir del cableado del montaje', `// Montaje: ${doc.nombre}`, '#pragma once', ''];
    if (!mapas.length) l.push('// No hay ningún microcontrolador en el montaje.');
    for (const m of mapas) {
        l.push(`// ${m.parte.ref} · ${m.def.nombre}`);
        if (!m.filas.length) l.push('// (sin GPIO cableados)');
        const ancho = Math.max(0, ...m.filas.map(f => f.macro.length));
        const usados = new Set();
        for (const f of m.filas) {
            let nombre = f.macro;
            for (let n = 2; usados.has(nombre); n++) nombre = `${f.macro}_${n}`;
            usados.add(nombre);
            l.push(`#define ${nombre.padEnd(ancho)}  ${String(f.gpio).padStart(2)}  // ${f.destino.parte.ref}.${f.destino.pin.n || f.destino.pin.id} (${f.destino.def.corto})`);
        }
        // Periféricos soldados en la propia placa: sus GPIO son fijos.
        if (m.def.fijos) {
            const pre = macro(m.def.placaCodigo || m.parte.ref);
            const todos = m.def.fijos.flatMap(([, lista]) => lista);
            const anchoF = Math.max(...todos.map(([, n]) => pre.length + n.length + 1));
            l.push('', `// Periféricos integrados en ${m.def.corto} (GPIO fijos)`);
            for (const [grupo, lista] of m.def.fijos) {
                l.push(`// ${grupo}`);
                for (const [g, n] of lista) l.push(`#define ${(pre + '_' + n).padEnd(anchoF)}  ${String(g).padStart(2)}`);
            }
        }
        l.push('');
    }
    return l.join('\n');
}

export const PLATFORMIO_CYD = `; ESP32-2432S028R «Cheap Yellow Display» (ESP32-WROOM-32, 4 MB Flash)
; Pantalla ILI9341 en HSPI y táctil XPT2046 en sus propios pines (25/32/39/33/36).
; Variante de dos USB (ST7789): cambia ILI9341_2_DRIVER por ST7789_DRIVER y
; añade -DTFT_INVERSION_OFF si los colores salen invertidos.

[env:esp32-2432s028r]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

lib_deps =
  bodmer/TFT_eSPI
  https://github.com/PaulStoffregen/XPT2046_Touchscreen.git

build_flags =
  -DUSER_SETUP_LOADED
  -DILI9341_2_DRIVER
  -DTFT_WIDTH=240
  -DTFT_HEIGHT=320
  -DUSE_HSPI_PORT
  -DTFT_MISO=12
  -DTFT_MOSI=13
  -DTFT_SCLK=14
  -DTFT_CS=15
  -DTFT_DC=2
  -DTFT_RST=-1
  -DTFT_BL=21
  -DTFT_BACKLIGHT_ON=HIGH
  -DLOAD_GLCD
  -DLOAD_FONT2
  -DLOAD_FONT4
  -DSMOOTH_FONT
  -DSPI_FREQUENCY=55000000
  -DSPI_READ_FREQUENCY=20000000
  -DSPI_TOUCH_FREQUENCY=2500000
`;

export const PLATFORMIO_C3 = `; ESP32-C3 SuperMini (ESP32-C3FN4, 4 MB Flash, USB nativo)
; Sin USB_CDC_ON_BOOT=1 el monitor serie no sale por el USB-C.

[env:esp32-c3-supermini]
platform = espressif32
board = esp32-c3-devkitm-1
framework = arduino
monitor_speed = 115200
board_build.flash_mode = dio

build_flags =
  -DARDUINO_USB_MODE=1
  -DARDUINO_USB_CDC_ON_BOOT=1
`;

export const PLATFORMIO_STAMP = `; M5StampS3 (ESP32-S3FN8, 8 MB Flash, sin PSRAM, USB nativo)
; LED RGB WS2812B en G21 y botón en G0.

[env:m5stamp-s3]
platform = espressif32
board = m5stack-stamps3
framework = arduino
monitor_speed = 115200

lib_deps =
  fastled/FastLED

build_flags =
  -DARDUINO_USB_CDC_ON_BOOT=1
`;

const PLATFORMIO_POR_PLACA = [
    [t => t.startsWith('esp32-s3'), 'ESP32-S3 N16R8', () => PLATFORMIO_INI],
    [t => t === 'esp32-2432s028r', 'ESP32 CYD 2,8"', () => PLATFORMIO_CYD],
    [t => t === 'esp32-c3-supermini', 'ESP32-C3 SuperMini', () => PLATFORMIO_C3],
    [t => t === 'm5stamp-s3', 'M5StampS3', () => PLATFORMIO_STAMP]
];

// platformio.ini de cada placa que lo tiene, en el orden en que aparecen.
export function platformioDe(doc) {
    const vistos = [];
    for (const p of doc.partes) {
        const e = PLATFORMIO_POR_PLACA.find(([es]) => es(p.tipo));
        if (e && !vistos.includes(e)) vistos.push(e);
    }
    return vistos.map(([, titulo, ini]) => ({ titulo, ini: ini() }));
}

export const PLATFORMIO_INI = `; ESP32-S3 DevKitC-1 N16R8 (16 MB Flash QIO + 8 MB PSRAM Octal)
; memory_type = qio_opi es imprescindible para que arranque la PSRAM Octal.

[env:esp32-s3-devkitc-1-n16r8]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino

board_build.arduino.memory_type = qio_opi
board_build.flash_mode = qio
board_build.psram_type = opi
board_upload.flash_size = 16MB
board_upload.maximum_size = 16777216
board_build.partitions = default_16MB.csv

; USB_CDC_ON_BOOT=0 -> "Serial" sale por el USB-C marcado UART (CH343/CP2102).
build_flags =
  -DBOARD_HAS_PSRAM
  -DARDUINO_USB_CDC_ON_BOOT=0

monitor_speed = 115200
`;
