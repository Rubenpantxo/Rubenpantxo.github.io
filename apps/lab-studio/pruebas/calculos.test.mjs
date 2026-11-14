// Pruebas de las fórmulas de las calculadoras.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/core/calculos.js';
import { leerOhmios } from '../js/ui/dibujos.js';

const cerca = (a, b, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test('series normalizadas', () => {
    assert.equal(C.cercanoSerie(1030), 1000);
    assert.equal(C.cercanoSerie(4600), 4700);
    assert.equal(C.superiorSerie(1030), 1100);
    assert.equal(C.superiorSerie(130), 130);
    assert.equal(C.superiorSerie(9200), 10000);
    assert.equal(C.si(4700, 'Ω'), '4,7 kΩ');
    assert.equal(C.si(0.015, 'A'), '15 mA');
});

test('ley de Ohm con cualquier pareja', () => {
    const a = C.ohm({ v: 3.3, r: 220 });
    cerca(a.i, 0.015); cerca(a.p, 0.0495);
    cerca(C.ohm({ p: 2000, v: 230 }).i, 8.696);
    assert.equal(C.ohm({ v: 5 }), null);
});

test('divisor 1k/2k: 5 V → 3,33 V', () => {
    const d = C.divisor({ vin: 5, r1: 1000, r2: 2000 });
    cerca(d.vout, 3.333); cerca(d.rth, 666.7);
    const s = C.divisorPara({ vin: 5, vout: 3.3, r2: 2000 });
    assert.equal(s.r1, 1100);
    assert.ok(s.vout <= 3.3);
});

test('LED, pull-up, autonomía, RC, ADC, servo, regulador', () => {
    const l = C.ledResistencia({ vs: 3.3, vf: 2, imA: 10, n: 1 });
    cerca(l.r, 130); assert.equal(l.rn, 130);
    assert.equal(C.ledResistencia({ vs: 3.3, vf: 3.4, imA: 10 }), null);
    const p = C.pullupI2C({ vdd: 3.3, cb_pF: 100, modo: 'fast' });
    cerca(p.rmin, 966.7); cerca(p.rmax, 3540.7); assert.ok(p.viable);
    cerca(C.autonomia({ mAh: 2000, activo_mA: 100, reposo_uA: 10, activo_pct: 2 }).horas, 846.4, 1e-2);
    cerca(C.filtroRC({ r: 10000, c_nF: 100 }).fc, 159.15);
    cerca(C.adc({ cuentas: 4095, bits: 12, atenuacion: '12 dB' }).v, 3.1);
    assert.equal(C.servoAngulo({ grados: 90 }), 1450);
    assert.equal(C.servoPwm({ pulso_us: 1500, hz: 50, bits: 14 }).cuentas, 1229);
    cerca(C.regulador({ vin: 5, vout: 3.3, imA: 300 }).tj, 70.9);
});

test('línea eléctrica: caída de tensión y protección', () => {
    const c = C.caidaTension({ i: 10, longitud_m: 20, seccion_mm2: 1.5, v: 230 });
    cerca(c.dv, 5.556); cerca(c.pct, 2.415);
    const l = C.lineaAC({ p_W: 2000 });
    cerca(l.i, 8.696); assert.equal(l.calibre, 10); assert.equal(l.seccion, 1.5);
    assert.equal(C.lineaAC({ p_W: 3600 }).seccion, 2.5);
});

test('código de colores', () => {
    assert.deepEqual(C.bandasResistencia(220), ['rojo', 'rojo', 'marrón', 'oro']);
    assert.deepEqual(C.bandasResistencia(4700), ['amarillo', 'violeta', 'rojo', 'oro']);
    assert.deepEqual(C.bandasResistencia(10000), ['marrón', 'negro', 'naranja', 'oro']);
    assert.deepEqual(C.bandasResistencia(1), ['marrón', 'negro', 'oro', 'oro']);
    assert.equal(leerOhmios('4,7 kΩ'), 4700);
    assert.equal(leerOhmios('220 Ω'), 220);
    assert.equal(leerOhmios('1M'), 1e6);
});
