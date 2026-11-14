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
        categoria: 'placas', propio: true, precio: 124.8, ref: 'U', mcu: true, w: 22, h: 34, dibujo: 'rpi4',
        resumen: 'Cortex-A72 de 4 núcleos a 1,8 GHz · 2 × USB 3.0 · Gigabit Ethernet · Wi-Fi de doble banda',
        descripcion: 'Ordenador de placa única con Linux. Es el host natural del Coral USB: sus dos puertos USB 3.0 dan al acelerador el ancho de banda que necesita y puede quedarse encendido 24/7 con el broker MQTT y la inferencia.',
        aviso: 'Los GPIO son de 3,3 V y no toleran 5 V. Para el Coral usa siempre los puertos azules (USB 3.0).',
        alimPor: [['PWR'], ['5V_1'], ['5V_2']],
        alimNota: 'necesita una fuente USB-C de 5,1 V / 3 A.',
        specs: [
            ['Procesador', 'Broadcom BCM2711, 4 × Cortex-A72 (ARMv8) a 1,8 GHz'],
            ['Memoria', '1, 2, 4 u 8 GB LPDDR4-3200 (precio de la versión de 4 GB)'],
            ['Red', 'Gigabit Ethernet · Wi-Fi 802.11ac · Bluetooth 5.0'],
            ['USB', '2 × USB 3.0 · 2 × USB 2.0'],
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
        specs: [['Salida', 'I²S de 24 bit'], ['Relación señal/ruido', '61 dBA'], ['Sensibilidad', '−26 dBFS'], ['Respuesta', '60 Hz – 15 kHz'], ['Alimentación', '1,8 – 3,3 V · 1,4 mA']],
        pines: [
            pin('LR', 'L/R', 1, 2, 'izq', 'ent', { vmax: 3.6, req: true, nota: 'llévalo a GND (canal izquierdo) o a VDD (canal derecho).' }),
            pin('WS', 'WS', 1, 3, 'izq', 'ent', { vmax: 3.6, nota: 'Selección de palabra (LRCLK).' }),
            pin('SCK', 'SCK', 1, 4, 'izq', 'ent', { vmax: 3.6, nota: 'Reloj de bit (BCLK).' }),
            pin('SD', 'SD', 5, 2, 'der', 'sal', { v: 3.3, nota: 'Datos de audio hacia el micro.' }),
            pin('VDD', 'VDD', 5, 3, 'der', 'alim', { vmin: 1.8, vmax: 3.6, i: 2 }),
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
        categoria: 'actuadores', propio: true, precio: 2.9, ref: 'M', w: 13, h: 6, dibujo: 'sg90',
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
    {
        id: 'hc-sr04', nombre: 'Sensor ultrasónico HC-SR04', corto: 'HC-SR04', fabricante: 'Genérico',
        categoria: 'sensores', precio: 2.4, ref: 'S', w: 18, h: 8, dibujo: 'hcsr04',
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
        categoria: 'sensores', precio: 3, ref: 'S', w: 6, h: 5, dibujo: 'modulo', arte: { pcb: '#6b2fa3', chip: 'BME', etiqueta: 'BME280' },
        resumen: 'Temperatura, humedad y presión por I²C',
        descripcion: 'Sensor combinado de precisión. Dirección I²C 0x76 o 0x77.',
        specs: [['Rangos', '−40 a 85 °C · 0 – 100 % HR · 300 – 1100 hPa'], ['Interfaz', 'I²C (0x76/0x77) o SPI'], ['Alimentación', '1,8 – 3,6 V · < 1 mA']],
        pines: fila([['VIN', 'VIN', 'alim', { vmin: 1.8, vmax: 3.6, i: 1 }], ['GND', 'GND', 'gnd'], ['SCL', 'SCL', 'es', { vmax: 3.6 }], ['SDA', 'SDA', 'es', { vmax: 3.6 }]], 5),
        enlaces: [doc('Bosch BME280', 'https://www.bosch-sensortec.com/products/environmental-sensors/humidity-sensors-bme280/'), repo('adafruit/Adafruit_BME280_Library', 'https://github.com/adafruit/Adafruit_BME280_Library')]
    },
    {
        id: 'vl53l1x', nombre: 'Sensor láser ToF VL53L1X', corto: 'VL53L1X', fabricante: 'STMicroelectronics',
        categoria: 'sensores', precio: 4, ref: 'S', w: 7, h: 5, dibujo: 'modulo', arte: { pcb: '#1f4f8f', chip: 'ToF', etiqueta: 'VL53L1X' },
        resumen: 'Distancia por tiempo de vuelo láser hasta 4 m, por I²C',
        descripcion: 'Mide distancia absoluta con independencia del color del objeto. Dirección I²C 0x29.',
        specs: [['Alcance', 'hasta 400 cm · 50 Hz'], ['Interfaz', 'I²C (0x29)'], ['Alimentación', '2,6 – 5,5 V (módulo con regulador) · 20 mA']],
        pines: fila([['VIN', 'VIN', 'alim', { vmin: 2.6, vmax: 5.5, i: 20 }], ['GND', 'GND', 'gnd'], ['SDA', 'SDA', 'es', I2C], ['SCL', 'SCL', 'es', I2C], ['XSHUT', 'XSHUT', 'ent', { vmax: 5.5, nota: 'Apagado, activo a nivel bajo.' }]], 5),
        enlaces: [doc('ST VL53L1X', 'https://www.st.com/en/imaging-and-photonics-solutions/vl53l1x.html'), repo('pololu/vl53l1x-arduino', 'https://github.com/pololu/vl53l1x-arduino')]
    },
    {
        id: 'pir-hcsr501', nombre: 'Detector de movimiento PIR HC-SR501', corto: 'PIR HC-SR501', fabricante: 'Genérico',
        categoria: 'sensores', precio: 1.5, ref: 'S', w: 13, h: 10, dibujo: 'pir',
        resumen: 'Detección de presencia por infrarrojo pasivo, salida digital de 3,3 V',
        descripcion: 'Despierta al micro solo cuando hay movimiento, para no tener la cámara y la inferencia activas todo el tiempo.',
        specs: [['Alcance', '3 – 7 m · 110°'], ['Salida', 'Digital 3,3 V'], ['Alimentación', '4,5 – 20 V · 65 µA']],
        pines: fila([['VCC', 'VCC', 'alim', { vmin: 4.5, vmax: 20, i: 1 }], ['OUT', 'OUT', 'sal', { v: 3.3 }], ['GND', 'GND', 'gnd']], 10, 5),
        enlaces: [doc('Guía PIR (Adafruit)', 'https://learn.adafruit.com/pir-passive-infrared-proximity-motion-sensor')]
    },
    {
        id: 'ds18b20', nombre: 'Sonda de temperatura DS18B20', corto: 'DS18B20', fabricante: 'Analog Devices',
        categoria: 'sensores', precio: 2, ref: 'S', w: 5, h: 6, dibujo: 'modulo', arte: { pcb: '#20232a', chip: '1W', etiqueta: 'DS18B20' },
        resumen: 'Termómetro digital 1-Wire, versión sumergible',
        descripcion: 'Un solo hilo de datos para varias sondas. Necesita una resistencia de 4,7 kΩ entre DQ y VDD.',
        specs: [['Rango', '−55 a 125 °C · ±0,5 °C'], ['Interfaz', '1-Wire'], ['Alimentación', '3,0 – 5,5 V · 1,5 mA']],
        pines: fila([['GND', 'GND', 'gnd'], ['DQ', 'DQ', 'es', { vmax: 5.5, nota: 'Datos 1-Wire: requiere 4,7 kΩ a VDD.' }], ['VDD', 'VDD', 'alim', { vmin: 3, vmax: 5.5, i: 2 }]], 6),
        enlaces: [hoja('Hoja de datos DS18B20', 'https://www.analog.com/media/en/technical-documentation/data-sheets/DS18B20.pdf'), repo('milesburton/Arduino-Temperature-Control-Library', 'https://github.com/milesburton/Arduino-Temperature-Control-Library')]
    },
    {
        id: 'rele-2ch', nombre: 'Módulo de 2 relés de 5 V', corto: 'Relé 2 canales', fabricante: 'Genérico (Songle)',
        categoria: 'actuadores', precio: 3.5, ref: 'K', w: 20, h: 15, dibujo: 'rele2',
        resumen: 'Dos relés optoacoplados · contactos de 10 A a 250 V CA',
        descripcion: 'Permite que un GPIO conmute cargas de red o de continua con aislamiento. Las entradas son activas a nivel bajo.',
        aviso: 'Las entradas se activan a nivel bajo. Los contactos pueden llevar 230 V: mantén separado ese lado del resto del montaje.',
        specs: [['Bobinas', '5 V · ≈ 70 mA por relé'], ['Contactos', '10 A a 250 V CA · 10 A a 30 V CC'], ['Entradas', 'Optoacopladas, activas a nivel bajo']],
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
        categoria: 'actuadores', precio: 1, ref: 'BZ', w: 5, h: 7, dibujo: 'zumbador',
        resumen: 'Aviso acústico de 85 dB con oscilador interno',
        descripcion: 'Suena al activar su entrada: no necesita generar tono por PWM.',
        specs: [['Alimentación', '3,3 – 5 V · 30 mA'], ['Sonido', '≈ 85 dB a 2,3 kHz']],
        pines: fila([['VCC', 'VCC', 'alim', { vmin: 3, vmax: 5.5, i: 30 }], ['IO', 'I/O', 'ent', { vmax: 5.5 }], ['GND', 'GND', 'gnd']], 7),
        enlaces: []
    },
    {
        id: 'oled-ssd1306', nombre: 'Pantalla OLED 0,96" I²C SSD1306', corto: 'OLED 0,96"', fabricante: 'Solomon Systech',
        categoria: 'salidas', precio: 4.2, ref: 'DS', w: 11, h: 11, dibujo: 'oled',
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
        id: 'pulsador', nombre: 'Pulsador táctil de 6 mm', corto: 'Pulsador', fabricante: 'Genérico', categoria: 'pasivos', precio: 0.1, ref: 'SW', w: 4, h: 4, dibujo: 'pulsador',
        resumen: 'Pulsador normalmente abierto',
        descripcion: 'Entre un GPIO con pull-up interno y GND: se lee un 0 al pulsar.',
        specs: [['Contacto', 'NA · 50 mA a 12 V']],
        pines: [pin('1', '1', 0, 2, 'izq', 'pas'), pin('2', '2', 4, 2, 'der', 'pas')],
        enlaces: []
    },
    {
        id: 'divisor-5v-3v3', nombre: 'Divisor de tensión 1 kΩ / 2 kΩ', corto: 'Divisor 5→3,3 V', fabricante: 'Genérico', categoria: 'pasivos', precio: 0.2, ref: 'RN', w: 5, h: 5, dibujo: 'modulo', arte: { pcb: '#3a3d44', chip: '÷', etiqueta: '1k/2k' },
        resumen: 'Baja una señal de 5 V a 3,3 V (una sola dirección)',
        descripcion: 'Dos resistencias en serie: de 5 V salen 3,33 V. Suficiente para señales lentas como el ECHO del HC-SR04.',
        specs: [['Relación', '2/3 · 5 V → 3,33 V'], ['Impedancia', '667 Ω']],
        pines: fila([['IN', 'IN 5V', 'ent', { vmax: 5.5 }], ['OUT', 'OUT 3V3', 'sal', { v: 3.3 }], ['GND', 'GND', 'gnd']], 5),
        enlaces: []
    },
    {
        id: 'conversor-nivel', nombre: 'Convertidor de nivel bidireccional (4 canales)', corto: 'Convertidor nivel', fabricante: 'Genérico (BSS138)', categoria: 'pasivos', precio: 1.2, ref: 'LS', w: 7, h: 7, dibujo: 'modulo', arte: { pcb: '#a3232a', chip: 'LS', etiqueta: 'BSS138' },
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
        id: 'magnetotermico', nombre: 'Interruptor magnetotérmico 1P+N C10', corto: 'Magnetotérmico C10', fabricante: 'Genérico', categoria: 'potencia', precio: 6, ref: 'Q', w: 4, h: 14, dibujo: 'magneto',
        resumen: 'Protección de línea de 10 A, curva C, carril DIN',
        descripcion: 'Protege el circuito contra sobrecargas y cortocircuitos. 10 A es el calibre habitual de un circuito de alumbrado con cable de 1,5 mm².',
        specs: [['Calibre', '10 A, curva C'], ['Poder de corte', '6 kA'], ['Anchura', '1 módulo DIN (18 mm)']],
        pines: [
            pin('L_IN', 'L entrada', 1, 0, 'arr', 'alim', { dom: 'ac', vmin: 110, vmax: 440, i: 0 }),
            pin('N_IN', 'N entrada', 3, 0, 'arr', 'neutro', { dom: 'ac' }),
            pin('L_OUT', 'L salida', 1, 14, 'aba', 'fuente', { dom: 'ac', v: 230, imax: 10000 }),
            pin('N_OUT', 'N salida', 3, 14, 'aba', 'neutro', { dom: 'ac' })
        ],
        enlaces: []
    },
    {
        id: 'lampara', nombre: 'Lámpara LED de 230 V', corto: 'Lámpara 230 V', fabricante: 'Genérico', categoria: 'potencia', precio: 3, ref: 'E', w: 6, h: 9, dibujo: 'lampara',
        resumen: 'Carga de alumbrado de 9 W',
        descripcion: 'Carga de ejemplo para el circuito de potencia.',
        specs: [['Potencia', '9 W · ≈ 40 mA a 230 V']],
        pines: [pin('L', 'L', 2, 9, 'aba', 'alim', { dom: 'ac', vmin: 110, vmax: 240, i: 40 }), pin('N', 'N', 4, 9, 'aba', 'neutro', { dom: 'ac' })],
        enlaces: []
    },
    {
        id: 'interruptor-pared', nombre: 'Interruptor de pared', corto: 'Interruptor', fabricante: 'Genérico', categoria: 'potencia', precio: 4, ref: 'S', w: 7, h: 8, dibujo: 'interruptor',
        resumen: 'Mecanismo unipolar de 10 A',
        descripcion: 'Entre la fase y la entrada SW de un Shelly, o directamente en serie con la carga.',
        specs: [['Contacto', '10 AX · 250 V CA']],
        pines: [pin('1', '1', 2, 8, 'aba', 'pas'), pin('2', '2', 5, 8, 'aba', 'pas')],
        enlaces: []
    }
];

export const CATALOGO = new Map(COMPONENTES.map(c => [c.id, c]));

export const TIPOS_PIN = {
    fuente: 'Salida de alimentación', alim: 'Entrada de alimentación', gnd: 'Masa', es: 'Entrada/salida', ent: 'Entrada',
    sal: 'Salida', pas: 'Pasivo', usb_host: 'USB anfitrión', usb_dev: 'USB dispositivo', red: 'Enlace de red',
    neutro: 'Neutro', tierra: 'Tierra de protección'
};
