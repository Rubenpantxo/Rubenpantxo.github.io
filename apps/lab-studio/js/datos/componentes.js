// Biblioteca de componentes.
//
// Cada componente declara su huella (w × h en unidades de rejilla de 2,54 mm),
// el dibujo que lo representa y, por pin, los atributos eléctricos que usa la
// comprobación de reglas (ver core/erc.js). Los datos salen de las hojas de
// características enlazadas en `enlaces`.
//
// Para añadir un componente basta con una entrada aquí; si no tiene dibujo
// propio, `dibujo: 'modulo'` genera una placa a partir de `arte`.

const pin = (id, n, x, y, lado, tipo, extra = {}) => ({ id, n, x, y, lado, tipo, ...extra });
const gnd = (id, x, y, lado, n = 'GND') => pin(id, n, x, y, lado, 'gnd');
const doc = (t, url) => ({ t, url, tipo: 'doc' });
const hoja = (t, url) => ({ t, url, tipo: 'hoja' });
const repo = (t, url) => ({ t, url, tipo: 'repo' });

export const CATEGORIAS = [
    ['placas', 'Placas y host'],
    ['ia', 'Aceleradores de IA'],
    ['camaras', 'Cámaras'],
    ['sensores', 'Sensores'],
    ['actuadores', 'Actuadores'],
    ['salidas', 'Pantallas, luz y audio'],
    ['alimentacion', 'Alimentación y USB'],
    ['pasivos', 'Pasivos y adaptación'],
    ['red', 'Red'],
    ['potencia', 'Potencia 230 V']
];

// ---------------------------------------------------------------- ESP32-S3
const S3_FN = {
    0: ['BOOT'], 1: ['ADC1_CH0', 'TOUCH1'], 2: ['ADC1_CH1', 'TOUCH2'], 3: ['ADC1_CH2', 'TOUCH3'],
    4: ['ADC1_CH3', 'TOUCH4'], 5: ['ADC1_CH4', 'TOUCH5'], 6: ['ADC1_CH5', 'TOUCH6'], 7: ['ADC1_CH6', 'TOUCH7'],
    8: ['ADC1_CH7', 'TOUCH8', 'I2C SDA'], 9: ['ADC1_CH8', 'TOUCH9', 'I2C SCL'], 10: ['ADC1_CH9', 'TOUCH10', 'SPI SS'],
    11: ['ADC2_CH0', 'TOUCH11', 'SPI MOSI'], 12: ['ADC2_CH1', 'TOUCH12', 'SPI SCK'], 13: ['ADC2_CH2', 'TOUCH13', 'SPI MISO'],
    14: ['ADC2_CH3', 'TOUCH14'], 15: ['ADC2_CH4', 'XTAL_32K_P'], 16: ['ADC2_CH5', 'XTAL_32K_N'],
    17: ['ADC2_CH6', 'U1TXD'], 18: ['ADC2_CH7', 'U1RXD'], 19: ['USB D−', 'ADC2_CH8'], 20: ['USB D+', 'ADC2_CH9'],
    21: [], 35: ['PSRAM'], 36: ['PSRAM'], 37: ['PSRAM'], 38: ['LED RGB (v1.1)'],
    39: ['MTCK'], 40: ['MTDO'], 41: ['MTDI'], 42: ['MTMS'], 43: ['U0TXD'], 44: ['U0RXD'],
    45: ['VDD_SPI'], 46: ['ROM log'], 47: [], 48: ['LED RGB (v1.0)']
};
const S3_NOTA = {
    0: 'GPIO0 es el botón BOOT: a nivel bajo en el reset entra en modo descarga.',
    3: 'GPIO3 selecciona la fuente JTAG en el arranque: no lo fuerces durante el reset.',
    45: 'GPIO45 fija la tensión de VDD_SPI en el arranque: déjalo sin carga externa al reset.',
    46: 'GPIO46 controla los mensajes de la ROM y el modo de arranque: debe estar a nivel bajo en el reset.',
    19: 'GPIO19 es D− del USB nativo: si lo usas pierdes el puerto USB OTG.',
    20: 'GPIO20 es D+ del USB nativo: si lo usas pierdes el puerto USB OTG.'
};
const S3_J1 = ['3V3', '3V3', 'RST', 4, 5, 6, 7, 15, 16, 17, 18, 8, 3, 46, 9, 10, 11, 12, 13, 14, '5V', 'GND'];
const S3_J3 = ['GND', 43, 44, 1, 2, 42, 41, 40, 39, 38, 37, 36, 35, 0, 45, 48, 47, 21, 20, 19, 'GND', 'GND'];

function pinesS3() {
    const cuenta = {};
    const uno = (v, x, y, lado) => {
        if (typeof v === 'number') {
            const reservado = v >= 35 && v <= 37;
            return pin('GPIO' + v, v === 43 ? 'TX' : v === 44 ? 'RX' : String(v), x, y, lado, 'es', {
                gpio: v, v: 3.3, vmax: 3.6, fn: S3_FN[v] || [], red: 'GPIO' + v,
                ...(reservado ? { reservado: true, nota: `GPIO${v} está ocupado por la PSRAM octal del módulo N16R8. No se puede usar.` } : {}),
                ...([0, 3, 45, 46].includes(v) ? { strap: true } : {}),
                ...(S3_NOTA[v] && !reservado ? { nota: S3_NOTA[v] } : {})
            });
        }
        cuenta[v] = (cuenta[v] || 0) + 1;
        const id = v + '_' + cuenta[v];
        if (v === 'GND') return gnd(id, x, y, lado);
        if (v === '3V3') return pin(id, '3V3', x, y, lado, 'fuente', { v: 3.3, imax: 500, bi: true, nota: 'Salida del regulador de 3,3 V: unos 500 mA disponibles para periféricos.' });
        if (v === '5V') return pin(id, '5V', x, y, lado, 'fuente', { v: 5, imax: 500, bi: true, nota: '5 V del USB (VBUS). También admite alimentar la placa con 5 V externos.' });
        return pin(id, 'RST', x, y, lado, 'ent', { vmax: 3.6, nota: 'EN/Reset, activo a nivel bajo.' });
    };
    return [
        ...S3_J1.map((v, i) => uno(v, 1, 4 + i, 'izq')),
        ...S3_J3.map((v, i) => uno(v, 10, 4 + i, 'der')),
        pin('USB_UART', 'USB-C UART', 3, 28, 'aba', 'usb_dev', { i: 350, puerto: 'usbc', nota: 'Puente USB-serie (CH343/CP2102): programación y monitor serie.' }),
        pin('USB_OTG', 'USB-C OTG', 8, 28, 'aba', 'usb_dev', { i: 350, puerto: 'usbc', nota: 'USB nativo del ESP32-S3 (GPIO19/20): CDC, HID, MIDI, JTAG.' }),
        pin('WIFI', 'Wi-Fi', 5, 0, 'arr', 'red', { puerto: 'wifi', nota: 'Enlace lógico Wi-Fi: MQTT, HTTP o ESP-NOW hacia la red local.' })
    ];
}

// ------------------------------------------------------------ Raspberry Pi
const PI_CABECERA = [
    '3V3', '5V', 2, '5V', 3, 'GND', 4, 14, 'GND', 15, 17, 18, 27, 'GND', 22, 23, '3V3', 24, 10, 'GND',
    9, 25, 11, 8, 'GND', 7, 0, 1, 5, 'GND', 6, 12, 13, 'GND', 19, 16, 26, 20, 'GND', 21
];
const PI_FN = {
    2: ['I2C1 SDA'], 3: ['I2C1 SCL'], 4: ['GPCLK0', '1-Wire'], 14: ['UART TXD'], 15: ['UART RXD'], 18: ['PCM CLK', 'PWM0'],
    10: ['SPI0 MOSI'], 9: ['SPI0 MISO'], 11: ['SPI0 SCLK'], 8: ['SPI0 CE0'], 7: ['SPI0 CE1'], 0: ['ID_SD'], 1: ['ID_SC'],
    12: ['PWM0'], 13: ['PWM1'], 19: ['PCM FS', 'PWM1'], 20: ['PCM DIN'], 21: ['PCM DOUT']
};
function pinesPi() {
    const cuenta = {};
    const cabecera = PI_CABECERA.map((v, i) => {
        const fisico = i + 1, impar = fisico % 2 === 1;
        const x = impar ? 20 : 21, y = 3 + Math.floor(i / 2), lado = impar ? 'izq' : 'der';
        if (typeof v === 'number') {
            return pin('GPIO' + v, 'GPIO' + v, x, y, lado, 'es', {
                gpio: v, v: 3.3, vmax: 3.6, fn: PI_FN[v] || [], fisico, red: 'GPIO' + v,
                ...(v <= 1 ? { nota: 'Reservado para la EEPROM de identificación de HAT.', strap: true } : {})
            });
        }
        cuenta[v] = (cuenta[v] || 0) + 1;
        const id = v + '_' + cuenta[v];
        if (v === 'GND') return { ...gnd(id, x, y, lado), fisico };
        if (v === '3V3') return pin(id, '3V3', x, y, lado, 'fuente', { v: 3.3, imax: 500, fisico, nota: 'Raíl de 3,3 V: unos 500 mA en total.' });
        return pin(id, '5V', x, y, lado, 'fuente', { v: 5, imax: 1000, bi: true, fisico, nota: '5 V directos de la fuente (sin protección si alimentas por aquí).' });
    });
    return [
        ...cabecera,
        pin('PWR', 'POWER IN', 0, 5, 'izq', 'alim', { vmin: 4.8, vmax: 5.25, i: 3000, puerto: 'usbc', nota: 'USB-C de alimentación: 5,1 V / 3 A.' }),
        pin('USB2_1', 'USB 2.0 A', 4, 34, 'aba', 'usb_host', { imax: 500, usb: 2, puerto: 'usba' }),
        pin('USB2_2', 'USB 2.0 B', 7, 34, 'aba', 'usb_host', { imax: 500, usb: 2, puerto: 'usba' }),
        pin('USB3_1', 'USB 3.0 A', 11, 34, 'aba', 'usb_host', { imax: 900, usb: 3, puerto: 'usb3' }),
        pin('USB3_2', 'USB 3.0 B', 14, 34, 'aba', 'usb_host', { imax: 900, usb: 3, puerto: 'usb3' }),
        pin('ETH', 'Ethernet', 19, 34, 'aba', 'red', { puerto: 'rj45' }),
        pin('WIFI', 'Wi-Fi', 0, 26, 'izq', 'red', { puerto: 'wifi' })
    ];
}

// ------------------------------------------ ESP32-2432S028R («Cheap Yellow Display»)
// Solo salen a conectores P1 (serie), P3 y CN1; el resto de GPIO van a la
// pantalla, el táctil, la microSD, el LED RGB, la LDR y el altavoz.
const CYD_FIJOS = [
    ['Pantalla ILI9341 (HSPI)', [[2, 'TFT_DC'], [12, 'TFT_MISO'], [13, 'TFT_MOSI'], [14, 'TFT_SCK'], [15, 'TFT_CS'], [21, 'TFT_BL']]],
    ['Táctil XPT2046', [[25, 'TOUCH_CLK'], [32, 'TOUCH_MOSI'], [33, 'TOUCH_CS'], [36, 'TOUCH_IRQ'], [39, 'TOUCH_MISO']]],
    ['microSD (VSPI)', [[5, 'SD_CS'], [18, 'SD_SCK'], [19, 'SD_MISO'], [23, 'SD_MOSI']]],
    ['LED RGB, activo a nivel bajo', [[4, 'LED_R'], [16, 'LED_G'], [17, 'LED_B']]],
    ['Otros', [[34, 'LDR'], [26, 'ALTAVOZ'], [0, 'BOTON_BOOT']]]
];
function pinesCyd() {
    const io = (g, n, x, tipo, extra = {}) => pin('GPIO' + g, n, x, 19, 'aba', tipo, { gpio: g, v: 3.3, vmax: 3.6, red: 'GPIO' + g, ...extra });
    return [
        // P1 · serie
        pin('VIN', 'VIN', 3, 19, 'aba', 'fuente', { v: 5, imax: 500, bi: true, nota: '5 V del micro-USB. También sirve para alimentar la placa con 5 V externos (no uses los dos a la vez).' }),
        io(1, 'TX', 4, 'es', { fn: ['U0TXD'], nota: 'Va al CH340 del USB: si lo usas, choca con el monitor serie.' }),
        io(3, 'RX', 5, 'es', { fn: ['U0RXD'], nota: 'Va al CH340 del USB: si lo usas, choca con la programación y el monitor serie.' }),
        gnd('GND_1', 6, 19, 'aba'),
        // P3
        gnd('GND_2', 10, 19, 'aba'),
        io(35, '35', 11, 'ent', { fn: ['ADC1_CH7'], nota: 'GPIO35 es solo entrada y no tiene pull-up interno.' }),
        io(21, '21', 13, 'es', { fn: ['TFT_BL'], nota: 'GPIO21 es también la retroiluminación de la pantalla: si lo usas, la pantalla parpadea o se apaga.' }),
        // CN1
        gnd('GND_3', 17, 19, 'aba'),
        io(22, '22', 18, 'es', { fn: ['I2C SCL'], nota: 'GPIO22 sale por CN1 y por P3. Es el SCL habitual del I²C en esta placa.' }),
        io(27, '27', 19, 'es', { fn: ['I2C SDA'], nota: 'GPIO27 es el SDA habitual del I²C en esta placa. Algunas unidades traen una resistencia de 10 kΩ a 3,3 V.' }),
        pin('3V3', '3V3', 20, 19, 'aba', 'fuente', { v: 3.3, imax: 300, bi: true, nota: '3,3 V del regulador AMS1117 del ESP32, compartido con el módulo: deja unos 300 mA para periféricos.' }),
        pin('USB', 'micro-USB', 34, 10, 'der', 'usb_dev', { i: 300, puerto: 'microusb', nota: 'Alimentación y puente serie CH340: programación y monitor serie.' }),
        pin('WIFI', 'Wi-Fi', 0, 10, 'izq', 'red', { puerto: 'wifi', nota: 'Enlace lógico Wi-Fi: HTTP, MQTT o ESP-NOW hacia la red local.' })
    ];
}

