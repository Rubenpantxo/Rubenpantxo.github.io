// Calculadoras. Cada una se declara con sus campos y una función que devuelve
// filas de resultado; la interfaz se genera a partir de la declaración y las
// fórmulas viven en core/calculos.js (con pruebas).

import * as C from '../core/calculos.js';
import { esc, ico } from './util.js';

const n = (v, d = 2) => Number.isFinite(v) ? (+v.toFixed(d)).toLocaleString('es-ES', { maximumFractionDigits: d }) : '—';
const fila = (t, v, extra = {}) => ({ t, v, ...extra });

export const CALCULADORAS = [
    {
        id: 'ohm', grupo: 'Electrónica', titulo: 'Ley de Ohm', formula: 'V = I · R    P = V · I',
        desc: 'Rellena dos magnitudes cualesquiera y deja las otras vacías.',
        campos: [{ k: 'v', t: 'Tensión', u: 'V', v: 3.3 }, { k: 'i', t: 'Corriente', u: 'mA', v: '' }, { k: 'r', t: 'Resistencia', u: 'Ω', v: 220 }, { k: 'p', t: 'Potencia', u: 'W', v: '' }],
        calc: ({ v, i, r, p }) => {
            const s = C.ohm({ v, i: i / 1000, r, p });
            if (!s) return [fila('Faltan datos', 'Indica dos magnitudes', { nivel: 'info' })];
            return [fila('Tensión', C.si(s.v, 'V')), fila('Corriente', C.si(s.i, 'A')), fila('Resistencia', C.si(s.r, 'Ω')), fila('Potencia', C.si(s.p, 'W'), s.p > 0.25 ? { nivel: 'aviso', nota: 'Supera 1/4 W: usa una resistencia de más potencia.' } : {})];
        }
    },
    {
        id: 'divisor', grupo: 'Electrónica', titulo: 'Divisor de tensión', formula: 'Vout = Vin · R2 / (R1 + R2)',
        desc: 'Para bajar una señal de 5 V a un GPIO de 3,3 V, o leer una batería con el ADC.',
        campos: [{ k: 'vin', t: 'Tensión de entrada', u: 'V', v: 5 }, { k: 'r1', t: 'R1 (arriba)', u: 'Ω', v: 1000 }, { k: 'r2', t: 'R2 (a masa)', u: 'Ω', v: 2000 }, { k: 'objetivo', t: 'Salida deseada (opcional)', u: 'V', v: 3.3 }],
        calc: ({ vin, r1, r2, objetivo }) => {
            if (!(vin > 0 && r1 > 0 && r2 > 0)) return [fila('Faltan datos', 'Vin, R1 y R2', { nivel: 'info' })];
            const d = C.divisor({ vin, r1, r2 });
            const out = [
                fila('Tensión de salida', C.si(d.vout, 'V'), d.vout > 3.6 ? { nivel: 'error', nota: 'Supera los 3,6 V que admite un GPIO de 3,3 V.' } : { nivel: 'ok' }),
                fila('Corriente por el divisor', C.si(d.i, 'A')), fila('Impedancia de salida', C.si(d.rth, 'Ω'), d.rth > 10000 ? { nota: 'Alta para un ADC: añade 100 nF en la salida.' } : {})
            ];
            const s = objetivo > 0 && C.divisorPara({ vin, vout: objetivo, r2 });
            if (s) out.push(fila(`Para ${n(objetivo)} V con R2 = ${C.si(s.r2, 'Ω')}`, `R1 = ${C.si(s.r1, 'Ω')} → ${C.si(s.vout, 'V')}`, { nota: 'Valores de la serie E24; R1 redondeada hacia arriba para no pasarse.' }));
            return out;
        }
    },
    {
        id: 'led', grupo: 'Electrónica', titulo: 'Resistencia para LED', formula: 'R = (Vs − n · Vf) / I',
        desc: 'Caída típica: rojo 1,8–2,1 V · verde 2,0–3,2 V · azul y blanco 3,0–3,3 V.',
        campos: [{ k: 'vs', t: 'Tensión de alimentación', u: 'V', v: 3.3 }, { k: 'vf', t: 'Caída del LED', u: 'V', v: 2 }, { k: 'imA', t: 'Corriente', u: 'mA', v: 10 }, { k: 'n', t: 'LED en serie', u: '', v: 1 }],
        calc: v => {
            const s = C.ledResistencia(v);
            if (!s) return [fila('Sin solución', 'La alimentación no supera la caída de los LED', { nivel: 'error' })];
            return [fila('Resistencia exacta', C.si(s.r, 'Ω')), fila('Valor normalizado (E24)', C.si(s.rn, 'Ω'), { nivel: 'ok' }), fila('Corriente real', n(s.ireal_mA, 1) + ' mA', s.ireal_mA > 20 ? { nivel: 'aviso', nota: 'Un GPIO del ESP32-S3 da 20 mA de forma segura.' } : {}), fila('Potencia en la resistencia', C.si(s.p, 'W'))];
        },
        extra: v => { const s = C.ledResistencia(v); return s ? bandas(s.rn) : ''; }
    },
    {
        id: 'bandas', grupo: 'Electrónica', titulo: 'Código de colores', formula: '2 cifras · multiplicador · tolerancia',
        desc: 'Bandas de una resistencia de cuatro anillos al 5 %.',
        campos: [{ k: 'r', t: 'Resistencia', u: 'Ω', v: 4700 }],
        calc: ({ r }) => { const b = C.bandasResistencia(r); return b ? [fila('Valor', C.si(r, 'Ω')), fila('Bandas', b.join(' · '))] : [fila('Fuera de rango', 'De 0,1 Ω a 99 GΩ', { nivel: 'info' })]; },
        extra: ({ r }) => bandas(r)
    },
    {
        id: 'pullup', grupo: 'Buses y señales', titulo: 'Pull-up de I²C', formula: 'Rmín = (VDD − 0,4) / IOL    Rmáx = tr / (0,8473 · Cb)',
        desc: 'Margen válido según la capacidad del bus (unos 10 pF por dispositivo más 1 pF/cm de cable).',
        campos: [{ k: 'vdd', t: 'Tensión del bus', u: 'V', v: 3.3 }, { k: 'cb_pF', t: 'Capacidad del bus', u: 'pF', v: 100 }, { k: 'modo', t: 'Velocidad', op: [['standard', '100 kHz'], ['fast', '400 kHz'], ['fast+', '1 MHz']], v: 'fast' }],
        calc: v => {
            const s = C.pullupI2C(v);
            return [fila('Mínima', C.si(s.rmin, 'Ω')), fila('Máxima', C.si(s.rmax, 'Ω')), s.viable ? fila('Recomendada', C.si(s.recomendada, 'Ω'), { nivel: 'ok', nota: 'Muchos módulos ya traen 4,7 kΩ o 10 kΩ: varios en paralelo bajan el valor.' }) : fila('Sin margen', 'Reduce la capacidad o la velocidad', { nivel: 'error' })];
        }
    },
    {
        id: 'rc', grupo: 'Buses y señales', titulo: 'Filtro RC', formula: 'fc = 1 / (2π · R · C)',
        desc: 'Paso bajo para suavizar una lectura del ADC o quitar rebotes a un pulsador.',
        campos: [{ k: 'r', t: 'Resistencia', u: 'Ω', v: 10000 }, { k: 'c_nF', t: 'Condensador', u: 'nF', v: 100 }],
        calc: v => { if (!(v.r > 0 && v.c_nF > 0)) return [fila('Faltan datos', 'R y C', { nivel: 'info' })]; const s = C.filtroRC(v); return [fila('Frecuencia de corte', C.si(s.fc, 'Hz'), { nivel: 'ok' }), fila('Constante de tiempo', C.si(s.tau, 's')), fila('Asentamiento al 99 %', C.si(s.t99, 's'))]; }
    },
    {
        id: 'adc', grupo: 'Buses y señales', titulo: 'ADC del ESP32-S3', formula: 'V = lectura / (2ⁿ − 1) · fondo de escala',
        desc: 'El fondo de escala depende de la atenuación configurada.',
        campos: [{ k: 'cuentas', t: 'Lectura', u: 'cuentas', v: 2048 }, { k: 'bits', t: 'Resolución', op: [[12, '12 bit'], [10, '10 bit'], [9, '9 bit']], v: 12 }, { k: 'atenuacion', t: 'Atenuación', op: Object.keys(C.ADC_ATENUACION).map(k => [k, k]), v: '12 dB' }],
        calc: v => { const s = C.adc({ ...v, bits: +v.bits }); return [fila('Tensión', C.si(s.v, 'V'), { nivel: 'ok' }), fila('Fondo de escala', C.si(s.fondo, 'V')), fila('Resolución', C.si(s.resolucion, 'V') + ' por cuenta')]; }
    },
    {
        id: 'servo', grupo: 'Buses y señales', titulo: 'PWM de servo (LEDC)', formula: 'ciclo = pulso / periodo',
        desc: 'Del ángulo al valor de ciclo que se escribe en el periférico LEDC.',
        campos: [{ k: 'grados', t: 'Ángulo', u: '°', v: 90 }, { k: 'min_us', t: 'Pulso a 0°', u: 'µs', v: 500 }, { k: 'max_us', t: 'Pulso a 180°', u: 'µs', v: 2400 }, { k: 'hz', t: 'Frecuencia', u: 'Hz', v: 50 }, { k: 'bits', t: 'Resolución', op: [[14, '14 bit'], [12, '12 bit'], [10, '10 bit'], [16, '16 bit']], v: 14 }],
        calc: v => { const us = C.servoAngulo(v); const s = C.servoPwm({ pulso_us: us, hz: v.hz, bits: +v.bits }); return [fila('Ancho de pulso', n(us, 0) + ' µs'), fila('Ciclo de trabajo', n(s.ciclo_pct, 2) + ' %'), fila('Valor LEDC', String(s.cuentas), { nivel: 'ok', nota: `ledcWrite(pin, ${s.cuentas})` })]; }
    },
    {
        id: 'autonomia', grupo: 'Alimentación', titulo: 'Autonomía con batería', formula: 't = capacidad · η / consumo medio',
        desc: 'Con sueño profundo: el ESP32-S3 activo con Wi-Fi ronda los 100 mA y dormido unos 10 µA.',
        campos: [{ k: 'mAh', t: 'Capacidad', u: 'mAh', v: 2000 }, { k: 'activo_mA', t: 'Consumo activo', u: 'mA', v: 100 }, { k: 'reposo_uA', t: 'Consumo en reposo', u: 'µA', v: 10 }, { k: 'activo_pct', t: 'Tiempo activo', u: '%', v: 2 }],
        calc: v => { const s = C.autonomia(v); if (!s) return [fila('Faltan datos', 'Consumo', { nivel: 'info' })]; return [fila('Consumo medio', n(s.media_mA, 3) + ' mA'), fila('Autonomía', s.dias >= 2 ? n(s.dias, 1) + ' días' : n(s.horas, 1) + ' h', { nivel: 'ok', nota: 'Con un 85 % de rendimiento del regulador.' })]; }
    },
    {
        id: 'regulador', grupo: 'Alimentación', titulo: 'Regulador lineal', formula: 'P = (Vin − Vout) · I    Tj = Tamb + P · Rθ',
        desc: 'Calor que disipa un LDO. Rθ del AMS1117 en SOT-223: unos 90 °C/W.',
        campos: [{ k: 'vin', t: 'Entrada', u: 'V', v: 5 }, { k: 'vout', t: 'Salida', u: 'V', v: 3.3 }, { k: 'imA', t: 'Corriente', u: 'mA', v: 300 }, { k: 'rth', t: 'Resistencia térmica', u: '°C/W', v: 90 }],
        calc: v => { const s = C.regulador(v); return [fila('Potencia disipada', C.si(s.p, 'W')), fila('Temperatura de la unión', n(s.tj, 0) + ' °C', s.tj > 125 ? { nivel: 'error', nota: 'Por encima de 125 °C: se apagará por protección térmica.' } : s.tj > 85 ? { nivel: 'aviso', nota: 'Caliente: mejora la disipación o baja Vin.' } : { nivel: 'ok' }), fila('Rendimiento', n(s.rendimiento * 100, 0) + ' %')]; }
    },
    {
        id: 'caida', grupo: 'Instalación eléctrica', titulo: 'Caída de tensión en una línea', formula: 'ΔV = 2 · L · I / (κ · S)',
        desc: 'Monofásica o de continua, ida y vuelta. Límite del REBT en interior: 3 % en alumbrado y 5 % en otros usos.',
        campos: [{ k: 'i', t: 'Intensidad', u: 'A', v: 10 }, { k: 'longitud_m', t: 'Longitud', u: 'm', v: 20 }, { k: 'seccion_mm2', t: 'Sección', op: C.SECCIONES.map(([s]) => [s, String(s).replace('.', ',') + ' mm²']), v: 1.5 }, { k: 'v', t: 'Tensión', u: 'V', v: 230 }, { k: 'conductividad', t: 'Cobre a', op: [[48, '70 °C (en carga)'], [56, '20 °C']], v: 48 }],
        calc: v => { const s = C.caidaTension({ ...v, seccion_mm2: +v.seccion_mm2, conductividad: +v.conductividad }); return [fila('Caída de tensión', C.si(s.dv, 'V')), fila('Porcentaje', n(s.pct, 2) + ' %', s.pct > 5 ? { nivel: 'error', nota: 'Supera el 5 %: aumenta la sección.' } : s.pct > 3 ? { nivel: 'aviso', nota: 'Válida para fuerza, no para alumbrado (3 %).' } : { nivel: 'ok' }), fila('Pérdida en el cable', C.si(s.perdida_W, 'W'))]; }
    },
    {
        id: 'linea', grupo: 'Instalación eléctrica', titulo: 'Intensidad y protección de una línea', formula: 'I = P / (V · cos φ)',
        desc: 'Calibre del magnetotérmico y sección orientativa (cobre, PVC, bajo tubo empotrado).',
        campos: [{ k: 'p_W', t: 'Potencia', u: 'W', v: 2000 }, { k: 'v', t: 'Tensión', u: 'V', v: 230 }, { k: 'cosfi', t: 'Factor de potencia', u: '', v: 1 }],
        calc: v => { if (!(v.p_W > 0 && v.v > 0 && v.cosfi > 0)) return [fila('Faltan datos', 'Potencia y tensión', { nivel: 'info' })]; const s = C.lineaAC(v); return [fila('Intensidad', C.si(s.i, 'A')), fila('Magnetotérmico', s.calibre ? s.calibre + ' A' : 'Más de 63 A', { nivel: s.calibre ? 'ok' : 'aviso' }), fila('Sección mínima orientativa', s.seccion ? String(s.seccion).replace('.', ',') + ' mm²' : '—', { nota: 'Estimación según ITC-BT-19. El dimensionado definitivo corresponde a un instalador autorizado.' })]; }
    }
];

