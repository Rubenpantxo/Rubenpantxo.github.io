// Fichas ampliadas de componentes: lo que enseña la vista 3/4.
//
// Cada entrada, por id de componente, trae:
//   modelo    el modelo 3D que pinta ui/vista3d.js (caja, placa y piezas)
//   claves    cifras «en corto»
//   fuertes / cuidado   puntos fuertes y errores típicos
//   codigos   primer código: bloques listos para copiar
//   flasheo   cómo meterle un programa propio (o por qué no se puede)
//   ideas     dónde brilla
//
// Coordenadas del modelo: x e z en píxeles del dibujo en planta del
// componente (ui/dibujos.js, 10 px por cada 2,54 mm), así los tornillos y
// botones caen justo donde los pinta la mesa; tamaños y alturas en mm.
// Las piezas van sobre la placa salvo `en: 'tapa'` (se mueven con la carcasa)
// o `abajo: true` (cara inferior de la placa). `asoma` alarga la pieza hasta
// asomar por la carcasa cerrada (tornillos, botones, LED).

import { PLATFORMIO_INI, PLATFORMIO_CYD, PLATFORMIO_C3, PLATFORMIO_STAMP, conLibrerias } from '../core/exportar.js';

const ESPHOME_SHELLY = `# ESPHome · Shelly 1 Mini Gen3 (ESP32-C3, 8 MB)
# Pines de devices.esphome.io/devices/shelly-1-mini-gen3
esphome:
  name: shelly-1-mini
  friendly_name: Shelly 1 Mini

esp32:
  variant: esp32c3
  flash_size: 8MB
  framework:
    type: esp-idf

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
  ap:            # punto de acceso de rescate si no encuentra la Wi-Fi

logger:
api:             # Home Assistant
ota:
  - platform: esphome
captive_portal:

output:
  - platform: gpio
    id: salida_rele
    pin: GPIO7

switch:
  - platform: output
    id: rele
    name: Relé
    output: salida_rele

binary_sensor:
  - platform: gpio       # interruptor de pared en SW
    name: Interruptor
    pin: GPIO10
    filters:
      - delayed_on_off: 50ms
    on_state:
      - switch.toggle: rele
  - platform: gpio       # botón del propio Shelly
    name: Botón
    pin:
      number: GPIO1
      inverted: true
      mode:
        input: true
        pullup: true

sensor:
  - platform: ntc        # temperatura interna
    sensor: resistencia_ntc
    name: Temperatura interna
    calibration:
      b_constant: 3350
      reference_resistance: 10kOhm
      reference_temperature: 298.15K
  - platform: resistance
    id: resistencia_ntc
    sensor: lectura_ntc
    configuration: DOWNSTREAM
    resistor: 10kOhm
  - platform: adc
    id: lectura_ntc
    pin: GPIO3
    attenuation: 12db

status_led:
  pin:
    number: GPIO0
    inverted: true
`;

const SKETCH_SHELLY = `// Shelly 1 Mini Gen3 con firmware propio (ESP32-C3, 8 MB de flash).
// Pines (devices.esphome.io): LED GPIO0 activo a nivel bajo, botón GPIO1,
// relé GPIO7 y entrada SW GPIO10. Primer sketch: el botón y el interruptor
// de pared conmutan el relé y lo cuentan por el puerto serie.
#include <Arduino.h>

constexpr int PIN_LED = 0, PIN_BOTON = 1, PIN_RELE = 7, PIN_SW = 10;
bool encendido = false;

void aplicar() {
  digitalWrite(PIN_RELE, encendido ? HIGH : LOW);
  digitalWrite(PIN_LED, encendido ? LOW : HIGH);   // LED activo a nivel bajo
  Serial.println(encendido ? "Rele ON" : "Rele OFF");
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELE, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BOTON, INPUT_PULLUP);
  pinMode(PIN_SW, INPUT);
  aplicar();
}

void loop() {
  static int botonAntes = HIGH;
  static int swAntes = digitalRead(PIN_SW);
  const int boton = digitalRead(PIN_BOTON);
  const int sw = digitalRead(PIN_SW);
  if (botonAntes == HIGH && boton == LOW) { encendido = !encendido; aplicar(); }
  if (sw != swAntes) { encendido = !encendido; aplicar(); }  // cada cambio del interruptor conmuta
  botonAntes = boton;
  swAntes = sw;
  delay(30);
}
`;

const PIO_SHELLY = `; platformio.ini · Shelly 1 Mini Gen3 (ESP32-C3 con 8 MB)
[env:shelly-1-mini-gen3]
platform = espressif32
board = esp32-c3-devkitm-1
framework = arduino
board_build.flash_size = 8MB
board_upload.flash_size = 8MB
board_build.partitions = default_8MB.csv
monitor_speed = 115200
`;

const SKETCH_MINI_D = `// Sonoff MINI-D con firmware propio (ESP32). Primer sketch: el botón
// conmuta el contacto seco y el LED azul indica el estado.
// OJO: pines tomados de la MINIR4, su placa hermana (botón GPIO0,
// LED GPIO19 activo a nivel bajo, relé GPIO26, S2 GPIO27). Compruébalos en
// tu MINI-D con el polímetro antes de fiarte de ellos.
#include <Arduino.h>

constexpr int PIN_BOTON = 0, PIN_LED = 19, PIN_RELE = 26, PIN_S2 = 27;
bool cerrado = false;

void aplicar() {
  digitalWrite(PIN_RELE, cerrado ? HIGH : LOW);
  digitalWrite(PIN_LED, cerrado ? LOW : HIGH);
  Serial.println(cerrado ? "COM-NO cerrado" : "COM-NO abierto");
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELE, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BOTON, INPUT_PULLUP);
  pinMode(PIN_S2, INPUT_PULLUP);    // interruptor externo entre S1 (masa) y S2
  aplicar();
}

void loop() {
  static int botonAntes = HIGH;
  static int s2Antes = digitalRead(PIN_S2);
  const int boton = digitalRead(PIN_BOTON);
  const int s2 = digitalRead(PIN_S2);
  if (botonAntes == HIGH && boton == LOW) { cerrado = !cerrado; aplicar(); }
  if (s2 != s2Antes) { cerrado = !cerrado; aplicar(); }
  botonAntes = boton;
  s2Antes = s2;
  delay(30);
}
`;

const ESPHOME_MINI_D = `# ESPHome · Sonoff MINI-D (ESP32-D0WDR2-V3)
# Pines tomados de la MINIR4 (placa hermana): compruébalos antes.
esphome:
  name: mini-d
  friendly_name: MINI-D

esp32:
  board: esp32dev
  framework:
    type: esp-idf

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
  ap:

logger:
api:
ota:
  - platform: esphome
captive_portal:

output:
  - platform: gpio
    id: contacto
    pin: GPIO26

switch:
  - platform: output
    id: rele
    name: Contacto seco
    output: contacto
    restore_mode: ALWAYS_OFF   # una caldera o una puerta no deben arrancar solas

binary_sensor:
  - platform: gpio
    name: Botón
    pin:
      number: GPIO0
      inverted: true
    on_press:
      - switch.toggle: rele
  - platform: gpio
    name: Interruptor S1-S2
    pin:
      number: GPIO27
      inverted: true
      mode:
        input: true
        pullup: true
    filters:
      - delayed_on_off: 50ms

status_led:
  pin:
    number: GPIO19
    inverted: true
`;

const PIO_MINI_D = `; platformio.ini · Sonoff MINI-D (ESP32)
[env:sonoff-mini-d]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
`;

const Z2M_TERMINAL = `# Zigbee2MQTT + Mosquitto. Pon la IP de tu broker:
BROKER=IP_DE_TU_BROKER

# 1. Abre el emparejamiento 3 minutos
mosquitto_pub -h "$BROKER" -t zigbee2mqtt/bridge/request/permit_join -m '{"time": 180}'

# 2. Mantén pulsado 5 s el botón del ZBMINIR2 (o conmuta 10 veces su
#    interruptor) y busca en el registro su dirección 0x...

# 3. Ponle nombre
mosquitto_pub -h "$BROKER" -t zigbee2mqtt/bridge/request/device/rename \\
  -m '{"from": "0x00124b00aabbccdd", "to": "luz_pasillo"}'

# 4. Pruébalo
mosquitto_pub -h "$BROKER" -t zigbee2mqtt/luz_pasillo/set -m '{"state": "TOGGLE"}'
mosquitto_pub -h "$BROKER" -t zigbee2mqtt/luz_pasillo/set -m '{"state": "ON", "on_time": 300}'
mosquitto_sub -h "$BROKER" -t zigbee2mqtt/luz_pasillo -v
`;

const SKETCH_Z2M = `// ESP32-S3: un pulsador en GPIO4 conmuta el ZBMINIR2 a través de
// Zigbee2MQTT. El ESP32 no habla Zigbee: publica en el broker MQTT y
// Zigbee2MQTT se lo traduce al relé.
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID  = "TU_WIFI";
const char* WIFI_CLAVE = "TU_CLAVE";
const char* BROKER     = "IP_DEL_BROKER";           // IP de Mosquitto
const char* TEMA       = "zigbee2mqtt/luz_pasillo"; // nombre que le diste
constexpr int PIN_PULSADOR = 4;                     // pulsador a GND

WiFiClient red;
PubSubClient mqtt(red);

void alRecibir(char* tema, byte* datos, unsigned int largo) {
  Serial.printf("%s -> %.*s\\n", tema, (int)largo, (const char*)datos);
}

void conectar() {
  while (!mqtt.connected()) {
    if (mqtt.connect("esp32s3-pulsador")) mqtt.subscribe(TEMA);
    else delay(2000);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PULSADOR, INPUT_PULLUP);
  WiFi.begin(WIFI_SSID, WIFI_CLAVE);
  while (WiFi.status() != WL_CONNECTED) delay(300);
  mqtt.setServer(BROKER, 1883);
  mqtt.setBufferSize(1024);      // el estado que publica Z2M supera los 256 bytes
  mqtt.setCallback(alRecibir);
}

void loop() {
  conectar();
  mqtt.loop();
  static int antes = HIGH;
  const int ahora = digitalRead(PIN_PULSADOR);
  if (antes == HIGH && ahora == LOW) {
    mqtt.publish((String(TEMA) + "/set").c_str(), "{\\"state\\":\\"TOGGLE\\"}");
  }
  antes = ahora;
  delay(20);
}
`;

