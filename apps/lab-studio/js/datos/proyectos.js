// Biblioteca de proyectos.
//
// Todos llevan `montaje`: se abren en la mesa ya cableados (coordenadas en
// unidades de rejilla). Las pruebas cargan cada plantilla y exigen que pase
// la comprobación eléctrica sin errores y que las piezas no se pisen. Las
// fichas de ideas guardan su circuito aparte, en MONTAJES, y el material que
// no está en la biblioteca en `extra`. El código de ejemplo está en ejemplos.js.

import { EJEMPLOS } from './ejemplos.js';

const ESP = 'esp32-s3-devkitc-1-n16r8';
const PI = 'raspberry-pi-4b';
const CYD = 'esp32-2432s028r';
const CYD_NOMBRE = 'ESP32 CYD 2,8"';
const C3 = 'esp32-c3-supermini';
const STAMP = 'm5stamp-s3';
const gh = (ruta, nota) => ({ t: ruta, url: 'https://github.com/' + ruta, nota });
const doc = (t, url) => ({ t, url });

const R = {
    pycoral: gh('google-coral/pycoral', 'API de Python del Edge TPU, con ejemplos de detección, clasificación, pose y segmentación'),
    libedgetpu: gh('google-coral/libedgetpu', 'Runtime del Edge TPU'),
    camara: gh('google-coral/examples-camera', 'Inferencia en vivo con cámara: OpenCV, GStreamer, PyGame'),
    posenet: gh('google-coral/project-posenet', 'Estimación de pose humana en el Edge TPU'),
    testdata: gh('google-coral/test_data', 'Modelos compilados para el Edge TPU (SSD MobileNet, iNaturalist, EfficientDet…)'),
    frigate: gh('blakeblackshear/frigate', 'NVR con detección en tiempo real: usa el Coral y cámaras RTSP'),
    go2rtc: gh('AlexxIT/go2rtc', 'Pasarela de vídeo: RTSP a WebRTC, MJPEG o HLS'),
    arduino: gh('espressif/arduino-esp32', 'Núcleo de Arduino para ESP32, con USB, I²S, LEDC y RMT'),
    idf: gh('espressif/esp-idf', 'Framework oficial de Espressif'),
    tflm: gh('espressif/esp-tflite-micro', 'TensorFlow Lite Micro optimizado para ESP32-S3'),
    espnn: gh('espressif/esp-nn', 'Núcleos de redes neuronales con las instrucciones vectoriales del S3'),
    espsr: gh('espressif/esp-sr', 'Reconocimiento de voz: palabra de activación y órdenes'),
    mqtt: gh('knolleary/pubsubclient', 'Cliente MQTT para Arduino'),
    mosquitto: gh('eclipse-mosquitto/mosquitto', 'Broker MQTT'),
    json: gh('bblanchon/ArduinoJson', 'JSON eficiente en microcontroladores'),
    servo: gh('madhephaestus/ESP32Servo', 'Servos con el periférico LEDC'),
    ssd1306: gh('adafruit/Adafruit_SSD1306', 'Controlador de la pantalla OLED'),
    fastled: gh('FastLED/FastLED', 'Tiras y matrices LED direccionables'),
    mediapipe: gh('google-ai-edge/mediapipe', 'Manos, pose y gestos'),
    yolo: gh('ultralytics/ultralytics', 'YOLO: entrenamiento y exportación a TFLite INT8 para Edge TPU'),
    audiotools: gh('pschatzmann/arduino-audio-tools', 'Audio I²S: captura, reproducción y filtros'),
    shelly: gh('ALLTERCO/shelly-script-examples', 'Scripts de ejemplo para Shelly Gen2/Gen3'),
    esphome: gh('esphome/esphome', 'Firmware declarativo para ESP32 integrado en Home Assistant'),
    ha: gh('home-assistant/core', 'Home Assistant'),
    cyd: gh('witnessmenow/ESP32-Cheap-Yellow-Display', 'Patillaje, ejemplos y configuración de la CYD'),
    tftespi: gh('Bodmer/TFT_eSPI', 'Gráficos rápidos en pantallas TFT por SPI'),
    lvgl: gh('lvgl/lvgl', 'Interfaces gráficas táctiles para microcontroladores')
};

