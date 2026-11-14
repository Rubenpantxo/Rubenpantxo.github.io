// Dibujos de los componentes en SVG, vistos desde arriba y a escala
// (10 px por unidad de rejilla de 2,54 mm). Cada función devuelve el marcado
// del interior de un <g> con origen en la esquina superior izquierda de la
// huella. Los degradados comunes viven en DEFS, que hay que insertar una vez
// en el documento (y en cada SVG que se exporte).

import { U } from '../core/modelo.js';
import { bandasResistencia, COLORES_HEX } from '../core/calculos.js';

const FUENTE = `font-family="Inter,system-ui,sans-serif"`;
const MONO = `font-family="ui-monospace,'JetBrains Mono',Consolas,monospace"`;

export const DEFS = `
<linearGradient id="ls-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f3f5"/><stop offset=".45" stop-color="#c3c8ce"/><stop offset="1" stop-color="#8d949c"/></linearGradient>
<linearGradient id="ls-metal-h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef0f2"/><stop offset=".5" stop-color="#b9bfc6"/><stop offset="1" stop-color="#8b9199"/></linearGradient>
<radialGradient id="ls-oro" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#e2b93b"/><stop offset="1" stop-color="#9a7414"/></radialGradient>
<radialGradient id="ls-lente" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#5b6b86"/><stop offset=".35" stop-color="#1b2130"/><stop offset="1" stop-color="#05070b"/></radialGradient>
<linearGradient id="ls-blanco" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9dcdf"/></linearGradient>
<linearGradient id="ls-rojo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e02440"/><stop offset="1" stop-color="#a80d24"/></linearGradient>
<linearGradient id="ls-rele" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f9bf5"/><stop offset="1" stop-color="#1d5fc2"/></linearGradient>
<linearGradient id="ls-servo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f6ff0"/><stop offset="1" stop-color="#1836a8"/></linearGradient>
<radialGradient id="ls-bombilla" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#fffbe0"/><stop offset=".6" stop-color="#ffd95a"/><stop offset="1" stop-color="#f0a92a"/></radialGradient>
<linearGradient id="ls-pantalla" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d2a44"/><stop offset="1" stop-color="#0b1020"/></linearGradient>
<pattern id="ls-malla" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#15171a"/><circle cx="1.5" cy="1.5" r=".8" fill="#4a4f57"/></pattern>
<filter id="ls-sombra" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.8" flood-color="#000" flood-opacity=".32"/></filter>`;

