// Pruebas del núcleo de Lab Studio:  node --test apps/lab-studio/pruebas/
import test from 'node:test';
import assert from 'node:assert/strict';

import { CATALOGO, COMPONENTES, CATEGORIAS } from '../js/datos/componentes.js';
import { PROYECTOS } from '../js/datos/proyectos.js';
import * as M from '../js/core/modelo.js';
import { Historial } from '../js/core/historial.js';
import { construirRedes } from '../js/core/redes.js';
import { analizar } from '../js/core/erc.js';
import { crearEnrutador, rutaSimple, simplificar, caminoSvg } from '../js/core/ruta.js';
import { listaMateriales, materialesCsv, cabeceraPines, listaRedesTexto, platformioDe } from '../js/core/exportar.js';

const ESP = 'esp32-s3-devkitc-1-n16r8';
const def = id => CATALOGO.get(id);

function montaje(partes, cables) {
    return M.docDesdePlantilla({ partes, cables }, CATALOGO, 'prueba');
}
const codigos = a => a.problemas.map(p => p.codigo);

test('biblioteca: datos coherentes', () => {
    const categorias = new Set(CATEGORIAS.map(c => c[0]));
    const ids = new Set();
    for (const c of COMPONENTES) {
        assert.ok(!ids.has(c.id), 'id repetido ' + c.id);
        ids.add(c.id);
        assert.ok(categorias.has(c.categoria), c.id + ': categoría');
        assert.ok(Number.isInteger(c.w) && Number.isInteger(c.h) && c.w > 0 && c.h > 0, c.id + ': huella');
        assert.ok(c.nombre && c.corto && c.resumen && c.descripcion && c.ref, c.id + ': textos');
        const pines = new Set(), sitios = new Set();
        for (const p of c.pines) {
            assert.ok(!pines.has(p.id), `${c.id}: pin repetido ${p.id}`);
            pines.add(p.id);
            assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y), `${c.id}.${p.id}: fuera de rejilla`);
            assert.ok(p.x >= 0 && p.x <= c.w && p.y >= 0 && p.y <= c.h, `${c.id}.${p.id}: fuera de la huella`);
            assert.ok(M.DIRS.includes(p.lado), `${c.id}.${p.id}: lado`);
            const sitio = p.x + ',' + p.y;
            assert.ok(!sitios.has(sitio), `${c.id}.${p.id}: dos pines en el mismo punto`);
            sitios.add(sitio);
            if (p.tipo === 'fuente') assert.ok(p.v > 0, `${c.id}.${p.id}: fuente sin tensión`);
            if (p.tipo === 'alim') assert.ok(p.vmin > 0 && p.vmax >= p.vmin, `${c.id}.${p.id}: margen de alimentación`);
        }
        for (const via of c.alimPor || []) for (const id of via) assert.ok(pines.has(id), `${c.id}: alimPor ${id}`);
        for (const e of c.enlaces) assert.match(e.url, /^https?:\/\//, c.id + ': enlace');
    }
});

test('ESP32-S3: pinout de la DevKitC-1 y pines reservados', () => {
    const d = def(ESP);
    assert.equal(d.pines.filter(p => p.lado === 'izq').length, 22);
    assert.equal(d.pines.filter(p => p.lado === 'der').length, 22);
    assert.deepEqual(d.pines.filter(p => p.reservado).map(p => p.gpio), [37, 36, 35]);
    assert.equal(d.pines.find(p => p.id === 'GPIO8').fn.includes('I2C SDA'), true);
});

test('Raspberry Pi: cabecera de 40 pines', () => {
    const d = def('raspberry-pi-4b');
    const cab = d.pines.filter(p => p.fisico);
    assert.equal(cab.length, 40);
    assert.equal(cab.find(p => p.fisico === 8).id, 'GPIO14');
    assert.equal(cab.find(p => p.fisico === 39).tipo, 'gnd');
});