export const PROYECTOS = [
    {
        id: 'vigilancia-rtsp', titulo: 'Vigilancia híbrida: cámara RTSP + Coral + ESP32-S3', ambito: 'Seguridad del hogar', nivel: 'Intermedio', tiempo: '2 h',
        modelo: 'SSD MobileNet v2 (COCO) INT8',
        resumen: 'La Raspberry Pi recibe el vídeo RTSP de la Mercusys MC210, el Coral detecta personas en unos milisegundos y el ESP32-S3 acciona un relé y muestra la alerta en la pantalla OLED.',
        esp32: 'Recibe las detecciones por la UART de la cabecera de la Raspberry (GPIO17/18), toma de ella los 5 V, conmuta el relé (GPIO14) y pinta el estado en la OLED por I²C (GPIO8/9).',
        coral: 'Detección de objetos sobre el flujo de la cámara, a más de 30 fps, en la Raspberry Pi.',
        material: [{ id: 'mercusys-mc210' }, { id: 'router' }, { id: PI }, { id: 'fuente-usbc' }, { id: 'coral-usb' }, { id: ESP }, { id: 'rele-2ch' }, { id: 'oled-ssd1306' }],
        pasos: [
            'Crea la cuenta de cámara en la app Mercusys y comprueba el flujo con VLC: rtsp://usuario:clave@IP:554/stream1.',
            'Instala el runtime del Edge TPU y PyCoral en la Raspberry Pi y conecta el Coral a un puerto USB 3.0 (azul).',
            'Ejecuta la detección sobre el flujo RTSP con OpenCV y envía cada detección por la UART (/dev/serial0) al ESP32-S3.',
            'En el ESP32-S3, activa el relé durante unos segundos y actualiza la pantalla al recibir una persona.'
        ],
        aprendizaje: [
            'Decodificar RTSP en el host libra al ESP32-S3 del vídeo: él solo hace control en tiempo real.',
            'Por la UART de la cabecera el ESP32-S3 no cuenta en el límite de 1,2 A de los USB de la Raspberry, que se queda para el Coral.',
            'El relé se alimenta de los 5 V y su entrada es activa a nivel bajo.'
        ],
        repos: [R.pycoral, R.camara, R.frigate, R.go2rtc, R.ssd1306, R.arduino],
        docs: [doc('Coral: detección de objetos', 'https://coral.ai/examples/detect-image/'), doc('OpenCV VideoCapture', 'https://docs.opencv.org/4.x/d8/dfe/classcv_1_1VideoCapture.html')],
        montaje: {
            partes: [
                { k: 'net', tipo: 'router', x: 2, y: 2 }, { k: 'cam', tipo: 'mercusys-mc210', x: 2, y: 14 }, { k: 'ps', tipo: 'fuente-usbc', x: 4, y: 36 },
                { k: 'pi', tipo: PI, x: 24, y: 4 }, { k: 'tpu', tipo: 'coral-usb', x: 20, y: 46 },
                { k: 'k', tipo: 'rele-2ch', x: 56, y: 4, rot: 2 }, { k: 'ds', tipo: 'oled-ssd1306', x: 60, y: 26 }, { k: 'esp', tipo: ESP, x: 86, y: 6 }
            ],
            cables: [
                ['cam.WIFI', 'net.P1', 'RTSP H.264'], ['net.P2', 'pi.WIFI', 'LAN'], ['ps.OUT', 'pi.PWR'],
                ['tpu.USB', 'pi.USB3_1', 'USB 3.0'],
                ['pi.GPIO14', 'esp.GPIO18', 'UART TX → RX'], ['pi.GPIO15', 'esp.GPIO17', 'UART RX ← TX'], ['pi.5V_1', 'esp.5V_1', '5 V'], ['pi.GND_1', 'esp.GND_1'],
                ['esp.GPIO14', 'k.IN1', 'Disparo del relé'], ['esp.5V_1', 'k.VCC'], ['esp.GND_1', 'k.GND'],
                ['esp.GPIO8', 'ds.SDA', 'I²C SDA'], ['esp.GPIO9', 'ds.SCL', 'I²C SCL'], ['esp.3V3_1', 'ds.VCC'], ['k.GND', 'ds.GND']
            ]
        }
    },
    {
        id: 'torreta-seguimiento', titulo: 'Torreta de seguimiento a 30 fps: webcam + Coral + servo', ambito: 'Robótica visual', nivel: 'Intermedio', tiempo: '1 h 30 min',
        modelo: 'SSD MobileNet v2 Faces INT8',
        resumen: 'La webcam USB da vídeo sin el retardo de la red, el Coral localiza la cara u objeto y el ESP32-S3 mueve un servo SG90 para mantenerlo centrado.',
        esp32: 'Recibe el ángulo por el puerto serie y genera el PWM de 50 Hz del servo con LEDC (GPIO14).',
        coral: 'Detección de caras a 30 fps en el PC; el script calcula el error horizontal y lo convierte en ángulo.',
        material: [{ id: 'pc-host' }, { id: 'hub-usb3' }, { id: 'coral-usb' }, { id: 'webcam-ugreen-1080p' }, { id: ESP }, { id: 'sg90' }],
        pasos: [
            'Conecta Coral, webcam y ESP32-S3 al hub alimentado y el hub a un puerto USB 3.0 del PC.',
            'Prueba la detección con el ejemplo de cámara de Coral.',
            'Envía «ANG:<0-180>» por el puerto serie y ajusta en el ESP32-S3 el pulso mínimo y máximo del servo.',
            'Añade un control proporcional para que el movimiento sea suave.'
        ],
        aprendizaje: [
            'Una webcam UVC no añade los 200–400 ms de buffer de RTSP: el lazo de control es estable.',
            'Un SG90 cabe en el 5 V del USB; dos o más necesitan su propia fuente y masa común.'
        ],
        repos: [R.camara, R.pycoral, R.servo, R.arduino],
        docs: [doc('LEDC en ESP-IDF', 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/ledc.html')],
        montaje: {
            partes: [
                { k: 'pc', tipo: 'pc-host', x: 2, y: 4 }, { k: 'hub', tipo: 'hub-usb3', x: 30, y: 6 }, { k: 'tpu', tipo: 'coral-usb', x: 2, y: 26 },
                { k: 'cam', tipo: 'webcam-ugreen-1080p', x: 36, y: 22 }, { k: 'esp', tipo: ESP, x: 64, y: 4 }, { k: 'm', tipo: 'sg90', x: 40, y: 42 }
            ],
            cables: [
                ['pc.USB3_1', 'hub.IN', 'USB 3.0'], ['hub.OUT1', 'tpu.USB', 'Edge TPU'], ['hub.OUT2', 'cam.USB', 'UVC 1080p'], ['hub.OUT3', 'esp.USB_UART', 'Serie: ANG'],
                ['esp.GPIO14', 'm.PWM', 'PWM 50 Hz'], ['esp.5V_1', 'm.VCC'], ['esp.GND_1', 'm.GND']
            ]
        }
    },
    {
        id: 'nodo-tinyml', titulo: 'Nodo TinyML autónomo: voz y proximidad en el ESP32-S3', ambito: 'TinyML embebido', nivel: 'Avanzado', tiempo: '3 h',
        modelo: 'Micro Speech (TFLite Micro) o WakeNet',
        resumen: 'Sin host: el ESP32-S3 N16R8 captura audio por I²S, ejecuta el modelo en su PSRAM de 8 MB y solo despierta la inferencia cuando el sensor ultrasónico detecta a alguien cerca.',
        esp32: 'Todo: captura I²S (GPIO4/5/6), medida de distancia (GPIO1/2), inferencia con ESP-NN y resultado en la OLED.',
        coral: 'No interviene. Es el contrapunto a los proyectos híbridos.',
        material: [{ id: 'pc-host' }, { id: ESP }, { id: 'inmp441' }, { id: 'hc-sr04' }, { id: 'divisor-5v-3v3' }, { id: 'oled-ssd1306' }],
        pasos: [
            'Activa la PSRAM octal (memory_type = qio_opi) y reserva el tensor arena con ps_malloc().',
            'Lee el micrófono a 16 kHz y calcula el espectrograma.',
            'Carga el modelo de ejemplo de palabra de activación y mide el tiempo de inferencia.',
            'Usa el HC-SR04 para ejecutar la inferencia solo con alguien a menos de un metro.'
        ],
        aprendizaje: [
            'El ECHO del HC-SR04 sale a 5 V: el divisor lo baja a 3,3 V antes del GPIO.',
            'El pin L/R del INMP441 se fija a GND para usar el canal izquierdo.',
            'Los GPIO 35–37 quedan reservados por la PSRAM octal.'
        ],
        repos: [R.tflm, R.espnn, R.espsr, R.audiotools, R.ssd1306],
        docs: [doc('TensorFlow Lite Micro', 'https://ai.google.dev/edge/litert/microcontrollers/overview'), doc('I²S en ESP-IDF', 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html')],
        montaje: {
            partes: [
                { k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'mic', tipo: 'inmp441', x: 30, y: 6 }, { k: 'ds', tipo: 'oled-ssd1306', x: 26, y: 18 },
                { k: 'esp', tipo: ESP, x: 44, y: 4 }, { k: 's', tipo: 'hc-sr04', x: 66, y: 8 }, { k: 'd', tipo: 'divisor-5v-3v3', x: 64, y: 22 }
            ],
            cables: [
                ['pc.USB2', 'esp.USB_UART', 'Alimentación y serie'],
                ['mic.VDD', 'esp.3V3_1'], ['mic.GND', 'esp.GND_1'], ['mic.LR', 'mic.GND', 'Canal izquierdo'],
                ['mic.SD', 'esp.GPIO4', 'I²S datos'], ['mic.WS', 'esp.GPIO5', 'I²S WS'], ['mic.SCK', 'esp.GPIO6', 'I²S reloj'],
                ['ds.SDA', 'esp.GPIO8', 'I²C SDA'], ['ds.SCL', 'esp.GPIO9', 'I²C SCL'], ['ds.VCC', 'esp.3V3_2'], ['ds.GND', 'mic.GND'],
                ['s.TRIG', 'esp.GPIO1', 'Disparo'], ['s.ECHO', 'd.IN', 'Eco a 5 V'], ['d.OUT', 'esp.GPIO2', 'Eco a 3,3 V'],
                ['d.GND', 'esp.GND_4'], ['s.GND', 'esp.GND_3'], ['s.VCC', 'esp.5V_1']
            ]
        }
    },
    {
        id: 'shelly-alumbrado', titulo: 'Alumbrado con Shelly 1PM Mini y pulsador inalámbrico ESP32-S3', ambito: 'Domótica y potencia', nivel: 'Intermedio', tiempo: '1 h',
        modelo: '—',
        resumen: 'Un circuito de alumbrado protegido por magnetotérmico y conmutado por el Shelly 1PM Mini. El interruptor de pared sigue funcionando y el ESP32-S3 añade un pulsador inalámbrico que llama a la API local del Shelly.',
        esp32: 'Lee el pulsador (GPIO4, con pull-up interno) y envía Switch.Toggle al Shelly por HTTP en la red local.',
        coral: 'No interviene. Puede añadirse para encender por presencia detectada en cámara.',
        material: [{ id: 'toma-230' }, { id: 'magnetotermico' }, { id: 'shelly-1pm-mini-g3' }, { id: 'interruptor-pared' }, { id: 'lampara' }, { id: 'router' }, { id: 'pc-host' }, { id: ESP }, { id: 'pulsador' }],
        pasos: [
            'Con el circuito sin tensión, cablea L y N al Shelly, la salida O a la lámpara y el interruptor entre fase y SW.',
            'Añade el Shelly a la Wi-Fi y anota su IP.',
            'Prueba la API: http://IP/rpc/Switch.Toggle?id=0.',
            'En el ESP32-S3, lanza esa petición al detectar el flanco del pulsador.'
        ],
        aprendizaje: [
            'La electrónica y los 230 V nunca comparten cable: el enlace entre ambos es la red Wi-Fi.',
            'El Shelly mide la potencia de la carga: Switch.GetStatus devuelve vatios y energía.'
        ],
        repos: [R.shelly, R.arduino, R.json, R.esphome, R.ha],
        docs: [doc('Shelly: componente Switch (RPC)', 'https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Switch'), doc('Manual Shelly 1PM Mini Gen3', 'https://kb.shelly.cloud/knowledge-base/shelly-1pm-mini-gen3')],
        montaje: {
            partes: [
                { k: 'x', tipo: 'toma-230', x: 2, y: 2 }, { k: 'q', tipo: 'magnetotermico', x: 16, y: 2 }, { k: 'e', tipo: 'lampara', x: 40, y: 2 },
                { k: 's', tipo: 'interruptor-pared', x: 6, y: 24 }, { k: 'sh', tipo: 'shelly-1pm-mini-g3', x: 26, y: 22 },
                { k: 'net', tipo: 'router', x: 52, y: 24 }, { k: 'pc', tipo: 'pc-host', x: 50, y: 40 },
                { k: 'sw', tipo: 'pulsador', x: 72, y: 12 }, { k: 'esp', tipo: ESP, x: 84, y: 6 }
            ],
            cables: [
                ['x.L', 'q.L_IN'], ['x.N', 'q.N_IN'], ['q.L_OUT', 'sh.L'], ['q.N_OUT', 'sh.N'],
                ['sh.O', 'e.L', 'Fase conmutada'], ['q.N_OUT', 'e.N'], ['q.L_OUT', 's.1'], ['s.2', 'sh.SW', 'Entrada SW'],
                ['sh.WIFI', 'net.P1', 'RPC HTTP'], ['esp.WIFI', 'net.P3', 'Wi-Fi'], ['pc.LAN', 'net.P2', 'LAN'],
                ['pc.USB2', 'esp.USB_UART', 'Alimentación y serie'], ['sw.2', 'esp.GPIO4', 'Pulsador'], ['sw.1', 'esp.GND_1']
            ]
        }
    },

    // ---- Catálogo de ideas híbridas ESP32-S3 + Coral -----------------
    {
        id: 'espejo-yoga', titulo: 'Espejo de corrección postural para yoga y fitness', ambito: 'Deporte y salud', nivel: 'Intermedio', modelo: 'MoveNet SinglePose Thunder',
        resumen: 'Superpone el esqueleto en tiempo real y avisa con luz ambiental cuando la postura se desalinea.',
        esp32: 'Captura y transmite el vídeo, y cambia el color de una tira LED según la alineación.',
        coral: 'MoveNet a 30 fps: 17 puntos articulares, ángulos de rodilla y espalda.',
        extra: [['Cámara OV2640 gran angular', 6], ['Tira WS2812B de 1 m', 4], ['Zumbador activo', 1]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'ws2812b' }, { id: 'fuente-5v' }, { id: 'conversor-nivel' }, { id: 'zumbador' }],
        repos: [R.pycoral, R.posenet, R.fastled], docs: [doc('Coral: estimación de pose', 'https://coral.ai/models/pose-estimation/')]
    },
    {
        id: 'traductor-signos', titulo: 'Traductor portátil de lengua de signos a voz', ambito: 'Accesibilidad', nivel: 'Avanzado', modelo: 'MediaPipe Hands + clasificador temporal',
        resumen: 'Reconoce gestos dinámicos de las manos, muestra la palabra y la pronuncia.',
        esp32: 'Envía el vídeo de las manos, muestra el subtítulo en la OLED y reproduce la voz por I²S.',
        coral: 'Puntos de la mano y clasificación del gesto con menos de 40 ms de latencia.',
        extra: [['Cámara OV2640', 5], ['OLED SSD1306 de 1,3"', 3.5], ['Amplificador MAX98357A y altavoz', 4.5]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'oled-ssd1306' }, { id: 'max98357a' }],
        repos: [R.mediapipe, R.pycoral, R.audiotools], docs: [doc('MediaPipe: gestos de la mano', 'https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer')]
    },
    {
        id: 'cazador-meteoros', titulo: 'Cazador de meteoros y seguimiento de satélites', ambito: 'Ciencia ciudadana', nivel: 'Avanzado', modelo: 'SSD MobileNet + filtro de trayectoria',
        resumen: 'Cámara de todo el cielo que distingue meteoros y pasos de la ISS de aviones y pájaros.',
        esp32: 'Mueve los motores paso a paso de la montura, lee la brújula y dispara la exposición.',
        coral: 'Clasifica las trazas del cielo nocturno en vivo.',
        extra: [['2 motores NEMA 17 con TMC2209', 16], ['Magnetómetro QMC5883L', 2.5], ['Cámara de alta sensibilidad', 9]],
        material: [{ id: PI }, { id: 'fuente-usbc' }, { id: 'coral-usb' }, { id: ESP }],
        repos: [R.pycoral, gh('teemuatlut/TMCStepper', 'Control de los TMC2209 por UART'), gh('waspinator/AccelStepper', 'Rampas de aceleración para motores paso a paso')], docs: []
    },
    {
        id: 'mesa-rol', titulo: 'Mesa de juegos de rol con efectos dinámicos', ambito: 'Juego y ocio', nivel: 'Intermedio', modelo: 'YOLOv8 nano cuantizado INT8',
        resumen: 'Una cámara cenital localiza las miniaturas y lee los dados; la mesa responde con luz y sonido.',
        esp32: 'Ilumina las casillas con una matriz LED y dispara efectos de sonido.',
        coral: 'Detecta cada miniatura y el resultado del dado de 20 caras.',
        extra: [['Cámara OV5640 con autofoco', 9], ['Matriz WS2812B 16×16', 11], ['DFPlayer Mini con altavoz', 3.5]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'ws2812b' }, { id: 'fuente-5v' }, { id: 'conversor-nivel' }, { id: 'pulsador' }],
        repos: [R.yolo, R.fastled, gh('DFRobot/DFRobotDFPlayerMini', 'Reproductor MP3 por UART')], docs: [doc('Ultralytics: exportar a Edge TPU', 'https://docs.ultralytics.com/integrations/edge-tpu/')]
    },
    {
        id: 'vigilancia-piscina', titulo: 'Vigilancia de piscina y prevención de ahogamientos', ambito: 'Seguridad familiar', nivel: 'Avanzado', modelo: 'PoseNet + detección de inmovilidad',
        resumen: 'Alerta si un niño o una mascota cae al agua fuera de horario o permanece inmóvil.',
        esp32: 'Vídeo continuo desde caja estanca, temperatura del agua y sirena estroboscópica.',
        coral: 'Detección de pose en superficie y bajo el agua.',
        extra: [['Cámara OV2640 con lente polarizada', 6.5], ['Sirena de 12 V con MOSFET', 8], ['Caja estanca IP65', 4.5]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'ds18b20' }, { id: 'resistencia' }, { id: 'rele-2ch' }],
        repos: [R.posenet, R.frigate, gh('milesburton/Arduino-Temperature-Control-Library', 'Sondas DS18B20')], docs: [],
        aviso: 'Es una ayuda, no un sistema de seguridad certificado: no sustituye a la vigilancia de un adulto.'
    },
    {
        id: 'sintetizador-gestos', titulo: 'Sintetizador aéreo y controlador MIDI por gestos', ambito: 'Música y arte', nivel: 'Intermedio', modelo: 'Puntos 3D de la mano',
        resumen: 'La posición de las manos en el aire modula notas, pitch-bend y filtros sin tocar nada.',
        esp32: 'Se presenta como dispositivo USB-MIDI por su puerto OTG y mide la altura con un láser ToF.',
        coral: 'Sigue a 60 fps la apertura y el giro de ambas manos.',
        extra: [['Cámara OV2640', 5], ['Sensor VL53L1X', 4], ['Conector DIN-5 y optoacoplador', 2]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'vl53l1x' }],
        repos: [R.mediapipe, R.arduino, gh('pololu/vl53l1x-arduino', 'Sensor de distancia láser')], docs: [doc('USB en arduino-esp32', 'https://docs.espressif.com/projects/arduino-esp32/en/latest/api/usb.html')]
    },
    {
        id: 'comedero-mascotas', titulo: 'Comedero selectivo con reconocimiento de mascotas', ambito: 'Mascotas', nivel: 'Intermedio', modelo: 'MobileNet v2 como extractor de rasgos',
        resumen: 'Abre la tapa solo al animal que corresponde y registra cuánto come y bebe cada uno.',
        esp32: 'Pesa la comida con una célula de carga y mueve los servos de las tapas.',
        coral: 'Distingue a cada gato o perro por la cara y el pelaje, sin collar RFID.',
        extra: [['Cámara OV2640', 5], ['Célula de carga de 1 kg con HX711', 3], ['2 servos MG996R', 7]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'sg90', cantidad: 2 }, { id: 'fuente-5v' }],
        repos: [R.pycoral, R.servo, gh('bogde/HX711', 'Amplificador de células de carga')], docs: [doc('Coral: reentrenar un clasificador', 'https://coral.ai/docs/edgetpu/retrain-classification-ondevice/')]
    },
    {
        id: 'navegacion-haptica', titulo: 'Asistente de navegación háptica', ambito: 'Accesibilidad', nivel: 'Avanzado', modelo: 'DeepLab v3+ de segmentación urbana',
        resumen: 'Un cinturón de motores vibradores indica hacia dónde esquivar los obstáculos de la acera.',
        esp32: 'Gobierna cinco motores de vibración y los avisos por auricular.',
        coral: 'Segmenta aceras, escalones, patinetes y semáforos desde una cámara pectoral.',
        extra: [['Cámara OV2640 con cable largo', 6], ['5 motores vibradores con PCA9685', 6.5], ['Sensor ultrasónico', 1.5]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'hc-sr04' }, { id: 'divisor-5v-3v3' }],
        repos: [R.pycoral, gh('adafruit/Adafruit-PWM-Servo-Driver-Library', 'Controlador PWM PCA9685')], docs: [doc('Coral: segmentación semántica', 'https://coral.ai/models/semantic-segmentation/')],
        aviso: 'Prototipo de investigación: no sustituye al bastón ni al perro guía.'
    },
    {
        id: 'monitor-cuna', titulo: 'Monitor de cuna sin contacto', ambito: 'Cuidado infantil', nivel: 'Avanzado', modelo: 'MoveNet + clasificador de audio',
        resumen: 'Vigila la postura del bebé con infrarrojos invisibles y avisa si se gira boca abajo o llora.',
        esp32: 'Ilumina con LED de 940 nm, mide la calidad del aire y enciende la luz nocturna.',
        coral: 'Analiza la postura y detecta si algo cubre la cara.',
        extra: [['Cámara OV2640 sin filtro IR', 6], ['Iluminador de 940 nm', 2.5], ['Sensor BME280', 3]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'bme280' }, { id: 'inmp441' }],
        repos: [R.posenet, R.pycoral, gh('adafruit/Adafruit_BME280_Library', 'Sensor ambiental')], docs: [],
        aviso: 'No es un producto sanitario: no sustituye a la supervisión de un adulto.'
    },
    {
        id: 'clasificador-residuos', titulo: 'Clasificador doméstico de residuos', ambito: 'Hogar sostenible', nivel: 'Intermedio', modelo: 'EfficientNet-EdgeTPU-S',
        resumen: 'Identifica el envase que le enseñas y levanta la tapa del cubo correcto.',
        esp32: 'Detecta la proximidad, muestra el icono del contenedor y mueve el servo de la tapa.',
        coral: 'Clasifica brik, lata, PET, cartón o vidrio en menos de 20 ms.',
        extra: [['Cámara OV2640', 5], ['3 servos MG996R', 10], ['Pantalla TFT SPI de 1,8"', 4]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'sg90', cantidad: 3 }, { id: 'pir-hcsr501' }, { id: 'fuente-5v' }],
        repos: [R.pycoral, R.servo, gh('Bodmer/TFT_eSPI', 'Pantallas TFT por SPI')], docs: [doc('Coral: clasificación de imágenes', 'https://coral.ai/models/image-classification/')]
    },
    {
        id: 'inventario-frigorifico', titulo: 'Inventario de frigorífico y recetas antidesperdicio', ambito: 'Cocina', nivel: 'Intermedio', modelo: 'SSD MobileNet v2',
        resumen: 'Se despierta al abrir la puerta, fotografía los estantes y actualiza la lista de la compra.',
        esp32: 'Sale del sueño profundo con un sensor Hall, fotografía y muestra las caducidades.',
        coral: 'Detecta los alimentos que entran y salen.',
        extra: [['Cámara OV2640 gran angular', 6], ['Sensor Hall KY-003', 1], ['Pantalla e-Paper de 2,9"', 9]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'pulsador' }, { id: 'oled-ssd1306' }],
        repos: [R.camara, R.testdata, gh('ZinggJM/GxEPD2', 'Pantallas de tinta electrónica')], docs: [doc('Modos de bajo consumo del ESP32-S3', 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html')]
    },
    {
        id: 'observatorio-aves', titulo: 'Observatorio de aves de balcón', ambito: 'Naturaleza', nivel: 'Intermedio', modelo: 'iNaturalist Birds (Edge TPU)',
        resumen: 'Fototrampeo con panel solar que identifica la especie de cada visitante y la guarda en un álbum.',
        esp32: 'Detecta el posado, dispara una ráfaga y mide el nivel de semillas.',
        coral: 'Clasifica entre más de 900 especies con el modelo de iNaturalist.',
        extra: [['Cámara OV5640 de 5 MP', 9], ['Panel solar de 5 V con cargador LiPo', 5], ['Sensor PIR o barrera IR', 1.5]],
        material: [{ id: PI }, { id: 'fuente-usbc' }, { id: 'coral-usb' }, { id: ESP }, { id: 'pir-hcsr501' }],
        repos: [R.pycoral, R.testdata, R.frigate, gh('mmcc-xx/WhosAtMyFeeder', 'Identificación de aves sobre Frigate')], docs: [doc('Coral: clasificación de imágenes', 'https://coral.ai/models/image-classification/')]
    },
    {
        id: 'acuario', titulo: 'Acuario inteligente y detección temprana de enfermedades', ambito: 'Acuariofilia', nivel: 'Avanzado', modelo: 'Seguimiento multiobjeto + CNN',
        resumen: 'Control térmico y de luz con vigilancia del patrón de nado para detectar letargo o punto blanco.',
        esp32: 'Mide la temperatura, regula el ciclo de luz y acciona las bombas de abono.',
        coral: 'Sigue a los peces y detecta nado anómalo o manchas.',
        extra: [['Cámara OV2640', 5], ['Sonda DS18B20 sumergible', 2], ['Bomba peristáltica de 12 V con relé', 6.5]],
        material: [{ id: 'pc-host' }, { id: 'coral-usb' }, { id: ESP }, { id: 'ds18b20' }, { id: 'resistencia' }, { id: 'rele-2ch' }],
        repos: [R.yolo, R.pycoral, gh('milesburton/Arduino-Temperature-Control-Library', 'Sondas DS18B20')], docs: []
    },

    // ---- Ideas con microcontrolador y pequeños circuitos (sin Coral) ---
    {
        id: 'monitor-pc', titulo: 'Monitor de telemetría del PC en una OLED', ambito: 'Escritorio y utilidades', nivel: 'Inicial', modelo: 'Sin modelo de IA',
        resumen: 'Muestra uso de CPU, memoria, temperatura y red del ordenador en una pantalla pequeña, con botones para cambiar de página.',
        esp32: 'Recibe los datos por el puerto serie USB, los dibuja en la OLED y lee dos pulsadores para navegar.',
        material: [{ id: 'pc-host' }, { id: ESP }, { id: 'oled-ssd1306' }, { id: 'pulsador', cantidad: 2 }],
        repos: [gh('pepeangell5/ESP32_PC_MONITOR', 'Telemetría del PC en una OLED SSD1306 con botones'), R.ssd1306, R.json], docs: []
    },
    {
        id: 'mando-ir', titulo: 'Mando universal: captura y repite infrarrojos', ambito: 'Domótica y potencia', nivel: 'Inicial', modelo: 'Sin modelo de IA',
        resumen: 'Aprende los códigos de tus mandos y los reenvía desde el móvil o por MQTT para encender la tele o el aire acondicionado.',
        esp32: 'Captura la trama con el receptor de 38 kHz, la guarda y la emite con el LED infrarrojo usando el periférico RMT.',
        material: [{ id: 'pc-host' }, { id: ESP }, { id: 'ir-receptor' }, { id: 'ir-emisor' }, { id: 'oled-ssd1306' }, { id: 'pulsador' }],
        repos: [gh('crankyoldgit/IRremoteESP8266', 'Captura y envío de infrarrojos con cientos de protocolos'), gh('pepeangell5/IR_REMOTE_CARDPUTER_ADV', 'Captura y transmisión de señales IR'), R.mqtt], docs: []
    },
    {
        id: 'chat-nrf24', titulo: 'Mensajería punto a punto con nRF24L01+', ambito: 'Radio y comunicaciones', nivel: 'Intermedio', modelo: 'Sin modelo de IA',
        resumen: 'Dos placas se envían mensajes por radio de 2,4 GHz sin Wi-Fi, router ni cobertura.',
        esp32: 'Gestiona el transceptor por SPI, confirma la entrega de cada paquete y muestra los mensajes en la OLED.',
        material: [{ id: 'pc-host' }, { id: ESP, cantidad: 2 }, { id: 'nrf24l01', cantidad: 2 }, { id: 'oled-ssd1306', cantidad: 2 }, { id: 'pulsador', cantidad: 2 }],
        repos: [gh('pepeangell5/ESP32_DUAL_NRF_CHAT', 'Mensajes entre dos ESP32 con módulos nRF24'), gh('nRF24/RF24', 'Controlador del nRF24L01+')], docs: []
    },
    {
        id: 'coche-robot', titulo: 'Coche robot de dos ruedas que esquiva obstáculos', ambito: 'Robótica móvil', nivel: 'Inicial', tiempo: '2 h', modelo: 'Sin modelo de IA',
        resumen: 'Chasis de dos motores con ultrasonidos sobre un servo: avanza, mira a los lados y elige el camino libre. Admite mando IR o desde el móvil.',
        esp32: 'Regula los dos motores por PWM a través del puente en H, orienta el sensor con el servo y decide el giro.',
        aviso: 'Los motores van con sus pilas y la lógica con una batería externa de 5 V (aquí, la fuente de 5 V). Une las masas.',
        extra: [['Chasis 2WD con rueda loca', 11.95]],
        material: [{ id: ESP }, { id: 'fuente-5v' }, { id: 'l298n' }, { id: 'motor-tt', cantidad: 2 }, { id: 'portapilas-4aa' }, { id: 'hc-sr04' }, { id: 'divisor-5v-3v3' }, { id: 'sg90' }, { id: 'ir-receptor' }],
        pasos: [
            'Prueba cada motor por separado: IN1/IN2 fijan el sentido y el PWM en ENA la velocidad.',
            'Mide la distancia con el HC-SR04 y para el coche a menos de 20 cm.',
            'Gira el servo a izquierda y derecha, compara las dos distancias y elige el lado libre.',
            'Añade el receptor IR para conducirlo con un mando y alternar entre modo manual y automático.'
        ],
        aprendizaje: [
            'Los motores van con sus pilas y la lógica con sus 5 V: solo se unen las masas.',
            'Un GPIO no mueve un motor: da la orden al puente en H, que es quien entrega la corriente.',
            'El ECHO del HC-SR04 sale a 5 V y pasa por el divisor antes del GPIO.'
        ],
        montaje: {
            partes: [
                { k: 'm1', tipo: 'motor-tt', x: 6, y: 4 }, { k: 'm2', tipo: 'motor-tt', x: 6, y: 14 }, { k: 'bt', tipo: 'portapilas-4aa', x: 6, y: 24 },
                { k: 'drv', tipo: 'l298n', x: 22, y: 6 }, { k: 'ps', tipo: 'fuente-5v', x: 22, y: 24 }, { k: 'esp', tipo: ESP, x: 42, y: 4 },
                { k: 's', tipo: 'hc-sr04', x: 62, y: 4 }, { k: 'd', tipo: 'divisor-5v-3v3', x: 62, y: 16 }, { k: 'ir', tipo: 'ir-receptor', x: 72, y: 15 }, { k: 'sv', tipo: 'sg90', x: 64, y: 25 }
            ],
            cables: [
                ['bt.V', 'drv.VM', 'Pilas a motores'], ['bt.GND', 'drv.GND'], ['drv.GND', 'esp.GND_1', 'Masa común'],
                ['drv.OUT1', 'm1.A'], ['drv.OUT2', 'm1.B'], ['drv.OUT3', 'm2.A'], ['drv.OUT4', 'm2.B'],
                ['esp.GPIO4', 'drv.ENA', 'PWM izquierdo'], ['esp.GPIO5', 'drv.IN1'], ['esp.GPIO6', 'drv.IN2'],
                ['esp.GPIO7', 'drv.IN3'], ['esp.GPIO15', 'drv.IN4'], ['esp.GPIO16', 'drv.ENB', 'PWM derecho'],
                ['ps.V', 'esp.5V_1', '5 V de la lógica'], ['ps.GND', 'esp.GND_1'],
                ['s.VCC', 'ps.V'], ['s.GND', 'esp.GND_2'], ['s.TRIG', 'esp.GPIO1', 'Disparo'], ['s.ECHO', 'd.IN', 'Eco a 5 V'], ['d.OUT', 'esp.GPIO2', 'Eco a 3,3 V'], ['d.GND', 'esp.GND_3'],
                ['ir.VCC', 'esp.3V3_1'], ['ir.GND', 'esp.GND_4'], ['ir.OUT', 'esp.GPIO42', 'Mando IR'],
                ['sv.VCC', 'ps.V'], ['sv.GND', 'esp.GND_4'], ['sv.PWM', 'esp.GPIO41', 'Servo']
            ]
        },
        repos: [gh('pepeangell5/SMART-CAR-QD001', 'Ejemplos para coche robot: motores, servo, ultrasonidos, IR y ESP-NOW'), R.servo], docs: []
    },
    {
        id: 'mando-espnow', titulo: 'Emisora ESP-NOW para dron o coche', ambito: 'Robótica móvil', nivel: 'Intermedio', modelo: 'Sin modelo de IA',
        resumen: 'Mando de dos joysticks que envía las órdenes por ESP-NOW con muy poca latencia a un receptor con ESP32-C3 SuperMini (su montaje está en «Receptor ESP-NOW para coche robot»).',
        esp32: 'Lee los cuatro ejes con el ADC y los transmite por ESP-NOW; en el vehículo, fusiona el giroscopio y mezcla las órdenes de los motores.',
        aviso: 'Un dron con hélices corta: pruébalo primero sin ellas y vuela en interior o en zonas permitidas.',
        extra: [['4 motores sin núcleo 8520 con hélices', 9], ['Batería LiPo 1S de 600 mAh', 6]],
        material: [{ id: 'pc-host' }, { id: ESP }, { id: 'joystick', cantidad: 2 }, { id: 'mpu6050' }, { id: 'oled-ssd1306' }, { id: C3 }],
        repos: [gh('pepeangell5/DRONE-FPV-ESP32C3-SUPERMINI', 'Dron casero controlado por ESP-NOW'), gh('electroniccats/mpu6050', 'MPU6050 con fusión por DMP'), R.idf], docs: [doc('ESP-NOW (Espressif)', 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/network/esp_now.html')]
    },
    {
        id: 'analizador-wifi', titulo: 'Analizador de ocupación Wi-Fi de 2,4 GHz', ambito: 'Radio y comunicaciones', nivel: 'Inicial', modelo: 'Sin modelo de IA',
        resumen: 'Escanea las redes visibles y dibuja la ocupación de cada canal para elegir el menos saturado para tu router.',
        esp32: 'Hace un escaneo pasivo, ordena las redes por canal y potencia, y pinta el gráfico en la pantalla TFT.',
        material: [{ id: 'pc-host' }, { id: ESP }, { id: 'tft-st7789' }, { id: 'pulsador', cantidad: 2 }],
        repos: [gh('pepeangell5/ESP32-TOOLS', 'Analizador de redes Wi-Fi en 2,4 GHz'), gh('Bodmer/TFT_eSPI', 'Gráficos rápidos en pantallas TFT'), R.arduino], docs: []
    },
    {
        id: 'teclado-macros', titulo: 'Teclado de macros USB y Bluetooth', ambito: 'Escritorio y utilidades', nivel: 'Inicial', modelo: 'Sin modelo de IA',
        resumen: 'Botonera que el ordenador o el móvil ven como un teclado: lanza atajos, texto o control multimedia en tus propios equipos.',
        esp32: 'Se presenta como teclado HID por su USB nativo (GPIO19/20) o por BLE y envía la combinación asignada a cada pulsador.',
        material: [{ id: 'pc-host' }, { id: ESP }, { id: 'pulsador', cantidad: 4 }, { id: 'oled-ssd1306' }],
        repos: [gh('pepeangell5/IPHONE-CONTROL-ESP32', 'Control por HID USB y Bluetooth con ESP32-S3'), gh('T-vK/ESP32-BLE-Keyboard', 'Teclado Bluetooth LE'), R.arduino], docs: []
    },
    {
        id: 'receptor-433', titulo: 'Receptor de sensores de 433 MHz', ambito: 'Radio y comunicaciones', nivel: 'Intermedio', modelo: 'Sin modelo de IA',
        resumen: 'Escucha las estaciones meteorológicas y sensores de 433 MHz de casa y publica sus lecturas por MQTT.',
        esp32: 'Configura el CC1101 por SPI, decodifica las tramas recibidas y las envía a Home Assistant.',
        aviso: 'Limítate a recibir y a tus propios dispositivos: emitir en 433 MHz está regulado.',
        material: [{ id: 'pc-host' }, { id: ESP }, { id: 'cc1101' }, { id: 'oled-ssd1306' }, { id: 'router' }],
        repos: [gh('LSatan/SmartRC-CC1101-Driver-Lib', 'Controlador del CC1101 para Arduino y ESP32'), gh('merbanan/rtl_433', 'Referencia de protocolos de sensores de 433 MHz'), R.mqtt], docs: []
    },
    {
        id: 'brazo-robot', titulo: 'Brazo robótico de cuatro ejes con joystick', ambito: 'Robótica móvil', nivel: 'Intermedio', modelo: 'Sin modelo de IA',
        resumen: 'Brazo de servos metálicos que se mueve con dos joysticks y repite secuencias grabadas.',
        esp32: 'Lee los joysticks, suaviza el movimiento y manda las posiciones al PCA9685 por I²C.',
        aviso: 'Los servos se alimentan por V+ con su propia fuente. Dos MG996R (base y hombro) y dos SG90 (codo y pinza) caben en 3 A; con cuatro MG996R usa una fuente de 5 – 6 V de al menos 5 A.',
        extra: [['Estructura de brazo de 4 ejes', 18]],
        material: [{ id: 'pc-host' }, { id: ESP }, { id: 'pca9685' }, { id: 'mg996r', cantidad: 2 }, { id: 'sg90', cantidad: 2 }, { id: 'joystick', cantidad: 2 }, { id: 'fuente-5v' }],
        repos: [gh('adafruit/Adafruit-PWM-Servo-Driver-Library', 'Controlador del PCA9685'), R.servo], docs: [doc('Controladores de servos (RobotShop)', 'https://eu.robotshop.com/collections/servo-controllers')]
    },
    {
        id: 'robot-lidar', titulo: 'Robot que cartografía la casa con LiDAR', ambito: 'Robótica móvil', nivel: 'Avanzado', modelo: 'SLAM 2D (slam_toolbox)',
        resumen: 'Plataforma móvil que levanta el plano de una planta con un escáner láser y navega sola por él.',
        esp32: 'Controla los motores y la odometría, y recibe las órdenes de velocidad de la Raspberry Pi por el puerto serie.',
        coral: 'Opcional: detección de personas u objetos con la cámara para esquivarlos o seguirlos.',
        extra: [['Chasis 2WD con rueda loca', 11.95], ['Batería externa USB de 10 000 mAh', 18]],
        material: [{ id: PI }, { id: 'fuente-usbc' }, { id: 'rplidar-a1' }, { id: ESP }, { id: 'l298n' }, { id: 'motor-tt', cantidad: 2 }, { id: 'portapilas-4aa' }, { id: 'mpu6050' }],
        repos: [gh('Slamtec/rplidar_ros', 'Nodo ROS del RPLIDAR'), gh('SteveMacenski/slam_toolbox', 'SLAM 2D para ROS 2'), gh('micro-ROS/micro_ros_arduino', 'ROS 2 en el microcontrolador')], docs: [doc('RPLIDAR A1 (Slamtec)', 'https://www.slamtec.com/en/Lidar/A1')]
    },
    // ---- Pantalla táctil ESP32-2432S028R («CYD») ------------------------
    {
        id: 'cyd-meteo', placa: CYD_NOMBRE, titulo: 'Estación meteorológica con pantalla táctil', ambito: 'Pantalla táctil CYD', nivel: 'Inicial', tiempo: '1 h 30 min', modelo: 'Sin modelo de IA',
        resumen: 'Temperatura, humedad y presión con gráficas de las últimas horas en la pantalla de 2,8", brillo automático por la LDR y publicación por MQTT para Home Assistant.',
        esp32: 'Lee el BME280 por I²C en el conector CN1 (SDA = GPIO27, SCL = GPIO22), dibuja la interfaz con TFT_eSPI y ajusta la retroiluminación según la LDR (GPIO34).',
        material: [{ id: CYD }, { id: 'bme280' }, { id: 'fuente-5v' }, { id: 'router' }],
        pasos: [
            'Carga un ejemplo de la CYD con TFT_eSPI y comprueba la pantalla y el táctil (usa el platformio.ini del panel Código).',
            'Conecta el BME280 a CN1: 3V3, GND, GPIO27 como SDA y GPIO22 como SCL, e inicia Wire.begin(27, 22).',
            'Guarda una lectura por minuto en un búfer circular y dibuja la gráfica de 24 h.',
            'Publica las lecturas por MQTT y regula el brillo con analogRead(34).'
        ],
        aprendizaje: [
            'En la CYD casi todos los GPIO están ocupados: CN1 es el sitio cómodo para un bus I²C.',
            'El BME280 es de 3,3 V: aliméntalo desde el pin 3V3 de CN1, no desde VIN.'
        ],
        repos: [R.cyd, R.tftespi, R.lvgl, gh('adafruit/Adafruit_BME280_Library', 'Sensor ambiental'), R.mqtt], docs: [doc('LVGL: documentación', 'https://docs.lvgl.io/')],
        montaje: {
            partes: [{ k: 'net', tipo: 'router', x: 0, y: 2 }, { k: 'u', tipo: CYD, x: 18, y: 2 }, { k: 'ps', tipo: 'fuente-5v', x: 4, y: 24 }, { k: 's', tipo: 'bme280', x: 36, y: 26 }],
            cables: [
                ['u.WIFI', 'net.P1', 'MQTT'], ['ps.V', 'u.VIN', '5 V'], ['ps.GND', 'u.GND_1'],
                ['u.GPIO27', 's.SDA', 'I²C SDA'], ['u.GPIO22', 's.SCL', 'I²C SCL'], ['u.3V3', 's.VIN'], ['u.GND_3', 's.GND']
            ]
        }
    },
    {
        id: 'cyd-shelly', placa: CYD_NOMBRE, titulo: 'Panel táctil de pared para el alumbrado con Shelly', ambito: 'Pantalla táctil CYD', nivel: 'Intermedio', tiempo: '2 h', modelo: 'Sin modelo de IA',
        resumen: 'Un mando de pared con pantalla: enciende y apaga la luz del Shelly 1PM Mini y muestra los vatios que consume y la energía del día.',
        esp32: 'Dibuja el botón y la potencia, llama a Switch.Toggle y Switch.GetStatus por HTTP en la red local y nunca toca los 230 V.',
        aviso: 'El lado de 230 V se instala sin tensión y dentro de una caja. La pantalla solo se une al Shelly por Wi-Fi.',
        material: [{ id: 'toma-230' }, { id: 'magnetotermico' }, { id: 'shelly-1pm-mini-g3' }, { id: 'interruptor-pared' }, { id: 'lampara' }, { id: 'router' }, { id: CYD }, { id: 'fuente-5v' }],
        pasos: [
            'Cablea el circuito del Shelly como en el proyecto de alumbrado y anota su IP.',
            'En la CYD, conéctate a la Wi-Fi y prueba http://IP/rpc/Switch.GetStatus?id=0.',
            'Dibuja un interruptor grande y la potencia (apower) en vatios; refréscala cada segundo.',
            'Al tocar el botón, lanza Switch.Toggle y pinta el nuevo estado.'
        ],
        aprendizaje: [
            'Separar mando y potencia por la red evita llevar 230 V a la electrónica.',
            'El Shelly devuelve en JSON la tensión, la corriente, la potencia y la energía acumulada.'
        ],
        repos: [R.cyd, R.lvgl, R.json, R.shelly], docs: [doc('Shelly: componente Switch (RPC)', 'https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Switch')],
        montaje: {
            partes: [
                { k: 'x', tipo: 'toma-230', x: 2, y: 2 }, { k: 'q', tipo: 'magnetotermico', x: 16, y: 2 }, { k: 'e', tipo: 'lampara', x: 40, y: 2 },
                { k: 's', tipo: 'interruptor-pared', x: 6, y: 24 }, { k: 'sh', tipo: 'shelly-1pm-mini-g3', x: 26, y: 22 },
                { k: 'net', tipo: 'router', x: 50, y: 24 }, { k: 'u', tipo: CYD, x: 70, y: 4 }, { k: 'ps', tipo: 'fuente-5v', x: 76, y: 30 }
            ],
            cables: [
                ['x.L', 'q.L_IN'], ['x.N', 'q.N_IN'], ['q.L_OUT', 'sh.L'], ['q.N_OUT', 'sh.N'],
                ['sh.O', 'e.L', 'Fase conmutada'], ['q.N_OUT', 'e.N'], ['q.L_OUT', 's.1'], ['s.2', 'sh.SW', 'Entrada SW'],
                ['sh.WIFI', 'net.P1', 'RPC HTTP'], ['u.WIFI', 'net.P3', 'Wi-Fi'], ['ps.V', 'u.VIN', '5 V'], ['ps.GND', 'u.GND_1']
            ]
        }
    },
    {
        id: 'cyd-monitor-pc', placa: CYD_NOMBRE, titulo: 'Monitor del PC a color con aviso de temperatura', ambito: 'Pantalla táctil CYD', nivel: 'Inicial', tiempo: '1 h', modelo: 'Sin modelo de IA',
        resumen: 'Uso de CPU, memoria y red del ordenador en gráficas de colores, páginas que se cambian tocando la pantalla y un pitido si la CPU se calienta.',
        esp32: 'Recibe la telemetría en JSON por el puerto serie del micro-USB, la pinta con TFT_eSPI y activa el zumbador (GPIO22) por encima del umbral.',
        material: [{ id: 'pc-host' }, { id: CYD }, { id: 'zumbador' }],
        pasos: [
            'En el PC, un script de Python con psutil envía una línea JSON por segundo al puerto serie.',
            'La CYD la decodifica con ArduinoJson y actualiza las barras y la gráfica.',
            'Toca la pantalla para pasar de página (CPU, memoria, red).',
            'Ajusta el umbral de temperatura que hace sonar el zumbador.'
        ],
        aprendizaje: ['El micro-USB de la CYD da a la vez alimentación y el puerto serie del CH340.', 'El zumbador activo solo necesita un nivel alto: no hace falta generar el tono.'],
        repos: [R.cyd, R.tftespi, R.json, gh('pepeangell5/ESP32_PC_MONITOR', 'Telemetría del PC en una pantalla')], docs: [],
        montaje: {
            partes: [{ k: 'u', tipo: CYD, x: 2, y: 2 }, { k: 'pc', tipo: 'pc-host', x: 44, y: 2, rot: 2 }, { k: 'z', tipo: 'zumbador', x: 20, y: 26 }],
            cables: [['pc.USB2', 'u.USB', 'Serie: telemetría'], ['u.3V3', 'z.VCC'], ['u.GPIO22', 'z.IO', 'Aviso'], ['u.GND_3', 'z.GND']]
        }
    },
    {
        id: 'cyd-mando-ir', placa: CYD_NOMBRE, titulo: 'Mando universal infrarrojo con pantalla táctil', ambito: 'Pantalla táctil CYD', nivel: 'Intermedio', tiempo: '2 h', modelo: 'Sin modelo de IA',
        resumen: 'Aprende los códigos de los mandos de casa y los repite con botones dibujados en la pantalla, agrupados por aparato.',
        esp32: 'Captura las tramas con el receptor en GPIO35 (solo entrada), las guarda en la flash (NVS) y las emite con el LED infrarrojo en GPIO22.',
        material: [{ id: CYD }, { id: 'ir-receptor' }, { id: 'ir-emisor' }, { id: 'fuente-5v' }],
        pasos: [
            'Apunta un mando al receptor y vuelca los códigos con el ejemplo IRrecvDumpV2.',
            'Guarda cada código en la flash con Preferences, por aparato y botón.',
            'Crea una página de botones por aparato y emite el código al tocar cada uno.',
            'Alimenta el emisor a 5 V para ganar alcance: la señal de 3,3 V del GPIO basta para su transistor.'
        ],
        aprendizaje: ['GPIO35 no tiene salida ni pull-up: sirve para el receptor, que ya entrega la señal limpia.', 'Preferences guarda los códigos en la NVS de la flash: sobreviven a apagar y a reprogramar. La microSD usaría el mismo periférico VSPI que el táctil en este ejemplo.'],
        repos: [R.cyd, gh('crankyoldgit/IRremoteESP8266', 'Captura y envío de infrarrojos'), R.lvgl], docs: [],
        montaje: {
            partes: [{ k: 'u', tipo: CYD, x: 2, y: 2 }, { k: 'ps', tipo: 'fuente-5v', x: 2, y: 26 }, { k: 'r', tipo: 'ir-receptor', x: 14, y: 26 }, { k: 't', tipo: 'ir-emisor', x: 22, y: 26 }],
            cables: [
                ['ps.V', 'u.VIN', '5 V'], ['ps.GND', 'u.GND_1'],
                ['r.OUT', 'u.GPIO35', 'IR recibido'], ['r.VCC', 'u.3V3'], ['r.GND', 'u.GND_2'],
                ['t.DAT', 'u.GPIO22', 'IR emitido (RMT)'], ['t.VCC', 'ps.V', '5 V del emisor'], ['t.GND', 'u.GND_3']
            ]
        }
    },
    {
        id: 'cyd-termostato', placa: CYD_NOMBRE, titulo: 'Termostato táctil programable para la caldera', ambito: 'Pantalla táctil CYD', nivel: 'Intermedio', tiempo: '2 h', modelo: 'Sin modelo de IA',
        resumen: 'Mide la temperatura, deja fijar la consigna y el horario desde la pantalla y cierra el contacto del relé que pide calor a la caldera.',
        esp32: 'Lee la sonda DS18B20 por 1-Wire en GPIO27, aplica una histéresis de medio grado y conmuta el relé con GPIO22.',
        aviso: 'Usa el contacto del relé en la entrada de termostato de la caldera, que es un contacto libre de tensión. Si tu caldera lleva el termostato a 230 V, el relé y su cableado van dentro de una caja y se montan sin tensión.',
        material: [{ id: CYD }, { id: 'ds18b20' }, { id: 'resistencia' }, { id: 'rele-2ch' }, { id: 'fuente-5v' }],
        pasos: [
            'Monta la sonda con la resistencia de 4,7 kΩ entre DQ y 3V3 y comprueba la lectura.',
            'Dibuja la temperatura, la consigna con botones + y − y el estado de la caldera.',
            'Cierra el relé por debajo de la consigna − 0,5 °C y ábrelo por encima de la consigna + 0,5 °C.',
            'Añade el horario semanal y guárdalo en la flash con Preferences.'
        ],
        aprendizaje: ['La histéresis evita que el relé conmute sin parar alrededor de la consigna.', 'Las entradas del relé son activas a nivel bajo: un 0 en GPIO22 cierra el contacto.'],
        repos: [R.cyd, gh('milesburton/Arduino-Temperature-Control-Library', 'Sondas DS18B20'), R.lvgl], docs: [],
        montaje: {
            partes: [
                { k: 'ps', tipo: 'fuente-5v', x: 2, y: 4 }, { k: 'u', tipo: CYD, x: 16, y: 2 }, { k: 't', tipo: 'ds18b20', x: 30, y: 26 },
                { k: 'r', tipo: 'resistencia', x: 38, y: 27, valor: '4,7 kΩ' }, { k: 'k', tipo: 'rele-2ch', x: 56, y: 4 }
            ],
            cables: [
                ['ps.V', 'u.VIN', '5 V'], ['ps.GND', 'u.GND_1'],
                ['t.DQ', 'u.GPIO27', '1-Wire'], ['r.1', 't.DQ'], ['r.2', 'u.3V3', 'Pull-up 4,7 kΩ'], ['t.VDD', 'u.3V3'], ['t.GND', 'u.GND_3'],
                ['k.IN1', 'u.GPIO22', 'Pide calor'], ['k.VCC', 'u.VIN'], ['k.GND', 'u.GND_2']
            ]
        }
    },
    {
        id: 'cyd-servos', placa: CYD_NOMBRE, titulo: 'Consola táctil para un brazo de cuatro servos', ambito: 'Pantalla táctil CYD', nivel: 'Intermedio', tiempo: '2 h 30 min', modelo: 'Sin modelo de IA',
        resumen: 'Cuatro deslizadores en pantalla mueven los servos del brazo, y un botón graba y reproduce secuencias de movimientos.',
        esp32: 'Manda las posiciones al PCA9685 por I²C en CN1 (SDA = GPIO27, SCL = GPIO22) y suaviza el movimiento entre posiciones.',
        aviso: 'Los servos toman la corriente de la fuente por V+ del PCA9685, nunca de la placa. Dos MG996R y dos SG90 caben en 3 A; con cuatro MG996R hace falta una fuente de 5 A.',
        extra: [['Estructura de brazo de 4 ejes', 18]],
        material: [{ id: CYD }, { id: 'pca9685' }, { id: 'mg996r', cantidad: 2 }, { id: 'sg90', cantidad: 2 }, { id: 'fuente-5v' }],
        pasos: [
            'Busca el PCA9685 con un escáner I²C tras Wire.begin(27, 22): debe aparecer en 0x40.',
            'Calibra el pulso mínimo y máximo de cada servo con setPWM.',
            'Dibuja un deslizador por articulación y mueve el servo al soltarlo.',
            'Graba la secuencia de posiciones y reprodúcela con rampas.'
        ],
        aprendizaje: ['El PCA9685 genera los 50 Hz de los servos por hardware y solo ocupa dos pines.', 'Con fuente aparte hay que unir su GND con el de la placa.'],
        repos: [R.cyd, gh('adafruit/Adafruit-PWM-Servo-Driver-Library', 'Controlador del PCA9685'), R.lvgl], docs: [],
        montaje: {
            partes: [
                { k: 'u', tipo: CYD, x: 2, y: 2 }, { k: 'pca', tipo: 'pca9685', x: 14, y: 26, rot: 2 }, { k: 'ps', tipo: 'fuente-5v', x: 40, y: 26 },
                { k: 'm1', tipo: 'mg996r', x: 2, y: 38 }, { k: 'm2', tipo: 'mg996r', x: 12, y: 38 }, { k: 'm3', tipo: 'sg90', x: 22, y: 38 }, { k: 'm4', tipo: 'sg90', x: 22, y: 46 }
            ],
            cables: [
                ['ps.V', 'u.VIN', '5 V'], ['ps.GND', 'u.GND_1'],
                ['u.GPIO27', 'pca.SDA', 'I²C SDA'], ['u.GPIO22', 'pca.SCL', 'I²C SCL'], ['u.3V3', 'pca.VCC'], ['u.GND_3', 'pca.GND'], ['ps.V', 'pca.VP', 'V+ servos'],
                ['pca.PWM0', 'm1.PWM', 'Base'], ['pca.PWM1', 'm2.PWM', 'Hombro'], ['pca.PWM2', 'm3.PWM', 'Codo'], ['pca.PWM3', 'm4.PWM', 'Pinza'],
                ['m1.VCC', 'pca.VP'], ['m2.VCC', 'pca.VP'], ['m3.VCC', 'pca.VP'], ['m4.VCC', 'pca.VP'],
                ['m1.GND', 'ps.GND'], ['m2.GND', 'ps.GND'], ['m3.GND', 'ps.GND'], ['m4.GND', 'ps.GND']
            ]
        }
    }
,
    // ---- Placas pequeñas: ESP32-C3 SuperMini y M5StampS3 -----------------
    {
        id: 'c3-coche-espnow', placa: 'ESP32-C3 SuperMini', titulo: 'Receptor ESP-NOW para coche robot con ESP32-C3', ambito: 'Robótica móvil', nivel: 'Intermedio', tiempo: '2 h', modelo: 'Sin modelo de IA',
        resumen: 'El vehículo de la emisora ESP-NOW: una SuperMini de 22 mm recibe las órdenes de los joysticks, mueve los dos motores y corrige el rumbo con la unidad inercial.',
        esp32: 'Recibe los paquetes ESP-NOW, regula los motores por PWM a través del L298N (GPIO0, 1, 3, 4, 5 y 10) y lee el giroscopio por I²C en GPIO8/9.',
        aviso: 'Los motores van con sus pilas y la lógica con una batería USB de 5 V (aquí, la fuente de 5 V). Une las masas. No lleves GPIO2, 8 ni 9 a GND en el arranque.',
        extra: [['Chasis 2WD con rueda loca', 11.95]],
        material: [{ id: C3 }, { id: 'l298n' }, { id: 'motor-tt', cantidad: 2 }, { id: 'portapilas-4aa' }, { id: 'fuente-5v' }, { id: 'mpu6050' }],
        pasos: [
            'Empareja la SuperMini con la emisora: imprime su MAC con WiFi.macAddress() y ponla en el emisor.',
            'Prueba cada motor: IN1/IN2 fijan el sentido y el PWM en ENA la velocidad.',
            'Mezcla gas y dirección en las velocidades de cada rueda.',
            'Corrige la deriva con el giro del MPU6050 y para los motores si deja de llegar la señal.'
        ],
        aprendizaje: [
            'ESP-NOW no necesita router: dos placas se hablan directamente con latencias de pocos milisegundos.',
            'Los módulos I²C con pull-up mantienen altos GPIO8 y GPIO9, justo lo que piden para arrancar.'
        ],
        repos: [gh('pepeangell5/SMART-CAR-QD001', 'Ejemplos para coche robot con ESP-NOW'), gh('pepeangell5/DRONE-FPV-ESP32C3-SUPERMINI', 'Dron casero con ESP32-C3 SuperMini y ESP-NOW'), gh('electroniccats/mpu6050', 'MPU6050 con fusión por DMP')],
        docs: [doc('ESP-NOW (Espressif)', 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/network/esp_now.html')],
        montaje: {
            partes: [
                { k: 'imu', tipo: 'mpu6050', x: 2, y: 4 }, { k: 'u', tipo: C3, x: 14, y: 4 }, { k: 'ps', tipo: 'fuente-5v', x: 14, y: 18 }, { k: 'drv', tipo: 'l298n', x: 26, y: 4 },
                { k: 'm1', tipo: 'motor-tt', x: 42, y: 2 }, { k: 'm2', tipo: 'motor-tt', x: 42, y: 9 }, { k: 'bt', tipo: 'portapilas-4aa', x: 42, y: 17 }
            ],
            cables: [
                ['bt.V', 'drv.VM', 'Pilas a motores'], ['bt.GND', 'drv.GND'], ['drv.GND', 'u.GND', 'Masa común'],
                ['drv.OUT1', 'm1.A'], ['drv.OUT2', 'm1.B'], ['drv.OUT3', 'm2.A'], ['drv.OUT4', 'm2.B'],
                ['u.GPIO0', 'drv.ENA', 'PWM izquierdo'], ['u.GPIO1', 'drv.IN1'], ['u.GPIO3', 'drv.IN2'], ['u.GPIO4', 'drv.IN3'], ['u.GPIO5', 'drv.IN4'], ['u.GPIO10', 'drv.ENB', 'PWM derecho'],
                ['ps.V', 'u.5V', 'Batería USB 5 V'], ['ps.GND', 'u.GND'],
                ['imu.SDA', 'u.GPIO8', 'I²C SDA'], ['imu.SCL', 'u.GPIO9', 'I²C SCL'], ['imu.VCC', 'u.3V3'], ['imu.GND', 'u.GND']
            ]
        }
    },
    {
        id: 'c3-pulsador-shelly', placa: 'ESP32-C3 SuperMini', titulo: 'Pulsador inalámbrico de bolsillo para el Shelly', ambito: 'Domótica y potencia', nivel: 'Inicial', tiempo: '1 h', modelo: 'Sin modelo de IA',
        resumen: 'Un mando diminuto que enciende y apaga la luz del Shelly 1PM Mini desde cualquier punto de la casa, con el LED azul de la placa como confirmación.',
        esp32: 'Lee el pulsador en GPIO4 con pull-up interno, llama a Switch.Toggle por HTTP en la red local y parpadea el LED de GPIO8 si el Shelly responde.',
        aviso: 'El lado de 230 V se instala sin tensión y dentro de una caja; el pulsador solo se une al Shelly por Wi-Fi.',
        material: [{ id: 'toma-230' }, { id: 'magnetotermico' }, { id: 'shelly-1pm-mini-g3' }, { id: 'interruptor-pared' }, { id: 'lampara' }, { id: 'router' }, { id: 'pc-host' }, { id: C3 }, { id: 'pulsador' }],
        pasos: [
            'Cablea el circuito del Shelly sin tensión y anota su IP.',
            'En la SuperMini, conéctate a la Wi-Fi y prueba http://IP/rpc/Switch.Toggle?id=0.',
            'Lanza la petición al detectar el flanco del pulsador, con un filtro antirrebote de 30 ms.',
            'Para usarlo con batería, duerme la placa y despiértala con el pulsador (esp_deep_sleep_enable_gpio_wakeup).'
        ],
        aprendizaje: ['El ESP32-C3 puede despertar del sueño profundo por un GPIO: con pocos µA en reposo dura meses a pilas.', 'El LED de GPIO8 es activo a nivel bajo: digitalWrite(8, LOW) lo enciende.'],
        repos: [R.shelly, R.arduino, R.json], docs: [doc('Shelly: componente Switch (RPC)', 'https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Switch')],
        montaje: {
            partes: [
                { k: 'x', tipo: 'toma-230', x: 2, y: 2 }, { k: 'q', tipo: 'magnetotermico', x: 16, y: 2 }, { k: 'e', tipo: 'lampara', x: 40, y: 2 },
                { k: 's', tipo: 'interruptor-pared', x: 6, y: 24 }, { k: 'sh', tipo: 'shelly-1pm-mini-g3', x: 26, y: 22 },
                { k: 'net', tipo: 'router', x: 52, y: 24 }, { k: 'pc', tipo: 'pc-host', x: 50, y: 40 },
                { k: 'u', tipo: C3, x: 82, y: 6 }, { k: 'sw', tipo: 'pulsador', x: 94, y: 10 }
            ],
            cables: [
                ['x.L', 'q.L_IN'], ['x.N', 'q.N_IN'], ['q.L_OUT', 'sh.L'], ['q.N_OUT', 'sh.N'],
                ['sh.O', 'e.L', 'Fase conmutada'], ['q.N_OUT', 'e.N'], ['q.L_OUT', 's.1'], ['s.2', 'sh.SW', 'Entrada SW'],
                ['sh.WIFI', 'net.P1', 'RPC HTTP'], ['u.WIFI', 'net.P3', 'Wi-Fi'], ['pc.LAN', 'net.P2', 'LAN'],
                ['pc.USB2', 'u.USB', 'Alimentación y serie'], ['sw.2', 'u.GPIO4', 'Pulsador'], ['sw.1', 'u.GND']
            ]
        }
    },
    {
        id: 'c3-lampara-wled', placa: 'ESP32-C3 SuperMini', titulo: 'Lámpara ambiental WLED con tira WS2812B', ambito: 'Domótica y potencia', nivel: 'Inicial', tiempo: '45 min', modelo: 'Sin modelo de IA',
        resumen: 'Una tira de LED direccionables con efectos, horarios y control desde el móvil o Home Assistant, gobernada por una SuperMini con el firmware WLED.',
        esp32: 'Ejecuta WLED: genera la señal de la tira con el periférico RMT en GPIO4 y atiende la app y la API por Wi-Fi. El pulsador de GPIO6 enciende y cambia de efecto.',
        material: [{ id: C3 }, { id: 'ws2812b' }, { id: 'fuente-5v' }, { id: 'conversor-nivel' }, { id: 'pulsador' }, { id: 'router' }],
        pasos: [
            'Instala WLED desde el navegador (install.wled.me) con la SuperMini en el USB-C.',
            'En LED Preferences, pon la salida de datos en GPIO4 y el número de LED de la tira.',
            'Configura el pulsador en GPIO6 y limita el brillo para no pasar de los 3 A de la fuente.',
            'Añade la lámpara a Home Assistant: la integración de WLED la detecta sola.'
        ],
        aprendizaje: ['La placa, la tira y el convertidor comparten la fuente de 5 V: un solo cable de alimentación.', 'El convertidor sube los datos de 3,3 V a los 3,5 V que pide la tira a 5 V.'],
        repos: [gh('wled/WLED', 'Firmware de control de tiras LED por Wi-Fi'), R.fastled, R.ha], docs: [doc('WLED: instalación', 'https://kno.wled.ge/basics/install-binary/')],
        montaje: {
            partes: [
                { k: 'ps', tipo: 'fuente-5v', x: 2, y: 2 }, { k: 'sw', tipo: 'pulsador', x: 14, y: 4 }, { k: 'u', tipo: C3, x: 22, y: 2 },
                { k: 'ls', tipo: 'conversor-nivel', x: 34, y: 4 }, { k: 'w', tipo: 'ws2812b', x: 30, y: 16 }, { k: 'net', tipo: 'router', x: 2, y: 14 }
            ],
            cables: [
                ['ps.V', 'u.5V', '5 V'], ['ps.GND', 'u.GND'],
                ['u.GPIO4', 'ls.LV1', 'Datos 3,3 V'], ['u.3V3', 'ls.LV'], ['u.GND', 'ls.GND_L'],
                ['ls.HV1', 'w.DIN', 'Datos 5 V'], ['ps.V', 'ls.HV'], ['ps.GND', 'ls.GND_H'], ['ps.V', 'w.5V', '5 V de la tira'], ['ps.GND', 'w.GND'],
                ['sw.1', 'u.GPIO6', 'Encender / efecto'], ['sw.2', 'u.GND'], ['u.WIFI', 'net.P1', 'App y Home Assistant']
            ]
        }
    },
    {
        id: 'stamp-macros', placa: 'M5StampS3', titulo: 'Botonera de macros USB con M5StampS3', ambito: 'Escritorio y utilidades', nivel: 'Inicial', tiempo: '1 h', modelo: 'Sin modelo de IA',
        resumen: 'Cuatro teclas y una pantalla: el ordenador ve un teclado USB que lanza atajos, texto o control multimedia, y el LED RGB indica la capa activa.',
        esp32: 'Se presenta como teclado HID por el USB nativo, lee los pulsadores en G1, G3, G5 y G7, muestra la capa en la OLED (I²C en G13/G15) y colorea el LED de G21.',
        material: [{ id: 'pc-host' }, { id: STAMP }, { id: 'pulsador', cantidad: 4 }, { id: 'oled-ssd1306' }],
        pasos: [
            'Activa «USB Mode: USB-OTG (TinyUSB)» y prueba el ejemplo USBHIDKeyboard.',
            'Asigna a cada pulsador una combinación de teclas y filtra los rebotes.',
            'Mantén pulsado el botón G0 para cambiar de capa y pinta su color en el LED RGB.',
            'Muestra en la OLED qué hace cada tecla en la capa activa.'
        ],
        aprendizaje: ['El USB nativo del S3 no necesita puente serie: la misma placa es teclado, ratón o MIDI.', 'G0 es a la vez el botón de la placa y un GPIO: úsalo cuando ya ha arrancado.'],
        repos: [R.arduino, R.ssd1306, R.fastled], docs: [doc('USB en arduino-esp32', 'https://docs.espressif.com/projects/arduino-esp32/en/latest/api/usb.html')],
        montaje: {
            partes: [
                { k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'u', tipo: STAMP, x: 40, y: 4 },
                { k: 'b1', tipo: 'pulsador', x: 26, y: 2 }, { k: 'b2', tipo: 'pulsador', x: 32, y: 2 }, { k: 'b3', tipo: 'pulsador', x: 26, y: 8 }, { k: 'b4', tipo: 'pulsador', x: 32, y: 8 },
                { k: 'ds', tipo: 'oled-ssd1306', x: 26, y: 16 }
            ],
            cables: [
                ['pc.USB3_1', 'u.USB', 'HID: teclado'],
                ['b1.2', 'u.GPIO1', 'Tecla 1'], ['b2.2', 'u.GPIO3', 'Tecla 2'], ['b3.2', 'u.GPIO5', 'Tecla 3'], ['b4.2', 'u.GPIO7', 'Tecla 4'],
                ['b1.1', 'u.GND_1'], ['b2.1', 'u.GND_1'], ['b3.1', 'u.GND_1'], ['b4.1', 'u.GND_1'],
                ['ds.SDA', 'u.GPIO13', 'I²C SDA'], ['ds.SCL', 'u.GPIO15', 'I²C SCL'], ['ds.VCC', 'u.3V3'], ['ds.GND', 'u.GND_2']
            ]
        }
    },
    {
        id: 'stamp-contador', placa: 'M5StampS3', titulo: 'Contador de personas en una puerta con láser ToF', ambito: 'Domótica y potencia', nivel: 'Intermedio', tiempo: '1 h 30 min', modelo: 'Sin modelo de IA',
        resumen: 'Un sensor de tiempo de vuelo en el marco cuenta quién entra y quién sale, muestra el aforo y lo publica por MQTT para encender la luz o la calefacción.',
        esp32: 'Lee el VL53L1X por I²C (G13/G15) con dos zonas de medida para saber el sentido del paso, pinta el aforo en la OLED y lo envía por Wi-Fi.',
        material: [{ id: STAMP }, { id: 'vl53l1x' }, { id: 'oled-ssd1306' }, { id: 'fuente-5v' }, { id: 'router' }],
        pasos: [
            'Coloca el sensor en lo alto del marco, mirando al suelo, y mide la distancia en reposo.',
            'Divide la matriz del VL53L1X en dos zonas (ROI) y alterna la medida entre ellas.',
            'Decide el sentido según la zona que se cruza primero y actualiza el aforo.',
            'Publica el aforo por MQTT y muéstralo en la OLED; el LED RGB se pone rojo al llegar al máximo.'
        ],
        aprendizaje: ['El ToF mide distancia sin cámara: cuenta personas sin grabar imágenes.', 'Los dos módulos comparten el bus I²C porque tienen direcciones distintas (0x29 y 0x3C).'],
        repos: [gh('pololu/vl53l1x-arduino', 'Sensor de distancia láser'), R.ssd1306, R.mqtt], docs: [doc('ST: contador de personas con VL53L1X (UM2600)', 'https://www.st.com/resource/en/user_manual/dm00626942-counting-people-with-the-vl53l1x-longdistance-ranging-timeofflight-sensor-stmicroelectronics.pdf')],
        montaje: {
            partes: [
                { k: 'ps', tipo: 'fuente-5v', x: 2, y: 4 }, { k: 'u', tipo: STAMP, x: 16, y: 4 }, { k: 'tof', tipo: 'vl53l1x', x: 28, y: 14 },
                { k: 'ds', tipo: 'oled-ssd1306', x: 28, y: 0 }, { k: 'net', tipo: 'router', x: 12, y: 20 }
            ],
            cables: [
                ['ps.V', 'u.5V', '5 V'], ['ps.GND', 'u.GND_1'],
                ['tof.SDA', 'u.GPIO13', 'I²C SDA'], ['tof.SCL', 'u.GPIO15', 'I²C SCL'], ['tof.VIN', 'u.3V3'], ['tof.GND', 'u.GND_2'],
                ['ds.SDA', 'tof.SDA'], ['ds.SCL', 'tof.SCL'], ['ds.VCC', 'u.3V3'], ['ds.GND', 'u.GND_2'],
                ['u.WIFI', 'net.P1', 'MQTT']
            ]
        }
    },
    {
        id: 'stamp-comedero-peces', placa: 'M5StampS3', titulo: 'Comedero automático para peces', ambito: 'Acuariofilia', nivel: 'Inicial', tiempo: '1 h', modelo: 'Sin modelo de IA',
        resumen: 'Un servo gira el tambor de comida a las horas programadas; un pulsador da una ración extra y el LED RGB avisa si hoy ya han comido.',
        esp32: 'Sincroniza la hora por NTP, mueve el servo con LEDC en G1 a cada toma y lee el pulsador de ración extra en G3.',
        material: [{ id: STAMP }, { id: 'sg90' }, { id: 'pulsador' }, { id: 'fuente-5v' }],
        pasos: [
            'Sincroniza la hora con configTime() y guarda el horario de tomas en Preferences.',
            'Gira el servo media vuelta y vuelve a la posición de reposo para soltar una ración.',
            'Añade el pulsador de ración extra con antirrebote.',
            'Pon el LED RGB en verde tras cada toma y en ámbar si se ha saltado alguna.'
        ],
        aprendizaje: ['La placa y el servo comparten la fuente de 5 V: el servo nunca cuelga del pin 3V3.', 'Con NTP no hace falta reloj de tiempo real mientras haya Wi-Fi.'],
        repos: [R.servo, R.fastled, R.arduino], docs: [],
        montaje: {
            partes: [{ k: 'ps', tipo: 'fuente-5v', x: 2, y: 4 }, { k: 'u', tipo: STAMP, x: 16, y: 4 }, { k: 'sv', tipo: 'sg90', x: 28, y: 6, rot: 2 }, { k: 'sw', tipo: 'pulsador', x: 6, y: 18 }],
            cables: [
                ['ps.V', 'u.5V', '5 V'], ['ps.GND', 'u.GND_1'],
                ['sv.VCC', 'ps.V', '5 V del servo'], ['sv.GND', 'ps.GND'], ['sv.PWM', 'u.GPIO1', 'PWM 50 Hz'],
                ['sw.2', 'u.GPIO3', 'Ración extra'], ['sw.1', 'u.GND_1']
            ]
        }
    }
];

// ---- Montajes de las fichas de ideas ---------------------------------
// Cada idea lleva su circuito ya cableado. Las de Coral parten del mismo
// banco: PC con el acelerador en un USB 3.0 y el ESP32-S3 en el USB 2.0,
// con los periféricos entre ambos y en el lado derecho del ESP32-S3.
const bancoCoral = (serie, partes, cables) => ({
    partes: [{ k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'tpu', tipo: 'coral-usb', x: 2, y: 20 }, { k: 'esp', tipo: ESP, x: 62, y: 2 }, ...partes],
    cables: [['pc.USB3_1', 'tpu.USB', 'Edge TPU'], ['pc.USB2', 'esp.USB_UART', serie], ...cables]
});
// Raspberry Pi con el Coral y el ESP32-S3 unido por la UART de la cabecera
// (y alimentado por su pin de 5 V), para no pasar de 1,2 A en los USB.
const bancoPi = (partes, cables) => ({
    partes: [{ k: 'ps', tipo: 'fuente-usbc', x: 2, y: 4 }, { k: 'pi', tipo: PI, x: 14, y: 2 }, { k: 'tpu', tipo: 'coral-usb', x: 10, y: 40 }, { k: 'esp', tipo: ESP, x: 52, y: 2 }, ...partes],
    cables: [
        ['ps.OUT', 'pi.PWR'], ['tpu.USB', 'pi.USB3_1', 'Edge TPU'],
        ['pi.GPIO14', 'esp.GPIO18', 'UART TX → RX'], ['pi.GPIO15', 'esp.GPIO17', 'UART RX ← TX'], ['pi.5V_1', 'esp.5V_1', '5 V'], ['pi.GND_1', 'esp.GND_1'],
        ...cables
    ]
});
// Tira WS2812B con fuente propia y convertidor de nivel para DIN.
const tiraConNivel = (gpio, y = 40) => ({
    partes: [{ k: 'ps', tipo: 'fuente-5v', x: 34, y: 2 }, { k: 'ls', tipo: 'conversor-nivel', x: 48, y: 14 }, { k: 'w', tipo: 'ws2812b', x: 32, y }],
    cables: [
        ['esp.' + gpio, 'ls.LV1', 'Datos 3,3 V'], ['esp.3V3_1', 'ls.LV'], ['esp.GND_1', 'ls.GND_L'],
        ['ls.HV1', 'w.DIN', 'Datos 5 V'], ['ps.V', 'ls.HV'], ['ps.GND', 'ls.GND_H'], ['ps.V', 'w.5V', '5 V de la tira'], ['ps.GND', 'w.GND']
    ]
});
const unir = (...m) => ({ partes: m.flatMap(x => x.partes), cables: m.flatMap(x => x.cables) });
// Sonda DS18B20 con su pull-up de 4,7 kΩ, a la izquierda del ESP32-S3.
const sonda = {
    partes: [{ k: 't', tipo: 'ds18b20', x: 38, y: 6 }, { k: 'rp', tipo: 'resistencia', x: 46, y: 14, valor: '4,7 kΩ' }],
    cables: [['t.DQ', 'esp.GPIO4', '1-Wire'], ['rp.1', 't.DQ'], ['rp.2', 'esp.3V3_1', 'Pull-up 4,7 kΩ'], ['t.VDD', 'esp.3V3_1'], ['t.GND', 'esp.GND_1']]
};
// Servo SG90 girado (pines a la izquierda) en la columna derecha.
const servoDer = (k, y, gpio, etiqueta) => ({
    partes: [{ k, tipo: 'sg90', x: 80, y, rot: 2 }],
    cables: [['esp.' + gpio, k + '.PWM', etiqueta], [k + '.VCC', 'ps.V'], [k + '.GND', 'ps.GND']]
});
const oledIzq = (x = 36, y = 4, vcc = '3V3_2') => ({
    partes: [{ k: 'ds', tipo: 'oled-ssd1306', x, y }],
    cables: [['ds.SDA', 'esp.GPIO8', 'I²C SDA'], ['ds.SCL', 'esp.GPIO9', 'I²C SCL'], ['ds.VCC', 'esp.' + vcc], ['ds.GND', 'esp.GND_1']]
});

const MONTAJES = {
    'espejo-yoga': unir(bancoCoral('Serie: alineación', [{ k: 'z', tipo: 'zumbador', x: 48, y: 26 }], [['esp.GPIO5', 'z.IO', 'Aviso'], ['esp.3V3_2', 'z.VCC'], ['z.GND', 'esp.GND_1']]), tiraConNivel('GPIO4')),
    'traductor-signos': unir(
        bancoCoral('Serie: palabra', [{ k: 'a', tipo: 'max98357a', x: 40, y: 20 }],
            [['a.LRC', 'esp.GPIO5', 'I²S LRC'], ['a.BCLK', 'esp.GPIO6', 'I²S BCLK'], ['a.DIN', 'esp.GPIO7', 'I²S datos'], ['a.VIN', 'esp.5V_1'], ['a.GND', 'esp.GND_1']]),
        oledIzq(36, 4, '3V3_1')),
    'cazador-meteoros': bancoPi([], []),
    'mesa-rol': unir(bancoCoral('Serie: casillas', [{ k: 'sw', tipo: 'pulsador', x: 50, y: 28 }], [['sw.2', 'esp.GPIO5', 'Fin de turno'], ['sw.1', 'esp.GND_1']]), tiraConNivel('GPIO4')),
    'vigilancia-piscina': unir(bancoCoral('Serie: alarma', [{ k: 'k', tipo: 'rele-2ch', x: 78, y: 4 }],
        [['k.IN1', 'esp.GPIO1', 'Sirena'], ['k.VCC', 'esp.5V_1'], ['k.GND', 'esp.GND_2']]), sonda),
    'sintetizador-gestos': {
        partes: [{ k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'tpu', tipo: 'coral-usb', x: 2, y: 20 }, { k: 'esp', tipo: ESP, x: 62, y: 2 }, { k: 'tof', tipo: 'vl53l1x', x: 40, y: 10 }],
        cables: [
            ['pc.USB3_1', 'tpu.USB', 'Edge TPU'], ['pc.USB3_2', 'esp.USB_OTG', 'USB-MIDI'],
            ['tof.SDA', 'esp.GPIO8', 'I²C SDA'], ['tof.SCL', 'esp.GPIO9', 'I²C SCL'], ['tof.VIN', 'esp.3V3_1'], ['tof.GND', 'esp.GND_1']
        ]
    },
    'comedero-mascotas': unir(
        bancoCoral('Serie: animal', [{ k: 'ps', tipo: 'fuente-5v', x: 80, y: 24 }], [['ps.GND', 'esp.GND_3', 'Masa común']]),
        servoDer('s1', 4, 'GPIO1', 'Tapa 1'), servoDer('s2', 14, 'GPIO2', 'Tapa 2')),
    'navegacion-haptica': bancoCoral('Serie: obstáculos', [{ k: 's', tipo: 'hc-sr04', x: 78, y: 4 }, { k: 'd', tipo: 'divisor-5v-3v3', x: 80, y: 16 }],
        [['s.VCC', 'esp.5V_1'], ['s.TRIG', 'esp.GPIO1', 'Disparo'], ['s.ECHO', 'd.IN', 'Eco a 5 V'], ['d.OUT', 'esp.GPIO2', 'Eco a 3,3 V'], ['d.GND', 'esp.GND_3'], ['s.GND', 'esp.GND_2']]),
    'monitor-cuna': bancoCoral('Serie: postura', [{ k: 'b', tipo: 'bme280', x: 36, y: 4 }, { k: 'mic', tipo: 'inmp441', x: 38, y: 16 }], [
        ['b.SDA', 'esp.GPIO8', 'I²C SDA'], ['b.SCL', 'esp.GPIO9', 'I²C SCL'], ['b.VIN', 'esp.3V3_1'], ['b.GND', 'esp.GND_1'],
        ['mic.SD', 'esp.GPIO4', 'I²S datos'], ['mic.WS', 'esp.GPIO5', 'I²S WS'], ['mic.SCK', 'esp.GPIO6', 'I²S reloj'], ['mic.VDD', 'esp.3V3_2'], ['mic.GND', 'esp.GND_1'], ['mic.LR', 'mic.GND', 'Canal izquierdo']
    ]),
    'clasificador-residuos': unir(
        bancoCoral('Serie: tipo de envase', [{ k: 'ps', tipo: 'fuente-5v', x: 80, y: 30 }, { k: 'pir', tipo: 'pir-hcsr501', x: 36, y: 18 }],
            [['ps.GND', 'esp.GND_3', 'Masa común'], ['pir.VCC', 'esp.5V_1'], ['pir.OUT', 'esp.GPIO4', 'Presencia'], ['pir.GND', 'esp.GND_1']]),
        servoDer('s1', 4, 'GPIO1', 'Tapa envases'), servoDer('s2', 12, 'GPIO2', 'Tapa papel'), servoDer('s3', 20, 'GPIO42', 'Tapa vidrio')),
    'inventario-frigorifico': unir(bancoCoral('Serie: alimentos', [{ k: 'sw', tipo: 'pulsador', x: 50, y: 8 }], [['sw.2', 'esp.GPIO4', 'Puerta (contacto reed)'], ['sw.1', 'esp.GND_1']]), oledIzq(36, 16)),
    'observatorio-aves': bancoPi([{ k: 'pir', tipo: 'pir-hcsr501', x: 66, y: 4 }], [['pir.VCC', 'esp.5V_1'], ['pir.OUT', 'esp.GPIO1', 'Posado'], ['pir.GND', 'esp.GND_2']]),
    'acuario': unir(bancoCoral('Serie: estado de los peces', [{ k: 'k', tipo: 'rele-2ch', x: 78, y: 4 }],
        [['k.IN1', 'esp.GPIO1', 'Bomba de abono'], ['k.IN2', 'esp.GPIO2', 'Luz'], ['k.VCC', 'esp.5V_1'], ['k.GND', 'esp.GND_2']]), sonda),

    'monitor-pc': {
        partes: [{ k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'esp', tipo: ESP, x: 44, y: 2 }, { k: 'ds', tipo: 'oled-ssd1306', x: 28, y: 4 }, { k: 'b1', tipo: 'pulsador', x: 30, y: 20 }, { k: 'b2', tipo: 'pulsador', x: 30, y: 26 }],
        cables: [
            ['pc.USB2', 'esp.USB_UART', 'Serie: telemetría'],
            ['ds.SDA', 'esp.GPIO8', 'I²C SDA'], ['ds.SCL', 'esp.GPIO9', 'I²C SCL'], ['ds.VCC', 'esp.3V3_1'], ['ds.GND', 'esp.GND_1'],
            ['b1.2', 'esp.GPIO4', 'Página siguiente'], ['b1.1', 'esp.GND_1'], ['b2.2', 'esp.GPIO5', 'Página anterior'], ['b2.1', 'esp.GND_1']
        ]
    },
    'mando-ir': {
        partes: [
            { k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'esp', tipo: ESP, x: 44, y: 2 }, { k: 'r', tipo: 'ir-receptor', x: 28, y: 2 }, { k: 't', tipo: 'ir-emisor', x: 35, y: 2 },
            { k: 'ds', tipo: 'oled-ssd1306', x: 28, y: 12 }, { k: 'b', tipo: 'pulsador', x: 32, y: 27 }
        ],
        cables: [
            ['pc.USB2', 'esp.USB_UART', 'Alimentación y serie'],
            ['r.OUT', 'esp.GPIO4', 'IR recibido'], ['r.VCC', 'esp.3V3_1'], ['r.GND', 'esp.GND_1'],
            ['t.DAT', 'esp.GPIO5', 'IR emitido (RMT)'], ['t.VCC', 'esp.5V_1'], ['t.GND', 'esp.GND_1'],
            ['ds.SDA', 'esp.GPIO8', 'I²C SDA'], ['ds.SCL', 'esp.GPIO9', 'I²C SCL'], ['ds.VCC', 'esp.3V3_2'], ['ds.GND', 'esp.GND_1'],
            ['b.2', 'esp.GPIO6', 'Aprender'], ['b.1', 'esp.GND_1']
        ]
    },
    'chat-nrf24': (() => {
        const estacion = (n, x0, puerto) => ({
            partes: [{ k: 'e' + n, tipo: ESP, x: x0 + 14, y: 2 }, { k: 'ds' + n, tipo: 'oled-ssd1306', x: x0, y: 4 }, { k: 'rf' + n, tipo: 'nrf24l01', x: x0, y: 18 }, { k: 'b' + n, tipo: 'pulsador', x: x0 + 4, y: 27 }],
            cables: [
                ['pc.' + puerto, `e${n}.USB_UART`, n === 1 ? 'Radio A' : 'Radio B'],
                [`rf${n}.CE`, `e${n}.GPIO14`, 'CE'], [`rf${n}.CSN`, `e${n}.GPIO10`, 'CSN'], [`rf${n}.SCK`, `e${n}.GPIO12`, 'SPI SCK'], [`rf${n}.MOSI`, `e${n}.GPIO11`, 'SPI MOSI'], [`rf${n}.MISO`, `e${n}.GPIO13`, 'SPI MISO'],
                [`rf${n}.VCC`, `e${n}.3V3_1`], [`rf${n}.GND`, `e${n}.GND_1`],
                [`ds${n}.SDA`, `e${n}.GPIO8`, 'I²C SDA'], [`ds${n}.SCL`, `e${n}.GPIO9`, 'I²C SCL'], [`ds${n}.VCC`, `e${n}.3V3_2`], [`ds${n}.GND`, `e${n}.GND_1`],
                [`b${n}.2`, `e${n}.GPIO4`, 'Enviar'], [`b${n}.1`, `e${n}.GND_1`]
            ]
        });
        return unir({ partes: [{ k: 'pc', tipo: 'pc-host', x: 2, y: 2 }], cables: [] }, estacion(1, 26, 'USB3_1'), estacion(2, 70, 'USB3_2'));
    })(),
    'mando-espnow': {
        partes: [
            { k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'esp', tipo: ESP, x: 46, y: 2 }, { k: 'j1', tipo: 'joystick', x: 26, y: 2 }, { k: 'j2', tipo: 'joystick', x: 36, y: 2 },
            { k: 'imu', tipo: 'mpu6050', x: 28, y: 14 }, { k: 'ds', tipo: 'oled-ssd1306', x: 30, y: 22 }
        ],
        cables: [
            ['pc.USB2', 'esp.USB_UART', 'Alimentación y serie'],
            ['j1.VRX', 'esp.GPIO4', 'Gas'], ['j1.VRY', 'esp.GPIO5', 'Guiñada'], ['j2.VRX', 'esp.GPIO6', 'Alabeo'], ['j2.VRY', 'esp.GPIO7', 'Cabeceo'],
            ['j1.SW', 'esp.GPIO15', 'Armar'], ['j2.SW', 'esp.GPIO16', 'Modo'], ['j1.VCC', 'esp.3V3_1'], ['j2.VCC', 'esp.3V3_1'], ['j1.GND', 'esp.GND_1'], ['j2.GND', 'esp.GND_1'],
            ['imu.SDA', 'esp.GPIO8', 'I²C SDA'], ['imu.SCL', 'esp.GPIO9', 'I²C SCL'], ['imu.VCC', 'esp.3V3_2'], ['imu.GND', 'esp.GND_1'],
            ['ds.SDA', 'imu.SDA'], ['ds.SCL', 'imu.SCL'], ['ds.VCC', 'esp.3V3_2'], ['ds.GND', 'esp.GND_1']
        ]
    },
    'analizador-wifi': {
        partes: [{ k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'esp', tipo: ESP, x: 46, y: 2 }, { k: 'tft', tipo: 'tft-st7789', x: 28, y: 14 }, { k: 'b1', tipo: 'pulsador', x: 28, y: 4 }, { k: 'b2', tipo: 'pulsador', x: 36, y: 4 }],
        cables: [
            ['pc.USB2', 'esp.USB_UART', 'Alimentación y serie'],
            ['tft.SCK', 'esp.GPIO12', 'SPI SCK'], ['tft.MOSI', 'esp.GPIO11', 'SPI MOSI'], ['tft.CS', 'esp.GPIO10', 'CS'], ['tft.DC', 'esp.GPIO14', 'D/C'], ['tft.RST', 'esp.GPIO16', 'Reset'], ['tft.BL', 'esp.GPIO17', 'Brillo'],
            ['tft.VIN', 'esp.3V3_1'], ['tft.GND', 'esp.GND_1'],
            ['b1.2', 'esp.GPIO4', 'Canal −'], ['b1.1', 'esp.GND_1'], ['b2.2', 'esp.GPIO5', 'Canal +'], ['b2.1', 'esp.GND_1']
        ]
    },
    'teclado-macros': unir({
        partes: [
            { k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'esp', tipo: ESP, x: 46, y: 2 },
            { k: 'b1', tipo: 'pulsador', x: 28, y: 4 }, { k: 'b2', tipo: 'pulsador', x: 36, y: 4 }, { k: 'b3', tipo: 'pulsador', x: 28, y: 10 }, { k: 'b4', tipo: 'pulsador', x: 36, y: 10 }
        ],
        cables: [
            ['pc.USB3_1', 'esp.USB_OTG', 'HID: teclado'],
            ['b1.2', 'esp.GPIO4', 'Macro 1'], ['b2.2', 'esp.GPIO5', 'Macro 2'], ['b3.2', 'esp.GPIO6', 'Macro 3'], ['b4.2', 'esp.GPIO7', 'Macro 4'],
            ['b1.1', 'esp.GND_1'], ['b2.1', 'esp.GND_1'], ['b3.1', 'esp.GND_1'], ['b4.1', 'esp.GND_1']
        ]
    }, oledIzq(30, 18, '3V3_1')),
    'receptor-433': unir({
        partes: [{ k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'esp', tipo: ESP, x: 46, y: 2 }, { k: 'rf', tipo: 'cc1101', x: 30, y: 20 }, { k: 'net', tipo: 'router', x: 62, y: 4 }],
        cables: [
            ['pc.USB2', 'esp.USB_UART', 'Alimentación y serie'], ['esp.WIFI', 'net.P1', 'MQTT'], ['pc.LAN', 'net.P2', 'Home Assistant'],
            ['rf.GDO0', 'esp.GPIO4', 'Datos recibidos'], ['rf.GDO2', 'esp.GPIO5'], ['rf.CSN', 'esp.GPIO10', 'CSN'], ['rf.SCK', 'esp.GPIO12', 'SPI SCK'], ['rf.MOSI', 'esp.GPIO11', 'SPI MOSI'], ['rf.MISO', 'esp.GPIO13', 'SPI MISO'],
            ['rf.VCC', 'esp.3V3_1'], ['rf.GND', 'esp.GND_1']
        ]
    }, oledIzq(30, 4)),
    'brazo-robot': {
        partes: [
            { k: 'pc', tipo: 'pc-host', x: 2, y: 2 }, { k: 'esp', tipo: ESP, x: 46, y: 2 }, { k: 'j1', tipo: 'joystick', x: 26, y: 2 }, { k: 'j2', tipo: 'joystick', x: 36, y: 2 },
            { k: 'pca', tipo: 'pca9685', x: 28, y: 18, rot: 2 }, { k: 'ps', tipo: 'fuente-5v', x: 2, y: 22 },
            { k: 'm1', tipo: 'mg996r', x: 16, y: 32 }, { k: 'm2', tipo: 'mg996r', x: 26, y: 32 }, { k: 'm3', tipo: 'sg90', x: 14, y: 42 }, { k: 'm4', tipo: 'sg90', x: 30, y: 42 }
        ],
        cables: [
            ['pc.USB2', 'esp.USB_UART', 'Alimentación y serie'],
            ['j1.VRX', 'esp.GPIO4', 'Base'], ['j1.VRY', 'esp.GPIO5', 'Hombro'], ['j2.VRX', 'esp.GPIO6', 'Codo'], ['j2.VRY', 'esp.GPIO7', 'Pinza'],
            ['j1.SW', 'esp.GPIO15', 'Grabar'], ['j2.SW', 'esp.GPIO16', 'Reproducir'], ['j1.VCC', 'esp.3V3_1'], ['j2.VCC', 'esp.3V3_1'], ['j1.GND', 'esp.GND_1'], ['j2.GND', 'esp.GND_1'],
            ['pca.SDA', 'esp.GPIO8', 'I²C SDA'], ['pca.SCL', 'esp.GPIO9', 'I²C SCL'], ['pca.VCC', 'esp.3V3_2'], ['pca.GND', 'esp.GND_1'],
            ['ps.V', 'pca.VP', 'V+ servos'], ['ps.GND', 'pca.GND', 'Masa común'],
            ['pca.PWM0', 'm1.PWM'], ['pca.PWM1', 'm2.PWM'], ['pca.PWM2', 'm3.PWM'], ['pca.PWM3', 'm4.PWM'],
            ['m1.VCC', 'pca.VP'], ['m2.VCC', 'pca.VP'], ['m3.VCC', 'pca.VP'], ['m4.VCC', 'pca.VP'],
            ['m1.GND', 'ps.GND'], ['m2.GND', 'ps.GND'], ['m3.GND', 'ps.GND'], ['m4.GND', 'ps.GND']
        ]
    },
    'robot-lidar': {
        partes: [
            { k: 'ps', tipo: 'fuente-usbc', x: 2, y: 4 }, { k: 'pi', tipo: PI, x: 14, y: 2 }, { k: 'ld', tipo: 'rplidar-a1', x: 8, y: 40 }, { k: 'esp', tipo: ESP, x: 52, y: 2 },
            { k: 'm1', tipo: 'motor-tt', x: 39, y: 1 }, { k: 'm2', tipo: 'motor-tt', x: 39, y: 7 }, { k: 'drv', tipo: 'l298n', x: 38, y: 14 },
            { k: 'bt', tipo: 'portapilas-4aa', x: 38, y: 30 }, { k: 'imu', tipo: 'mpu6050', x: 38, y: 42 }
        ],
        cables: [
            ['ps.OUT', 'pi.PWR', 'Batería USB'], ['ld.USB', 'pi.USB2_1', 'Escáner 360°'], ['pi.USB2_2', 'esp.USB_UART', 'Serie: velocidades'],
            ['bt.V', 'drv.VM', 'Pilas a motores'], ['bt.GND', 'drv.GND'], ['drv.GND', 'esp.GND_1', 'Masa común'],
            ['drv.OUT1', 'm1.A'], ['drv.OUT2', 'm1.B'], ['drv.OUT3', 'm2.A'], ['drv.OUT4', 'm2.B'],
            ['esp.GPIO4', 'drv.ENA', 'PWM izquierdo'], ['esp.GPIO5', 'drv.IN1'], ['esp.GPIO6', 'drv.IN2'], ['esp.GPIO7', 'drv.IN3'], ['esp.GPIO15', 'drv.IN4'], ['esp.GPIO16', 'drv.ENB', 'PWM derecho'],
            ['imu.SDA', 'esp.GPIO8', 'I²C SDA'], ['imu.SCL', 'esp.GPIO9', 'I²C SCL'], ['imu.VCC', 'esp.3V3_1'], ['imu.GND', 'esp.GND_1']
        ]
    }
};
for (const p of PROYECTOS) {
    if (!p.montaje && MONTAJES[p.id]) p.montaje = MONTAJES[p.id];
    if (EJEMPLOS[p.id]) p.ejemplo = EJEMPLOS[p.id];
}

// Ejemplo del proyecto del que sale el montaje abierto en la mesa (por nombre).
export const ejemploDe = doc => PROYECTOS.find(p => p.ejemplo && p.titulo === doc.nombre)?.ejemplo || null;

export const AMBITOS = [...new Set(PROYECTOS.map(p => p.ambito))];
