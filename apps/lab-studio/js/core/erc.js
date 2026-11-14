// Comprobación de reglas eléctricas (ERC) y balance de alimentación.
//
// Trabaja sobre los atributos eléctricos que cada pin declara en la
// biblioteca:
//   tipo   fuente | alim | gnd | es | ent | sal | pas | usb_host | usb_dev |
//          red | neutro | tierra
//   v      tensión que entrega (fuente) o nivel lógico que saca (sal, es)
//   vmin/vmax  margen admitido (alim) o máximo absoluto (ent, es)
//   vih    umbral de nivel alto de una entrada
//   imax   corriente que puede dar una fuente o un puerto USB (mA)
//   i      consumo típico (mA)
//   bi     la fuente también admite ser alimentada (5V/3V3 de una placa)
//   reservado / strap / req  avisos propios del pin
//
// Es un análisis estático: no simula el circuito, detecta montajes que no
// pueden funcionar o que dañan el hardware.

import { clavePin } from './modelo.js';
import { construirRedes } from './redes.js';

const NIVEL = { error: 0, aviso: 1, info: 2 };
const fmtV = v => (Number.isInteger(v) ? v : v.toFixed(1)).toString().replace('.', ',') + ' V';
const fmtI = ma => (ma >= 1000 ? (ma / 1000).toFixed(ma % 1000 ? 1 : 0).replace('.', ',') + ' A' : Math.round(ma) + ' mA');
const nom = e => `${e.parte.ref}.${e.pin.red || e.pin.n || e.pin.id}`;

