// Biblioteca de proyectos.
//
// Los que llevan `montaje` se abren en la mesa ya cableados (coordenadas en
// unidades de rejilla). Las pruebas cargan cada plantilla y exigen que pase
// la comprobación eléctrica sin errores. El resto son fichas del catálogo de
// ideas híbridas ESP32-S3 + Coral, con el material extra y los repositorios
// de los que partir.

const ESP = 'esp32-s3-devkitc-1-n16r8';
const PI = 'raspberry-pi-4b';
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
    ha: gh('home-assistant/core', 'Home Assistant')
};

export const PROYECTOS = [
    {
        id: 'vigilancia-rtsp', titulo: 'Vigilancia híbrida: cámara RTSP + Coral + ESP32-S3', ambito: 'Seguridad del hogar', nivel: 'Intermedio', tiempo: '2 h',
        modelo: 'SSD MobileNet v2 (COCO) INT8',
        resumen: 'La Raspberry Pi recibe el vídeo RTSP de la Mercusys MC210, el Coral detecta personas en unos milisegundos y el ESP32-S3 acciona un relé y muestra la alerta en la pantalla OLED.',
        esp32: 'Recibe las detecciones por el puerto serie USB, conmuta el relé (GPIO14) y pinta el estado en la OLED por I²C (GPIO8/9).',
        coral: 'Detección de objetos sobre el flujo de la cámara, a más de 30 fps, en la Raspberry Pi.',
        material: [{ id: 'mercusys-mc210' }, { id: 'router' }, { id: PI }, { id: 'fuente-usbc' }, { id: 'coral-usb' }, { id: ESP }, { id: 'rele-2ch' }, { id: 'oled-ssd1306' }],
        pasos: [
            'Crea la cuenta de cámara en la app Mercusys y comprueba el flujo con VLC: rtsp://usuario:clave@IP:554/stream1.',
            'Instala el runtime del Edge TPU y PyCoral en la Raspberry Pi y conecta el Coral a un puerto USB 3.0 (azul).',
            'Ejecuta la detección sobre el flujo RTSP con OpenCV y envía cada detección por el puerto serie al ESP32-S3.',
            'En el ESP32-S3, activa el relé durante unos segundos y actualiza la pantalla al recibir una persona.'
        ],
        aprendizaje: [
            'Decodificar RTSP en el host libra al ESP32-S3 del vídeo: él solo hace control en tiempo real.',
            'El relé se alimenta de los 5 V del USB y su entrada es activa a nivel bajo.'
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
                ['tpu.USB', 'pi.USB3_1', 'USB 3.0'], ['pi.USB2_1', 'esp.USB_UART', 'Serie 115200'],
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
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'ws2812b' }, { id: 'zumbador' }],
        repos: [R.pycoral, R.posenet, R.fastled], docs: [doc('Coral: estimación de pose', 'https://coral.ai/models/pose-estimation/')]
    },
    {
        id: 'traductor-signos', titulo: 'Traductor portátil de lengua de signos a voz', ambito: 'Accesibilidad', nivel: 'Avanzado', modelo: 'MediaPipe Hands + clasificador temporal',
        resumen: 'Reconoce gestos dinámicos de las manos, muestra la palabra y la pronuncia.',
        esp32: 'Envía el vídeo de las manos, muestra el subtítulo en la OLED y reproduce la voz por I²S.',
        coral: 'Puntos de la mano y clasificación del gesto con menos de 40 ms de latencia.',
        extra: [['Cámara OV2640', 5], ['OLED SSD1306 de 1,3"', 3.5], ['Amplificador MAX98357A y altavoz', 4.5]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'oled-ssd1306' }, { id: 'max98357a' }],
        repos: [R.mediapipe, R.pycoral, R.audiotools], docs: [doc('MediaPipe: gestos de la mano', 'https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer')]
    },
    {
        id: 'cazador-meteoros', titulo: 'Cazador de meteoros y seguimiento de satélites', ambito: 'Ciencia ciudadana', nivel: 'Avanzado', modelo: 'SSD MobileNet + filtro de trayectoria',
        resumen: 'Cámara de todo el cielo que distingue meteoros y pasos de la ISS de aviones y pájaros.',
        esp32: 'Mueve los motores paso a paso de la montura, lee la brújula y dispara la exposición.',
        coral: 'Clasifica las trazas del cielo nocturno en vivo.',
        extra: [['2 motores NEMA 17 con TMC2209', 16], ['Magnetómetro QMC5883L', 2.5], ['Cámara de alta sensibilidad', 9]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: PI }],
        repos: [R.pycoral, gh('teemuatlut/TMCStepper', 'Control de los TMC2209 por UART'), gh('waspinator/AccelStepper', 'Rampas de aceleración para motores paso a paso')], docs: []
    },
    {
        id: 'mesa-rol', titulo: 'Mesa de juegos de rol con efectos dinámicos', ambito: 'Juego y ocio', nivel: 'Intermedio', modelo: 'YOLOv8 nano cuantizado INT8',
        resumen: 'Una cámara cenital localiza las miniaturas y lee los dados; la mesa responde con luz y sonido.',
        esp32: 'Ilumina las casillas con una matriz LED y dispara efectos de sonido.',
        coral: 'Detecta cada miniatura y el resultado del dado de 20 caras.',
        extra: [['Cámara OV5640 con autofoco', 9], ['Matriz WS2812B 16×16', 11], ['DFPlayer Mini con altavoz', 3.5]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'ws2812b' }],
        repos: [R.yolo, R.fastled, gh('DFRobot/DFRobotDFPlayerMini', 'Reproductor MP3 por UART')], docs: [doc('Ultralytics: exportar a Edge TPU', 'https://docs.ultralytics.com/integrations/edge-tpu/')]
    },
    {
        id: 'vigilancia-piscina', titulo: 'Vigilancia de piscina y prevención de ahogamientos', ambito: 'Seguridad familiar', nivel: 'Avanzado', modelo: 'PoseNet + detección de inmovilidad',
        resumen: 'Alerta si un niño o una mascota cae al agua fuera de horario o permanece inmóvil.',
        esp32: 'Vídeo continuo desde caja estanca, temperatura del agua y sirena estroboscópica.',
        coral: 'Detección de pose en superficie y bajo el agua.',
        extra: [['Cámara OV2640 con lente polarizada', 6.5], ['Sirena de 12 V con MOSFET', 8], ['Caja estanca IP65', 4.5]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'ds18b20' }, { id: 'rele-2ch' }],
        repos: [R.posenet, R.frigate, gh('milesburton/Arduino-Temperature-Control-Library', 'Sondas DS18B20')], docs: [],
        aviso: 'Es una ayuda, no un sistema de seguridad certificado: no sustituye a la vigilancia de un adulto.'
    },
    {
        id: 'sintetizador-gestos', titulo: 'Sintetizador aéreo y controlador MIDI por gestos', ambito: 'Música y arte', nivel: 'Intermedio', modelo: 'Puntos 3D de la mano',
        resumen: 'La posición de las manos en el aire modula notas, pitch-bend y filtros sin tocar nada.',
        esp32: 'Se presenta como dispositivo USB-MIDI por su puerto OTG y mide la altura con un láser ToF.',
        coral: 'Sigue a 60 fps la apertura y el giro de ambas manos.',
        extra: [['Cámara OV2640', 5], ['Sensor VL53L1X', 4], ['Conector DIN-5 y optoacoplador', 2]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'vl53l1x' }],
        repos: [R.mediapipe, R.arduino, gh('pololu/vl53l1x-arduino', 'Sensor de distancia láser')], docs: [doc('USB en arduino-esp32', 'https://docs.espressif.com/projects/arduino-esp32/en/latest/api/usb.html')]
    },
    {
        id: 'comedero-mascotas', titulo: 'Comedero selectivo con reconocimiento de mascotas', ambito: 'Mascotas', nivel: 'Intermedio', modelo: 'MobileNet v2 como extractor de rasgos',
        resumen: 'Abre la tapa solo al animal que corresponde y registra cuánto come y bebe cada uno.',
        esp32: 'Pesa la comida con una célula de carga y mueve los servos de las tapas.',
        coral: 'Distingue a cada gato o perro por la cara y el pelaje, sin collar RFID.',
        extra: [['Cámara OV2640', 5], ['Célula de carga de 1 kg con HX711', 3], ['2 servos MG996R', 7]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'sg90', cantidad: 2 }, { id: 'fuente-5v' }],
        repos: [R.pycoral, R.servo, gh('bogde/HX711', 'Amplificador de células de carga')], docs: [doc('Coral: reentrenar un clasificador', 'https://coral.ai/docs/edgetpu/retrain-classification-ondevice/')]
    },
    {
        id: 'navegacion-haptica', titulo: 'Asistente de navegación háptica', ambito: 'Accesibilidad', nivel: 'Avanzado', modelo: 'DeepLab v3+ de segmentación urbana',
        resumen: 'Un cinturón de motores vibradores indica hacia dónde esquivar los obstáculos de la acera.',
        esp32: 'Gobierna cinco motores de vibración y los avisos por auricular.',
        coral: 'Segmenta aceras, escalones, patinetes y semáforos desde una cámara pectoral.',
        extra: [['Cámara OV2640 con cable largo', 6], ['5 motores vibradores con PCA9685', 6.5], ['Sensor ultrasónico', 1.5]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'hc-sr04' }, { id: 'divisor-5v-3v3' }],
        repos: [R.pycoral, gh('adafruit/Adafruit-PWM-Servo-Driver-Library', 'Controlador PWM PCA9685')], docs: [doc('Coral: segmentación semántica', 'https://coral.ai/models/semantic-segmentation/')],
        aviso: 'Prototipo de investigación: no sustituye al bastón ni al perro guía.'
    },
    {
        id: 'monitor-cuna', titulo: 'Monitor de cuna sin contacto', ambito: 'Cuidado infantil', nivel: 'Avanzado', modelo: 'MoveNet + clasificador de audio',
        resumen: 'Vigila la postura del bebé con infrarrojos invisibles y avisa si se gira boca abajo o llora.',
        esp32: 'Ilumina con LED de 940 nm, mide la calidad del aire y enciende la luz nocturna.',
        coral: 'Analiza la postura y detecta si algo cubre la cara.',
        extra: [['Cámara OV2640 sin filtro IR', 6], ['Iluminador de 940 nm', 2.5], ['Sensor BME280', 3]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'bme280' }, { id: 'inmp441' }],
        repos: [R.posenet, R.pycoral, gh('adafruit/Adafruit_BME280_Library', 'Sensor ambiental')], docs: [],
        aviso: 'No es un producto sanitario: no sustituye a la supervisión de un adulto.'
    },
    {
        id: 'clasificador-residuos', titulo: 'Clasificador doméstico de residuos', ambito: 'Hogar sostenible', nivel: 'Intermedio', modelo: 'EfficientNet-EdgeTPU-S',
        resumen: 'Identifica el envase que le enseñas y levanta la tapa del cubo correcto.',
        esp32: 'Detecta la proximidad, muestra el icono del contenedor y mueve el servo de la tapa.',
        coral: 'Clasifica brik, lata, PET, cartón o vidrio en menos de 20 ms.',
        extra: [['Cámara OV2640', 5], ['3 servos MG996R', 10], ['Pantalla TFT SPI de 1,8"', 4]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'sg90', cantidad: 3 }, { id: 'pir-hcsr501' }, { id: 'fuente-5v' }],
        repos: [R.pycoral, R.servo, gh('Bodmer/TFT_eSPI', 'Pantallas TFT por SPI')], docs: [doc('Coral: clasificación de imágenes', 'https://coral.ai/models/image-classification/')]
    },
    {
        id: 'inventario-frigorifico', titulo: 'Inventario de frigorífico y recetas antidesperdicio', ambito: 'Cocina', nivel: 'Intermedio', modelo: 'SSD MobileNet v2',
        resumen: 'Se despierta al abrir la puerta, fotografía los estantes y actualiza la lista de la compra.',
        esp32: 'Sale del sueño profundo con un sensor Hall, fotografía y muestra las caducidades.',
        coral: 'Detecta los alimentos que entran y salen.',
        extra: [['Cámara OV2640 gran angular', 6], ['Sensor Hall KY-003', 1], ['Pantalla e-Paper de 2,9"', 9]],
        material: [{ id: ESP }, { id: 'coral-usb' }],
        repos: [R.camara, R.testdata, gh('ZinggJM/GxEPD2', 'Pantallas de tinta electrónica')], docs: [doc('Modos de bajo consumo del ESP32-S3', 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html')]
    },
    {
        id: 'observatorio-aves', titulo: 'Observatorio de aves de balcón', ambito: 'Naturaleza', nivel: 'Intermedio', modelo: 'iNaturalist Birds (Edge TPU)',
        resumen: 'Fototrampeo con panel solar que identifica la especie de cada visitante y la guarda en un álbum.',
        esp32: 'Detecta el posado, dispara una ráfaga y mide el nivel de semillas.',
        coral: 'Clasifica entre más de 900 especies con el modelo de iNaturalist.',
        extra: [['Cámara OV5640 de 5 MP', 9], ['Panel solar de 5 V con cargador LiPo', 5], ['Sensor PIR o barrera IR', 1.5]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'pir-hcsr501' }],
        repos: [R.pycoral, R.testdata, R.frigate, gh('mmcc-xx/WhosAtMyFeeder', 'Identificación de aves sobre Frigate')], docs: [doc('Coral: clasificación de imágenes', 'https://coral.ai/models/image-classification/')]
    },
    {
        id: 'acuario', titulo: 'Acuario inteligente y detección temprana de enfermedades', ambito: 'Acuariofilia', nivel: 'Avanzado', modelo: 'Seguimiento multiobjeto + CNN',
        resumen: 'Control térmico y de luz con vigilancia del patrón de nado para detectar letargo o punto blanco.',
        esp32: 'Mide la temperatura, regula el ciclo de luz y acciona las bombas de abono.',
        coral: 'Sigue a los peces y detecta nado anómalo o manchas.',
        extra: [['Cámara OV2640', 5], ['Sonda DS18B20 sumergible', 2], ['Bomba peristáltica de 12 V con relé', 6.5]],
        material: [{ id: ESP }, { id: 'coral-usb' }, { id: 'ds18b20' }, { id: 'rele-2ch' }],
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
        material: [{ id: ESP }, { id: 'ir-receptor' }, { id: 'ir-emisor' }, { id: 'oled-ssd1306' }, { id: 'pulsador' }],
        repos: [gh('crankyoldgit/IRremoteESP8266', 'Captura y envío de infrarrojos con cientos de protocolos'), gh('pepeangell5/IR_REMOTE_CARDPUTER_ADV', 'Captura y transmisión de señales IR'), R.mqtt], docs: []
    },
    {
        id: 'chat-nrf24', titulo: 'Mensajería punto a punto con nRF24L01+', ambito: 'Radio y comunicaciones', nivel: 'Intermedio', modelo: 'Sin modelo de IA',
        resumen: 'Dos placas se envían mensajes por radio de 2,4 GHz sin Wi-Fi, router ni cobertura.',
        esp32: 'Gestiona el transceptor por SPI, confirma la entrega de cada paquete y muestra los mensajes en la OLED.',
        material: [{ id: ESP, cantidad: 2 }, { id: 'nrf24l01', cantidad: 2 }, { id: 'oled-ssd1306', cantidad: 2 }, { id: 'pulsador', cantidad: 2 }],
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
        resumen: 'Mando de dos joysticks que envía las órdenes por ESP-NOW con muy poca latencia, y receptor con unidad inercial para estabilizar.',
        esp32: 'Lee los cuatro ejes con el ADC y los transmite por ESP-NOW; en el vehículo, fusiona el giroscopio y mezcla las órdenes de los motores.',
        aviso: 'Un dron con hélices corta: pruébalo primero sin ellas y vuela en interior o en zonas permitidas.',
        extra: [['ESP32-C3 SuperMini para el vehículo', 4], ['4 motores sin núcleo 8520 con hélices', 9], ['Batería LiPo 1S de 600 mAh', 6]],
        material: [{ id: ESP }, { id: 'joystick', cantidad: 2 }, { id: 'mpu6050' }, { id: 'oled-ssd1306' }],
        repos: [gh('pepeangell5/DRONE-FPV-ESP32C3-SUPERMINI', 'Dron casero controlado por ESP-NOW'), gh('electroniccats/mpu6050', 'MPU6050 con fusión por DMP'), R.idf], docs: [doc('ESP-NOW (Espressif)', 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/network/esp_now.html')]
    },
    {
        id: 'analizador-wifi', titulo: 'Analizador de ocupación Wi-Fi de 2,4 GHz', ambito: 'Radio y comunicaciones', nivel: 'Inicial', modelo: 'Sin modelo de IA',
        resumen: 'Escanea las redes visibles y dibuja la ocupación de cada canal para elegir el menos saturado para tu router.',
        esp32: 'Hace un escaneo pasivo, ordena las redes por canal y potencia, y pinta el gráfico en la pantalla TFT.',
        material: [{ id: ESP }, { id: 'tft-st7789' }, { id: 'pulsador', cantidad: 2 }],
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
        material: [{ id: ESP }, { id: 'cc1101' }, { id: 'oled-ssd1306' }],
        repos: [gh('LSatan/SmartRC-CC1101-Driver-Lib', 'Controlador del CC1101 para Arduino y ESP32'), gh('merbanan/rtl_433', 'Referencia de protocolos de sensores de 433 MHz'), R.mqtt], docs: []
    },
    {
        id: 'brazo-robot', titulo: 'Brazo robótico de cuatro ejes con joystick', ambito: 'Robótica móvil', nivel: 'Intermedio', modelo: 'Sin modelo de IA',
        resumen: 'Brazo de servos metálicos que se mueve con dos joysticks y repite secuencias grabadas.',
        esp32: 'Lee los joysticks, suaviza el movimiento y manda las posiciones al PCA9685 por I²C.',
        aviso: 'Cuatro MG996R pueden pedir más de 3 A: usa una fuente de 5 – 6 V de al menos 5 A en V+.',
        extra: [['Estructura de brazo de 4 ejes', 18], ['Fuente de 5 V / 5 A', 12]],
        material: [{ id: ESP }, { id: 'pca9685' }, { id: 'mg996r', cantidad: 4 }, { id: 'joystick', cantidad: 2 }],
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
    }
];

export const AMBITOS = [...new Set(PROYECTOS.map(p => p.ambito))];