test('modelo: giro de pines y huella', () => {
    const d = def('oled-ssd1306');
    const p = { x: 100, y: 50, rot: 0 };
    const sda = d.pines.find(x => x.id === 'SDA');
    assert.deepEqual(M.posPin(p, d, sda), { x: 170, y: 60, dir: 'arr' });
    p.rot = 1;
    assert.deepEqual(M.posPin(p, d, sda), { x: 100 + (11 - 1) * 10, y: 50 + 70, dir: 'der' });
    p.rot = 2;
    assert.equal(M.posPin(p, d, sda).dir, 'aba');
    assert.deepEqual(M.tamano(def('hc-sr04'), 1), { w: 8, h: 18 });
});

test('modelo: cables válidos, duplicados y borrado en cascada', () => {
    const doc = M.nuevoDoc();
    const a = M.anadirParte(doc, def(ESP), 0, 0);
    const b = M.anadirParte(doc, def('oled-ssd1306'), 303, 98);
    assert.equal(b.x, 300); assert.equal(b.y, 100);
    assert.equal(a.ref, 'U1'); assert.equal(b.ref, 'DS1');
    assert.equal(typeof M.anadirCable(doc, CATALOGO, { p: a.id, pin: 'GPIO8' }, { p: b.id, pin: 'SDA' }), 'object');
    assert.equal(typeof M.anadirCable(doc, CATALOGO, { p: b.id, pin: 'SDA' }, { p: a.id, pin: 'GPIO8' }), 'string');
    assert.equal(typeof M.anadirCable(doc, CATALOGO, { p: a.id, pin: 'GPIO8' }, { p: a.id, pin: 'GPIO8' }), 'string');
    assert.equal(typeof M.anadirCable(doc, CATALOGO, { p: a.id, pin: 'NOPE' }, { p: b.id, pin: 'SDA' }), 'string');
    M.quitarPartes(doc, [b.id]);
    assert.equal(doc.cables.length, 0);
});

test('modelo: validarDoc sanea lo que viene de fuera', () => {
    assert.throws(() => M.validarDoc({ foo: 1 }, CATALOGO));
    assert.throws(() => M.validarDoc({ formato: 'lab-studio', version: 99 }, CATALOGO));
    const { doc, avisos } = M.validarDoc({
        formato: 'lab-studio', version: 1, nombre: ' x ',
        partes: [
            { id: 'p1', tipo: ESP, ref: 'U1', x: 3, y: 7, rot: 5 },
            { id: 'p1', tipo: ESP, x: 0, y: 0 },
            { id: 'p2', tipo: 'no-existe', x: 0, y: 0 },
            { id: 'p3', tipo: 'oled-ssd1306', x: 'a', y: 0 },
            { id: 'p4', tipo: 'oled-ssd1306', x: 200, y: 0 }
        ],
        cables: [
            { a: { p: 'p1', pin: 'GPIO8' }, b: { p: 'p4', pin: 'SDA' }, color: 'javascript:alert(1)' },
            { a: { p: 'p1', pin: 'GPIO9' }, b: { p: 'p9', pin: 'SCL' } },
            null
        ]
    }, CATALOGO);
    assert.equal(doc.nombre, 'x');
    assert.equal(doc.partes.length, 2);
    assert.equal(doc.partes[0].rot, 1);
    assert.equal(doc.partes[0].x, 0); assert.equal(doc.partes[0].y, 10);
    assert.equal(doc.cables.length, 1);
    assert.equal(doc.cables[0].color, undefined);
    assert.equal(avisos.length, 2);
});

test('historial: deshacer y rehacer', () => {
    const h = new Historial();
    const doc = M.nuevoDoc();
    h.reiniciar(doc);
    assert.equal(h.confirmar(doc), false);
    M.anadirParte(doc, def(ESP), 0, 0);
    assert.equal(h.confirmar(doc), true);
    M.anadirParte(doc, def('sg90'), 200, 0);
    h.confirmar(doc);
    assert.equal(h.deshacer().partes.length, 1);
    assert.equal(h.deshacer().partes.length, 0);
    assert.equal(h.deshacer(), null);
    assert.equal(h.rehacer().partes.length, 1);
});

