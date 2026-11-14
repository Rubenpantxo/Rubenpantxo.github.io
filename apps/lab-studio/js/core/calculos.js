// Fórmulas de las calculadoras. Funciones puras, con sus pruebas en
// pruebas/calculos.test.mjs. Las unidades de entrada van en el nombre.

export const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
export const E12 = E24.filter((_, i) => i % 2 === 0);

export function cercanoSerie(valor, serie = E24) {
    if (!(valor > 0)) return NaN;
    const dec = Math.floor(Math.log10(valor));
    let mejor = NaN, error = Infinity;
    for (const d of [dec - 1, dec, dec + 1]) {
        for (const m of serie) {
            const v = m * 10 ** d;
            const e = Math.abs(Math.log(v / valor));
            if (e < error) { error = e; mejor = v; }
        }
    }
    return +mejor.toPrecision(3);
}

// El siguiente valor normalizado por encima (para no pasarse de corriente).
export function superiorSerie(valor, serie = E24) {
    const c = cercanoSerie(valor, serie);
    if (c >= valor * 0.999) return c;
    const dec = Math.floor(Math.log10(c));
    const i = serie.findIndex(m => Math.abs(m * 10 ** dec - c) < c * 1e-6);
    return +(i + 1 < serie.length ? serie[i + 1] * 10 ** dec : serie[0] * 10 ** (dec + 1)).toPrecision(3);
}

const PREFIJOS = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
export function si(valor, unidad = '', cifras = 3) {
    if (!Number.isFinite(valor)) return '—';
    if (valor === 0) return '0 ' + unidad;
    const abs = Math.abs(valor);
    const [f, p] = PREFIJOS.find(([f]) => abs >= f * 0.9995) || PREFIJOS[PREFIJOS.length - 1];
    return (+(valor / f).toPrecision(cifras)).toString().replace('.', ',') + ' ' + p + unidad;
}

// Ley de Ohm: dos magnitudes cualesquiera de V, I, R, P.
export function ohm({ v, i, r, p }) {
    const d = x => Number.isFinite(x) && x > 0;
    if (d(v) && d(i)) { r = v / i; p = v * i; }
    else if (d(v) && d(r)) { i = v / r; p = v * i; }
    else if (d(i) && d(r)) { v = i * r; p = v * i; }
    else if (d(p) && d(v)) { i = p / v; r = v / i; }
    else if (d(p) && d(i)) { v = p / i; r = v / i; }
    else if (d(p) && d(r)) { i = Math.sqrt(p / r); v = i * r; }
    else return null;
    return { v, i, r, p };
}

export function divisor({ vin, r1, r2, rcarga = Infinity }) {
    const r2e = Number.isFinite(rcarga) && rcarga > 0 ? (r2 * rcarga) / (r2 + rcarga) : r2;
    const vout = vin * r2e / (r1 + r2e);
    const i = vin / (r1 + r2e);
    return { vout, i, p: vin * i, rth: (r1 * r2) / (r1 + r2) };
}

// Pareja normalizada que da vout a partir de vin sin superarla.
export function divisorPara({ vin, vout, r2 = 10000, serie = E24 }) {
    if (!(vin > vout) || !(vout > 0)) return null;
    const r2n = cercanoSerie(r2, serie);
    const r1n = superiorSerie(r2n * (vin - vout) / vout, serie);
    return { r1: r1n, r2: r2n, ...divisor({ vin, r1: r1n, r2: r2n }) };
}

export function ledResistencia({ vs, vf, imA, n = 1 }) {
    const caida = vs - vf * n;
    if (!(caida > 0) || !(imA > 0)) return null;
    const r = caida / (imA / 1000);
    const rn = superiorSerie(r);
    const ireal = caida / rn;
    return { r, rn, ireal_mA: ireal * 1000, p: caida * ireal };
}

// Límites de la resistencia de pull-up de I²C (NXP UM10204).
export function pullupI2C({ vdd, cb_pF, modo = 'fast' }) {
    const m = { standard: { tr: 1000e-9, iol: 3e-3, khz: 100 }, fast: { tr: 300e-9, iol: 3e-3, khz: 400 }, 'fast+': { tr: 120e-9, iol: 20e-3, khz: 1000 } }[modo];
    const rmin = (vdd - 0.4) / m.iol;
    const rmax = m.tr / (0.8473 * cb_pF * 1e-12);
    return { rmin, rmax, khz: m.khz, viable: rmax >= rmin, recomendada: rmax >= rmin ? cercanoSerie(Math.sqrt(rmin * rmax), E12) : NaN };
}

