// Repositorios, documentación y herramientas de referencia, agrupados por
// tema. scripts/comprobar-enlaces.mjs verifica que todos responden.

const gh = (ruta, nota) => ({ t: ruta, url: 'https://github.com/' + ruta, nota, tipo: 'repo' });
const web = (t, url, nota) => ({ t, url, nota, tipo: 'doc' });

export const RECURSOS = [
    {
        id: 'esp32', titulo: 'ESP32-S3: firmware y herramientas', enlaces: [
            gh('espressif/arduino-esp32', 'Núcleo de Arduino para ESP32'),
            gh('espressif/esp-idf', 'Framework oficial de Espressif'),
            gh('platformio/platform-espressif32', 'Plataforma de PlatformIO para ESP32'),
            gh('espressif/esptool', 'Grabación y diagnóstico por puerto serie'),
            gh('espressif/esptool-js', 'esptool en el navegador (Web Serial)'),
            gh('esphome/esp-web-tools', 'Instalador de firmware desde una página web'),
            gh('ESP32Async/ESPAsyncWebServer', 'Servidor web asíncrono'),
            gh('bblanchon/ArduinoJson', 'JSON en microcontroladores'),
            web('Guía de la ESP32-S3-DevKitC-1', 'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/index.html', 'Pinout, esquema y dimensiones'),
            web('Guía de programación ESP-IDF (ESP32-S3)', 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/', 'Referencia de periféricos'),
            web('Documentación de arduino-esp32', 'https://docs.espressif.com/projects/arduino-esp32/en/latest/', 'API de Arduino para ESP32')
        ]
    },
    {
        id: 'ia', titulo: 'IA en el borde: Coral y TinyML', enlaces: [
            gh('google-coral/pycoral', 'API de Python del Edge TPU'),
            gh('google-coral/libedgetpu', 'Runtime del Edge TPU'),
            gh('google-coral/examples-camera', 'Ejemplos con cámara en vivo'),
            gh('google-coral/test_data', 'Modelos compilados para el Edge TPU'),
            gh('google-coral/project-posenet', 'Estimación de pose'),
            gh('espressif/esp-tflite-micro', 'TensorFlow Lite Micro para ESP32-S3'),
            gh('espressif/esp-nn', 'Núcleos vectoriales para redes neuronales'),
            gh('espressif/esp-sr', 'Reconocimiento de voz en el chip'),
            gh('espressif/esp-who', 'Detección y reconocimiento de caras'),
            gh('tensorflow/tflite-micro', 'TensorFlow Lite para microcontroladores'),
            gh('ultralytics/ultralytics', 'YOLO con exportación a Edge TPU'),
            gh('google-ai-edge/mediapipe', 'Manos, pose y gestos'),
            web('Coral: documentación', 'https://coral.ai/docs/', 'Guías del acelerador y del compilador'),
            web('Coral: modelos', 'https://coral.ai/models/', 'Modelos listos para el Edge TPU'),
            web('Compilador del Edge TPU', 'https://coral.ai/docs/edgetpu/compiler/', 'De TFLite INT8 a Edge TPU'),
            web('Coral USB Accelerator', 'https://gweb-coral-full.uc.r.appspot.com/products/accelerator', 'Ficha del producto')
        ]
    },
    {
        id: 'video', titulo: 'Vídeo y cámaras', enlaces: [
            gh('blakeblackshear/frigate', 'NVR con detección de objetos y Coral'),
            gh('AlexxIT/go2rtc', 'RTSP a WebRTC, MJPEG y HLS'),
            gh('bluenviron/mediamtx', 'Servidor y proxy RTSP'),
            gh('opencv/opencv', 'Captura y procesado de imagen')
        ]
    },
    {
        id: 'domotica', titulo: 'Domótica, MQTT y Shelly', enlaces: [
            gh('ALLTERCO/shelly-script-examples', 'Scripts para Shelly Gen2/Gen3'),
            gh('eclipse-mosquitto/mosquitto', 'Broker MQTT'),
            gh('knolleary/pubsubclient', 'Cliente MQTT para Arduino'),
            gh('esphome/esphome', 'Firmware declarativo para ESP32'),
            gh('home-assistant/core', 'Home Assistant'),
            gh('arendst/Tasmota', 'Firmware alternativo para dispositivos ESP'),
            web('API de Shelly Gen2+/Gen3', 'https://shelly-api-docs.shelly.cloud/gen2/', 'RPC, MQTT, WebSocket y scripts'),
            web('Shelly 1PM Mini Gen3', 'https://kb.shelly.cloud/knowledge-base/shelly-1pm-mini-gen3', 'Manual y esquemas de conexión')
        ]
    },
    {
        id: 'referencia', titulo: 'Herramientas de referencia', enlaces: [
            web('ESP32-Tools', 'https://www.pepeangell.dev/firmware/', 'Firmware y laboratorio de montaje para ESP32'),
            web('Schemalyzer', 'https://www.schemalyzer.com/es', 'Análisis de esquemas y calculadoras'),
            web('Electromarker', 'https://electromarker.com/es', 'Etiquetado de cuadros de distribución'),
            web('Wokwi', 'https://wokwi.com/', 'Simulador de ESP32 y Arduino en el navegador'),
            web('KiCad', 'https://www.kicad.org/', 'Diseño de esquemas y PCB, libre'),
            web('Pinout de Raspberry Pi', 'https://pinout.xyz/', 'Cabecera de 40 pines interactiva')
        ]
    },
    {
        id: 'cuadros', titulo: 'Electrotecnia y cuadros eléctricos', enlaces: [
            web('QElectroTech', 'https://qelectrotech.org/', 'Esquemas eléctricos, libre'),
            gh('qelectrotech/qelectrotech-source-mirror', 'Código de QElectroTech'),
            web('REBT: guía técnica de aplicación', 'https://industria.gob.es/Calidad-Industrial/seguridadindustrial/instalacionesindustriales/baja-tension/Paginas/guia-tecnica-aplicacion.aspx', 'Reglamento Electrotécnico para Baja Tensión')
        ]
    }
];

export const HOJA_DE_RUTA = [
    { fase: 'Versión 1', estado: 'hecho', titulo: 'Mesa de montaje de electrónica', puntos: ['Biblioteca con datos eléctricos por pin y dibujos a escala', 'Cableado con enrutado automático y comprobación de reglas eléctricas', 'Lista de materiales, lista de redes y mapa de pines para el firmware', 'Proyectos cargables, fichas técnicas y calculadoras'] },
    { fase: 'Versión 2', estado: 'siguiente', titulo: 'Esquema y documentación', puntos: ['Vista de esquema con símbolos normalizados enlazada a la mesa', 'Editor de componentes propios', 'Informe del montaje en PDF: esquema, materiales y reglas'] },
    { fase: 'Versión 3', estado: 'previsto', titulo: 'Cuadros eléctricos de control y potencia', puntos: ['Envolvente y carril DIN con aparamenta modular a escala', 'Esquema unifilar y multifilar con referencias cruzadas', 'Cálculo de líneas: intensidad, caída de tensión y protecciones', 'Etiquetado de aparatos, bornas y cables'] },
    { fase: 'Versión 4', estado: 'previsto', titulo: 'Control y puesta en marcha', puntos: ['Esquemas de mando: contactores, relés y PLC', 'Regleteros y listados de cableado', 'Bibliotecas de fabricante e importación de catálogos'] }
];