test('redes: agrupa pines y nombra por clase', () => {
    const doc = montaje(
        [{ k: 'u', tipo: ESP, x: 0, y: 0 }, { k: 'o', tipo: 'oled-ssd1306', x: 30, y: 0 }, { k: 'b', tipo: 'bme280', x: 30, y: 20 }],
        [['u.GPIO8', 'o.SDA'], ['o.SDA', 'b.SDA'], ['u.GPIO9', 'o.SCL'], ['u.3V3_1', 'o.VCC'], ['u.GND_1', 'o.GND'], ['o.GND', 'b.GND']]
    );
    const { redes } = construirRedes(doc, CATALOGO);
    const porNombre = Object.fromEntries(redes.map(r => [r.nombre, r]));
    assert.deepEqual(Object.keys(porNombre).sort(), ['+3V3', 'GND', 'GPIO8', 'GPIO9']);
    assert.equal(porNombre.GPIO8.pines.length, 3);
    assert.equal(porNombre.GND.clase, 'gnd');
    assert.equal(porNombre['+3V3'].clase, 'v3');
});

test('ERC: montaje correcto sin errores', () => {
    const doc = montaje(
        [{ k: 'pc', tipo: 'pc-host', x: 0, y: 0 }, { k: 'u', tipo: ESP, x: 30, y: 0 }, { k: 'o', tipo: 'oled-ssd1306', x: 60, y: 0 }],
        [['pc.USB2', 'u.USB_UART'], ['u.GPIO8', 'o.SDA'], ['u.GPIO9', 'o.SCL'], ['u.3V3_1', 'o.VCC'], ['u.GND_1', 'o.GND']]
    );
    const a = analizar(doc, CATALOGO);
    assert.deepEqual(codigos(a), []);
    assert.equal(a.alimentacion.find(x => x.nombre === '+3V3').consumo, 20);
});

test('ERC: cortocircuito y fuentes de distinta tensión', () => {
    const corto = analizar(montaje([{ k: 'u', tipo: ESP, x: 0, y: 0 }], [['u.5V_1', 'u.GND_1']]), CATALOGO);
    assert.ok(codigos(corto).includes('E-CORTO'));
    const dos = analizar(montaje([{ k: 'u', tipo: ESP, x: 0, y: 0 }], [['u.5V_1', 'u.3V3_1']]), CATALOGO);
    assert.ok(codigos(dos).includes('E-FUENTES'));
});

test('ERC: 5 V en un GPIO de 3,3 V y arreglo con divisor', () => {
    const base = [{ k: 'pc', tipo: 'pc-host', x: -30, y: 0 }, { k: 'u', tipo: ESP, x: 0, y: 0 }, { k: 's', tipo: 'hc-sr04', x: 30, y: 0 }];
    const comunes = [['pc.USB2', 'u.USB_UART'], ['u.5V_1', 's.VCC'], ['u.GND_1', 's.GND'], ['u.GPIO4', 's.TRIG']];
    const mal = analizar(montaje(base, [...comunes, ['s.ECHO', 'u.GPIO5']]), CATALOGO);
    const p = mal.problemas.find(x => x.codigo === 'E-SOBRETENSION');
    assert.ok(p, 'debe detectar la sobretensión');
    assert.match(p.detalle, /ECHO/);
    const bien = analizar(montaje([...base, { k: 'd', tipo: 'divisor-5v-3v3', x: 30, y: 20 }],
        [...comunes, ['s.ECHO', 'd.IN'], ['d.OUT', 'u.GPIO5'], ['d.GND', 'u.GND_2']]), CATALOGO);
    assert.deepEqual(codigos(bien).filter(c => c.startsWith('E-')), []);
});