function bandas(ohmios) {
    const b = C.bandasResistencia(ohmios);
    if (!b) return '';
    return `<svg class="res-bandas" viewBox="0 0 120 30" role="img" aria-label="Bandas: ${esc(b.join(', '))}"><path d="M0 15H120" stroke="#aeb4bb" stroke-width="2"/><path d="M26 5q7-5 14 0h40q7-5 14 0v20q-7 5-14 0H40q-7 5-14 0z" fill="#e2c9a0" stroke="#b09465"/>${[34, 48, 60, 82].map((x, i) => `<rect x="${x - 3}" y="${i % 3 ? 5.5 : 2.5}" width="6" height="${i % 3 ? 19 : 25}" fill="${C.COLORES_HEX[b[i]]}"/>`).join('')}</svg>`;
}

const leer = t => { const v = parseFloat(String(t).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(v) ? v : NaN; };

function valores(calc, raiz) {
    const v = {};
    for (const c of calc.campos) {
        const el = raiz.querySelector(`[name="${c.k}"]`);
        v[c.k] = c.op ? el.value : leer(el.value);
    }
    return v;
}

function resultado(calc, raiz) {
    let filas, extra = '';
    try {
        const v = valores(calc, raiz);
        filas = calc.calc(v);
        if (calc.extra) extra = calc.extra(v) || '';
    } catch { filas = [fila('Datos no válidos', 'Revisa los valores', { nivel: 'error' })]; }
    raiz.querySelector('.calc-res').innerHTML = filas.map(f =>
        `<div class="res ${f.nivel || ''}"><dt>${esc(f.t)}</dt><dd>${esc(f.v)}</dd>${f.nota ? `<small>${esc(f.nota)}</small>` : ''}</div>`).join('') + extra;
}

export function pintarCalculadoras(el) {
    const grupos = [...new Set(CALCULADORAS.map(c => c.grupo))];
    el.innerHTML = `<header class="cab-area"><div><h2>Calculadoras</h2><p>Las cuentas que salen al montar: adaptar niveles, limitar corriente, dimensionar la alimentación y las líneas.</p></div></header>` +
        grupos.map(g => `<h3 class="grupo">${esc(g)}</h3><div class="rejilla-calc">` + CALCULADORAS.filter(c => c.grupo === g).map(c => `
<form class="calc" data-calc="${c.id}" autocomplete="off">
  <h4>${ico('calculadora')}${esc(c.titulo)}</h4><p class="tenue">${esc(c.desc)}</p>
  <div class="calc-campos">${c.campos.map(f => `<label>${esc(f.t)}<span class="entrada">${f.op
            ? `<select name="${f.k}">${f.op.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(f.v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`
            : `<input name="${f.k}" type="text" inputmode="decimal" value="${esc(String(f.v).replace('.', ','))}">${f.u ? `<i>${esc(f.u)}</i>` : ''}`}</span></label>`).join('')}</div>
  <dl class="calc-res" aria-live="polite"></dl>
  <code class="formula">${esc(c.formula)}</code>
</form>`).join('') + '</div>').join('');
    for (const f of el.querySelectorAll('.calc')) {
        const calc = CALCULADORAS.find(c => c.id === f.dataset.calc);
        f.addEventListener('input', () => resultado(calc, f));
        f.addEventListener('submit', e => e.preventDefault());
        resultado(calc, f);
    }
}