export function analizar(doc, catalogo) {
    const { redes, porPin, porCable } = construirRedes(doc, catalogo);
    const problemas = [];
    const alimentacion = [];

    const anotar = (nivel, codigo, titulo, detalle, entradas = [], red = null) => {
        problemas.push({
            nivel, codigo, titulo, detalle,
            red: red ? red.id : null,
            pines: entradas.map(e => e.clave),
            partes: [...new Set(entradas.map(e => e.parte.id))]
        });
    };

    for (const red of redes) {
        const de = (...tipos) => red.pines.filter(e => tipos.includes(e.pin.tipo));
        const fuentes = de('fuente');
        const masas = de('gnd', 'neutro', 'tierra');
        const ac = red.dominios.has('ac');

        // 1. Mezcla de dominios: la más grave es red eléctrica con electrónica.
        if (red.dominios.size > 1) {
            const lista = [...red.dominios].map(d => ({ dc: 'electrónica de baja tensión', ac: 'red de 230 V', usb: 'USB', red: 'red de datos' }[d])).join(' y ');
            anotar('error', 'E-DOMINIO', ac ? 'Tensión de red unida a la electrónica' : 'Conexión entre dominios incompatibles',
                `La red ${red.nombre} une ${lista}. ${ac ? 'Peligro: 230 V en un circuito de baja tensión destruye el hardware y es un riesgo de electrocución. Usa un relé o un Shelly como aislamiento.' : 'Un puerto USB o de red no se cablea a pines sueltos.'}`,
                red.pines, red);
            continue;
        }

        // 2. Cortocircuito franco.
        if (fuentes.length && masas.length) {
            anotar('error', 'E-CORTO', 'Cortocircuito',
                `${fuentes.map(nom).join(', ')} está unido directamente a ${masas.map(nom).join(', ')}.`,
                [...fuentes, ...masas], red);
            continue;
        }

        // 3. Fuentes en paralelo.
        const tensiones = [...new Set(fuentes.map(e => e.pin.v))];
        if (tensiones.length > 1) {
            anotar('error', 'E-FUENTES', 'Dos tensiones distintas en la misma red',
                `${fuentes.map(e => `${nom(e)} (${fmtV(e.pin.v)})`).join(' y ')} quedan unidas entre sí.`, fuentes, red);
        } else if (fuentes.filter(e => !e.pin.bi).length > 1) {
            anotar('aviso', 'A-PARALELO', 'Fuentes en paralelo',
                `${fuentes.map(nom).join(' y ')} entregan ${fmtV(tensiones[0])} a la vez. Solo es seguro si están pensadas para repartir carga.`, fuentes, red);
        }

        // 4. Nivel de tensión presente en la red y pines que no lo soportan.
        const excitadores = red.pines.filter(e => ['fuente', 'sal', 'es'].includes(e.pin.tipo) && e.pin.v);
        const vRed = excitadores.length ? Math.max(...excitadores.map(e => e.pin.v)) : null;
        if (vRed != null) {
            const origen = excitadores.find(e => e.pin.v === vRed);
            for (const e of red.pines) {
                if (e === origen || e.pin.vmax == null || vRed <= e.pin.vmax) continue;
                const solucion = ac ? '' : e.pin.tipo === 'alim'
                    ? ' Aliméntalo desde una tensión dentro de su margen.'
                    : ' Intercala un divisor de tensión o un convertidor de nivel.';
                anotar('error', 'E-SOBRETENSION', `${fmtV(vRed)} en un pin de ${fmtV(e.pin.vmax)} máx.`,
                    `${nom(origen)} pone ${fmtV(vRed)} en ${nom(e)}, que admite ${fmtV(e.pin.vmax)} como máximo.${solucion}`,
                    [origen, e], red);
            }
            for (const e of de('alim')) {
                if (fuentes.length && e.pin.vmin != null && vRed < e.pin.vmin) {
                    anotar('aviso', 'A-SUBTENSION', 'Tensión de alimentación insuficiente',
                        `${nom(e)} necesita al menos ${fmtV(e.pin.vmin)} y la red ${red.nombre} da ${fmtV(vRed)}.`, [e], red);
                }
            }
            for (const e of de('ent')) {
                if (e.pin.vih != null && vRed < e.pin.vih && !fuentes.length) {
                    anotar('aviso', 'A-NIVEL', 'Nivel lógico justo',
                        `${nom(e)} necesita ${fmtV(e.pin.vih)} para leer un nivel alto y ${nom(origen)} solo da ${fmtV(vRed)}. Puede fallar: añade un convertidor de nivel.`,
                        [origen, e], red);
                }
            }
        }

        // 5. Dos salidas en la misma red.
        const salidas = de('sal');
        if (salidas.length > 1) {
            anotar('error', 'E-SALIDAS', 'Dos salidas enfrentadas',
                `${salidas.map(nom).join(' y ')} son salidas y están unidas: si sacan niveles distintos se cortocircuitan.`, salidas, red);
        }

        // 6. Entradas sin nada que las excite.
        const entradas = de('ent');
        if (entradas.length && entradas.length === red.pines.length) {
            anotar('aviso', 'A-FLOTANTE', 'Entradas unidas sin excitador',
                `En ${red.nombre} solo hay entradas (${entradas.map(nom).join(', ')}): nadie fija el nivel.`, entradas, red);
        }

        // 7. Pines reservados y de arranque.
        for (const e of red.pines) {
            if (e.pin.reservado) {
                anotar('error', 'E-RESERVADO', 'Pin reservado en uso', `${nom(e)}: ${e.pin.nota || 'no está disponible en esta placa.'}`, [e], red);
            } else if (e.pin.strap) {
                anotar('info', 'I-STRAP', 'Pin de arranque (strapping)', `${nom(e)}: ${e.pin.nota || 'su nivel durante el reset decide el modo de arranque.'}`, [e], red);
            }
        }

        // 8. Balance de corriente.
        if (red.dominios.has('usb')) {
            const hosts = de('usb_host'), disp = de('usb_dev');
            if (hosts.length > 1) {
                anotar('error', 'E-USB-HOSTS', 'Dos puertos anfitrión unidos', `${hosts.map(nom).join(' y ')} son puertos host: USB necesita un host y un dispositivo.`, hosts, red);
            } else if (!hosts.length) {
                anotar('aviso', 'A-USB-SIN-HOST', 'Enlace USB sin anfitrión', `${disp.map(nom).join(' y ')} son dispositivos: falta un PC, una Raspberry Pi o un hub.`, disp, red);
            } else {
                const host = hosts[0];
                const consumo = disp.reduce((s, e) => s + (e.pin.i || 0), 0);
                alimentacion.push({ red: red.id, nombre: `${nom(host)}`, tension: 5, consumo, capacidad: host.pin.imax || null, tipo: 'usb' });
                if (host.pin.imax && consumo > host.pin.imax) {
                    anotar('aviso', 'A-CORRIENTE', 'Puerto USB sobrecargado',
                        `${disp.map(nom).join(', ')} piden ${fmtI(consumo)} y ${nom(host)} da ${fmtI(host.pin.imax)}. Usa un hub alimentado.`, [host, ...disp], red);
                }
                for (const e of disp) {
                    if (e.pin.usb3 && host.pin.usb === 2) {
                        anotar('info', 'I-USB2', 'Dispositivo USB 3.0 en puerto 2.0', `${nom(e)} funciona en ${nom(host)}, pero más lento: rinde al máximo en un puerto USB 3.0.`, [e, host], red);
                    }
                }
            }
        } else if (fuentes.length) {
            const consumidores = de('alim');
            const consumo = consumidores.reduce((s, e) => s + (e.pin.i || 0), 0);
            const limites = fuentes.filter(e => e.pin.imax).map(e => e.pin.imax);
            // Con varias fuentes manda la mayor: las «bi» pasan a ser carga.
            const capacidad = limites.length ? Math.max(...limites) : null;
            alimentacion.push({ red: red.id, nombre: red.nombre, tension: tensiones[0], consumo, capacidad, tipo: ac ? 'ac' : 'dc' });
            if (capacidad && consumo > capacidad) {
                anotar('aviso', 'A-CORRIENTE', 'Fuente sobrecargada',
                    `Las cargas de ${red.nombre} piden ${fmtI(consumo)} y ${fuentes.map(nom).join(', ')} da ${fmtI(capacidad)} como máximo. Añade una fuente dedicada.`,
                    [...fuentes, ...consumidores], red);
            }
        }
    }

    // --- Comprobaciones por pieza -------------------------------------
    const conectado = (parte, pin) => porPin.get(clavePin(parte.id, pin.id)) || null;
    for (const parte of doc.partes) {
        const def = catalogo.get(parte.tipo);
        if (!def) continue;
        const ent = pin => ({ clave: clavePin(parte.id, pin.id), parte, def, pin });
        const unidos = def.pines.filter(p => conectado(parte, p));
        if (!unidos.length) {
            if (def.pines.length) anotar('info', 'I-SUELTA', 'Pieza sin conectar', `${parte.ref} (${def.corto}) no tiene ningún cable.`, [ent(def.pines[0])]);
            continue;
        }

        // Alimentación: vías alternativas declaradas o todos los pines «alim».
        const conFuente = pin => {
            const red = pin && conectado(parte, pin);
            if (!red) return false;
            if (pin.tipo === 'usb_dev') return red.pines.some(e => e.pin.tipo === 'usb_host');
            return red.pines.some(e => e.pin.tipo === 'fuente' && e.parte.id !== parte.id);
        };
        if (def.alimPor) {
            const ok = def.alimPor.some(via => via.every(id => conFuente(def.pines.find(p => p.id === id))));
            if (!ok) {
                anotar('aviso', 'A-SIN-ALIM', 'Sin alimentación', `${parte.ref} (${def.corto}) no recibe alimentación: ${def.alimNota || 'conecta su entrada de alimentación.'}`, [ent(def.pines[0])]);
            }
        } else {
            for (const pin of def.pines.filter(p => p.tipo === 'alim')) {
                if (!conFuente(pin)) {
                    anotar('aviso', 'A-SIN-ALIM', 'Sin alimentación', `${parte.ref}.${pin.n || pin.id} no llega a ninguna fuente${pin.vmin != null ? ` (necesita ${fmtV(pin.vmin)}–${fmtV(pin.vmax)})` : ''}.`, [ent(pin)]);
                }
            }
        }

        // Retorno: masa en continua, neutro en alterna.
        const usaDc = unidos.some(p => ['es', 'ent', 'sal', 'alim'].includes(p.tipo) && !p.dom && !p.puerto);
        const masas = def.pines.filter(p => p.tipo === 'gnd');
        if (usaDc && masas.length && !masas.some(p => conectado(parte, p))) {
            anotar('aviso', 'A-SIN-GND', 'Sin masa común', `${parte.ref} tiene señales o alimentación conectadas pero ningún GND: sin referencia común las señales no se leen bien.`, [ent(masas[0])]);
        }
        const neutros = def.pines.filter(p => p.tipo === 'neutro');
        if (unidos.some(p => p.dom === 'ac') && neutros.length && !neutros.some(p => conectado(parte, p))) {
            anotar('aviso', 'A-SIN-N', 'Sin neutro', `${parte.ref} está conectado a fase pero no tiene neutro: el circuito no se cierra.`, [ent(neutros[0])]);
        }

        // Pines que el fabricante obliga a fijar.
        for (const pin of def.pines.filter(p => p.req)) {
            if (!conectado(parte, pin)) anotar('aviso', 'A-PIN-REQ', 'Pin obligatorio sin conectar', `${parte.ref}.${pin.n || pin.id}: ${pin.nota || 'debe conectarse.'}`, [ent(pin)]);
        }
    }

    // --- Masas separadas ----------------------------------------------
    // Dos redes de GND comparten referencia si tocan la misma pieza (sus GND
    // son comunes por dentro) o piezas unidas por un cable USB.
    const redesGnd = redes.filter(r => r.clase === 'gnd');
    if (redesGnd.length > 1) {
        const grupo = new Map(doc.partes.map(p => [p.id, p.id]));
        const raiz = id => { while (grupo.get(id) !== id) id = grupo.get(id); return id; };
        const unir = ids => ids.slice(1).forEach(id => grupo.set(raiz(id), raiz(ids[0])));
        for (const r of redes) {
            if (r.clase === 'gnd' || r.clase === 'usb') unir([...new Set(r.pines.map(e => e.parte.id))]);
        }
        const islas = new Set(redesGnd.map(r => raiz(r.pines[0].parte.id)));
        if (islas.size > 1) {
            anotar('aviso', 'A-MASAS', 'Masas separadas', `Hay ${islas.size} masas independientes (${redesGnd.map(r => r.nombre).join(', ')}). Une todos los GND para que las señales compartan referencia.`, redesGnd.flatMap(r => r.pines));
        }
    }

    problemas.sort((a, b) => NIVEL[a.nivel] - NIVEL[b.nivel]);
    const cuenta = { error: 0, aviso: 0, info: 0 };
    for (const p of problemas) cuenta[p.nivel]++;
    return { redes, porPin, porCable, problemas, cuenta, alimentacion };
}

export const formato = { fmtV, fmtI };