test('ERC: micrófono a 5 V, pin obligatorio y pin reservado', () => {
    const a = analizar(montaje(
        [{ k: 'u', tipo: ESP, x: 0, y: 0 }, { k: 'm', tipo: 'inmp441', x: 30, y: 0 }],
        [['u.5V_1', 'm.VDD'], ['u.GND_1', 'm.GND'], ['m.SD', 'u.GPIO35']]
    ), CATALOGO);
    const c = codigos(a);
    assert.ok(c.includes('E-SOBRETENSION'));
    assert.ok(c.includes('E-RESERVADO'));
    assert.ok(c.includes('A-PIN-REQ'));
    assert.ok(c.includes('A-SIN-ALIM'), 'el ESP32 no está alimentado');
});

test('ERC: corriente de la tira LED y masa sin unir', () => {
    const a = analizar(montaje(
        [{ k: 'pc', tipo: 'pc-host', x: -30, y: 0 }, { k: 'u', tipo: ESP, x: 0, y: 0 }, { k: 't', tipo: 'ws2812b', x: 30, y: 0 }],
        [['pc.USB2', 'u.USB_UART'], ['u.5V_1', 't.5V'], ['u.GPIO4', 't.DIN']]
    ), CATALOGO);
    const c = codigos(a);
    assert.ok(c.includes('A-CORRIENTE'));
    assert.ok(c.includes('A-SIN-GND'));
    assert.ok(c.includes('A-NIVEL'));
});

test('ERC: USB — Coral en puerto 2.0 y dos hosts', () => {
    const a = analizar(montaje(
        [{ k: 'pc', tipo: 'pc-host', x: 0, y: 0 }, { k: 'c', tipo: 'coral-usb', x: 30, y: 0 }],
        [['pc.USB2', 'c.USB']]
    ), CATALOGO);
    assert.ok(codigos(a).includes('A-CORRIENTE'));
    assert.ok(codigos(a).includes('I-USB2'));
    const b = analizar(montaje(
        [{ k: 'pc', tipo: 'pc-host', x: 0, y: 0 }, { k: 'r', tipo: 'raspberry-pi-4b', x: 30, y: 0 }],
        [['pc.USB3_1', 'r.USB3_1']]
    ), CATALOGO);
    assert.ok(codigos(b).includes('E-USB-HOSTS'));
});

test('ERC: 230 V unidos a la electrónica', () => {
    const a = analizar(montaje(
        [{ k: 'x', tipo: 'toma-230', x: 0, y: 0 }, { k: 'u', tipo: ESP, x: 30, y: 0 }],
        [['x.L', 'u.GPIO4']]
    ), CATALOGO);
    const p = a.problemas.find(x => x.codigo === 'E-DOMINIO');
    assert.ok(p);
    assert.match(p.titulo, /red/i);
});

test('ERC: circuito de potencia con Shelly correcto, y fase a neutro', () => {
    const partes = [
        { k: 'x', tipo: 'toma-230', x: 0, y: 0 }, { k: 'q', tipo: 'magnetotermico', x: 12, y: 0 },
        { k: 'k', tipo: 'shelly-1pm-mini-g3', x: 20, y: 20 }, { k: 'e', tipo: 'lampara', x: 40, y: 0 }, { k: 's', tipo: 'interruptor-pared', x: 0, y: 20 }
    ];
    const cables = [['x.L', 'q.L_IN'], ['x.N', 'q.N_IN'], ['q.L_OUT', 'k.L'], ['q.N_OUT', 'k.N'], ['k.O', 'e.L'], ['q.N_OUT', 'e.N'], ['q.L_OUT', 's.1'], ['s.2', 'k.SW']];
    const ok = analizar(montaje(partes, cables), CATALOGO);
    assert.deepEqual(codigos(ok).filter(c => !c.startsWith('I-')), []);
    const mal = analizar(montaje(partes, [...cables, ['k.O', 'q.N_OUT']]), CATALOGO);
    assert.ok(codigos(mal).includes('E-CORTO'));
});