export const FICHAS = {
    // ===================================================== Shelly 1 Mini Gen3
    'shelly-1-mini-g3': {
        claves: [['Procesador', 'ESP32-C3'], ['Flash', '8 MB'], ['Contacto', 'Seco · 8 A'], ['Radio', 'Wi-Fi + BLE'], ['Programable', 'Scripts y firmware'], ['Medidas', '34 × 29 × 16 mm']],
        modelo: {
            caja: { w: 34, d: 29, h: 16, r: 4, color: '#2a6fe0', rect: [2, 1, 136, 117, 10], fondo: ['Shelly 1 Mini Gen3', 'S3SW-001X8EU', '110-240 VAC · 50/60 Hz'] },
            placa: { y: 2, color: '#1d2633', margen: 2 },
            piezas: [
                { n: 1, nombre: 'Módulo ESP-Shelly-C38F (ESP32-C3)', tipo: 'blindaje', x: 106, z: 53, w: 10, d: 10, h: 2, rotulo: 'C38F',
                    texto: 'El cerebro: un ESP32-C3 RISC-V a 160 MHz con 8 MB de flash bajo una tapa metálica. Ejecuta el firmware de Shelly con sus scripts, o el tuyo si lo flasheas.' },
                { n: 2, nombre: 'Antena impresa de 2,4 GHz', tipo: 'antena', x: 106, z: 89, w: 10, d: 3.5,
                    texto: 'Una pista de cobre en zigzag: Wi-Fi y Bluetooth salen por aquí. Deja la caja de mecanismo lo más libre de metal posible a su alrededor.' },
                { n: 3, nombre: 'Relé de contacto seco', tipo: 'rele', x: 56, z: 53, w: 12, d: 10, h: 10.5, color: '#202329', rotulo: '8A 240VAC',
                    texto: 'Cierra el contacto entre I y O. Ese contacto no toca la alimentación del Shelly: por eso conmuta 230 V, 24 V o la entrada de mando de una puerta.' },
                { n: 4, nombre: 'Fuente conmutada 230 V → 3,3 V', tipo: 'grupo', x: 42, z: 93, texto: 'Saca de la red los 3,3 V que necesita el ESP32-C3. Es la razón de que el Shelly gaste menos de 1,2 W en reposo.',
                    formas: [{ tipo: 'condensador', dx: -5, dz: 0, r: 2.4, h: 7, color: '#243a8f' }, { tipo: 'bobina', dx: .5, dz: 0, r: 2.2, h: 3 }, { tipo: 'chip', dx: 5, dz: 0, w: 3, d: 2.4, h: 1 }] },
                { n: 5, nombre: 'Sensor de temperatura (NTC)', tipo: 'smd', x: 76, z: 81, w: 1.6, d: .8, h: .6, color: '#c9a66b',
                    texto: 'Mide la temperatura interna. Si se calienta de más, el firmware abre el relé para proteger la instalación.' },
                { n: 6, nombre: 'Bornas O e I del contacto seco', tipo: 'borna', z: 15, polos: [20, 40], d: 7, h: 8, color: '#1a1b1e',
                    texto: 'El interruptor aislado. Lleva a I lo que quieras conmutar (fase, 24 V o el común de un mando) y saca por O hacia la carga.' },
                { n: 7, nombre: 'Bornas SW, L y N', tipo: 'borna', z: 15, polos: [70, 100, 120], d: 7, h: 8, color: '#1a1b1e',
                    texto: 'L y N alimentan el Shelly. SW es la entrada del interruptor o pulsador de la pared, conmutada a fase.' },
                { n: 8, nombre: 'Conector de programación (1,27 mm)', tipo: 'pads', x: 12, z: 55, etiquetas: ['RST', '3V3', 'RX', 'TX', 'BOOT', 'GND'], vertical: true,
                    texto: 'Seis contactos de paso 1,27 mm para un adaptador USB-serie a 3,3 V: es la puerta de entrada para hacer copia del firmware o grabar ESPHome o tu sketch.' },
                { n: 9, nombre: 'Botón de reinicio', tipo: 'boton', x: 80, z: 101, r: 1.4, color: '#e8eaed', asoma: true,
                    texto: 'Pulsado brevemente conmuta el relé; mantenido 10 s devuelve el Shelly a fábrica.' },
                { n: 10, nombre: 'LED de estado', tipo: 'led', x: 94, z: 103, color: '#4c9dff', asoma: true,
                    texto: 'Indica la conexión Wi-Fi y el modo de punto de acceso para la primera configuración.' }
            ]
        },
        fuertes: [
            'Contacto seco: conmuta cualquier cosa sin mezclar tensiones, también la entrada de mando de una puerta o una caldera',
            'API local completa: RPC por HTTP, WebSocket y MQTT sin depender de la nube',
            'Scripts mJS en el propio firmware: lógica que corre dentro del relé aunque se caiga el servidor',
            'ESP32-C3 con 8 MB y conector de programación: se puede flashear con ESPHome o con tu sketch'
        ],
        cuidado: [
            'Va a 230 V: se instala con el circuito sin tensión, dentro de una caja y con magnetotérmico',
            'Con cargas inductivas grandes (motores, transformadores) el contacto de 8 A se queda corto: usa un contactor',
            'Nunca lo programes conectado a la red: aliméntalo solo con el adaptador USB-serie a 3,3 V',
            'Haz copia del firmware original antes de flashear: sin ella no vuelves a la app de Shelly'
        ],
        codigos: [
            { titulo: 'Script en el firmware original: se apaga solo', lenguaje: 'Shelly Script (mJS)', nota: 'Sin flashear nada: en la web del Shelly, Scripts → Añadir script, pega, guarda y pulsa Iniciar.', texto: `// Cada vez que el relé se enciende, lo apaga a los 10 minutos.
let MINUTOS = 10;
let temporizador = null;

Shelly.addStatusHandler(function (e) {
  if (e.component !== "switch:0" || typeof e.delta.output === "undefined") return;
  if (temporizador !== null) {
    Timer.clear(temporizador);
    temporizador = null;
  }
  if (e.delta.output === true) {
    temporizador = Timer.set(MINUTOS * 60 * 1000, false, function () {
      Shelly.call("Switch.Set", { id: 0, on: false });
      temporizador = null;
    });
    print("Encendido: se apaga en " + MINUTOS + " min");
  }
});
` },
            { titulo: 'Desde tu red: API RPC', lenguaje: 'Terminal', nota: 'Pon en SHELLY la IP de tu Shelly. Funciona desde el PC, la Raspberry o un ESP32 con HTTPClient.', texto: `SHELLY=IP_DE_TU_SHELLY

curl "http://$SHELLY/rpc/Switch.Set?id=0&on=true"
curl "http://$SHELLY/rpc/Switch.Toggle?id=0"
curl "http://$SHELLY/rpc/Switch.GetStatus?id=0"

# Pulso de 1 s: ideal para la entrada de mando de una puerta
curl "http://$SHELLY/rpc/Switch.Set?id=0&on=true&toggle_after=1"
` },
            { titulo: 'Primer sketch con firmware propio', lenguaje: 'Arduino C++', archivo: 'src/main.cpp', nota: 'Compílalo con PlatformIO y el platformio.ini de abajo. Antes, lee los pasos de flasheo.', texto: SKETCH_SHELLY },
            { titulo: 'platformio.ini', lenguaje: 'INI', archivo: 'platformio.ini', texto: PIO_SHELLY },
            { titulo: 'ESPHome para Home Assistant', lenguaje: 'YAML', archivo: 'shelly-1-mini.yaml', texto: ESPHOME_SHELLY }
        ],
        flasheo: {
            titulo: 'Grabarle tu programa',
            resumen: 'Admite programa propio: es un ESP32-C3 con conector de programación. Haz siempre copia del firmware de fábrica primero.',
            pasos: [
                'Desconéctalo de la red. A partir de aquí solo lo alimenta el adaptador USB-serie a 3,3 V.',
                'Conecta el adaptador al conector de 1,27 mm: 3V3, GND, TX del adaptador a RX del Shelly y RX a TX.',
                'Pon BOOT (GPIO9) a GND mientras das alimentación o mientras sueltas RST: entra en modo descarga.',
                'Haz la copia: `esptool.py --chip esp32c3 read_flash 0 0x800000 shelly-1-mini-g3.bin`.',
                'Graba tu sketch con `pio run -t upload` o ESPHome con `esphome run shelly-1-mini.yaml`.',
                'Para volver al firmware de Shelly: `esptool.py --chip esp32c3 write_flash 0 shelly-1-mini-g3.bin`.'
            ]
        },
        ideas: [
            'Abrir la puerta del garaje desde el móvil: contacto I–O en paralelo con el pulsador del cuadro CAME',
            'Encender la caldera desde Home Assistant a través de su entrada de termostato',
            'Luz del pasillo que se apaga sola con un script de 10 minutos',
            'Avisar de movimiento: la salida del detector Ettroit a la entrada SW y un script que publica por MQTT'
        ]
    },

    // ========================================================= Sonoff ZBMINIR2
    'sonoff-zbminir2': {
        claves: [['Procesador', 'EFR32MG21'], ['Radio', 'Zigbee 3.0'], ['Carga', '10 A · 2400 W'], ['Neutro', 'Necesario'], ['Papel en la red', 'Repetidor'], ['En casa', '2 unidades']],
        modelo: {
            caja: { w: 39.5, d: 33, h: 16.8, r: 4.5, color: '#f2f3f5', fondo: ['SONOFF ZBMINIR2', 'Zigbee Smart Switch', '100-240V~ 50/60Hz 10A Max'] },
            placa: { y: 2, color: '#1d5e3a', margen: 2 },
            piezas: [
                { n: 1, nombre: 'Microcontrolador Zigbee EFR32MG21', tipo: 'chip', x: 42, z: 42, w: 5, d: 5, h: .9, rotulo: 'EFR32',
                    texto: 'Un Cortex-M33 de Silicon Labs con la radio de 2,4 GHz dentro. Lleva el firmware Zigbee 3.0 de Sonoff y se actualiza por el aire (OTA).' },
                { n: 2, nombre: 'Antena impresa de 2,4 GHz', tipo: 'antena', x: 42, z: 16, w: 18, d: 4.5,
                    texto: 'La pista de cobre por la que habla con el coordinador y con los demás equipos Zigbee. Mejor lejos de cajas metálicas.' },
                { n: 3, nombre: 'Relé de 10 A', tipo: 'rele', x: 88, z: 50, w: 14, d: 11, h: 11.5, color: '#25272c', rotulo: '10A 250VAC',
                    texto: 'Conmuta la fase de L in hacia L out. No es un contacto seco: la salida siempre lleva la tensión de red.' },
                { n: 4, nombre: 'Fuente conmutada 230 V → 3,3 V', tipo: 'grupo', x: 56, z: 84, texto: 'Alimenta el microcontrolador desde la red. Por eso necesita neutro: sin él no tendría de dónde sacar corriente con la luz apagada.',
                    formas: [{ tipo: 'condensador', dx: -7, dz: 0, r: 3, h: 8, color: '#243a8f' }, { tipo: 'bobina', dx: 1, dz: 0, r: 3, h: 3.5 }, { tipo: 'chip', dx: 8, dz: 0, w: 4, d: 3, h: 1 }] },
                { n: 5, nombre: 'Bornas de red: N, N, L out y L in', tipo: 'borna', z: 113, polos: [20, 40, 60, 80], d: 6.5, h: 9, color: '#eceef1',
                    texto: 'Fase de entrada en L in, la lámpara entre L out y N. Los dos N están unidos: uno viene del cuadro y el otro va a la carga.' },
                { n: 6, nombre: 'Bornas S1 y S2', tipo: 'borna', z: 113, polos: [110, 130], d: 6.5, h: 9, color: '#eceef1',
                    texto: 'Para el interruptor o pulsador de la pared, sin tensión. No están aisladas de la red: nada de unirlas a un ESP32.' },
                { n: 7, nombre: 'Botón de emparejamiento', tipo: 'boton', x: 132, z: 34, r: 2.6, asoma: true,
                    texto: 'Una pulsación conmuta la luz; 5 s lo pone en modo emparejamiento; tres seguidas cambian el tipo de interruptor externo.' },
                { n: 8, nombre: 'LED verde de estado', tipo: 'led', x: 132, z: 58, color: '#3ccf6a', asoma: true,
                    texto: 'Fijo: conectado al coordinador. Parpadeo lento: emparejando. Parpadeo rápido: ha perdido la red Zigbee.' }
            ]
        },
        fuertes: [
            'Zigbee 3.0 estándar: funciona con Zigbee2MQTT, ZHA, Home Assistant y la pasarela de eWeLink',
            'Hace de repetidor: cada ZBMINIR2 que instalas mejora la cobertura de los sensores a pilas',
            'Muy pequeño (39,5 × 33 mm): cabe detrás de un mecanismo en una caja universal',
            'Modo desacoplado: el interruptor de pared puede mandar órdenes sin cortar la luz (para bombillas inteligentes)'
        ],
        cuidado: [
            'Necesita neutro en la caja: sin él no se alimenta',
            'Sin coordinador Zigbee no hace nada: hace falta un adaptador USB y Zigbee2MQTT o ZHA',
            'S1 y S2 no están aislados de la red: solo un interruptor sin tensión entre ellos',
            'No admite programa propio: el EFR32MG21 viene con el firmware de Sonoff'
        ],
        codigos: [
            { titulo: 'Emparejar y probar con Zigbee2MQTT', lenguaje: 'Terminal', nota: 'Con Mosquitto y Zigbee2MQTT en la Raspberry Pi o el PC y un coordinador Zigbee USB.', texto: Z2M_TERMINAL },
            { titulo: 'Un ESP32-S3 que lo enciende por MQTT', lenguaje: 'Arduino C++', archivo: 'src/main.cpp', nota: 'Librería knolleary/PubSubClient. El ESP32 no habla Zigbee: Zigbee2MQTT traduce sus mensajes.', texto: SKETCH_Z2M }
        ],
        flasheo: {
            titulo: 'Programarlo',
            resumen: 'No admite programa propio: el EFR32MG21 trae el firmware Zigbee de Sonoff y se programa «desde fuera», con mensajes MQTT a Zigbee2MQTT o con automatizaciones de Home Assistant.',
            pasos: [
                'Monta un coordinador Zigbee: un adaptador USB (Sonoff Dongle o similar) en la Raspberry Pi o el PC con Zigbee2MQTT o ZHA.',
                'Abre el emparejamiento y mantén el botón del ZBMINIR2 5 s (o conmuta 10 veces el interruptor de la pared).',
                'Actualiza su firmware desde la pestaña OTA de Zigbee2MQTT cuando haya versión nueva.',
                'Ajusta el comportamiento al volver la luz (`power_on_behavior`), el modo pulso o el modo desacoplado con mensajes `/set`.'
            ]
        },
        ideas: [
            'Luces de salón y dormitorio con escenas en Home Assistant',
            'Repetidores repartidos por la casa para los sensores Zigbee a pilas',
            'Interruptor de pared que manda órdenes sin cortar la luz (modo desacoplado) para bombillas inteligentes',
            'Apagado automático con `on_time`: luz del trastero que se apaga a los 5 minutos'
        ]
    },

    // ============================================================ Sonoff MINI-D
    'sonoff-mini-d': {
        claves: [['Procesador', 'ESP32'], ['Contacto', 'Seco NO/NC'], ['Carga', '24 V ⎓ 2 A'], ['Alimentación', 'CA o CC'], ['Radio', 'Wi-Fi · Matter'], ['Medidas', '43 × 41 × 21,5 mm']],
        modelo: {
            caja: { w: 43, d: 41, h: 21.5, r: 5, color: '#f2f3f5', fondo: ['SONOFF MINI-D', 'Wi-Fi Smart Switch · Matter', '100-240V~ 0.1A  12-48V⎓1A'] },
            placa: { y: 2.4, color: '#1b4f9c', margen: 2.2 },
            piezas: [
                { n: 1, nombre: 'ESP32-D0WDR2-V3 bajo almohadilla térmica', tipo: 'chip', x: 66, z: 72, w: 8, d: 8, h: 1.3, color: '#e98bb0', rotulo: 'ESP32',
                    texto: 'El microcontrolador de doble núcleo a 240 MHz, tapado con una almohadilla rosa que aísla y reparte el calor. Lleva Wi-Fi y el firmware Matter.' },
                { n: 2, nombre: 'Antena impresa de 2,4 GHz', tipo: 'antena', x: 22, z: 74, w: 4.5, d: 18,
                    texto: 'La pista en zigzag del borde: por aquí sale el Wi-Fi.' },
                { n: 3, nombre: 'Cristal de 40 MHz', tipo: 'cristal', x: 78, z: 92, w: 3.2, d: 2.5, h: .8,
                    texto: 'El reloj del ESP32: de su precisión dependen el Wi-Fi y los tiempos del programa.' },
                { n: 4, nombre: 'Relé FANHAR W11-1C2STL', tipo: 'rele', x: 108, z: 66, w: 12.5, d: 10, h: 10, color: '#2b5fb4', rotulo: 'W11-1C2STL',
                    texto: 'Relé conmutado (un común y dos contactos): de ahí salen COM, NO y NC, aislados del resto de la placa.' },
                { n: 5, nombre: 'Fuente de red 230 V CA', tipo: 'grupo', x: 52, z: 104, texto: 'Convierte la red en la tensión de trabajo cuando lo alimentas por N y L.',
                    formas: [{ tipo: 'condensador', dx: -7.5, dz: 0, r: 3, h: 9, color: '#243a8f' }, { tipo: 'bobina', dx: 0, dz: 0, r: 3, h: 3.5 }, { tipo: 'chip', dx: 6, dz: 0, w: 4, d: 3, h: 1 }] },
                { n: 6, nombre: 'Regulador de 12 – 48 V CC', tipo: 'grupo', x: 120, z: 100, texto: 'La otra vía de alimentación: baja la continua de DC+ y DC− a los 3,3 V del ESP32.',
                    formas: [{ tipo: 'bobina', dx: -3, dz: 0, r: 2.6, h: 3 }, { tipo: 'chip', dx: 4, dz: 0, w: 3, d: 3, h: 1 }] },
                { n: 7, nombre: 'Bornas NO, COM y NC', tipo: 'borna', z: 19, polos: [50, 80, 110], d: 8, h: 10, color: '#eceef1',
                    texto: 'El contacto seco. Entre COM y NO se cierra al activar el relé; entre COM y NC se abre. Máximo 24 V ⎓ 2 A.' },
                { n: 8, nombre: 'Bornas N, L, S1, S2, DC+ y DC−', tipo: 'borna', z: 141, polos: [30, 50, 70, 90, 110, 130], d: 8, h: 10, color: '#eceef1',
                    texto: 'Alimentación por red (N, L) o por continua (DC+, DC−), y el interruptor externo entre S1 y S2.' },
                { n: 9, nombre: 'Botón', tipo: 'boton', x: 146, z: 62, r: 2.6, asoma: true,
                    texto: 'Una pulsación conmuta el contacto; 5 s lo pone en emparejamiento. Con firmware propio, mantenido al enchufar entra en modo descarga (GPIO0).' },
                { n: 10, nombre: 'LED azul de estado', tipo: 'led', x: 146, z: 86, color: '#3b82f6', asoma: true,
                    texto: 'Fijo: en línea. Dos destellos cortos y uno largo: emparejando.' },
                { n: 11, nombre: 'Puntos de programación (UART)', tipo: 'pads', x: 100, z: 112, etiquetas: ['3V3', 'GND', 'TX', 'RX'],
                    texto: 'Dónde soldar el adaptador USB-serie para flashearlo. La posición es orientativa: identifícalos en tu placa con la serigrafía o el polímetro.' }
            ]
        },
        fuertes: [
            'Contacto seco conmutado (NO y NC): da órdenes a calderas, motores de puerta y válvulas sin mezclar tensiones',
            'Se alimenta a 230 V CA o a 12 – 48 V CC: sirve en cuadros de baja tensión sin red cerca',
            'Matter sobre Wi-Fi: se integra en Home Assistant, Google, Alexa o Apple sin nube',
            'Lleva un ESP32 normal: con soldadura se puede flashear con ESPHome o con tu sketch'
        ],
        cuidado: [
            'El contacto es pequeño: 24 V ⎓ 2 A resistivos o 8 W de motor. Nunca conmutes 230 V con él',
            'S1 y S2 son para un interruptor sin tensión: no les lleves fase ni los unas a la electrónica',
            'Si lo flasheas pierdes Matter y eWeLink: haz copia del firmware antes',
            'Los pines del sketch y de ESPHome vienen de la MINIR4: compruébalos en tu placa'
        ],
        codigos: [
            { titulo: 'Primer sketch con firmware propio', lenguaje: 'Arduino C++', archivo: 'src/main.cpp', nota: 'Pines de la MINIR4 sin confirmar en la MINI-D: compruébalos antes de grabarlo.', texto: SKETCH_MINI_D },
            { titulo: 'platformio.ini', lenguaje: 'INI', archivo: 'platformio.ini', texto: PIO_MINI_D },
            { titulo: 'ESPHome para Home Assistant', lenguaje: 'YAML', archivo: 'mini-d.yaml', texto: ESPHOME_MINI_D }
        ],
        flasheo: {
            titulo: 'Grabarle tu programa',
            resumen: 'Admite programa propio con soldadura: es un ESP32 sin conector, así que hay que abrirlo y soldar el adaptador. Si te basta con Matter o eWeLink, no hace falta.',
            pasos: [
                'Desconéctalo de la red y de la continua. Solo lo alimentará el adaptador USB-serie a 3,3 V.',
                'Ábrelo y suelda 3V3, GND, TX y RX al adaptador (TX con RX cruzados).',
                'Mantén pulsado su botón (GPIO0) mientras le das alimentación: entra en modo descarga.',
                'Haz la copia: `esptool.py --chip esp32 read_flash 0 ALL mini-d-original.bin`.',
                'Graba tu sketch con `pio run -t upload` o ESPHome con `esphome run mini-d.yaml`.',
                'Para volver a Matter: `esptool.py --chip esp32 write_flash 0 mini-d-original.bin`.'
            ]
        },
        ideas: [
            'Mandar la caldera desde Home Assistant por su entrada de termostato (contacto seco)',
            'Motor de persiana o de ventana de 24 V CC con el contacto NO/NC',
            'Válvula de riego de 12/24 V CC con alimentación por continua',
            'Pulsador de la puerta del garaje en paralelo con el del cuadro CAME'
        ]
    },

    // ======================================================== Ettroit LN1800
    'ettroit-ln1800': {
        claves: [['Detector', 'PIR'], ['Tiempo', '10 s – 3 min'], ['Carga', '4 A · cos φ 1'], ['Red', '230 V'], ['Tamaño', '1 módulo'], ['Programable', 'No']],
        modelo: {
            caja: { tipo: 'mecanismo', w: 22.5, d: 45, h: 30, r: 2, color: '#1b1c1f', cuerpo: '#2a2c31', frente: 4, fondo: ['ETTROIT LN1800', '230V~ 50Hz IP20', '4A 230V~ cosφ=1 · 10s-3min'] },
            placa: { y: 5, color: '#1d5e3a', margen: 3.4 },
            piezas: [
                { n: 1, nombre: 'Lente de Fresnel', tipo: 'lente', x: 45, z: 54, r: 6.2, en: 'tapa',
                    texto: 'La cúpula blanca está tallada en facetas: cada una enfoca una zona de la habitación sobre el sensor. Así una persona que cruza produce pulsos de calor.' },
                { n: 2, nombre: 'Sensor piroeléctrico (PIR)', tipo: 'sensor', x: 45, z: 54, r: 4.2, h: 18,
                    texto: 'Detecta cambios de radiación infrarroja, no la temperatura en sí: por eso solo ve lo que se mueve. Va subido en patas para quedar justo detrás de la lente.' },
                { n: 3, nombre: 'Rueda TIME', tipo: 'pot', x: 27, z: 116, r: 2.2, asoma: true,
                    texto: 'Cuánto tiempo sigue encendida la luz tras el último movimiento: de 10 s a 3 min.' },
                { n: 4, nombre: 'Rueda LUX', tipo: 'pot', x: 63, z: 116, r: 2.2, asoma: true,
                    texto: 'Umbral de luz: por encima de él no enciende. Al máximo, enciende también de día.' },
                { n: 5, nombre: 'Sensor de luz ambiente', tipo: 'ldr', x: 66, z: 82, r: 2,
                    texto: 'Mide cuánta luz hay para comparar con la rueda LUX.' },
                { n: 6, nombre: 'Electrónica de detección', tipo: 'chip', x: 26, z: 82, w: 4.5, d: 4.5, h: 1,
                    texto: 'Amplifica la señal del PIR, la filtra y cuenta el tiempo de encendido.' },
                { n: 7, nombre: 'Relé de 4 A', tipo: 'rele', x: 45, z: 138, w: 11, d: 6.5, h: 10, color: '#20242b', rotulo: '4A',
                    texto: 'Conmuta la fase hacia la lámpara. 4 A con cos φ = 1: cargas resistivas; con LED deja margen.' },
                { n: 8, nombre: 'Bornas L, N y carga', tipo: 'borna', z: 100, polos: [20, 45, 70], d: 6, color: '#9aa0a8', abajo: true, asoma: true,
                    texto: 'En la parte trasera: fase y neutro de la caja y la salida hacia la lámpara.' }
            ]
        },
        fuertes: [
            'Sin programar nada: dos ruedas y listo',
            'No enciende de día gracias al umbral de luz',
            'Cabe en el hueco de un mecanismo (1 módulo, serie Living Light / International)',
            'Ahorra en pasillos, escaleras y trasteros: la luz nunca se queda encendida'
        ],
        cuidado: [
            'Va a 230 V: instálalo con el circuito sin tensión',
            '4 A con cos φ = 1 es para cargas resistivas: con LED y fuentes deja margen',
            'Su salida es tensión de red: para llevar el movimiento a la domótica pásala por la entrada SW de un Shelly',
            'El PIR no ve a través de cristales y le confunden las corrientes de aire caliente'
        ],
        codigos: [
            { titulo: 'Avisar del movimiento con el Shelly 1 Mini Gen3', lenguaje: 'Shelly Script (mJS)', nota: 'Lleva la salida del LN1800 a la entrada SW del Shelly, configura la entrada como «interruptor» desacoplado del relé y activa MQTT en el Shelly.', texto: `// Publica en MQTT cada vez que el detector enciende o apaga.
Shelly.addEventHandler(function (e) {
  if (e.component !== "input:0" || e.info.event !== "toggle") return;
  let hay = e.info.state === true;
  print(hay ? "Movimiento" : "Sin movimiento");
  MQTT.publish("casa/pasillo/movimiento", hay ? "on" : "off", 0, true);
});
` }
        ],
        flasheo: {
            titulo: 'Ajustarlo',
            resumen: 'No se programa: no tiene microcontrolador accesible ni conexión. Se ajusta con sus dos ruedas frontales.',
            pasos: [
                'Con el circuito sin tensión, conecta fase en L, neutro en N y la lámpara entre la salida y el neutro.',
                'Pon TIME al mínimo y LUX al máximo para probar: encenderá con cualquier movimiento, de día o de noche.',
                'Camina por la zona: comprueba dónde detecta y reorienta si hace falta.',
                'Sube TIME al tiempo que quieras y baja LUX hasta que solo encienda cuando oscurece.'
            ]
        },
        ideas: [
            'Pasillo, escalera, trastero o garaje',
            'Entrada de casa: luz al llegar sin buscar el interruptor',
            'Contar pasos por el pasillo en Home Assistant con un Shelly en su salida',
            'Luz de cortesía en el baño de noche, con LUX bajo'
        ]
    },

    // ========================================================== Mando CAME TTS
    'came-ttsd4rks': {
        claves: [['Canales', '4'], ['Frecuencias', '433,92 + 868,35 MHz'], ['Código', 'Evolutivo'], ['Alcance', '50 – 150 m'], ['Pila', 'CR2032'], ['Programable', 'No']],
        modelo: {
            caja: { tipo: 'llavero', w: 73, d: 38, h: 11, r: 14, color: '#c3c7cd', metal: true, rect: [40, 6, 246, 138, 56], fondo: ['CAME TTSD4RKS', '806TS-0230', '433.92 / 868.35 MHz · CR2032'] },
            placa: { y: 4.5, color: '#1d5e3a', margen: 6 },
            piezas: [
                { n: 1, nombre: 'Cuatro botones', tipo: 'teclas', x: 177, z: 75, en: 'tapa', puntos: [[148, 52], [206, 52], [148, 98], [206, 98]], w: 12.5, d: 10, h: 1.4,
                    texto: 'Cada botón es un canal que se memoriza por separado: uno para el garaje, otro para la cancela…' },
                { n: 2, nombre: 'Pulsadores de la placa', tipo: 'grupo', x: 177, z: 75, texto: 'Bajo cada botón hay un pulsador de tacto que cierra el circuito.',
                    formas: [[-8.6, -6.3], [8.6, -6.3], [-8.6, 6.3], [8.6, 6.3]].map(([dx, dz]) => ({ tipo: 'caja', dx, dz, w: 3.5, d: 3.5, h: 1.5, color: '#2b2d31' })) },
                { n: 3, nombre: 'Microcontrolador codificador', tipo: 'chip', x: 110, z: 75, w: 4, d: 4, h: .9,
                    texto: 'Genera el código evolutivo: un contador que avanza en cada pulsación y se cifra con la clave del mando. El receptor solo acepta valores que aún no ha visto.' },
                { n: 4, nombre: 'Etapa de 433,92 MHz', tipo: 'blindaje', x: 240, z: 52, w: 4, d: 4, h: 1.4, rotulo: '433',
                    texto: 'Oscilador estabilizado por un resonador de onda superficial (SAW) en la banda de 433 MHz.' },
                { n: 5, nombre: 'Etapa de 868,35 MHz', tipo: 'blindaje', x: 240, z: 98, w: 4, d: 4, h: 1.4, rotulo: '868',
                    texto: 'La segunda frecuencia: emite a la vez en las dos para que valga con receptores CAME de cualquiera de ellas.' },
                { n: 6, nombre: 'Antena impresa', tipo: 'antena', x: 262, z: 75, w: 3.5, d: 22,
                    texto: 'Una pista de cobre en el extremo de la placa. Taparla con la mano reduce el alcance.' },
                { n: 7, nombre: 'Pila CR2032', tipo: 'pila', x: 177, z: 75, r: 10, h: 3.2, abajo: true,
                    texto: 'Botón de litio de 3 V en la cara de abajo. Cuando el alcance baja o el LED apenas brilla, toca cambiarla.' },
                { n: 8, nombre: 'LED de emisión', tipo: 'led', x: 98, z: 75, color: '#ff4d4d', asoma: true,
                    texto: 'Se enciende mientras emite: si no luce al pulsar, revisa la pila.' },
                { n: 9, nombre: 'Anilla del llavero', tipo: 'anilla', x: 30, z: 75, r: 5.5, en: 'tapa',
                    texto: 'De zamak, como el marco: el mando está hecho para ir en el llavero.' }
            ]
        },
        fuertes: [
            'Código evolutivo: no se puede copiar ni repetir con un receptor de radio',
            'Doble frecuencia: vale para receptores CAME de 433 y de 868 MHz',
            'Cuatro canales en un mando: garaje, cancela, barrera…',
            'Pila CR2032 fácil de encontrar y alcance de hasta 150 m'
        ],
        cuidado: [
            'No se clona con un CC1101 ni se programa: cada pulsación lleva un código nuevo',
            'Hay que memorizarlo en el receptor del cuadro: sin eso no abre nada',
            'Para automatizar la puerta no hace falta el mando: un contacto seco en la entrada de mando del cuadro',
            'Las entradas del cuadro llevan su propia tensión: usa contacto seco (Shelly 1 Mini Gen3), nunca un relé que entregue fase'
        ],
        codigos: [
            { titulo: 'Abrir la puerta desde casa con el Shelly 1 Mini Gen3', lenguaje: 'Terminal', nota: 'Bornas I y O del Shelly en paralelo con el pulsador de la entrada de mando paso a paso del cuadro (en muchos cuadros CAME, 2-7; compruébalo en su manual).', texto: `SHELLY=IP_DE_TU_SHELLY

# 1. Que cada orden sea un pulso de 1 s y vuelva solo a reposo
curl -X POST "http://$SHELLY/rpc/Switch.SetConfig" \\
  -d '{"id": 0, "config": {"auto_off": true, "auto_off_delay": 1, "initial_state": "off"}}'

# 2. Abrir o cerrar (paso a paso)
curl "http://$SHELLY/rpc/Switch.Set?id=0&on=true"
` }
        ],
        flasheo: {
            titulo: 'Memorizarlo en el receptor',
            resumen: 'No se programa ni se flashea: se memoriza en el receptor del automatismo. Los pasos exactos dependen del cuadro: estos son los habituales.',
            pasos: [
                'Localiza en el cuadro o en el receptor la tecla de programación de mandos (PROG) y su LED.',
                'Mantén pulsada PROG hasta que el LED se quede encendido.',
                'Pulsa en el mando el botón que quieras usar: el LED parpadea para confirmar que lo ha guardado.',
                'Para cambiar la pila, abre el compartimento y pon una CR2032 con el + hacia arriba.'
            ]
        },
        ideas: [
            'Abrir el garaje y la cancela con un solo mando',
            'Dar mandos a la familia sin miedo a copias',
            'Automatizar la puerta con un Shelly 1 Mini Gen3 en paralelo con el pulsador del cuadro',
            'Saber si la puerta está abierta con un sensor de puerta Zigbee y un ZBMINIR2 de repetidor cerca'
        ]
    }
};

