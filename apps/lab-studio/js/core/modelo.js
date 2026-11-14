// Modelo del documento de montaje. Puro (sin DOM): lo usan el editor y las
// pruebas de Node.
//
// Unidades: la rejilla es de 2,54 mm (0,1"), el paso de las tiras de pines.
// Las huellas de los componentes y la posición de sus pines van en unidades
// de rejilla; el documento guarda las piezas en píxeles de mundo (U px por
// unidad) siempre ajustadas a rejilla, así que todo pin cae en un nodo.

export const U = 10;
export const VERSION = 1;
export const FORMATO = 'lab-studio';
export const DIRS = ['arr', 'der', 'aba', 'izq'];
export const VEC = { arr: [0, -1], der: [1, 0], aba: [0, 1], izq: [-1, 0] };

export function nuevoDoc(nombre = 'Montaje sin título') {
    return { formato: FORMATO, version: VERSION, nombre, partes: [], cables: [], notas: '' };
}

export const ajustar = v => Math.round(v / U) * U;
export const clavePin = (parteId, pinId) => parteId + '.' + pinId;

function siguiente(valores, prefijo) {
    let n = 0;
    for (const v of valores) {
        if (typeof v !== 'string' || !v.startsWith(prefijo)) continue;
        const resto = v.slice(prefijo.length);
        if (/^\d+$/.test(resto)) n = Math.max(n, +resto);
    }
    return prefijo + (n + 1);
}

export function tamano(def, rot = 0) {
    return rot % 2 ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

// Gira un punto local (en unidades) 90° horario `rot` veces dentro de la caja.
export function rotarPunto(def, rot, x, y) {
    switch (((rot % 4) + 4) % 4) {
        case 1: return [def.h - y, x];
        case 2: return [def.w - x, def.h - y];
        case 3: return [y, def.w - x];
        default: return [x, y];
    }
}

export function posPin(parte, def, pin) {
    const [rx, ry] = rotarPunto(def, parte.rot, pin.x, pin.y);
    const dir = DIRS[(DIRS.indexOf(pin.lado || 'aba') + (parte.rot || 0)) % 4];
    return { x: parte.x + rx * U, y: parte.y + ry * U, dir };
}

export function cajaParte(parte, def) {
    const t = tamano(def, parte.rot);
    return { x: parte.x, y: parte.y, w: t.w * U, h: t.h * U };
}

// Transformación SVG equivalente a rotarPunto, para dibujar la pieza girada.
export function transformParte(parte, def) {
    const { x, y } = parte;
    switch (((parte.rot % 4) + 4) % 4) {
        case 1: return `translate(${x + def.h * U} ${y}) rotate(90)`;
        case 2: return `translate(${x + def.w * U} ${y + def.h * U}) rotate(180)`;
        case 3: return `translate(${x} ${y + def.w * U}) rotate(270)`;
        default: return `translate(${x} ${y})`;
    }
}

export function buscarParte(doc, id) {
    return doc.partes.find(p => p.id === id) || null;
}

export function anadirParte(doc, def, x, y, extra = {}) {
    const parte = {
        id: siguiente(doc.partes.map(p => p.id), 'p'),
        tipo: def.id,
        ref: siguiente(doc.partes.map(p => p.ref), def.ref || 'U'),
        x: ajustar(x),
        y: ajustar(y),
        rot: 0,
        ...extra
    };
    doc.partes.push(parte);
    return parte;
}

export function quitarPartes(doc, ids) {
    const fuera = new Set(ids);
    doc.partes = doc.partes.filter(p => !fuera.has(p.id));
    doc.cables = doc.cables.filter(c => !fuera.has(c.a.p) && !fuera.has(c.b.p));
}

export function quitarCables(doc, ids) {
    const fuera = new Set(ids);
    doc.cables = doc.cables.filter(c => !fuera.has(c.id));
}

// Devuelve el cable creado, o un texto con el motivo por el que no se puede.
export function anadirCable(doc, catalogo, a, b, extra = {}) {
    if (a.p === b.p && a.pin === b.pin) return 'Un cable necesita dos pines distintos.';
    for (const ext of [a, b]) {
        const parte = buscarParte(doc, ext.p);
        const def = parte && catalogo.get(parte.tipo);
        if (!def || !def.pines.some(pin => pin.id === ext.pin)) return 'El pin ya no existe.';
    }
    const ka = clavePin(a.p, a.pin), kb = clavePin(b.p, b.pin);
    const repetido = doc.cables.some(c => {
        const x = clavePin(c.a.p, c.a.pin), y = clavePin(c.b.p, c.b.pin);
        return (x === ka && y === kb) || (x === kb && y === ka);
    });
    if (repetido) return 'Esos dos pines ya están unidos.';
    const cable = {
        id: siguiente(doc.cables.map(c => c.id), 'c'),
        a: { p: a.p, pin: a.pin },
        b: { p: b.p, pin: b.pin },
        ...extra
    };
    doc.cables.push(cable);
    return cable;
}

export function rotarParte(parte, def, sentido = 1) {
    // Gira sobre el centro de la huella y vuelve a ajustar a rejilla.
    const antes = tamano(def, parte.rot);
    parte.rot = (((parte.rot || 0) + sentido) % 4 + 4) % 4;
    const despues = tamano(def, parte.rot);
    parte.x = ajustar(parte.x + (antes.w - despues.w) * U / 2);
    parte.y = ajustar(parte.y + (antes.h - despues.h) * U / 2);
}

export function duplicarPartes(doc, catalogo, ids, dx = 2 * U, dy = 2 * U) {
    const mapa = new Map();
    for (const id of ids) {
        const o = buscarParte(doc, id);
        const def = o && catalogo.get(o.tipo);
        if (!def) continue;
        const { id: _i, ref: _r, x, y, tipo: _t, ...resto } = o;
        const n = anadirParte(doc, def, x + dx, y + dy, resto);
        mapa.set(id, n.id);
    }
    // Los cables entre dos piezas duplicadas se copian también.
    for (const c of [...doc.cables]) {
        if (mapa.has(c.a.p) && mapa.has(c.b.p)) {
            const { id: _i, a, b, ...resto } = c;
            anadirCable(doc, catalogo, { p: mapa.get(a.p), pin: a.pin }, { p: mapa.get(b.p), pin: b.pin }, resto);
        }
    }
    return [...mapa.values()];
}

export function limites(doc, catalogo) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of doc.partes) {
        const def = catalogo.get(p.tipo);
        if (!def) continue;
        const c = cajaParte(p, def);
        x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y);
        x1 = Math.max(x1, c.x + c.w); y1 = Math.max(y1, c.y + c.h);
    }
    if (x0 === Infinity) return { x: 0, y: 0, w: 0, h: 0, vacio: true };
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, vacio: false };
}

