// Motor del configurador de alcance (zona 5 de #servicios).
//
// Solo funciones puras: reciben el estado y la tabla de precios
// (configurador-precios.json) y devuelven datos nuevos. No tocan el DOM ni
// el almacenamiento, así que el mismo estado da siempre el mismo resultado y
// se prueban en Node (servicios/zonas/pruebas/configurador.test.mjs).
//
// Estado: { perfil: 'web', bloques: ['admin', 'seo'], urgente: false }
// El paquete no se guarda: se deduce de los bloques marcados.

const porId = (lista, id) => lista.find(x => x.id === id) || null;

/* ------------------------------------------------------------ estado */

export function estadoInicial(datos) {
    return { perfil: datos.perfiles[0].id, bloques: [], urgente: false };
}

// Deja el estado en una forma válida: perfil conocido, bloques sin repetir,
// en el orden de la tabla, con sus dependencias y sin los que el perfil ya
// incluye de serie.
export function normalizar(estado, datos) {
    const perfil = porId(datos.perfiles, estado && estado.perfil) ? estado.perfil : datos.perfiles[0].id;
    const pedidos = new Set((estado && Array.isArray(estado.bloques) ? estado.bloques : []).filter(id => porId(datos.bloques, id)));

    // Dependencias: la tienda arrastra al panel. Se repite hasta que no
    // cambie nada por si un día hay cadenas (a exige b, b exige c).
    let cambio = true;
    while (cambio) {
        cambio = false;
        for (const id of [...pedidos]) {
            for (const req of porId(datos.bloques, id).requiere || []) {
                if (!pedidos.has(req)) { pedidos.add(req); cambio = true; }
            }
        }
    }

    const bloques = datos.bloques
        .filter(b => pedidos.has(b.id) && !incluidoEnPerfil(b, perfil))
        .map(b => b.id);

    return { perfil, bloques, urgente: Boolean(estado && estado.urgente) };
}

export function incluidoEnPerfil(bloque, perfil) {
    return Array.isArray(bloque.incluidoEn) && bloque.incluidoEn.includes(perfil);
}

// Bloques que se caerían si se quita `id` (porque lo exigen).
export function dependientesDe(id, datos) {
    return datos.bloques.filter(b => (b.requiere || []).includes(id)).map(b => b.id);
}

export function elegirPerfil(estado, perfil, datos) {
    return normalizar({ ...estado, perfil }, datos);
}

// Marca o desmarca un bloque. Al quitar uno se quitan también los que lo
// exigen; al poner uno, normalizar() añade lo que exige.
export function alternarBloque(estado, id, datos) {
    const bloque = porId(datos.bloques, id);
    if (!bloque || incluidoEnPerfil(bloque, estado.perfil)) return normalizar(estado, datos);
    const actuales = new Set(estado.bloques);
    if (actuales.has(id)) {
        const quitar = new Set([id]);
        let cambio = true;
        while (cambio) {
            cambio = false;
            for (const b of datos.bloques) {
                if (!quitar.has(b.id) && actuales.has(b.id) && (b.requiere || []).some(r => quitar.has(r))) {
                    quitar.add(b.id); cambio = true;
                }
            }
        }
        return normalizar({ ...estado, bloques: estado.bloques.filter(b => !quitar.has(b)) }, datos);
    }
    return normalizar({ ...estado, bloques: [...estado.bloques, id] }, datos);
}

export function alternarUrgente(estado, datos) {
    return normalizar({ ...estado, urgente: !estado.urgente }, datos);
}

// Un paquete sustituye la selección de bloques (no el perfil ni la urgencia).
export function aplicarPaquete(estado, idPaquete, datos) {
    const paquete = porId(datos.paquetes, idPaquete);
    if (!paquete) return normalizar(estado, datos);
    return normalizar({ ...estado, bloques: [...paquete.bloques] }, datos);
}

// El paquete activo es el de mayor descuento cuyos bloques están todos
// marcados (los que el perfil ya incluye cuentan como marcados). Así el
// descuento se mantiene si se añade algo encima y se pierde si se quita una
// pieza del paquete.
export function paqueteActivo(estado, datos) {
    const marcados = new Set(estado.bloques);
    const cumple = p => p.bloques.every(id => {
        const b = porId(datos.bloques, id);
        return marcados.has(id) || (b && incluidoEnPerfil(b, estado.perfil));
    });
    const candidatos = datos.paquetes.filter(cumple);
    if (!candidatos.length) return null;
    // Desempate: el que tiene más bloques (el más específico).
    return candidatos.reduce((a, b) =>
        (b.descuento > a.descuento || (b.descuento === a.descuento && b.bloques.length > a.bloques.length)) ? b : a);
}