// Autonomía con ciclo de trabajo: activo un % del tiempo y el resto dormido.
export function autonomia({ mAh, activo_mA, reposo_uA = 0, activo_pct = 100, rendimiento = 0.85 }) {
    const f = Math.min(100, Math.max(0, activo_pct)) / 100;
    const media_mA = activo_mA * f + (reposo_uA / 1000) * (1 - f);
    if (!(media_mA > 0)) return null;
    const horas = (mAh * rendimiento) / media_mA;
    return { media_mA, horas, dias: horas / 24 };
}

export function filtroRC({ r, c_nF }) {
    const c = c_nF * 1e-9;
    const tau = r * c;
    return { fc: 1 / (2 * Math.PI * tau), tau, t99: 4.6 * tau };
}

// Márgenes de medida del ADC del ESP32-S3 según atenuación (ESP-IDF).
export const ADC_ATENUACION = { '0 dB': 0.95, '2,5 dB': 1.25, '6 dB': 1.75, '12 dB': 3.1 };
export function adc({ cuentas, bits = 12, atenuacion = '12 dB' }) {
    const fondo = ADC_ATENUACION[atenuacion];
    const max = 2 ** bits - 1;
    const v = (Math.min(max, Math.max(0, cuentas)) / max) * fondo;
    return { v, fondo, resolucion: fondo / max };
}

// Ancho de pulso de un servo → valor de ciclo para el periférico LEDC.
export function servoPwm({ pulso_us, hz = 50, bits = 14 }) {
    const periodo = 1e6 / hz;
    const ciclo = pulso_us / periodo;
    return { periodo_us: periodo, ciclo_pct: ciclo * 100, cuentas: Math.round(ciclo * (2 ** bits - 1)) };
}
export function servoAngulo({ grados, min_us = 500, max_us = 2400, recorrido = 180 }) {
    return min_us + (max_us - min_us) * Math.min(recorrido, Math.max(0, grados)) / recorrido;
}

export function regulador({ vin, vout, imA, rth = 90, tamb = 25 }) {
    const p = (vin - vout) * (imA / 1000);
    const tj = tamb + p * rth;
    return { p, tj, rendimiento: vout / vin };
}

// Caída de tensión en una línea monofásica o de continua (ida y vuelta).
// Conductividad del cobre: 56 m/(Ω·mm²) a 20 °C, 48 a 70 °C (PVC en carga).
export function caidaTension({ i, longitud_m, seccion_mm2, v, conductividad = 48, trifasica = false }) {
    const k = trifasica ? Math.sqrt(3) : 2;
    const dv = (k * longitud_m * i) / (conductividad * seccion_mm2);
    return { dv, pct: (dv / v) * 100, perdida_W: dv * i * (trifasica ? Math.sqrt(3) : 1) };
}

export const CALIBRES = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];
// Intensidad admisible orientativa: cobre, PVC, dos conductores cargados bajo
// tubo empotrado (REBT ITC-BT-19, método B1). Solo para estimar.
export const SECCIONES = [[1.5, 15], [2.5, 21], [4, 27], [6, 36], [10, 50], [16, 66], [25, 84]];

export function lineaAC({ p_W, v = 230, cosfi = 1, trifasica = false }) {
    const i = p_W / ((trifasica ? Math.sqrt(3) : 1) * v * cosfi);
    const calibre = CALIBRES.find(c => c >= i) || null;
    const seccion = calibre ? (SECCIONES.find(([, iz]) => iz >= calibre) || [null])[0] : null;
    return { i, calibre, seccion };
}

const COLORES = ['negro', 'marrón', 'rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'gris', 'blanco'];
export const COLORES_HEX = { negro: '#1a1a1a', 'marrón': '#7b4a1e', rojo: '#d22f27', naranja: '#f28c28', amarillo: '#f2d024', verde: '#2e9e4f', azul: '#2a62c9', violeta: '#8e4bbf', gris: '#8a8a8a', blanco: '#f4f4f4', oro: '#c9a227', plata: '#bfc3c7' };
export function bandasResistencia(ohmios) {
    if (!(ohmios >= 0.1)) return null;
    const exp = Math.floor(Math.log10(ohmios)) - 1;
    let dos = Math.round(ohmios / 10 ** exp);
    let e = exp;
    if (dos >= 100) { dos = Math.round(dos / 10); e++; }
    const mult = e >= 0 ? COLORES[e] : e === -1 ? 'oro' : e === -2 ? 'plata' : null;
    if (!mult || e > 9) return null;
    return [COLORES[Math.floor(dos / 10)], COLORES[dos % 10], mult, 'oro'];
}