// ======================================================= placas y Shelly 1PM
const SKETCH_S3 = `// ESP32-S3-DevKitC-1 N16R8 · primer sketch: el LED RGB cambia de color y
// el puerto serie cuenta qué chip, cuánta flash y cuánta PSRAM ve.
// El LED RGB va en GPIO48 en las placas v1.0 y en GPIO38 en las v1.1.
#include <Arduino.h>

constexpr int PIN_RGB = 48;   // 38 en la v1.1: mira la serigrafía

void color(uint8_t r, uint8_t g, uint8_t b) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  rgbLedWrite(PIN_RGB, r, g, b);
#else
  neopixelWrite(PIN_RGB, r, g, b);
#endif
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.printf("Chip %s rev %d, %d nucleos a %lu MHz\\n", ESP.getChipModel(), ESP.getChipRevision(),
                ESP.getChipCores(), (unsigned long)ESP.getCpuFreqMHz());
  Serial.printf("Flash %lu MB, PSRAM %lu MB\\n", (unsigned long)(ESP.getFlashChipSize() >> 20),
                (unsigned long)(ESP.getPsramSize() >> 20));
}

void loop() {
  const uint8_t colores[][3] = {{40, 0, 0}, {0, 40, 0}, {0, 0, 40}, {30, 30, 30}};
  for (const auto &c : colores) {
    color(c[0], c[1], c[2]);
    delay(500);
  }
  color(0, 0, 0);
  delay(500);
}
`;

const SKETCH_CYD = `// ESP32-2432S028R (CYD) · primer sketch: saluda en la pantalla, dibuja lo
// que lee el LDR y va cambiando el LED RGB (activo a nivel bajo).
// TFT_eSPI se configura entera desde el platformio.ini de abajo.
#include <Arduino.h>
#include <TFT_eSPI.h>

constexpr int LED_R = 4, LED_G = 16, LED_B = 17, PIN_LDR = 34;
TFT_eSPI tft;

void led(bool r, bool g, bool b) {   // nivel bajo enciende
  digitalWrite(LED_R, r ? LOW : HIGH);
  digitalWrite(LED_G, g ? LOW : HIGH);
  digitalWrite(LED_B, b ? LOW : HIGH);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_R, OUTPUT);
  pinMode(LED_G, OUTPUT);
  pinMode(LED_B, OUTPUT);
  led(false, false, false);
  tft.init();
  tft.setRotation(1);                // apaisada: 320 x 240
  tft.fillScreen(TFT_NAVY);
  tft.setTextColor(TFT_WHITE, TFT_NAVY);
  tft.drawString("Hola desde la CYD", 20, 20, 4);
  tft.drawString("Lectura del LDR (0-4095):", 20, 80, 2);
}

void loop() {
  static int paso = 0;
  const int luz = analogRead(PIN_LDR);
  tft.fillRect(20, 110, 280, 24, TFT_DARKGREY);
  tft.fillRect(20, 110, map(luz, 0, 4095, 0, 280), 24, TFT_YELLOW);
  tft.setTextPadding(120);
  tft.drawNumber(luz, 20, 145, 4);
  led(paso == 0, paso == 1, paso == 2);
  paso = (paso + 1) % 3;
  delay(500);
}
`;

const SKETCH_1PM = `// Shelly 1PM Mini Gen3 con firmware propio (ESP32-C3, 8 MB de flash).
// Pines (devices.esphome.io): LED GPIO0 activo a nivel bajo, botón GPIO1,
// relé GPIO5, entrada SW GPIO10 y medidor BL0942 por UART (TX GPIO6, RX GPIO7).
// Primer sketch: el botón y el interruptor de pared conmutan el relé.
#include <Arduino.h>

constexpr int PIN_LED = 0, PIN_BOTON = 1, PIN_RELE = 5, PIN_SW = 10;
bool encendido = false;

void aplicar() {
  digitalWrite(PIN_RELE, encendido ? HIGH : LOW);
  digitalWrite(PIN_LED, encendido ? LOW : HIGH);
  Serial.println(encendido ? "Rele ON" : "Rele OFF");
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELE, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BOTON, INPUT_PULLUP);
  pinMode(PIN_SW, INPUT);
  aplicar();
}

void loop() {
  static int botonAntes = HIGH;
  static int swAntes = digitalRead(PIN_SW);
  const int boton = digitalRead(PIN_BOTON);
  const int sw = digitalRead(PIN_SW);
  if (botonAntes == HIGH && boton == LOW) { encendido = !encendido; aplicar(); }
  if (sw != swAntes) { encendido = !encendido; aplicar(); }
  botonAntes = boton;
  swAntes = sw;
  delay(30);
}
`;

const ESPHOME_1PM = `# ESPHome · Shelly 1PM Mini Gen3 (ESP32-C3, 8 MB, medidor BL0942)
# Pines de devices.esphome.io/devices/shelly-1pm-mini-gen3
esphome:
  name: shelly-1pm-mini
  friendly_name: Shelly 1PM Mini

esp32:
  variant: esp32c3
  flash_size: 8MB
  framework:
    type: esp-idf

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
  ap:

logger:
api:
ota:
  - platform: esphome
captive_portal:

uart:
  id: uart_bl0942
  tx_pin: GPIO6
  rx_pin:
    number: GPIO7
    mode:
      input: true
      pullup: true
  baud_rate: 9600

sensor:
  - platform: bl0942
    uart_id: uart_bl0942
    voltage:
      name: Tensión
    current:
      name: Corriente
    power:
      name: Potencia
    energy:
      name: Energía
    update_interval: 5s

output:
  - platform: gpio
    id: salida_rele
    pin: GPIO5

switch:
  - platform: output
    id: rele
    name: Relé
    output: salida_rele

binary_sensor:
  - platform: gpio
    name: Interruptor
    pin: GPIO10
    filters:
      - delayed_on_off: 50ms
    on_state:
      - switch.toggle: rele

status_led:
  pin:
    number: GPIO0
    inverted: true
`;

const SCRIPT_ESPERA = `// Apaga la carga cuando lleva 10 minutos por debajo de 5 W (en espera).
let UMBRAL_W = 5, MINUTOS = 10, PERIODO_S = 30;
let tandas = 0;

Timer.set(PERIODO_S * 1000, true, function () {
  let st = Shelly.getComponentStatus("switch:0");
  if (!st.output || st.apower >= UMBRAL_W) {
    tandas = 0;
    return;
  }
  tandas++;
  if (tandas * PERIODO_S >= MINUTOS * 60) {
    Shelly.call("Switch.Set", { id: 0, on: false });
    print("En espera " + MINUTOS + " min: apagado");
    tandas = 0;
  }
});
`;

const RPC_1PM = `SHELLY=IP_DE_TU_SHELLY

curl "http://$SHELLY/rpc/Switch.GetStatus?id=0"
curl "http://$SHELLY/rpc/Switch.Toggle?id=0"
curl "http://$SHELLY/rpc/Switch.ResetCounters?id=0"
`;

const pasosShelly = archivo => [
    'Desconéctalo de la red. A partir de aquí solo lo alimenta el adaptador USB-serie a 3,3 V.',
    'Conecta el adaptador al conector de 1,27 mm: 3V3, GND, TX del adaptador a RX del Shelly y RX a TX.',
    'Pon BOOT (GPIO9) a GND mientras das alimentación o mientras sueltas RST: entra en modo descarga.',
    `Haz la copia: \`esptool.py --chip esp32c3 read_flash 0 0x800000 ${archivo}\`.`,
    'Graba tu sketch con `pio run -t upload` o ESPHome con `esphome run` y su YAML.',
    `Para volver al firmware de Shelly: \`esptool.py --chip esp32c3 write_flash 0 ${archivo}\`.`
];

