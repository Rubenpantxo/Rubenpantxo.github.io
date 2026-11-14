// Lista de redes (netlist): agrupa los pines unidos por cables.
// Cada cable une dos pines; una red es el conjunto de pines alcanzables.

import { clavePin } from './modelo.js';

export function dominioPin(pin) {
    if (pin.dom) return pin.dom;
    if (pin.tipo === 'usb_host' || pin.tipo === 'usb_dev') return 'usb';
    if (pin.tipo === 'red') return 'red';
    return 'dc';
}

export function nombreTension(v) {
    if (v >= 100) return `L ${Math.round(v)}V`;
    const t = String(v).replace('.', 'V');
    return '+' + (t.includes('V') ? t : t + 'V');
}

export function construirRedes(doc, catalogo) {
    const padre = new Map();
    const raiz = k => {
        let r = k;
        while (padre.get(r) !== r) r = padre.get(r);
        while (padre.get(k) !== r) { const s = padre.get(k); padre.set(k, r); k = s; }
        return r;
    };
    const info = new Map();
    const partes = new Map(doc.partes.map(p => [p.id, p]));

    const alta = ext => {
        const k = clavePin(ext.p, ext.pin);
        if (info.has(k)) return k;
        const parte = partes.get(ext.p);
        const def = parte && catalogo.get(parte.tipo);
        const pin = def && def.pines.find(x => x.id === ext.pin);
        if (!pin) return null;
        info.set(k, { clave: k, parte, def, pin });
        padre.set(k, k);
        return k;
    };

    const validos = [];
    for (const c of doc.cables) {
        const a = alta(c.a), b = alta(c.b);
        if (!a || !b) continue;
        padre.set(raiz(a), raiz(b));
        validos.push([c, a]);
    }

    const grupos = new Map();
    for (const k of info.keys()) {
        const r = raiz(k);
        if (!grupos.has(r)) grupos.set(r, { pines: [], cables: [] });
        grupos.get(r).pines.push(info.get(k));
    }
    for (const [c, a] of validos) grupos.get(raiz(a)).cables.push(c.id);

    const redes = [];
    const usados = new Map();
    for (const g of grupos.values()) {
        const red = { id: '', nombre: '', pines: g.pines, cables: g.cables };
        red.dominios = new Set(g.pines.filter(e => e.pin.tipo !== 'pas').map(e => dominioPin(e.pin)));
        red.clase = claseRed(red);
        let base = nombreBase(red);
        const n = (usados.get(base) || 0) + 1;
        usados.set(base, n);
        red.nombre = n > 1 ? `${base}_${n}` : base;
        redes.push(red);
    }
    redes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
    redes.forEach((r, i) => { r.id = 'n' + (i + 1); });

    const porPin = new Map();
    const porCable = new Map();
    for (const r of redes) {
        for (const e of r.pines) porPin.set(e.clave, r);
        for (const c of r.cables) porCable.set(c, r);
    }
    return { redes, porPin, porCable };
}

// Clase eléctrica de la red: decide el color del cable y cómo se nombra.
function claseRed(red) {
    const tipos = new Set(red.pines.map(e => e.pin.tipo));
    const ac = red.dominios.has('ac');
    if (red.dominios.has('usb')) return 'usb';
    if (red.dominios.has('red')) return 'datos-red';
    if (ac) {
        if (tipos.has('tierra')) return 'pe';
        if (tipos.has('neutro')) return 'neutro';
        return 'fase';
    }
    if (tipos.has('gnd')) return 'gnd';
    if (tipos.has('fuente') || tipos.has('alim')) {
        const v = Math.max(0, ...red.pines.filter(e => e.pin.tipo === 'fuente').map(e => e.pin.v || 0));
        return v > 0 && v <= 3.6 ? 'v3' : 'v5';
    }
    return 'senal';
}

function nombreBase(red) {
    const fuentes = red.pines.filter(e => e.pin.tipo === 'fuente' && e.pin.v);
    switch (red.clase) {
        case 'gnd': return 'GND';
        case 'pe': return 'PE';
        case 'neutro': return 'N';
        case 'fase':
            if (fuentes.length) return nombreTension(Math.max(...fuentes.map(e => e.pin.v)));
            return 'L';
        case 'v3': case 'v5':
            if (fuentes.length) return nombreTension(Math.max(...fuentes.map(e => e.pin.v)));
            return 'VCC';
        case 'usb': return 'USB';
        case 'datos-red': return 'LAN';
    }
    // Señal: manda el pin del microcontrolador/host si lo hay; si no, la
    // salida; si no, el primero. El nombre lleva la referencia para ser único.
    const orden = e => (e.def.mcu ? 0 : e.pin.tipo === 'sal' ? 1 : 2);
    const e = [...red.pines].sort((a, b) => orden(a) - orden(b))[0];
    const etiqueta = (e.pin.red || e.pin.n || e.pin.id).replace(/[^\w/+-]/g, '');
    return e.def.mcu ? etiqueta : `${e.parte.ref}_${etiqueta}`;
}