/* ------------------------------------------------------------ cálculo */

export function redondear(n, paso) {
    if (!paso) return Math.round(n);
    return Math.round(n / paso) * paso;
}

// Reparte `semanas` entre las fases según su peso, en medias semanas, con
// al menos media semana por fase y sin perder ni sobrar nada (mayor resto).
export function repartirFases(semanas, fases) {
    const unidades = Math.max(Math.round(semanas * 2), fases.length);
    const totalPeso = fases.reduce((s, f) => s + f.peso, 0);
    const libres = unidades - fases.length;
    const exactas = fases.map(f => libres * f.peso / totalPeso);
    const base = exactas.map(Math.floor);
    let sobran = libres - base.reduce((s, n) => s + n, 0);
    const orden = exactas
        .map((x, i) => ({ i, resto: x - Math.floor(x) }))
        .sort((a, b) => b.resto - a.resto || a.i - b.i);
    for (const { i } of orden) {
        if (sobran <= 0) break;
        base[i]++; sobran--;
    }
    return fases.map((f, i) => ({ id: f.id, nombre: f.nombre, semanas: (base[i] + 1) / 2 }));
}

export function calcular(estadoEntrada, datos) {
    const estado = normalizar(estadoEntrada, datos);
    const paso = datos.redondeo || 0;
    const perfil = porId(datos.perfiles, estado.perfil);
    const pasos = [];

    const elegidos = estado.bloques.map(id => porId(datos.bloques, id));
    const unicos = elegidos.filter(b => !b.mensual);
    const mensuales = elegidos.filter(b => b.mensual);

    const lineas = [
        { id: perfil.id, nombre: perfil.nombre, tipo: 'base', min: perfil.min, max: perfil.max, semanas: perfil.semanas },
        ...unicos.map(b => ({ id: b.id, nombre: b.nombre, tipo: 'bloque', min: b.min, max: b.max, semanas: b.semanas })),
    ];

    let min = lineas.reduce((s, l) => s + l.min, 0);
    let max = lineas.reduce((s, l) => s + l.max, 0);
    const subtotal = { min, max };
    pasos.push(`Subtotal: ${lineas.map(l => `${l.id} ${l.min}-${l.max}`).join(' + ')} = ${min}-${max}`);

    const paquete = paqueteActivo(estado, datos);
    let descuento = null;
    if (paquete && paquete.descuento > 0) {
        descuento = { tasa: paquete.descuento, min: Math.round(min * paquete.descuento), max: Math.round(max * paquete.descuento) };
        min -= descuento.min;
        max -= descuento.max;
        pasos.push(`Paquete ${paquete.id}: -${paquete.descuento * 100}% → ${min}-${max}`);
    }

    let semanasBase = lineas.reduce((s, l) => s + l.semanas, 0);
    let semanas = semanasBase;
    let recargo = null;
    if (estado.urgente) {
        const u = datos.urgente;
        recargo = { tasa: u.recargo, min: Math.round(min * u.recargo), max: Math.round(max * u.recargo) };
        min += recargo.min;
        max += recargo.max;
        const recortadas = Math.round(semanasBase * (1 - u.reduccionSemanas));
        semanas = Math.max(Math.min(semanasBase, u.semanasMinimas), recortadas);
        pasos.push(`Urgente: +${u.recargo * 100}% → ${min}-${max}; semanas ${semanasBase} → ${semanas}`);
    }

    const total = { min: redondear(min, paso), max: redondear(max, paso) };
    pasos.push(`Total redondeado a ${paso}: ${total.min}-${total.max}`);

    let mensual = null;
    if (mensuales.length) {
        mensual = {
            min: mensuales.reduce((s, b) => s + b.min, 0),
            max: mensuales.reduce((s, b) => s + b.max, 0),
            bloques: mensuales.map(b => ({ id: b.id, nombre: b.nombre, min: b.min, max: b.max })),
        };
        pasos.push(`Cuota mensual: ${mensual.min}-${mensual.max}`);
    }

    // Plazo honesto: la estimación y un 20 % de margen.
    const plazo = { min: semanas, max: Math.ceil(semanas * 1.2) };
    const fases = repartirFases(semanas, datos.fases);

    const pagos = (datos.pagos || []).map((p, i) => ({
        orden: i + 1,
        porcentaje: Math.round(p * 100),
        min: redondear(total.min * p, paso),
        max: redondear(total.max * p, paso),
    }));

    return {
        estado,
        perfil: { id: perfil.id, nombre: perfil.nombre },
        lineas,
        subtotal,
        paquete: paquete ? { id: paquete.id, nombre: paquete.nombre, descuento: paquete.descuento } : null,
        descuento,
        recargo,
        total,
        mensual,
        semanas,
        plazo,
        fases,
        pagos,
        pasos,
    };
}