// ------------------------------------------------- ESP32-C3 SuperMini
// Vista desde arriba (cara de los componentes) con el USB-C arriba, según el
// diagrama de espboards.dev. Los de arranque son 2, 8 y 9.
const C3_IZQ = [5, 6, 7, 8, 9, 10, 20, 21];
const C3_DER = ['5V', 'GND', '3V3', 4, 3, 2, 1, 0];
const C3_FN = {
    0: ['ADC1_CH0'], 1: ['ADC1_CH1'], 2: ['ADC1_CH2'], 3: ['ADC1_CH3'], 4: ['ADC1_CH4', 'SPI SCK', 'MTMS'], 5: ['ADC2_CH0', 'SPI MISO', 'MTDI'],
    6: ['SPI MOSI', 'MTCK'], 7: ['SPI SS', 'MTDO'], 8: ['I2C SDA', 'LED'], 9: ['I2C SCL', 'BOOT'], 10: [], 20: ['U0RXD'], 21: ['U0TXD']
};
const C3_NOTA = {
    2: 'GPIO2 es de arranque: debe estar a nivel alto en el reset (no lo lleves a GND).',
    5: 'GPIO5 está en el ADC2, que no se puede leer con la Wi-Fi activa.',
    8: 'GPIO8 lleva el LED azul (activo a nivel bajo) y es de arranque: debe estar alto en el reset para poder programar.',
    9: 'GPIO9 es el botón BOOT: a nivel bajo en el reset entra en modo descarga.',
    20: 'GPIO20 es el RX de la UART0.',
    21: 'GPIO21 es el TX de la UART0.'
};
function pinesC3() {
    const uno = (v, x, y, lado) => {
        if (typeof v === 'number') {
            return pin('GPIO' + v, String(v), x, y, lado, 'es', {
                gpio: v, v: 3.3, vmax: 3.6, fn: C3_FN[v] || [], red: 'GPIO' + v,
                ...([2, 8, 9].includes(v) ? { strap: true } : {}), ...(C3_NOTA[v] ? { nota: C3_NOTA[v] } : {})
            });
        }
        if (v === 'GND') return gnd('GND', x, y, lado);
        if (v === '3V3') return pin('3V3', '3V3', x, y, lado, 'fuente', { v: 3.3, imax: 500, bi: true, nota: 'Salida del regulador de 3,3 V (hasta 500 mA, compartidos con el ESP32-C3). También admite 3,3 V externos.' });
        return pin('5V', '5V', x, y, lado, 'fuente', { v: 5, imax: 500, bi: true, nota: '5 V del USB-C. También sirve para alimentar la placa con 5 V externos, pero no a la vez que el USB.' });
    };
    return [
        ...C3_IZQ.map((v, i) => uno(v, 1, 1 + i, 'izq')),
        ...C3_DER.map((v, i) => uno(v, 7, 1 + i, 'der')),
        pin('USB', 'USB-C', 4, 0, 'arr', 'usb_dev', { i: 350, puerto: 'usbc', nota: 'USB nativo del ESP32-C3 (GPIO18/19): programación y monitor serie USB CDC.' }),
        pin('WIFI', 'Wi-Fi', 4, 9, 'aba', 'red', { puerto: 'wifi', nota: 'Enlace lógico Wi-Fi o ESP-NOW. La antena cerámica es pequeña: el alcance es menor que en otras placas.' })
    ];
}

// ------------------------------------------- M5StampS3 (cabecera de 2,54 mm)
// Versión PIN2.54: de la doble fila de 1,27 mm solo salen los pines alternos.
const STAMP_IZQ = [1, 3, 5, 7, 9, 'GND', '5V', 13, 15];
const STAMP_DER = [null, null, null, '3V3', 43, 44, 'EN', 0, 'GND'];
function pinesStamp() {
    let tierras = 0;
    const uno = (v, x, y, lado) => {
        if (typeof v === 'number') {
            const fn = { 1: ['ADC1_CH0', 'TOUCH1'], 3: ['ADC1_CH2', 'TOUCH3'], 5: ['ADC1_CH4', 'TOUCH5'], 7: ['ADC1_CH6', 'TOUCH7'], 9: ['ADC1_CH8', 'TOUCH9'], 13: ['I2C SDA', 'ADC2_CH2'], 15: ['I2C SCL', 'ADC2_CH4'], 43: ['U0TXD'], 44: ['U0RXD'], 0: ['BOOT', 'Botón'] }[v];
            const nota = {
                0: 'G0 es también el botón de la placa y pin de arranque: a nivel bajo en el reset entra en modo descarga.',
                3: 'G3 elige la fuente del JTAG en el arranque: no lo fuerces durante el reset.',
                13: 'G13 es el SDA por defecto del I²C en la StampS3.', 15: 'G15 es el SCL por defecto del I²C en la StampS3.',
                43: 'G43 es el TX de la UART0: lleva los mensajes de arranque.', 44: 'G44 es el RX de la UART0.'
            }[v];
            return pin('GPIO' + v, 'G' + v, x, y, lado, 'es', { gpio: v, v: 3.3, vmax: 3.6, fn, red: 'GPIO' + v, ...(v === 0 || v === 3 ? { strap: true } : {}), ...(nota ? { nota } : {}) });
        }
        if (v === 'GND') return gnd('GND_' + ++tierras, x, y, lado);
        if (v === '3V3') return pin('3V3', '3V3', x, y, lado, 'fuente', { v: 3.3, imax: 500, bi: true, nota: '3,3 V del convertidor MUN3CAD01 de 1 A, compartido con el módulo.' });
        if (v === 'EN') return pin('EN', 'EN', x, y, lado, 'ent', { vmax: 3.6, nota: 'Reset, activo a nivel bajo.' });
        return pin('5V', '5V', x, y, lado, 'fuente', { v: 5, imax: 500, bi: true, nota: '5 V del USB-C o entrada de 5 V para alimentar la placa (no a la vez que el USB).' });
    };
    return [
        ...STAMP_IZQ.map((v, i) => uno(v, 1, 1 + i, 'izq')),
        ...STAMP_DER.map((v, i) => v != null && uno(v, 7, 1 + i, 'der')).filter(Boolean),
        pin('USB', 'USB-C', 4, 10, 'aba', 'usb_dev', { i: 350, puerto: 'usbc', nota: 'USB nativo del ESP32-S3 (G19/G20): programación, monitor serie, HID y MIDI.' }),
        pin('WIFI', 'Wi-Fi', 4, 0, 'arr', 'red', { puerto: 'wifi', nota: 'Enlace lógico Wi-Fi o ESP-NOW con la antena 3D de la placa.' })
    ];
}

// Fila de pines en el borde inferior de un módulo genérico.
const fila = (lista, h, x0 = 1) => lista.map(([id, n, tipo, extra], i) => pin(id, n, x0 + i, h - 1, 'aba', tipo, extra));
const I2C = { vmax: 5.5 };