Object.assign(FICHAS, {
    // ==================================================== ESP32-S3 DevKitC-1
    'esp32-s3-devkitc-1-n16r8': {
        claves: [['Procesador', '2 × LX7 · 240 MHz'], ['Flash', '16 MB'], ['PSRAM', '8 MB octal'], ['Radio', 'Wi-Fi 4 + BLE 5'], ['USB', 'Nativo + UART'], ['Lógica', '3,3 V']],
        modelo: {
            caja: { tipo: 'placa', w: 27.9, d: 71.1, h: 1.6, y: 8.6, r: .8, color: '#14161a', fondo: ['ESP32-S3-DevKitC-1', 'N16R8 · 16 MB + 8 MB PSRAM'] },
            piezas: [
                { n: 1, nombre: 'Módulo ESP32-S3-WROOM-1 N16R8', tipo: 'grupo', x: 55, z: 51.5,
                    texto: 'El ESP32-S3 con 16 MB de flash y 8 MB de PSRAM octal bajo el blindaje metálico. Dos núcleos LX7 a 240 MHz con instrucciones vectoriales para IA.',
                    formas: [{ tipo: 'caja', w: 18, d: 25.6, h: .8, color: '#1c1f24' }, { tipo: 'blindaje', dz: 3.2, dy: .8, w: 16.2, d: 18.3, h: 2.4, rotulo: 'ESP32-S3\nN16R8' }] },
                { n: 2, nombre: 'Antena impresa del módulo', tipo: 'grupo', x: 55, z: 15,
                    texto: 'El meandro de cobre del extremo del módulo. Para un buen alcance, que no quede encima de metal ni de un plano de masa.',
                    formas: [{ tipo: 'antena', dy: .8, w: 14, d: 3.6 }] },
                { n: 3, nombre: 'Puente USB-serie CH343', tipo: 'chip', x: 55, z: 163, w: 4, d: 4, h: .9, rotulo: 'CH343',
                    texto: 'Convierte el USB-C marcado UART en el puerto serie UART0. Es por donde salen los mensajes de Serial con el platformio.ini de abajo.' },
                { n: 4, nombre: 'Regulador de 3,3 V y protección', tipo: 'grupo', x: 55, z: 122,
                    texto: 'Bajan los 5 V del USB a los 3,3 V del módulo y protegen la entrada. De aquí sale el pin 3V3: no le pidas más de unos 500 mA en total.',
                    formas: [{ tipo: 'chip', dx: -4.6, w: 3.5, d: 2.3, h: 1 }, { tipo: 'chip', dx: 4.6, w: 3.5, d: 2.3, h: 1 }] },
                { n: 5, nombre: 'LED RGB direccionable', tipo: 'rgb', x: 55, z: 206, w: 3,
                    texto: 'Un LED WS2812 en GPIO48 (v1.0) o GPIO38 (v1.1). Es el «blink» de esta placa: se maneja con rgbLedWrite().' },
                { n: 6, nombre: 'Botón BOOT', tipo: 'tacto', x: 40, z: 235,
                    texto: 'Une GPIO0 a masa. Mantenido mientras pulsas RST, la placa arranca en modo descarga.' },
                { n: 7, nombre: 'Botón RST', tipo: 'tacto', x: 70, z: 235,
                    texto: 'Reinicia el programa desde el principio. No borra nada.' },
                { n: 8, nombre: 'USB-C «UART»', tipo: 'usbc', x: 30, z: 268, w: 8.6,
                    texto: 'Va al CH343: alimentación, grabación y monitor serie. Es el puerto más seguro para empezar.' },
                { n: 9, nombre: 'USB-C «USB» nativo', tipo: 'usbc', x: 80, z: 268, w: 8.6,
                    texto: 'Va directo al USB del ESP32-S3 (GPIO19 y 20): puede hacer de teclado, ratón o disco para el ordenador, y también grabar.' },
                { n: 10, nombre: 'Dos tiras de 22 pines', tipo: 'grupo', x: 55, abajo: true,
                    texto: 'Las 44 patas a 2,54 mm que se pinchan en la protoboard. Ojo: la placa ocupa casi todo el ancho de una protoboard estándar.',
                    formas: [{ tipo: 'tira', dx: -11.4, z0: 40, z1: 250, n: 22 }, { tipo: 'tira', dx: 11.4, z0: 40, z1: 250, n: 22 }] }
            ]
        },
        fuertes: [
            'PSRAM de 8 MB: cámaras, audio y LVGL sin quedarse sin memoria',
            'USB nativo: se hace pasar por teclado, ratón, MIDI o disco',
            'Instrucciones vectoriales para IA ligera (ESP-DL, TensorFlow Lite Micro)',
            'Dos USB-C: uno para grabar y otro para el USB nativo'
        ],
        cuidado: [
            'Todo va a 3,3 V: 5 V en un GPIO lo daña',
            'GPIO35, 36 y 37 están ocupados por la PSRAM octal del N16R8',
            'GPIO0, 3, 45 y 46 deciden el arranque: no los fuerces durante el reset',
            'Sin `memory_type = qio_opi` en platformio.ini la PSRAM no arranca'
        ],
        codigos: [
            { titulo: 'Primer sketch: LED RGB y datos del chip', lenguaje: 'Arduino C++', archivo: 'src/main.cpp', nota: 'Conecta el USB-C marcado UART y abre el monitor serie a 115200 baudios.', texto: SKETCH_S3 },
            { titulo: 'platformio.ini', lenguaje: 'INI', archivo: 'platformio.ini', texto: PLATFORMIO_INI }
        ],
        flasheo: {
            titulo: 'Grabarle tu programa',
            resumen: 'Se programa directamente por USB, sin soldar nada.',
            pasos: [
                'Conecta el USB-C marcado UART. En Windows, si no aparece el puerto, instala el controlador del CH343.',
                'Graba con `pio run -t upload` y abre el monitor con `pio device monitor`.',
                'Si no entra en modo descarga: mantén BOOT, pulsa y suelta RST, y suelta BOOT.',
                'Para usar el USB nativo como monitor, cambia a `-DARDUINO_USB_CDC_ON_BOOT=1` y conecta el USB-C marcado USB.'
            ]
        },
        ideas: [
            'Robot con cámara y reconocimiento junto al Coral',
            'Teclado de atajos o mando MIDI por USB nativo',
            'Asistente de voz con el micrófono INMP441 y el amplificador I²S',
            'Pasarela que reúne sensores por Wi-Fi y los publica por MQTT'
        ]
    },

    // ================================================================ CYD 2,8"
    'esp32-2432s028r': {
        claves: [['Procesador', 'ESP32 · 2 × 240 MHz'], ['Pantalla', '2,8" · 320 × 240'], ['Táctil', 'Resistivo XPT2046'], ['Flash', '4 MB'], ['GPIO libres', '22, 27 y 35'], ['USB', 'micro-USB · CH340']],
        modelo: {
            caja: { tipo: 'placa', w: 86, d: 50, h: 1.6, y: 3.6, r: 1.5, color: '#e6a019', fondo: ['ESP32-2432S028R', 'ESP32-WROOM-32 · CH340 · XPT2046'] },
            piezas: [
                { n: 1, nombre: 'Pantalla TFT de 2,8" con táctil', tipo: 'pantalla', rect: [34, 6, 278, 164], h: 3.8,
                    texto: 'Un TFT de 320 × 240 con controlador ILI9341 (ST7789 en la variante de dos USB) y, pegada encima, la lámina táctil resistiva que lee el XPT2046.' },
                { n: 2, nombre: 'LED RGB', tipo: 'rgb', x: 322, z: 36, w: 3,
                    texto: 'Tres LED en GPIO4 (rojo), GPIO16 (verde) y GPIO17 (azul), activos a nivel bajo: LOW enciende.' },
                { n: 3, nombre: 'Sensor de luz (LDR)', tipo: 'ldr', x: 322, z: 62, r: 1.6,
                    texto: 'Una fotorresistencia leída por GPIO34: sirve para ajustar el brillo de la pantalla a la luz de la habitación.' },
                { n: 4, nombre: 'Micro-USB', tipo: 'microusb', x: 330, z: 100, lado: 'x',
                    texto: 'Alimentación, grabación y monitor serie a través del CH340.' },
                { n: 5, nombre: 'Conectores P1, P3 y CN1', tipo: 'grupo', x: 115, z: 190,
                    texto: 'Los JST de 1,25 mm con lo poco que queda libre: P1 (VIN, TX, RX), P3 (GPIO35, 22 y 21) y CN1 (GPIO22 y 27, el bus I²C natural).',
                    formas: [-17.7, 0, 17.7].map(dx => ({ tipo: 'caja', dx, w: 10.6, d: 3.8, h: 4.5, color: '#f3efe2' })) },
                { n: 6, nombre: 'Módulo ESP32-WROOM-32', tipo: 'grupo', x: 100, z: 100, abajo: true,
                    texto: 'Por detrás: el ESP32 de doble núcleo con 4 MB de flash y sin PSRAM, con su antena en un extremo para que la pantalla no la tape.',
                    formas: [{ tipo: 'caja', w: 25.5, d: 18, h: .8, color: '#1c1f24' }, { tipo: 'blindaje', dx: 3, dy: -.8, w: 17.6, d: 15.4, h: 2.4, rotulo: 'ESP32' }, { tipo: 'antena', dx: -10, dy: -.86, w: 4, d: 14 }] },
                { n: 7, nombre: 'Puente USB-serie CH340', tipo: 'chip', x: 290, z: 120, w: 5, d: 4, h: 1.5, abajo: true, rotulo: 'CH340',
                    texto: 'Convierte el micro-USB en el puerto serie del ESP32 y maneja el reinicio automático al grabar.' },
                { n: 8, nombre: 'Ranura microSD', tipo: 'blindaje', x: 190, z: 55, w: 14, d: 15, h: 1.8, abajo: true, rotulo: 'TF',
                    texto: 'Por el bus VSPI (GPIO5, 18, 19 y 23). Ideal para guardar registros, imágenes o fuentes.' },
                { n: 9, nombre: 'Controlador táctil XPT2046', tipo: 'chip', x: 190, z: 150, w: 5, d: 4.4, h: 1, abajo: true, rotulo: 'XPT2046',
                    texto: 'Lee la lámina resistiva por su propio bus SPI (GPIO25, 32, 33, 36 y 39). Hay que calibrar sus valores a píxeles.' },
                { n: 10, nombre: 'Reguladores AMS1117', tipo: 'grupo', x: 250, z: 100, abajo: true,
                    texto: 'Dos reguladores de 3,3 V: uno para el ESP32 y otro para la pantalla. Se calientan con la retroiluminación al máximo.',
                    formas: [{ tipo: 'chip', dz: -6, w: 6.5, d: 3.5, h: 1.6, rotulo: 'AMS1117' }, { tipo: 'chip', dz: 6, w: 6.5, d: 3.5, h: 1.6, rotulo: 'AMS1117' }] },
                { n: 11, nombre: 'Amplificador y conector del altavoz', tipo: 'grupo', x: 130, z: 165, abajo: true,
                    texto: 'Un pequeño amplificador mono atacado por GPIO26 (DAC) y su conector para un altavoz de 8 Ω.',
                    formas: [{ tipo: 'chip', w: 3, d: 3, h: .9 }, { tipo: 'caja', dx: 8, w: 6, d: 4, h: 3, color: '#f3efe2' }] },
                { n: 12, nombre: 'Botones BOOT y RST', tipo: 'grupo', x: 300, z: 40, abajo: true,
                    texto: 'Por detrás. BOOT (GPIO0) también sirve como botón de usuario una vez arrancado el programa.',
                    formas: [{ tipo: 'tacto', dx: -5 }, { tipo: 'tacto', dx: 5 }] }
            ]
        },
        fuertes: [
            'Todo en una placa: pantalla táctil, Wi-Fi, microSD, LED RGB, LDR y altavoz',
            'Muy barata para lo que trae',
            'TFT_eSPI y LVGL la soportan bien; hay seis proyectos listos en Lab Studio',
            'El BOOT hace de botón de usuario sin añadir nada'
        ],
        cuidado: [
            'Casi sin GPIO libres: solo 22, 27, 35 (solo entrada) y 21 (compartido con la retroiluminación)',
            'Sin PSRAM: LVGL con buffers grandes se queda corto de memoria',
            'La variante de dos USB lleva ST7789 en lugar de ILI9341: cambia el driver o los colores salen mal',
            'El LED RGB es activo a nivel bajo y el táctil hay que calibrarlo'
        ],
        codigos: [
            { titulo: 'Primer sketch: pantalla, LDR y LED RGB', lenguaje: 'Arduino C++', archivo: 'src/main.cpp', nota: 'Con el platformio.ini de abajo no hace falta tocar User_Setup.h. Los seis proyectos de la CYD tienen ejemplos más completos.', texto: SKETCH_CYD },
            { titulo: 'platformio.ini', lenguaje: 'INI', archivo: 'platformio.ini', texto: PLATFORMIO_CYD }
        ],
        flasheo: {
            titulo: 'Grabarle tu programa',
            resumen: 'Se programa por el micro-USB, sin soldar nada.',
            pasos: [
                'Conecta el micro-USB. En Windows, si no aparece el puerto, instala el controlador del CH340.',
                'Graba con `pio run -t upload` y abre el monitor con `pio device monitor`.',
                'Si no entra en modo descarga, mantén BOOT al empezar la grabación.',
                'Si la pantalla sale en blanco o con colores raros, es la variante ST7789: cambia `-DILI9341_2_DRIVER` por `-DST7789_DRIVER`.'
            ]
        },
        ideas: [
            'Estación meteorológica con gráfica de 24 horas',
            'Panel táctil para los Shelly de casa',
            'Monitor de CPU y RAM del PC por USB',
            'Termostato con horario y relé'
        ]
    },

    // =================================================== Shelly 1PM Mini Gen3
    'shelly-1pm-mini-g3': {
        claves: [['Procesador', 'ESP32-C3'], ['Flash', '8 MB'], ['Carga', '8 A · 2000 W'], ['Medida', 'V, A, W y kWh'], ['Radio', 'Wi-Fi + BLE'], ['Medidas', '34 × 29 × 16 mm']],
        modelo: {
            caja: { w: 34, d: 29, h: 16, r: 4, color: '#b01a30', rect: [2, 1, 136, 117, 10], fondo: ['Shelly 1PM Mini Gen3', 'S3SW-001P8EU', '110-240 VAC · 50/60 Hz'] },
            placa: { y: 2, color: '#1d2633', margen: 2 },
            piezas: [
                { n: 1, nombre: 'Módulo ESP-Shelly-C38F (ESP32-C3)', tipo: 'blindaje', x: 106, z: 53, w: 10, d: 10, h: 2, rotulo: 'C38F',
                    texto: 'Un ESP32-C3 con 8 MB de flash bajo la tapa metálica: ejecuta el firmware de Shelly y sus scripts, o el tuyo si lo flasheas.' },
                { n: 2, nombre: 'Antena impresa de 2,4 GHz', tipo: 'antena', x: 106, z: 89, w: 10, d: 3.5,
                    texto: 'Wi-Fi y Bluetooth salen por esta pista. Mejor sin cajas metálicas alrededor.' },
                { n: 3, nombre: 'Relé de 8 A', tipo: 'rele', x: 56, z: 53, w: 12, d: 10, h: 10.5, color: '#202329', rotulo: '8A 240VAC',
                    texto: 'Conmuta la fase de L hacia O. No es un contacto seco: la salida siempre lleva la tensión de red.' },
                { n: 4, nombre: 'Medidor de energía BL0942', tipo: 'chip', x: 74, z: 80, w: 3, d: 3, h: .9, rotulo: 'BL0942',
                    texto: 'Mide tensión, corriente, potencia y energía, y se lo cuenta al ESP32-C3 por una UART a 9600 baudios.' },
                { n: 5, nombre: 'Resistencia de medida (shunt)', tipo: 'caja', x: 84, z: 53, w: .9, d: 7, h: .9, color: '#b87333',
                    texto: 'Una tira metálica de muy pocos miliohmios por la que pasa toda la corriente: el BL0942 mide su caída de tensión.' },
                { n: 6, nombre: 'Fuente conmutada 230 V → 3,3 V', tipo: 'grupo', x: 42, z: 93, texto: 'Saca de la red los 3,3 V del ESP32-C3 y del medidor.',
                    formas: [{ tipo: 'condensador', dx: -5, r: 2.4, h: 7, color: '#243a8f' }, { tipo: 'bobina', dx: .5, r: 2.2, h: 3 }, { tipo: 'chip', dx: 5, w: 3, d: 2.4, h: 1 }] },
                { n: 7, nombre: 'Sensor de temperatura (NTC)', tipo: 'smd', x: 66, z: 108, w: 1.6, d: .8, h: .6, color: '#c9a66b',
                    texto: 'Vigila la temperatura interna y abre el relé si se calienta de más.' },
                { n: 8, nombre: 'Bornas SW y O', tipo: 'borna', z: 15, polos: [30, 50], d: 7, h: 8, color: '#1a1b1e',
                    texto: 'SW: entrada del interruptor de la pared, conmutada a fase. O: salida hacia la carga.' },
                { n: 9, nombre: 'Bornas L y N', tipo: 'borna', z: 15, polos: [90, 110], d: 7, h: 8, color: '#1a1b1e',
                    texto: 'Fase y neutro de la caja: alimentan el Shelly y la carga.' },
                { n: 10, nombre: 'Conector de programación (1,27 mm)', tipo: 'pads', x: 12, z: 55, etiquetas: ['RST', '3V3', 'RX', 'TX', 'BOOT', 'GND'], vertical: true,
                    texto: 'Seis contactos para un adaptador USB-serie a 3,3 V: copia del firmware y grabación de ESPHome o de tu sketch.' },
                { n: 11, nombre: 'Botón de reinicio', tipo: 'boton', x: 80, z: 101, r: 1.4, color: '#e8eaed', asoma: true,
                    texto: 'Pulsado conmuta el relé; mantenido 10 s devuelve el Shelly a fábrica.' },
                { n: 12, nombre: 'LED de estado', tipo: 'led', x: 94, z: 103, color: '#4c9dff', asoma: true,
                    texto: 'Indica la conexión Wi-Fi y el modo de punto de acceso.' }
            ]
        },
        fuertes: [
            'Mide lo que consume la carga: tensión, corriente, potencia y energía',
            'API local por RPC y MQTT, sin nube',
            'Scripts mJS que deciden con el consumo dentro del propio relé',
            'ESP32-C3 con 8 MB y conector de programación: admite ESPHome o tu sketch'
        ],
        cuidado: [
            'Va a 230 V: se instala sin tensión, dentro de una caja y con magnetotérmico',
            'No es contacto seco: O entrega la fase de L',
            'Con motores o transformadores grandes, 8 A se quedan cortos: usa un contactor',
            'Nunca lo programes conectado a la red y haz copia del firmware antes'
        ],
        codigos: [
            { titulo: 'Script: apagar lo que se queda en espera', lenguaje: 'Shelly Script (mJS)', nota: 'Sin flashear nada: Scripts → Añadir script, pega, guarda e Iniciar.', texto: SCRIPT_ESPERA },
            { titulo: 'Desde tu red: consumo por RPC', lenguaje: 'Terminal', nota: 'Pon en SHELLY la IP de tu Shelly. La respuesta trae apower (W), voltage (V), current (A) y aenergy.total (Wh).', texto: RPC_1PM },
            { titulo: 'Primer sketch con firmware propio', lenguaje: 'Arduino C++', archivo: 'src/main.cpp', nota: 'Antes, lee los pasos de flasheo.', texto: SKETCH_1PM },
            { titulo: 'platformio.ini', lenguaje: 'INI', archivo: 'platformio.ini', texto: PIO_SHELLY.replace('Shelly 1 Mini Gen3', 'Shelly 1PM Mini Gen3').replace('shelly-1-mini-gen3', 'shelly-1pm-mini-gen3') },
            { titulo: 'ESPHome con medida de energía', lenguaje: 'YAML', archivo: 'shelly-1pm-mini.yaml', texto: ESPHOME_1PM }
        ],
        flasheo: {
            titulo: 'Grabarle tu programa',
            resumen: 'Admite programa propio: es un ESP32-C3 con conector de programación. Haz siempre copia del firmware de fábrica primero.',
            pasos: pasosShelly('shelly-1pm-mini-g3.bin')
        },
        ideas: [
            'Avisar cuando termina la lavadora: el consumo cae y un script publica por MQTT',
            'Cortar el consumo en espera del televisor y su equipo de sonido',
            'Medir cuánto gasta el calefactor o el termo eléctrico',
            'Programar el termo para que caliente en las horas baratas'
        ]
    }
});

export const fichaDe = id => FICHAS[id] || null;

// ============================================= Raspberry Pi, C3 y StampS3
const SKETCH_C3 = `// ESP32-C3 SuperMini · primer sketch: el LED azul (GPIO8, activo a nivel
// bajo) parpadea y el botón BOOT (GPIO9) cambia la velocidad.
#include <Arduino.h>

constexpr int PIN_LED = 8;    // LOW enciende
constexpr int PIN_BOOT = 9;   // pulsado = LOW

unsigned long periodo = 500;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BOOT, INPUT_PULLUP);
  delay(1500);
  Serial.printf("Chip %s rev %d a %lu MHz, flash %lu MB\\n", ESP.getChipModel(), ESP.getChipRevision(),
                (unsigned long)ESP.getCpuFreqMHz(), (unsigned long)(ESP.getFlashChipSize() >> 20));
}

void loop() {
  if (digitalRead(PIN_BOOT) == LOW) {
    periodo = periodo == 500 ? 100 : 500;
    Serial.printf("Periodo: %lu ms\\n", periodo);
    while (digitalRead(PIN_BOOT) == LOW) delay(10);
  }
  digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  delay(periodo);
}
`;

const SKETCH_STAMP = `// M5StampS3 · primer sketch: el LED RGB (WS2812B en G21) cambia de color
// cada vez que pulsas el botón (G0).
#include <Arduino.h>
#include <FastLED.h>

constexpr int PIN_RGB = 21;
constexpr int PIN_BOTON = 0;  // pulsado = LOW

CRGB led[1];
const CRGB colores[] = {CRGB::Red, CRGB::Green, CRGB::Blue, CRGB::White, CRGB::Black};
int indice = 0;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BOTON, INPUT_PULLUP);
  FastLED.addLeds<WS2812B, PIN_RGB, GRB>(led, 1);
  FastLED.setBrightness(40);
  delay(1500);
  Serial.printf("Chip %s, flash %lu MB\\n", ESP.getChipModel(), (unsigned long)(ESP.getFlashChipSize() >> 20));
}

void loop() {
  if (digitalRead(PIN_BOTON) == LOW) {
    indice = (indice + 1) % 5;
    Serial.printf("Color %d\\n", indice);
    while (digitalRead(PIN_BOTON) == LOW) delay(10);
  }
  led[0] = colores[indice];
  FastLED.show();
  delay(20);
}
`;

const PY_RPI = `# Raspberry Pi 4B · primer programa: un LED en GPIO17 (pin 11) parpadea y
# un pulsador en GPIO27 (pin 13, a masa) cambia la velocidad.
# Conecta el LED con una resistencia de 330 Ω entre GPIO17 y GND (pin 9).
from signal import pause
from gpiozero import LED, Button

led = LED(17)
boton = Button(27)          # pull-up interno: pulsado une el pin a masa
rapido = False


def cambiar():
    global rapido
    rapido = not rapido
    t = 0.1 if rapido else 0.5
    led.blink(on_time=t, off_time=t)
    print("Rápido" if rapido else "Lento")


led.blink(on_time=0.5, off_time=0.5)
boton.when_pressed = cambiar
print("Pulsa el botón para cambiar la velocidad. Ctrl+C para salir.")
pause()
`;

const TERMINAL_RPI = `# Desde el PC, entra por SSH (el nombre lo eliges en Raspberry Pi Imager):
ssh TU_USUARIO@raspberrypi.local

# Ya en la Raspberry Pi: actualiza y comprueba los GPIO
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y python3-gpiozero
pinout                       # dibuja la cabecera de 40 pines

# Copia parpadeo.py y ejecútalo
python3 parpadeo.py`;

const SERVICIO_RPI = `# /etc/systemd/system/parpadeo.service · arranca el programa al encender
[Unit]
Description=Parpadeo en GPIO17
After=multi-user.target

[Service]
ExecStart=/usr/bin/python3 /home/TU_USUARIO/parpadeo.py
Restart=on-failure
User=TU_USUARIO

[Install]
WantedBy=multi-user.target

# Actívalo con:
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now parpadeo`;

