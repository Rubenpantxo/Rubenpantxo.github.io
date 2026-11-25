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

import { PLATFORMIO_INI, PLATFORMIO_CYD } from '../core/exportar.js';

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