/* ------------------------------------------------------------ formato */

// A mano y no con Intl: en es-ES Intl no separa los miles de 4 cifras
// (3500 en vez de 3.500) y aquí queremos siempre el punto.
export function formatoNumero(n) {
    const signo = n < 0 ? '-' : '';
    return signo + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatoEuros(n) {
    return `${formatoNumero(n)} €`;
}

export function formatoRango(min, max) {
    if (min === max) return formatoEuros(min);
    return `${formatoNumero(min)}–${formatoNumero(max)} €`;
}

export function formatoSemanas(n) {
    const txt = String(n).replace('.', ',');
    return `${txt} ${n === 1 ? 'semana' : 'semanas'}`;
}

export function formatoPlazo(plazo) {
    if (plazo.min === plazo.max) return formatoSemanas(plazo.min);
    return `${plazo.min}–${plazo.max} semanas`;
}

/* ------------------------------------------------------------ URL */

// Forma corta y legible para la URL: «web.admin-seo» o «3d.ia.u».
export function serializar(estado) {
    const partes = [estado.perfil, estado.bloques.join('-')];
    if (estado.urgente) partes.push('u');
    return partes.join('.');
}

export function deserializar(texto, datos) {
    if (typeof texto !== 'string' || !texto) return null;
    const [perfil, bloques = '', marca = ''] = texto.split('.');
    if (!porId(datos.perfiles, perfil)) return null;
    return normalizar({
        perfil,
        bloques: bloques ? bloques.split('-') : [],
        urgente: marca === 'u',
    }, datos);
}

/* ------------------------------------------------------------ resumen */

// Lo que se exporta a la zona 6 (briefing) y a quien quiera leerlo. Es un
// objeto plano, sin referencias al motor: la zona 6 no necesita este código.
export function resumen(estadoEntrada, datos, { enlace = '', fecha = new Date().toISOString() } = {}) {
    const c = calcular(estadoEntrada, datos);
    const bloques = c.estado.bloques.map(id => {
        const b = porId(datos.bloques, id);
        return {
            id: b.id,
            nombre: b.nombre,
            precio: { min: b.min, max: b.max },
            semanas: b.semanas,
            mensual: Boolean(b.mensual),
        };
    });
    if (c.estado.urgente) {
        bloques.push({ id: datos.urgente.id, nombre: datos.urgente.nombre, precio: c.recargo ? { min: c.recargo.min, max: c.recargo.max } : null, semanas: c.semanas - c.lineas.reduce((s, l) => s + l.semanas, 0), mensual: false });
    }

    const lineasTexto = [
        `Perfil: ${c.perfil.nombre}`,
        bloques.length ? `Bloques: ${bloques.map(b => b.nombre).join(', ')}` : 'Bloques: ninguno (solo la base)',
    ];
    if (c.paquete) lineasTexto.push(`Paquete: ${c.paquete.nombre}`);
    lineasTexto.push(`Inversión orientativa: ${formatoRango(c.total.min, c.total.max)} (sin IVA)`);
    if (c.mensual) lineasTexto.push(`Cuota mensual: ${formatoRango(c.mensual.min, c.mensual.max)}/mes`);
    lineasTexto.push(`Plazo estimado: ${formatoPlazo(c.plazo)}`);
    if (enlace) lineasTexto.push(`Configuración: ${enlace}`);

    return {
        version: 1,
        perfil: c.perfil,
        bloques,
        paquete: c.paquete ? c.paquete.id : null,
        urgente: c.estado.urgente,
        total: { min: c.total.min, max: c.total.max },
        mensual: c.mensual ? { min: c.mensual.min, max: c.mensual.max } : null,
        semanas: c.semanas,
        plazo: formatoPlazo(c.plazo),
        fases: c.fases,
        moneda: datos.moneda || 'EUR',
        iva: Boolean(datos.iva),
        enlace,
        texto: lineasTexto.join('\n'),
        fecha,
    };
}