// ------------------------------------------------------------- utilidades
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const circ = (x, y, r, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const txt = (x, y, s, size, fill = '#fff', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${FUENTE} ${extra}>${s}</text>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const placa = (w, h, color, rx = 3) =>
    rect(0, 0, w, h, color, `rx="${rx}"`) + rect(.6, .6, w - 1.2, h - 1.2, 'none', `rx="${rx}" stroke="#fff" stroke-opacity=".14" stroke-width="1"`);

// Pad dorado con taladro (pin de tira soldado).
const pad = (x, y) => circ(x, y, 3.4, 'url(#ls-oro)') + circ(x, y, 1.35, '#17130a');
// Pin macho en su cuerpo de plástico negro.
const macho = (x, y) => rect(x - 4.6, y - 4.6, 9.2, 9.2, '#16171a', 'rx="1"') + rect(x - 1.7, y - 1.7, 3.4, 3.4, 'url(#ls-oro)');
// Borna de tornillo.
const tornillo = (x, y, r = 4.2) => circ(x, y, r, 'url(#ls-metal)', 'stroke="#555" stroke-width=".5"') +
    `<path d="M${x - r * .6} ${y - r * .6}L${x + r * .6} ${y + r * .6}M${x - r * .6} ${y + r * .6}L${x + r * .6} ${y - r * .6}" stroke="#4b5057" stroke-width="1"/>`;
const taladro = (x, y, r = 5) => circ(x, y, r, 'url(#ls-oro)') + circ(x, y, r * .55, '#0c0d0f');
const chip = (x, y, w, h, t = '', size = 5) => rect(x, y, w, h, '#17181b', 'rx="1"') + circ(x + 2.2, y + 2.2, .8, '#55595f') +
    (t ? txt(x + w / 2, y + h / 2 + size * .35, esc(t), size, '#a9adb3', 'text-anchor="middle" font-weight="600"') : '');
const smd = (x, y, color = '#c8b48a', w = 4, h = 2) => rect(x, y, w, h, color) + rect(x, y, w * .22, h, '#d9dde1') + rect(x + w * .78, y, w * .22, h, '#d9dde1');
const usbc = (x, y, vertical = true) => vertical
    ? rect(x - 12, y, 24, 28, 'url(#ls-metal)', 'rx="4" stroke="#6a7078" stroke-width=".6"') + rect(x - 8, y + 21, 16, 5, '#22252a', 'rx="2.5"')
    : rect(x, y - 12, 28, 24, 'url(#ls-metal)', 'rx="4" stroke="#6a7078" stroke-width=".6"');
const wifi = (x, y, color = '#3b82f6', s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round"><path d="M-7 -2a10 10 0 0 1 14 0"/><path d="M-4.4 1.2a6.2 6.2 0 0 1 8.8 0"/><circle cx="0" cy="4.4" r="1.2" fill="${color}" stroke="none"/></g>`;

// Rótulos de serigrafía junto a cada pin, según el lado por el que sale.
function rotulos(def, color = '#e8eaed', size = 4.2, filtro = null) {
    let s = '';
    for (const p of def.pines) {
        if (filtro && !filtro(p)) continue;
        const x = p.x * U, y = p.y * U, t = esc(p.n || p.id);
        if (p.lado === 'izq') s += txt(x + 6, y + size * .36, t, size, color);
        else if (p.lado === 'der') s += txt(x - 6, y + size * .36, t, size, color, 'text-anchor="end"');
        else if (p.lado === 'aba') s += `<text transform="translate(${x + size * .36} ${y - 6}) rotate(-90)" font-size="${size}" fill="${color}" ${FUENTE}>${t}</text>`;
        else s += `<text transform="translate(${x + size * .36} ${y + 6}) rotate(-90)" text-anchor="end" font-size="${size}" fill="${color}" ${FUENTE}>${t}</text>`;
    }
    return s;
}
const pads = (def, f = pad, filtro = null) => def.pines.filter(p => !filtro || filtro(p)).map(p => f(p.x * U, p.y * U)).join('');

// ----------------------------------------------------------------- piezas
const ARTE = {
    esp32s3(def) {
        const cab = p => p.lado === 'izq' || p.lado === 'der';
        let s = placa(110, 280, '#14161a', 3);
        // Módulo WROOM-1: antena en meandro y blindaje metálico.
        s += rect(19.5, 1, 71, 101, '#1c1f24', 'rx="1.5"');
        s += `<path d="M27 22V8h8v10h7V8h7v10h7V8h7v10h7V8h8v14" fill="none" stroke="#c9a23a" stroke-width="2.2"/>`;
        s += rect(23, 28, 64, 72, 'url(#ls-metal)', 'rx="1.5" stroke="#70767e" stroke-width=".6"');
        s += txt(55, 52, 'ESPRESSIF', 6.2, '#3b4047', 'text-anchor="middle" font-weight="700" letter-spacing=".6"');
        s += txt(55, 63, 'ESP32-S3-WROOM-1', 5, '#3b4047', 'text-anchor="middle" font-weight="600"');
        s += txt(55, 72, 'N16R8', 5, '#3b4047', 'text-anchor="middle"');
        s += rect(48, 80, 14, 14, 'none', 'stroke="#59606a" stroke-width=".7"') + txt(55, 90, 'CE', 5, '#59606a', 'text-anchor="middle"');
        // Electrónica de la placa.
        s += chip(42, 150, 26, 26, 'CH343', 4.6) + chip(30, 118, 14, 9, '', 4) + chip(66, 118, 14, 9, '', 4);
        s += smd(34, 136) + smd(46, 136) + smd(60, 136) + smd(72, 136) + smd(30, 186, '#2a2c30') + smd(76, 186, '#2a2c30') + smd(52, 186);
        s += rect(49, 200, 12, 12, '#f4f4f0', 'rx="1.5"') + circ(55, 206, 3.6, '#bfe3c9') + txt(55, 221, 'RGB', 4, '#8b9199', 'text-anchor="middle"');
        for (const [x, t] of [[40, 'BOOT'], [70, 'RST']]) {
            s += rect(x - 9, 228, 18, 14, 'url(#ls-metal)', 'rx="1.5"') + circ(x, 235, 4, '#1a1b1e') + txt(x, 250, t, 4, '#c9cdd3', 'text-anchor="middle"');
        }
        s += usbc(30, 254) + usbc(80, 254);
        s += txt(30, 261, 'UART', 4.2, '#3b4047', 'text-anchor="middle" font-weight="700"') + txt(80, 261, 'USB', 4.2, '#3b4047', 'text-anchor="middle" font-weight="700"');
        s += pads(def, pad, cab) + rotulos(def, '#e8eaed', 4.4, cab);
        return s;
    },

    rpi4(def) {
        let s = placa(220, 340, '#1d7a3e', 6);
        for (const [x, y] of [[14, 14], [206, 14], [14, 244], [206, 244]]) s += circ(x, y, 7, '#e0c04a') + circ(x, y, 3.6, '#0c0d0f');
        s += rect(70, 5, 62, 12, '#2a2c30', 'rx="1"') + rect(74, 8, 54, 5, '#c9a66b') + txt(101, 26, 'DISPLAY', 4.6, '#dff3e6', 'text-anchor="middle"');
        s += rect(140, 30, 44, 40, 'url(#ls-metal)', 'rx="2" stroke="#7b828a" stroke-width=".6"');
        // Logotipo simplificado.
        s += `<g fill="none" stroke="#f3fff6" stroke-width="1.4"><circle cx="104" cy="56" r="5"/><circle cx="96" cy="64" r="5"/><circle cx="112" cy="64" r="5"/><circle cx="104" cy="72" r="5"/><path d="M98 49q6-8 12 0"/></g>`;
        s += rect(96, 88, 68, 68, 'url(#ls-metal)', 'rx="3" stroke="#7b828a" stroke-width=".6"') + txt(130, 118, 'BROADCOM', 5.4, '#474d55', 'text-anchor="middle" font-weight="700"') + txt(130, 127, 'BCM2711', 5, '#474d55', 'text-anchor="middle"');
        s += chip(98, 170, 62, 56, 'LPDDR4', 5.4) + chip(78, 244, 34, 34, 'VL805', 4.6) + chip(140, 232, 26, 22, '', 4);
        for (const [x, y] of [[40, 66], [52, 66], [40, 118], [62, 128], [52, 232], [64, 248], [126, 262], [172, 262], [44, 150]]) s += smd(x, y, '#2a2c30', 6, 4);
        s += rect(14, 168, 82, 11, '#2a2c30', 'rx="1"') + rect(18, 171, 74, 5, '#c9a66b') + txt(55, 164, 'CAMERA', 4.6, '#dff3e6', 'text-anchor="middle"');
        // Conectores del lateral izquierdo.
        s += usbc(-3, 50, false) + txt(30, 62, 'POWER IN', 4.4, '#dff3e6');
        s += rect(-3, 88, 27, 22, 'url(#ls-metal)', 'rx="2"') + txt(28, 102, 'HDMI0', 4.4, '#dff3e6');
        s += rect(-3, 132, 27, 22, 'url(#ls-metal)', 'rx="2"') + txt(28, 146, 'HDMI1', 4.4, '#dff3e6');
        s += rect(-4, 196, 44, 26, '#141518', 'rx="3"') + circ(4, 209, 6, '#2c2f34') + txt(14, 192, 'A/V', 4.4, '#dff3e6');
        s += wifi(12, 258, '#f3fff6', 1.05);
        // Conectores inferiores.
        s += rect(24, 266, 60, 78, 'url(#ls-metal-h)', 'rx="2" stroke="#70767e" stroke-width=".6"') + rect(30, 322, 20, 16, '#1b1d21') + rect(58, 322, 20, 16, '#1b1d21') + rect(32, 328, 16, 4, '#e8e8e8') + rect(60, 328, 16, 4, '#e8e8e8');
        s += rect(94, 266, 60, 78, 'url(#ls-metal-h)', 'rx="2" stroke="#70767e" stroke-width=".6"') + rect(100, 322, 20, 16, '#1b1d21') + rect(128, 322, 20, 16, '#1b1d21') + rect(102, 328, 16, 4, '#2f7ff0') + rect(130, 328, 16, 4, '#2f7ff0');
        s += rect(162, 254, 54, 90, 'url(#ls-metal-h)', 'rx="2" stroke="#70767e" stroke-width=".6"') + rect(170, 316, 38, 24, '#1b1d21', 'rx="1"');
        s += txt(54, 276, 'USB 2.0', 4.6, '#474d55', 'text-anchor="middle" font-weight="700"') + txt(124, 276, 'USB 3.0', 4.6, '#1d4fb0', 'text-anchor="middle" font-weight="700"') + txt(189, 266, 'ETHERNET', 4.4, '#474d55', 'text-anchor="middle" font-weight="700"');
        // Cabecera de 40 pines.
        s += rect(194, 24, 22, 202, '#16171a', 'rx="1.5"');
        s += def.pines.filter(p => p.fisico).map(p => rect(p.x * U - 1.8, p.y * U - 1.8, 3.6, 3.6, 'url(#ls-oro)')).join('');
        s += `<text transform="translate(188 30) rotate(90)" font-size="4.6" fill="#dff3e6" ${FUENTE}>GPIO · pin 1</text>`;
        s += `<text transform="translate(176 96) rotate(90)" font-size="5" fill="#dff3e6" ${FUENTE}>Raspberry Pi 4 Model B</text>`;
        return s;
    },

    pc() {
        let s = rect(18, 2, 164, 98, '#2b2e33', 'rx="6"') + rect(24, 8, 152, 84, 'url(#ls-pantalla)', 'rx="2"');
        const lineas = [['#7dd3fc', 70], ['#a7f3d0', 96], ['#fca5a5', 54], ['#e5e7eb', 110], ['#fde68a', 82], ['#a7f3d0', 62]];
        lineas.forEach(([c, w], i) => { s += rect(34 + (i % 3) * 8, 20 + i * 10, w, 3, c, 'rx="1.5" opacity=".85"'); });
        s += `<path d="M6 102h188l-8 32H14z" fill="url(#ls-metal)" stroke="#7b828a" stroke-width=".6"/>`;
        s += rect(30, 107, 140, 16, '#3a3e45', 'rx="2"') + rect(78, 126, 44, 6, '#aab0b8', 'rx="2"');
        for (const y of [30, 60, 90]) s += rect(184, y - 6, 16, 12, 'url(#ls-metal)', 'rx="1.5"') + rect(188, y - 2, 10, 4, y === 90 ? '#e8e8e8' : '#2f7ff0');
        s += wifi(8, 50, '#3b82f6', 1.1);
        return s;
    },

    coral() {
        let s = rect(0, 0, 260, 120, 'url(#ls-blanco)', 'rx="12" stroke="#b9bec4" stroke-width=".8"');
        for (let x = 78; x <= 228; x += 7.5) s += rect(x, 12, 3.2, 96, '#c9ced4', 'rx="1.6"') + rect(x + 3.2, 12, 1, 96, '#fff', 'opacity=".8"');
        s += rect(12, 12, 56, 96, '#fafafa', 'rx="7" stroke="#d5d9de" stroke-width=".6"');
        s += txt(40, 56, 'Coral', 13, '#ff6f5e', 'text-anchor="middle" font-weight="700"');
        s += txt(40, 70, 'Edge TPU', 5.4, '#8b9199', 'text-anchor="middle"') + txt(40, 79, 'USB Accelerator', 4.6, '#8b9199', 'text-anchor="middle"');
        s += circ(240, 24, 1.8, '#9fe3b4');
        s += rect(244, 47, 18, 26, '#2b2e33', 'rx="6"') + rect(249, 52, 12, 16, '#101114', 'rx="5"');
        return s;
    },

    mc210() {
        let s = `<ellipse cx="70" cy="166" rx="62" ry="13" fill="#1d2025"/><path d="M12 150q58 26 116 0v14q-58 22-116 0z" fill="#2a2e34"/>`;
        s += `<path d="M12 152V62C12 26 38 4 70 4s58 22 58 58v90q-58 22-116 0z" fill="url(#ls-blanco)" stroke="#c3c8ce" stroke-width=".8"/>`;
        s += rect(34, 14, 72, 80, '#0d0f13', 'rx="30"') + rect(36, 16, 68, 76, 'none', 'rx="28" stroke="#3a3f47" stroke-width="1"');
        s += circ(70, 56, 25, '#161a21', 'stroke="#8f96a0" stroke-width="1.2"') + circ(70, 56, 17, 'url(#ls-lente)') + circ(70, 56, 7, '#04060a') + circ(65, 50, 2.6, '#9fb4d6', 'opacity=".8"');
        s += circ(70, 24, 2.2, '#c8f24a') + circ(70, 86, 1, '#4a4f57');
        s += txt(70, 132, 'MERCUSYS', 9, '#aeb4bb', 'text-anchor="middle" font-weight="700" letter-spacing=".5"');
        s += wifi(128, 58, '#3b82f6', 1.1);
        return s;
    },

    webcam() {
        let s = `<path d="M60 62V100" stroke="#2a2d32" stroke-width="5" stroke-linecap="round"/><path d="M34 62h52l8 20H26z" fill="#3a3e45"/>`;
        s += rect(8, 12, 104, 50, '#4a4f58', 'rx="25"') + rect(9, 13, 102, 22, '#fff', 'rx="20" opacity=".08"');
        s += circ(60, 37, 19, '#15171b', 'stroke="#9097a1" stroke-width="1.4"') + circ(60, 37, 13, 'url(#ls-lente)') + circ(60, 37, 5, '#04060a') + circ(56, 33, 2, '#9fb4d6', 'opacity=".8"');
        for (const x of [22, 27, 32, 88, 93, 98]) s += circ(x, 37, 1, '#1d2025');
        s += circ(84, 22, 1.4, '#7dd3fc') + txt(60, 78, 'UGREEN', 4.6, '#c9cdd3', 'text-anchor="middle" font-weight="700"');
        return s;
    },

    inmp441(def) {
        let s = circ(30, 30, 29.5, '#121316') + circ(30, 30, 29, 'none', 'stroke="#fff" stroke-opacity=".12"');
        s += `<path d="M9 17A25 25 0 0 1 51 17" fill="none" stroke="#d9b13f" stroke-width="2.6"/><path d="M9 43A25 25 0 0 0 51 43" fill="none" stroke="#d9b13f" stroke-width="2.6"/>`;
        s += circ(30, 30, 3.6, 'url(#ls-oro)') + circ(30, 30, 1.5, '#0c0d0f') + rect(34, 34, 9, 4.5, '#f4f4f0', 'rx="2.2"');
        s += pads(def) + rotulos(def, '#f1f3f5', 3.8);
        return s;
    },

    sg90() {
        let s = rect(2, 20, 92, 20, '#2f55d6', 'rx="2" opacity=".85"') + circ(9, 30, 2.6, '#e7ecff') + circ(87, 30, 2.6, '#e7ecff');
        s += rect(15, 9, 66, 42, 'url(#ls-servo)', 'rx="3" stroke="#12287c" stroke-width=".8"') + rect(17, 11, 62, 10, '#fff', 'rx="2" opacity=".14"');
        s += circ(33, 30, 12, '#4d7bff', 'stroke="#12287c" stroke-width=".8"');
        s += `<g transform="rotate(-28 33 30)"><rect x="27.5" y="2" width="11" height="56" rx="5.5" fill="#fbfbfb" stroke="#c9ced4" stroke-width=".6"/>${[8, 15, 45, 52].map(y => circ(33, y, 1.1, '#b9bec4')).join('')}</g>`;
        s += circ(33, 30, 4.2, '#e9ecef', 'stroke="#aeb4bb" stroke-width=".6"') + circ(33, 30, 1.6, '#6b7178');
        s += rect(52, 17, 24, 26, '#1b1b1d', 'rx="1"') + rect(53.5, 18.5, 21, 23, 'none', 'stroke="#d9b13f" stroke-width=".8"');
        s += txt(64, 27, 'Micro', 4.2, '#e8c860', 'text-anchor="middle"') + txt(64, 33, 'Servo 9g', 4, '#e8c860', 'text-anchor="middle"') + txt(64, 39.5, 'SG90', 4.6, '#e8c860', 'text-anchor="middle" font-weight="700"');
        [['#6b3f1d', 20], ['#d62828', 30], ['#f28c28', 40]].forEach(([c, y], i) => {
            s += `<path d="M81 ${27 + i * 3}C96 ${27 + i * 3} 96 ${y} 110 ${y}" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`;
        });
        s += rect(108, 14, 20, 32, '#16171a', 'rx="1.5"') + [20, 30, 40].map(y => rect(118.3, y - 1.7, 3.4, 3.4, 'url(#ls-oro)')).join('');
        return s;
    },

    shelly(def) {
        let s = rect(2, 12, 136, 106, 'url(#ls-rojo)', 'rx="10" stroke="#7d0a1b" stroke-width=".8"') + rect(4, 14, 132, 20, '#fff', 'rx="9" opacity=".08"');
        s += rect(18, 1, 44, 28, '#16171a', 'rx="2"') + rect(78, 1, 44, 28, '#16171a', 'rx="2"') + rect(62, 8, 16, 21, '#202226');
        s += def.pines.filter(p => p.dom === 'ac').map(p => tornillo(p.x * U, p.y * U + 3, 6)).join('');
        s += `<path d="M21 46V36h38v10M81 46V36h38v10M40 36v10M100 36v10" fill="none" stroke="#fff" stroke-width=".9"/>`;
        for (const [x, t] of [[30, 'SW'], [50, 'O'], [90, 'L'], [110, 'N']]) s += txt(x, 46, t, 8, '#fff', 'text-anchor="middle" font-weight="500"');
        s += txt(70, 61, 'Shelly 1PM Mini Gen3', 7, '#fff', 'text-anchor="middle" font-weight="600"');
        s += txt(70, 70, '110-240 VAC, 50/60 Hz', 5.6, '#fff', 'text-anchor="middle"') + txt(70, 78, 'max. 8 A / 2000 W @ 240 VAC', 5.2, '#fff', 'text-anchor="middle"');
        s += txt(52, 104, 'Shelly', 18, '#fff', 'text-anchor="middle" font-weight="800" font-style="italic"');
        s += rect(82, 91, 32, 15, '#fff', 'rx="5"') + txt(98, 102, 'Gen3', 8, '#c8102e', 'text-anchor="middle" font-weight="800" font-style="italic"');
        s += wifi(128, 78, '#fff', .9);
        return s;
    },

    hcsr04(def) {
        let s = placa(180, 80, '#1a5fb4', 2);
        for (const x of [38, 142]) {
            s += circ(x, 34, 28, 'url(#ls-metal)', 'stroke="#70767e" stroke-width=".6"') + circ(x, 34, 22, 'url(#ls-malla)') + circ(x, 34, 22, 'none', 'stroke="#2a2d32" stroke-width="1.4"');
        }
        s += rect(78, 8, 24, 10, 'url(#ls-metal)', 'rx="5"') + txt(90, 34, 'HC-SR04', 6.4, '#fff', 'text-anchor="middle" font-weight="700"');
        s += txt(38, 76, 'T', 6, '#fff', 'text-anchor="middle"') + txt(142, 76, 'R', 6, '#fff', 'text-anchor="middle"');
        s += pads(def, macho) + rotulos(def, '#fff', 4.2);
        return s;
    },

    modulo(def) {
        const w = def.w * U, h = def.h * U, a = def.arte || {};
        let s = placa(w, h, a.pcb || '#1b4f9c', 2);
        const filas = new Set(def.pines.map(p => p.y));
        const y0 = filas.has(1) ? 30 : 6, y1 = filas.has(def.h - 1) ? h - 30 : h - 6;
        const lado = Math.max(8, Math.min(w - 16, y1 - y0 - 8, 20));
        s += chip(w / 2 - lado / 2, (y0 + y1) / 2 - lado / 2 + 3, lado, lado, a.chip || '', Math.min(5, lado * .34));
        s += txt(w / 2, y0 + 5, esc(a.etiqueta || def.corto), 4.6, '#fff', 'text-anchor="middle" font-weight="700"');
        if (w >= 60) s += smd(6, (y0 + y1) / 2) + smd(w - 10, (y0 + y1) / 2, '#2a2c30');
        s += pads(def) + rotulos(def, '#fff', 3.8);
        return s;
    },

    pir(def) {
        let s = placa(130, 100, '#1f8a4c', 2) + circ(8, 8, 3, '#0c0d0f') + circ(122, 8, 3, '#0c0d0f');
        s += circ(65, 42, 35, '#f6f6f2', 'stroke="#c9ced4" stroke-width=".8"');
        for (let i = 0; i < 6; i++) s += `<path d="M65 42L${65 + 35 * Math.cos(i * Math.PI / 3)} ${42 + 35 * Math.sin(i * Math.PI / 3)}" stroke="#d5d9de" stroke-width=".8"/>`;
        s += circ(65, 42, 22, 'none', 'stroke="#d5d9de" stroke-width=".8"') + circ(65, 42, 10, 'none', 'stroke="#d5d9de" stroke-width=".8"');
        for (const x of [16, 114]) s += rect(x - 8, 78, 16, 16, '#f28c28', 'rx="2"') + circ(x, 86, 4, '#fbe3c2') + rect(x - 3.5, 85.3, 7, 1.4, '#a0561a');
        s += pads(def, macho) + rotulos(def, '#fff', 4.2);
        return s;
    },

    rele2(def) {
        let s = placa(200, 150, '#123f7d', 3);
        for (const [x, y] of [[8, 8], [8, 142], [154, 76]]) s += circ(x, y, 3, '#0c0d0f');
        for (const y of [8, 82]) {
            s += rect(66, y, 86, 60, 'url(#ls-rele)', 'rx="3" stroke="#143f8a" stroke-width=".8"');
            s += txt(109, y + 20, 'SONGLE', 7.5, '#eaf2ff', 'text-anchor="middle" font-weight="700"') + txt(109, y + 30, 'SRD-05VDC-SL-C', 5.4, '#eaf2ff', 'text-anchor="middle"');
            s += txt(109, y + 40, '10A 250VAC  10A 30VDC', 4.4, '#eaf2ff', 'text-anchor="middle"');
            s += rect(170, y + 2, 30, 60, '#2a8f5a', 'rx="2" stroke="#16603a" stroke-width=".6"');
        }
        s += def.pines.filter(p => p.tipo === 'pas').map(p => tornillo(p.x * U, p.y * U, 5.2)).join('');
        s += chip(30, 40, 20, 12, '', 4) + chip(30, 96, 20, 12, '', 4) + circ(56, 30, 2.4, '#ff5a4d') + circ(56, 122, 2.4, '#ff5a4d') + circ(24, 118, 2.4, '#5fe07a');
        s += smd(34, 64, '#2a2c30', 8, 4) + smd(34, 78, '#2a2c30', 8, 4);
        s += txt(34, 22, '2 Relay Module', 5, '#dbe7ff', 'text-anchor="middle"');
        s += pads(def, macho, p => p.tipo !== 'pas') + rotulos(def, '#fff', 4.4);
        return s;
    },

    zumbador(def) {
        let s = placa(50, 70, '#1b1d21', 2) + circ(25, 24, 18, '#111214', 'stroke="#3a3e45" stroke-width="1"') + circ(25, 24, 13, '#1c1e22') + circ(25, 24, 2.6, '#000');
        s += txt(25, 12, '+', 6, '#c9cdd3', 'text-anchor="middle"');
        s += pads(def, macho) + rotulos(def, '#fff', 3.8);
        return s;
    },

    oled(def) {
        let s = placa(110, 110, '#1b4f9c', 3);
        for (const [x, y] of [[7, 7], [103, 7], [7, 103], [103, 103]]) s += taladro(x, y, 4);
        s += rect(5, 24, 100, 64, '#0b0c0f', 'rx="1.5"') + rect(9, 28, 92, 50, '#020308');
        s += `<text x="14" y="42" font-size="8" fill="#8fe9ff" ${MONO} font-weight="700">LAB STUDIO</text>`;
        s += `<text x="14" y="54" font-size="6" fill="#e8fbff" ${MONO}>persona 0.94</text><text x="14" y="63" font-size="6" fill="#e8fbff" ${MONO}>31 fps  2.4 ms</text>`;
        s += rect(14, 68, 60, 4, '#12323a') + rect(14, 68, 44, 4, '#8fe9ff');
        s += rect(34, 88, 42, 14, '#8a5a2b', 'rx="1"') + rect(38, 90, 34, 10, '#a8733a');
        s += pads(def, macho) + def.pines.map(p => txt(p.x * U, 21.5, esc(p.n), 3.6, '#fff', 'text-anchor="middle"')).join('');
        return s;
    },

    tira(def) {
        let s = rect(0, 3, 220, 34, '#f2f1ec', 'rx="2" stroke="#cfd3d8" stroke-width=".6"');
        s += def.pines.map(p => rect(p.x * U - 5, p.y * U - 3.6, 10, 7.2, '#d9a441', 'rx="1"')).join('');
        s += rotulos(def, '#555', 3.8);
        const tonos = ['#ff4d4d', '#ffa64d', '#ffe24d', '#6fe06f', '#4dc3ff', '#6f7dff', '#c56bff'];
        for (let i = 0, x = 38; x < 214; x += 22, i++) {
            s += rect(x - 6, 14, 12, 12, '#fbfbfb', 'rx="1.5" stroke="#b9bec4" stroke-width=".6"') + circ(x, 20, 4, tonos[i % tonos.length], 'opacity=".9"');
            s += smd(x + 8, 9, '#2a2c30', 4, 2.4);
            if (i % 3 === 2) s += `<path d="M${x + 11} 5v30" stroke="#b9bec4" stroke-width=".6" stroke-dasharray="2 2"/>`;
        }
        return s;
    },

    led() {
        return `<path d="M6 30V40L0 50M14 30V40L20 50" fill="none" stroke="#b9bec4" stroke-width="1.6" stroke-linecap="round"/>` +
            `<path d="M2 26V11a8 8 0 0 1 16 0V26z" fill="#ff3b30" stroke="#b3231a" stroke-width=".6"/>` + rect(0, 25, 20, 4.5, '#e02d23', 'rx="1"') +
            `<path d="M5 12a5 5 0 0 1 4-5" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>` +
            txt(5, 44, '+', 5, '#8b9199', 'text-anchor="middle"');
    },

    hub(def) {
        let s = rect(2, 6, 196, 62, '#3a3e45', 'rx="9" stroke="#1d2025" stroke-width=".8"') + rect(4, 8, 192, 16, '#fff', 'rx="8" opacity=".07"');
        s += txt(100, 30, 'USB 3.0 HUB', 8, '#e8eaed', 'text-anchor="middle" font-weight="700" letter-spacing=".8"') + txt(100, 41, '4 puertos · fuente 5 V / 3 A', 5, '#aeb4bb', 'text-anchor="middle"');
        s += circ(186, 16, 2, '#7dd3fc');
        s += def.pines.filter(p => p.tipo === 'usb_host').map(p => rect(p.x * U - 11, 60, 22, 16, 'url(#ls-metal)', 'rx="1.5"') + rect(p.x * U - 8, 66, 16, 4.5, '#2f7ff0')).join('');
        s += rect(-4, 31, 14, 18, '#1b1d21', 'rx="3"');
        return s;
    },

    fuente() {
        let s = rect(0, 2, 72, 76, '#22252a', 'rx="6" stroke="#0c0d0f" stroke-width=".8"') + rect(8, 12, 52, 44, '#eceae3', 'rx="2"');
        s += txt(34, 28, '5 V ⎓ 3 A', 9, '#22252a', 'text-anchor="middle" font-weight="800"') + txt(34, 39, '15 W', 6, '#474d55', 'text-anchor="middle"') + txt(34, 49, 'IN 100-240 V~', 4.6, '#474d55', 'text-anchor="middle"');
        s += rect(66, 18, 24, 44, '#2a8f5a', 'rx="2"') + tornillo(80, 30, 5.4) + tornillo(80, 50, 5.4) + txt(70, 33, '+', 7, '#fff', 'text-anchor="middle" font-weight="700"') + txt(70, 53, '−', 7, '#fff', 'text-anchor="middle" font-weight="700"');
        return s;
    },

    fuenteusb() {
        let s = rect(-6, 22, 10, 5, 'url(#ls-metal)') + rect(-6, 42, 10, 5, 'url(#ls-metal)');
        s += rect(2, 4, 60, 62, 'url(#ls-blanco)', 'rx="10" stroke="#b9bec4" stroke-width=".8"');
        s += txt(32, 32, '5,1 V', 10, '#3a3e45', 'text-anchor="middle" font-weight="800"') + txt(32, 44, '3 A · USB-C', 5.6, '#70767e', 'text-anchor="middle"');
        s += `<path d="M62 30H74" stroke="#e8e8e6" stroke-width="5" stroke-linecap="round"/>` + rect(70, 24, 12, 12, 'url(#ls-metal)', 'rx="3"');
        return s;
    },

    resistencia(def, parte) {
        const bandas = bandasResistencia(leerOhmios((parte && parte.valor) || def.valor)) || ['rojo', 'rojo', 'marrón', 'oro'];
        let s = `<path d="M0 10H60" stroke="#b9bec4" stroke-width="1.6" stroke-linecap="round"/>`;
        s += `<path d="M14 5q4-3 8 0h16q4-3 8 0v10q-4 3-8 0H22q-4 3-8 0z" fill="#e2c9a0" stroke="#b09465" stroke-width=".6"/>`;
        [18, 25, 31, 41].forEach((x, i) => { s += rect(x - 1.4, i === 0 || i === 3 ? 3.6 : 5.2, 2.8, i === 0 || i === 3 ? 12.8 : 9.6, COLORES_HEX[bandas[i]]); });
        return s;
    },

    pulsador() {
        let s = `<path d="M0 20H8M32 20H40" stroke="#b9bec4" stroke-width="1.8" stroke-linecap="round"/>`;
        s += rect(6, 6, 28, 28, 'url(#ls-metal)', 'rx="2.5" stroke="#70767e" stroke-width=".6"') + circ(20, 20, 9, '#1b1d21') + circ(20, 20, 6.5, '#2c2f34');
        for (const [x, y] of [[10, 10], [30, 10], [10, 30], [30, 30]]) s += circ(x, y, 1.3, '#6b7178');
        return s;
    },

    router(def) {
        let s = rect(18, 0, 6, 24, '#22252a', 'rx="3"') + rect(116, 0, 6, 24, '#22252a', 'rx="3"');
        s += rect(2, 16, 136, 52, '#2b2e33', 'rx="9" stroke="#0c0d0f" stroke-width=".8"') + rect(4, 18, 132, 14, '#fff', 'rx="7" opacity=".07"');
        s += wifi(70, 34, '#7dd3fc', 1.5);
        for (let i = 0; i < 5; i++) s += circ(48 + i * 11, 54, 1.8, i < 3 ? '#5fe07a' : '#3a3e45');
        s += def.pines.map(p => rect(p.x * U - 6, 64, 12, 12, '#16171a', 'rx="1.5"') + rect(p.x * U - 3.5, 68, 7, 5, '#e2b93b')).join('');
        return s;
    },

    toma(def) {
        let s = rect(0, 0, 80, 70, '#e7e9ec', 'rx="6" stroke="#9aa0a8" stroke-width=".8"') + rect(6, 6, 68, 34, '#fafafa', 'rx="3" stroke="#cfd3d8" stroke-width=".6"');
        s += `<path d="M22 12l-8 13h7l-3 11 10-15h-7z" fill="#f2b705" stroke="#8a6a00" stroke-width=".5"/>`;
        s += txt(50, 22, '230 V', 9, '#22252a', 'text-anchor="middle" font-weight="800"') + txt(50, 32, '~ 50 Hz', 5.4, '#70767e', 'text-anchor="middle"');
        const color = { L: '#7b4a1e', N: '#2a62c9', PE: '#3aa655' };
        s += def.pines.map(p => rect(p.x * U - 7, 46, 14, 34, color[p.id], 'rx="2"') + (p.id === 'PE' ? rect(p.x * U - 2.4, 46, 4.8, 34, '#f2d024') : '') +
            tornillo(p.x * U, 72, 4.6) + txt(p.x * U, 58, p.id, 6.4, '#fff', 'text-anchor="middle" font-weight="800"')).join('');
        return s;
    },

    magneto(def) {
        let s = rect(0, 0, 40, 140, '#f3f4f1', 'rx="3" stroke="#aeb4bb" stroke-width=".8"') + rect(0, 22, 40, 96, '#fff', 'opacity=".5"');
        s += def.pines.map(p => rect(p.x * U - 7, p.y ? 122 : 2, 14, 16, '#c9ced4', 'rx="1.5"') + tornillo(p.x * U, p.y ? 132 : 8, 4.6)).join('');
        s += rect(6, 44, 28, 44, '#e3e5e8', 'rx="2" stroke="#b9bec4" stroke-width=".6"') + rect(13, 50, 14, 24, '#1f5fc2', 'rx="2"') + rect(13, 50, 14, 7, '#4f8cf0', 'rx="2"');
        s += rect(14, 79, 12, 5, '#d62828', 'rx="1"');
        s += txt(20, 34, 'C10', 9, '#22252a', 'text-anchor="middle" font-weight="800"') + txt(20, 102, '1P+N', 5.4, '#474d55', 'text-anchor="middle"') + txt(20, 110, '6000', 5, '#474d55', 'text-anchor="middle"');
        s += txt(10, 26, 'L', 5, '#7b4a1e', 'text-anchor="middle" font-weight="800"') + txt(30, 26, 'N', 5, '#2a62c9', 'text-anchor="middle" font-weight="800"');
        return s;
    },

    lampara(def) {
        let s = circ(30, 30, 30, '#ffd95a', 'opacity=".18"') + circ(30, 30, 24, 'url(#ls-bombilla)', 'stroke="#d99a1e" stroke-width=".6"');
        s += `<path d="M22 34q4-10 8 0t8 0" fill="none" stroke="#b9770f" stroke-width="1.2"/>` + `<path d="M21 14a14 14 0 0 1 9-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
        s += `<path d="M18 50h24l-3 24H21z" fill="url(#ls-metal-h)" stroke="#70767e" stroke-width=".6"/>` + [56, 62, 68].map(y => `<path d="M19 ${y}h22" stroke="#70767e" stroke-width=".8"/>`).join('');
        s += def.pines.map(p => rect(p.x * U - 5, 74, 10, 16, p.id === 'L' ? '#7b4a1e' : '#2a62c9', 'rx="1.5"') + txt(p.x * U, 86, p.id, 5.6, '#fff', 'text-anchor="middle" font-weight="800"')).join('');
        return s;
    },

    interruptor(def) {
        let s = rect(2, 0, 66, 66, 'url(#ls-blanco)', 'rx="7" stroke="#b9bec4" stroke-width=".8"');
        s += rect(18, 10, 34, 46, '#f7f8f9', 'rx="3" stroke="#c3c8ce" stroke-width=".8"') + rect(18, 10, 34, 22, '#e3e6ea', 'rx="3"') + rect(33, 16, 4, 10, '#9aa0a8', 'rx="2"');
        s += def.pines.map(p => rect(p.x * U - 5, 62, 10, 18, '#c9ced4', 'rx="1.5"') + tornillo(p.x * U, 73, 4.2)).join('');
        return s;
    }
};

// Lee «220 Ω», «4,7k», «10 kΩ», «1M»… como ohmios.
export function leerOhmios(texto) {
    const m = /^\s*([\d.,]+)\s*([kKmMrR]?)/.exec(String(texto || ''));
    if (!m) return NaN;
    const n = parseFloat(m[1].replace(',', '.'));
    const f = { k: 1e3, K: 1e3, M: 1e6, m: 1e-3 }[m[2]] || 1;
    return n * f;
}

// Piezas cuyo dibujo depende de la instancia (no se pueden compartir).
export const DIBUJO_POR_INSTANCIA = new Set(['resistencia']);

export function dibujar(def, parte = null) {
    const f = ARTE[def.dibujo] || ARTE.modulo;
    return f(def, parte);
}

// SVG autónomo para miniaturas y fichas.
export function miniatura(def, { margen = 6, clase = '' } = {}) {
    const w = def.w * U, h = def.h * U;
    return `<svg class="${clase}" viewBox="${-margen} ${-margen} ${w + 2 * margen} ${h + 2 * margen}" role="img" aria-label="${esc(def.nombre)}"><g filter="url(#ls-sombra)">${dibujar(def)}</g></svg>`;
}