test('ERC: masas separadas salvo que las una un USB', () => {
    const partes = [
        { k: 'u', tipo: ESP, x: 0, y: 0 }, { k: 'r', tipo: 'raspberry-pi-4b', x: 40, y: 0 },
        { k: 'o', tipo: 'oled-ssd1306', x: 0, y: 40 }, { k: 'b', tipo: 'bme280', x: 40, y: 40 }, { k: 'ps', tipo: 'fuente-5v', x: 80, y: 0 }
    ];
    const cables = [['u.GND_1', 'o.GND'], ['u.3V3_1', 'o.VCC'], ['r.GND_1', 'b.GND'], ['r.3V3_1', 'b.VIN'], ['ps.V', 'r.5V_1'], ['ps.GND', 'r.GND_2'], ['ps.V', 'u.5V_1']];
    assert.ok(codigos(analizar(montaje(partes, cables), CATALOGO)).includes('A-MASAS'));
    assert.ok(!codigos(analizar(montaje(partes, [...cables, ['r.USB2_1', 'u.USB_UART']]), CATALOGO)).includes('A-MASAS'));
});

test('enrutado: ortogonal, de pin a pin y determinista', () => {
    const doc = montaje(
        [{ k: 'u', tipo: ESP, x: 0, y: 0 }, { k: 'o', tipo: 'oled-ssd1306', x: 30, y: 4 }, { k: 's', tipo: 'hc-sr04', x: -30, y: 10 }],
        [['u.GPIO8', 'o.SDA'], ['u.GPIO9', 'o.SCL'], ['u.GPIO4', 's.TRIG'], ['u.GND_4', 's.GND']]
    );
    const trazar = crearEnrutador(doc, CATALOGO);
    const partes = new Map(doc.partes.map(p => [p.id, p]));
    for (const c of doc.cables) {
        const pa = partes.get(c.a.p), pb = partes.get(c.b.p);
        const da = def(pa.tipo), db = def(pb.tipo);
        const a = M.posPin(pa, da, da.pines.find(p => p.id === c.a.pin));
        const b = M.posPin(pb, db, db.pines.find(p => p.id === c.b.pin));
        const r = trazar(a, b, 1);
        assert.ok(r && r.length >= 2, 'hay ruta');
        assert.deepEqual(r[0], [a.x, a.y]);
        assert.deepEqual(r[r.length - 1], [b.x, b.y]);
        for (let i = 1; i < r.length; i++) {
            assert.ok(r[i][0] === r[i - 1][0] || r[i][1] === r[i - 1][1], 'tramo ortogonal');
            assert.ok(r[i][0] % 10 === 0 && r[i][1] % 10 === 0, 'en rejilla');
        }
        assert.ok(caminoSvg(r).startsWith('M'));
    }
    const s = rutaSimple({ x: 0, y: 0, dir: 'der' }, { x: 100, y: 50, dir: 'izq' });
    assert.deepEqual(s[0], [0, 0]);
    assert.deepEqual(s[s.length - 1], [100, 50]);
    assert.deepEqual(simplificar([[0, 0], [10, 0], [20, 0], [20, 10]]), [[0, 0], [20, 0], [20, 10]]);
});