export const COMPONENTES = [
    {
        id: 'esp32-s3-devkitc-1-n16r8', nombre: 'ESP32-S3-DevKitC-1 N16R8', corto: 'ESP32-S3 N16R8', fabricante: 'Espressif Systems',
        categoria: 'placas', propio: true, precio: 14, ref: 'U', mcu: true, w: 11, h: 28, dibujo: 'esp32s3',
        resumen: 'Doble núcleo LX7 a 240 MHz · 16 MB Flash · 8 MB PSRAM octal · Wi-Fi 4 + BLE 5 · USB OTG',
        descripcion: 'Placa de desarrollo con el módulo ESP32-S3-WROOM-1. Las instrucciones vectoriales del S3 aceleran redes neuronales con TensorFlow Lite Micro y ESP-NN; los 8 MB de PSRAM octal dan sitio al tensor arena de modelos de visión o audio.',
        aviso: 'En la variante N16R8 los GPIO 35, 36 y 37 están ocupados por la PSRAM octal: no se pueden usar. Todos los GPIO trabajan a 3,3 V y no toleran 5 V.',
        alimPor: [['USB_UART'], ['USB_OTG'], ['5V_1'], ['3V3_1'], ['3V3_2']],
        alimNota: 'conecta uno de sus USB-C a un host o entra con 5 V por el pin 5V.',
        specs: [
            ['Procesador', 'Xtensa LX7 de doble núcleo, 240 MHz, instrucciones vectoriales'],
            ['Memoria', '512 KB SRAM · 8 MB PSRAM octal · 16 MB Flash'],
            ['Radio', 'Wi-Fi 802.11 b/g/n (2,4 GHz) · Bluetooth 5 LE'],
            ['E/S', '36 GPIO en cabecera · 2 ADC de 12 bit · 14 táctiles · SPI, I²C, I²S, UART, RMT, LEDC'],
            ['USB', 'USB-C nativo (OTG, CDC, JTAG) + USB-C con puente serie'],
            ['Alimentación', '5 V por USB o pin 5V · lógica de 3,3 V'],
            ['Consumo', '≈ 100 mA en reposo con radio, picos de 350 mA al transmitir'],
            ['Dimensiones', '69,9 × 25,4 mm · dos tiras de 22 pines a 2,54 mm']
        ],
        pines: pinesS3(),
        enlaces: [
            doc('Guía de la placa (Espressif)', 'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/index.html'),
            hoja('Hoja de datos ESP32-S3', 'https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf'),
            hoja('Módulo ESP32-S3-WROOM-1', 'https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf'),
            repo('espressif/arduino-esp32', 'https://github.com/espressif/arduino-esp32'),
            repo('espressif/esp-idf', 'https://github.com/espressif/esp-idf')
        ]
    },
    {
        id: 'raspberry-pi-4b', nombre: 'Raspberry Pi 4 Model B', corto: 'Raspberry Pi 4B', fabricante: 'Raspberry Pi Ltd',
        categoria: 'placas', propio: true, precio: 124.8, ref: 'U', mcu: true, w: 22, h: 34, dibujo: 'rpi4', usbTotal: 1200,
        resumen: 'Cortex-A72 de 4 núcleos a 1,8 GHz · 2 × USB 3.0 · Gigabit Ethernet · Wi-Fi de doble banda',
        descripcion: 'Ordenador de placa única con Linux. Es el host natural del Coral USB: sus dos puertos USB 3.0 dan al acelerador el ancho de banda que necesita y puede quedarse encendido 24/7 con el broker MQTT y la inferencia.',
        aviso: 'Los GPIO son de 3,3 V y no toleran 5 V. Para el Coral usa siempre los puertos azules (USB 3.0). Los cuatro USB comparten 1,2 A: el Coral a máxima frecuencia (900 mA) deja 300 mA para lo demás.',
        alimPor: [['PWR'], ['5V_1'], ['5V_2']],
        alimNota: 'necesita una fuente USB-C de 5,1 V / 3 A.',
        specs: [
            ['Procesador', 'Broadcom BCM2711, 4 × Cortex-A72 (ARMv8) a 1,8 GHz'],
            ['Memoria', '1, 2, 4 u 8 GB LPDDR4-3200 (precio de la versión de 4 GB)'],
            ['Red', 'Gigabit Ethernet · Wi-Fi 802.11ac · Bluetooth 5.0'],
            ['USB', '2 × USB 3.0 · 2 × USB 2.0 · 1,2 A en total entre los cuatro'],
            ['E/S', 'Cabecera de 40 pines: 28 GPIO, I²C, SPI, UART, PCM, PWM'],
            ['GPIO', '3,3 V · hasta 16 mA por pin y 50 mA entre todos'],
            ['Vídeo', '2 × micro-HDMI (4K60) · CSI · DSI'],
            ['Alimentación', '5 V / 3 A por USB-C (vale 2,5 A si los USB piden menos de 500 mA)'],
            ['Dimensiones', '85 × 56 mm']
        ],
        pines: pinesPi(),
        enlaces: [
            doc('Documentación oficial', 'https://www.raspberrypi.com/documentation/computers/raspberry-pi.html'),
            hoja('Hoja de datos Raspberry Pi 4', 'https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-datasheet.pdf'),
            doc('Pinout interactivo', 'https://pinout.xyz/'),
            repo('raspberrypi/linux', 'https://github.com/raspberrypi/linux')
        ]
    },
    {
        id: 'esp32-2432s028r', nombre: 'ESP32-2432S028R · pantalla táctil de 2,8"', corto: 'ESP32 CYD 2,8"', fabricante: 'Sunton (genérica, «Cheap Yellow Display»)',
        categoria: 'placas', propio: true, precio: 15, ref: 'U', mcu: true, w: 34, h: 20, dibujo: 'cyd',
        fijos: CYD_FIJOS, placaCodigo: 'cyd',
        resumen: 'ESP32 de doble núcleo LX6 · TFT de 2,8" 240 × 320 táctil · Wi-Fi + BLE · microSD · LED RGB',
        descripcion: 'Placa todo en uno con el módulo ESP32-WROOM-32 detrás de una pantalla de 2,8" de 65 000 colores con táctil resistivo. Trae ranura microSD, LED RGB, sensor de luz (LDR), salida de altavoz y tres conectores con los pocos GPIO que quedan libres: ideal para paneles de control, monitores y mandos con interfaz gráfica (LVGL o TFT_eSPI).',
        aviso: 'Casi todos los GPIO están ocupados por la pantalla, el táctil y la microSD: solo quedan libres el 22 y el 27 (CN1), el 35 (solo entrada) y el 21, que es la retroiluminación. Todo trabaja a 3,3 V. Hay una variante con dos USB (micro-USB y USB-C) que monta el controlador ST7789 en lugar del ILI9341: mira la etiqueta del dorso.',
        alimPor: [['USB'], ['VIN']],
        alimNota: 'conecta el micro-USB a un host o un cargador, o entra con 5 V por VIN (conector P1).',
        specs: [
            ['Procesador', 'ESP32-D0WD (módulo ESP32-WROOM-32), Xtensa LX6 de doble núcleo a 240 MHz'],
            ['Memoria', '520 KB SRAM · 4 MB Flash · sin PSRAM'],
            ['Pantalla', 'TFT de 2,8" · 240 × 320 · 65 K colores · ILI9341 por SPI (ST7789 en la variante de dos USB)'],
            ['Táctil', 'Resistivo, controlador XPT2046 por SPI'],
            ['Radio', 'Wi-Fi 802.11 b/g/n (2,4 GHz) · Bluetooth 4.2 y BLE'],
            ['Integrados', 'microSD · LED RGB · LDR en GPIO34 · altavoz por GPIO26 con amplificador · botones BOOT y RST'],
            ['GPIO libres', '22 y 27 en CN1 (I²C), 35 solo entrada y 21 compartido con la retroiluminación en P3, TX/RX en P1'],
            ['Alimentación', '5 V por micro-USB (CH340) o por VIN · dos reguladores AMS1117 de 3,3 V'],
            ['Consumo', '≈ 115 mA con la retroiluminación al máximo; el ESP32 añade picos de unos 240 mA al transmitir por Wi-Fi'],
            ['Dimensiones', '86 × 50 mm · ≈ 50 g']
        ],
        pines: pinesCyd(),
        enlaces: [
            doc('Patillaje y ejemplos de la comunidad', 'https://github.com/witnessmenow/ESP32-Cheap-Yellow-Display'),
            doc('Patillaje de la CYD (Random Nerd Tutorials)', 'https://randomnerdtutorials.com/esp32-cheap-yellow-display-cyd-pinout-esp32-2432s028r/'),
            doc('Especificaciones y esquema (Mischianti)', 'https://mischianti.org/esp32-2432s028-cheap-yellow-display-high-resolution-pinout-datasheet-schema-and-specs'),
            hoja('Módulo ESP32-WROOM-32', 'https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf'),
            repo('Bodmer/TFT_eSPI', 'https://github.com/Bodmer/TFT_eSPI'),
            repo('PaulStoffregen/XPT2046_Touchscreen', 'https://github.com/PaulStoffregen/XPT2046_Touchscreen'),
            repo('lvgl/lvgl', 'https://github.com/lvgl/lvgl')
        ]
    },
    {
        id: 'esp32-c3-supermini', nombre: 'ESP32-C3 SuperMini', corto: 'ESP32-C3 SuperMini', fabricante: 'Genérica (Nologo / Tenstar)',
        categoria: 'placas', precio: 3.5, ref: 'U', mcu: true, w: 8, h: 9, dibujo: 'c3mini',
        fijos: [['Integrados', [[8, 'LED_AZUL'], [9, 'BOTON_BOOT']]]], placaCodigo: 'c3',
        resumen: 'RISC-V de un núcleo a 160 MHz · 4 MB Flash · Wi-Fi 4 + BLE 5 · USB-C nativo · 22,5 × 18 mm',
        descripcion: 'La placa más pequeña y barata de la familia: un ESP32-C3 con 13 GPIO, USB-C nativo y antena cerámica. Encaja donde no cabe otra: el receptor de un dron o un coche, un pulsador inalámbrico, un sensor a pilas o una tira de LED con WLED.',
        aviso: 'Todo a 3,3 V. GPIO2, GPIO8 y GPIO9 deciden el arranque: no los lleves a GND durante el reset. GPIO8 lleva el LED azul, activo a nivel bajo. El orden de los pines cambia en algunas copias: compáralo con la serigrafía de la tuya. No uses a la vez el USB-C y una fuente en el pin 5V.',
        alimPor: [['USB'], ['5V'], ['3V3']],
        alimNota: 'conecta el USB-C a un host o entra con 5 V por el pin 5V.',
        specs: [
            ['Procesador', 'ESP32-C3FN4, RISC-V de un núcleo a 160 MHz'],
            ['Memoria', '400 KB SRAM · 4 MB Flash integrada'],
            ['Radio', 'Wi-Fi 802.11 b/g/n (2,4 GHz) · Bluetooth 5 LE · antena cerámica'],
            ['E/S', '13 GPIO en dos tiras de 8 pines · 6 ADC · I²C, SPI, UART, PWM'],
            ['Por defecto', 'I²C: SDA 8, SCL 9 · SPI: SCK 4, MISO 5, MOSI 6, SS 7 · UART0: TX 21, RX 20'],
            ['USB', 'USB-C nativo (CDC y JTAG): activa «USB CDC On Boot» en Arduino'],
            ['Integrados', 'LED azul en GPIO8 (activo a nivel bajo) · LED rojo de alimentación · botones BOOT (GPIO9) y RST'],
            ['Alimentación', '5 V por USB-C o pin 5V · regulador de 3,3 V de 500 mA'],
            ['Dimensiones', '22,5 × 18 mm']
        ],
        pines: pinesC3(),
        enlaces: [
            doc('Primeros pasos (Random Nerd Tutorials)', 'https://randomnerdtutorials.com/getting-started-esp32-c3-super-mini/'),
            doc('Patillaje y pines seguros (espboards.dev)', 'https://www.espboards.dev/esp32/esp32-c3-super-mini/'),
            doc('Configuración en ESPHome (sudo.is)', 'https://www.sudo.is/docs/esphome/boards/esp32c3supermini/'),
            hoja('Hoja de datos ESP32-C3', 'https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf'),
            repo('espressif/arduino-esp32', 'https://github.com/espressif/arduino-esp32')
        ]
    },
    {
        id: 'm5stamp-s3', nombre: 'M5StampS3 (cabecera de 2,54 mm)', corto: 'M5StampS3', fabricante: 'M5Stack',
        categoria: 'placas', precio: 8.9, ref: 'U', mcu: true, w: 8, h: 10, dibujo: 'stamps3',
        fijos: [['Integrados', [[21, 'LED_RGB'], [0, 'BOTON']]]], placaCodigo: 'stamp',
        resumen: 'ESP32-S3 de doble núcleo LX7 · 8 MB Flash · Wi-Fi 4 + BLE 5 · USB-C nativo · LED RGB · 26 × 18 mm',
        descripcion: 'Módulo sello de M5Stack con un ESP32-S3FN8, antena 3D, USB-C nativo, un botón programable y un LED RGB WS2812B. La versión con cabecera de 2,54 mm saca 10 GPIO, alimentación y el reset: cabe en una protoboard y tiene USB HID, MIDI y las instrucciones vectoriales del S3.',
        aviso: 'Todo a 3,3 V. No lleva PSRAM, así que los modelos de voz o visión grandes no caben. G0 es el botón y el pin de arranque; G43 y G44 son la UART0 de los mensajes de arranque. La versión de 1,27 mm tiene 23 GPIO en otro orden.',
        alimPor: [['USB'], ['5V'], ['3V3']],
        alimNota: 'conecta el USB-C a un host o entra con 5 V por el pin 5V.',
        specs: [
            ['Procesador', 'ESP32-S3FN8, Xtensa LX7 de doble núcleo a 240 MHz, instrucciones vectoriales'],
            ['Memoria', '512 KB SRAM · 8 MB Flash · sin PSRAM'],
            ['Radio', 'Wi-Fi 802.11 b/g/n (2,4 GHz) · Bluetooth 5 LE · antena 3D'],
            ['E/S', 'Cabecera de 2,54 mm: G1, G3, G5, G7, G9, G13, G15, G43, G44 y G0'],
            ['Por defecto', 'I²C: SDA G13, SCL G15 · UART0: TX G43, RX G44'],
            ['USB', 'USB-C nativo (G19/G20): CDC, HID, MIDI y JTAG'],
            ['Integrados', 'LED RGB WS2812B-2020 en G21 · botón en G0 · conector FPC para pantalla SPI en el dorso'],
            ['Alimentación', '5 V por USB-C o pin 5V · convertidor de 3,3 V MUN3CAD01 (1 A)'],
            ['Dimensiones', '26 × 18 × 4,6 mm · 3,4 g']
        ],
        pines: pinesStamp(),
        enlaces: [
            doc('Documentación y mapa de pines (M5Stack)', 'https://docs.m5stack.com/en/core/Stamp-S3_PIN2.54'),
            hoja('Hoja de datos ESP32-S3', 'https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf'),
            repo('m5stack/M5Unified', 'https://github.com/m5stack/M5Unified'),
            repo('FastLED/FastLED', 'https://github.com/FastLED/FastLED')
        ]
    },
    {
        id: 'pc-host', nombre: 'PC o portátil (host)', corto: 'PC host', fabricante: 'Genérico',
        categoria: 'placas', propio: true, precio: 0, ref: 'PC', w: 20, h: 14, dibujo: 'pc',
        resumen: 'Host de desarrollo: Python, PyCoral, PlatformIO y monitor serie',
        descripcion: 'El ordenador de trabajo. Ejecuta el script de inferencia con el Coral, programa el ESP32-S3 y recibe los flujos de las cámaras.',
        specs: [['USB', '2 × USB 3.0 (900 mA) · 1 × USB 2.0 (500 mA)'], ['Red', 'Wi-Fi / Ethernet en la misma LAN que las cámaras']],
        pines: [
            pin('USB3_1', 'USB 3.0 A', 20, 3, 'der', 'usb_host', { imax: 900, usb: 3, puerto: 'usb3' }),
            pin('USB3_2', 'USB 3.0 B', 20, 6, 'der', 'usb_host', { imax: 900, usb: 3, puerto: 'usb3' }),
            pin('USB2', 'USB 2.0', 20, 9, 'der', 'usb_host', { imax: 500, usb: 2, puerto: 'usba' }),
            pin('LAN', 'Wi-Fi / LAN', 0, 5, 'izq', 'red', { puerto: 'wifi' })
        ],
        enlaces: [doc('PlatformIO', 'https://platformio.org/'), doc('Instalar PyCoral', 'https://coral.ai/software/#pycoral-api')]
    },
    {
        id: 'coral-usb', nombre: 'Google Coral USB Accelerator', corto: 'Coral USB', fabricante: 'Google',
        categoria: 'ia', propio: true, precio: 112, ref: 'A', w: 26, h: 12, dibujo: 'coral',
        resumen: 'Coprocesador Edge TPU · 4 TOPS a 2 W · modelos TensorFlow Lite INT8',
        descripcion: 'Acelerador de inferencia por USB. Ejecuta modelos TensorFlow Lite cuantizados a 8 bit compilados para el Edge TPU: MobileNet v2 en torno a 2,5 ms por imagen, sin cargar la CPU del host.',
        aviso: 'Necesita un host con Linux, macOS o Windows (PC o Raspberry Pi): no se conecta directamente al ESP32-S3. A máxima frecuencia consume hasta 900 mA y se calienta.',
        alimPor: [['USB']],
        alimNota: 'conéctalo a un puerto USB 3.0 del host o a un hub alimentado.',
        specs: [
            ['Acelerador', 'ASIC Google Edge TPU'],
            ['Rendimiento', '4 TOPS · 2 TOPS por vatio'],
            ['Modelos', 'TensorFlow Lite cuantizado INT8 compilado con edgetpu_compiler'],
            ['Conexión', 'USB 3.1 Gen 1 tipo C (funciona en USB 2.0, más lento)'],
            ['Consumo', '500 mA (frecuencia reducida) · 900 mA (máxima)'],
            ['Software', 'PyCoral · libedgetpu · delegado de TensorFlow Lite'],
            ['Dimensiones', '65 × 30 mm']
        ],
        pines: [pin('USB', 'USB-C 3.0', 26, 6, 'der', 'usb_dev', { i: 900, usb3: true, puerto: 'usbc' })],
        enlaces: [
            doc('Producto y especificaciones', 'https://gweb-coral-full.uc.r.appspot.com/products/accelerator'),
            doc('Primeros pasos', 'https://coral.ai/docs/accelerator/get-started/'),
            hoja('Hoja de datos', 'https://coral.ai/docs/accelerator/datasheet/'),
            doc('Modelos precompilados', 'https://coral.ai/models/'),
            repo('google-coral/pycoral', 'https://github.com/google-coral/pycoral'),
            repo('google-coral/libedgetpu', 'https://github.com/google-coral/libedgetpu')
        ]
    },
    {
        id: 'mercusys-mc210', nombre: 'Cámara IP Mercusys MC210', corto: 'Mercusys MC210', fabricante: 'Mercusys',
        categoria: 'camaras', propio: true, precio: 22.9, ref: 'CAM', w: 14, h: 18, dibujo: 'mc210',
        resumen: 'Cámara Wi-Fi motorizada 360° · flujo RTSP/ONVIF · visión nocturna',
        descripcion: 'Cámara de interior con giro e inclinación. Tras crear la cuenta de cámara en la app entrega vídeo H.264 por RTSP, que el host decodifica con OpenCV o go2rtc para pasarlo al Coral.',
        aviso: 'Activa la cuenta de cámara en la app Mercusys. La URL es rtsp://usuario:clave@IP:554/stream1 (stream2 para baja resolución). Se alimenta con su propio adaptador.',
        specs: [
            ['Vídeo', '2K (2304 × 1296) H.264 · 15 fps de fábrica, hasta 25 fps'],
            ['Movimiento', 'Cobertura de 360° en horizontal y 110° en vertical'],
            ['Red', 'Wi-Fi 2,4 GHz 802.11 b/g/n'],
            ['Protocolos', 'RTSP (puerto 554) · ONVIF (puerto 2020)'],
            ['Noche', 'LED infrarrojos de 850 nm, hasta 12 m'],
            ['Alimentación', 'Adaptador propio de 9 V / 0,6 A']
        ],
        pines: [pin('WIFI', 'Wi-Fi RTSP', 14, 6, 'der', 'red', { puerto: 'wifi', nota: 'Flujo RTSP H.264 por la red local.' })],
        enlaces: [
            doc('Mercusys MC210', 'https://www.mercusys.com/en/product/details/mc210'),
            repo('AlexxIT/go2rtc (RTSP → WebRTC/MJPEG)', 'https://github.com/AlexxIT/go2rtc'),
            repo('blakeblackshear/frigate (NVR con Coral)', 'https://github.com/blakeblackshear/frigate')
        ]
    },
    {
        id: 'webcam-ugreen-1080p', nombre: 'Webcam Ugreen Full HD 1080p', corto: 'Webcam USB 1080p', fabricante: 'Ugreen',
        categoria: 'camaras', propio: true, precio: 21.99, ref: 'CAM', w: 12, h: 10, dibujo: 'webcam',
        resumen: '1920 × 1080 a 30 fps · UVC sin controladores · micrófono doble',
        descripcion: 'Cámara USB compatible con V4L2 y OpenCV. Al no pasar por la red entrega fotogramas sin el retardo de RTSP: es la opción para seguimiento en tiempo real.',
        alimPor: [['USB']],
        specs: [['Vídeo', '1080p a 30 fps · MJPEG / YUY2'], ['Óptica', '85°, foco fijo desde 30 cm'], ['Interfaz', 'USB 2.0 tipo A · UVC'], ['Consumo', '≈ 250 mA']],
        pines: [pin('USB', 'USB-A UVC', 6, 10, 'aba', 'usb_dev', { i: 250, puerto: 'usba' })],
        enlaces: [doc('OpenCV VideoCapture', 'https://docs.opencv.org/4.x/d8/dfe/classcv_1_1VideoCapture.html')]
    },
    {
        id: 'inmp441', nombre: 'Micrófono MEMS I²S INMP441', corto: 'Micrófono INMP441', fabricante: 'TDK InvenSense',
        categoria: 'sensores', propio: true, precio: 3.8, ref: 'MK', w: 6, h: 6, dibujo: 'inmp441',
        resumen: 'Micrófono digital omnidireccional de 24 bit por I²S',
        descripcion: 'Entrega audio PCM directamente al periférico I²S del ESP32-S3, sin pasar por el ADC. Base de los proyectos de palabra de activación y clasificación de sonido con TinyML.',
        aviso: 'Solo 3,3 V. El pin L/R debe ir a GND (canal izquierdo) o a VDD (canal derecho): si queda al aire el micrófono no responde.',
        specs: [['Salida', 'I²S de 24 bit'], ['Relación señal/ruido', '61 dBA'], ['Sensibilidad', '−26 dBFS'], ['Respuesta', '60 Hz – 15 kHz'], ['Alimentación', '1,62 – 3,63 V · 1,4 mA']],
        pines: [
            pin('LR', 'L/R', 1, 2, 'izq', 'ent', { vmax: 3.6, req: true, nota: 'llévalo a GND (canal izquierdo) o a VDD (canal derecho).' }),
            pin('WS', 'WS', 1, 3, 'izq', 'ent', { vmax: 3.6, nota: 'Selección de palabra (LRCLK).' }),
            pin('SCK', 'SCK', 1, 4, 'izq', 'ent', { vmax: 3.6, nota: 'Reloj de bit (BCLK).' }),
            pin('SD', 'SD', 5, 2, 'der', 'sal', { v: 3.3, nota: 'Datos de audio hacia el micro.' }),
            pin('VDD', 'VDD', 5, 3, 'der', 'alim', { vmin: 1.62, vmax: 3.63, i: 2 }),
            gnd('GND', 5, 4, 'der')
        ],
        enlaces: [
            hoja('Hoja de datos INMP441', 'https://invensense.tdk.com/wp-content/uploads/2015/02/INMP441.pdf'),
            repo('atomic14/esp32_audio (I²S con ESP32)', 'https://github.com/atomic14/esp32_audio'),
            repo('pschatzmann/arduino-audio-tools', 'https://github.com/pschatzmann/arduino-audio-tools')
        ]
    },
    {
        id: 'sg90', nombre: 'Microservo SG90', corto: 'Servo SG90', fabricante: 'TowerPro',
        categoria: 'actuadores', propio: true, precio: 3.45, ref: 'M', w: 13, h: 6, dibujo: 'sg90',
        resumen: 'Servo de 9 g · 180° · control por PWM de 50 Hz',
        descripcion: 'Servo de engranajes de nailon. El ángulo se fija con un pulso de 0,5 a 2,4 ms cada 20 ms, que el ESP32-S3 genera por hardware con LEDC.',
        aviso: 'Al arrancar pide picos de hasta 650 mA: con más de un servo usa una fuente de 5 V aparte y une las masas.',
        specs: [['Par', '1,8 kg·cm a 4,8 V'], ['Velocidad', '0,1 s / 60°'], ['Recorrido', '180°'], ['Pulso', '500 – 2400 µs a 50 Hz'], ['Alimentación', '4,8 – 6 V · 250 mA en movimiento']],
        pines: [
            gnd('GND', 12, 2, 'der', 'GND (marrón)'),
            pin('VCC', 'V+ (rojo)', 12, 3, 'der', 'alim', { vmin: 4.8, vmax: 6, i: 250 }),
            pin('PWM', 'PWM (naranja)', 12, 4, 'der', 'ent', { vmax: 6 })
        ],
        enlaces: [
            repo('madhephaestus/ESP32Servo', 'https://github.com/madhephaestus/ESP32Servo')
        ]
    },
    {
        id: 'shelly-1pm-mini-g3', nombre: 'Shelly 1PM Mini Gen3', corto: 'Shelly 1PM Mini', fabricante: 'Shelly',
        categoria: 'potencia', propio: true, precio: 14.9, ref: 'K', w: 14, h: 12, dibujo: 'shelly',
        resumen: 'Relé Wi-Fi de 8 A con medida de potencia · 230 V · API local RPC, MQTT y scripts',
        descripcion: 'Interruptor inteligente de caja de mecanismo. Conmuta una carga de hasta 8 A, mide tensión, corriente y energía, y se controla en local por HTTP RPC, WebSocket o MQTT, lo que permite que el ESP32-S3 o la Raspberry lo accionen sin tocar 230 V.',
        aviso: 'Trabaja con tensión de red: instálalo con el circuito sin tensión y dentro de una caja. No tiene contacto seco: la salida O entrega la fase de L.',
        specs: [
            ['Alimentación', '110 – 240 V CA, 50/60 Hz · consumo propio < 1,2 W'],
            ['Carga máxima', '8 A · 2000 W a 240 V'],
            ['Medida', 'Tensión, corriente, potencia activa y energía'],
            ['Radio', 'Wi-Fi 2,4 GHz 802.11 b/g/n · Bluetooth 4.2'],
            ['Control', 'RPC HTTP/WebSocket · MQTT · scripts mJS · entrada SW'],
            ['Dimensiones', '34 × 29 × 16 mm']
        ],
        pines: [
            pin('SW', 'SW', 3, 1, 'arr', 'ent', { dom: 'ac', vmax: 240, nota: 'Entrada del pulsador o interruptor, conmutada a fase.' }),
            pin('O', 'O', 5, 1, 'arr', 'fuente', { dom: 'ac', v: 230, imax: 8000, nota: 'Salida conmutada hacia la carga.' }),
            pin('L', 'L', 9, 1, 'arr', 'alim', { dom: 'ac', vmin: 110, vmax: 240, i: 5 }),
            pin('N', 'N', 11, 1, 'arr', 'neutro', { dom: 'ac' }),
            pin('WIFI', 'Wi-Fi', 14, 8, 'der', 'red', { puerto: 'wifi', nota: 'Control local por RPC HTTP, WebSocket o MQTT.' })
        ],
        enlaces: [
            doc('Manual y esquemas de conexión', 'https://kb.shelly.cloud/knowledge-base/shelly-1pm-mini-gen3'),
            doc('API Gen2+/Gen3 (RPC)', 'https://shelly-api-docs.shelly.cloud/gen2/'),
            repo('ALLTERCO/shelly-script-examples', 'https://github.com/ALLTERCO/shelly-script-examples')
        ]
    },
    // ------------------------------------------- domótica de caja de mecanismo
    // La ficha ampliada (vista 3/4, partes, primer código y flasheo) de estos
    // cinco está en datos/fichas.js.
    {
        id: 'shelly-1-mini-g3', nombre: 'Shelly 1 Mini Gen3', corto: 'Shelly 1 Mini', fabricante: 'Shelly',
        categoria: 'potencia', propio: true, precio: 12.9, ref: 'K', w: 14, h: 12, dibujo: 'shelly1mini',
        resumen: 'Relé Wi-Fi + Bluetooth de 8 A con contacto seco · ESP32-C3 · scripts mJS, RPC y MQTT en local',
        descripcion: 'El Shelly más pequeño con contacto libre de potencial: sus bornas I y O son un interruptor aislado, así que conmuta 230 V, 24 V o la entrada de mando de un motor de puerta sin mezclar tensiones. Lleva un ESP32-C3 con 8 MB de flash que ejecuta los scripts mJS del firmware original o, si lo flasheas, ESPHome o tu propio programa de Arduino.',
        aviso: 'Trabaja con tensión de red: instálalo con el circuito sin tensión y dentro de una caja. Para flashearlo, aliméntalo solo desde el adaptador USB-serie a 3,3 V, nunca conectado a la red.',
        specs: [
            ['Modelo', 'S3SW-001X8EU'],
            ['Alimentación', '110 – 240 V CA, 50/60 Hz · consumo propio < 1,2 W'],
            ['Relé', 'Contacto seco NO, 1 polo: 8 A a 240 V CA (2000 W) · 5 A a 30 V CC (150 W)'],
            ['Procesador', 'ESP-Shelly-C38F (ESP32-C3, RISC-V a 160 MHz) · 8 MB de flash'],
            ['Radio', 'Wi-Fi 802.11 b/g/n · Bluetooth 4.2 (pasarela BLE para Shelly BLU)'],
            ['Control', 'RPC HTTP/WebSocket · MQTT · webhooks · scripts mJS · 20 programaciones'],
            ['Sensores', 'Temperatura interna (NTC) con protección por sobrecalentamiento'],
            ['Dimensiones', '34 × 29 × 16 mm · 19 g · cable de 0,5 a 4 mm²']
        ],
        pines: [
            pin('O', 'O', 2, 1, 'arr', 'pas', { nota: 'Salida del contacto seco (NO) hacia la carga. Máx. 8 A a 240 V CA o 5 A a 30 V CC.' }),
            pin('I', 'I', 4, 1, 'arr', 'pas', { nota: 'Entrada del contacto seco: lleva aquí lo que quieres conmutar (fase, 24 V o el común de un mando).' }),
            pin('SW', 'SW', 7, 1, 'arr', 'ent', { dom: 'ac', vmax: 240, nota: 'Entrada del pulsador o interruptor, conmutada a fase.' }),
            pin('L', 'L', 10, 1, 'arr', 'alim', { dom: 'ac', vmin: 110, vmax: 240, i: 5 }),
            pin('N', 'N', 12, 1, 'arr', 'neutro', { dom: 'ac' }),
            pin('WIFI', 'Wi-Fi', 14, 8, 'der', 'red', { puerto: 'wifi', nota: 'Control local por RPC HTTP, WebSocket o MQTT.' })
        ],
        enlaces: [
            doc('Manual y esquemas de conexión', 'https://kb.shelly.cloud/knowledge-base/shelly-1-mini-gen3'),
            doc('API Gen2+/Gen3 (RPC y scripts)', 'https://shelly-api-docs.shelly.cloud/gen2/'),
            doc('ESPHome: pines y configuración', 'https://devices.esphome.io/devices/shelly-1-mini-gen3/'),
            repo('ALLTERCO/shelly-script-examples', 'https://github.com/ALLTERCO/shelly-script-examples')
        ]
    },
    {
        id: 'sonoff-zbminir2', nombre: 'Sonoff ZBMINIR2 · interruptor Zigbee 3.0', corto: 'Sonoff ZBMINIR2', fabricante: 'Sonoff (ITEAD)',
        categoria: 'potencia', propio: true, unidades: 2, precio: 9.9, ref: 'K', w: 16, h: 13, dibujo: 'zbminir2',
        resumen: 'Relé Zigbee 3.0 de 10 A con neutro · EFR32MG21 · repetidor de la malla Zigbee',
        descripcion: 'Módulo de caja de mecanismo que convierte un interruptor normal en uno inteligente. Habla Zigbee 3.0 con un coordinador (Zigbee2MQTT, ZHA o la app eWeLink con su pasarela) y, al ir siempre alimentado, hace de repetidor para el resto de la red Zigbee. Conmuta la fase hacia la carga: no es un contacto seco.',
        aviso: 'Necesita neutro y trabaja con tensión de red. S1 y S2 son para un interruptor sin tensión y no están aislados de la red: no les lleves fase ni los unas a la electrónica. Para usarlo hace falta un coordinador Zigbee (un adaptador USB como el Sonoff Dongle).',
        specs: [
            ['Alimentación', '100 – 240 V CA, 50/60 Hz'],
            ['Carga máxima', '10 A resistivos · 2400 W a 240 V'],
            ['Procesador', 'Silicon Labs EFR32MG21 (Cortex-M33)'],
            ['Radio', 'Zigbee 3.0 · router (repetidor) de la malla'],
            ['Interruptor externo', 'S1 – S2: pulsador o interruptor sin tensión; tipo elegible con tres pulsaciones del botón'],
            ['Funciones', 'Estado al encender, modo pulso (inching), retardo, modo desacoplado del relé'],
            ['Dimensiones', '39,5 × 33 × 16,8 mm · 26,7 g'],
            ['En casa', '2 unidades']
        ],
        pines: [
            pin('N1', 'N', 2, 13, 'aba', 'neutro', { dom: 'ac' }),
            pin('N2', 'N', 4, 13, 'aba', 'neutro', { dom: 'ac', nota: 'Segundo neutro, puenteado con el primero: va hacia la carga.' }),
            pin('L_OUT', 'L out', 6, 13, 'aba', 'fuente', { dom: 'ac', v: 230, imax: 10000, nota: 'Fase conmutada hacia la carga.' }),
            pin('L_IN', 'L in', 8, 13, 'aba', 'alim', { dom: 'ac', vmin: 100, vmax: 240, i: 5 }),
            pin('S1', 'S1', 11, 13, 'aba', 'ent', { dom: 'ac', vmax: 3.3, nota: 'Interruptor externo sin tensión entre S1 y S2. Es una señal interna no aislada de la red: ni fase ni electrónica.' }),
            pin('S2', 'S2', 13, 13, 'aba', 'ent', { dom: 'ac', vmax: 3.3, nota: 'Interruptor externo sin tensión entre S1 y S2. Es una señal interna no aislada de la red: ni fase ni electrónica.' }),
            pin('ZB', 'Zigbee', 16, 5, 'der', 'red', { puerto: 'zigbee', nota: 'Enlace Zigbee 3.0 con el coordinador (Zigbee2MQTT, ZHA o eWeLink).' })
        ],
        enlaces: [
            doc('Manual de usuario', 'https://support.sonoff.tech/zbminir2-usermanual/'),
            doc('Zigbee2MQTT: ZBMINIR2', 'https://www.zigbee2mqtt.io/devices/ZBMINIR2.html'),
            repo('Koenkk/zigbee2mqtt', 'https://github.com/Koenkk/zigbee2mqtt')
        ]
    },
    {
        id: 'sonoff-mini-d', nombre: 'Sonoff MINI-D · relé Wi-Fi de contacto seco', corto: 'Sonoff MINI-D', fabricante: 'Sonoff (ITEAD)',
        categoria: 'potencia', propio: true, precio: 11.9, ref: 'K', w: 17, h: 16, dibujo: 'minid',
        resumen: 'Contacto seco NO/NC con Wi-Fi y Matter · se alimenta a 230 V CA o a 12 – 48 V CC · ESP32',
        descripcion: 'Relé inteligente de contacto libre de potencial con salida conmutada (NO, COM y NC). Pensado para dar órdenes a otros equipos: la entrada de una caldera, un motor de puerta o una válvula de 12/24 V. Se alimenta por red o por continua y se controla con eWeLink o, en local, por Matter desde Home Assistant. Dentro lleva un ESP32-D0WDR2-V3, pero Sonoff no permite grabarle firmware propio.',
        aviso: 'El contacto aguanta poco: 24 V ⎓ 2 A resistivos (motores de 12/24 V de hasta 8 W). No conmutes 230 V con él. S1 y S2 son para un interruptor sin tensión: con alimentación de red pueden estar a su potencial, así que no los unas a la electrónica.',
        alimPor: [['L'], ['DCP']],
        alimNota: 'aliméntalo con fase y neutro (100 – 240 V CA) o con 12 – 48 V CC en DC+ y DC−.',
        specs: [
            ['Alimentación', '100 – 240 V CA, 50/60 Hz (0,1 A) o 12 – 48 V CC (1 A)'],
            ['Contacto', 'Seco, conmutado NO/NC · 24 V ⎓ 2 A resistivos o 12/24 V ⎓ 8 W'],
            ['Relé', 'FANHAR W11-1C2STL (5 A 250 V CA / 30 V CC de catálogo)'],
            ['Procesador', 'Espressif ESP32-D0WDR2-V3, doble núcleo a 240 MHz'],
            ['Radio', 'Wi-Fi 802.11 b/g/n 2,4 GHz · Matter sobre Wi-Fi'],
            ['Interruptor externo', 'S1 – S2: pulsador o interruptor sin tensión'],
            ['Dimensiones', '43 × 41 × 21,5 mm · 34,5 g']
        ],
        pines: [
            pin('NO', 'NO', 5, 0, 'arr', 'pas', { nota: 'Contacto normalmente abierto: se cierra con COM al activar el relé. Máx. 24 V ⎓ 2 A.' }),
            pin('COM', 'COM', 8, 0, 'arr', 'pas', { nota: 'Común del contacto seco.' }),
            pin('NC', 'NC', 11, 0, 'arr', 'pas', { nota: 'Contacto normalmente cerrado: se abre al activar el relé.' }),
            pin('N', 'N', 3, 16, 'aba', 'neutro', { dom: 'ac' }),
            pin('L', 'L', 5, 16, 'aba', 'alim', { dom: 'ac', vmin: 100, vmax: 240, i: 5 }),
            pin('S1', 'S1', 7, 16, 'aba', 'ent', { dom: 'ac', vmax: 3.3, nota: 'Interruptor externo sin tensión entre S1 y S2. Con alimentación de red puede estar a su potencial: ni fase ni electrónica.' }),
            pin('S2', 'S2', 9, 16, 'aba', 'ent', { dom: 'ac', vmax: 3.3, nota: 'Interruptor externo sin tensión entre S1 y S2. Con alimentación de red puede estar a su potencial: ni fase ni electrónica.' }),
            pin('DCP', 'DC+', 11, 16, 'aba', 'alim', { vmin: 12, vmax: 48, i: 60, nota: 'Alimentación en continua (12 – 48 V). Usa esta o la de red, no las dos.' }),
            pin('DCN', 'DC−', 13, 16, 'aba', 'gnd'),
            pin('WIFI', 'Wi-Fi', 17, 7, 'der', 'red', { puerto: 'wifi', nota: 'eWeLink o Matter sobre Wi-Fi (en local con Home Assistant). No admite firmware propio.' })
        ],
        enlaces: [
            doc('Manual de usuario', 'https://support.sonoff.tech/mini-d-usermanual/'),
            doc('Análisis y despiece (SmartHomeScene)', 'https://smarthomescene.com/reviews/sonoff-matter-dry-contact-switch-mini-d-review/'),
            doc('Análisis con Home Assistant y Matter (CNX Software)', 'https://www.cnx-software.com/2025/01/15/sonoff-mini-d-review-matter-enabled-dry-contact-wifi-switch-ewelink-home-assistant-apple-home/')
        ]
    },
    {
        id: 'ettroit-ln1800', nombre: 'Ettroit LN1800 · detector de movimiento de 1 módulo', corto: 'Detector Ettroit LN1800', fabricante: 'Ettroit (serie Space)',
        categoria: 'potencia', propio: true, precio: 15, ref: 'B', w: 9, h: 18, dibujo: 'ln1800',
        resumen: 'Detector PIR empotrable con ajuste de tiempo (10 s – 3 min) y de luz · 230 V · 4 A',
        descripcion: 'Mecanismo de un módulo para caja de empotrar que enciende la luz al detectar movimiento y la apaga pasado el tiempo elegido. Mide la luz ambiente para no encender de día. Va en la serie Space de Ettroit, compatible con los soportes y placas BTicino Living Light / International. No se programa: se ajusta con sus dos ruedas.',
        aviso: 'Trabaja con tensión de red. 4 A con cos φ = 1 es para cargas resistivas: con LED o fluorescentes deja margen. Si quieres que el movimiento llegue a la domótica, lleva su salida a la entrada SW de un Shelly en lugar de unirla a la electrónica.',
        specs: [
            ['Alimentación', '230 V CA, 50 Hz'],
            ['Carga', '4 A con cos φ = 1 (resistiva)'],
            ['Temporizador', '10 s – 3 min, rueda frontal'],
            ['Umbral de luz', 'Regulable con la rueda frontal (lux)'],
            ['Detector', 'Infrarrojo pasivo (PIR) con lente de Fresnel'],
            ['Protección', 'IP20, para interior'],
            ['Montaje', '1 módulo · soportes BTicino Living Light / International']
        ],
        pines: [
            pin('L', 'L', 2, 18, 'aba', 'alim', { dom: 'ac', vmin: 207, vmax: 253, i: 5 }),
            pin('N', 'N', 4, 18, 'aba', 'neutro', { dom: 'ac' }),
            pin('OUT', 'Carga', 7, 18, 'aba', 'fuente', { dom: 'ac', v: 230, imax: 4000, nota: 'Fase conmutada hacia la lámpara cuando detecta movimiento.' })
        ],
        enlaces: [
            doc('Ficha del fabricante', 'https://ettroit.com/prodotto/sensore-movimento-1p-con-set-tempo-lux-ln1800')
        ]
    },
    {
        id: 'came-ttsd4rks', nombre: 'Mando CAME TTS TTSD4RKS (806TS-0230)', corto: 'Mando CAME TTS', fabricante: 'CAME',
        categoria: 'red', propio: true, precio: 24, ref: 'TX', w: 29, h: 15, dibujo: 'cametts',
        resumen: 'Emisor de 4 canales con código evolutivo (rolling code) · doble frecuencia 433,92 / 868,35 MHz',
        descripcion: 'Mando de llavero para automatismos CAME: puertas de garaje, cancelas y barreras. Cada botón es un canal que se memoriza en el receptor del cuadro. Emite en 433,92 y 868,35 MHz a la vez y cambia el código en cada pulsación, así que no se puede copiar ni reproducir con un receptor de radio.',
        aviso: 'No se programa ni se clona: es de código evolutivo. Para abrir la puerta desde la domótica, conecta el contacto seco de un Shelly 1 Mini Gen3 a la entrada de mando del cuadro, en paralelo con su pulsador.',
        specs: [
            ['Canales', '4 botones'],
            ['Frecuencia', '433,92 MHz y 868,35 MHz (doble frecuencia)'],
            ['Codificación', 'Código evolutivo · más de 4000 millones de combinaciones'],
            ['Alcance', '50 – 150 m en campo abierto'],
            ['Pila', '1 × CR2032 de litio'],
            ['Temperatura', '−20 – +55 °C'],
            ['Materiales y medidas', 'Policarbonato y zamak · 73 × 38 × 11 mm']
        ],
        pines: [
            pin('RF', 'Radio', 29, 7, 'der', 'red', { puerto: 'rf', nota: 'Enlace de radio con el receptor del automatismo (433,92 / 868,35 MHz).' })
        ],
        enlaces: [
            doc('CAME: TTSD4RKS', 'https://www.came.com/global/en/products/transmitters-tts-806ts-0230/'),
            doc('Guía rápida (ManualsLib)', 'https://www.manualslib.com/manual/2511100/Came-Ttsd4rks.html')
        ]
    },
    {
        id: 'hc-sr04', nombre: 'Sensor ultrasónico HC-SR04', corto: 'HC-SR04', fabricante: 'Genérico',
        categoria: 'sensores', precio: 1.75, ref: 'S', w: 18, h: 8, dibujo: 'hcsr04',
        resumen: 'Distancia de 2 a 400 cm por tiempo de vuelo de ultrasonidos',
        descripcion: 'Un pulso de 10 µs en TRIG lanza la medida; ECHO se mantiene alto el tiempo que tarda el eco. Distancia en cm ≈ microsegundos / 58.',
        aviso: 'ECHO sale a 5 V: hacia un ESP32-S3 o una Raspberry Pi hay que bajarlo con un divisor (1 kΩ / 2 kΩ) o un convertidor de nivel.',
        specs: [['Alcance', '2 – 400 cm · ±3 mm'], ['Ángulo', '15°'], ['Alimentación', '5 V · 15 mA'], ['Señales', 'TRIG entrada · ECHO salida a 5 V']],
        pines: fila([
            ['VCC', 'VCC', 'alim', { vmin: 4.5, vmax: 5.5, i: 15 }],
            ['TRIG', 'TRIG', 'ent', { vmax: 5.5 }],
            ['ECHO', 'ECHO', 'sal', { v: 5 }],
            ['GND', 'GND', 'gnd']
        ], 8, 7),
        enlaces: [hoja('Hoja de datos HC-SR04', 'https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf')]
    },
    {
        id: 'bme280', nombre: 'Sensor ambiental BME280', corto: 'BME280', fabricante: 'Bosch Sensortec',
        categoria: 'sensores', precio: 10.95, ref: 'S', w: 6, h: 5, dibujo: 'modulo', arte: { pcb: '#6b2fa3', chip: 'BME', etiqueta: 'BME280' },
        resumen: 'Temperatura, humedad y presión por I²C',
        descripcion: 'Sensor combinado de precisión. Dirección I²C 0x76 o 0x77.',
        specs: [['Rangos', '−40 a 85 °C · 0 – 100 % HR · 300 – 1100 hPa'], ['Interfaz', 'I²C (0x76/0x77) o SPI'], ['Alimentación', '1,71 – 3,6 V · < 1 mA']],
        pines: fila([['VIN', 'VIN', 'alim', { vmin: 1.71, vmax: 3.6, i: 1 }], ['GND', 'GND', 'gnd'], ['SCL', 'SCL', 'es', { vmax: 3.6 }], ['SDA', 'SDA', 'es', { vmax: 3.6 }]], 5),
        enlaces: [doc('Bosch BME280', 'https://www.bosch-sensortec.com/products/environmental-sensors/humidity-sensors-bme280/'), repo('adafruit/Adafruit_BME280_Library', 'https://github.com/adafruit/Adafruit_BME280_Library')]
    },
    {
        id: 'vl53l1x', nombre: 'Sensor láser ToF VL53L1X', corto: 'VL53L1X', fabricante: 'STMicroelectronics',
        categoria: 'sensores', precio: 4, ref: 'S', w: 7, h: 5, dibujo: 'modulo', arte: { pcb: '#1f4f8f', chip: 'ToF', etiqueta: 'VL53L1X' },
        resumen: 'Distancia por tiempo de vuelo láser hasta 4 m, por I²C',
        descripcion: 'Mide distancia absoluta con independencia del color del objeto. Dirección I²C 0x29.',
        specs: [['Alcance', '4 – 400 cm · 30 Hz (50 Hz en modo corto, hasta 130 cm)'], ['Interfaz', 'I²C (0x29)'], ['Alimentación', '2,6 – 5,5 V (módulo con regulador) · 20 mA, picos de 40 mA']],
        pines: fila([['VIN', 'VIN', 'alim', { vmin: 2.6, vmax: 5.5, i: 20 }], ['GND', 'GND', 'gnd'], ['SDA', 'SDA', 'es', I2C], ['SCL', 'SCL', 'es', I2C], ['XSHUT', 'XSHUT', 'ent', { vmax: 3.6, nota: 'Apagado, activo a nivel bajo. Trabaja a 2,8 V y no tolera 5 V.' }]], 5),
        enlaces: [doc('ST VL53L1X', 'https://www.st.com/en/imaging-and-photonics-solutions/vl53l1x.html'), repo('pololu/vl53l1x-arduino', 'https://github.com/pololu/vl53l1x-arduino')]
    },
    {
        id: 'pir-hcsr501', nombre: 'Detector de movimiento PIR HC-SR501', corto: 'PIR HC-SR501', fabricante: 'Genérico',
        categoria: 'sensores', precio: 1.99, ref: 'S', w: 13, h: 10, dibujo: 'pir',
        resumen: 'Detección de presencia por infrarrojo pasivo, salida digital de 3,3 V',
        descripcion: 'Despierta al micro solo cuando hay movimiento, para no tener la cámara y la inferencia activas todo el tiempo.',
        specs: [['Alcance', '3 – 7 m · 110°'], ['Salida', 'Digital 3,3 V'], ['Alimentación', '4,5 – 20 V · 65 µA']],
        pines: fila([['VCC', 'VCC', 'alim', { vmin: 4.5, vmax: 20, i: 1 }], ['OUT', 'OUT', 'sal', { v: 3.3 }], ['GND', 'GND', 'gnd']], 10, 5),
        enlaces: [doc('Guía PIR (Adafruit)', 'https://learn.adafruit.com/pir-passive-infrared-proximity-motion-sensor')]
    },
    {
        id: 'ds18b20', nombre: 'Sonda de temperatura DS18B20', corto: 'DS18B20', fabricante: 'Analog Devices',
        categoria: 'sensores', precio: 3.15, ref: 'S', w: 5, h: 6, dibujo: 'modulo', arte: { pcb: '#20232a', chip: '1W', etiqueta: 'DS18B20' },
        resumen: 'Termómetro digital 1-Wire, versión sumergible',
        descripcion: 'Un solo hilo de datos para varias sondas. Necesita una resistencia de 4,7 kΩ entre DQ y VDD.',
        specs: [['Rango', '−55 a 125 °C · ±0,5 °C'], ['Interfaz', '1-Wire'], ['Alimentación', '3,0 – 5,5 V · 1,5 mA']],
        pines: fila([['GND', 'GND', 'gnd'], ['DQ', 'DQ', 'es', { vmax: 5.5, nota: 'Datos 1-Wire: requiere 4,7 kΩ a VDD.' }], ['VDD', 'VDD', 'alim', { vmin: 3, vmax: 5.5, i: 2 }]], 6),
        enlaces: [hoja('Hoja de datos DS18B20', 'https://www.analog.com/media/en/technical-documentation/data-sheets/DS18B20.pdf'), repo('milesburton/Arduino-Temperature-Control-Library', 'https://github.com/milesburton/Arduino-Temperature-Control-Library')]
    },
    {
        id: 'rele-2ch', nombre: 'Módulo de 2 relés de 5 V', corto: 'Relé 2 canales', fabricante: 'Genérico (Songle)',
        categoria: 'actuadores', precio: 2.25, ref: 'K', w: 20, h: 15, dibujo: 'rele2',
        resumen: 'Dos relés optoacoplados · contactos de 10 A a 250 V CA',
        descripcion: 'Permite que un GPIO conmute cargas de red o de continua con aislamiento. Las entradas son activas a nivel bajo.',
        aviso: 'Las entradas se activan a nivel bajo. Los contactos pueden llevar 230 V: mantén separado ese lado del resto del montaje.',
        specs: [['Bobinas', '5 V · 71 mA por relé (70 Ω, 0,36 W)'], ['Contactos', '10 A a 250 V CA · 10 A a 28 V CC'], ['Entradas', 'Optoacopladas, activas a nivel bajo']],
        pines: [
            gnd('GND', 1, 5, 'izq'),
            pin('IN1', 'IN1', 1, 6, 'izq', 'ent', { vmax: 5.5 }),
            pin('IN2', 'IN2', 1, 7, 'izq', 'ent', { vmax: 5.5 }),
            pin('VCC', 'VCC', 1, 8, 'izq', 'alim', { vmin: 4.5, vmax: 5.5, i: 150 }),
            pin('NO1', 'NO1', 19, 2, 'der', 'pas'), pin('COM1', 'COM1', 19, 4, 'der', 'pas'), pin('NC1', 'NC1', 19, 6, 'der', 'pas'),
            pin('NO2', 'NO2', 19, 9, 'der', 'pas'), pin('COM2', 'COM2', 19, 11, 'der', 'pas'), pin('NC2', 'NC2', 19, 13, 'der', 'pas')
        ],
        enlaces: [hoja('Relé Songle SRD-05VDC', 'https://www.circuitbasics.com/wp-content/uploads/2015/11/SRD-05VDC-SL-C-Datasheet.pdf')]
    },
    {
        id: 'zumbador', nombre: 'Zumbador activo (módulo)', corto: 'Zumbador', fabricante: 'Genérico',
        categoria: 'actuadores', precio: 1.9, ref: 'BZ', w: 5, h: 7, dibujo: 'zumbador',
        resumen: 'Aviso acústico de 85 dB con oscilador interno',
        descripcion: 'Suena al activar su entrada: no necesita generar tono por PWM.',
        specs: [['Alimentación', '3,3 – 5 V · 30 mA'], ['Sonido', '≈ 85 dB a 2,3 kHz']],
        pines: fila([['VCC', 'VCC', 'alim', { vmin: 3, vmax: 5.5, i: 30 }], ['IO', 'I/O', 'ent', { vmax: 5.5 }], ['GND', 'GND', 'gnd']], 7),
        enlaces: []
    },
    {
        id: 'oled-ssd1306', nombre: 'Pantalla OLED 0,96" I²C SSD1306', corto: 'OLED 0,96"', fabricante: 'Solomon Systech',
        categoria: 'salidas', precio: 6.15, ref: 'DS', w: 11, h: 11, dibujo: 'oled',
        resumen: '128 × 64 píxeles monocromo por I²C, dirección 0x3C',
        descripcion: 'Pantalla de alto contraste con solo dos hilos de datos. En el ESP32-S3 el I²C por defecto es SDA = GPIO8 y SCL = GPIO9.',
        specs: [['Resolución', '128 × 64'], ['Interfaz', 'I²C (0x3C)'], ['Alimentación', '3,3 – 5 V · 20 mA']],
        pines: [
            gnd('GND', 4, 1, 'arr'),
            pin('VCC', 'VCC', 5, 1, 'arr', 'alim', { vmin: 3, vmax: 5.5, i: 20 }),
            pin('SCL', 'SCL', 6, 1, 'arr', 'es', I2C),
            pin('SDA', 'SDA', 7, 1, 'arr', 'es', I2C)
        ],
        enlaces: [hoja('Hoja de datos SSD1306', 'https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf'), repo('adafruit/Adafruit_SSD1306', 'https://github.com/adafruit/Adafruit_SSD1306'), repo('olikraus/u8g2', 'https://github.com/olikraus/u8g2')]
    },
    {
        id: 'ws2812b', nombre: 'Tira LED direccionable WS2812B (30 LED)', corto: 'Tira WS2812B', fabricante: 'Worldsemi',
        categoria: 'salidas', precio: 4, ref: 'LD', w: 22, h: 4, dibujo: 'tira',
        resumen: 'LED RGB direccionables de un solo hilo de datos',
        descripcion: 'Cada LED lleva su controlador. Un GPIO maneja toda la tira con el periférico RMT.',
        aviso: 'A brillo máximo cada LED pide 60 mA: 30 LED son 1,8 A, mucho más de lo que da el pin 5V de una placa. Usa una fuente de 5 V dedicada. A 5 V el nivel alto de datos (3,5 V) queda por encima de los 3,3 V del ESP32-S3.',
        specs: [['Alimentación', '5 V · hasta 60 mA por LED'], ['Datos', '800 kHz, un hilo'], ['Nivel alto', '≥ 0,7 × VDD']],
        pines: [
            pin('5V', '5V', 1, 1, 'izq', 'alim', { vmin: 4.5, vmax: 5.3, i: 1800 }),
            pin('DIN', 'DIN', 1, 2, 'izq', 'ent', { vmax: 5.5, vih: 3.5 }),
            gnd('GND', 1, 3, 'izq')
        ],
        enlaces: [hoja('Hoja de datos WS2812B', 'https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf'), repo('FastLED/FastLED', 'https://github.com/FastLED/FastLED'), repo('adafruit/Adafruit_NeoPixel', 'https://github.com/adafruit/Adafruit_NeoPixel')]
    },
    {
        id: 'max98357a', nombre: 'Amplificador I²S MAX98357A', corto: 'Ampli I²S 3 W', fabricante: 'Analog Devices',
        categoria: 'salidas', precio: 4.5, ref: 'AMP', w: 7, h: 7, dibujo: 'modulo', arte: { pcb: '#1b5fa8', chip: 'MAX', etiqueta: 'MAX98357A' },
        resumen: 'DAC y amplificador clase D mono de 3 W por I²S',
        descripcion: 'Reproduce audio digital directamente en un altavoz de 4 – 8 Ω: voz sintetizada, avisos o efectos.',
        specs: [['Potencia', '3,2 W en 4 Ω a 5 V'], ['Interfaz', 'I²S'], ['Alimentación', '2,5 – 5,5 V']],
        pines: fila([['LRC', 'LRC', 'ent', { vmax: 5.5 }], ['BCLK', 'BCLK', 'ent', { vmax: 5.5 }], ['DIN', 'DIN', 'ent', { vmax: 5.5 }], ['GND', 'GND', 'gnd'], ['VIN', 'VIN', 'alim', { vmin: 2.5, vmax: 5.5, i: 300 }]], 7),
        enlaces: [doc('Guía MAX98357 (Adafruit)', 'https://learn.adafruit.com/adafruit-max98357-i2s-class-d-mono-amp'), repo('earlephilhower/ESP8266Audio', 'https://github.com/earlephilhower/ESP8266Audio')]
    },
    {
        id: 'led', nombre: 'LED de 5 mm', corto: 'LED', fabricante: 'Genérico', categoria: 'salidas', precio: 0.1, ref: 'D', w: 2, h: 5, dibujo: 'led',
        resumen: 'Indicador luminoso, con resistencia limitadora en serie',
        descripcion: 'Siempre con una resistencia en serie: 220 – 330 Ω para un LED rojo desde 3,3 V.',
        specs: [['Caída directa', '1,8 – 3,3 V según color'], ['Corriente', '5 – 20 mA']],
        pines: [pin('A', 'Ánodo (+)', 0, 5, 'aba', 'pas'), pin('K', 'Cátodo (−)', 2, 5, 'aba', 'pas')],
        enlaces: []
    },
    {
        id: 'hub-usb3', nombre: 'Hub USB 3.0 alimentado', corto: 'Hub USB 3.0', fabricante: 'Genérico',
        categoria: 'alimentacion', precio: 16.9, ref: 'HUB', w: 20, h: 8, dibujo: 'hub',
        resumen: 'Cuatro puertos con fuente propia de 5 V / 3 A',
        descripcion: 'Evita las caídas de tensión cuando el Coral trabaja a máxima frecuencia junto a una webcam en un portátil o una Raspberry Pi.',
        specs: [['Puertos', '4 × USB 3.0 · 900 mA cada uno'], ['Fuente', '5 V / 3 A externa']],
        pines: [
            pin('IN', 'Al host', 0, 4, 'izq', 'usb_dev', { i: 0, usb3: true, puerto: 'usb3' }),
            ...[1, 2, 3, 4].map(n => pin('OUT' + n, 'Puerto ' + n, 4 * n, 8, 'aba', 'usb_host', { imax: 900, usb: 3, puerto: 'usb3' }))
        ],
        enlaces: []
    },
    {
        id: 'fuente-5v', nombre: 'Fuente de 5 V / 3 A', corto: 'Fuente 5 V 3 A', fabricante: 'Genérico',
        categoria: 'alimentacion', precio: 8.5, ref: 'PS', w: 9, h: 8, dibujo: 'fuente',
        resumen: 'Alimentación dedicada para servos, tiras LED y la Raspberry Pi',
        descripcion: 'Fuente conmutada de 15 W. Recuerda unir su GND con el de la placa que da las señales.',
        specs: [['Salida', '5 V · 3 A'], ['Entrada', '100 – 240 V CA']],
        pines: [pin('V', '+5V', 8, 3, 'der', 'fuente', { v: 5, imax: 3000 }), gnd('GND', 8, 5, 'der')],
        enlaces: []
    },
    {
        id: 'fuente-usbc', nombre: 'Fuente USB-C de 5,1 V / 3 A', corto: 'Fuente USB-C', fabricante: 'Raspberry Pi Ltd',
        categoria: 'alimentacion', precio: 9.9, ref: 'PS', w: 8, h: 7, dibujo: 'fuenteusb',
        resumen: 'Alimentador oficial de la Raspberry Pi 4',
        descripcion: 'Con menos de 3 A la Raspberry Pi 4 muestra el aviso de baja tensión en cuanto se le conecta el Coral.',
        specs: [['Salida', '5,1 V · 3 A por USB-C']],
        pines: [pin('OUT', 'USB-C 5,1 V', 8, 3, 'der', 'fuente', { v: 5.1, imax: 3000, puerto: 'usbc' })],
        enlaces: [doc('Fuente oficial USB-C', 'https://www.raspberrypi.com/products/type-c-power-supply/')]
    },
    {
        id: 'resistencia', nombre: 'Resistencia', corto: 'Resistencia', fabricante: 'Genérico', categoria: 'pasivos', precio: 0.05, ref: 'R', w: 6, h: 2, dibujo: 'resistencia', valor: '220 Ω',
        resumen: 'Resistencia de película de 1/4 W',
        descripcion: 'Limita corriente, hace de pull-up o forma divisores. El valor se edita en el panel de propiedades.',
        specs: [['Potencia', '0,25 W'], ['Tolerancia', '5 % (serie E24)']],
        pines: [pin('1', '1', 0, 1, 'izq', 'pas'), pin('2', '2', 6, 1, 'der', 'pas')],
        enlaces: []
    },
    {
        id: 'pulsador', nombre: 'Pulsador táctil de 6 mm', corto: 'Pulsador', fabricante: 'Genérico', categoria: 'pasivos', precio: 0.25, ref: 'SW', w: 4, h: 4, dibujo: 'pulsador',
        resumen: 'Pulsador normalmente abierto',
        descripcion: 'Entre un GPIO con pull-up interno y GND: se lee un 0 al pulsar.',
        specs: [['Contacto', 'NA · 50 mA a 12 V']],
        pines: [pin('1', '1', 0, 2, 'izq', 'pas'), pin('2', '2', 4, 2, 'der', 'pas')],
        enlaces: []
    },
    {
        id: 'divisor-5v-3v3', nombre: 'Divisor de tensión 1 kΩ / 2 kΩ', corto: 'Divisor 5→3,3 V', fabricante: 'Genérico', categoria: 'pasivos', precio: 0.1, ref: 'RN', w: 5, h: 5, dibujo: 'modulo', arte: { pcb: '#3a3d44', chip: '÷', etiqueta: '1k/2k' },
        resumen: 'Baja una señal de 5 V a 3,3 V (una sola dirección)',
        descripcion: 'Dos resistencias en serie: de 5 V salen 3,33 V. Suficiente para señales lentas como el ECHO del HC-SR04.',
        specs: [['Relación', '2/3 · 5 V → 3,33 V'], ['Impedancia', '667 Ω']],
        pines: fila([['IN', 'IN 5V', 'ent', { vmax: 5.5 }], ['OUT', 'OUT 3V3', 'sal', { v: 3.3 }], ['GND', 'GND', 'gnd']], 5),
        enlaces: []
    },
    {
        id: 'conversor-nivel', nombre: 'Convertidor de nivel bidireccional (4 canales)', corto: 'Convertidor nivel', fabricante: 'Genérico (BSS138)', categoria: 'pasivos', precio: 2.95, ref: 'LS', w: 7, h: 7, dibujo: 'modulo', arte: { pcb: '#a3232a', chip: 'LS', etiqueta: 'BSS138' },
        resumen: 'Adapta señales entre 3,3 V y 5 V en ambos sentidos',
        descripcion: 'Cuatro canales con MOSFET BSS138. Sirve para I²C y para señales rápidas de un solo sentido.',
        specs: [['Canales', '4 bidireccionales'], ['Lado bajo', '1,8 – 3,6 V'], ['Lado alto', '3,3 – 5,5 V']],
        pines: [
            pin('LV1', 'LV1', 1, 1, 'arr', 'es', { v: 3.3, vmax: 3.6 }), pin('LV2', 'LV2', 2, 1, 'arr', 'es', { v: 3.3, vmax: 3.6 }),
            pin('LV', 'LV', 3, 1, 'arr', 'alim', { vmin: 1.8, vmax: 3.6, i: 1 }), gnd('GND_L', 4, 1, 'arr'),
            pin('LV3', 'LV3', 5, 1, 'arr', 'es', { v: 3.3, vmax: 3.6 }), pin('LV4', 'LV4', 6, 1, 'arr', 'es', { v: 3.3, vmax: 3.6 }),
            pin('HV1', 'HV1', 1, 6, 'aba', 'es', { v: 5, vmax: 5.5 }), pin('HV2', 'HV2', 2, 6, 'aba', 'es', { v: 5, vmax: 5.5 }),
            pin('HV', 'HV', 3, 6, 'aba', 'alim', { vmin: 3.3, vmax: 5.5, i: 1 }), gnd('GND_H', 4, 6, 'aba'),
            pin('HV3', 'HV3', 5, 6, 'aba', 'es', { v: 5, vmax: 5.5 }), pin('HV4', 'HV4', 6, 6, 'aba', 'es', { v: 5, vmax: 5.5 })
        ],
        enlaces: [doc('Guía de conversión de nivel (SparkFun)', 'https://learn.sparkfun.com/tutorials/bi-directional-logic-level-converter-hookup-guide')]
    },
    {
        id: 'router', nombre: 'Router Wi-Fi / red local', corto: 'Router', fabricante: 'Genérico', categoria: 'red', propio: true, precio: 0, ref: 'NET', w: 14, h: 8, dibujo: 'router',
        resumen: 'La LAN que une cámaras, host, Shelly y ESP32-S3',
        descripcion: 'Representa la red local. Cada puerto es un enlace lógico (Wi-Fi o cable) hacia un dispositivo.',
        specs: [['Enlaces', '5 lógicos (Wi-Fi o Ethernet)']],
        pines: [1, 2, 3, 4, 5].map(n => pin('P' + n, 'Enlace ' + n, 2 * n + 1, 8, 'aba', 'red', { puerto: 'wifi' })),
        enlaces: [repo('eclipse-mosquitto/mosquitto (broker MQTT)', 'https://github.com/eclipse-mosquitto/mosquitto')]
    },
    {
        id: 'toma-230', nombre: 'Acometida monofásica 230 V', corto: 'Red 230 V', fabricante: '—', categoria: 'potencia', precio: 0, ref: 'X', w: 8, h: 8, dibujo: 'toma',
        resumen: 'Fase, neutro y tierra de la instalación',
        descripcion: 'Origen de la alimentación de red del montaje. Colores normalizados: fase marrón, neutro azul, tierra verde-amarillo.',
        specs: [['Tensión', '230 V CA · 50 Hz'], ['Protección aguas arriba', '16 A']],
        pines: [
            pin('L', 'L', 2, 8, 'aba', 'fuente', { dom: 'ac', v: 230, imax: 16000 }),
            pin('N', 'N', 4, 8, 'aba', 'neutro', { dom: 'ac' }),
            pin('PE', 'PE', 6, 8, 'aba', 'tierra', { dom: 'ac' })
        ],
        enlaces: [doc('REBT · Guía técnica (Ministerio de Industria)', 'https://industria.gob.es/Calidad-Industrial/seguridadindustrial/instalacionesindustriales/baja-tension/Paginas/guia-tecnica-aplicacion.aspx')]
    },
    {
        id: 'magnetotermico', nombre: 'Interruptor magnetotérmico 1P+N C10', corto: 'Magnetotérmico C10', fabricante: 'Genérico', categoria: 'potencia', precio: 11.14, ref: 'Q', w: 4, h: 14, dibujo: 'magneto',
        resumen: 'Protección de línea de 10 A, curva C, carril DIN',
        descripcion: 'Protege el circuito contra sobrecargas y cortocircuitos. 10 A es el calibre habitual de un circuito de alumbrado con cable de 1,5 mm².',
        specs: [['Calibre', '10 A, curva C'], ['Poder de corte', '6 kA'], ['Anchura', '1 o 2 módulos DIN (18 o 36 mm) según el modelo']],
        pines: [
            pin('L_IN', 'L entrada', 1, 0, 'arr', 'alim', { dom: 'ac', vmin: 110, vmax: 440, i: 0 }),
            pin('N_IN', 'N entrada', 3, 0, 'arr', 'neutro', { dom: 'ac' }),
            pin('L_OUT', 'L salida', 1, 14, 'aba', 'fuente', { dom: 'ac', v: 230, imax: 10000 }),
            pin('N_OUT', 'N salida', 3, 14, 'aba', 'neutro', { dom: 'ac' })
        ],
        enlaces: []
    },
    {
        id: 'lampara', nombre: 'Lámpara LED de 230 V', corto: 'Lámpara 230 V', fabricante: 'Genérico', categoria: 'potencia', precio: 4.9, ref: 'E', w: 6, h: 9, dibujo: 'lampara',
        resumen: 'Carga de alumbrado de 9 W',
        descripcion: 'Carga de ejemplo para el circuito de potencia.',
        specs: [['Potencia', '9 W · 70 – 100 mA a 230 V (factor de potencia 0,5 – 0,7)']],
        pines: [pin('L', 'L', 2, 9, 'aba', 'alim', { dom: 'ac', vmin: 110, vmax: 240, i: 80 }), pin('N', 'N', 4, 9, 'aba', 'neutro', { dom: 'ac' })],
        enlaces: []
    },
    {
        id: 'interruptor-pared', nombre: 'Interruptor de pared', corto: 'Interruptor', fabricante: 'Genérico', categoria: 'potencia', precio: 4, ref: 'S', w: 7, h: 8, dibujo: 'interruptor',
        resumen: 'Mecanismo unipolar de 10 A',
        descripcion: 'Entre la fase y la entrada SW de un Shelly, o directamente en serie con la carga.',
        specs: [['Contacto', '10 AX · 250 V CA']],
        pines: [pin('1', '1', 2, 8, 'aba', 'pas'), pin('2', '2', 5, 8, 'aba', 'pas')],
        enlaces: []
    },
    {
        id: 'pca9685', nombre: 'Controlador de 16 servos PCA9685', corto: 'PCA9685 16 servos', fabricante: 'NXP (módulo genérico)',
        categoria: 'actuadores', precio: 8.95, ref: 'U', w: 12, h: 8, dibujo: 'pca9685',
        resumen: '16 salidas PWM de 12 bit por I²C: mueve 16 servos con dos pines',
        descripcion: 'Genera las 16 señales de servo por hardware y libera al microcontrolador. Varias placas se encadenan en el mismo bus cambiando la dirección (0x40 a 0x7F). Aquí se representan las cuatro primeras salidas.',
        aviso: 'La lógica (VCC) y la potencia de los servos (V+) van por separado: alimenta V+ con una fuente de 5 – 6 V dedicada, nunca desde el pin de 3,3 V o 5 V de la placa.',
        specs: [['Salidas', '16 PWM de 12 bit · 24 – 1526 Hz · 25 mA por salida'], ['Interfaz', 'I²C (0x40 por defecto, hasta 62 placas en el bus)'], ['Lógica', '2,3 – 5,5 V'], ['Potencia de servos', '5 – 6 V por la bornera V+']],
        pines: [
            ...fila([['GND', 'GND', 'gnd'], ['OE', 'OE', 'ent', { vmax: 5.5, nota: 'Habilitación de salidas, activa a nivel bajo. Puede quedar sin conectar.' }], ['SCL', 'SCL', 'es', I2C], ['SDA', 'SDA', 'es', I2C], ['VCC', 'VCC', 'alim', { vmin: 2.3, vmax: 5.5, i: 10 }], ['VP', 'V+', 'alim', { vmin: 4.5, vmax: 6, i: 0, nota: 'Alimentación de los servos: pasa directa a los conectores.' }]], 8),
            ...[0, 1, 2, 3].map(n => pin('PWM' + n, 'PWM' + n, 2 + 2 * n, 1, 'arr', 'sal', { v: 3.3, nota: 'Señal de servo del canal ' + n + '.' }))
        ],
        enlaces: [hoja('Hoja de datos PCA9685', 'https://www.nxp.com/docs/en/data-sheet/PCA9685.pdf'), repo('adafruit/Adafruit-PWM-Servo-Driver-Library', 'https://github.com/adafruit/Adafruit-PWM-Servo-Driver-Library'), doc('Controladores de servos en RobotShop', 'https://eu.robotshop.com/collections/servo-controllers')]
    },
    {
        id: 'mg996r', nombre: 'Servo de alto par MG996R', corto: 'Servo MG996R', fabricante: 'TowerPro (Waveshare)',
        categoria: 'actuadores', precio: 5.49, ref: 'M', w: 8, h: 6, dibujo: 'mg996r',
        resumen: 'Servo de engranajes metálicos · unos 10 kg·cm · 180°',
        descripcion: 'El servo habitual de brazos robóticos y hexápodos. Se controla igual que el SG90, con un pulso de 0,5 a 2,5 ms cada 20 ms.',
        aviso: 'Bloqueado puede pedir más de 2 A: siempre con fuente propia de 5 – 6 V y masas unidas con la placa.',
        specs: [['Par', '≈ 9,4 kg·cm a 4,8 V · 11 kg·cm a 6 V'], ['Velocidad', '≈ 0,17 s / 60° a 4,8 V'], ['Alimentación', '4,8 – 7,2 V · 500 – 900 mA en movimiento'], ['Peso', '55 g']],
        pines: fila([['GND', 'GND (marrón)', 'gnd'], ['VCC', 'V+ (rojo)', 'alim', { vmin: 4.8, vmax: 7.2, i: 900 }], ['PWM', 'PWM (naranja)', 'ent', { vmax: 7.2 }]], 6, 3),
        enlaces: [repo('madhephaestus/ESP32Servo', 'https://github.com/madhephaestus/ESP32Servo')]
    },
    {
        id: 'l298n', nombre: 'Controlador de motores L298N', corto: 'Driver L298N', fabricante: 'STMicroelectronics (módulo genérico)',
        categoria: 'actuadores', precio: 3.95, ref: 'U', w: 12, h: 12, dibujo: 'l298n',
        resumen: 'Doble puente en H: dos motores de continua con sentido y velocidad',
        descripcion: 'Cada canal invierte el giro con dos entradas (IN) y regula la velocidad con PWM en la habilitación (EN). Es la base de los coches robot de dos ruedas.',
        aviso: 'Pierde cerca de 2 V en el puente: con 6 V de pilas el motor recibe unos 4 V. Une siempre su GND con el de la placa.',
        specs: [['Canales', '2 motores DC o 1 paso a paso bipolar'], ['Motores', '5 – 35 V en el módulo (el chip admite 46 V) · 2 A por canal'], ['Entradas', 'Lógica de 5 V, válida con 3,3 V'], ['Caída', '≈ 1,8 V a 1 A · hasta 4,9 V a 2 A']],
        pines: [
            ...fila([['VM', '+12V', 'alim', { vmin: 5, vmax: 35, i: 0, nota: 'Alimentación de los motores.' }], ['GND', 'GND', 'gnd'], ['ENA', 'ENA', 'ent', { vmax: 5.5 }], ['IN1', 'IN1', 'ent', { vmax: 5.5 }], ['IN2', 'IN2', 'ent', { vmax: 5.5 }], ['IN3', 'IN3', 'ent', { vmax: 5.5 }], ['IN4', 'IN4', 'ent', { vmax: 5.5 }], ['ENB', 'ENB', 'ent', { vmax: 5.5 }]], 12, 2),
            pin('OUT1', 'OUT1', 3, 1, 'arr', 'pas'), pin('OUT2', 'OUT2', 5, 1, 'arr', 'pas'), pin('OUT3', 'OUT3', 7, 1, 'arr', 'pas'), pin('OUT4', 'OUT4', 9, 1, 'arr', 'pas')
        ],
        enlaces: [hoja('Hoja de datos L298', 'https://www.st.com/resource/en/datasheet/l298.pdf')]
    },
    {
        id: 'motor-tt', nombre: 'Motor reductor 1:48 con rueda', corto: 'Motor reductor', fabricante: 'Genérico',
        categoria: 'actuadores', precio: 2.95, ref: 'M', w: 8, h: 5, dibujo: 'motortt',
        resumen: 'Motor de continua de 3 – 6 V con reductora y rueda de 65 mm',
        descripcion: 'El motor amarillo de los chasis de coche robot. Se conecta a una salida del controlador de motores, nunca directamente a un GPIO.',
        specs: [['Alimentación', '3 – 6 V'], ['Reductora', '1:48 · ≈ 250 rpm a 6 V'], ['Consumo', '≈ 150 mA en vacío · 1,1 – 1,5 A bloqueado']],
        pines: fila([['A', 'M+', 'pas'], ['B', 'M−', 'pas']], 5, 3),
        enlaces: []
    },
    {
        id: 'portapilas-4aa', nombre: 'Portapilas de 4 × AA', corto: 'Portapilas 4 AA', fabricante: 'Genérico',
        categoria: 'alimentacion', precio: 1.49, ref: 'BT', w: 9, h: 8, dibujo: 'portapilas',
        resumen: '6 V con pilas alcalinas (4,8 V con recargables) para motores y servos',
        descripcion: 'Alimentación móvil para un coche robot o un brazo. Mantiene los motores fuera de la alimentación del microcontrolador.',
        specs: [['Tensión', '6 V con alcalinas · 4,8 V con NiMH'], ['Corriente', '≈ 1,5 A de pico']],
        pines: [pin('V', '+6V', 8, 3, 'der', 'fuente', { v: 6, imax: 1500 }), gnd('GND', 8, 5, 'der')],
        enlaces: []
    },
    {
        id: 'mpu6050', nombre: 'Acelerómetro y giroscopio MPU6050 (GY-521)', corto: 'IMU MPU6050', fabricante: 'TDK InvenSense',
        categoria: 'sensores', precio: 3.95, ref: 'S', w: 9, h: 6, dibujo: 'mpu6050',
        resumen: 'Seis ejes por I²C: inclinación, giro y vibración',
        descripcion: 'La unidad inercial de drones, robots equilibristas y mandos por gestos. Dirección I²C 0x68 (0x69 con AD0 a nivel alto).',
        specs: [['Ejes', '3 de aceleración (±2 a ±16 g) · 3 de giro (±250 a ±2000 °/s)'], ['Interfaz', 'I²C (0x68/0x69) · hasta 400 kHz'], ['Alimentación', '3 – 5 V en el módulo (el chip, 2,375 – 3,46 V) · 3,9 mA']],
        pines: fila([['VCC', 'VCC', 'alim', { vmin: 3, vmax: 5.5, i: 4 }], ['GND', 'GND', 'gnd'], ['SCL', 'SCL', 'es', { vmax: 3.6 }], ['SDA', 'SDA', 'es', { vmax: 3.6 }], ['AD0', 'AD0', 'ent', { vmax: 3.6, nota: 'Selección de dirección: al aire o a GND, 0x68.' }], ['INT', 'INT', 'sal', { v: 3.3, nota: 'Interrupción de dato listo.' }]], 6),
        enlaces: [repo('electroniccats/mpu6050', 'https://github.com/electroniccats/mpu6050'), repo('adafruit/Adafruit_MPU6050', 'https://github.com/adafruit/Adafruit_MPU6050')]
    },
    {
        id: 'joystick', nombre: 'Joystick analógico XY con pulsador', corto: 'Joystick XY', fabricante: 'Genérico',
        categoria: 'sensores', precio: 1.95, ref: 'JS', w: 8, h: 8, dibujo: 'joystick',
        resumen: 'Dos potenciómetros y un pulsador: mando para coches, brazos y drones',
        descripcion: 'Cada eje entrega una tensión proporcional a la posición, que se lee con el ADC. El pulsador cierra a GND.',
        aviso: 'Aliméntalo a 3,3 V: a 5 V las salidas superan el máximo del ADC del ESP32-S3.',
        specs: [['Ejes', '2 × 10 kΩ'], ['Salida', '0 V a la tensión de alimentación'], ['Pulsador', 'A GND, necesita pull-up']],
        pines: fila([['GND', 'GND', 'gnd'], ['VCC', '+V', 'alim', { vmin: 3, vmax: 5.5, i: 1 }], ['VRX', 'VRx', 'sal', { v: 3.3 }], ['VRY', 'VRy', 'sal', { v: 3.3 }], ['SW', 'SW', 'pas']], 8),
        enlaces: []
    },
    {
        id: 'ir-receptor', nombre: 'Receptor de infrarrojos de 38 kHz', corto: 'Receptor IR', fabricante: 'Genérico (VS1838B)',
        categoria: 'sensores', precio: 1.5, ref: 'IR', w: 5, h: 6, dibujo: 'irreceptor',
        resumen: 'Lee los códigos de cualquier mando a distancia',
        descripcion: 'Demodula la portadora de 38 kHz y entrega los pulsos ya limpios. Con él se capturan los códigos de un mando para repetirlos después.',
        aviso: 'Aliméntalo a 3,3 V para que la salida no supere el nivel del ESP32-S3.',
        specs: [['Portadora', '38 kHz · 940 nm'], ['Alcance', 'hasta 15 m'], ['Alimentación', '2,7 – 5,5 V · menos de 1,5 mA']],
        pines: fila([['OUT', 'OUT', 'sal', { v: 3.3 }], ['GND', 'GND', 'gnd'], ['VCC', 'VCC', 'alim', { vmin: 2.7, vmax: 5.5, i: 2 }]], 6),
        enlaces: [repo('crankyoldgit/IRremoteESP8266', 'https://github.com/crankyoldgit/IRremoteESP8266')]
    },
    {
        id: 'ir-emisor', nombre: 'Emisor de infrarrojos (módulo)', corto: 'Emisor IR', fabricante: 'Genérico',
        categoria: 'salidas', precio: 1.5, ref: 'IR', w: 5, h: 6, dibujo: 'iremisor',
        resumen: 'LED infrarrojo con transistor: envía órdenes a la tele o al aire acondicionado',
        descripcion: 'El micro modula la portadora de 38 kHz por un GPIO (periférico RMT) y el transistor del módulo da la corriente al LED.',
        specs: [['Longitud de onda', '940 nm'], ['Alimentación', '3,3 – 5 V · hasta 100 mA en ráfaga']],
        pines: fila([['DAT', 'DAT', 'ent', { vmax: 5.5 }], ['VCC', 'VCC', 'alim', { vmin: 3, vmax: 5.5, i: 100 }], ['GND', 'GND', 'gnd']], 6),
        enlaces: [repo('crankyoldgit/IRremoteESP8266', 'https://github.com/crankyoldgit/IRremoteESP8266')]
    },
    {
        id: 'tft-st7789', nombre: 'Pantalla TFT IPS 1,3" 240 × 240 ST7789', corto: 'TFT 1,3" ST7789', fabricante: 'Adafruit',
        categoria: 'salidas', precio: 16.78, ref: 'DS', w: 12, h: 12, dibujo: 'tft',
        resumen: 'Pantalla a color de gran ángulo por SPI, con ranura microSD',
        descripcion: 'Para interfaces con gráficos, espectros o imágenes. Se maneja por SPI: en el ESP32-S3, SCK = GPIO12 y MOSI = GPIO11 por defecto.',
        specs: [['Resolución', '240 × 240 · 65 536 colores'], ['Interfaz', 'SPI'], ['Alimentación', '3 – 5 V (con regulador y adaptación de nivel)']],
        pines: fila([['VIN', 'VIN', 'alim', { vmin: 3, vmax: 5.5, i: 40 }], ['GND', 'GND', 'gnd'], ['SCK', 'SCK', 'ent', { vmax: 5.5 }], ['MOSI', 'MOSI', 'ent', { vmax: 5.5 }], ['CS', 'CS', 'ent', { vmax: 5.5 }], ['DC', 'D/C', 'ent', { vmax: 5.5 }], ['RST', 'RST', 'ent', { vmax: 5.5 }], ['BL', 'BL', 'ent', { vmax: 5.5, nota: 'Retroiluminación: admite PWM.' }]], 12, 2),
        enlaces: [doc('Guía de la pantalla (Adafruit)', 'https://learn.adafruit.com/adafruit-1-3-and-1-54-240-x-240-wide-angle-tft-lcd-displays'), repo('adafruit/Adafruit-ST7735-Library', 'https://github.com/adafruit/Adafruit-ST7735-Library'), repo('Bodmer/TFT_eSPI', 'https://github.com/Bodmer/TFT_eSPI')]
    },
    {
        id: 'nrf24l01', nombre: 'Transceptor de 2,4 GHz nRF24L01+', corto: 'Radio nRF24L01+', fabricante: 'Nordic Semiconductor',
        categoria: 'red', precio: 2.45, ref: 'RF', w: 10, h: 6, dibujo: 'nrf24',
        resumen: 'Enlace de radio punto a punto por SPI, sin Wi-Fi ni router',
        descripcion: 'Dos módulos se envían paquetes de hasta 32 bytes a 2 Mbps: mandos, telemetría o mensajes entre dos placas.',
        aviso: 'Solo 3,3 V en VCC: con 5 V se destruye. Las entradas aceptan señales de 5 V únicamente si VCC está entre 2,7 y 3,3 V. Es sensible al ruido de alimentación; un condensador de 10 µF entre VCC y GND evita cortes.',
        specs: [['Banda', '2,4 GHz ISM · 126 canales'], ['Velocidad', '250 kbps, 1 o 2 Mbps'], ['Interfaz', 'SPI + CE e IRQ'], ['Alimentación', '1,9 – 3,6 V · 11,3 mA al transmitir · 13,5 mA al recibir']],
        pines: fila([['GND', 'GND', 'gnd'], ['VCC', 'VCC', 'alim', { vmin: 1.9, vmax: 3.6, i: 14 }], ['CE', 'CE', 'ent', { vmax: 5.25 }], ['CSN', 'CSN', 'ent', { vmax: 5.25 }], ['SCK', 'SCK', 'ent', { vmax: 5.25 }], ['MOSI', 'MOSI', 'ent', { vmax: 5.25 }], ['MISO', 'MISO', 'sal', { v: 3.3 }], ['IRQ', 'IRQ', 'sal', { v: 3.3 }]], 6),
        enlaces: [repo('nRF24/RF24', 'https://github.com/nRF24/RF24'), repo('pepeangell5/ESP32_DUAL_NRF_CHAT', 'https://github.com/pepeangell5/ESP32_DUAL_NRF_CHAT')]
    },
    {
        id: 'cc1101', nombre: 'Transceptor sub-GHz CC1101 (433 MHz)', corto: 'Radio CC1101', fabricante: 'Texas Instruments',
        categoria: 'red', precio: 3.95, ref: 'RF', w: 10, h: 6, dibujo: 'cc1101',
        resumen: 'Radio de 433 MHz por SPI: sensores, mandos y estaciones meteorológicas',
        descripcion: 'Recibe y decodifica las tramas de sensores domésticos de 433 MHz y permite enlaces propios de largo alcance y bajo consumo.',
        aviso: 'Solo 3,3 V y entradas no tolerantes a 5 V. En 433 MHz la potencia y el tiempo de emisión están limitados por norma: úsalo para recibir y con tus propios dispositivos.',
        specs: [['Bandas', '300 – 348, 387 – 464 y 779 – 928 MHz'], ['Interfaz', 'SPI + GDO0 y GDO2'], ['Alimentación', '1,8 – 3,6 V · 15 mA al recibir · 34 mA al transmitir a +12 dBm']],
        pines: fila([['GND', 'GND', 'gnd'], ['VCC', 'VCC', 'alim', { vmin: 1.8, vmax: 3.6, i: 34 }], ['GDO0', 'GDO0', 'es', { vmax: 3.6 }], ['CSN', 'CSN', 'ent', { vmax: 3.6 }], ['SCK', 'SCK', 'ent', { vmax: 3.6 }], ['MOSI', 'MOSI', 'ent', { vmax: 3.6 }], ['MISO', 'MISO', 'sal', { v: 3.3 }], ['GDO2', 'GDO2', 'es', { vmax: 3.6 }]], 6),
        enlaces: [doc('TI CC1101', 'https://www.ti.com/product/CC1101'), repo('LSatan/SmartRC-CC1101-Driver-Lib', 'https://github.com/LSatan/SmartRC-CC1101-Driver-Lib'), repo('merbanan/rtl_433 (protocolos de 433 MHz)', 'https://github.com/merbanan/rtl_433')]
    },
    {
        id: 'rplidar-a1', nombre: 'Escáner láser 360° RPLIDAR A1M8', corto: 'RPLIDAR A1', fabricante: 'Slamtec',
        categoria: 'sensores', precio: 98.01, ref: 'LD', w: 14, h: 12, dibujo: 'rplidar',
        resumen: 'LiDAR 2D de 12 m: mapas y navegación autónoma con una Raspberry Pi',
        descripcion: 'Gira y mide distancias en todo el plano. Con ROS 2 o las bibliotecas de Slamtec genera el mapa de una habitación (SLAM) y localiza al robot dentro de él.',
        aviso: 'Va a un host con Linux por su adaptador USB, no al ESP32-S3. El motor suma consumo: en una Raspberry Pi cuenta con el límite conjunto de sus USB.',
        alimPor: [['USB']],
        specs: [['Alcance', '0,15 – 12 m · 360°'], ['Muestreo', '8000 medidas/s · 5,5 Hz de giro (ajustable de 2 a 10 Hz)'], ['Interfaz', 'UART a 3,3 V, con adaptador USB'], ['Alimentación', '5 V · 100 mA la electrónica, más el motor (se reservan 500 mA)'], ['Resolución angular', '≤ 1°']],
        pines: [pin('USB', 'USB (adaptador)', 14, 6, 'der', 'usb_dev', { i: 500, puerto: 'usba' })],
        enlaces: [doc('Slamtec RPLIDAR A1', 'https://www.slamtec.com/en/Lidar/A1'), repo('Slamtec/rplidar_ros', 'https://github.com/Slamtec/rplidar_ros'), repo('Slamtec/rplidar_sdk', 'https://github.com/Slamtec/rplidar_sdk')]
    }
];

export const CATALOGO = new Map(COMPONENTES.map(c => [c.id, c]));

export const TIPOS_PIN = {
    fuente: 'Salida de alimentación', alim: 'Entrada de alimentación', gnd: 'Masa', es: 'Entrada/salida', ent: 'Entrada',
    sal: 'Salida', pas: 'Pasivo', usb_host: 'USB anfitrión', usb_dev: 'USB dispositivo', red: 'Enlace de red',
    neutro: 'Neutro', tierra: 'Tierra de protección'
};