Object.assign(FICHAS, {
    // ============================================== Raspberry Pi 4 Model B
    'raspberry-pi-4b': {
        claves: [['Procesador', '4 × Cortex-A72 · 1,8 GHz'], ['Sistema', 'Linux (Raspberry Pi OS)'], ['USB', '2 × 3.0 + 2 × 2.0'], ['Red', 'Gigabit + Wi-Fi 5 + BT 5'], ['GPIO', '40 pines · 3,3 V'], ['Alimentación', 'USB-C · 5,1 V / 3 A']],
        modelo: {
            caja: { tipo: 'placa', w: 56, d: 85, h: 1.6, y: 1.5, r: 3, color: '#1d7a3e', fondo: ['Raspberry Pi 4 Model B', 'BCM2711 · LPDDR4 · microSD'] },
            piezas: [
                { n: 1, nombre: 'Procesador Broadcom BCM2711', tipo: 'blindaje', x: 130, z: 122, w: 17, d: 17, h: 2.4, rotulo: 'BCM2711',
                    texto: 'Cuatro núcleos Cortex-A72 a 1,8 GHz bajo una tapa metálica. Se calienta: con carga sostenida conviene un disipador o un ventilador.' },
                { n: 2, nombre: 'Memoria LPDDR4', tipo: 'chip', x: 129, z: 198, w: 15, d: 13, h: 1.1, rotulo: 'LPDDR4',
                    texto: 'De 1 a 8 GB según el modelo, compartidos entre el sistema y la GPU.' },
                { n: 3, nombre: 'Wi-Fi y Bluetooth (CYW43455)', tipo: 'blindaje', x: 162, z: 50, w: 11, d: 10, h: 1.6, rotulo: 'CYW43455',
                    texto: 'Wi-Fi 5 de doble banda y Bluetooth 5 bajo su blindaje. La antena impresa queda en la esquina, junto a la cabecera.' },
                { n: 4, nombre: 'Controlador USB 3.0 VL805', tipo: 'chip', x: 95, z: 261, w: 8.5, d: 8.5, h: .9, rotulo: 'VL805',
                    texto: 'Da los cuatro puertos USB: comparten unos 5 Gbit/s y, en total, 1,2 A.' },
                { n: 5, nombre: 'Gestor de alimentación (PMIC)', tipo: 'chip', x: 153, z: 243, w: 6.5, d: 5.5, h: .9, rotulo: 'PMIC',
                    texto: 'Reparte los 5 V de la entrada en los raíles internos. Si la fuente se queda corta, aparece el rayo de «bajo voltaje».' },
                { n: 6, nombre: 'Dos USB 2.0', tipo: 'grupo', x: 54, z: 304,
                    texto: 'Para teclado, ratón o la webcam. Lo que necesite velocidad, mejor en los azules.',
                    formas: [{ tipo: 'blindaje', w: 14.5, d: 17.5, h: 15.6 }, { tipo: 'caja', dz: 8.8, dy: 2.4, w: 11, d: .3, h: 4.6, color: '#1b1d21' }, { tipo: 'caja', dz: 8.8, dy: 9.6, w: 11, d: .3, h: 4.6, color: '#1b1d21' }] },
                { n: 7, nombre: 'Dos USB 3.0', tipo: 'grupo', x: 124, z: 304,
                    texto: 'Los de lengüeta azul: aquí va el Coral USB, que necesita su ancho de banda, o un SSD para arrancar desde él.',
                    formas: [{ tipo: 'blindaje', w: 14.5, d: 17.5, h: 15.6 }, { tipo: 'caja', dz: 8.8, dy: 2.4, w: 11, d: .3, h: 4.6, color: '#1d4fb0' }, { tipo: 'caja', dz: 8.8, dy: 9.6, w: 11, d: .3, h: 4.6, color: '#1d4fb0' }] },
                { n: 8, nombre: 'Gigabit Ethernet', tipo: 'grupo', x: 189, z: 299,
                    texto: 'RJ45 de 1 Gbit/s. Para un servidor 24/7 (MQTT, Home Assistant) es más estable que la Wi-Fi.',
                    formas: [{ tipo: 'blindaje', w: 15.8, d: 21, h: 13.5 }, { tipo: 'caja', dz: 10.55, dy: 3.5, w: 11.5, d: .3, h: 7, color: '#1b1d21' }] },
                { n: 9, nombre: 'Entrada USB-C de alimentación', tipo: 'usbc', x: 11, z: 50, lado: '-x',
                    texto: 'Solo alimenta: necesita 5,1 V y 3 A. Con un cargador de móvil cualquiera aparecen cortes y el aviso de bajo voltaje.' },
                { n: 10, nombre: 'Dos micro-HDMI', tipo: 'grupo', x: 10, z: 121,
                    texto: 'Hasta dos pantallas 4K. Usa el HDMI0, el más cercano a la alimentación, si solo conectas una.',
                    formas: [{ tipo: 'microusb', dz: -5.5, lado: '-x', w: 6.6, d: 7.5, h: 3.1 }, { tipo: 'microusb', dz: 5.5, lado: '-x', w: 6.6, d: 7.5, h: 3.1 }] },
                { n: 11, nombre: 'Jack de audio y vídeo compuesto', tipo: 'caja', x: 18, z: 209, w: 11, d: 6.6, h: 5.6, color: '#141518',
                    texto: 'Salida de sonido analógico de 3,5 mm (y vídeo compuesto con el cable de cuatro contactos).' },
                { n: 12, nombre: 'Cabecera de 40 pines (GPIO)', tipo: 'grupo', x: 205,
                    texto: 'Los 40 pines con GPIO, I²C, SPI, UART, PWM, 3,3 V, 5 V y masa. Todos los GPIO son de 3,3 V y sin protección.',
                    formas: [{ tipo: 'cabecera', z0: 30, z1: 220, n: 20, filas: 2 }] },
                { n: 13, nombre: 'Conectores de pantalla (DSI) y cámara (CSI)', tipo: 'grupo', x: 78, z: 92,
                    texto: 'Dos conectores de cinta plana: DSI para la pantalla táctil oficial y CSI para una cámara Raspberry Pi.',
                    formas: [{ tipo: 'caja', dx: 5.8, dz: -20.3, w: 15.8, d: 3, h: 2.8, color: '#2a2c30' }, { tipo: 'caja', dx: -5.8, dz: 20.3, w: 20.9, d: 2.8, h: 2.8, color: '#2a2c30' }] },
                { n: 14, nombre: 'Ranura microSD', tipo: 'blindaje', x: 101, z: 30, w: 12, d: 11.5, h: 1.4, abajo: true, rotulo: 'microSD',
                    texto: 'Por debajo: la tarjeta con el sistema operativo. Una de clase A1 o A2 arranca y responde bastante mejor.' }
            ]
        },
        fuertes: [
            'Linux completo: Python, Docker, Node-RED, Home Assistant o un broker MQTT',
            'USB 3.0 para el Coral, un SSD o cámaras',
            'Gigabit Ethernet y Wi-Fi de doble banda para estar siempre encendida',
            'Cabecera de 40 pines con I²C, SPI, UART y PWM'
        ],
        cuidado: [
            'Los GPIO son de 3,3 V: 5 V en un GPIO la daña sin remedio',
            'Fuente de 5,1 V / 3 A: con menos, se cuelga o corrompe la microSD',
            'Apágala con `sudo poweroff`: cortar la corriente puede estropear la tarjeta',
            'Sin disipador, el BCM2711 baja de velocidad a 80 °C'
        ],
        codigos: [
            { titulo: 'Primer programa: LED y pulsador', lenguaje: 'Python', archivo: 'parpadeo.py', nota: 'Usa gpiozero, que viene en Raspberry Pi OS. Los números son de GPIO, no de pin físico.', texto: PY_RPI },
            { titulo: 'Prepararla y ejecutarlo', lenguaje: 'Terminal', nota: 'Cambia TU_USUARIO por el usuario que creaste en Raspberry Pi Imager.', texto: TERMINAL_RPI },
            { titulo: 'Que arranque solo al encender', lenguaje: 'systemd', archivo: '/etc/systemd/system/parpadeo.service', texto: SERVICIO_RPI }
        ],
        flasheo: {
            titulo: 'Instalarle el sistema',
            resumen: 'No se «flashea» como un ESP32: el sistema operativo va en la microSD y tus programas se ejecutan en Linux.',
            pasos: [
                'Instala Raspberry Pi Imager en el PC y elige Raspberry Pi 4 → Raspberry Pi OS Lite (64 bits).',
                'En la configuración, pon nombre de equipo, usuario y contraseña, tu Wi-Fi y activa SSH.',
                'Graba la microSD, métela por debajo de la placa y alimenta por el USB-C.',
                'Al minuto, entra con `ssh TU_USUARIO@raspberrypi.local` y sigue con el bloque de terminal.'
            ]
        },
        ideas: [
            'Servidor de casa: Mosquitto, Zigbee2MQTT y Home Assistant',
            'Detección de personas con la cámara y el Coral USB',
            'Grabador de la cámara IP con Frigate',
            'Panel de control de los ESP32 con Node-RED'
        ]
    },

    // ================================================== ESP32-C3 SuperMini
    'esp32-c3-supermini': {
        claves: [['Procesador', 'RISC-V · 160 MHz'], ['Flash', '4 MB'], ['Radio', 'Wi-Fi 4 + BLE 5'], ['USB', 'Nativo (USB-C)'], ['GPIO', '13 · 3,3 V'], ['Medidas', '22,5 × 18 mm']],
        modelo: {
            caja: { tipo: 'placa', w: 18, d: 22.5, h: 1.2, y: 8.6, r: .8, color: '#16233f', fondo: ['ESP32-C3 SuperMini', 'ESP32-C3FN4 · 4 MB'] },
            piezas: [
                { n: 1, nombre: 'ESP32-C3FN4', tipo: 'chip', x: 40, z: 44, w: 5, d: 5, h: .9, rotulo: 'C3',
                    texto: 'Un núcleo RISC-V a 160 MHz con 4 MB de flash dentro del propio chip. Sin blindaje: el chip va a la vista.' },
                { n: 2, nombre: 'USB-C nativo', tipo: 'usbc', x: 40, z: 6, lado: '-z', w: 8.9, d: 7,
                    texto: 'Va directo al USB del C3 (GPIO18 y 19): alimenta, graba y hace de monitor serie sin puente USB-serie.' },
                { n: 3, nombre: 'LED azul de usuario', tipo: 'led', x: 32, z: 17, color: '#4aa3ff',
                    texto: 'En GPIO8 y activo a nivel bajo: LOW lo enciende. Es el «blink» de esta placa.' },
                { n: 4, nombre: 'LED rojo de alimentación', tipo: 'led', x: 48, z: 17, color: '#ff5a4d',
                    texto: 'Se enciende siempre que la placa tiene corriente. No se controla desde el programa.' },
                { n: 5, nombre: 'Regulador de 3,3 V', tipo: 'smd', x: 38, z: 21, w: 2.9, d: 1.6, h: 1, color: '#2a2c30',
                    texto: 'Baja los 5 V del USB a 3,3 V. Da poco: alimenta sensores pequeños, no motores ni tiras de LED.' },
                { n: 6, nombre: 'Botón BOOT', tipo: 'tacto', x: 31.5, z: 64, w: 3, d: 2.4,
                    texto: 'En GPIO9. Mantenido mientras conectas o pulsas RST, entra en modo descarga. Luego sirve como botón de usuario.' },
                { n: 7, nombre: 'Botón RST', tipo: 'tacto', x: 48.5, z: 64, w: 3, d: 2.4,
                    texto: 'Reinicia el programa desde el principio.' },
                { n: 8, nombre: 'Antena cerámica', tipo: 'caja', x: 40, z: 81, w: 5.8, d: 1.8, h: 1.2, color: '#e9e4d6',
                    texto: 'Pequeña y de poco alcance. Que no quede tapada por metal ni pegada a una batería.' },
                { n: 9, nombre: 'Dos tiras de 8 pines', tipo: 'grupo', x: 40, abajo: true,
                    texto: 'Las 16 patas a 2,54 mm para la protoboard: GPIO 0 a 10, 20 y 21, más 5V, 3V3 y GND.',
                    formas: [{ tipo: 'tira', dx: -6.75, z0: 10, z1: 80, n: 8 }, { tipo: 'tira', dx: 6.75, z0: 10, z1: 80, n: 8 }] }
            ]
        },
        fuertes: [
            'Diminuta y muy barata: cabe dentro de un pulsador o un mando',
            'USB nativo: graba y saca el monitor serie sin controladores',
            'Bluetooth LE 5 de largo alcance y bajo consumo',
            'RISC-V con el mismo código de Arduino que los demás ESP32'
        ],
        cuidado: [
            'Todo va a 3,3 V: 5 V en un GPIO lo daña',
            'Sin `ARDUINO_USB_CDC_ON_BOOT=1` el monitor serie no sale por el USB-C',
            'GPIO2, 8 y 9 deciden el arranque: no los fuerces a masa durante el reset',
            'La antena cerámica tiene poco alcance y el regulador se queda corto con cargas'
        ],
        codigos: [
            { titulo: 'Primer sketch: LED azul y botón BOOT', lenguaje: 'Arduino C++', archivo: 'src/main.cpp', nota: 'Abre el monitor serie a 115200 baudios después de grabar.', texto: SKETCH_C3 },
            { titulo: 'platformio.ini', lenguaje: 'INI', archivo: 'platformio.ini', texto: PLATFORMIO_C3 }
        ],
        flasheo: {
            titulo: 'Grabarle tu programa',
            resumen: 'Se programa directamente por el USB-C, sin controladores ni soldar nada.',
            pasos: [
                'Conecta el USB-C con un cable de datos (los de solo carga no sirven).',
                'Graba con `pio run -t upload` y abre el monitor con `pio device monitor`.',
                'Si el puerto no aparece o la grabación falla: mantén BOOT, pulsa y suelta RST, y suelta BOOT.',
                'Si después de grabar no ves nada en el monitor, pulsa RST: el USB nativo se reconecta al reiniciar.'
            ]
        },
        ideas: [
            'Pulsador inalámbrico para los Shelly por Wi-Fi',
            'Sensor de temperatura a pilas con sueño profundo',
            'Mando BLE para el robot',
            'Baliza de presencia que detecta el móvil por Bluetooth'
        ]
    },

    // =========================================================== M5StampS3
    'm5stamp-s3': {
        claves: [['Procesador', 'ESP32-S3 · 2 × 240 MHz'], ['Flash', '8 MB'], ['PSRAM', 'No'], ['Radio', 'Wi-Fi 4 + BLE 5'], ['USB', 'Nativo (USB-C)'], ['Medidas', '26 × 18 mm']],
        modelo: {
            caja: { tipo: 'placa', w: 18, d: 26, h: 1.2, y: 8.6, r: 1, color: '#17181b', fondo: ['M5StampS3', 'ESP32-S3FN8 · 8 MB'] },
            piezas: [
                { n: 1, nombre: 'ESP32-S3FN8 bajo blindaje', tipo: 'blindaje', x: 40, z: 37, w: 6.5, d: 9.6, h: 2, rotulo: 'STAMP\nS3',
                    texto: 'El mismo ESP32-S3 de doble núcleo que la DevKitC, con 8 MB de flash integrados y sin PSRAM.' },
                { n: 2, nombre: 'Antena 3D', tipo: 'grupo', x: 40, z: 8,
                    texto: 'Una antena de hilo elevada sobre la placa: mejor alcance que una impresa para lo pequeño que es el sello.',
                    formas: [{ tipo: 'caja', w: 8.1, d: 2.6, h: 1.4, color: '#2a2d33' }, { tipo: 'antena', dy: 1.4, w: 7.5, d: 1.8 }] },
                { n: 3, nombre: 'LED RGB WS2812B', tipo: 'rgb', x: 33, z: 64, w: 1.8,
                    texto: 'En G21. Se maneja con FastLED o con rgbLedWrite() y es el «blink» del sello.' },
                { n: 4, nombre: 'Botón programable (G0)', tipo: 'boton', x: 46, z: 64, r: 1.1, h: 1, color: '#e2b93b',
                    texto: 'En G0: mantenido al conectar, entra en modo descarga; después es un botón de usuario.' },
                { n: 5, nombre: 'USB-C nativo', tipo: 'usbc', x: 40, z: 93, w: 8.9, d: 6.5,
                    texto: 'Va al USB del ESP32-S3: alimenta, graba y hace de monitor serie, teclado o disco.' },
                { n: 6, nombre: 'Tiras de 9 y 6 pines', tipo: 'grupo', x: 40, abajo: true,
                    texto: 'La versión con cabecera de 2,54 mm: 10 GPIO, 5V, 3V3, EN y masa. Cabe en una protoboard dejando una fila libre a cada lado.',
                    formas: [{ tipo: 'tira', dx: -6.75, z0: 10, z1: 90, n: 9 }, { tipo: 'tira', dx: 6.75, z0: 40, z1: 90, n: 6 }] }
            ]
        },
        fuertes: [
            'El ESP32-S3 entero en un sello de 26 × 18 mm',
            'USB nativo: teclado, ratón, MIDI o disco sin puente USB-serie',
            'LED RGB y botón ya integrados',
            'Antena 3D con buen alcance para su tamaño'
        ],
        cuidado: [
            'Todo va a 3,3 V: 5 V en un GPIO lo daña',
            'Sin PSRAM: nada de cámaras ni buffers de pantalla grandes',
            'G0 y G3 deciden el arranque: no los fuerces durante el reset',
            'Solo saca 10 GPIO en la versión con cabecera'
        ],
        codigos: [
            { titulo: 'Primer sketch: LED RGB y botón', lenguaje: 'Arduino C++', archivo: 'src/main.cpp', nota: 'Con el platformio.ini de abajo, PlatformIO descarga FastLED solo.', texto: SKETCH_STAMP },
            { titulo: 'platformio.ini', lenguaje: 'INI', archivo: 'platformio.ini', texto: PLATFORMIO_STAMP }
        ],
        flasheo: {
            titulo: 'Grabarle tu programa',
            resumen: 'Se programa directamente por el USB-C, sin soldar nada.',
            pasos: [
                'Conecta el USB-C con un cable de datos.',
                'Graba con `pio run -t upload` y abre el monitor con `pio device monitor`.',
                'Si no entra en modo descarga: desconecta, mantén el botón G0 y vuelve a conectar.',
                'Tras grabar en modo descarga, desconecta y vuelve a conectar para que arranque tu programa.'
            ]
        },
        ideas: [
            'Teclado de atajos de un solo botón por USB',
            'Indicador de estado de la casa con el LED RGB',
            'Mando para los Shelly por Wi-Fi',
            'Sensor ambiental con el BME280 por I²C'
        ]
    }
});

// ================================================= sensores y actuadores
// Primer sketch para la ESP32-S3 DevKitC-1 con su platformio.ini y las
// librerías que pida. I²C en GPIO8 (SDA) y GPIO9 (SCL).
const conS3 = (titulo, texto, libs = [], nota) => [
    { titulo, lenguaje: 'Arduino C++', archivo: 'src/main.cpp', nota: nota || 'Para la ESP32-S3. Abre el monitor serie a 115200 baudios.', texto },
    { titulo: 'platformio.ini', lenguaje: 'INI', archivo: 'platformio.ini', texto: conLibrerias(PLATFORMIO_INI, libs) }
];
const GRABAR = 'Graba la ESP32-S3 con `pio run -t upload` y abre el monitor con `pio device monitor`.';
const conectar = (resumen, ...pasos) => ({ titulo: 'Conectarlo', resumen, pasos: [...pasos, GRABAR] });

const SK_INMP441 = `// INMP441 · primer sketch: lee el micrófono por I²S y saca el nivel de
// sonido por el monitor serie (sube al hablar o dar una palmada).
#include <Arduino.h>
#include <driver/i2s.h>

constexpr int PIN_SCK = 4, PIN_WS = 5, PIN_SD = 6;

void setup() {
  Serial.begin(115200);
  i2s_config_t cfg = {};
  cfg.mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX);
  cfg.sample_rate = 16000;
  cfg.bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT;
  cfg.channel_format = I2S_CHANNEL_FMT_ONLY_LEFT;   // L/R a GND
  cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  cfg.dma_buf_count = 4;
  cfg.dma_buf_len = 256;
  i2s_pin_config_t pines = {};
  pines.mck_io_num = I2S_PIN_NO_CHANGE;
  pines.bck_io_num = PIN_SCK;
  pines.ws_io_num = PIN_WS;
  pines.data_out_num = I2S_PIN_NO_CHANGE;
  pines.data_in_num = PIN_SD;
  i2s_driver_install(I2S_NUM_0, &cfg, 0, nullptr);
  i2s_set_pin(I2S_NUM_0, &pines);
}

void loop() {
  static int32_t muestras[256];
  size_t leidos = 0;
  i2s_read(I2S_NUM_0, muestras, sizeof(muestras), &leidos, portMAX_DELAY);
  const int n = leidos / 4;
  double suma = 0;
  for (int i = 0; i < n; i++) {
    const double v = muestras[i] >> 14;   // 18 bit útiles
    suma += v * v;
  }
  Serial.printf("Nivel %.0f\\n", sqrt(suma / (n > 0 ? n : 1)));
}
`;

const skServo = (nombre, min, max) => `// ${nombre} · primer sketch: barre de 0° a 180° y vuelve.
// La señal va a GPIO4; el servo se alimenta aparte (masa común con la placa).
#include <Arduino.h>
#include <ESP32Servo.h>

constexpr int PIN_SERVO = 4;
Servo servo;

void setup() {
  Serial.begin(115200);
  servo.setPeriodHertz(50);
  servo.attach(PIN_SERVO, ${min}, ${max});   // pulso mínimo y máximo en µs
}

void loop() {
  for (int a = 0; a <= 180; a += 2) { servo.write(a); delay(15); }
  Serial.println("180");
  for (int a = 180; a >= 0; a -= 2) { servo.write(a); delay(15); }
  Serial.println("0");
}
`;

const SK_HCSR04 = `// HC-SR04 · primer sketch: mide la distancia cuatro veces por segundo.
// ECHO sale a 5 V: pásalo por el divisor 1 kΩ / 2 kΩ antes de GPIO6.
#include <Arduino.h>

constexpr int PIN_TRIG = 5, PIN_ECHO = 6;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
}

void loop() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);       // pulso de 10 µs
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  const unsigned long us = pulseIn(PIN_ECHO, HIGH, 30000);
  if (us == 0) Serial.println("Sin eco (más de 5 m o nada delante)");
  else Serial.printf("%.1f cm\\n", us / 58.0);
  delay(250);
}
`;

const SK_BME280 = `// BME280 · primer sketch: temperatura, humedad y presión cada 2 s.
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);
  Wire.begin(8, 9);                     // SDA, SCL
  if (!bme.begin(0x76) && !bme.begin(0x77)) {
    Serial.println("No encuentro el BME280: revisa SDA, SCL y la dirección");
    while (true) delay(1000);
  }
}

void loop() {
  Serial.printf("%.1f °C · %.0f %% · %.1f hPa\\n", bme.readTemperature(), bme.readHumidity(), bme.readPressure() / 100.0);
  delay(2000);
}
`;

const SK_VL53 = `// VL53L1X · primer sketch: distancia láser en milímetros, 20 veces por segundo.
#include <Arduino.h>
#include <Wire.h>
#include <VL53L1X.h>

VL53L1X sensor;

void setup() {
  Serial.begin(115200);
  Wire.begin(8, 9);                     // SDA, SCL
  Wire.setClock(400000);
  sensor.setTimeout(500);
  if (!sensor.init()) {
    Serial.println("No encuentro el VL53L1X: revisa SDA y SCL");
    while (true) delay(1000);
  }
  sensor.setDistanceMode(VL53L1X::Long);
  sensor.setMeasurementTimingBudget(50000);
  sensor.startContinuous(50);
}

void loop() {
  const uint16_t mm = sensor.read();
  if (sensor.timeoutOccurred()) Serial.println("Tiempo agotado");
  else Serial.printf("%u mm\\n", mm);
}
`;

const SK_DS18B20 = `// DS18B20 · primer sketch: temperatura por 1-Wire cada segundo.
// DQ en GPIO4 con su resistencia de 4,7 kΩ a 3,3 V (el módulo ya la lleva).
#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

OneWire bus(4);
DallasTemperature sondas(&bus);

void setup() {
  Serial.begin(115200);
  sondas.begin();
  Serial.printf("Sondas en el bus: %d\\n", sondas.getDeviceCount());
}

void loop() {
  sondas.requestTemperatures();
  const float c = sondas.getTempCByIndex(0);
  if (c == DEVICE_DISCONNECTED_C) Serial.println("Sonda desconectada");
  else Serial.printf("%.2f °C\\n", c);
  delay(1000);
}
`;

const SK_PIR = `// HC-SR501 · primer sketch: avisa cuando empieza y cuando acaba el movimiento
// y enciende el LED RGB de la placa mientras dura.
#include <Arduino.h>

constexpr int PIN_PIR = 5, PIN_RGB = 48;
bool antes = false;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PIR, INPUT);
  Serial.println("Espera un minuto a que el PIR se estabilice");
}

void loop() {
  const bool ahora = digitalRead(PIN_PIR) == HIGH;
  if (ahora != antes) {
    Serial.println(ahora ? "Movimiento" : "Quieto");
    neopixelWrite(PIN_RGB, ahora ? 40 : 0, 0, 0);
    antes = ahora;
  }
  delay(50);
}
`;

const SK_RELE2 = `// Módulo de 2 relés · primer sketch: conmuta un relé cada segundo.
// Las entradas son activas a nivel bajo: LOW activa el relé.
#include <Arduino.h>

constexpr int PIN_IN1 = 4, PIN_IN2 = 5;

void setup() {
  Serial.begin(115200);
  digitalWrite(PIN_IN1, HIGH);          // apagados antes de ser salidas
  digitalWrite(PIN_IN2, HIGH);
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
}

void loop() {
  digitalWrite(PIN_IN1, LOW);  digitalWrite(PIN_IN2, HIGH); Serial.println("Relé 1");
  delay(1000);
  digitalWrite(PIN_IN1, HIGH); digitalWrite(PIN_IN2, LOW);  Serial.println("Relé 2");
  delay(1000);
}
`;

const SK_ZUMBADOR = `// Zumbador activo · primer sketch: tres pitidos cortos y uno largo cada 3 s.
// Muchos módulos se activan con LOW: si suena al revés, cambia ACTIVO.
#include <Arduino.h>

constexpr int PIN_ZUMBADOR = 4;
constexpr int ACTIVO = HIGH;

void pitido(int ms) {
  digitalWrite(PIN_ZUMBADOR, ACTIVO);
  delay(ms);
  digitalWrite(PIN_ZUMBADOR, !ACTIVO);
  delay(120);
}

void setup() {
  pinMode(PIN_ZUMBADOR, OUTPUT);
  digitalWrite(PIN_ZUMBADOR, !ACTIVO);
}

void loop() {
  for (int i = 0; i < 3; i++) pitido(80);
  pitido(400);
  delay(3000);
}
`;

