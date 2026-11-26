// Pruebas del motor del configurador de alcance (zona 5).
// node --test servicios/zonas/pruebas/configurador.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    estadoInicial, normalizar, alternarBloque, alternarUrgente, aplicarPaquete, elegirPerfil,
    paqueteActivo, calcular, repartirFases, serializar, deserializar, resumen,
    formatoRango, formatoEuros, formatoPlazo, dependientesDe,
} from '../configurador-motor.mjs';

const datos = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../configurador-precios.json', import.meta.url)), 'utf8'));
const idsBloques = datos.bloques.map(b => b.id);

test('la tabla de precios es coherente', () => {
    const ids = new Set();
    for (const x of [...datos.perfiles, ...datos.bloques]) {
        assert.ok(!ids.has(x.id), `id repetido: ${x.id}`);
        ids.add(x.id);
        assert.ok(x.min > 0 && x.max >= x.min, `${x.id}: rango inválido`);
        assert.ok(Number.isInteger(x.semanas) && x.semanas >= 0, `${x.id}: semanas inválidas`);
        assert.ok(x.resuelve && x.incluye && x.incluye.length, `${x.id}: falta qué resuelve o qué incluye`);
    }
    for (const b of datos.bloques) for (const r of b.requiere || []) assert.ok(idsBloques.includes(r), `${b.id} exige ${r}, que no existe`);
    for (const p of datos.paquetes) for (const id of p.bloques) assert.ok(idsBloques.includes(id), `${p.id}: bloque ${id} no existe`);
    for (const [caso, c] of Object.entries(datos.casos)) {
        assert.ok(datos.perfiles.some(p => p.id === c.perfil), `${caso}: perfil desconocido`);
        for (const id of c.bloques) assert.ok(idsBloques.includes(id), `${caso}: bloque ${id} no existe`);
    }
    const pesos = datos.fases.reduce((s, f) => s + f.peso, 0);
    assert.ok(Math.abs(pesos - 1) < 1e-9, 'los pesos de las fases deben sumar 1');
    assert.ok(Math.abs(datos.pagos.reduce((s, p) => s + p, 0) - 1) < 1e-9, 'los pagos deben sumar el 100 %');
});

test('nada marcado: solo la base', () => {
    const r = calcular(estadoInicial(datos), datos);
    const base = datos.perfiles[0];
    assert.deepEqual(r.total, { min: base.min, max: base.max });
    assert.equal(r.semanas, base.semanas);
    assert.equal(r.mensual, null);
    assert.equal(r.paquete, null);
    assert.equal(r.lineas.length, 1);
});

test('mismo estado, mismo resultado (función pura)', () => {
    const e = { perfil: 'web', bloques: ['seo', 'admin'], urgente: true };
    const copia = structuredClone(e);
    const a = calcular(e, datos);
    const b = calcular(e, datos);
    assert.deepEqual(a, b);
    assert.deepEqual(e, copia, 'calcular no debe mutar el estado');
});

test('la tienda exige el panel, y quitar el panel quita la tienda', () => {
    let e = estadoInicial(datos);
    e = alternarBloque(e, 'tienda', datos);
    assert.deepEqual(e.bloques, ['admin', 'tienda']);
    assert.deepEqual(dependientesDe('admin', datos), ['tienda']);
    e = alternarBloque(e, 'admin', datos);
    assert.deepEqual(e.bloques, []);
});

test('quitar la tienda deja el panel', () => {
    let e = alternarBloque(estadoInicial(datos), 'tienda', datos);
    e = alternarBloque(e, 'tienda', datos);
    assert.deepEqual(e.bloques, ['admin']);
});

test('el módulo 3D va incluido en el perfil 3D y no se cobra dos veces', () => {
    let e = alternarBloque(estadoInicial(datos), 'modulo3d', datos);
    assert.deepEqual(e.bloques, ['modulo3d']);
    e = elegirPerfil(e, '3d', datos);
    assert.deepEqual(e.bloques, []);
    assert.deepEqual(alternarBloque(e, 'modulo3d', datos).bloques, []);
});

test('el orden y las repeticiones no cambian el resultado', () => {
    const a = calcular({ perfil: 'web', bloques: ['seo', 'admin', 'seo'] }, datos);
    const b = calcular({ perfil: 'web', bloques: ['admin', 'seo'] }, datos);
    assert.deepEqual(a.total, b.total);
    assert.deepEqual(a.estado.bloques, ['admin', 'seo']);
});

test('datos raros se normalizan', () => {
    const e = normalizar({ perfil: 'nada', bloques: ['inventado', 'seo'], urgente: 'sí' }, datos);
    assert.deepEqual(e, { perfil: 'web', bloques: ['seo'], urgente: true });
    assert.deepEqual(normalizar(null, datos), estadoInicial(datos));
});

test('paquete recomendado: descuento y cuota mensual aparte', () => {
    const e = aplicarPaquete(estadoInicial(datos), 'recomendada', datos);
    const r = calcular(e, datos);
    assert.equal(r.paquete.id, 'recomendada');
    const web = datos.perfiles.find(p => p.id === 'web');
    const admin = datos.bloques.find(b => b.id === 'admin');
    const seo = datos.bloques.find(b => b.id === 'seo');
    const minSin = web.min + admin.min + seo.min;
    assert.equal(r.subtotal.min, minSin);
    assert.equal(r.total.min, Math.round(minSin * 0.95 / 50) * 50);
    assert.deepEqual({ min: r.mensual.min, max: r.mensual.max }, { min: 60, max: 150 });
    assert.equal(r.semanas, web.semanas + admin.semanas + seo.semanas);
});