// Comprueba y sanea un documento que viene de fuera (archivo, almacenamiento
// del navegador). No se fía de nada: tipos, ids repetidos, cables colgando.
export function validarDoc(obj, catalogo) {
    const avisos = [];
    if (!obj || typeof obj !== 'object' || obj.formato !== FORMATO) {
        throw new Error('El archivo no es un montaje de Lab Studio.');
    }
    if (typeof obj.version !== 'number' || obj.version > VERSION) {
        throw new Error('El montaje se guardó con una versión más nueva de Lab Studio.');
    }
    const doc = nuevoDoc(typeof obj.nombre === 'string' && obj.nombre.trim() ? obj.nombre.trim().slice(0, 80) : undefined);
    doc.notas = typeof obj.notas === 'string' ? obj.notas.slice(0, 4000) : '';
    const vistos = new Set();
    for (const p of Array.isArray(obj.partes) ? obj.partes : []) {
        if (!p || typeof p.id !== 'string' || !/^[A-Za-z0-9_-]{1,24}$/.test(p.id) || vistos.has(p.id)) continue;
        const def = catalogo.get(p.tipo);
        if (!def) { avisos.push(`Componente desconocido «${String(p.tipo).slice(0, 40)}» (${p.ref || p.id}): se ha omitido.`); continue; }
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        vistos.add(p.id);
        const parte = {
            id: p.id,
            tipo: p.tipo,
            ref: typeof p.ref === 'string' && p.ref.trim() ? p.ref.trim().slice(0, 12) : siguiente(doc.partes.map(q => q.ref), def.ref || 'U'),
            x: ajustar(p.x),
            y: ajustar(p.y),
            rot: Number.isInteger(p.rot) ? ((p.rot % 4) + 4) % 4 : 0
        };
        if (typeof p.valor === 'string') parte.valor = p.valor.slice(0, 24);
        if (typeof p.nota === 'string') parte.nota = p.nota.slice(0, 200);
        doc.partes.push(parte);
    }
    let colgando = 0;
    for (const c of Array.isArray(obj.cables) ? obj.cables : []) {
        if (!c || !c.a || !c.b) { colgando++; continue; }
        const extra = {};
        if (typeof c.color === 'string' && /^#[0-9a-f]{6}$/i.test(c.color)) extra.color = c.color;
        if (typeof c.etiqueta === 'string') extra.etiqueta = c.etiqueta.slice(0, 60);
        const r = anadirCable(doc, catalogo, { p: String(c.a.p), pin: String(c.a.pin) }, { p: String(c.b.p), pin: String(c.b.pin) }, extra);
        if (typeof r === 'string') colgando++;
    }
    if (colgando) avisos.push(`${colgando} cable(s) no válidos se han omitido.`);
    return { doc, avisos };
}

// Construye un documento a partir de una plantilla de proyecto:
// { partes: [{ k, tipo, x, y, rot }], cables: [['k.PIN', 'k.PIN', etiqueta?]] }
// con x/y en unidades de rejilla.
export function docDesdePlantilla(plantilla, catalogo, nombre) {
    const doc = nuevoDoc(nombre);
    const ids = new Map();
    for (const p of plantilla.partes) {
        const def = catalogo.get(p.tipo);
        if (!def) throw new Error('Plantilla: componente desconocido ' + p.tipo);
        const extra = {};
        if (p.rot) extra.rot = p.rot;
        if (p.valor) extra.valor = p.valor;
        const parte = anadirParte(doc, def, p.x * U, p.y * U, extra);
        ids.set(p.k, parte.id);
    }
    for (const [a, b, etiqueta] of plantilla.cables) {
        const [ka, pa] = a.split('.'), [kb, pb] = b.split('.');
        const r = anadirCable(doc, catalogo, { p: ids.get(ka), pin: pa }, { p: ids.get(kb), pin: pb }, etiqueta ? { etiqueta } : {});
        if (typeof r === 'string') throw new Error(`Plantilla: ${a} → ${b}: ${r}`);
    }
    return doc;
}