const SK_PCA9685 = `// PCA9685 · primer sketch: barre el servo del canal 0 y deja quietos los demás.
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pca;

void setup() {
  Serial.begin(115200);
  Wire.begin(8, 9);                     // SDA, SCL
  pca.begin();
  pca.setOscillatorFrequency(27000000);
  pca.setPWMFreq(50);                   // 50 Hz para servos
}

void loop() {
  for (int us = 500; us <= 2400; us += 20) { pca.writeMicroseconds(0, us); delay(10); }
  for (int us = 2400; us >= 500; us -= 20) { pca.writeMicroseconds(0, us); delay(10); }
  Serial.println("Vuelta");
}
`;

const skMotor = nombre => `// ${nombre} · primer sketch: acelera, frena y cambia de sentido.
// ENA en GPIO4 (velocidad por PWM), IN1 en GPIO5 e IN2 en GPIO6 (sentido).
#include <Arduino.h>

constexpr int PIN_ENA = 4, PIN_IN1 = 5, PIN_IN2 = 6;

void sentido(bool adelante) {
  digitalWrite(PIN_IN1, adelante ? HIGH : LOW);
  digitalWrite(PIN_IN2, adelante ? LOW : HIGH);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  pinMode(PIN_ENA, OUTPUT);
}

void loop() {
  for (bool adelante : {true, false}) {
    sentido(adelante);
    Serial.println(adelante ? "Adelante" : "Atrás");
    for (int v = 80; v <= 255; v += 5) { analogWrite(PIN_ENA, v); delay(30); }
    delay(800);
    for (int v = 255; v >= 0; v -= 5) { analogWrite(PIN_ENA, v); delay(30); }
    delay(500);
  }
}
`;

const SK_MPU6050 = `// MPU6050 · primer sketch: lee acelerómetro y giroscopio sin librerías
// y calcula la inclinación en grados.
#include <Arduino.h>
#include <Wire.h>

constexpr uint8_t MPU = 0x68;           // 0x69 si AD0 va a 3,3 V

int16_t lee16() { const int16_t h = Wire.read(); return (h << 8) | Wire.read(); }

void setup() {
  Serial.begin(115200);
  Wire.begin(8, 9);                     // SDA, SCL
  Wire.beginTransmission(MPU);
  Wire.write(0x6B);                     // PWR_MGMT_1: despertar
  Wire.write(0);
  Wire.endTransmission();
}

void loop() {
  Wire.beginTransmission(MPU);
  Wire.write(0x3B);                     // ACCEL_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom(MPU, (uint8_t)14);
  const float ax = lee16() / 16384.0, ay = lee16() / 16384.0, az = lee16() / 16384.0;
  const float temp = lee16() / 340.0 + 36.53;
  const float gx = lee16() / 131.0, gy = lee16() / 131.0, gz = lee16() / 131.0;
  const float cabeceo = atan2(ax, sqrt(ay * ay + az * az)) * 57.3, alabeo = atan2(ay, az) * 57.3;
  Serial.printf("Cabeceo %.1f° · alabeo %.1f° · giro %.0f/%.0f/%.0f °/s · %.1f °C\\n", cabeceo, alabeo, gx, gy, gz, temp);
  delay(200);
}
`;

const SK_JOYSTICK = `// Joystick · primer sketch: posición de X e Y entre -100 y 100 y el pulsador.
// VRx en GPIO1 y VRy en GPIO2 (ADC1), SW en GPIO4. Alimenta el módulo a 3,3 V.
#include <Arduino.h>

constexpr int PIN_X = 1, PIN_Y = 2, PIN_SW = 4;
int centroX, centroY;

int escala(int v, int centro) { return constrain(map(v, centro, v < centro ? 0 : 4095, 0, v < centro ? -100 : 100), -100, 100); }

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SW, INPUT_PULLUP);
  delay(200);
  centroX = analogRead(PIN_X);          // en reposo al arrancar
  centroY = analogRead(PIN_Y);
}

void loop() {
  const int x = escala(analogRead(PIN_X), centroX), y = escala(analogRead(PIN_Y), centroY);
  Serial.printf("X %4d · Y %4d · %s\\n", x, y, digitalRead(PIN_SW) == LOW ? "pulsado" : "-");
  delay(100);
}
`;

const SK_IR = `// Receptor IR · primer sketch: apunta un mando y pulsa: sale el protocolo y el código.
#include <Arduino.h>
#include <IRremoteESP8266.h>
#include <IRrecv.h>
#include <IRutils.h>

IRrecv receptor(4);                     // OUT en GPIO4
decode_results resultado;

void setup() {
  Serial.begin(115200);
  receptor.enableIRIn();
  Serial.println("Esperando un mando...");
}

void loop() {
  if (receptor.decode(&resultado)) {
    Serial.println(resultToHumanReadableBasic(&resultado));
    receptor.resume();
  }
}
`;

const PY_LIDAR = `# RPLIDAR A1 · primer programa (en la Raspberry Pi o el PC): 20 vueltas y,
# en cada una, cuántos puntos ha medido y lo más cercano.
from rplidar import RPLidar

lidar = RPLidar("/dev/ttyUSB0")         # en Windows, "COM3" o el que salga
try:
    print(lidar.get_info())
    for i, vuelta in enumerate(lidar.iter_scans()):
        distancias = [d for _, _, d in vuelta if d > 0]
        cerca = min(distancias, default=0)
        print(f"Vuelta {i}: {len(vuelta)} puntos, lo más cercano a {cerca:.0f} mm")
        if i == 20:
            break
finally:
    lidar.stop()
    lidar.stop_motor()
    lidar.disconnect()
`;

const TERMINAL_LIDAR = `# Instala la librería (en un entorno virtual si es Raspberry Pi OS):
python3 -m venv ~/lidar && source ~/lidar/bin/activate
pip install rplidar-roboticia

# Comprueba que aparece el adaptador USB-serie (CP2102)
ls /dev/ttyUSB*

python3 lidar.py`;

const lente = (dx, r) => ({ tipo: 'condensador', dx, r, h: .1, color: '#05070b', tapa: false });