test('añadir un bloque encima conserva el paquete; quitar una pieza lo pierde', () => {
    let e = aplicarPaquete(estadoInicial(datos), 'recomendada', datos);
    e = alternarBloque(e, 'multidioma', datos);
    assert.equal(paqueteActivo(e, datos).id, 'recomendada');
    e = alternarBloque(e, 'seo', datos);
    assert.equal(paqueteActivo(e, datos), null);
});

test('con todo marcado gana el paquete completo', () => {
    let e = estadoInicial(datos);
    for (const id of idsBloques) if (!e.bloques.includes(id)) e = alternarBloque(e, id, datos);
    assert.deepEqual(e.bloques, idsBloques);
    const r = calcular(e, datos);
    assert.equal(r.paquete.id, 'completa');
    assert.ok(r.total.max >= r.total.min);
    assert.equal(r.fases.reduce((s, f) => s + f.semanas, 0), r.semanas);
});

test('urgente: recargo y menos semanas, con un mínimo', () => {
    const normal = calcular({ perfil: 'web', bloques: ['admin', 'tienda'] }, datos);
    const urg = calcular(alternarUrgente({ perfil: 'web', bloques: ['admin', 'tienda'] }, datos), datos);
    assert.ok(urg.total.min > normal.total.min);
    assert.equal(urg.semanas, Math.round(normal.semanas * 0.7));
    assert.ok(urg.semanas < normal.semanas);
    // Base corta: no baja del mínimo de semanas.
    const corta = calcular({ perfil: 'automatizacion', bloques: [], urgente: true }, datos);
    assert.equal(corta.semanas, 2);
    const minima = calcular({ perfil: 'automatizacion', bloques: [] , urgente: false }, { ...datos, perfiles: datos.perfiles.map(p => ({ ...p, semanas: 1 })) });
    assert.equal(minima.semanas, 1);
});

test('las fases suman las semanas totales', () => {
    for (let s = 1; s <= 30; s++) {
        const f = repartirFases(s, datos.fases);
        assert.equal(f.reduce((a, x) => a + x.semanas, 0), Math.max(s, datos.fases.length / 2), `semanas=${s}`);
        assert.ok(f.every(x => x.semanas >= 0.5));
    }
});

test('los pagos por fases cuadran con el total (salvo redondeo)', () => {
    const r = calcular({ perfil: '3d', bloques: ['ia', 'seo'] }, datos);
    const suma = r.pagos.reduce((s, p) => s + p.min, 0);
    assert.ok(Math.abs(suma - r.total.min) <= 100);
    assert.deepEqual(r.pagos.map(p => p.porcentaje), [40, 30, 30]);
});

test('formato español de cifras', () => {
    assert.equal(formatoEuros(3500), '3.500 €');
    assert.equal(formatoEuros(950), '950 €');
    assert.equal(formatoEuros(1234567), '1.234.567 €');
    assert.equal(formatoRango(3500, 5000), '3.500–5.000 €');
    assert.equal(formatoPlazo({ min: 6, max: 8 }), '6–8 semanas');
    assert.equal(formatoPlazo({ min: 1, max: 1 }), '1 semana');
});

test('la URL ida y vuelta conserva la configuración', () => {
    const e = normalizar({ perfil: '3d', bloques: ['tienda', 'ia'], urgente: true }, datos);
    const txt = serializar(e);
    assert.equal(txt, '3d.admin-tienda-ia.u');
    assert.deepEqual(deserializar(txt, datos), e);
    assert.deepEqual(deserializar('web.', datos), { perfil: 'web', bloques: [], urgente: false });
    assert.equal(deserializar('desconocido.admin', datos), null);
    assert.equal(deserializar('', datos), null);
    assert.equal(deserializar(undefined, datos), null);
});

test('el resumen sigue el contrato de la zona 6', () => {
    const e = aplicarPaquete({ perfil: 'web', bloques: [], urgente: false }, 'recomendada', datos);
    const r = resumen(e, datos, { enlace: 'https://rubenpantxo.com/?alcance=web.admin-seo-mantenimiento#servicios', fecha: '2026-11-26T00:00:00.000Z' });
    assert.equal(r.version, 1);
    assert.deepEqual(r.perfil, { id: 'web', nombre: 'Web a medida' });
    assert.deepEqual(r.bloques.map(b => b.id), ['admin', 'seo', 'mantenimiento']);
    for (const b of r.bloques) {
        assert.equal(typeof b.nombre, 'string');
        assert.ok(b.precio.min <= b.precio.max);
    }
    assert.equal(r.paquete, 'recomendada');
    assert.ok(r.total.min <= r.total.max);
    assert.match(r.plazo, /semana/);
    assert.equal(r.iva, false);
    assert.match(r.texto, /Inversión orientativa: .*€ \(sin IVA\)/);
    assert.match(r.texto, /Configuración: https:/);
    assert.equal(r.fecha, '2026-11-26T00:00:00.000Z');
    // Es JSON plano: sobrevive a sessionStorage.
    assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
});

test('los casos de uso preseleccionan algo válido', () => {
    for (const c of Object.values(datos.casos)) {
        const e = normalizar({ perfil: c.perfil, bloques: c.bloques }, datos);
        assert.equal(e.perfil, c.perfil);
        assert.ok(calcular(e, datos).total.min > 0);
    }
});