test('exportación: materiales, redes y cabecera de pines', () => {
    const doc = montaje(
        [{ k: 'u', tipo: ESP, x: 0, y: 0 }, { k: 'o', tipo: 'oled-ssd1306', x: 30, y: 0 }, { k: 'r1', tipo: 'resistencia', x: 0, y: 40 }, { k: 'r2', tipo: 'resistencia', x: 0, y: 50 }],
        [['u.GPIO8', 'o.SDA'], ['u.GPIO9', 'o.SCL'], ['u.GPIO4', 'r1.1']]
    );
    const bom = listaMateriales(doc, CATALOGO, {});
    assert.equal(bom.lista.length, 3);
    assert.equal(bom.lista.find(f => f.def.id === 'resistencia').cantidad, 2);
    const oled = CATALOGO.get('oled-ssd1306').precio, res = 2 * CATALOGO.get('resistencia').precio;
    assert.ok(Math.abs(bom.total - (CATALOGO.get(ESP).precio + oled + res)) < 1e-9);
    assert.ok(Math.abs(bom.pendiente - (oled + res)) < 1e-9);
    assert.match(materialesCsv(doc, CATALOGO, {}), /R1 R2;2;Resistencia/);
    const a = analizar(doc, CATALOGO);
    const h = cabeceraPines(doc, CATALOGO, a);
    assert.match(h, /#define PIN_DS1_SDA\s+8 /);
    assert.match(h, /#define PIN_DS1_SCL\s+9 /);
    assert.match(h, /#define PIN_R1_1\s+4 /);
    assert.match(listaRedesTexto(doc, a), /GPIO8\n\s+U1\.GPIO8 .*\n\s+DS1\.SDA /);
});

test('proyectos: toda plantilla carga y pasa el ERC sin errores', () => {
    const conMontaje = PROYECTOS.filter(p => p.montaje);
    assert.equal(conMontaje.length, PROYECTOS.length, 'todo proyecto lleva montaje');
    const ids = new Set();
    for (const p of PROYECTOS) {
        assert.ok(!ids.has(p.id), 'proyecto repetido ' + p.id);
        ids.add(p.id);
        for (const e of [...(p.repos || []), ...(p.docs || [])]) assert.match(e.url, /^https:\/\//, p.id);
        for (const m of p.material || []) if (m.id) assert.ok(CATALOGO.has(m.id), `${p.id}: material ${m.id}`);
    }
    for (const p of conMontaje) {
        const doc = M.docDesdePlantilla(p.montaje, CATALOGO, p.titulo);
        const a = analizar(doc, CATALOGO);
        const errores = a.problemas.filter(x => x.nivel !== 'info');
        assert.deepEqual(errores.map(x => `${x.codigo}: ${x.detalle}`), [], p.id);
        assert.ok(!a.problemas.some(x => x.codigo === 'I-SUELTA'), p.id + ': pieza sin conectar');
        // Las piezas no se solapan.
        const cajas = doc.partes.map(q => M.cajaParte(q, CATALOGO.get(q.tipo)));
        for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
            const A = cajas[i], B = cajas[j];
            assert.ok(A.x + A.w <= B.x || B.x + B.w <= A.x || A.y + A.h <= B.y || B.y + B.h <= A.y, `${p.id}: ${doc.partes[i].ref} pisa a ${doc.partes[j].ref}`);
        }
    }
});

test('ERC: límite conjunto de 1,2 A en los USB de la Raspberry Pi 4', () => {
    const pi = { k: 'pi', tipo: 'raspberry-pi-4b', x: 0, y: 0 }, coral = { k: 'c', tipo: 'coral-usb', x: 40, y: 0 };
    const una = { k: 'w1', tipo: 'webcam-ugreen-1080p', x: 0, y: 50 }, otra = { k: 'w2', tipo: 'webcam-ugreen-1080p', x: 30, y: 50 };
    // Coral (900 mA) + una webcam (250 mA) = 1150 mA: cabe.
    const justo = analizar(montaje([pi, coral, una], [['pi.USB3_1', 'c.USB'], ['pi.USB2_1', 'w1.USB']]), CATALOGO);
    assert.ok(!codigos(justo).includes('A-USB-TOTAL'));
    // Con la segunda webcam son 1400 mA: cada puerto va bien, el conjunto no.
    const pasado = analizar(montaje([pi, coral, una, otra], [['pi.USB3_1', 'c.USB'], ['pi.USB2_1', 'w1.USB'], ['pi.USB2_2', 'w2.USB']]), CATALOGO);
    assert.ok(codigos(pasado).includes('A-USB-TOTAL'));
    assert.ok(!codigos(pasado).includes('A-CORRIENTE'));
});

test('CYD 2,8": conectores, pines.h con los periféricos fijos y platformio.ini', () => {
    const d = def('esp32-2432s028r');
    assert.deepEqual(d.pines.filter(p => p.gpio != null).map(p => p.gpio).sort((a, b) => a - b), [1, 3, 21, 22, 27, 35]);
    assert.equal(d.pines.find(p => p.id === 'GPIO35').tipo, 'ent');
    const doc = montaje([{ k: 'u', tipo: 'esp32-2432s028r', x: 0, y: 0 }, { k: 's', tipo: 'bme280', x: 20, y: 30 }, { k: 'pc', tipo: 'pc-host', x: 50, y: 0 }],
        [['pc.USB2', 'u.USB'], ['u.GPIO27', 's.SDA'], ['u.GPIO22', 's.SCL'], ['u.3V3', 's.VIN'], ['u.GND_3', 's.GND']]);
    const a = analizar(doc, CATALOGO);
    assert.deepEqual(a.problemas.filter(x => x.nivel !== 'info').map(x => x.codigo), []);
    const h = cabeceraPines(doc, CATALOGO, a);
    assert.match(h, /#define PIN_S1_SDA\s+27 /);
    assert.match(h, /#define CYD_TFT_DC\s+2$/m);
    assert.match(h, /#define CYD_TOUCH_CS\s+33$/m);
    const pio = platformioDe(doc);
    assert.equal(pio.length, 1);
    assert.match(pio[0].ini, /board = esp32dev/);
    assert.equal(platformioDe(M.docDesdePlantilla({ partes: [{ k: 'e', tipo: ESP, x: 0, y: 0 }], cables: [] }, CATALOGO, 'x'))[0].titulo, 'ESP32-S3 N16R8');
});

test('ESP32-C3 SuperMini y M5StampS3: cabeceras, arranque y platformio.ini', () => {
    const c3 = def('esp32-c3-supermini');
    assert.equal(c3.pines.filter(p => p.lado === 'izq').length, 8);
    assert.equal(c3.pines.filter(p => p.lado === 'der').length, 8);
    assert.deepEqual(c3.pines.filter(p => p.strap).map(p => p.gpio).sort((a, b) => a - b), [2, 8, 9]);
    const st = def('m5stamp-s3');
    assert.deepEqual(st.pines.filter(p => p.gpio != null).map(p => p.gpio).sort((a, b) => a - b), [0, 1, 3, 5, 7, 9, 13, 15, 43, 44]);
    const doc = montaje([{ k: 'a', tipo: 'esp32-c3-supermini', x: 0, y: 0 }, { k: 'b', tipo: 'm5stamp-s3', x: 200, y: 0 }], []);
    assert.deepEqual(platformioDe(doc).map(x => x.titulo), ['ESP32-C3 SuperMini', 'M5StampS3']);
    assert.match(platformioDe(doc)[1].ini, /board = m5stack-stamps3/);
});

test('modelo: plegar un montaje apaisado para una pantalla vertical', () => {
    for (const p of PROYECTOS) {
        const pl = M.plegarPlantilla(p.montaje, CATALOGO, 335, 640);
        assert.equal(pl.partes.length, p.montaje.partes.length, p.id);
        assert.deepEqual(pl.cables, p.montaje.cables, p.id);
        const doc = M.docDesdePlantilla(pl, CATALOGO, p.titulo);
        assert.deepEqual(analizar(doc, CATALOGO).problemas.filter(x => x.nivel !== 'info').map(x => x.codigo), [], p.id);
        const cajas = doc.partes.map(q => M.cajaParte(q, CATALOGO.get(q.tipo)));
        for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
            const A = cajas[i], B = cajas[j];
            assert.ok(A.x + A.w <= B.x || B.x + B.w <= A.x || A.y + A.h <= B.y || B.y + B.h <= A.y, `${p.id}: ${doc.partes[i].ref} pisa a ${doc.partes[j].ref}`);
        }
    }
    // En horizontal no se toca nada.
    const p = PROYECTOS.find(x => x.id === 'cyd-shelly');
    assert.equal(M.plegarPlantilla(p.montaje, CATALOGO, 1200, 700), p.montaje);
    assert.ok(M.plegarPlantilla(p.montaje, CATALOGO, 335, 640) !== p.montaje);
});