Object.assign(FICHAS, {
    // ====================================================== INMP441 (I²S)
    'inmp441': {
        claves: [['Tipo', 'Micrófono MEMS digital'], ['Bus', 'I²S · 24 bit'], ['Ruido', 'SNR 61 dB'], ['Respuesta', '60 Hz – 15 kHz'], ['Alimentación', '1,8 – 3,3 V']],
        modelo: {
            caja: { tipo: 'placa', w: 15.2, d: 15.2, h: 1.2, y: 8.6, r: 7.4, color: '#121316', fondo: ['INMP441', 'I²S'] },
            piezas: [
                { n: 1, nombre: 'Cápsula MEMS (por debajo)', tipo: 'blindaje', x: 30, z: 30, w: 4, d: 3, h: 1, abajo: true,
                    texto: 'El micrófono va por debajo y escucha por el agujero del centro de la placa: no lo tapes con cinta ni pegamento.' },
                { n: 2, nombre: 'Condensador de desacoplo', tipo: 'smd', x: 38.5, z: 36, w: 2.2, d: 1.1, h: .6, color: '#f4f4f0',
                    texto: 'Filtra la alimentación del micrófono. Cables cortos y masa común para que no entre zumbido.' },
                { n: 3, nombre: 'Dos tiras de 3 pines', tipo: 'grupo', x: 30, abajo: true,
                    texto: 'L/R elige el canal (a GND: izquierdo). WS y SCK son los relojes del I²S y SD los datos.',
                    formas: [{ tipo: 'tira', dx: -5.08, z0: 20, z1: 40, n: 3 }, { tipo: 'tira', dx: 5.08, z0: 20, z1: 40, n: 3 }] }
            ]
        },
        fuertes: ['Sonido digital: sin ruido del ADC ni amplificador', 'Ideal para reconocimiento de voz y medir ruido', 'Dos en el mismo bus dan estéreo (uno con L/R a 3,3 V)', 'Muy pequeño y barato'],
        cuidado: ['Solo funciona a 3,3 V', 'Los datos vienen en 32 bit alineados a la izquierda: hay que desplazarlos', 'Cables I²S cortos; con más de 20 cm aparecen errores', 'No admite sonido analógico: necesita un periférico I²S'],
        codigos: conS3('Primer sketch: nivel de sonido', SK_INMP441, [], 'Usa el driver I²S de ESP-IDF que ya trae el ESP32: no hace falta librería.'),
        flasheo: conectar('Va directo a la placa a 3,3 V con cinco cables.', 'VDD a 3V3, GND a GND y L/R a GND.', 'SCK a GPIO4, WS a GPIO5 y SD a GPIO6.'),
        ideas: ['Medidor de ruido de la habitación', 'Detector de palmadas para encender la luz', 'Asistente de voz con el amplificador MAX98357A', 'Avisar si el perro ladra mucho rato']
    },

    // ================================================================ SG90
    'sg90': {
        claves: [['Par', '1,8 kg·cm a 4,8 V'], ['Giro', '180°'], ['Velocidad', '0,1 s / 60°'], ['Señal', 'PWM de 50 Hz'], ['Alimentación', '4,8 – 6 V']],
        modelo: {
            caja: { w: 22.8, d: 12.2, h: 22.5, r: 1, color: '#2f55d6', rect: [15, 9, 66, 42, 3], fondo: ['SG90 · 9 g', 'Micro Servo'] },
            placa: { y: 1.5, color: '#1d5e3a', margen: 1.2 },
            piezas: [
                { n: 1, nombre: 'Motor de continua', tipo: 'condensador', x: 70, z: 30, r: 3, h: 12, color: '#c9ced4',
                    texto: 'Un motorcito de continua que gira muy rápido. La reductora lo convierte en poca velocidad y más fuerza.' },
                { n: 2, nombre: 'Reductora de plástico', tipo: 'grupo', x: 33, z: 30,
                    texto: 'Cuatro engranajes de nailon. Si fuerzas el brazo con la mano o lo bloqueas, son lo primero que se rompe.',
                    formas: [{ tipo: 'condensador', r: 5, h: 1.6, color: '#f4f4f0', tapa: false, dy: 10 }, { tipo: 'condensador', dx: 6, r: 3.2, h: 1.6, color: '#f4f4f0', tapa: false, dy: 13 }, { tipo: 'condensador', dx: 2, dz: 3, r: 2.4, h: 1.6, color: '#f4f4f0', tapa: false, dy: 7 }] },
                { n: 3, nombre: 'Potenciómetro de posición', tipo: 'pot', x: 33, z: 30, r: 2.4, h: 4,
                    texto: 'Va unido al eje de salida: así el servo sabe en qué ángulo está y corrige hasta llegar al que le pides.' },
                { n: 4, nombre: 'Placa de control', tipo: 'chip', x: 52, z: 22, w: 5, d: 3, h: 1, rotulo: 'CTRL',
                    texto: 'Compara el ancho del pulso (de 0,5 a 2,4 ms) con el potenciómetro y mueve el motor hasta igualarlos.' },
                { n: 5, nombre: 'Eje de salida y brazo', tipo: 'grupo', x: 33, z: 30, en: 'tapa',
                    texto: 'El eje estriado con su brazo atornillado. Pon el servo a 90° antes de fijar el brazo para centrarlo.',
                    formas: [{ tipo: 'condensador', r: 2.4, h: 4, color: '#f4f4f0', tapa: false }, { tipo: 'caja', dy: 4, w: 4.5, d: 20, h: 1.3, color: '#fbfbfb' }] },
                { n: 6, nombre: 'Orejetas de montaje', tipo: 'grupo', x: 48, z: 30, en: 'tapa',
                    texto: 'Las dos pestañas con agujero para atornillarlo al chasis.',
                    formas: [{ tipo: 'caja', dy: -7, w: 32, d: 5.8, h: 2.5, color: '#2f55d6' }] },
                { n: 7, nombre: 'Cable y conector', tipo: 'caja', x: 118, z: 30, w: 5, d: 7.5, h: 2.5, color: '#16171a', asoma: true,
                    texto: 'Marrón a GND, rojo a 5 V y naranja a la señal. El conector de 2,54 mm encaja en una tira de pines.' }
            ]
        },
        fuertes: ['Barato y ligero: el más usado en robots pequeños', 'Se mueve a un ángulo exacto con una sola señal', 'Se controla con cualquier GPIO del ESP32', 'Encaja en el PCA9685 para manejar muchos a la vez'],
        cuidado: ['Aliméntalo a 5 V aparte: los picos de corriente reinician el ESP32', 'Masa común entre la fuente del servo y la placa', 'Los engranajes de plástico se rompen si lo fuerzas', 'Cada unidad tiene sus pulsos mínimo y máximo: ajústalos'],
        codigos: conS3('Primer sketch: barrido de 0° a 180°', skServo('SG90', 500, 2400), ['madhephaestus/ESP32Servo']),
        flasheo: conectar('Tres cables, pero la alimentación mejor de una fuente de 5 V.', 'Rojo a 5 V de la fuente y marrón a GND, unido también al GND de la placa.', 'Naranja (señal) a GPIO4.'),
        ideas: ['Cabeza que gira el HC-SR04 para mirar a los lados', 'Cerradura de cajón con el receptor IR', 'Brazo de dos ejes con el joystick', 'Indicador de aguja para la temperatura']
    },

    // ============================================================ HC-SR04
    'hc-sr04': {
        claves: [['Rango', '2 – 400 cm'], ['Resolución', '≈ 3 mm'], ['Ángulo', '≈ 15°'], ['Alimentación', '5 V'], ['Señal ECHO', '5 V']],
        modelo: {
            caja: { tipo: 'placa', w: 45.7, d: 20.3, h: 1.6, y: 8.6, r: .6, color: '#1a5fb4', fondo: ['HC-SR04', 'MAX232 · LM324'] },
            piezas: [
                { n: 1, nombre: 'Emisor de ultrasonidos (T)', tipo: 'grupo', x: 38, z: 34,
                    texto: 'Lanza un tren de 8 pulsos a 40 kHz cuando TRIG recibe un pulso de 10 µs.',
                    formas: [{ tipo: 'condensador', r: 8, h: 12, color: '#c9ced4', tapa: false }, { tipo: 'condensador', r: 6.4, h: .3, color: '#15171a', tapa: false, dy: 12 }] },
                { n: 2, nombre: 'Receptor de ultrasonidos (R)', tipo: 'grupo', x: 142, z: 34,
                    texto: 'Escucha el eco. ECHO queda en alto tanto tiempo como tarda el sonido en ir y volver: 58 µs por centímetro.',
                    formas: [{ tipo: 'condensador', r: 8, h: 12, color: '#c9ced4', tapa: false }, { tipo: 'condensador', r: 6.4, h: .3, color: '#15171a', tapa: false, dy: 12 }] },
                { n: 3, nombre: 'Cristal de cuarzo', tipo: 'cristal', x: 90, z: 13, w: 6, d: 2.6, h: 3.5,
                    texto: 'Marca el ritmo del microcontrolador que genera los 40 kHz y mide el eco.' },
                { n: 4, nombre: 'Electrónica (por debajo)', tipo: 'grupo', x: 90, z: 40, abajo: true,
                    texto: 'Un MAX232 eleva los pulsos para el emisor, un LM324 amplifica el eco débil y un microcontrolador lo coordina.',
                    formas: [{ tipo: 'chip', dx: -10, w: 9, d: 4, h: 1.5, rotulo: 'MAX232' }, { tipo: 'chip', dx: 1, w: 9, d: 4, h: 1.5, rotulo: 'LM324' }, { tipo: 'chip', dx: 11, w: 5, d: 4, h: 1.2, rotulo: 'MCU' }] },
                { n: 5, nombre: 'Tira de 4 pines', tipo: 'grupo', x: 85, z: 70, abajo: true,
                    texto: 'VCC (5 V), TRIG, ECHO y GND.',
                    formas: [{ tipo: 'tira', x0: 70, x1: 100, n: 4 }] }
            ]
        },
        fuertes: ['Muy barato y fácil de entender', 'Mide bien de 2 cm a unos 4 m', 'No le afecta la luz ni el color del objeto', 'Solo dos GPIO'],
        cuidado: ['ECHO sale a 5 V: usa el divisor 1 kΩ / 2 kΩ antes del ESP32', 'Telas, espuma y superficies inclinadas apenas devuelven eco', 'Dos sensores juntos se confunden: dispáralos por turnos', 'La velocidad del sonido cambia con la temperatura'],
        codigos: conS3('Primer sketch: distancia en centímetros', SK_HCSR04),
        flasheo: conectar('Necesita 5 V y un divisor en ECHO.', 'VCC a 5V y GND a GND.', 'TRIG a GPIO5. ECHO al divisor 1 kΩ / 2 kΩ y su punto medio a GPIO6.'),
        ideas: ['Robot que esquiva obstáculos', 'Medidor del nivel del depósito de agua', 'Sensor de aparcamiento para el garaje', 'Contador de personas que pasan por una puerta']
    },

    // ============================================================= BME280
    'bme280': {
        claves: [['Mide', 'T, humedad y presión'], ['Precisión', '±1 °C · ±3 % · ±1 hPa'], ['Bus', 'I²C (0x76 o 0x77)'], ['Alimentación', '3,3 V'], ['Consumo', '< 1 mA']],
        modelo: {
            caja: { tipo: 'placa', w: 15.2, d: 12.7, h: 1.2, y: 8.6, r: .8, color: '#6b2fa3', fondo: ['BME280', 'I²C 0x76 / 0x77'] },
            piezas: [
                { n: 1, nombre: 'Sensor BME280', tipo: 'blindaje', x: 30, z: 16, w: 2.5, d: 2.5, h: .93,
                    texto: 'La cápsula metálica de 2,5 mm con un agujerito: por ahí entra el aire. No la tapes ni la toques con los dedos.' },
                { n: 2, nombre: 'Resistencias de pull-up', tipo: 'grupo', x: 30, z: 14,
                    texto: 'Mantienen SDA y SCL en alto. Si conectas varios módulos I²C, sobran las de todos menos uno.',
                    formas: [{ tipo: 'smd', dx: -5.6, w: 1.6, d: .8, h: .5, color: '#2a2c30' }, { tipo: 'smd', dx: 5.6, w: 1.6, d: .8, h: .5, color: '#2a2c30' }] },
                { n: 3, nombre: 'Tira de 4 pines', tipo: 'grupo', x: 25, z: 40, abajo: true,
                    texto: 'VIN, GND, SCL y SDA. El SDO, si está, elige la dirección: a GND 0x76, a 3,3 V 0x77.',
                    formas: [{ tipo: 'tira', x0: 10, x1: 40, n: 4 }] }
            ]
        },
        fuertes: ['Tres medidas en un sensor pequeño', 'La presión da la altitud con ±1 m', 'Consumo mínimo: aguanta años con pilas', 'Dos en el mismo bus con direcciones distintas'],
        cuidado: ['Hay BMP280 vendidos como BME280: el BMP no mide humedad', 'Lejos del ESP32: su calor sube la temperatura medida', 'Si no lo encuentra, prueba 0x77 en vez de 0x76', 'Va a 3,3 V salvo que el módulo traiga regulador'],
        codigos: conS3('Primer sketch: temperatura, humedad y presión', SK_BME280, ['adafruit/Adafruit BME280 Library']),
        flasheo: conectar('Cuatro cables por I²C.', 'VIN a 3V3 y GND a GND.', 'SDA a GPIO8 y SCL a GPIO9.'),
        ideas: ['Estación meteorológica con gráfica en la CYD', 'Avisar de humedad alta en el baño', 'Previsión de tormenta por la caída de presión', 'Altímetro para un dron']
    },

    // ============================================================ VL53L1X
    'vl53l1x': {
        claves: [['Rango', 'Hasta 4 m'], ['Precisión', '± 5 mm'], ['Medidas', 'Hasta 50 por segundo'], ['Bus', 'I²C (0x29)'], ['Láser', 'Clase 1 · 940 nm']],
        modelo: {
            caja: { tipo: 'placa', w: 17.8, d: 12.7, h: 1.2, y: 8.6, r: .8, color: '#1f4f8f', fondo: ['VL53L1X', 'ToF · I²C 0x29'] },
            piezas: [
                { n: 1, nombre: 'Sensor VL53L1X', tipo: 'grupo', x: 35, z: 16,
                    texto: 'Un emisor láser invisible y una matriz de detectores que cronometran cuánto tarda en volver la luz.',
                    formas: [{ tipo: 'caja', w: 4.9, d: 2.5, h: 1.56, color: '#16171a' }, { ...lente(-1.2, .45), dy: 1.56 }, { ...lente(1.2, .45), dy: 1.56 }] },
                { n: 2, nombre: 'Resistencias de pull-up', tipo: 'grupo', x: 35, z: 14,
                    texto: 'Mantienen SDA y SCL en alto en el bus I²C.',
                    formas: [{ tipo: 'smd', dx: -6.9, w: 1.6, d: .8, h: .5, color: '#2a2c30' }, { tipo: 'smd', dx: 6.9, w: 1.6, d: .8, h: .5, color: '#2a2c30' }] },
                { n: 3, nombre: 'Tira de 5 pines', tipo: 'grupo', x: 30, z: 40, abajo: true,
                    texto: 'VIN, GND, SDA, SCL y XSHUT. Con XSHUT apagas sensores para cambiarles la dirección y usar varios.',
                    formas: [{ tipo: 'tira', x0: 10, x1: 50, n: 5 }] }
            ]
        },
        fuertes: ['Mide con luz: haz estrecho y preciso', 'No le afectan las telas que confunden al ultrasonido', 'Hasta 4 m en modo largo', 'Zona de interés ajustable dentro del campo de visión'],
        cuidado: ['El sol directo reduce mucho el alcance', 'Quita el plástico protector de la ventana', 'Todos salen con la dirección 0x29: para varios, usa XSHUT', 'Cristales y espejos dan lecturas falsas'],
        codigos: conS3('Primer sketch: distancia en milímetros', SK_VL53, ['pololu/VL53L1X']),
        flasheo: conectar('Cuatro cables por I²C (XSHUT puede quedar sin conectar).', 'VIN a 3V3 y GND a GND.', 'SDA a GPIO8 y SCL a GPIO9.'),
        ideas: ['Sensor de altura para un dron', 'Detectar la mano para un grifo sin contacto', 'Robot que sigue la pared', 'Contador de personas en una puerta estrecha']
    },

    // ============================================================ DS18B20
    'ds18b20': {
        claves: [['Rango', '-55 a 125 °C'], ['Precisión', '± 0,5 °C'], ['Bus', '1-Wire'], ['Resolución', '9 a 12 bit'], ['Sonda', 'Acero inoxidable']],
        modelo: {
            caja: { tipo: 'placa', w: 12.7, d: 15.2, h: 1.2, y: 8.6, r: .8, color: '#20232a', fondo: ['DS18B20', '1-Wire'] },
            piezas: [
                { n: 1, nombre: 'Sonda sumergible y cable', tipo: 'grupo', x: 25, z: 0,
                    texto: 'El DS18B20 va sellado dentro de una funda de acero: se puede meter en agua, tierra o un depósito.',
                    formas: [{ tipo: 'caja', dz: -5, w: 3.5, d: 10, h: 3.5, color: '#1c1d20' }, { tipo: 'blindaje', dz: -16, w: 6, d: 12, h: 6 }] },
                { n: 2, nombre: 'Resistencia de pull-up de 4,7 kΩ', tipo: 'chip', x: 25, z: 21, w: 4, d: 4, h: .8, rotulo: '4K7',
                    texto: 'Imprescindible en el bus 1-Wire: sin ella las lecturas fallan o salen -127 °C.' },
                { n: 3, nombre: 'Tira de 3 pines', tipo: 'grupo', x: 20, z: 50, abajo: true,
                    texto: 'GND, DQ (datos) y VDD. Varias sondas pueden compartir el mismo pin DQ.',
                    formas: [{ tipo: 'tira', x0: 10, x1: 30, n: 3 }] }
            ]
        },
        fuertes: ['Sumergible y resistente', 'Muchas sondas en un solo GPIO, cada una con su dirección', 'Digital: el cable largo no estropea la medida', 'Funciona a 3,3 V'],
        cuidado: ['-127 °C significa que no responde: revisa la pull-up y los cables', 'Tarda 750 ms por medida a 12 bit', 'Hay clones que miden peor: compra de un vendedor fiable', 'El cable de la sonda no aguanta tirones'],
        codigos: conS3('Primer sketch: temperatura cada segundo', SK_DS18B20, ['paulstoffregen/OneWire', 'milesburton/DallasTemperature']),
        flasheo: conectar('Tres cables: el módulo ya lleva la resistencia de 4,7 kΩ.', 'VDD a 3V3 y GND a GND.', 'DQ a GPIO4.'),
        ideas: ['Temperatura del agua de la piscina o el acuario', 'Termostato del termo con un relé', 'Registro de temperatura del congelador', 'Varias sondas por la casa en un solo cable']
    },

    // ============================================================ HC-SR501
    'pir-hcsr501': {
        claves: [['Alcance', '3 – 7 m ajustable'], ['Ángulo', '≈ 110°'], ['Retardo', '3 s – 5 min'], ['Salida', '3,3 V digital'], ['Alimentación', '4,5 – 20 V']],
        modelo: {
            caja: { tipo: 'placa', w: 33, d: 25.4, h: 1.6, y: 8.6, r: .8, color: '#1f8a4c', fondo: ['HC-SR501', 'BISS0001'] },
            piezas: [
                { n: 1, nombre: 'Lente de Fresnel', tipo: 'lente', x: 65, z: 42, r: 9,
                    texto: 'La cúpula blanca divide la habitación en zonas: el sensor nota cuándo una fuente de calor pasa de una a otra.' },
                { n: 2, nombre: 'Sensor piroeléctrico', tipo: 'sensor', x: 65, z: 42, r: 2.5, h: 5,
                    texto: 'Bajo la lente: dos elementos que detectan cambios de radiación infrarroja, como el calor de una persona que se mueve.' },
                { n: 3, nombre: 'Potenciómetros de alcance y tiempo', tipo: 'grupo', x: 65, z: 86,
                    texto: 'Uno ajusta la distancia de detección (3 a 7 m) y el otro cuánto dura la salida en alto (3 s a 5 min).',
                    formas: [{ tipo: 'pot', dx: -12.45, r: 2, h: 2.5 }, { tipo: 'pot', dx: 12.45, r: 2, h: 2.5 }] },
                { n: 4, nombre: 'Controlador BISS0001 (por debajo)', tipo: 'chip', x: 65, z: 50, w: 10, d: 4, h: 1.5, abajo: true, rotulo: 'BISS0001',
                    texto: 'Amplifica la señal del sensor y genera el pulso de salida. Junto a él, el puente H/L elige si se reactiva.' },
                { n: 5, nombre: 'Tira de 3 pines', tipo: 'grupo', x: 60, z: 90, abajo: true,
                    texto: 'VCC (5 V), OUT y GND. OUT sale a 3,3 V: va directo a un GPIO.',
                    formas: [{ tipo: 'tira', x0: 50, x1: 70, n: 3 }] }
            ]
        },
        fuertes: ['Detecta personas en una habitación entera', 'Salida de 3,3 V directa al GPIO', 'Consume muy poco en reposo', 'Alcance y tiempo ajustables sin programar'],
        cuidado: ['Tarda un minuto en estabilizarse al encenderlo', 'No detecta a alguien quieto: solo el movimiento', 'El sol, la calefacción y el aire caliente dan falsos avisos', 'Gira los potenciómetros con suavidad: son frágiles'],
        codigos: conS3('Primer sketch: aviso de movimiento', SK_PIR),
        flasheo: conectar('Se alimenta a 5 V, pero su salida ya es de 3,3 V.', 'VCC a 5V y GND a GND.', 'OUT a GPIO5.'),
        ideas: ['Luz del pasillo que se enciende al pasar', 'Aviso al móvil si hay movimiento en casa', 'Apagar la pantalla cuando no hay nadie', 'Contar visitas al comedero de pájaros']
    },

    // ============================================================ 2 relés
    'rele-2ch': {
        claves: [['Contactos', '10 A · 250 V CA'], ['Bobina', '5 V'], ['Entradas', 'Activas a nivel bajo'], ['Aislamiento', 'Optoacoplador'], ['Canales', '2']],
        modelo: {
            caja: { tipo: 'placa', w: 50.8, d: 38.1, h: 1.6, y: 1.5, r: 1.2, color: '#123f7d', fondo: ['Módulo de 2 relés', 'SRD-05VDC-SL-C'] },
            piezas: [
                { n: 1, nombre: 'Relé 1', tipo: 'rele', x: 109, z: 38, w: 19, d: 15.5, h: 15, color: '#2f7ff0', rotulo: 'SRD-05VDC',
                    texto: 'Una bobina de 5 V que, al activarse, mueve el contacto de NC a NO. Se oye el clic.' },
                { n: 2, nombre: 'Relé 2', tipo: 'rele', x: 109, z: 112, w: 19, d: 15.5, h: 15, color: '#2f7ff0', rotulo: 'SRD-05VDC',
                    texto: 'Igual que el primero, con sus propias bornas.' },
                { n: 3, nombre: 'Bornas del relé 1', tipo: 'borna', x: 185, eje: 'z', polos: [20, 40, 60], d: 7, h: 9, color: '#2a8f5a',
                    texto: 'NO (normalmente abierto), COM (común) y NC (normalmente cerrado). Para encender algo, usa COM y NO.' },
                { n: 4, nombre: 'Bornas del relé 2', tipo: 'borna', x: 185, eje: 'z', polos: [90, 110, 130], d: 7, h: 9, color: '#2a8f5a',
                    texto: 'Lo mismo para el segundo canal.' },
                { n: 5, nombre: 'Optoacopladores PC817', tipo: 'grupo', x: 40, z: 74,
                    texto: 'Separan la entrada del ESP32 de la bobina: con el puente JD-VCC quitado, el aislamiento es total.',
                    formas: [{ tipo: 'chip', dz: -7.1, w: 5, d: 3, h: 1.4, rotulo: 'PC817' }, { tipo: 'chip', dz: 7.1, w: 5, d: 3, h: 1.4, rotulo: 'PC817' }] },
                { n: 6, nombre: 'LED de cada relé', tipo: 'grupo', x: 56, z: 76,
                    texto: 'Se encienden cuando su relé está activo: sirven para probar el programa sin carga.',
                    formas: [{ tipo: 'led', dz: -11.7, color: '#ff5a4d' }, { tipo: 'led', dz: 11.7, color: '#ff5a4d' }] },
                { n: 7, nombre: 'Cabecera de control', tipo: 'grupo', x: 10,
                    texto: 'GND, IN1, IN2 y VCC. Las entradas se activan con LOW.',
                    formas: [{ tipo: 'cabecera', z0: 50, z1: 80, n: 4 }] }
            ]
        },
        fuertes: ['Conmuta cargas de red o de continua con un GPIO', 'Contacto seco: NO, COM y NC libres', 'Optoacopladores y LED de estado', 'Muy barato y fácil de cablear'],
        cuidado: ['230 V en las bornas: sin tensión al cablear y dentro de una caja', 'Las bobinas piden 5 V: a 3,3 V algunos no se activan', 'Entradas al revés: LOW activa, así que ponlas en HIGH antes de ser salidas', 'Para motores y cargas inductivas, mejor un contactor o un relé de estado sólido'],
        codigos: conS3('Primer sketch: alternar los dos relés', SK_RELE2),
        flasheo: conectar('Prueba primero sin nada en las bornas: solo se oirán los clics.', 'VCC a 5V y GND a GND.', 'IN1 a GPIO4 e IN2 a GPIO5.'),
        ideas: ['Encender la bomba de riego por horario', 'Abrir la puerta del garaje con un pulso', 'Termostato con el DS18B20', 'Encender el ventilador cuando suba la humedad']
    },

    // ============================================================ zumbador
    'zumbador': {
        claves: [['Tipo', 'Activo (con oscilador)'], ['Volumen', '≈ 85 dB a 10 cm'], ['Tono', '≈ 2,3 kHz fijo'], ['Alimentación', '3,3 – 5 V'], ['Control', 'Un GPIO']],
        modelo: {
            caja: { tipo: 'placa', w: 12.7, d: 17.8, h: 1.2, y: 8.6, r: .8, color: '#1b1d21', fondo: ['Zumbador activo'] },
            piezas: [
                { n: 1, nombre: 'Zumbador', tipo: 'condensador', x: 25, z: 24, r: 6, h: 9.5, color: '#111214', tapa: false,
                    texto: 'Lleva dentro su propio oscilador: con darle tensión suena. Por eso no sirve para melodías.' },
                { n: 2, nombre: 'Transistor de disparo (por debajo)', tipo: 'chip', x: 25, z: 45, w: 2.9, d: 1.6, h: 1, abajo: true,
                    texto: 'Da al zumbador la corriente que el GPIO no puede dar. En muchos módulos es PNP y se activa con LOW.' },
                { n: 3, nombre: 'Tira de 3 pines', tipo: 'grupo', x: 20, z: 60, abajo: true,
                    texto: 'VCC, I/O y GND.',
                    formas: [{ tipo: 'tira', x0: 10, x1: 30, n: 3 }] }
            ]
        },
        fuertes: ['Suena con un simple digitalWrite', 'Muy fuerte para su tamaño', 'Funciona a 3,3 V', 'Ideal para avisos y alarmas'],
        cuidado: ['Un solo tono: para melodías hace falta uno pasivo', 'Comprueba si tu módulo se activa con HIGH o con LOW', 'Es molesto: pon un retardo entre pitidos', 'Pierde volumen a 3,3 V'],
        codigos: conS3('Primer sketch: patrón de pitidos', SK_ZUMBADOR),
        flasheo: conectar('Tres cables.', 'VCC a 3V3 (o a 5V para más volumen) y GND a GND.', 'I/O a GPIO4.'),
        ideas: ['Alarma con el PIR', 'Aviso de puerta abierta', 'Pitido al pasar una tarjeta o pulsar un botón', 'Avisador de temperatura alta']
    },

    // ============================================================ PCA9685
    'pca9685': {
        claves: [['Canales', '16 PWM'], ['Resolución', '12 bit'], ['Frecuencia', '24 – 1526 Hz'], ['Bus', 'I²C (0x40)'], ['Potencia', 'Borna V+ aparte']],
        modelo: {
            caja: { tipo: 'placa', w: 30.5, d: 20.3, h: 1.6, y: 1.5, r: .8, color: '#1f4f9c', fondo: ['PCA9685', '16 canales · I²C 0x40'] },
            piezas: [
                { n: 1, nombre: 'Controlador PCA9685', tipo: 'chip', x: 61, z: 50, w: 7.6, d: 3, h: 1, rotulo: 'PCA9685',
                    texto: 'Genera las 16 señales PWM por su cuenta: el ESP32 solo le dice el ancho de cada pulso por I²C.' },
                { n: 2, nombre: 'Salidas para servos', tipo: 'grupo', x: 50, z: 20,
                    texto: 'Grupos de tres pines por canal: señal (amarillo), V+ (rojo) y GND (negro). La placa real trae 16.',
                    formas: [{ tipo: 'cabecera', x0: 20, x1: 80, n: 7, filas: 3 }] },
                { n: 3, nombre: 'Borna de alimentación V+', tipo: 'borna', x: 105, eje: 'z', polos: [13, 27], d: 6, h: 8, color: '#2a8f5a',
                    texto: 'Aquí van los 5 o 6 V de los servos, con fuente propia. No pasa por el regulador ni por el ESP32.' },
                { n: 4, nombre: 'Tira de control', tipo: 'grupo', x: 35, z: 70, abajo: true,
                    texto: 'GND, OE, SCL, SDA, VCC (3,3 V lógica) y V+. Con OE en alto se apagan todas las salidas.',
                    formas: [{ tipo: 'tira', x0: 10, x1: 60, n: 6 }] }
            ]
        },
        fuertes: ['16 servos o LED con solo dos pines', 'El ESP32 queda libre: el chip mantiene los pulsos', 'Se encadenan hasta 62 placas por I²C', 'La potencia de los servos va por otra borna'],
        cuidado: ['VCC es la lógica (3,3 V); los servos van por V+ con su fuente', 'Varios servos a la vez piden varios amperios', 'Calibra la frecuencia: el oscilador varía de una placa a otra', 'El condensador grande de V+ debe estar soldado para cargas fuertes'],
        codigos: conS3('Primer sketch: barrer el servo del canal 0', SK_PCA9685, ['adafruit/Adafruit PWM Servo Driver Library']),
        flasheo: conectar('La lógica va a la placa y la potencia a una fuente aparte.', 'VCC a 3V3 y GND a GND. SDA a GPIO8 y SCL a GPIO9.', 'Fuente de 5 V en la borna V+ y un servo en el canal 0.'),
        ideas: ['Brazo robótico de seis ejes', 'Robot hexápodo de 12 o 18 servos', 'Tira de 16 LED con brillo independiente', 'Cabeza animatrónica con ojos y boca']
    },

    // ============================================================= MG996R
    'mg996r': {
        claves: [['Par', '≈ 10 kg·cm a 6 V'], ['Giro', '180°'], ['Engranajes', 'Metálicos'], ['Señal', 'PWM de 50 Hz'], ['Alimentación', '4,8 – 7,2 V']],
        modelo: {
            caja: { w: 40.7, d: 19.7, h: 37, r: 1.5, color: '#1b1d21', rect: [11, 4, 58, 38, 3], fondo: ['MG996R', 'metal gear'] },
            placa: { y: 1.5, color: '#1d5e3a', margen: 1.5 },
            piezas: [
                { n: 1, nombre: 'Motor de continua', tipo: 'condensador', x: 27, z: 23, r: 6, h: 22, color: '#c9ced4',
                    texto: 'Más grande que el del SG90: por eso tiene más fuerza y pide picos de más de 2 A.' },
                { n: 2, nombre: 'Engranajes metálicos', tipo: 'grupo', x: 54, z: 23,
                    texto: 'La reductora de metal aguanta golpes y cargas que romperían una de plástico.',
                    formas: [{ tipo: 'condensador', r: 8, h: 2, color: '#c9ced4', tapa: false, dy: 26 }, { tipo: 'condensador', dx: -9, r: 4.5, h: 2, color: '#b0b6bd', tapa: false, dy: 22 }] },
                { n: 3, nombre: 'Potenciómetro de posición', tipo: 'pot', x: 54, z: 23, r: 3, h: 8,
                    texto: 'Unido al eje de salida: el servo lo lee para saber en qué ángulo está.' },
                { n: 4, nombre: 'Placa de control', tipo: 'chip', x: 27, z: 8, w: 8, d: 4, h: 1.2, rotulo: 'CTRL',
                    texto: 'Compara el pulso de la señal con el potenciómetro y acciona el motor hasta igualarlos.' },
                { n: 5, nombre: 'Eje de salida y disco', tipo: 'grupo', x: 54, z: 23, en: 'tapa',
                    texto: 'Eje de 25 dientes con un disco atornillado. Centra el servo a 90° antes de montar el brazo.',
                    formas: [{ tipo: 'condensador', r: 3, h: 4, color: '#c9ced4', tapa: false }, { tipo: 'condensador', r: 7.5, h: 1.5, color: '#f4f4f0', tapa: false, dy: 4 }] },
                { n: 6, nombre: 'Orejetas de montaje', tipo: 'grupo', x: 40, z: 23, en: 'tapa',
                    texto: 'Cuatro agujeros para fijarlo al chasis con tornillos M3.',
                    formas: [{ tipo: 'caja', dy: -9, w: 54, d: 8.3, h: 2.5, color: '#26292e' }] },
                { n: 7, nombre: 'Cable y conector', tipo: 'caja', x: 40, z: 50, w: 8, d: 6, h: 2.5, color: '#16171a', asoma: true,
                    texto: 'Marrón a GND, rojo a V+ y naranja a la señal.' }
            ]
        },
        fuertes: ['Mucha fuerza: brazos, pinzas y direcciones de coche', 'Engranajes metálicos duraderos', 'Mismo control que cualquier servo', 'Barato para el par que da'],
        cuidado: ['Picos de más de 2 A: fuente propia de 5 – 6 V y masa común', 'Nunca desde el pin de 5 V de la placa', 'Bloqueado se calienta mucho: no lo dejes forzado', 'Hay muchas copias con menos par del anunciado'],
        codigos: conS3('Primer sketch: barrido de 0° a 180°', skServo('MG996R', 500, 2500), ['madhephaestus/ESP32Servo']),
        flasheo: conectar('Necesita una fuente de 5 – 6 V capaz de dar 2 A o más.', 'Rojo al + de la fuente y marrón a su −, unido también al GND de la placa.', 'Naranja (señal) a GPIO4.'),
        ideas: ['Pinza de un brazo robótico', 'Dirección de un coche RC', 'Persiana o compuerta motorizada', 'Torreta de cámara de dos ejes']
    },

    // ============================================================== L298N
    'l298n': {
        claves: [['Motores', '2 de continua o 1 paso a paso'], ['Corriente', '2 A por canal'], ['Tensión', '5 – 35 V'], ['Control', 'IN1–IN4 + ENA/ENB'], ['Pérdida', '≈ 2 V']],
        modelo: {
            caja: { tipo: 'placa', w: 43, d: 43, h: 1.6, y: 1.5, r: 1.5, color: '#b3202c', fondo: ['L298N', 'Doble puente en H'] },
            piezas: [
                { n: 1, nombre: 'L298N con disipador', tipo: 'grupo', x: 60, z: 51,
                    texto: 'Dos puentes en H de transistores: cambian el sentido del motor invirtiendo la polaridad. Pierden unos 2 V en calor.',
                    formas: [{ tipo: 'caja', w: 17, d: 12, h: 23, color: '#101113' }, { tipo: 'chip', dz: 7.5, w: 15, d: 3, h: 10, rotulo: 'L298N' }] },
                { n: 2, nombre: 'Regulador 78M05', tipo: 'chip', x: 101, z: 50, w: 6.5, d: 6, h: 2.3, rotulo: '78M05',
                    texto: 'Saca 5 V de la batería mientras el puente 5V-EN esté puesto. Quítalo si alimentas a más de 12 V.' },
                { n: 3, nombre: 'Bornas del motor A', tipo: 'borna', z: 10, polos: [30, 50], d: 7, h: 10, color: '#1d5fc2',
                    texto: 'OUT1 y OUT2. Si el motor gira al revés, intercambia los dos cables.' },
                { n: 4, nombre: 'Bornas del motor B', tipo: 'borna', z: 10, polos: [70, 90], d: 7, h: 10, color: '#1d5fc2',
                    texto: 'OUT3 y OUT4 para el segundo motor.' },
                { n: 5, nombre: 'Bornas de alimentación', tipo: 'borna', z: 110, polos: [18, 32], d: 7, h: 10, color: '#1d5fc2',
                    texto: '+12V (la batería de los motores) y GND, que debe unirse al GND del ESP32.' },
                { n: 6, nombre: 'Condensador de filtro', tipo: 'condensador', x: 16, z: 50, r: 3.2, h: 10,
                    texto: 'Suaviza los picos de corriente que provocan los motores al arrancar.' },
                { n: 7, nombre: 'Cabecera de control', tipo: 'grupo', x: 65, z: 110,
                    texto: 'ENA, IN1, IN2, IN3, IN4 y ENB. Quita los puentes de ENA y ENB para regular la velocidad por PWM.',
                    formas: [{ tipo: 'cabecera', x0: 40, x1: 90, n: 6 }] },
                { n: 8, nombre: 'LED de encendido', tipo: 'led', x: 102, z: 70, color: '#ff5a4d',
                    texto: 'Indica que llega la tensión de los motores.' }
            ]
        },
        fuertes: ['Dos motores con sentido y velocidad', 'Aguanta hasta 35 V', 'Bornas de tornillo: sin soldar', 'Saca 5 V para la placa con baterías de hasta 12 V'],
        cuidado: ['Pierde unos 2 V: con 6 V de pilas al motor llegan 4', 'Se calienta: para más de 1 A seguido, mejor un TB6612 o un DRV8833', 'GND común entre la batería y el ESP32', 'Quita el puente 5V-EN por encima de 12 V'],
        codigos: conS3('Primer sketch: acelerar y cambiar de sentido', skMotor('L298N')),
        flasheo: conectar('La batería de los motores va a las bornas; la lógica, a la placa.', 'Batería a +12V y GND; une ese GND al GND de la placa.', 'Quita el puente de ENA. ENA a GPIO4, IN1 a GPIO5 e IN2 a GPIO6. Motor en OUT1 y OUT2.'),
        ideas: ['Coche robot de dos ruedas', 'Robot que esquiva obstáculos con el HC-SR04', 'Cinta transportadora de juguete', 'Persiana motorizada con final de carrera']
    },

    // ============================================================ motor TT
    'motor-tt': {
        claves: [['Reducción', '1:48'], ['Velocidad', '≈ 200 rpm a 6 V'], ['Tensión', '3 – 6 V'], ['Consumo', '150 – 250 mA (≈ 1 A bloqueado)'], ['Rueda', '65 mm']],
        modelo: {
            caja: { w: 48.6, d: 24.3, h: 18.8, r: 3, color: '#f2c230', rect: [0, 5, 54, 27, 5], fondo: ['Motor TT 1:48'] },
            placa: { y: 1, color: '#e0b520', margen: 1.5 },
            piezas: [
                { n: 1, nombre: 'Motor de continua', tipo: 'blindaje', x: 66, z: 18.5, w: 22, d: 18, h: 15, asoma: true,
                    texto: 'El motor 130 de escobillas. Un condensador de 100 nF soldado entre sus terminales reduce el ruido eléctrico.' },
                { n: 2, nombre: 'Eje de salida', tipo: 'condensador', x: 13, z: 18.5, r: 2.7, h: 9, color: '#fbfbf7', tapa: false, en: 'tapa',
                    texto: 'Doble D: encaja directamente en la rueda amarilla de 65 mm. Sale por los dos lados.' },
                { n: 3, nombre: 'Reductora 1:48', tipo: 'grupo', x: 30, z: 18.5,
                    texto: 'Engranajes de plástico que bajan las revoluciones del motor 48 veces y multiplican la fuerza.',
                    formas: [{ tipo: 'condensador', dx: -8, r: 7, h: 2, color: '#f4f4f0', tapa: false, dy: 6 }, { tipo: 'condensador', dx: 4, r: 5, h: 2, color: '#f4f4f0', tapa: false, dy: 9 }, { tipo: 'condensador', dx: 14, r: 3, h: 2, color: '#f4f4f0', tapa: false, dy: 12 }] },
                { n: 4, nombre: 'Terminales del motor', tipo: 'grupo', x: 35, z: 40, asoma: true,
                    texto: 'M+ y M−. Al invertirlos cambia el sentido de giro.',
                    formas: [{ tipo: 'caja', dx: -4.5, w: 2, d: 1, h: 4, color: '#d8b14a' }, { tipo: 'caja', dx: 4.5, w: 2, d: 1, h: 4, color: '#d8b14a' }] }
            ]
        },
        fuertes: ['Motor, reductora y rueda baratos y ya montados', 'Funciona con 4 pilas AA', 'Cabe en casi cualquier chasis de robot', 'Fácil de controlar con el L298N'],
        cuidado: ['Nunca directo a un GPIO: necesita un driver como el L298N', 'Al arrancar o bloquearse pide hasta 1 A', 'Dos motores iguales no giran igual: el coche se desvía', 'Los engranajes de plástico se desgastan con golpes'],
        codigos: conS3('Primer sketch: acelerar y cambiar de sentido', skMotor('Motor TT con L298N'), [], 'Para la ESP32-S3 con un L298N entre medias. Abre el monitor a 115200 baudios.'),
        flasheo: conectar('Se conecta al L298N, nunca directamente a la placa.', 'M+ a OUT1 y M− a OUT2 del L298N; portapilas de 4 AA en +12V y GND del L298N.', 'ENA a GPIO4, IN1 a GPIO5, IN2 a GPIO6 y GND común con la placa.'),
        ideas: ['Coche robot de dos ruedas', 'Seguidor de línea', 'Ventilador de mesa', 'Cinta transportadora de juguete']
    },

    // ============================================================= MPU6050
    'mpu6050': {
        claves: [['Ejes', '3 de aceleración + 3 de giro'], ['Rango', '±2 a ±16 g · ±250 a ±2000 °/s'], ['Bus', 'I²C (0x68 o 0x69)'], ['Resolución', '16 bit'], ['Alimentación', '3,3 – 5 V']],
        modelo: {
            caja: { tipo: 'placa', w: 22.9, d: 15.2, h: 1.6, y: 8.6, r: .8, color: '#1f4f9c', fondo: ['GY-521', 'MPU6050'] },
            piezas: [
                { n: 1, nombre: 'Sensor MPU6050', tipo: 'chip', x: 45, z: 18, w: 4, d: 4, h: .9, rotulo: 'MPU6050',
                    texto: 'Acelerómetro y giroscopio de tres ejes en un chip de 4 × 4 mm. Las flechas de la placa marcan X e Y.' },
                { n: 2, nombre: 'Regulador y resistencias de pull-up', tipo: 'grupo', x: 45, z: 16,
                    texto: 'El regulador baja la alimentación a 3,3 V y las resistencias mantienen SDA y SCL en alto.',
                    formas: [{ tipo: 'smd', dx: -5.3, w: 1.6, d: .8, h: .5 }, { tipo: 'smd', dx: -5.3, dz: 2, w: 1.6, d: .8, h: .5, color: '#2a2c30' }, { tipo: 'smd', dx: 4.8, w: 1.6, d: .8, h: .5, color: '#2a2c30' }, { tipo: 'smd', dx: 4.8, dz: 2, w: 1.6, d: .8, h: .5 }] },
                { n: 3, nombre: 'LED de encendido', tipo: 'led', x: 48, z: 32, color: '#5fe07a',
                    texto: 'Se enciende con la alimentación.' },
                { n: 4, nombre: 'Tira de 6 pines', tipo: 'grupo', x: 35, z: 50, abajo: true,
                    texto: 'VCC, GND, SCL, SDA, AD0 e INT. AD0 cambia la dirección (0x68 o 0x69); INT avisa de datos nuevos o de movimiento.',
                    formas: [{ tipo: 'tira', x0: 10, x1: 60, n: 6 }] }
            ]
        },
        fuertes: ['Inclinación, giro y vibración en un solo chip', 'Se lee por I²C sin librerías', 'Barato y muy documentado', 'Su DMP calcula la orientación por dentro'],
        cuidado: ['El giroscopio deriva: combínalo con el acelerómetro (filtro complementario)', 'Calíbralo quieto y plano al arrancar', 'Las vibraciones del motor ensucian la medida: móntalo sobre goma', 'Es un chip descatalogado: para proyectos nuevos, mejor un ICM-42688 o un BMI270'],
        codigos: conS3('Primer sketch: inclinación y giro', SK_MPU6050),
        flasheo: conectar('Cuatro cables por I²C.', 'VCC a 3V3 y GND a GND.', 'SDA a GPIO8 y SCL a GPIO9.'),
        ideas: ['Robot que se equilibra sobre dos ruedas', 'Nivel de burbuja digital en la CYD', 'Mando que se maneja inclinándolo', 'Detector de vibraciones de la lavadora']
    },

    // ============================================================ joystick
    'joystick': {
        claves: [['Ejes', '2 potenciómetros de 10 kΩ'], ['Botón', 'Al pulsar la palanca'], ['Salida', 'Analógica 0 – VCC'], ['Alimentación', '3,3 – 5 V'], ['Pines', '5']],
        modelo: {
            caja: { tipo: 'placa', w: 26, d: 26, h: 1.6, y: 8.6, r: 1, color: '#1b1d21', fondo: ['Joystick XY', 'KY-023'] },
            piezas: [
                { n: 1, nombre: 'Mecanismo de dos ejes', tipo: 'blindaje', x: 40, z: 29, w: 15, d: 15, h: 8,
                    texto: 'La caja metálica guía la palanca y mueve los dos potenciómetros. Al soltarla, unos muelles la devuelven al centro.' },
                { n: 2, nombre: 'Palanca y capuchón', tipo: 'grupo', x: 40, z: 29,
                    texto: 'Al apretarla hacia abajo cierra el pulsador SW, que une el pin a masa.',
                    formas: [{ tipo: 'condensador', r: 1.6, h: 10, color: '#2f3338', tapa: false, dy: 8 }, { tipo: 'condensador', r: 6.5, h: 4, color: '#22252a', tapa: false, dy: 16 }] },
                { n: 3, nombre: 'Potenciómetros X e Y', tipo: 'grupo', x: 40, z: 29,
                    texto: 'Dos de 10 kΩ: sus cursores salen por VRx y VRy. En reposo dan más o menos la mitad de VCC.',
                    formas: [{ tipo: 'caja', dx: 8.9, w: 3, d: 6, h: 5, color: '#1d5fc2' }, { tipo: 'caja', dz: 8.6, w: 6, d: 2.3, h: 5, color: '#1d5fc2' }] },
                { n: 4, nombre: 'Tira de 5 pines', tipo: 'grupo', x: 30, z: 70, abajo: true,
                    texto: 'GND, +5V, VRx, VRy y SW. Con el ESP32, aliméntalo a 3,3 V para no pasarte en las entradas analógicas.',
                    formas: [{ tipo: 'tira', x0: 10, x1: 50, n: 5 }] }
            ]
        },
        fuertes: ['Mando de dos ejes y un botón por poco dinero', 'Dos entradas analógicas y un GPIO', 'Muy intuitivo para coches y brazos', 'Sin librerías'],
        cuidado: ['A 5 V las salidas superan los 3,3 V del ESP32: aliméntalo a 3,3 V', 'El centro no da exactamente la mitad: calíbralo al arrancar', 'Deja una zona muerta en el centro para que no tiemble', 'Usa el ADC1 (GPIO1 a 10): el ADC2 no va con la Wi-Fi'],
        codigos: conS3('Primer sketch: posición y pulsador', SK_JOYSTICK),
        flasheo: conectar('Cinco cables, alimentado a 3,3 V.', '+5V a 3V3 (sí, a 3,3 V) y GND a GND.', 'VRx a GPIO1, VRy a GPIO2 y SW a GPIO4.'),
        ideas: ['Mando del coche robot por ESP-NOW', 'Mover un brazo de servos', 'Juego en la pantalla de la CYD', 'Mover una cámara de dos ejes']
    },

    // ======================================================== receptor IR
    'ir-receptor': {
        claves: [['Frecuencia', '38 kHz'], ['Alcance', '≈ 8 m'], ['Ángulo', '≈ 45°'], ['Salida', 'Digital, activa a nivel bajo'], ['Alimentación', '2,7 – 5,5 V']],
        modelo: {
            caja: { tipo: 'placa', w: 12.7, d: 15.2, h: 1.2, y: 8.6, r: .8, color: '#1b1d21', fondo: ['Receptor IR', '38 kHz'] },
            piezas: [
                { n: 1, nombre: 'Receptor VS1838B', tipo: 'grupo', x: 24, z: 16,
                    texto: 'Filtra y demodula la luz infrarroja a 38 kHz: entrega directamente los pulsos del mando.',
                    formas: [{ tipo: 'caja', w: 6, d: 5, h: 7, color: '#101113' }, { tipo: 'condensador', r: 2, h: 1.2, color: '#3b1f24', tapa: false, dy: 7 }] },
                { n: 2, nombre: 'LED de señal', tipo: 'led', x: 41, z: 22, color: '#ff5a4d',
                    texto: 'Parpadea cuando recibe: así sabes si el mando llega aunque el programa no lo entienda.' },
                { n: 3, nombre: 'Resistencia del LED', tipo: 'smd', x: 40, z: 31, w: 2, d: 1.2, h: .5, color: '#2a2c30',
                    texto: 'Limita la corriente del LED de señal.' },
                { n: 4, nombre: 'Tira de 3 pines', tipo: 'grupo', x: 20, z: 50, abajo: true,
                    texto: 'OUT, GND y VCC. OUT va directo a un GPIO.',
                    formas: [{ tipo: 'tira', x0: 10, x1: 30, n: 3 }] }
            ]
        },
        fuertes: ['Entiende casi cualquier mando de TV o aire acondicionado', 'Un solo GPIO', 'Funciona a 3,3 V', 'Con un emisor IR, la placa puede copiar el mando'],
        cuidado: ['La luz del sol o de fluorescentes puede cegarlo', 'Mandos a 36 o 40 kHz llegan con menos alcance', 'Los aires acondicionados mandan mensajes muy largos: sube el búfer', 'El orden de los pines cambia entre módulos: lee la serigrafía'],
        codigos: conS3('Primer sketch: leer cualquier mando', SK_IR, ['crankyoldgit/IRremoteESP8266']),
        flasheo: conectar('Tres cables.', 'VCC a 3V3 y GND a GND.', 'OUT a GPIO4.'),
        ideas: ['Manejar los Shelly con el mando de la tele', 'Copiar el mando del aire acondicionado y encenderlo por Wi-Fi', 'Mando para el coche robot', 'Pausar la música al pulsar un botón del mando']
    },

    // ========================================================== RPLIDAR A1
    'rplidar-a1': {
        claves: [['Alcance', '0,15 – 12 m'], ['Barrido', '360° · 5,5 vueltas/s'], ['Muestras', '8000 por segundo'], ['Conexión', 'USB (adaptador CP2102)'], ['Láser', 'Clase 1 · 785 nm']],
        modelo: {
            caja: { w: 97, d: 72, h: 30, r: 6, color: '#1c1e22', rect: [0, 8, 140, 104, 10], fondo: ['RPLIDAR A1M8', 'SLAMTEC'] },
            placa: { y: 2, color: '#1d5e3a', margen: 3 },
            piezas: [
                { n: 1, nombre: 'Cabezal giratorio', tipo: 'condensador', x: 56, z: 60, r: 31, h: 14, color: '#101113', tapa: false, en: 'tapa',
                    texto: 'Gira unas 5,5 veces por segundo y mide la distancia en 360° con el láser. No lo frenes con la mano.' },
                { n: 2, nombre: 'Láser y cámara de medida', tipo: 'grupo', x: 56, z: 60, en: 'tapa',
                    texto: 'Mide por triangulación: el láser marca un punto y la lente lo ve desplazado según la distancia.',
                    formas: [{ tipo: 'caja', w: 38, d: 19, h: 3, color: '#2a2d33', dy: 14 }, { ...lente(-9, 6), dy: 17 }, { ...lente(9, 4.8), dy: 17 }] },
                { n: 3, nombre: 'Motor de giro', tipo: 'condensador', x: 116, z: 36, r: 7, h: 18, color: '#c9ced4',
                    texto: 'Mueve el cabezal con una correa. Su velocidad se regula con el pin MOTOCTL (por PWM).' },
                { n: 4, nombre: 'Placa de control', tipo: 'chip', x: 56, z: 60, w: 10, d: 10, h: 1.2, rotulo: 'MCU',
                    texto: 'Recibe las medidas del cabezal sin contacto y las envía por serie a 115200 baudios.' },
                { n: 5, nombre: 'Adaptador USB', tipo: 'grupo', x: 123, z: 77, en: 'tapa',
                    texto: 'Un CP2102 que convierte la serie en USB y alimenta el LiDAR. Aparece como /dev/ttyUSB0 en Linux.',
                    formas: [{ tipo: 'caja', w: 15, d: 20.7, h: 1.6, color: '#1d7a3e' }, { tipo: 'microusb', dx: 8.3, dz: -11.7, dy: 1.6, lado: 'x' }] }
            ]
        },
        fuertes: ['Mapa de 360° de la habitación varias veces por segundo', 'Hasta 12 m de alcance', 'Funciona en ROS y con Python', 'Clase 1: seguro para los ojos'],
        cuidado: ['Pide más corriente al arrancar: usa un puerto USB con fuerza o un hub alimentado', 'Cristales y espejos negros no devuelven la luz', 'El sol directo reduce el alcance', 'No sirve para el ESP32 directamente: mejor la Raspberry Pi o el PC'],
        codigos: [
            { titulo: 'Primer programa: vueltas y punto más cercano', lenguaje: 'Python', archivo: 'lidar.py', nota: 'Para la Raspberry Pi o el PC con el adaptador USB conectado.', texto: PY_LIDAR },
            { titulo: 'Instalar y ejecutar', lenguaje: 'Terminal', texto: TERMINAL_LIDAR }
        ],
        flasheo: {
            titulo: 'Conectarlo',
            resumen: 'Va por USB a la Raspberry Pi o al PC con su adaptador: no se programa.',
            pasos: ['Conecta el adaptador al LiDAR con su cable plano y el USB a la Raspberry Pi.', 'Comprueba que aparece /dev/ttyUSB0 (en Windows, un puerto COM).', 'Instala la librería y ejecuta el programa del bloque de terminal.', 'Para mapas y navegación, el siguiente paso es ROS 2 con el paquete sllidar_ros2.']
        },
        ideas: ['Mapa de la casa con un robot y SLAM', 'Robot aspirador casero que no choca', 'Detector de personas en una habitación', 'Medir una habitación de un vistazo']
    }
});
